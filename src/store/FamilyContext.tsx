import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { get, ref, update } from "firebase/database";
import type { User } from "firebase/auth";
import { ensureAuth, FIREBASE_READY, getDb, onAuthChange } from "../firebase";
import { readSyncCode } from "../sync";
import { newId } from "./storage";
import { ACTIVE_KEY, PAIRED_KEY, scopedFamilyId } from "./familyScope";

// ---------------------------------------------------------------------------
// FamilyContext — resolves WHICH family subtree this device/parent syncs to.
//
// Priority:
//   1. Signed-in grown-up (Google) -> their active family (users/{uid}/families;
//      multi-household — the active one is a local preference in ACTIVE_KEY).
//   2. Anonymous kids' device PAIRED to a family -> that family (PAIRED_KEY).
//   3. Otherwise -> the LEGACY rooms/{syncCode} room, so the current single
//      family keeps working untouched until it's migrated.
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
  /** families/{id} or rooms/{code}; null while resolving or a parent has no family. */
  basePath: string | null;
  /** Parent signed in but belongs to no family yet — must create/join one. */
  needsFamily: boolean;
};

type FamilyContextValue = Resolved & {
  setActiveFamilyId: (id: string) => void;
  createFamily: (name: string) => Promise<string>;
  pairDevice: (familyId: string) => void;
  unpairDevice: () => void;
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
      // No cloud configured: local-only, legacy scope.
      if (!FIREBASE_READY) {
        if (!cancelled)
          setState({
            loading: false,
            user: null,
            isParent: false,
            families: [],
            activeFamilyId: null,
            basePath: legacyBasePath(),
            needsFamily: false,
          });
        return;
      }

      // Auth still resolving — don't sync anywhere yet.
      if (!user) {
        if (!cancelled)
          setState((s) => ({ ...s, loading: true, basePath: null }));
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
            basePath: paired ? `families/${safe(paired)}` : legacyBasePath(),
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
      // Matches the rules bootstrap clause: the same write installs the caller
      // as a parent member of the brand-new family.
      await update(ref(db), {
        [`families/${fid}/meta`]: {
          name: name.trim().slice(0, 60) || "My Family",
          ownerUid: uid,
          createdAt: now,
        },
        [`families/${fid}/members/${uid}`]: {
          role: "parent",
          addedAt: now,
          addedBy: uid,
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

  const pairDevice = useCallback((familyId: string) => {
    try {
      localStorage.setItem(PAIRED_KEY, familyId);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const unpairDevice = useCallback(() => {
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
