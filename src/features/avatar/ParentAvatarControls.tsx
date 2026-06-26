// ---------------------------------------------------------------------------
// ParentAvatarControls — grown-up panel for the avatar economy: add/remove
// coins, unlock items as rewards, reset a look, pause purchases, see earning
// history. All actions go through the synced reducer (cross-device safe).
// ---------------------------------------------------------------------------
import { useMemo, useState } from "react";
import { useApp } from "../../store/AppContext";
import { DEFAULT_REWARD_RATES } from "../../store/storage";
import {
  approvedSubmissions,
  coinBalance,
  coinsEarned,
  kidList,
} from "../../store/selectors";
import {
  addCoins,
  ownsItem,
  setPurchasesLocked,
  unlockItem,
} from "./AvatarEconomy";
import { getManifest } from "./AvatarManifest";
import { REWARD_RULES } from "./AvatarRewardEngine";
import { SLOT_TAB_META } from "./avatarDefaults";

export function ParentAvatarControls() {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [kidId, setKidId] = useState(() => state.activeKid || kids[0]?.id || "");
  const [amount, setAmount] = useState(25);
  const [grantId, setGrantId] = useState("");
  const savedRates = state.rewardRates ?? DEFAULT_REWARD_RATES;
  const [rates, setRates] = useState(() => ({ ...savedRates }));
  const ratesDirty =
    rates.mission !== savedRates.mission ||
    rates.assignment !== savedRates.assignment;

  const balance = coinBalance(state, kidId);
  const earned = coinsEarned(state, kidId);
  const spent = state.coinsSpent[kidId] ?? 0;
  const bonus = state.coinsBonus[kidId] ?? 0;
  const locked = !!state.purchasesLocked?.[kidId];

  // Items a grown-up can hand out (priced or progress-locked, not yet owned).
  const grantable = useMemo(
    () =>
      getManifest()
        .items.filter((i) => i.price > 0 || i.unlockType === "mission")
        .filter((i) => !ownsItem(state, kidId, i))
        .sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name)),
    [state, kidId],
  );

  const history = useMemo(
    () =>
      [...approvedSubmissions(state, kidId)]
        .sort((a, b) => (b.reviewedAt ?? b.submittedAt) - (a.reviewedAt ?? a.submittedAt))
        .slice(0, 12),
    [state, kidId],
  );

  if (!kidId) return <p className="settings__hint">Add a child first.</p>;

  return (
    <div className="pav">
      <h3 className="section-title">🧢 Avatar &amp; Coins</h3>

      {/* Kid picker */}
      <div className="msgtabs">
        {kids.map((k) => (
          <button
            key={k.id}
            className={`msgtab ${kidId === k.id ? "is-active" : ""}`}
            style={{ ["--this-kid" as string]: k.color }}
            onClick={() => setKidId(k.id)}
          >
            {k.emoji} {k.firstName}
          </button>
        ))}
      </div>

      {/* Balance */}
      <div className="pav__bal">
        <div className="pav__balmain">
          <span className="pav__balcoin">🪙</span>
          <span className="pav__balnum">{balance}</span>
          <span className="pav__ballbl">coins to spend</span>
        </div>
        <div className="pav__balbreak">
          Earned {earned} · Spent {spent} · Bonus {bonus >= 0 ? `+${bonus}` : bonus}
        </div>
      </div>

      {/* Add / remove coins */}
      <div className="settings">
        <p className="settings__hint">Give a bonus or make a correction.</p>
        <div className="pav__chips">
          {[10, 25, 50, 100].map((n) => (
            <button key={n} className="ghostbtn is-go" onClick={() => addCoins(dispatch, kidId, n)}>
              +{n}
            </button>
          ))}
          {[25, 50].map((n) => (
            <button key={`m${n}`} className="ghostbtn" onClick={() => addCoins(dispatch, kidId, -n)}>
              −{n}
            </button>
          ))}
        </div>
        <div className="settings__row">
          <input
            className="settings__input"
            type="number"
            value={amount}
            min={1}
            max={9999}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 0))}
            aria-label="Custom coin amount"
            style={{ maxWidth: 120 }}
          />
          <button className="btn btn--primary" onClick={() => addCoins(dispatch, kidId, amount)}>
            Add coins
          </button>
          <button className="btn btn--ghost" onClick={() => addCoins(dispatch, kidId, -amount)}>
            Remove
          </button>
        </div>
      </div>

      {/* Unlock an item as a reward */}
      <div className="settings">
        <p className="settings__hint">🎁 Unlock an item as a reward (free for the child).</p>
        <div className="settings__row">
          <select
            className="settings__input"
            value={grantId}
            onChange={(e) => setGrantId(e.target.value)}
            aria-label="Item to unlock"
          >
            <option value="">Choose an item…</option>
            {grantable.map((i) => (
              <option key={i.id} value={i.id}>
                {SLOT_TAB_META[i.slot]?.label ?? i.slot}: {i.name}
                {i.price > 0 ? ` (${i.price}🪙)` : ""}
              </option>
            ))}
          </select>
          <button
            className="btn btn--primary"
            disabled={!grantId}
            onClick={() => {
              if (grantId) {
                unlockItem(dispatch, kidId, grantId);
                setGrantId("");
              }
            }}
          >
            Unlock
          </button>
        </div>
      </div>

      {/* Toggles + reset */}
      <div className="settings">
        <label className="pav__toggle">
          <input
            type="checkbox"
            checked={locked}
            onChange={(e) => setPurchasesLocked(dispatch, kidId, e.target.checked)}
          />
          <span>
            <strong>Pause purchases</strong> — the child can still earn coins and wear
            owned items, but can't buy in the shop.
          </span>
        </label>
        <button
          className="btn btn--reject btn--sm"
          onClick={() => {
            if (
              window.confirm(
                "Reset this child's avatar to the default look? Owned items are kept.",
              )
            ) {
              dispatch({ type: "RESET_AVATAR3D", kidId });
            }
          }}
        >
          ↺ Reset avatar look
        </button>
      </div>

      {/* Editable reward amounts (family-wide) */}
      <div className="settings">
        <p className="settings__hint">
          🎯 <strong>Reward amounts</strong> — bonus coins every child gets when
          you approve a finished task (on top of the coins they earn from XP).
          Set 0 for no bonus.
        </p>
        <div className="pav__raterow">
          <label className="pav__rate">
            <span className="pav__ratelbl">🎯 Per mission</span>
            <input
              type="number"
              min={0}
              max={9999}
              value={rates.mission}
              onChange={(e) =>
                setRates((r) => ({
                  ...r,
                  mission: Math.max(0, Math.round(Number(e.target.value) || 0)),
                }))
              }
              aria-label="Bonus coins per mission"
            />
            <span aria-hidden>🪙</span>
          </label>
          <label className="pav__rate">
            <span className="pav__ratelbl">📚 Per learning task</span>
            <input
              type="number"
              min={0}
              max={9999}
              value={rates.assignment}
              onChange={(e) =>
                setRates((r) => ({
                  ...r,
                  assignment: Math.max(0, Math.round(Number(e.target.value) || 0)),
                }))
              }
              aria-label="Bonus coins per learning task"
            />
            <span aria-hidden>🪙</span>
          </label>
        </div>
        <div className="settings__row">
          <button
            className="btn btn--primary"
            disabled={!ratesDirty}
            onClick={() => dispatch({ type: "SET_REWARD_RATES", rates })}
          >
            Save amounts
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              setRates({ ...DEFAULT_REWARD_RATES });
              dispatch({ type: "SET_REWARD_RATES", rates: { ...DEFAULT_REWARD_RATES } });
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Reward rates (reference) */}
      <div className="settings">
        <p className="settings__hint">Typical earning (XP drives coins 1-for-1):</p>
        <ul className="pav__rates">
          {REWARD_RULES.map((r) => (
            <li key={r.id}>
              <span>{r.emoji} {r.label}</span>
              <span className="pav__ratenums">
                {r.xp > 0 && <em>+{r.xp} XP</em>}
                {r.coins > 0 && <em>+{r.coins} 🪙</em>}
                {r.note && <em className="pav__ratenote">{r.note}</em>}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Earning history */}
      <div className="settings">
        <p className="settings__hint">📜 Recent earning history</p>
        {history.length === 0 ? (
          <p className="inv__empty">No approved tasks yet.</p>
        ) : (
          <ul className="pav__hist">
            {history.map((s) => (
              <li key={s.id}>
                <span className="pav__histtitle">
                  {s.emoji} {s.title}
                </span>
                <span className="pav__histmeta">
                  +{s.xp} 🪙 · {s.date}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
