import { useEffect, useRef, useState } from "react";
import { onValue, ref, set } from "firebase/database";
import { useApp } from "../store/AppContext";
import { FIREBASE_READY, getDb } from "../firebase";
import { readSyncCode, SYNC_EVENT } from "../sync";
import type { Message } from "../types";

/**
 * Cross-device message sync via Firebase Realtime Database. When a family sync
 * code is set (and Firebase is configured), messages are mirrored to/from
 * `rooms/{code}/messages` so every device — even on a different computer — stays
 * in sync. No-op when unconfigured (messaging stays local).
 */
export function MessageSync() {
  const { state, dispatch } = useApp();
  const [code, setCode] = useState(() => readSyncCode());
  const synced = useRef<Set<string>>(new Set());

  // Pick up sync-code changes (this tab via custom event, other tabs via storage).
  useEffect(() => {
    const update = () => setCode(readSyncCode());
    window.addEventListener(SYNC_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SYNC_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  // Subscribe to the room and ingest remote messages.
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    synced.current = new Set();
    const room = ref(db, `rooms/${code}/messages`);
    const unsub = onValue(room, (snap) => {
      const val = (snap.val() as Record<string, Message> | null) ?? {};
      const remote = Object.values(val).filter((m) => m && m.id);
      remote.forEach((m) => synced.current.add(m.id));
      if (remote.length) {
        dispatch({ type: "INGEST_MESSAGES", messages: remote });
      }
    });
    return () => unsub();
  }, [code, dispatch]);

  // Push any local messages that aren't in the cloud yet.
  useEffect(() => {
    if (!FIREBASE_READY || !code) return;
    const db = getDb();
    if (!db) return;
    for (const m of state.messages) {
      if (!synced.current.has(m.id)) {
        synced.current.add(m.id);
        void set(ref(db, `rooms/${code}/messages/${m.id}`), m).catch(() => {});
      }
    }
  }, [state.messages, code]);

  return null;
}
