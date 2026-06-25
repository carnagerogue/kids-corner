import { useApp } from "../store/AppContext";
import { KIDS } from "../data/kids";
import { getLevelInfo } from "../data/levels";
import {
  getKidXp,
  kidUnreadCount,
  parentUnreadCount,
  pendingCount,
} from "../store/selectors";
import { TABS, type TabId } from "../App";
import type { KidId } from "../types";

export function TopBar({
  tab,
  onTab,
  user,
  onLogout,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  user: KidId;
  onLogout: () => void;
}) {
  const { state } = useApp();
  const pending = pendingCount(state);
  const kidUnread = kidUnreadCount(state, user);
  const grownupPip = pending + parentUnreadCount(state);
  const kid = KIDS[user];
  const level = getLevelInfo(getKidXp(state, user));

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">☀️</span>
        <div>
          <h1 className="topbar__title">Kids Corner</h1>
          <p className="topbar__subtitle">Summer Command Center</p>
        </div>
      </div>

      <div className="whoami">
        <span
          className="whoami__avatar"
          style={{ ["--this-kid" as string]: kid.color }}
        >
          {kid.emoji}
        </span>
        <span className="whoami__meta">
          <span className="whoami__name">{kid.firstName}</span>
          <span className="whoami__lvl">
            {level.rank.emoji} Lv {level.rank.level}
          </span>
        </span>
        <button className="whoami__logout" onClick={onLogout}>
          Log out
        </button>
      </div>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tabs__btn ${tab === t.id ? "is-active" : ""}`}
            onClick={() => onTab(t.id)}
          >
            <span className="tabs__emoji">{t.emoji}</span>
            <span className="tabs__label">{t.label}</span>
            {t.id === "messages" && kidUnread > 0 && (
              <span className="tabs__pip">{kidUnread}</span>
            )}
          </button>
        ))}
        <button
          className={`tabs__btn tabs__btn--parent ${
            tab === "parent" ? "is-active" : ""
          }`}
          onClick={() => onTab("parent")}
          aria-label="Grown-ups area"
        >
          <span className="tabs__emoji">🔒</span>
          <span className="tabs__label">Grown-Ups</span>
          {grownupPip > 0 && <span className="tabs__pip">{grownupPip}</span>}
        </button>
      </nav>
    </header>
  );
}
