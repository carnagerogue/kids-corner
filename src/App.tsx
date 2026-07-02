import { lazy, Suspense, useEffect, useState } from "react";
import { useApp } from "./store/AppContext";
import { useFamily } from "./store/FamilyContext";
import { signOutUser } from "./firebase";
import { getKid } from "./store/selectors";
import { readSession, writeSession } from "./store/storage";
import { TopBar } from "./components/TopBar";
import { ScheduleNotifier } from "./components/ScheduleNotifier";
import { MessageNotifier } from "./components/MessageNotifier";
import { AnnouncementNotifier } from "./components/AnnouncementNotifier";
import { ReactionNotifier } from "./components/ReactionNotifier";
import { Celebrations } from "./components/Celebrations";
import { LoginScreen } from "./components/LoginScreen";
import { ConnectDevice } from "./components/ConnectDevice";
import { GuardianBridge } from "./components/GuardianBridge";
import { CommandCenter } from "./views/CommandCenter";
import { ScheduleView } from "./views/ScheduleView";
import { ApplicationsView } from "./views/ApplicationsView";
import { MissionBoard } from "./views/MissionBoard";
import { AvatarStudio } from "./views/AvatarStudio";
import { TrophyRoom } from "./views/TrophyRoom";
import { MessagesView } from "./views/MessagesView";
import { FamilyWallView } from "./views/FamilyWallView";
import { ParentZone } from "./views/ParentZone";
import type { AppIconName } from "./components/AppIcon";
import type { KidId } from "./types";

const WorldView = lazy(() => import("./world/WorldView"));

export type TabId =
  | "home"
  | "schedule"
  | "applications"
  | "missions"
  | "avatar"
  | "world"
  | "trophies"
  | "family-wall"
  | "messages"
  | "parent";

export const TABS: { id: TabId; label: string; icon: AppIconName }[] = [
  { id: "home", label: "Today", icon: "home" },
  { id: "schedule", label: "Plan", icon: "calendar" },
  { id: "applications", label: "Apps", icon: "apps" },
  { id: "missions", label: "Missions", icon: "target" },
  { id: "avatar", label: "Avatar", icon: "person" },
  { id: "world", label: "World", icon: "world" },
  { id: "trophies", label: "Trophies", icon: "trophy" },
  { id: "family-wall", label: "Family", icon: "heart" },
  { id: "messages", label: "Messages", icon: "message" },
];

export function App() {
  const { state, dispatch } = useApp();
  const fam = useFamily();
  const [user, setUser] = useState<KidId | null>(() => readSession());
  const [tab, setTab] = useState<TabId>("home");
  // Entry choice on a device that isn't a signed-in grown-up: pick Kid or
  // Grown-Up. "child" reveals the family's kid login.
  const [entry, setEntry] = useState<"choose" | "child">("choose");

  const login = (kidId: KidId) => {
    setUser(kidId);
    writeSession(kidId);
    dispatch({ type: "SET_ACTIVE_KID", kidId });
    setTab("home");
  };

  const logout = () => {
    setUser(null);
    writeSession(null);
    setTab("home");
  };

  // If the logged-in kid was removed (here or in another tab), log out.
  useEffect(() => {
    if (user !== null && !state.kidProfiles.some((k) => k.id === user)) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.kidProfiles]);

  // If the device becomes UNBOUND while a kid is mid-session (parent
  // disconnected it, or a legacy tablet reloaded after migration), drop the
  // session — the kid session lives in sessionStorage and would otherwise keep
  // rendering the full UI from cache, bypassing the connect-this-device gate.
  useEffect(() => {
    if (user !== null && !fam.loading && !fam.bound) {
      logout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, fam.bound, fam.loading]);

  // Keep the shared activeKid pinned to whoever is logged in on this device, so
  // a page reload or a cross-tab/cross-device state merge can never leave the
  // views (schedule, missions, XP) showing another kid's data.
  useEffect(() => {
    if (user !== null && state.activeKid !== user) {
      dispatch({ type: "SET_ACTIVE_KID", kidId: user });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, state.activeKid]);

  // Drive the whole-app palette from the logged-in kid's chosen theme (dark
  // themes restyle the page). Cleared on the login screen so it's always light.
  useEffect(() => {
    const root = document.documentElement;
    const theme = user && tab !== "parent" ? state.themes[user] : undefined;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }, [user, tab, state.themes]);

  // While family/auth is still resolving, hold on a splash so we don't flash
  // the entry choice and then jump to the parent area.
  if (fam.loading) {
    return (
      <div className="app">
        <main className="app__main">
          <div className="world world--msg">Loading Luminara… ✨</div>
        </main>
      </div>
    );
  }

  // A grown-up signed in with Google -> straight into their area (their
  // dashboard, or "create your family" the first time). No PIN — the Google
  // sign-in IS the gate. This is what "brought right into their dashboard
  // after signin" means; it also survives the sign-in redirect.
  if (fam.isParent) {
    return (
      <div className="app">
        <main className="app__main">
          <ParentZone
            onExit={() => {
              void signOutUser();
              setEntry("choose");
              setTab("home");
            }}
          />
        </main>
      </div>
    );
  }

  // Not logged in as anyone yet.
  if (user === null) {
    // Grown-up entry (not yet signed in): Google sign-in + the legacy PIN gate.
    if (tab === "parent") {
      return (
        <div className="app">
          <main className="app__main">
            <ParentZone
              onExit={() => {
                setTab("home");
                setEntry("choose");
              }}
            />
          </main>
        </div>
      );
    }
    // Kid picked. A BOUND device shows the family's own kid login; an unbound
    // one shows the connect-this-device prompt — never a roster, so a stranger
    // (or another family's child) can't see who lives here.
    if (entry === "child") {
      return fam.bound ? (
        <LoginScreen
          onLogin={login}
          onParent={() => setTab("parent")}
          onBack={() => setEntry("choose")}
        />
      ) : (
        <ConnectDevice
          onParent={() => setTab("parent")}
          onBack={() => setEntry("choose")}
        />
      );
    }
    // First screen: choose Grown-Up or Kid.
    return (
      <EntryChoice
        onChild={() => setEntry("child")}
        onGrownup={() => setTab("parent")}
      />
    );
  }

  const kid = getKid(state, user);
  const themeStyle = {
    ["--kid" as string]: kid.color,
    ["--kid-dark" as string]: kid.colorDark,
    ["--kid-soft" as string]: kid.colorSoft,
  } as React.CSSProperties;

  return (
    <div className={`app ${tab === "parent" ? "app--parent" : ""}`} style={themeStyle}>
      <ScheduleNotifier />
      <MessageNotifier viewer={user} />
      <AnnouncementNotifier />
      <ReactionNotifier user={user} />
      <Celebrations user={user} />
      {tab !== "parent" && (
        <TopBar tab={tab} onTab={setTab} user={user} onLogout={logout} />
      )}
      {tab !== "parent" && <GuardianBridge kidId={user} />}
      <main className="app__main">
        {tab === "home" && <CommandCenter onTab={setTab} />}
        {tab === "schedule" && <ScheduleView onTab={setTab} />}
        {tab === "applications" && <ApplicationsView />}
        {tab === "missions" && <MissionBoard />}
        {tab === "avatar" && <AvatarStudio />}
        {tab === "world" && (
          <Suspense
            fallback={<div className="world world--msg">Loading the World… 🌍</div>}
          >
            <WorldView />
          </Suspense>
        )}
        {tab === "trophies" && <TrophyRoom />}
        {tab === "family-wall" && <FamilyWallView onTab={setTab} />}
        {tab === "messages" && <MessagesView />}
        {tab === "parent" && <ParentZone onExit={() => setTab("home")} />}
      </main>
      <footer className="app__footer">
        <span>
          Luminara · Spark curiosity · Build skills · Light tomorrow ·{" "}
          <a className="app__footer-link" href={`${import.meta.env.BASE_URL}privacy.html`}>
            Privacy
          </a>
        </span>
        <span className="app__footer-motto">
          {kid.emoji} {kid.motto}
        </span>
      </footer>
    </div>
  );
}

function EntryChoice({
  onChild,
  onGrownup,
}: {
  onChild: () => void;
  onGrownup: () => void;
}) {
  return (
    <div className="login">
      <div className="login__card">
        <img
          className="login__logo-full"
          src={`${import.meta.env.BASE_URL}luminara-logo.png`}
          alt="Luminara — Spark curiosity, Build skills, Light tomorrow"
        />
        <p className="login__eyebrow">Welcome home</p>
        <h2 className="login__prompt">Who’s learning today?</h2>
        <p className="login__intro">
          Choose your space to continue. Everything is organized around your family.
        </p>
        <div className="entrychoice">
          <button
            className="entrychoice__btn entrychoice__btn--kid"
            onClick={onChild}
          >
            <EntryIcon kind="kid" />
            <span className="entrychoice__label">Kid space</span>
            <span className="entrychoice__sub">My day, missions, and world</span>
          </button>
          <button
            className="entrychoice__btn entrychoice__btn--grown"
            onClick={onGrownup}
          >
            <EntryIcon kind="grownup" />
            <span className="entrychoice__label">Grown-up space</span>
            <span className="entrychoice__sub">Family setup and progress</span>
          </button>
        </div>
      </div>
      <footer className="login__legal">
        <a href={`${import.meta.env.BASE_URL}privacy.html`}>Privacy Policy</a>
      </footer>
    </div>
  );
}

function EntryIcon({ kind }: { kind: "kid" | "grownup" }) {
  return (
    <span className={`entrychoice__icon entrychoice__icon--${kind}`} aria-hidden="true">
      {kind === "kid" ? (
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="12" r="5" />
          <path d="M7.5 26c.8-5.2 3.6-8 8.5-8s7.7 2.8 8.5 8" />
          <path className="entrychoice__spark" d="M25 5v4M23 7h4" />
        </svg>
      ) : (
        <svg viewBox="0 0 32 32" fill="none">
          <circle cx="12.5" cy="12" r="4.5" />
          <circle cx="22.5" cy="13" r="3.5" />
          <path d="M4.5 26c.8-5.1 3.4-7.7 8-7.7s7.2 2.6 8 7.7" />
          <path d="M19.5 19.6c1-.6 2.1-.9 3.4-.9 3.4 0 5.4 2.2 6 6.3" />
        </svg>
      )}
    </span>
  );
}
