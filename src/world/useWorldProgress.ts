// ---------------------------------------------------------------------------
// useWorldProgress — the Season of Wonders gate.
//
// Binds the pure SeasonArc reducers (worldGame.ts) to the live app store so the
// World can ask "can this kid awaken this landmark yet?" The answer is driven
// ONLY by the count of NEW parent-approved submissions since the landmark's
// chapter began — nothing self-awards, and playing can't mint an awakening.
//
// It also reseeds the arc on a real season turnover (the town sleeps again), and
// carries any already-powered landmarks into the very first season so existing
// players don't see a surprise reset.
// ---------------------------------------------------------------------------
import { useCallback, useEffect, useMemo } from "react";
import type { AppState, KidId } from "../types";
import { approvedSubmissions } from "../store/selectors";
import {
  awakenLandmark,
  canAwaken as canAwakenReducer,
  chapterRequirement,
  ensureSeason,
  newApprovalsFor,
  seasonIdFor,
  type LandmarkId,
  type SeasonArc,
  type WorldSave,
} from "./worldGame";

export type AwakenOutcome = { awakened: boolean; festivalCompleted: boolean };

export type WorldProgress = {
  /** Approved-submission ids for this kid (the grind-proof spark ledger). */
  approvedIds: string[];
  /** The live season arc (undefined until the seed effect runs). */
  arc: SeasonArc | undefined;
  /** Has this landmark bloomed this season? */
  isAwake: (id: LandmarkId) => boolean;
  /** Is the kid's approved work enough to awaken this landmark's chapter now? */
  canAwaken: (id: LandmarkId) => boolean;
  /** How many more approved tasks are needed to awaken this landmark. */
  remainingFor: (id: LandmarkId) => number;
  /** Attempt to awaken; commits + returns the outcome (no-op if the gate isn't met). */
  awaken: (id: LandmarkId) => AwakenOutcome;
};

export function useWorldProgress(
  state: AppState,
  kidId: KidId,
  worldSave: WorldSave,
  commitWorld: (next: WorldSave) => void,
): WorldProgress {
  const approvedIds = useMemo(
    () => approvedSubmissions(state, kidId).map((s) => s.id),
    [state, kidId],
  );

  const arc = worldSave.seasonArc;

  // Seed the arc, and reseed on a genuine season change (town sleeps again).
  const seasonId = seasonIdFor();
  useEffect(() => {
    if (arc?.seasonId !== seasonId) {
      commitWorld(ensureSeason(worldSave, approvedIds, seasonId));
    }
    // Fire only on the season boundary; the seed reads the latest save/ids at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arc?.seasonId, seasonId]);

  const isAwake = useCallback(
    (id: LandmarkId) => !!arc?.awakened.includes(id),
    [arc],
  );

  const canAwaken = useCallback(
    (id: LandmarkId) => canAwakenReducer(worldSave, id, approvedIds),
    [worldSave, approvedIds],
  );

  const remainingFor = useCallback(
    (id: LandmarkId) => {
      const need = chapterRequirement(arc?.chapterProgress[id] ?? 0);
      const have = arc ? newApprovalsFor(arc, id, approvedIds) : 0;
      return Math.max(0, need - have);
    },
    [arc, approvedIds],
  );

  const awaken = useCallback(
    (id: LandmarkId): AwakenOutcome => {
      const res = awakenLandmark(worldSave, id, approvedIds);
      if (res.awakened) commitWorld(res.save);
      return { awakened: res.awakened, festivalCompleted: res.festivalCompleted };
    },
    [worldSave, approvedIds, commitWorld],
  );

  return { approvedIds, arc, isAwake, canAwaken, remainingFor, awaken };
}
