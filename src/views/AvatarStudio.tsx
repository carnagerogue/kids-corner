// ---------------------------------------------------------------------------
// AvatarStudio — the game-like character screen: a 3D stage (procedural chibi
// now, real VRM when assets are added) + Customize / Shop / Items / Mystery Box.
// The coin economy is the app's existing synced ledger (see AvatarEconomy).
// ---------------------------------------------------------------------------
import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid } from "../store/selectors";
import { useAvatarEconomy } from "../features/avatar/AvatarEconomy";
import { AvatarStage } from "../features/avatar/AvatarStage";
import { AvatarCustomizer } from "../features/avatar/AvatarCustomizer";
import { AvatarShop } from "../features/avatar/AvatarShop";
import { AvatarInventory } from "../features/avatar/AvatarInventory";
import { MysteryBox } from "../features/avatar/MysteryBox";

type StudioTab = "customize" | "shop" | "inventory" | "box";

const TABS: { id: StudioTab; label: string; emoji: string }[] = [
  { id: "customize", label: "Customize", emoji: "🎨" },
  { id: "shop", label: "Shop", emoji: "🛍️" },
  { id: "inventory", label: "Items", emoji: "🎒" },
  { id: "box", label: "Mystery Box", emoji: "🎁" },
];

export function AvatarStudio() {
  const { state } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const econ = useAvatarEconomy(kidId);
  const [tab, setTab] = useState<StudioTab>("customize");
  const [celebrate, setCelebrate] = useState(0);
  const bump = () => setCelebrate((c) => c + 1);

  const level = econ.level;
  const pct = Math.round(level.progress * 100);

  return (
    <div className="avatarstudio">
      <header className="studiohead">
        <div className="studiohead__id">
          <h2 className="studiohead__title">{kid.firstName}'s Character</h2>
          <div className="studiohead__rank">
            {level.rank.emoji} Level {level.rank.level} · {level.rank.title}
          </div>
        </div>
        <div className="studiohead__coins" title="Coins earned from learning">
          <span className="studiohead__coin">🪙</span> {econ.balance}
        </div>
      </header>

      <div className="studio__xp">
        <div className="studio__xpbar">
          <div className="studio__xpfill" style={{ width: `${pct}%` }} />
        </div>
        <span className="studio__xptext">
          {level.next
            ? `${level.xpIntoLevel} / ${level.xpForLevel} XP to ${level.next.emoji} ${level.next.title}`
            : "Max level — legend! 🌟"}
        </span>
      </div>

      <div className="studio__layout">
        <div className="studio__stagewrap">
          <AvatarStage kidId={kidId} celebrate={celebrate} />
          <div className="studio__earnhint">
            💡 Finish tasks, missions &amp; streaks to earn more coins.
          </div>
          <p className="studio__credits">
            Sample 3D models: © pixiv Inc. &amp; “Seed-san” © VirtualCast, Inc. ·
            idle animation from moeru-ai/airi (MIT) · accessories via Poly Pizza:
            Quaternius &amp; iPoly3D (CC0), “Cat Ears”/“Aviators” © Poly by Google
            &amp; “Ball Cap” © Jarlan Perez (CC-BY). Bonus characters (Chubby Cat,
            Froggy, Snowman, Hot Dog, Candy Cane, Happy Worm) via Open Source
            Avatars — Polygonal Mind &amp; ToxSam (CC0). Dress Girl / Princess /
            School Girl / School Boy are © VRoid Project (pixiv), released CC0.
            Space backdrop from a SpaceScape CC0 skybox; other rooms are
            procedural 3D scenes. Replace with your own VRoid models anytime.
          </p>
        </div>

        <div className="studio__panel">
          <nav className="studiotabs" role="tablist" aria-label="Avatar studio">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`studiotab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                <span aria-hidden>{t.emoji}</span>
                <span className="studiotab__label">{t.label}</span>
                {t.id === "box" && econ.canOpenDailyBox && (
                  <span className="studiotab__dot" aria-label="free box ready" />
                )}
              </button>
            ))}
          </nav>

          <div className="studio__panelbody">
            {tab === "customize" && (
              <AvatarCustomizer kidId={kidId} onCelebrate={bump} />
            )}
            {tab === "shop" && <AvatarShop kidId={kidId} onCelebrate={bump} />}
            {tab === "inventory" && (
              <AvatarInventory kidId={kidId} onCelebrate={bump} />
            )}
            {tab === "box" && <MysteryBox kidId={kidId} onCelebrate={bump} />}
          </div>
        </div>
      </div>
    </div>
  );
}
