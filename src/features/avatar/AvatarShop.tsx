// ---------------------------------------------------------------------------
// AvatarShop — spend coins earned from learning. Daily Deals (a date-seeded
// rotating discount) plus themed sections (pets, outfits, hats, rooms, FX…).
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import type { KidId } from "../../types";
import { todayKey } from "../../store/storage";
import { useAvatarEconomy } from "./AvatarEconomy";
import { useAvatarManifest } from "./AvatarManifest";
import { useFavorites } from "./AvatarSaveSystem";
import { ItemCard } from "./AvatarItemCard";
import { HIDDEN_SLOTS, SHOP_SECTIONS } from "./avatarDefaults";
import type { AvatarItem } from "./avatarTypes";

/** Deterministically pick `n` items for today's deals. */
function pickDeals(pool: AvatarItem[], n: number): AvatarItem[] {
  if (pool.length <= n) return pool;
  const today = todayKey();
  const seed = [...today].reduce((a, c) => a + c.charCodeAt(0), 0);
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const out: AvatarItem[] = [];
  for (let i = 0; i < n; i++) {
    out.push(sorted[(seed + i * 7) % sorted.length]);
  }
  return Array.from(new Set(out));
}

export function AvatarShop({
  kidId,
  onCelebrate,
}: {
  kidId: KidId;
  onCelebrate?: () => void;
}) {
  const econ = useAvatarEconomy(kidId);
  const manifest = useAvatarManifest();
  const { isFavorite, toggleFavorite } = useFavorites(kidId);

  const deals = useMemo(() => {
    const buyable = manifest.items.filter(
      (i) =>
        i.price > 0 &&
        i.unlockType === "shop" &&
        !econ.owns(i) &&
        !HIDDEN_SLOTS.has(i.slot),
    );
    return pickDeals(buyable, 3).map((i) => ({
      item: i,
      price: Math.max(1, Math.round(i.price * 0.75)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest, kidId, econ.balance]);

  return (
    <div className="shop">
      <div className="shop__hint">
        <span>🪙 Earn coins by finishing tasks, missions & streaks — then deck out your character!</span>
      </div>

      {econ.purchasesLocked && (
        <div className="shop__locked">🔒 A grown-up has paused purchases for now.</div>
      )}

      {deals.length > 0 && (
        <section className="shop__section shop__section--deals">
          <h3 className="shop__heading">⚡ Daily Deals <span className="shop__deal-tag">25% off today</span></h3>
          <div className="shoprow">
            {deals.map(({ item, price }) => (
              <ItemCard
                key={item.id}
                item={item}
                econ={econ}
                onCelebrate={onCelebrate}
                dealPrice={price}
                isFavorite={isFavorite(item.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </section>
      )}

      {SHOP_SECTIONS.map((sec) => {
        const items = manifest.items.filter(
          (i) => sec.match(i) && !HIDDEN_SLOTS.has(i.slot),
        );
        if (!items.length) return null;
        return (
          <section className="shop__section" key={sec.id}>
            <h3 className="shop__heading">
              {sec.emoji} {sec.label}
            </h3>
            <div className="shoprow">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  econ={econ}
                  onCelebrate={onCelebrate}
                  isFavorite={isFavorite(item.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
