import { useState } from "react";
import { useApp } from "./store/AppContext";
import { KIDS } from "./data/kids";
import { TopBar } from "./components/TopBar";
import { CommandCenter } from "./views/CommandCenter";
import { ScheduleView } from "./views/ScheduleView";
import { ApplicationsView } from "./views/ApplicationsView";
import { MissionBoard } from "./views/MissionBoard";
import { TrophyRoom } from "./views/TrophyRoom";
import { ParentZone } from "./views/ParentZone";

export type TabId =
  | "home"
  | "schedule"
  | "applications"
  | "missions"
  | "trophies"
  | "parent";

export const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: "home", label: "Command Center", emoji: "🛰️" },
  { id: "schedule", label: "Schedule", emoji: "🗓️" },
  { id: "applications", label: "Applications", emoji: "🧭" },
  { id: "missions", label: "Missions", emoji: "🎯" },
  { id: "trophies", label: "Trophies", emoji: "🏆" },
];

export function App() {
  const { state } = useApp();
  const [tab, setTab] = useState<TabId>("home");
  const kid = KIDS[state.activeKid];

  const themeStyle = {
    ["--kid" as string]: kid.color,
    ["--kid-dark" as string]: kid.colorDark,
    ["--kid-soft" as string]: kid.colorSoft,
  } as React.CSSProperties;

  return (
    <div className="app" style={themeStyle}>
      <TopBar tab={tab} onTab={setTab} />
      <main className="app__main">
        {tab === "home" && <CommandCenter onTab={setTab} />}
        {tab === "schedule" && <ScheduleView onTab={setTab} />}
        {tab === "applications" && <ApplicationsView />}
        {tab === "missions" && <MissionBoard />}
        {tab === "trophies" && <TrophyRoom />}
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
