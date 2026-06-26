import { useEffect, useState } from "react";
import { useApp } from "./store/AppContext";
import { getKid } from "./store/selectors";
import { readSession, writeSession } from "./store/storage";
import { TopBar } from "./components/TopBar";
import { ScheduleNotifier } from "./components/ScheduleNotifier";
import { MessageNotifier } from "./components/MessageNotifier";
import { AnnouncementNotifier } from "./components/AnnouncementNotifier";
import { Celebrations } from "./components/Celebrations";
import { LoginScreen } from "./components/LoginScreen";
import { CommandCenter } from "./views/CommandCenter";
import { ScheduleView } from "./views/ScheduleView";
import { ApplicationsView } from "./views/ApplicationsView";
import { MissionBoard } from "./views/MissionBoard";
import { AvatarStudio } from "./views/AvatarStudio";
import { TrophyRoom } from "./views/TrophyRoom";
import { MessagesView } from "./views/MessagesView";
import { ParentZone } from "./views/ParentZone";
import type { KidId } from "./types";

export type TabId =
  | "home"
  | "schedule"
  | "applications"
  | "missions"
  | "avatar"
  | "trophies"
  | "messages"
  | "parent";

export const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "home", label: "Command Center", emoji: "🛰️" },
  { id: "schedule", label: "Schedule", emoji: "🗓️" },
  { id: "applications", label: "Applications", emoji: "🧭" },
  { id: "missions", label: "Missions", emoji: "🎯" },
  { id: "avatar", label: "Avatar", emoji: "🧢" },
  { id: "trophies", label: "Trophies", emoji: "🏆" },
  { id: "messages", label: "Messages", emoji: "💬" },
];

export function App() {
  const { state, dispatch } = useApp();
  const [user, setUser] = useState<KidId | null>(() => readSession());
  const [tab, setTab] = useState<TabId>("home");

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

  // Not logged in: show the login screen — unless a grown-up is heading to the
  // parent area, which has its own PIN gate.
  if (user === null) {
    if (tab === "parent") {
      return (
        <div className="app">
          <main className="app__main">
            <ParentZone onExit={() => setTab("home")} />
          </main>
        </div>
      );
    }
    return (
      <LoginScreen onLogin={login} onParent={() => setTab("parent")} />
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
      <Celebrations user={user} />
      <TopBar tab={tab} onTab={setTab} user={user} onLogout={logout} />
      <main className="app__main">
        {tab === "home" && <CommandCenter onTab={setTab} />}
        {tab === "schedule" && <ScheduleView onTab={setTab} />}
        {tab === "applications" && <ApplicationsView />}
        {tab === "missions" && <MissionBoard />}
        {tab === "avatar" && <AvatarStudio />}
        {tab === "trophies" && <TrophyRoom />}
        {tab === "messages" && <MessagesView />}
        {tab === "parent" && <ParentZone onExit={() => setTab("home")} />}
      </main>
      <footer className="app__footer">
        <span>Kids Corner · Summer Command Center</span>
        <span className="app__footer-motto">
          {kid.emoji} {kid.motto}
        </span>
      </footer>
    </div>
  );
}
