import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../store/AppContext";
import { Avatar3DThumb } from "../features/avatar/Avatar3DThumb";
import {
  canMessageParticipant,
  friendStateFor,
  getKid,
  kidList,
  lockedWallPhotosForViewer,
  reactionSummary,
  wallPhotosForViewer,
} from "../store/selectors";
import type { TabId } from "../App";
import type { KidId, Submission } from "../types";

function requestCopy(state: ReturnType<typeof friendStateFor>): string {
  switch (state) {
    case "friends":
      return "Friends";
    case "request-sent":
      return "Request sent";
    case "request-received":
      return "Wants to be friends";
    case "blocked":
      return "Blocked";
    default:
      return "Not friends yet";
  }
}

function FriendAction({
  otherId,
  onTab,
}: {
  otherId: KidId;
  onTab: (t: TabId) => void;
}) {
  const { state, dispatch } = useApp();
  const me = state.activeKid;
  const other = getKid(state, otherId);
  const rel = friendStateFor(state, me, otherId);
  const canMessage = canMessageParticipant(state, me, otherId);

  return (
    <article
      className={`friendcard friendcard--${rel}`}
      style={{ ["--this-kid" as string]: other.color }}
    >
      <Avatar3DThumb kidId={otherId} size={44} className="friendcard__avatar" />
      <div className="friendcard__body">
        <strong>{other.emoji} {other.firstName}</strong>
        <span>{requestCopy(rel)}</span>
      </div>
      <div className="friendcard__actions">
        {rel === "none" || rel === "removed" ? (
          <button
            className="btn btn--primary btn--sm"
            onClick={() =>
              dispatch({ type: "SEND_FRIEND_REQUEST", from: me, to: otherId })
            }
          >
            Add friend
          </button>
        ) : rel === "request-sent" ? (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() =>
              dispatch({ type: "CANCEL_FRIEND_REQUEST", by: me, other: otherId })
            }
          >
            Cancel
          </button>
        ) : rel === "request-received" ? (
          <>
            <button
              className="btn btn--primary btn--sm"
              onClick={() =>
                dispatch({
                  type: "ACCEPT_FRIEND_REQUEST",
                  by: me,
                  other: otherId,
                })
              }
            >
              Accept
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() =>
                dispatch({
                  type: "DECLINE_FRIEND_REQUEST",
                  by: me,
                  other: otherId,
                })
              }
            >
              Decline
            </button>
          </>
        ) : rel === "friends" ? (
          <>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => dispatch({ type: "REMOVE_FRIEND", by: me, other: otherId })}
            >
              Remove
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={() => onTab("messages")}
              disabled={!canMessage}
              title={canMessage ? "Open the Messages tab" : "You need to be friends before you can message."}
            >
              Message
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function WallCard({ submission }: { submission: Submission }) {
  const { state, dispatch } = useApp();
  const [zoom, setZoom] = useState(false);
  const me = state.activeKid;
  const kid = getKid(state, submission.kidId);
  const summary = reactionSummary(state, submission.id, me);
  const when = new Date(submission.reviewedAt ?? submission.submittedAt).toLocaleDateString(
    [],
    { month: "short", day: "numeric" },
  );

  return (
    <article
      className="wallpost"
      style={{ ["--this-kid" as string]: kid.color }}
    >
      <div className="wallpost__head">
        <Avatar3DThumb kidId={kid.id} size={42} className="wallpost__avatar" />
        <div className="wallpost__by">
          <strong>{kid.firstName}</strong>
          <span>{when} · approved mission</span>
        </div>
        <span className="wallpost__badge">{submission.emoji}</span>
      </div>
      <button
        className="wallpost__photo"
        onClick={() => setZoom(true)}
        aria-label={`See ${kid.firstName}'s ${submission.title} bigger`}
      >
        <img src={submission.photo} alt={submission.title} loading="lazy" />
      </button>
      <div className="wallpost__caption">
        <strong>{submission.title}</strong>
        <span>Cheer on finished work with a sticker.</span>
      </div>
      <div className="wallpost__reacts">
        {summary.map((r) => (
          <button
            key={r.emoji}
            className={`react ${r.mine ? "is-mine" : ""} ${
              r.count ? "has-count" : ""
            }`}
            onClick={() =>
              dispatch({
                type: "TOGGLE_REACTION",
                submissionId: submission.id,
                by: me,
                emoji: r.emoji,
              })
            }
            aria-label={`${r.mine ? "Remove" : "Add"} ${r.emoji} reaction`}
          >
            <span className="react__emoji">{r.emoji}</span>
            {r.count > 0 && <span className="react__n">{r.count}</span>}
          </button>
        ))}
      </div>
      {zoom &&
        createPortal(
          <div className="modal" onClick={() => setZoom(false)}>
            <img className="zoom" src={submission.photo} alt="Photo enlarged" />
          </div>,
          document.body,
        )}
    </article>
  );
}

function LockedCard({ submission }: { submission: Submission }) {
  const { state } = useApp();
  const kid = getKid(state, submission.kidId);
  return (
    <article className="wallpost wallpost--locked">
      <div className="wallpost__head">
        <Avatar3DThumb kidId={kid.id} size={42} className="wallpost__avatar" />
        <div className="wallpost__by">
          <strong>{kid.firstName}</strong>
          <span>Private post</span>
        </div>
        <span className="wallpost__badge">🔒</span>
      </div>
      <div className="wallpost__lock">
        <span>🔒</span>
        <strong>Post locked</strong>
        <p>Become friends before you can see or react to this work.</p>
      </div>
    </article>
  );
}

export function FamilyWallView({ onTab }: { onTab: (t: TabId) => void }) {
  const { state } = useApp();
  const me = state.activeKid;
  const photos = wallPhotosForViewer(state, me, 36);
  const locked = lockedWallPhotosForViewer(state, me, 6);
  const others = kidList(state).filter((k) => k.id !== me);

  return (
    <div className="view wallview">
      <div className="view__header wallview__header">
        <div>
          <h2 className="view__title">💞 Family Wall</h2>
          <p className="view__sub">
            Cheer on your own posts and accepted friends. Private posts stay locked.
          </p>
        </div>
        <button className="btn btn--ghost" onClick={() => onTab("messages")}>
          💬 Messages
        </button>
      </div>

      <section className="safeclub">
        <strong>Safe club rules</strong>
        <span>Posts, reactions, and kid-to-kid messages open after both kids accept.</span>
      </section>

      <div className="socialshell">
        <aside className="socialshell__friends" aria-label="Friend requests">
          <div className="section-row">
            <h3 className="section-title">Friends</h3>
            <span className="section-tag">ask first</span>
          </div>
          <div className="friendgrid">
            {others.map((kid) => (
              <FriendAction key={kid.id} otherId={kid.id} onTab={onTab} />
            ))}
          </div>
        </aside>

        <section className="socialshell__feed" aria-label="Cheer Feed">
          <div className="section-row">
            <h3 className="section-title">Cheer Feed</h3>
            <span className="section-tag">scroll the wall</span>
          </div>
          {photos.length ? (
            <div className="wallfeed">
              {photos.map((s) => (
                <WallCard key={s.id} submission={s} />
              ))}
            </div>
          ) : (
            <div className="emptycard">
              <strong>No visible posts yet</strong>
              <span>Finish a mission or become friends to see cheer-worthy work here.</span>
            </div>
          )}

          {locked.length > 0 && (
            <>
              <div className="section-row">
                <h3 className="section-title">Private Posts</h3>
                <span className="section-tag">locked until accepted</span>
              </div>
              <div className="wallfeed wallfeed--locked">
                {locked.map((s) => (
                  <LockedCard key={s.id} submission={s} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
