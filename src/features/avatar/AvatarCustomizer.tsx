// ---------------------------------------------------------------------------
// AvatarCustomizer — pick a slot, browse items, wear/buy them. Plus quick
// "mode" presets and a save-this-look control.
// ---------------------------------------------------------------------------
import { useState } from "react";
import type { Avatar3DSlot, KidId } from "../../types";
import { useAvatarEconomy } from "./AvatarEconomy";
import { useAvatarManifest } from "./AvatarManifest";
import { useFavorites } from "./AvatarSaveSystem";
import { ItemCard } from "./AvatarItemCard";
import { HIDDEN_SLOTS, PRESET_TEMPLATES, SLOT_TAB_META } from "./avatarDefaults";

export function AvatarCustomizer({
  kidId,
  onCelebrate,
}: {
  kidId: KidId;
  onCelebrate?: () => void;
}) {
  const econ = useAvatarEconomy(kidId);
  const manifest = useAvatarManifest();
  const { isFavorite, toggleFavorite } = useFavorites(kidId);
  const [slot, setSlot] = useState<Avatar3DSlot>("outfit");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const items = manifest.items.filter((i) => i.slot === slot);
  const tab = SLOT_TAB_META[slot];

  const doSave = () => {
    econ.saveLoadout(name.trim() || tab.label + " Look", "⭐");
    setName("");
    setSaving(false);
  };

  return (
    <div className="customizer">
      {/* Quick-apply mode presets */}
      <div className="preset-row">
        {PRESET_TEMPLATES.map((p) => (
          <button
            key={p.id}
            className="presetchip"
            onClick={() => {
              econ.applyTemplate(p.loadout);
              onCelebrate?.();
            }}
            title={`Wear everything you own from ${p.name}`}
          >
            <span aria-hidden>{p.emoji}</span> {p.name}
          </button>
        ))}
      </div>

      <div className="customizer__body">
        {/* Slot rail */}
        <div className="slotrail" role="tablist" aria-label="Customize slot">
          {manifest.slots.map((s) => {
            const meta = SLOT_TAB_META[s.key];
            if (!meta || HIDDEN_SLOTS.has(s.key)) return null;
            const equipped = econ.equippedItem(s.key);
            return (
              <button
                key={s.key}
                role="tab"
                aria-selected={slot === s.key}
                className={`slottab ${slot === s.key ? "is-active" : ""}`}
                onClick={() => setSlot(s.key)}
              >
                <span className="slottab__emoji" aria-hidden>
                  {equipped?.emoji ?? meta.emoji}
                </span>
                <span className="slottab__label">{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Item grid */}
        <div className="itemgrid-wrap">
          <div className="itemgrid__head">
            <h4>
              {tab.emoji} {tab.label}
            </h4>
            <div className="itemgrid__actions">
              {!saving ? (
                <button className="ghostbtn" onClick={() => setSaving(true)}>
                  💾 Save look
                </button>
              ) : (
                <span className="saverow">
                  <input
                    className="saverow__input"
                    autoFocus
                    placeholder="Name this look"
                    value={name}
                    maxLength={24}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && doSave()}
                  />
                  <button className="ghostbtn is-go" onClick={doSave}>
                    Save
                  </button>
                  <button className="ghostbtn" onClick={() => setSaving(false)}>
                    ✕
                  </button>
                </span>
              )}
            </div>
          </div>
          <div className="itemgrid">
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
        </div>
      </div>
    </div>
  );
}
