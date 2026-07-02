/* Kids Corner Guardian — content script.
 * Runs only on Kids Corner pages. It's the bridge between the web page (which
 * is signed in and can write to Firebase) and the background worker (which
 * enforces + measures). The page never talks to chrome APIs directly; it only
 * exchanges small window.postMessage envelopes tagged __kcg with this script.
 */
(function () {
  const TAG = "__kcg";
  const origin = window.location.origin;

  function toPage(msg) {
    window.postMessage({ [TAG]: 1, dir: "c2p", ...msg }, origin);
  }

  // Announce presence (repeatedly for a moment, so a late-loading page listener
  // still hears us).
  function announce() {
    toPage({ type: "present", version: chrome.runtime.getManifest().version });
  }
  announce();
  let n = 0;
  const t = setInterval(() => {
    announce();
    if (++n > 6) clearInterval(t);
  }, 500);

  window.addEventListener("message", (e) => {
    if (e.source !== window || e.origin !== origin) return;
    const d = e.data;
    if (!d || d[TAG] !== 1 || d.dir !== "p2c") return;

    if (d.type === "ping") {
      announce();
      return;
    }
    if (d.type === "allowlist") {
      chrome.runtime.sendMessage(
        {
          type: "setAllowlist",
          domains: d.domains,
          appMap: d.appMap,
          familyId: d.familyId,
          kidId: d.kidId,
        },
        () => void chrome.runtime.lastError,
      );
      return;
    }
    if (d.type === "getActivity") {
      chrome.runtime.sendMessage({ type: "getActivity" }, (res) => {
        if (chrome.runtime.lastError || !res) return;
        toPage({ type: "activity", date: res.date, day: res.day });
      });
      return;
    }
  });
})();
