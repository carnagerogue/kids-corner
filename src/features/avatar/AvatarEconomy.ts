// ---------------------------------------------------------------------------
// AvatarEconomy — the spec's coin/XP API, implemented as a thin adapter over the
// app's existing reducer + selectors (NOT a parallel store). Coins stay unified
// (60 + XP + bonuses − spent) and keep syncing across devices via FamilySync.
//
// Use the `useAvatarEconomy(kidId)` hook in components; the standalone functions
// (getAffordableItems, getLockedItems, …) are pure and handy for tests/parents.
// ---------------------------------------------------------------------------
import { useMemo } from "react";
import type { Dispatch } from "react";
import { useApp } from "../../store/AppContext";
import type { Action } from "../../store/AppContext";
import {
  coinBalance,
  canSpinFree,
  computeStats,
  getKidXp,
} from "../../store/selectors";
import { getLevelInfo } from "../../data/levels";
import type { AppState, Avatar3DSlot, KidId, Loadout3D } from "../../types";
import type { AvatarItem, LockReason } from "./avatarTypes";
import { DEFAULT_LOADOUT } from "./avatarDefaults";
import { getManifest, itemById } from "./AvatarManifest";
import { meetsUnlock, rollDailyBox, unlockLabel } from "./AvatarRewardEngine";

/** Items unlocked purely by progress (mission/streak/trophy) come "for free". */
function isProgressUnlock(item: AvatarItem): boolean {
  return (
    item.unlockType === "mission" ||
    item.unlockType === "trophy" ||
    item.unlockType === "streak"
  );
}

/** Does a kid own/have-access-to an item right now? */
export function ownsItem(state: AppState, kidId: KidId, item: AvatarItem): boolean {
  const owned = state.ownedGear[kidId] ?? [];
  if (owned.includes(item.id)) return true;
  if (isProgressUnlock(item)) {
    const stats = computeStats(state, kidId);
    const level = getLevelInfo(getKidXp(state, kidId)).rank.level;
    const badges = state.kids[kidId]?.badges ?? [];
    return meetsUnlock(item.unlockRequirement, stats, level, badges);
  }
  // Free non-progress items (skin/eye/hair colors, starter pieces) are always owned.
  return item.price === 0;
}

/** Why is this item locked (for the card's lock label)? `none` = buyable/owned. */
export function lockReasonFor(
  state: AppState,
  kidId: KidId,
  item: AvatarItem,
): LockReason {
  if (ownsItem(state, kidId, item)) return { kind: "none" };
  const level = getLevelInfo(getKidXp(state, kidId)).rank.level;
  if (isProgressUnlock(item)) {
    return { kind: "mission", text: unlockLabel(item.unlockRequirement) };
  }
  if (item.levelReq && level < item.levelReq) {
    return { kind: "level", level: item.levelReq };
  }
  const balance = coinBalance(state, kidId);
  if (item.price > balance) return { kind: "coins", need: item.price - balance };
  return { kind: "none" }; // affordable + level-ok → buyable
}

export function getOwnedItems(state: AppState, kidId: KidId): AvatarItem[] {
  return getManifest().items.filter((i) => ownsItem(state, kidId, i));
}

/** Items the kid can buy right now (not owned, affordable, level-ok, not locked). */
export function getAffordableItems(state: AppState, kidId: KidId): AvatarItem[] {
  if (state.purchasesLocked?.[kidId]) return [];
  const balance = coinBalance(state, kidId);
  const level = getLevelInfo(getKidXp(state, kidId)).rank.level;
  return getManifest().items.filter(
    (i) =>
      i.price > 0 &&
      !ownsItem(state, kidId, i) &&
      !isProgressUnlock(i) &&
      i.price <= balance &&
      (!i.levelReq || level >= i.levelReq),
  );
}

/** Items the kid can't get yet (need coins, level, or learning progress). */
export function getLockedItems(state: AppState, kidId: KidId): AvatarItem[] {
  return getManifest().items.filter((i) => {
    if (ownsItem(state, kidId, i)) return false;
    const r = lockReasonFor(state, kidId, i);
    return r.kind !== "none";
  });
}

/** Level info + whether a level-up is close (for progress UI). */
export function levelUpCheck(state: AppState, kidId: KidId) {
  return getLevelInfo(getKidXp(state, kidId));
}

/** The current equipped loadout with defaults filling empty slots. */
export function currentLoadout(state: AppState, kidId: KidId): Loadout3D {
  return { ...DEFAULT_LOADOUT, ...(state.avatar3d[kidId] ?? {}) };
}

// --- React hook -------------------------------------------------------------

export type AvatarEconomy = ReturnType<typeof useAvatarEconomy>;

export function useAvatarEconomy(kidId: KidId) {
  const { state, dispatch } = useApp();

  return useMemo(() => {
    const balance = coinBalance(state, kidId);
    const xp = getKidXp(state, kidId);
    const level = getLevelInfo(xp);
    const loadout = currentLoadout(state, kidId);
    const purchasesLocked = !!state.purchasesLocked?.[kidId];
    const items = getManifest().items;

    const owns = (item: AvatarItem) => ownsItem(state, kidId, item);
    const isEquipped = (item: AvatarItem) => loadout[item.slot] === item.id;
    const canAfford = (item: AvatarItem) => balance >= item.price;
    const levelOk = (item: AvatarItem) =>
      !item.levelReq || level.rank.level >= item.levelReq;
    const lockReason = (item: AvatarItem) => lockReasonFor(state, kidId, item);

    return {
      state,
      kidId,
      balance,
      xp,
      level,
      loadout,
      purchasesLocked,
      items,
      // queries
      owns,
      isEquipped,
      canAfford,
      levelOk,
      lockReason,
      ownedItems: () => getOwnedItems(state, kidId),
      affordableItems: () => getAffordableItems(state, kidId),
      lockedItems: () => getLockedItems(state, kidId),
      itemsForSlot: (slot: Avatar3DSlot) => items.filter((i) => i.slot === slot),
      equippedItem: (slot: Avatar3DSlot) => itemById(loadout[slot]),
      savedLoadouts: state.loadouts3d[kidId] ?? [],
      canOpenDailyBox: canSpinFree(state, kidId),
      // mutations
      buy: (item: AvatarItem) =>
        dispatch({
          type: "BUY_AVATAR_ITEM",
          kidId,
          item: {
            id: item.id,
            slot: item.slot,
            price: item.price,
            ...(item.levelReq ? { levelReq: item.levelReq } : {}),
          },
        }),
      equip: (slot: Avatar3DSlot, itemId: string) =>
        dispatch({ type: "EQUIP_AVATAR_ITEM", kidId, slot, itemId }),
      unequip: (slot: Avatar3DSlot) =>
        dispatch({ type: "EQUIP_AVATAR_ITEM", kidId, slot, itemId: null }),
      reset: () => dispatch({ type: "RESET_AVATAR3D", kidId }),
      saveLoadout: (name: string, emoji?: string) =>
        dispatch({ type: "SAVE_LOADOUT", kidId, name, ...(emoji ? { emoji } : {}) }),
      applyLoadout: (loadoutId: string) =>
        dispatch({ type: "APPLY_LOADOUT", kidId, loadoutId }),
      deleteLoadout: (loadoutId: string) =>
        dispatch({ type: "DELETE_LOADOUT", kidId, loadoutId }),
      /** Apply a preset template, equipping only the pieces the kid owns. */
      applyTemplate: (template: Loadout3D) => {
        for (const [slot, id] of Object.entries(template) as [
          Avatar3DSlot,
          string,
        ][]) {
          const item = itemById(id);
          if (item && ownsItem(state, kidId, item)) {
            dispatch({ type: "EQUIP_AVATAR_ITEM", kidId, slot, itemId: id });
          }
        }
      },
      /** Open the free daily box: roll, grant coins (+ maybe an item). */
      openDailyBox: () => {
        const owned = state.ownedGear[kidId] ?? [];
        const reward = rollDailyBox(owned);
        dispatch({
          type: "APPLY_SPIN",
          kidId,
          free: true,
          coins: reward.coins,
          ...(reward.itemId ? { gearId: reward.itemId } : {}),
        });
        return reward;
      },
    };
  }, [state, dispatch, kidId]);
}

// --- Grown-up actions (parent controls) ------------------------------------

export function addCoins(dispatch: Dispatch<Action>, kidId: KidId, amount: number) {
  dispatch({ type: "GRANT_COINS", kidId, amount });
}
export function unlockItem(dispatch: Dispatch<Action>, kidId: KidId, itemId: string) {
  dispatch({ type: "GRANT_AVATAR_ITEM", kidId, itemId });
}
export function setPurchasesLocked(
  dispatch: Dispatch<Action>,
  kidId: KidId,
  locked: boolean,
) {
  dispatch({ type: "SET_PURCHASES_LOCKED", kidId, locked });
}
