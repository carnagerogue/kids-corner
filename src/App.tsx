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

export const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "home", label: "Home", emoji: "🛰️" },
  { id: "schedule", label: "Schedule", emoji: "🗓️" },
  { id: "applications", label: "Apps", emoji: "🧭" },
  { id: "missions", label: "Missions", emoji: "🎯" },
  { id: "avatar", label: "Avatar", emoji: "🧢" },
  { id: "world", label: "World", emoji: "🌍" },
  { id: "trophies", label: "Trophies", emoji: "🏆" },
  { id: "family-wall", label: "Family Wall", emoji: "💞" },
  { id: "messages", label: "Messages", emoji: "💬" },
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
    const theme = user ? state.themes[user] : undefined;
    if (theme) root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }, [user, state.themes]);

  // While family/auth is still resolving, hold on a splash so we don't flash
  // the entry choice and then jump to the parent area.
  if (fam.loading) {
    return (
      <div className="app">
        <main className="app__main">
          <div className="world world--msg">Loading Kids Corner… ☀️</div>
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
    <div className="app" style={themeStyle}>
      <ScheduleNotifier />
      <MessageNotifier viewer={user} />
      <AnnouncementNotifier />
      <ReactionNotifier user={user} />
      <Celebrations user={user} />
      <TopBar tab={tab} onTab={setTab} user={user} onLogout={logout} />
      <GuardianBridge kidId={user} />
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
          Kids Corner · Summer Command Center ·{" "}
          <a className="app__footer-link" href="/privacy.html">
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
        <div className="login__brand">
          <span className="login__logo">☀️</span>
          <div>
            <h1 className="login__title">Kids Corner</h1>
            <p className="login__subtitle">Summer Command Center</p>
          </div>
        </div>
        <h2 className="login__prompt">Who's here? 👋</h2>
        <div className="entrychoice">
          <button
            className="entrychoice__btn entrychoice__btn--kid"
            onClick={onChild}
          >
            <span className="entrychoice__emoji">🧒</span>
            <span className="entrychoice__label">I'm a Kid</span>
            <span className="entrychoice__sub">Pick your face &amp; PIN</span>
          </button>
          <button
            className="entrychoice__btn entrychoice__btn--grown"
            onClick={onGrownup}
          >
            <span className="entrychoice__emoji">🧑</span>
            <span className="entrychoice__label">I'm a Grown-Up</span>
            <span className="entrychoice__sub">Sign in to your dashboard</span>
          </button>
        </div>
      </div>
      <footer className="login__legal">
        <a href="/privacy.html">Privacy Policy</a>
      </footer>
    </div>
  );
}
