import { useApp } from "../store/AppContext";
import { KID_LIST } from "../data/kids";
import { getLevelInfo } from "../data/levels";
import { getKidXp, pendingCount } from "../store/selectors";
import { TABS, type TabId } from "../App";

export function TopBar({
  tab,
  onTab,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
}) {
  const { state, dispatch } = useApp();
  const pending = pendingCount(state);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">☀️</span>
        <div>
          <h1 className="topbar__title">Kids Corner</h1>
          <p className="topbar__subtitle">Summer Command Center</p>
        </div>
      </div>

      <div className="kidswitch" role="tablist" aria-label="Choose a kid">
        {KID_LIST.map((kid) => {
          const active = kid.id === state.activeKid;
          const level = getLevelInfo(getKidXp(state, kid.id));
          return (
            <button
              key={kid.id}
              role="tab"
              aria-selected={active}
              className={`kidswitch__btn ${active ? "is-active" : ""}`}
              style={{
                ["--this-kid" as string]: kid.color,
                ["--this-kid-soft" as string]: kid.colorSoft,
              }}
              onClick={() => dispatch({ type: "SET_ACTIVE_KID", kidId: kid.id })}
            >
              <span className="kidswitch__avatar">{kid.emoji}</span>
              <span className="kidswitch__meta">
                <span className="kidswitch__name">{kid.firstName}</span>
                <span className="kidswitch__lvl">
                  {level.rank.emoji} Lv {level.rank.level}
                </span>
              </span>
            </button>
          );
        })}
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
          {pending > 0 && <span className="tabs__pip">{pending}</span>}
        </button>
      </nav>
    </header>
  );
}
