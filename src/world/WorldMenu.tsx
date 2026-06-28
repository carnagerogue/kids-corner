// ---------------------------------------------------------------------------
// WorldMenu — a single hub that replaces four crowded toolbar buttons. Big,
// labelled tiles route to the Quests, Arcade, Shop, and Awards panels. Pure UI;
// WorldView owns which panel actually opens.
// ---------------------------------------------------------------------------
type Props = {
  level: number;
  title: string;
  tokens: number;
  dailyReady: boolean;
  onQuests: () => void;
  onArcade: () => void;
  onShop: () => void;
  onAwards: () => void;
  onClose: () => void;
};

export function WorldMenu({
  level,
  title,
  tokens,
  dailyReady,
  onQuests,
  onArcade,
  onShop,
  onAwards,
  onClose,
}: Props) {
  const tiles = [
    {
      key: "quests",
      icon: "📜",
      label: "Quests",
      desc: "Story quests, daily goal & buddies",
      onClick: onQuests,
      badge: dailyReady,
    },
    {
      key: "arcade",
      icon: "🎮",
      label: "Arcade",
      desc: "Word Scramble & Math Dash",
      onClick: onArcade,
      badge: false,
    },
    {
      key: "shop",
      icon: "🛍️",
      label: "Shop",
      desc: "Auras & companions",
      onClick: onShop,
      badge: false,
    },
    {
      key: "awards",
      icon: "🏅",
      label: "Awards",
      desc: "Badges & family ranks",
      onClick: onAwards,
      badge: false,
    },
  ];

  return (
    <div className="academy worldmenu" role="dialog" aria-modal="true" aria-labelledby="worldmenu-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Close menu">
          ×
        </button>
        <div className="academy__head">
          <h3 id="worldmenu-title">☰ Menu</h3>
          <span className="academy__lv">
            🎓 Lv {level} · {title} · 🪙 {tokens}
          </span>
        </div>
        <div className="worldmenu__grid">
          {tiles.map((t) => (
            <button key={t.key} className="worldmenu__tile" onClick={t.onClick}>
              <span className="worldmenu__icon">
                {t.icon}
                {t.badge && <em className="worldmenu__badge">🎁</em>}
              </span>
              <strong>{t.label}</strong>
              <small>{t.desc}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
