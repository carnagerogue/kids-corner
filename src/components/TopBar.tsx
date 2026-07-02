import { useApp } from "../store/AppContext";
import { getLevelInfo } from "../data/levels";
import {
  coinBalance,
  getKid,
  getKidXp,
  kidUnreadCount,
} from "../store/selectors";
import { Avatar3DThumb } from "../features/avatar/Avatar3DThumb";
import { LuminaraMark } from "./LuminaraMark";
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
  const kidUnread = kidUnreadCount(state, user);
  const kid = getKid(state, user);
  const level = getLevelInfo(getKidXp(state, user));
  const coins = coinBalance(state, user);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <LuminaraMark className="topbar__logo" size={30} />
        <div>
          <h1 className="topbar__title">Luminara</h1>
          <p className="topbar__subtitle">Spark curiosity · Build skills · Light tomorrow</p>
        </div>
      </div>

      <div className="whoami">
        <button
          className="whoami__avatar whoami__avatar--btn"
          style={{ ["--this-kid" as string]: kid.color }}
          onClick={() => onTab("avatar")}
          aria-label="Open Avatar Studio"
          title="Avatar Studio"
        >
          <Avatar3DThumb kidId={user} size={42} />
        </button>
        <span className="whoami__meta">
          <span className="whoami__name">{kid.firstName}</span>
          <span className="whoami__badges">
            <span className="whoami__lvl">
              {level.rank.emoji} Lv {level.rank.level}
            </span>
            <button
              className="coinchip"
              onClick={() => onTab("avatar")}
              title="Spend coins in the Avatar Studio"
            >
              🪙 {coins}
            </button>
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
        </button>
      </nav>
    </header>
  );
}
