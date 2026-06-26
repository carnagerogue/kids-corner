// ---------------------------------------------------------------------------
// AvatarItemCard — one cosmetic card used by the customizer, shop, and inventory.
// Shows icon (PNG → emoji fallback), name, rarity frame, price/state, and a
// context button: Wear / Buy / Locked / Equipped.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { AvatarItem } from "./avatarTypes";
import type { AvatarEconomy } from "./AvatarEconomy";
import { rarityMeta } from "./avatarDefaults";
import { resolveAssetUrl } from "./AvatarManifest";

function ItemIcon({ item }: { item: AvatarItem }) {
  const [failed, setFailed] = useState(false);
  const showImg = item.iconPath && !failed;
  return (
    <div className="ic__icon" style={{ background: `${item.color}22` }}>
      {showImg ? (
        <img
          src={resolveAssetUrl(item.iconPath!)}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="ic__emoji" style={{ filter: `drop-shadow(0 2px 6px ${item.color}66)` }}>
          {item.emoji}
        </span>
      )}
    </div>
  );
}

export function ItemCard({
  item,
  econ,
  onCelebrate,
  dealPrice,
  isFavorite,
  onToggleFavorite,
}: {
  item: AvatarItem;
  econ: AvatarEconomy;
  onCelebrate?: () => void;
  /** A discounted price (Daily Deals); falls back to item.price. */
  dealPrice?: number;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}) {
  const [burst, setBurst] = useState(false);
  const rar = rarityMeta(item.rarity);
  const owned = econ.owns(item);
  const equipped = econ.isEquipped(item);
  const lock = econ.lockReason(item);
  const price = dealPrice ?? item.price;
  const onDeal = dealPrice !== undefined && dealPrice < item.price;

  const flash = () => {
    setBurst(true);
    window.setTimeout(() => setBurst(false), 750);
  };

  const handleBuy = () => {
    econ.buy(price === item.price ? item : { ...item, price });
    flash();
    onCelebrate?.();
  };
  const handleWear = () => {
    econ.equip(item.slot, item.id);
    flash();
  };

  let button: React.ReactNode;
  if (equipped) {
    button = (
      <button className="ic__btn is-equipped" disabled>
        ✓ Equipped
      </button>
    );
  } else if (owned) {
    button = (
      <button className="ic__btn is-wear" onClick={handleWear}>
        Wear
      </button>
    );
  } else if (lock.kind === "mission") {
    button = (
      <button className="ic__btn is-locked" disabled title={lock.text}>
        🔒 {lock.text}
      </button>
    );
  } else if (lock.kind === "level") {
    button = (
      <button className="ic__btn is-locked" disabled>
        🔒 Level {lock.level}
      </button>
    );
  } else if (econ.purchasesLocked) {
    button = (
      <button className="ic__btn is-locked" disabled>
        🔒 Shop off
      </button>
    );
  } else if (lock.kind === "coins") {
    button = (
      <button className="ic__btn is-need" disabled title={`Need ${lock.need} more coins`}>
        🪙 {price}
      </button>
    );
  } else {
    button = (
      <button className="ic__btn is-buy" onClick={handleBuy}>
        🪙 {price}
      </button>
    );
  }

  return (
    <div
      className={`itemcard rar-${item.rarity} ${equipped ? "is-equipped" : ""} ${burst ? "is-burst" : ""}`}
      style={
        {
          ["--rar" as string]: rar.color,
          ["--rar-glow" as string]: rar.glow,
        } as React.CSSProperties
      }
    >
      {onToggleFavorite && (
        <button
          className={`ic__fav ${isFavorite ? "is-on" : ""}`}
          aria-label={isFavorite ? "Unfavorite" : "Favorite"}
          onClick={() => onToggleFavorite(item.id)}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      )}
      {onDeal && <span className="ic__deal">SALE</span>}
      <ItemIcon item={item} />
      <div className="ic__name">{item.name}</div>
      <div className="ic__rarity" style={{ color: rar.color }}>
        {rar.label}
      </div>
      {button}
      {burst && <span className="ic__sparkle" aria-hidden>✨</span>}
    </div>
  );
}
