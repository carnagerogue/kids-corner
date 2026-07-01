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

// ---------------------------------------------------------------------------
// FamilyContext — resolves WHICH family subtree this device/parent syncs to.
//
// Priority:
//   1. Signed-in grown-up (Google) -> one of users/{uid}/families (multi-
//      household; the active one is a local preference).
//   2. Anonymous kids' device that's been PAIRED to a family -> that family.
//   3. Otherwise -> the LEGACY rooms/{syncCode} room, so the current single
//      family keeps working untouched until it's migrated.
//
// The resolved `basePath` (families/{id} OR rooms/{code}) is what FamilySync
// reads. Nothing here re-roots sync yet on its own — it just resolves.
// ---------------------------------------------------------------------------

const PAIRED_KEY = "kids-corner:pairedFamily";
const ACTIVE_KEY = "kids-corner:activeFamily";

/** Firebase keys can't contain . # $ / [ ] — matches FamilySync's safe(). */
function safe(code: string): string {
  return code.replace(/[.#$/[\]]/g, "_");
}

export type FamilySummary = { id: string; name: string };

type Resolved = {
  loading: boolean;
  user: User | null;
  /** Signed in with a real (non-anonymous) provider, i.e. a grown-up. */
  isParent: boolean;
  families: FamilySummary[];
  activeFamilyId: string | null;
  /** families/{id} or rooms/{code}; null while a signed-in parent has no family. */
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

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
}

/** The family this device is scoped to, resolvable synchronously (for storage
 * key scoping outside React). Mirrors the provider's priority order. */
export function scopedFamilyId(): string | null {
  return readLocal(ACTIVE_KEY) || readLocal(PAIRED_KEY);
}

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
  const [activePref, setActivePref] = useState<string | null>(() =>
    readLocal(ACTIVE_KEY),
  );
  const [bump, setBump] = useState(0);
  const reload = useCallback(() => setBump((b) => b + 1), []);

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
      const legacyBase = `rooms/${safe(readSyncCode())}`;
      const setLegacy = () =>
        !cancelled &&
        setState({
          loading: false,
          user,
          isParent: false,
          families: [],
          activeFamilyId: null,
          basePath: legacyBase,
          needsFamily: false,
        });

      if (!FIREBASE_READY || !user) {
        setLegacy();
        return;
      }

      const db = getDb();
      const isParent = !user.isAnonymous;

      if (!isParent) {
        // Kids' shared device: use its paired family, else legacy room.
        const paired = readLocal(PAIRED_KEY);
        if (!cancelled)
          setState({
            loading: false,
            user,
            isParent: false,
            families: [],
            activeFamilyId: paired,
            basePath: paired ? `families/${safe(paired)}` : legacyBase,
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
      const active =
        activePref && families.some((f) => f.id === activePref)
          ? activePref
          : families[0].id;
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
  }, [user, activePref, bump]);

  const setActiveFamilyId = useCallback((id: string) => {
    try {
      localStorage.setItem(ACTIVE_KEY, id);
    } catch {
      /* ignore */
    }
    setActivePref(id);
  }, []);

  const createFamily = useCallback(
    async (name: string): Promise<string> => {
      const db = getDb();
      if (!db || !user) throw new Error("Not signed in");
      const fid = newId();
      const uid = user.uid;
      const now = Date.now();
      // Matches the rules bootstrap clause: same write installs the caller as a
      // parent member of the brand-new family.
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
      setActiveFamilyId(fid);
      reload();
      return fid;
    },
    [user, setActiveFamilyId, reload],
  );

  const pairDevice = useCallback(
    (familyId: string) => {
      try {
        localStorage.setItem(PAIRED_KEY, familyId);
      } catch {
        /* ignore */
      }
      reload();
    },
    [reload],
  );

  const unpairDevice = useCallback(() => {
    try {
      localStorage.removeItem(PAIRED_KEY);
    } catch {
      /* ignore */
    }
    reload();
  }, [reload]);

  const value = useMemo<FamilyContextValue>(
    () => ({
      ...state,
      setActiveFamilyId,
      createFamily,
      pairDevice,
      unpairDevice,
      reload,
    }),
    [state, setActiveFamilyId, createFamily, pairDevice, unpairDevice, reload],
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
