import { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  coinBalance,
  equippedAvatar,
  getKid,
  getKidXp,
  ownsGear,
} from "../store/selectors";
import {
  Avatar,
  GEAR,
  HAIR_COLORS,
  RARITY_META,
  SLOT_META,
} from "../data/avatar";
import { getLevelInfo } from "../data/levels";
import type { AvatarConfig, GearItem, GearSlot } from "../types";

export function AvatarStudio() {
  const { state, dispatch } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const balance = coinBalance(state, kidId);
  const level = getLevelInfo(getKidXp(state, kidId)).rank;
  const equipped = equippedAvatar(state, kidId);
  const [slot, setSlot] = useState<GearSlot>("hair");
  // Transient flourishes: coin burst on buy, glow pulse on equip.
  const [burst, setBurst] = useState(0);
  const [flash, setFlash] = useState("");

  const items = GEAR.filter((g) => g.slot === slot);

  const buy = (g: GearItem) => {
    dispatch({ type: "BUY_GEAR", kidId, gearId: g.id });
    setBurst((b) => b + 1);
    setFlash(g.id);
  };
  const equip = (g: GearItem) => {
    dispatch({ type: "EQUIP_GEAR", kidId, slot: g.slot, gearId: g.id });
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
        />

        <div className="shop">
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
}: {
  config: AvatarConfig;
  name: string;
  balance: number;
  levelNum: number;
  rankTitle: string;
  rankEmoji: string;
  burst: number;
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
        <Avatar
          config={config}
          size={300}
          animated
          showScene
          className="stage__avatar"
        />
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
          title={
            canAfford ? `Buy for ${item.price} coins` : "Not enough coins yet"
          }
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
              {!owned && !locked && (
                <span className="swatch__price">{g.price}</span>
              )}
              {locked && <span className="swatch__lock">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
