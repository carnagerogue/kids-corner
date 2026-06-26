import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import {
  canSpinFree,
  coinBalance,
  equippedAvatar,
  getKid,
  getKidXp,
  ownsGear,
} from "../store/selectors";
import {
  Avatar,
  GEAR,
  GEAR_BY_ID,
  HAIR_COLORS,
  RARITY_META,
  SLOT_META,
  SPIN_COST,
} from "../data/avatar";
import { getLevelInfo } from "../data/levels";
import { playFanfare } from "../chime";
import type { AppState, AvatarConfig, GearItem, GearSlot } from "../types";

type Reward = { coins: number; gearId?: string };

/** Weighted mystery-box draw: sometimes a free cosmetic unlock, else coins. */
function rollReward(state: AppState, kidId: string): Reward {
  if (Math.random() < 0.3) {
    const pool = GEAR.filter(
      (g) => g.price > 0 && !g.levelReq && !ownsGear(state, kidId, g.id),
    );
    if (pool.length) {
      return { coins: 0, gearId: pool[Math.floor(Math.random() * pool.length)].id };
    }
  }
  const r = Math.random();
  const coins =
    r < 0.6
      ? 15 + Math.floor(Math.random() * 26)
      : r < 0.92
        ? 50 + Math.floor(Math.random() * 31)
        : 120 + Math.floor(Math.random() * 61);
  return { coins };
}

export function AvatarStudio() {
  const { state, dispatch } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const balance = coinBalance(state, kidId);
  const level = getLevelInfo(getKidXp(state, kidId)).rank;
  const equipped = equippedAvatar(state, kidId);
  const [slot, setSlot] = useState<GearSlot>("hair");
  const [burst, setBurst] = useState(0);
  const [pulse, setPulse] = useState(0);
  const [flash, setFlash] = useState("");
  const [reveal, setReveal] = useState<Reward | null>(null);

  const items = GEAR.filter((g) => g.slot === slot);

  const buy = (g: GearItem) => {
    dispatch({ type: "BUY_GEAR", kidId, gearId: g.id });
    setBurst((b) => b + 1);
    setPulse((p) => p + 1);
    setFlash(g.id);
  };
  const equip = (g: GearItem) => {
    dispatch({ type: "EQUIP_GEAR", kidId, slot: g.slot, gearId: g.id });
    setPulse((p) => p + 1);
    setFlash(g.id);
  };

  return (
    <div className="view">
      <div className="studio2">
        <AvatarStage
          config={equipped}
          name={kid.firstName}
          balance={balance}
          levelNum={level.level}
          rankTitle={level.title}
          rankEmoji={level.emoji}
          burst={burst}
          pulse={pulse}
        />

        <div className="shop">
          <MysteryBox
            kidId={kidId}
            balance={balance}
            free={canSpinFree(state, kidId)}
            onReveal={(r) => {
              playFanfare();
              setBurst((b) => b + 1);
              setReveal(r);
            }}
          />

          <nav className="shoptabs" aria-label="Cosmetic categories">
            {SLOT_META.map((s) => (
              <button
                key={s.slot}
                className={`shoptab ${slot === s.slot ? "is-active" : ""}`}
                onClick={() => setSlot(s.slot)}
              >
                <span className="shoptab__emoji">{s.emoji}</span>
                <span className="shoptab__label">{s.label}</span>
              </button>
            ))}
          </nav>

          {slot === "hair" && (
            <HairColorRow
              equipped={equipped}
              kidId={kidId}
              balance={balance}
              level={level.level}
            />
          )}

          <div className="shopgrid">
            {items.map((g) => (
              <CosmeticCard
                key={g.id}
                item={g}
                equipped={equipped}
                owned={ownsGear(state, kidId, g.id)}
                isOn={equipped[g.slot] === g.id}
                balance={balance}
                level={level.level}
                flash={flash === g.id}
                onBuy={() => buy(g)}
                onEquip={() => equip(g)}
              />
            ))}
          </div>
        </div>
      </div>

      {reveal && (
        <SpinReveal
          reward={reveal}
          equipped={equipped}
          onClose={() => setReveal(null)}
        />
      )}
    </div>
  );
}

function AvatarStage({
  config,
  name,
  balance,
  levelNum,
  rankTitle,
  rankEmoji,
  burst,
  pulse,
}: {
  config: AvatarConfig;
  name: string;
  balance: number;
  levelNum: number;
  rankTitle: string;
  rankEmoji: string;
  burst: number;
  pulse: number;
}) {
  return (
    <div className="stage">
      <div className="stage__top">
        <span className="stage__rank">
          {rankEmoji} Lv {levelNum} · {rankTitle}
        </span>
        <span className="stage__coins">🪙 {balance}</span>
      </div>

      <div className="stage__scene">
        <span className="stage__particles" aria-hidden="true">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} style={{ ["--i" as string]: i }} />
          ))}
        </span>
        <span className="stage__pop" key={pulse}>
          <Avatar
            config={config}
            size={300}
            animated
            showScene
            className="stage__avatar"
          />
        </span>
        <span className="stage__platform" aria-hidden="true" />
        {burst > 0 && (
          <span key={burst} className="coinburst" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ ["--i" as string]: i }}>
                🪙
              </i>
            ))}
          </span>
        )}
      </div>

      <strong className="stage__name">{name}</strong>
    </div>
  );
}

function MysteryBox({
  kidId,
  balance,
  free,
  onReveal,
}: {
  kidId: string;
  balance: number;
  free: boolean;
  onReveal: (r: Reward) => void;
}) {
  const { state, dispatch } = useApp();
  const [spinning, setSpinning] = useState(false);
  const canPaid = balance >= SPIN_COST;

  const spin = (isFree: boolean) => {
    if (spinning) return;
    if (isFree ? !free : !canPaid) return;
    setSpinning(true);
    window.setTimeout(() => {
      const reward = rollReward(state, kidId);
      dispatch({
        type: "APPLY_SPIN",
        kidId,
        coins: reward.coins,
        gearId: reward.gearId,
        free: isFree,
      });
      setSpinning(false);
      onReveal(reward);
    }, 850);
  };

  return (
    <div className={`mbox ${free ? "is-ready" : ""}`}>
      <button
        className={`mbox__gift ${spinning ? "is-spinning" : ""}`}
        aria-label="Open mystery box"
        onClick={() => spin(free)}
        disabled={spinning || (!free && !canPaid)}
      >
        🎁
      </button>
      <div className="mbox__body">
        <strong className="mbox__title">Daily Mystery Box</strong>
        <span className="mbox__sub">
          {spinning
            ? "Opening…"
            : free
              ? "A free surprise is waiting — coins or a new cosmetic!"
              : "Free box opened. Come back tomorrow for another!"}
        </span>
      </div>
      {free ? (
        <button
          className="mbox__btn mbox__btn--free"
          disabled={spinning}
          onClick={() => spin(true)}
        >
          Open free box
        </button>
      ) : (
        <button
          className="mbox__btn mbox__btn--paid"
          disabled={spinning || !canPaid}
          title={canPaid ? "" : "Not enough coins"}
          onClick={() => spin(false)}
        >
          Spin again · 🪙 {SPIN_COST}
        </button>
      )}
    </div>
  );
}

function SpinReveal({
  reward,
  equipped,
  onClose,
}: {
  reward: Reward;
  equipped: AvatarConfig;
  onClose: () => void;
}) {
  const gear = reward.gearId ? GEAR_BY_ID[reward.gearId] : null;
  const rarity = gear?.rarity ?? "legendary";
  const slotLabel =
    gear && SLOT_META.find((s) => s.slot === gear.slot)?.label;

  return createPortal(
    <div className="party" role="alertdialog" onClick={onClose}>
      <span className="coinburst coinburst--center" aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <i key={i} style={{ ["--i" as string]: i }}>
            {gear ? "✨" : "🪙"}
          </i>
        ))}
      </span>
      <div className={`party__card party__card--${gear ? rarity : "goal"}`}>
        <span className="party__kicker">Mystery Box</span>
        {gear ? (
          <>
            <div className="reveal__art">
              <Avatar
                config={{ ...equipped, [gear.slot]: gear.id }}
                size={130}
                showScene
              />
            </div>
            <strong className="party__title">New {slotLabel}!</strong>
            <span
              className="party__sub"
              style={{ color: RARITY_META[rarity].color }}
            >
              {gear.name} · {RARITY_META[rarity].label}
            </span>
          </>
        ) : (
          <>
            <span className="party__emoji">🪙</span>
            <strong className="party__title">+{reward.coins} coins!</strong>
            <span className="party__sub">Lucky spin!</span>
          </>
        )}
        <button className="btn btn--primary btn--big party__btn">Awesome!</button>
      </div>
    </div>,
    document.body,
  );
}

function CosmeticCard({
  item,
  equipped,
  owned,
  isOn,
  balance,
  level,
  flash,
  onBuy,
  onEquip,
}: {
  item: GearItem;
  equipped: AvatarConfig;
  owned: boolean;
  isOn: boolean;
  balance: number;
  level: number;
  flash: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const rarity = item.rarity ?? "common";
  const locked = !!item.levelReq && level < item.levelReq;
  const canAfford = balance >= item.price;
  const preview: AvatarConfig = { ...equipped, [item.slot]: item.id };

  return (
    <div
      className={`cosmo cosmo--${rarity} ${isOn ? "is-on" : ""} ${
        locked ? "is-locked" : ""
      } ${flash ? "is-flash" : ""}`}
    >
      <div className="cosmo__art">
        <Avatar config={preview} size={92} showScene />
        {isOn && <span className="cosmo__equipped">Worn</span>}
        {flash && <span className="cosmo__sparkles" aria-hidden="true" />}
      </div>
      <span className="cosmo__name">{item.name}</span>
      <span className="cosmo__rarity" style={{ color: RARITY_META[rarity].color }}>
        {RARITY_META[rarity].label}
      </span>
      {isOn ? (
        <span className="cosmo__btn cosmo__btn--on">✓ Equipped</span>
      ) : owned ? (
        <button className="cosmo__btn cosmo__btn--equip" onClick={onEquip}>
          Wear
        </button>
      ) : locked ? (
        <span className="cosmo__btn cosmo__btn--lock">🔒 Lv {item.levelReq}</span>
      ) : (
        <button
          className="cosmo__btn cosmo__btn--buy"
          disabled={!canAfford}
          title={canAfford ? `Buy for ${item.price} coins` : "Not enough coins yet"}
          onClick={onBuy}
        >
          🪙 {item.price}
        </button>
      )}
    </div>
  );
}

function HairColorRow({
  equipped,
  kidId,
  balance,
  level,
}: {
  equipped: AvatarConfig;
  kidId: string;
  balance: number;
  level: number;
}) {
  const { state, dispatch } = useApp();
  const colors = GEAR.filter((g) => g.slot === "hairColor");
  return (
    <div className="haircolors">
      <span className="haircolors__label">Color</span>
      <div className="haircolors__row">
        {colors.map((g) => {
          const owned = ownsGear(state, kidId, g.id);
          const isOn = equipped.hairColor === g.id;
          const locked = !!g.levelReq && level < g.levelReq;
          const hex = HAIR_COLORS[g.value]?.base ?? "#888";
          const act = () => {
            if (isOn) return;
            if (owned) dispatch({ type: "EQUIP_GEAR", kidId, slot: "hairColor", gearId: g.id });
            else if (!locked && balance >= g.price)
              dispatch({ type: "BUY_GEAR", kidId, gearId: g.id });
          };
          return (
            <button
              key={g.id}
              className={`swatch ${isOn ? "is-on" : ""} ${
                !owned && !locked ? "is-buy" : ""
              } ${locked ? "is-locked" : ""}`}
              style={{ background: hex }}
              title={
                owned
                  ? g.name
                  : locked
                    ? `${g.name} · Level ${g.levelReq}`
                    : `${g.name} · 🪙 ${g.price}`
              }
              onClick={act}
            >
              {isOn && <span className="swatch__check">✓</span>}
              {!owned && !locked && <span className="swatch__price">{g.price}</span>}
              {locked && <span className="swatch__lock">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
