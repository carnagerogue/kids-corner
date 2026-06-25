import { useCallback, useEffect, useRef, useState } from "react";

const MAX_DIM = 640; // downscale so photos stay small in localStorage
const JPEG_QUALITY = 0.55;

type Phase = "starting" | "live" | "preview" | "error";

/**
 * A full-screen modal that grabs a webcam frame as proof a task is done.
 * Falls back to a file picker if the camera can't be used.
 */
export function CameraCapture({
  title,
  subtitle,
  kidEmoji,
  onCancel,
  onSubmit,
}: {
  title: string;
  subtitle?: string;
  kidEmoji: string;
  onCancel: () => void;
  onSubmit: (photo: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string>("");
  const [photo, setPhoto] = useState<string>("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setPhase("starting");
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("no-camera-api");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("live");
    } catch (e) {
      const name = (e as { name?: string })?.name ?? "";
      setError(
        name === "NotAllowedError"
          ? "Camera permission was blocked. Allow it in your browser, or upload a photo instead."
          : "We couldn't open the camera. You can upload a photo instead.",
      );
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    start();
    return stopStream;
  }, [start, stopStream]);

  const downscale = useCallback(
    (source: HTMLVideoElement | HTMLImageElement, w: number, h: number) => {
      const scale = Math.min(1, MAX_DIM / Math.max(w, h));
      const cw = Math.round(w * scale);
      const ch = Math.round(h * scale);
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.drawImage(source, 0, 0, cw, ch);
      return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    },
    [],
  );

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const data = downscale(
      video,
      video.videoWidth || 1280,
      video.videoHeight || 720,
    );
    if (data) {
      setPhoto(data);
      setPhase("preview");
      stopStream();
    }
  }, [downscale, stopStream]);

  const onFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const data = downscale(img, img.width, img.height);
          if (data) {
            setPhoto(data);
            setPhase("preview");
            stopStream();
          }
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    },
    [downscale, stopStream],
  );

  const retake = useCallback(() => {
    setPhoto("");
    start();
  }, [start]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Take a proof photo">
      <div className="modal__card">
        <div className="modal__head">
          <div>
            <h3 className="modal__title">{kidEmoji} Show your work!</h3>
            <p className="modal__sub">{title}</p>
            {subtitle && <p className="modal__hint">{subtitle}</p>}
          </div>
          <button className="modal__close" onClick={onCancel} aria-label="Cancel">
            ✕
          </button>
        </div>

        <div className="camera">
          {phase === "preview" ? (
            <img className="camera__shot" src={photo} alt="Your proof photo" />
          ) : (
            <video
              ref={videoRef}
              className="camera__video"
              playsInline
              muted
            />
          )}
          {phase === "starting" && (
            <div className="camera__overlay">📷 Starting camera…</div>
          )}
          {phase === "error" && (
            <div className="camera__overlay camera__overlay--error">
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="modal__actions">
          {phase === "live" && (
            <button className="btn btn--primary btn--big" onClick={capture}>
              📸 Take photo
            </button>
          )}
          {phase === "preview" && (
            <>
              <button className="btn btn--ghost" onClick={retake}>
                ↺ Retake
              </button>
              <button
                className="btn btn--primary btn--big"
                onClick={() => onSubmit(photo)}
              >
                ✓ Send to grown-up
              </button>
            </>
          )}
          {phase === "error" && (
            <>
              <button className="btn btn--ghost" onClick={start}>
                ↺ Try camera again
              </button>
              <label className="btn btn--primary">
                📁 Upload a photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
