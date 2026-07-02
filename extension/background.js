/* Luminara Guardian — background service worker.
 *
 * Enforcement: default-DENY all top-level navigation except the domains a
 * grown-up allowed (the learning apps enabled for this child + the auth/CDN
 * hosts they need + Luminara itself). Blocked navigations are redirected to
 * a friendly "ask a grown-up" page. Sub-resources are NOT blocked, so allowed
 * apps keep working normally.
 *
 * Measurement: active time per app (idle-aware), which apps were opened, and
 * which sites were blocked — all kept as small daily aggregates in local
 * storage and handed to the Luminara page (which writes them to the
 * family's Firebase). The extension itself holds NO credentials.
 */

const ALLOW_RULE_ID = 1;
const BLOCK_RULE_ID = 2;

// ---- state (persisted so it survives service-worker restarts) -------------

async function getState() {
  const { kcgState } = await chrome.storage.local.get("kcgState");
  return kcgState || { domains: [], appMap: {}, familyId: null, kidId: null };
}
async function setState(patch) {
  const cur = await getState();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ kcgState: next });
  return next;
}

function todayKey() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** host is allowed if it equals or is a subdomain of any allowed base domain. */
function hostAllowed(host, domains) {
  return domains.some((d) => host === d || host.endsWith("." + d));
}

/** Which app (id) a host belongs to, or null. appMap = { baseDomain: appId }. */
function appForHost(host, appMap) {
  for (const d of Object.keys(appMap)) {
    if (host === d || host.endsWith("." + d)) return appMap[d];
  }
  return null;
}

// ---- enforcement (declarativeNetRequest dynamic rules) --------------------

async function rebuildRules() {
  const { domains } = await getState();
  const removeRuleIds = [ALLOW_RULE_ID, BLOCK_RULE_ID];
  // With no allow-list yet, don't block anything (avoid locking a device out
  // before Luminara has handed us the child's allowed apps).
  if (!domains.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: [] });
    return;
  }
  const addRules = [
    {
      // Allow top-level navigation to any allowed domain (+ its subdomains).
      id: ALLOW_RULE_ID,
      priority: 2,
      action: { type: "allow" },
      condition: { requestDomains: domains, resourceTypes: ["main_frame"] },
    },
    {
      // Everything else that tries to become the page -> the block screen.
      id: BLOCK_RULE_ID,
      priority: 1,
      action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { urlFilter: "*", resourceTypes: ["main_frame"] },
    },
  ];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

// ---- activity aggregation --------------------------------------------------

async function readDay() {
  const key = "kcgDay:" + todayKey();
  const got = await chrome.storage.local.get(key);
  return got[key] || { apps: {}, opens: [], blocked: {}, updatedAt: 0 };
}
async function writeDay(day) {
  day.updatedAt = Date.now();
  await chrome.storage.local.set({ ["kcgDay:" + todayKey()]: day });
}

async function addSeconds(appId, secs) {
  const day = await readDay();
  day.apps[appId] = (day.apps[appId] || 0) + secs;
  await writeDay(day);
}
async function logOpen(appId) {
  const day = await readDay();
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const last = day.opens[day.opens.length - 1];
  // De-dupe rapid repeats of the same app.
  if (!last || last.a !== appId || last.t !== hhmm) {
    day.opens.push({ a: appId, t: hhmm });
    if (day.opens.length > 40) day.opens = day.opens.slice(-40);
    await writeDay(day);
  }
}
async function logBlocked(host) {
  const day = await readDay();
  const keys = Object.keys(day.blocked);
  if (!(host in day.blocked) && keys.length >= 40) return; // cap distinct hosts
  day.blocked[host] = (day.blocked[host] || 0) + 1;
  await writeDay(day);
}

// ---- time tracking tick ----------------------------------------------------

chrome.alarms.create("tick", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "tick") return;
  const state = await getState();
  if (!state.domains.length) return;
  const idle = await chrome.idle.queryState(60);
  if (idle !== "active") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !tab.url) return;
  const appId = appForHost(hostOf(tab.url), state.appMap);
  if (appId) await addSeconds(appId, 60);
});

// ---- navigation logging (opens + blocked attempts) -------------------------

chrome.webNavigation.onCommitted.addListener(async (d) => {
  if (d.frameId !== 0) return; // top frame only
  const state = await getState();
  if (!state.domains.length) return;
  const host = hostOf(d.url);
  if (!host) return;
  const appId = appForHost(host, state.appMap);
  if (appId) logOpen(appId);
});

// A blocked navigation is redirected to blocked.html by the DNR rule; catch the
// original target here to record what was blocked (minus the query string).
chrome.webNavigation.onBeforeNavigate.addListener(async (d) => {
  if (d.frameId !== 0) return;
  const state = await getState();
  if (!state.domains.length) return;
  const host = hostOf(d.url);
  if (!host || host.endsWith("chrome-extension")) return;
  if (d.url.startsWith("chrome") || d.url.startsWith("about")) return;
  if (!hostAllowed(host, state.domains)) {
    await chrome.storage.local.set({ kcgLastBlocked: host });
    logBlocked(host);
  }
});

// ---- messaging with the Luminara page (via the content script) ----------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return sendResponse({ ok: false });
    if (msg.type === "setAllowlist") {
      await setState({
        domains: Array.isArray(msg.domains) ? msg.domains : [],
        appMap: msg.appMap || {},
        familyId: msg.familyId || null,
        kidId: msg.kidId || null,
      });
      await rebuildRules();
      return sendResponse({ ok: true });
    }
    if (msg.type === "getStatus") {
      const st = await getState();
      return sendResponse({ ok: true, active: st.domains.length > 0, version: chrome.runtime.getManifest().version });
    }
    if (msg.type === "getActivity") {
      const day = await readDay();
      return sendResponse({ ok: true, date: todayKey(), day });
    }
    if (msg.type === "getLastBlocked") {
      const { kcgLastBlocked } = await chrome.storage.local.get("kcgLastBlocked");
      return sendResponse({ ok: true, host: kcgLastBlocked || "" });
    }
    return sendResponse({ ok: false });
  })();
  return true; // async response
});

// Re-apply rules on startup (service workers are ephemeral).
chrome.runtime.onStartup.addListener(rebuildRules);
chrome.runtime.onInstalled.addListener(rebuildRules);
rebuildRules();
