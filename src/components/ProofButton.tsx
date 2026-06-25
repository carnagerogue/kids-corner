import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, taskStatus } from "../store/selectors";
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
  const { status, submission } = taskStatus(state, kidId, refId);
  const kid = getKid(state, kidId);

  const submit = (photo: string) => {
    dispatch({ type: "SUBMIT_TASK", kidId, kind, refId, title, emoji, xp, photo });
    setCamera(false);
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
          <button
            className="btn btn--primary btn--full"
            onClick={() => setCamera(true)}
          >
            📸 Take photo to finish · +{xp} XP
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
