import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, kidList, taskStatus } from "../store/selectors";
import { CameraCapture } from "./CameraCapture";
import type { KidId, SubmissionKind } from "../types";

/**
 * Renders the right control for a proof-required task:
 *   none / rejected -> "Take photo" (opens the camera)
 *   pending         -> "Waiting for grown-up"
 *   approved        -> "Approved + XP"
 */
export function ProofButton({
  kidId,
  kind,
  refId,
  title,
  emoji,
  xp,
  subtitle,
}: {
  kidId: KidId;
  kind: SubmissionKind;
  refId: string;
  title: string;
  emoji: string;
  xp: number;
  subtitle?: string;
}) {
  const { state, dispatch } = useApp();
  const [camera, setCamera] = useState(false);
  const [partner, setPartner] = useState<KidId | null>(null);
  const { status, submission } = taskStatus(state, kidId, refId);
  const kid = getKid(state, kidId);
  // Missions can be done together with another kid on the platform.
  const others = kind === "mission" ? kidList(state).filter((k) => k.id !== kidId) : [];

  const submit = (photo: string) => {
    dispatch({
      type: "SUBMIT_TASK",
      kidId,
      kind,
      refId,
      title,
      emoji,
      xp,
      photo,
      partnerId: partner ?? undefined,
    });
    setCamera(false);
    setPartner(null);
  };

  return (
    <div className="proof">
      {status === "approved" && (
        <button className="btn btn--done btn--full" disabled>
          ✓ Approved · +{xp} XP
        </button>
      )}

      {status === "pending" && (
        <div className="proof__pending">
          {submission?.photo && (
            <img className="proof__thumb" src={submission.photo} alt="" />
          )}
          <button className="btn btn--wait btn--full" disabled>
            ⏳ Waiting for a grown-up…
          </button>
        </div>
      )}

      {(status === "none" || status === "rejected") && (
        <>
          {status === "rejected" && (
            <p className="proof__rejected">
              ↩︎ Sent back — give it another try!
              {submission?.note ? ` (${submission.note})` : ""}
            </p>
          )}
          {others.length > 0 && (
            <div className="partnerpick">
              <span className="partnerpick__label">👫 Doing it with:</span>
              <button
                type="button"
                className={`partnerpick__btn ${partner === null ? "is-active" : ""}`}
                onClick={() => setPartner(null)}
              >
                Just me
              </button>
              {others.map((k) => (
                <button
                  type="button"
                  key={k.id}
                  className={`partnerpick__btn ${partner === k.id ? "is-active" : ""}`}
                  style={{ ["--this-kid" as string]: k.color }}
                  onClick={() => setPartner(partner === k.id ? null : k.id)}
                >
                  {k.emoji} {k.firstName}
                </button>
              ))}
            </div>
          )}
          <button
            className="btn btn--primary btn--full"
            onClick={() => setCamera(true)}
          >
            📸 Take photo to finish · +{xp} XP
            {partner && ` · with ${getKid(state, partner).firstName}`}
          </button>
        </>
      )}

      {camera && (
        <CameraCapture
          title={title}
          subtitle={subtitle}
          kidEmoji={kid.emoji}
          onCancel={() => setCamera(false)}
          onSubmit={submit}
        />
      )}
    </div>
  );
}
