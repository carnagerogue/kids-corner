import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { get, ref, set, update } from "firebase/database";
import type { User } from "firebase/auth";
import {
  currentUser,
  ensureAuth,
  FIREBASE_READY,
  getDb,
  onAuthChange,
} from "../firebase";
import { normalizePairingCode, readSyncCode, redeemPairing } from "../sync";
import { clearState, newId, writeSession } from "./storage";
import { ACTIVE_KEY, PAIRED_KEY, scopedFamilyId } from "./familyScope";

// ---------------------------------------------------------------------------
// FamilyContext — resolves WHICH family subtree this device/parent syncs to,
// and whether this device is BOUND to a family at all.
//
// Priority:
//   1. Signed-in grown-up (Google) -> their active family (users/{uid}/families;
//      multi-household — the active one is a local preference in ACTIVE_KEY).
//   2. Anonymous kids' device PAIRED to a family -> that family (PAIRED_KEY).
//   3. Otherwise -> UNBOUND: basePath is null so NOTHING is fetched (see the
//      privacy note below) and the app shows a "connect this device" prompt.
//
// PRIVACY: `basePath` is the single source of truth that drives FamilySync's
// reads. An UNBOUND device MUST resolve basePath = null (not a legacy room), so
// FamilySync never subscribes and no child's name is ever pulled into memory or
// shown to a stranger who reaches the kid entry. The lone exception is
// !FIREBASE_READY (local/offline dev), which is treated as bound to the seeded
// legacy room since there is no cloud and thus no cross-family exposure.
//
// Storage is scoped per family (see storage.storageKey), so a scope change must
// re-init AppProvider — we do that with a one-time page reload whenever the
// resolved scope differs from what's on disk (sign-in / sign-out / switch).
// These are deliberate, infrequent actions, so a reload is acceptable and
// keeps the model dead-simple and correct (no cross-family cache pollution).
// ---------------------------------------------------------------------------

/** Firebase keys can't contain . # $ / [ ] — matches FamilySync's safe(). */
function safe(code: string): string {
  return code.replace(/[.#$/[\]]/g, "_");
}

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

const legacyBasePath = () => `rooms/${safe(readSyncCode())}`;

export type FamilySummary = { id: string; name: string };

type Resolved = {
  loading: boolean;
  user: User | null;
  /** Signed in with a real (non-anonymous) provider, i.e. a grown-up. */
  isParent: boolean;
  families: FamilySummary[];
  activeFamilyId: string | null;
  /** families/{id}; null when unbound (nothing is fetched) or still resolving. */
  basePath: string | null;
  /**
   * Whether this device is scoped to a real family (a signed-in parent with an
   * active family, or a paired kids' device). When false, the kid entry shows
   * the connect-this-device prompt instead of any roster.
   */
  bound: boolean;
  /** Parent signed in but belongs to no family yet — must create/join one. */
  needsFamily: boolean;
};

type FamilyContextValue = Resolved & {
  setActiveFamilyId: (id: string) => void;
  createFamily: (name: string) => Promise<string>;
  /** Redeem a grown-up's setup code -> enroll this device + bind it. Throws on a bad/expired code. */
  pairDevice: (code: string) => Promise<void>;
  /** Revoke this device's membership server-side, then unbind + reload. */
  unpairDevice: () => Promise<void>;
  reload: () => void;
};

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Resolved>({
    loading: true,
    user: null,
    isParent: false,
    families: [],
    activeFamilyId: null,
    basePath: null,
    bound: false,
    needsFamily: false,
  });

  // Baseline anonymous auth so security rules can require auth != null.
  useEffect(() => {
    if (FIREBASE_READY) void ensureAuth();
  }, []);

  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!FIREBASE_READY) {
      setUser(null);
      return;
    }
    return onAuthChange(setUser);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // No cloud configured: local-only. With no cloud there's no multi-family
      // exposure, so treat offline/dev as bound to the seeded legacy room.
      if (!FIREBASE_READY) {
        if (!cancelled)
          setState({
            loading: false,
            user: null,
            isParent: false,
            families: [],
            activeFamilyId: null,
            basePath: legacyBasePath(),
            bound: true,
            needsFamily: false,
          });
        return;
      }

      // Auth still resolving — don't sync anywhere yet, and stay unbound so
      // nothing is fetched against a stale scope in the meantime.
      if (!user) {
        if (!cancelled)
          setState((s) => ({
            ...s,
            loading: true,
            basePath: null,
            bound: false,
          }));
        return;
      }

      const db = getDb();

      if (user.isAnonymous) {
        // Kids' shared device. A stale ACTIVE_KEY means a grown-up signed out
        // here — clear it and reload so the device reverts to paired/legacy.
        if (readLocal(ACTIVE_KEY)) {
          try {
            localStorage.removeItem(ACTIVE_KEY);
          } catch {
            /* ignore */
          }
          window.location.reload();
          return;
        }
        const paired = readLocal(PAIRED_KEY);
        if (!cancelled)
          setState({
            loading: false,
            user,
            isParent: false,
            families: [],
            activeFamilyId: paired,
            // A paired kids' device binds to its family; an unpaired one stays
            // UNBOUND with a null basePath so no roster is ever fetched or shown
            // (the kid entry renders ConnectDevice instead). No legacy fallback.
            basePath: paired ? `families/${safe(paired)}` : null,
            bound: !!paired,
            needsFamily: false,
          });
        return;
      }

      // Grown-up: load their families (id -> name).
      let families: FamilySummary[] = [];
      if (db) {
        try {
          const snap = await get(ref(db, `users/${user.uid}/families`));
          const map = (snap.val() as Record<string, unknown> | null) ?? {};
          const ids = Object.keys(map).filter((k) => map[k]);
          families = await Promise.all(
            ids.map(async (id) => {
              const m = await get(ref(db, `families/${safe(id)}/meta/name`));
              return { id, name: (m.val() as string) ?? "My Family" };
            }),
          );
        } catch {
          families = [];
        }
      }
      if (cancelled) return;

      if (families.length === 0) {
        // Parent with no family yet — clear any stale scope, then prompt create.
        if (readLocal(ACTIVE_KEY)) {
          try {
            localStorage.removeItem(ACTIVE_KEY);
          } catch {
            /* ignore */
          }
          window.location.reload();
          return;
        }
        setState({
          loading: false,
          user,
          isParent: true,
          families: [],
          activeFamilyId: null,
          basePath: null,
          bound: false,
          needsFamily: true,
        });
        return;
      }

      const pref = readLocal(ACTIVE_KEY);
      const active =
        pref && families.some((f) => f.id === pref) ? pref : families[0].id;
      // Align the local-cache scope; reload once if it changed (sign-in).
      if (scopedFamilyId() !== active) {
        try {
          localStorage.setItem(ACTIVE_KEY, active);
        } catch {
          /* ignore */
        }
        window.location.reload();
        return;
      }
      setState({
        loading: false,
        user,
        isParent: true,
        families,
        activeFamilyId: active,
        basePath: `families/${safe(active)}`,
        bound: true,
        needsFamily: false,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // All scope changes reload so AppProvider re-inits storage under the new
  // per-family key (no cross-family cache pollution).
  const setActiveFamilyId = useCallback((id: string) => {
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const createFamily = useCallback(
    async (name: string): Promise<string> => {
      const db = getDb();
      if (!db || !user) throw new Error("Not signed in");
      const fid = newId();
      const uid = user.uid;
      const now = Date.now();
      // Write the whole family node in ONE location so the rules bootstrap
      // clause (`!data.exists() && newData.members[uid].role === 'parent'`) sees
      // meta AND members together. Splitting these into sibling paths of a
      // multi-path update makes the rule evaluate each location with only its
      // own newData — the meta write then can't see the members child and the
      // whole atomic update is denied. This nesting is the robust pattern.
      await update(ref(db), {
        [`families/${fid}`]: {
          meta: {
            name: name.trim().slice(0, 60) || "My Family",
            ownerUid: uid,
            createdAt: now,
          },
          members: {
            [uid]: { role: "parent", addedAt: now, addedBy: uid },
          },
        },
        [`users/${uid}/families/${fid}`]: true,
      });
      try {
        localStorage.setItem(ACTIVE_KEY, fid);
      } catch {
        /* ignore */
      }
      window.location.reload();
      return fid;
    },
    [user],
  );

  // Redeem a grown-up's setup code: validate it, self-enroll this device as a
  // 'device' member of the family it points to (so it survives read-isolation),
  // then bind + reload. Throws on a bad/expired code so the UI can shake.
  const pairDevice = useCallback(async (code: string): Promise<void> => {
    const db = getDb();
    const u = currentUser() ?? (await ensureAuth().then(() => currentUser()));
    if (!db || !u) throw new Error("Cloud sync isn't ready — try again.");
    const fid = await redeemPairing(code); // validates; throws if invalid
    const uid = u.uid;
    const now = Date.now();
    const normalized = normalizePairingCode(code);
    await update(ref(db), {
      [`families/${fid}/members/${uid}`]: {
        role: "device",
        addedAt: now,
        addedBy: uid,
        viaCode: normalized,
      },
      [`users/${uid}/families/${fid}`]: true,
    });
    // Best-effort: burn the code so it can't be redeemed again in its window
    // (shrinks the replay/observation blast radius; strict single-use is a
    // Phase 2 Cloud Function). Ignore failure — enrollment already succeeded.
    try {
      await set(ref(db, `pairings/${normalized}`), null);
    } catch {
      /* best-effort */
    }
    try {
      localStorage.setItem(PAIRED_KEY, fid);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  // Disconnecting must revoke server-side, not just locally: an anonymous auth
  // token is a bearer credential, so a device that only forgot PAIRED_KEY could
  // still read the family directly once reads are member-gated. Delete the
  // membership first, then unbind. Best-effort — always unbinds locally.
  const unpairDevice = useCallback(async (): Promise<void> => {
    const db = getDb();
    const u = currentUser();
    const fid = readLocal(PAIRED_KEY);
    if (db && u && fid) {
      try {
        await update(ref(db), {
          [`families/${fid}/members/${u.uid}`]: null,
          [`users/${u.uid}/families/${fid}`]: null,
        });
      } catch {
        /* best-effort revoke — still unbind locally below */
      }
    }
    // Wipe this family's local footprint off the device: the scoped cache
    // (roster, PIN hashes, messages, photos) and any logged-in kid session.
    // clearState() keys off the CURRENT scope, so run it while PAIRED_KEY is
    // still set, THEN drop PAIRED_KEY. Otherwise a "disconnected" hand-me-down
    // tablet still holds the family's data at rest.
    try {
      clearState();
      writeSession(null);
    } catch {
      /* ignore */
    }
    try {
      localStorage.removeItem(PAIRED_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const value = useMemo<FamilyContextValue>(
    () => ({
      ...state,
      setActiveFamilyId,
      createFamily,
      pairDevice,
      unpairDevice,
      reload: () => window.location.reload(),
    }),
    [state, setActiveFamilyId, createFamily, pairDevice, unpairDevice],
  );

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error("useFamily must be used within <FamilyProvider>");
  return ctx;
}
