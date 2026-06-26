import { useEffect, useRef, useState } from "react";
import { onValue, ref, set, update } from "firebase/database";
import { useApp, type SyncConfig } from "../store/AppContext";
import { FIREBASE_READY, getDb } from "../firebase";
import { readSyncCode, SYNC_EVENT } from "../sync";
import type {
  AppState,
  ChoreAssignment,
  Message,
  Submission,
} from "../types";

function pickConfig(s: AppState): SyncConfig {
  return {
    kidProfiles: s.kidProfiles,
    removedKids: s.removedKids,
    kidPins: s.kidPins,
    themes: s.themes,
    appVisibility: s.appVisibility,
    exploreHidden: s.exploreHidden,
    schedules: s.schedules,
    customActivities: s.customActivities,
    activityImages: s.activityImages,
    parentPin: s.parentPin,
  };
}

/**
 * Drop empty arrays/objects, null and undefined — exactly what Firebase does on
 * write. We push and compare this canonical form so a value the cloud strips
 * (an empty `kidIds`, `exploreHidden`, etc.) can't trigger an endless re-push.
 */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      const v = prune((value as Record<string, unknown>)[k]);
      if (v !== undefined) out[k] = v;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return value === null ? undefined : value;
}

/** Canonical (Firebase-shaped) JSON for change detection. */
function canon(cfg: unknown): string {
  return JSON.stringify(prune(cfg) ?? {});
}

const subHash = (s: Submission) =>
  `${s.status}|${s.reviewedAt ?? 0}|${s.note ?? ""}|${s.photo ? 1 : 0}`;

/** Firebase keys can't contain . # $ / [ ]. */
const safe = (code: string) => code.replace(/[.#$/[\]]/g, "_");

/**
 * Cross-device sync of the shared "family" state via Firebase Realtime
 * Database (under `rooms/{code}`): the roster + PINs + themes + app visibility
 * (config, last-write-wins), photo submissions, chores, and messages
 * (id-keyed, merge-safe). Per-device state (who's logged in, schedule history)
 * stays local. No-op until a sync code is set and Firebase is configured.
 */
export function FamilySync() {
  const { state, dispatch } = useApp();
  const [code, setCode] = useState(() => readSyncCode());
  const [ready, setReady] = useState(false);

  const lastConfig = useRef("");
  const syncedSub = useRef<Map<string, string>>(new Map());
  const syncedChore = useRef<Set<string>>(new Set());
  const syncedMsg = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onCode = () => setCode(readSyncCode());
    window.addEventListener(SYNC_EVENT, onCode);
    window.addEventListener("storage", onCode);
    return () => {
      window.removeEventListener(SYNC_EVENT, onCode);
      window.removeEventListener("storage", onCode);
    };
  }, []);

  // Subscribe to every shared slice and ingest remote changes.
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    setReady(false);
    lastConfig.current = "";
    syncedSub.current = new Map();
    syncedChore.current = new Set();
    syncedMsg.current = new Set();
    const base = `rooms/${safe(code)}`;
    const unsubs = [
      onValue(ref(db, `${base}/config`), (snap) => {
        const cfg = snap.val() as SyncConfig | null;
        if (cfg && Array.isArray(cfg.kidProfiles) && cfg.kidProfiles.length) {
          lastConfig.current = canon(cfg);
          dispatch({ type: "SET_CONFIG", config: cfg });
        }
        setReady(true);
      }),
      onValue(ref(db, `${base}/submissions`), (snap) => {
        const val = (snap.val() as Record<string, Submission> | null) ?? {};
        const subs = Object.values(val).filter((s) => s && s.id);
        subs.forEach((s) => syncedSub.current.set(s.id, subHash(s)));
        if (subs.length) {
          dispatch({ type: "INGEST_SUBMISSIONS", submissions: subs });
        }
      }),
      onValue(ref(db, `${base}/choreAssignments`), (snap) => {
        const val = (snap.val() as Record<string, ChoreAssignment> | null) ?? {};
        const cs = Object.values(val).filter((c) => c && c.id);
        cs.forEach((c) => syncedChore.current.add(c.id));
        if (cs.length) dispatch({ type: "INGEST_CHORES", choreAssignments: cs });
      }),
      onValue(ref(db, `${base}/messages`), (snap) => {
        const val = (snap.val() as Record<string, Message> | null) ?? {};
        const ms = Object.values(val).filter((m) => m && m.id);
        ms.forEach((m) => syncedMsg.current.add(m.id));
        if (ms.length) dispatch({ type: "INGEST_MESSAGES", messages: ms });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [code, dispatch]);

  // Push config (last-write-wins) — only after we've seen the cloud's copy, so
  // a fresh device doesn't clobber an existing roster.
  useEffect(() => {
    if (!FIREBASE_READY || !code || !ready) return;
    const db = getDb();
    if (!db) return;
    const pruned = prune(pickConfig(state)) ?? {};
    const json = JSON.stringify(pruned);
    if (json === lastConfig.current) return;
    lastConfig.current = json;
    // `pruned` already drops undefined/empty values Firebase would reject.
    void set(ref(db, `rooms/${safe(code)}/config`), pruned).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.kidProfiles,
    state.removedKids,
    state.kidPins,
    state.themes,
    state.appVisibility,
    state.exploreHidden,
    state.schedules,
    state.customActivities,
    state.activityImages,
    state.parentPin,
    code,
    ready,
  ]);

  // Push new/changed submissions (incl. photos).
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    const updates: Record<string, Submission> = {};
    for (const s of state.submissions) {
      const h = subHash(s);
      if (syncedSub.current.get(s.id) !== h) {
        syncedSub.current.set(s.id, h);
        updates[s.id] = s;
      }
    }
    if (Object.keys(updates).length) {
      void update(ref(db, `rooms/${safe(code)}/submissions`), updates).catch(
        () => {},
      );
    }
  }, [state.submissions, code]);

  // Push new chore assignments.
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    const updates: Record<string, ChoreAssignment> = {};
    for (const c of state.choreAssignments) {
      if (!syncedChore.current.has(c.id)) {
        syncedChore.current.add(c.id);
        updates[c.id] = c;
      }
    }
    if (Object.keys(updates).length) {
      void update(
        ref(db, `rooms/${safe(code)}/choreAssignments`),
        updates,
      ).catch(() => {});
    }
  }, [state.choreAssignments, code]);

  // Push new messages.
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    const updates: Record<string, Message> = {};
    for (const m of state.messages) {
      if (!syncedMsg.current.has(m.id)) {
        syncedMsg.current.add(m.id);
        updates[m.id] = m;
      }
    }
    if (Object.keys(updates).length) {
      void update(ref(db, `rooms/${safe(code)}/messages`), updates).catch(
        () => {},
      );
    }
  }, [state.messages, code]);

  return null;
}
