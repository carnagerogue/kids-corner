// ---------------------------------------------------------------------------
// AvatarViewer — ASSET-FIRST stage orchestrator (intentionally has NO three.js
// import, so the heavy 3D bundle never loads unless a real model exists).
//
// There is NO procedural/geometry character. The avatar is a real imported
// VRoid .vrm or nothing. This component decides between:
//   • a real VRM  → lazy-load VRMAvatarViewer (the only module that pulls in
//     three / three-vrm), or
//   • no model / no WebGL → a polished AvatarPlaceholder card ("Add VRoid model").
//
// We HEAD-probe the candidate model URLs first, so on the common "no model yet"
// path we show the placeholder WITHOUT ever downloading the 3D engine.
// ---------------------------------------------------------------------------
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { KidId, Loadout3D } from "../../types";
import { itemById, resolveAssetUrl } from "./AvatarManifest";
import { webglAvailable, type EmoteName } from "./webgl";
import { AvatarPlaceholder } from "./AvatarPlaceholder";

const VRMAvatarViewer = lazy(() => import("./VRMAvatarViewer"));

export type StageStatus = "probing" | "ready" | "missing";

/** Candidate .vrm URLs for a learner, in priority order. */
function modelCandidates(kidId: KidId, loadout: Loadout3D): string[] {
  const urls = [resolveAssetUrl(`/assets/avatar/models/${kidId}-base.vrm`)];
  const baseAsset = itemById(loadout.base)?.assetPath; // body-type fallback model
  if (baseAsset) urls.push(resolveAssetUrl(baseAsset));
  return urls;
}

/** Returns the first URL that actually resolves to a real file, else null. */
async function findModel(
  urls: string[],
  signal: AbortSignal,
): Promise<string | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD", signal });
      // A missing file 404s on GitHub Pages. Vite dev / SPA hosts may answer 200
      // with index.html for unknown paths — reject text/html so that isn't
      // mistaken for a model.
      if (res.ok && !(res.headers.get("content-type") || "").includes("text/html")) {
        return url;
      }
    } catch (e) {
      if ((e as { name?: string }).name === "AbortError") return null;
      // network/HEAD-unsupported — treat as "not here", try next / placeholder.
    }
  }
  return null;
}

function StageSkeleton() {
  return (
    <div className="avph avph--loading">
      <div className="avph__orb" />
      <p className="avph__loadtxt">Loading character…</p>
    </div>
  );
}

/** If the 3D viewer throws while rendering, show the placeholder instead of a
 * blank/broken stage. */
class ViewerBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AvatarViewer({
  kidId,
  firstName,
  loadout,
  emote,
  onStatus,
  onGuide,
}: {
  kidId: KidId;
  firstName?: string;
  loadout: Loadout3D;
  emote: { name: EmoteName; key: number };
  onStatus?: (s: StageStatus) => void;
  onGuide?: () => void;
}) {
  const canWebgl = useMemo(() => webglAvailable(), []);
  const [status, setStatus] = useState<StageStatus>("probing");
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  // Re-probe only when the learner or their base model changes (not on every
  // accessory equip).
  const baseId = loadout.base ?? "";

  useEffect(() => {
    const set = (s: StageStatus) => {
      setStatus(s);
      onStatus?.(s);
    };
    if (!canWebgl) {
      set("missing");
      return;
    }
    const ctrl = new AbortController();
    set("probing");
    findModel(modelCandidates(kidId, loadout), ctrl.signal).then((url) => {
      if (ctrl.signal.aborted) return;
      if (url) {
        setModelUrl(url);
        set("ready");
      } else {
        set("missing");
      }
    });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kidId, baseId, canWebgl]);

  if (status === "probing") return <StageSkeleton />;

  if (status === "missing" || !modelUrl) {
    return (
      <AvatarPlaceholder kidId={kidId} firstName={firstName} onGuide={onGuide} />
    );
  }

  const placeholder = (
    <AvatarPlaceholder kidId={kidId} firstName={firstName} onGuide={onGuide} />
  );

  return (
    <ViewerBoundary fallback={placeholder}>
      <Suspense fallback={<StageSkeleton />}>
        <VRMAvatarViewer
          modelUrl={modelUrl}
          loadout={loadout}
          emote={emote}
          onError={() => {
            setStatus("missing");
            onStatus?.("missing");
          }}
        />
      </Suspense>
    </ViewerBoundary>
  );
}
