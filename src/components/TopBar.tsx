import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { getLevelInfo } from "../data/levels";
import {
  coinBalance,
  getKid,
  getKidXp,
  kidUnreadCount,
} from "../store/selectors";
import { Avatar3DThumb } from "../features/avatar/Avatar3DThumb";
import { AppIcon } from "./AppIcon";
import { TABS, type TabId } from "../App";
import type { KidId } from "../types";

export function TopBar({
  tab,
  onTab,
  user,
  onLogout,
  onHome,
}: {
  tab: TabId;
  onTab: (t: TabId) => void;
  user: KidId;
  onLogout: () => void;
  onHome: () => void;
}) {
  const { state } = useApp();
  const kidUnread = kidUnreadCount(state, user);
  const kid = getKid(state, user);
  const level = getLevelInfo(getKidXp(state, user));
  const coins = coinBalance(state, user);
  const [moreOpen, setMoreOpen] = useState(false);
  // The tab bar is the child's daily path, ordered by frequency: orient,
  // see the plan, open learning tools, then do the work. Everything else is
  // available in the library without competing with those four jobs.
  const primaryIds: TabId[] = ["home", "schedule", "applications", "missions"];
  const secondaryIds: TabId[] = [
    "world",
    "messages",
    "family-wall",
    "avatar",
    "trophies",
  ];
  const primaryTabs = TABS.filter((item) => primaryIds.includes(item.id));
  const moreActive = secondaryIds.includes(tab) || tab === "parent";
  const tabMeta = (id: TabId) => TABS.find((item) => item.id === id)!;

  const go = (next: TabId) => {
    setMoreOpen(false);
    onTab(next);
  };

  return (
    <header className="topbar">
      <button
        className="topbar__brand"
        onClick={onHome}
        aria-label="Return to the Luminara landing page"
        title="Luminara home"
      >
        <img
          className="topbar__logo"
          src={`${import.meta.env.BASE_URL}luminara-icon.png`}
          alt="Luminara"
          width={46}
          height={46}
        />
        <div>
          <h1 className="topbar__title">Luminara</h1>
          <p className="topbar__subtitle">Spark curiosity · Build skills · Light tomorrow</p>
        </div>
      </button>

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
              Level {level.rank.level}
            </span>
            <button
              className="coinchip"
              onClick={() => go("avatar")}
              title="Spend coins in the Avatar Studio"
            >
              <AppIcon name="gift" /> {coins} coins
            </button>
          </span>
        </span>
      </div>

      <nav className="tabs" aria-label="Primary sections">
        {primaryTabs.map((t) => (
          <button
            key={t.id}
            className={`tabs__btn ${tab === t.id ? "is-active" : ""}`}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span className="tabs__emoji"><AppIcon name={t.icon} /></span>
            <span className="tabs__label">{t.label}</span>
            {t.id === "messages" && kidUnread > 0 && (
              <span className="tabs__pip">{kidUnread}</span>
            )}
          </button>
        ))}
        <button
          className={`tabs__btn ${moreActive ? "is-active" : ""}`}
          onClick={() => setMoreOpen((open) => !open)}
          aria-label="More sections"
          aria-expanded={moreOpen}
        >
          <span className="tabs__emoji"><AppIcon name="more" /></span>
          <span className="tabs__label">More</span>
        </button>
      </nav>

      {moreOpen && createPortal(
        <div className="moresheet" role="dialog" aria-label="More sections">
          <button
            className="moresheet__backdrop"
            onClick={() => setMoreOpen(false)}
            aria-label="Close more sections"
          />
          <div className="moresheet__panel">
            <div className="moresheet__handle" aria-hidden="true" />
            <div className="moresheet__head">
              <div>
                <span className="moresheet__eyebrow">Library</span>
                <h2 className="moresheet__title">Explore Luminara</h2>
              </div>
              <button
                className="moresheet__close"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more sections"
              >
                ×
              </button>
            </div>
            <button
              className={`morefeature ${tab === "world" ? "is-active" : ""}`}
              onClick={() => go("world")}
            >
              <span className="morefeature__icon"><AppIcon name="world" /></span>
              <span className="morefeature__copy">
                <strong>World</strong>
                <small>Explore, learn, and play together</small>
              </span>
              <span className="morefeature__go" aria-hidden="true">›</span>
            </button>

            <div className="moregroups">
              <section className="moregroup">
                <h3>Connect</h3>
                <div className="moregroup__items">
                  {["messages", "family-wall"].map((id) => {
                    const item = tabMeta(id as TabId);
                    return (
                      <button
                        key={item.id}
                        className={`moreitem ${tab === item.id ? "is-active" : ""}`}
                        onClick={() => go(item.id)}
                      >
                        <span className="moreitem__icon"><AppIcon name={item.icon} /></span>
                        <span className="moreitem__copy">
                          <strong>{item.label}</strong>
                          <small>{item.id === "messages" ? "Talk with your family" : "Share cheers and moments"}</small>
                        </span>
                        {item.id === "messages" && kidUnread > 0 && (
                          <span className="moreitem__badge">{kidUnread}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="moregroup">
                <h3>Your space</h3>
                <div className="moregroup__items">
                  {["avatar", "trophies"].map((id) => {
                    const item = tabMeta(id as TabId);
                    return (
                      <button
                        key={item.id}
                        className={`moreitem ${tab === item.id ? "is-active" : ""}`}
                        onClick={() => go(item.id)}
                      >
                        <span className="moreitem__icon"><AppIcon name={item.icon} /></span>
                        <span className="moreitem__copy">
                          <strong>{item.label}</strong>
                          <small>{item.id === "avatar" ? "Personalize your look" : "See what you’ve earned"}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="moresheet__utilities">
              <button className="moreutility" onClick={onHome}>
                <span className="moreitem__icon"><AppIcon name="home" /></span>
                <span><strong>Luminara home</strong><small>Return to the landing page</small></span>
                <AppIcon name="arrow-right" />
              </button>
              <button className="moreutility" onClick={() => go("parent")}>
                <span className="moreitem__icon"><AppIcon name="lock" /></span>
                <span><strong>Grown-ups</strong><small>Family controls and progress</small></span>
                <AppIcon name="arrow-right" />
              </button>
              <button className="moreutility moreutility--danger" onClick={onLogout}>
                <span className="moreitem__icon"><AppIcon name="person" /></span>
                <span><strong>Switch kid</strong><small>Leave {kid.firstName}'s space</small></span>
                <AppIcon name="arrow-right" />
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
