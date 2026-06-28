// ---------------------------------------------------------------------------
// WorldShop — spend town tokens on cosmetic auras, and equip any befriended
// creature as a follow-along companion (free — befriending is the unlock). Pure
// UI; WorldView owns the token spend + persistence via callbacks.
// ---------------------------------------------------------------------------
import { AURAS, type Aura } from "./shopItems";
import { creatureById } from "./worldBattles";

type Props = {
  tokens: number;
  ownedAuras: string[];
  equippedAura: string | null;
  befriended: string[];
  equippedCompanion: string | null;
  onBuyAura: (aura: Aura) => void;
  onEquipAura: (id: string | null) => void;
  onEquipCompanion: (id: string | null) => void;
  onClose: () => void;
};

export function WorldShop({
  tokens,
  ownedAuras,
  equippedAura,
  befriended,
  equippedCompanion,
  onBuyAura,
  onEquipAura,
  onEquipCompanion,
  onClose,
}: Props) {
  const companions = befriended
    .map((id) => creatureById(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c) && !c!.boss);

  return (
    <div className="academy shop" role="dialog" aria-modal="true" aria-labelledby="shop-title">
      <div className="academy__card">
        <button className="academy__close" onClick={onClose} aria-label="Close shop">
          ×
        </button>
        <div className="academy__head">
          <h3 id="shop-title">🛍️ Token Shop</h3>
          <span className="academy__lv">🪙 {tokens}</span>
        </div>

        <p className="shop__section">✨ Auras — a glow that follows you</p>
        <div className="shop__grid">
          {AURAS.map((aura) => {
            const owned = ownedAuras.includes(aura.id);
            const equipped = equippedAura === aura.id;
            const afford = tokens >= aura.price;
            return (
              <div
                key={aura.id}
                className={`shop__item${equipped ? " is-equipped" : ""}`}
                style={{ borderColor: equipped ? aura.color : undefined }}
              >
                <span className="shop__emoji" style={{ background: aura.color }}>
                  {aura.emoji}
                </span>
                <strong>{aura.name}</strong>
                <small>{aura.description}</small>
                {owned ? (
                  equipped ? (
                    <button className="shop__btn is-on" onClick={() => onEquipAura(null)}>
                      Equipped ✓ (remove)
                    </button>
                  ) : (
                    <button className="shop__btn" onClick={() => onEquipAura(aura.id)}>
                      Equip
                    </button>
                  )
                ) : (
                  <button
                    className="shop__btn shop__buy"
                    disabled={!afford}
                    onClick={() => onBuyAura(aura)}
                  >
                    {afford ? `Buy · 🪙 ${aura.price}` : `🔒 🪙 ${aura.price}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="shop__section">💚 Companions — befriend creatures to equip</p>
        {companions.length === 0 ? (
          <p className="shop__empty">
            Win a creature battle to befriend a buddy, then equip it here to float
            along with you!
          </p>
        ) : (
          <div className="shop__companions">
            <button
              className={`shop__buddy${!equippedCompanion ? " is-on" : ""}`}
              onClick={() => onEquipCompanion(null)}
            >
              🚫
              <small>None</small>
            </button>
            {companions.map((creature) => {
              const on = equippedCompanion === creature.id;
              return (
                <button
                  key={creature.id}
                  className={`shop__buddy${on ? " is-on" : ""}`}
                  style={{ borderColor: on ? creature.color : undefined }}
                  onClick={() => onEquipCompanion(on ? null : creature.id)}
                >
                  {creature.emoji}
                  <small>{creature.name}</small>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
