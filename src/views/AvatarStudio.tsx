import { useState } from "react";
import { useApp } from "../store/AppContext";
import {
  coinBalance,
  equippedAvatar,
  getKid,
  getKidXp,
  ownsGear,
} from "../store/selectors";
import { Avatar, GEAR, SLOT_META } from "../data/avatar";
import { getLevelInfo } from "../data/levels";
import type { GearSlot } from "../types";

export function AvatarStudio() {
  const { state, dispatch } = useApp();
  const kidId = state.activeKid;
  const kid = getKid(state, kidId);
  const balance = coinBalance(state, kidId);
  const level = getLevelInfo(getKidXp(state, kidId)).rank.level;
  const equipped = equippedAvatar(state, kidId);
  const [slot, setSlot] = useState<GearSlot>("color");

  const items = GEAR.filter((g) => g.slot === slot);

  return (
    <div className="view">
      <div className="view__header">
        <div>
          <h2 className="view__title">🧢 Avatar Studio</h2>
          <p className="view__sub">
            Earn coins from tasks, then deck out {kid.firstName}'s avatar.
          </p>
        </div>
        <span className="coinchip coinchip--lg">🪙 {balance}</span>
      </div>

      <div className="studio">
        <div className="studio__stage">
          <Avatar config={equipped} size={230} className="studio__avatar" />
          <span className="studio__name">{kid.firstName}</span>
        </div>

        <div className="studio__panel">
          <div className="msgtabs">
            {SLOT_META.map((s) => (
              <button
                key={s.slot}
                className={`msgtab ${slot === s.slot ? "is-active" : ""}`}
                onClick={() => setSlot(s.slot)}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>

          <div className="geargrid">
            {items.map((item) => {
              const owned = ownsGear(state, kidId, item.id);
              const isOn = equipped[item.slot] === item.id;
              const locked = !!item.levelReq && level < (item.levelReq ?? 0);
              const canAfford = balance >= item.price;
              const preview = { ...equipped, [item.slot]: item.id };
              return (
                <div
                  key={item.id}
                  className={`gearcard ${isOn ? "is-on" : ""} ${
                    locked ? "is-locked" : ""
                  }`}
                >
                  <Avatar
                    config={preview}
                    size={88}
                    className="gearcard__art"
                  />
                  <span className="gearcard__name">{item.name}</span>
                  {isOn ? (
                    <span className="gearcard__tag gearcard__tag--on">
                      ✓ Wearing
                    </span>
                  ) : owned ? (
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        dispatch({
                          type: "EQUIP_GEAR",
                          kidId,
                          slot: item.slot,
                          gearId: item.id,
                        })
                      }
                    >
                      Wear it
                    </button>
                  ) : locked ? (
                    <span className="gearcard__tag gearcard__tag--lock">
                      🔒 Level {item.levelReq}
                    </span>
                  ) : (
                    <button
                      className="btn btn--primary btn--sm gearcard__buy"
                      disabled={!canAfford}
                      title={
                        canAfford
                          ? `Buy for ${item.price} coins`
                          : `Need ${item.price - balance} more coins`
                      }
                      onClick={() =>
                        dispatch({ type: "BUY_GEAR", kidId, gearId: item.id })
                      }
                    >
                      🪙 {item.price}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="studio__hint">
            Coins come from finishing tasks &amp; chores a grown-up approves.
            Spending never lowers your level — earn, collect, and show off! ⭐
          </p>
        </div>
      </div>
    </div>
  );
}
