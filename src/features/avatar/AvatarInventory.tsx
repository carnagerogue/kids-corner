// ---------------------------------------------------------------------------
// AvatarInventory — everything a learner owns: equipped summary, saved looks,
// favorites, and recently-unlocked items.
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import type { Avatar3DSlot, KidId } from "../../types";
import { useAvatarEconomy } from "./AvatarEconomy";
import { useAvatarManifest } from "./AvatarManifest";
import { useFavorites, useNewlyUnlocked } from "./AvatarSaveSystem";
import { ItemCard } from "./AvatarItemCard";
import { SLOT_TAB_META } from "./avatarDefaults";

export function AvatarInventory({
  kidId,
  onCelebrate,
}: {
  kidId: KidId;
  onCelebrate?: () => void;
}) {
  const econ = useAvatarEconomy(kidId);
  const manifest = useAvatarManifest();
  const { isFavorite, toggleFavorite, favorites } = useFavorites(kidId);
  const [favOnly, setFavOnly] = useState(false);

  // "Collected" = owned items that aren't the always-free swatches/base.
  const collected = useMemo(
    () =>
      manifest.items.filter(
        (i) =>
          econ.owns(i) &&
          (i.price > 0 || i.unlockType === "mission" || i.unlockType === "trophy" || i.unlockType === "streak"),
      ),
    [manifest, econ],
  );
  const collectedIds = collected.map((i) => i.id);
  const { newlyUnlocked, acknowledge } = useNewlyUnlocked(kidId, collectedIds);
  const newSet = new Set(newlyUnlocked);

  const shown = favOnly ? collected.filter((i) => favorites.includes(i.id)) : collected;

  // Equipped slots, in display order, that actually have something equipped.
  const equippedSlots = manifest.slots
    .map((s) => s.key)
    .filter((k) => econ.equippedItem(k));

  return (
    <div className="inventory">
      {/* Saved looks */}
      <section className="inv__section">
        <h3 className="inv__heading">👗 Saved Looks</h3>
        {econ.savedLoadouts.length === 0 ? (
          <p className="inv__empty">
            Save your favorite outfits in the Customize tab, then re-wear them with one tap.
          </p>
        ) : (
          <div className="loadoutrow">
            {econ.savedLoadouts.map((l) => (
              <div className="loadoutcard" key={l.id}>
                <span className="loadoutcard__emoji" aria-hidden>
                  {l.emoji ?? "⭐"}
                </span>
                <span className="loadoutcard__name">{l.name}</span>
                <div className="loadoutcard__btns">
                  <button
                    className="ghostbtn is-go"
                    onClick={() => {
                      econ.applyLoadout(l.id);
                      onCelebrate?.();
                    }}
                  >
                    Wear
                  </button>
                  <button
                    className="ghostbtn"
                    aria-label="Delete look"
                    onClick={() => econ.deleteLoadout(l.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Equipped summary */}
      <section className="inv__section">
        <h3 className="inv__heading">🎽 Wearing Now</h3>
        <div className="equipped">
          {equippedSlots.map((slot) => {
            const item = econ.equippedItem(slot as Avatar3DSlot)!;
            const meta = SLOT_TAB_META[slot as Avatar3DSlot];
            return (
              <div className="equipped__chip" key={slot} title={meta?.label}>
                <span aria-hidden>{item.emoji}</span>
                <span className="equipped__name">{item.name}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Collected items */}
      <section className="inv__section">
        <div className="inv__heading-row">
          <h3 className="inv__heading">
            🎒 My Items <span className="inv__count">{collected.length}</span>
          </h3>
          <div className="inv__filters">
            {newlyUnlocked.length > 0 && (
              <button className="ghostbtn is-go" onClick={acknowledge}>
                ✨ {newlyUnlocked.length} new — got it!
              </button>
            )}
            <button
              className={`ghostbtn ${favOnly ? "is-go" : ""}`}
              onClick={() => setFavOnly((v) => !v)}
            >
              ★ Favorites
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="inv__empty">
            {favOnly
              ? "No favorites yet — tap the ☆ on any item."
              : "No items yet. Earn coins and visit the Shop!"}
          </p>
        ) : (
          <div className="itemgrid">
            {shown.map((item) => (
              <div className="invcell" key={item.id}>
                {newSet.has(item.id) && <span className="invcell__new">NEW!</span>}
                <ItemCard
                  item={item}
                  econ={econ}
                  onCelebrate={onCelebrate}
                  isFavorite={isFavorite(item.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
