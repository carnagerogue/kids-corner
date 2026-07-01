import { useState } from "react";
import { useApp } from "../store/AppContext";
import { useFamily } from "../store/FamilyContext";
import { kidList } from "../store/selectors";
import { hashPin } from "../lib/hash";
import { KID_EMOJIS, KID_PALETTE } from "../data/kids";
import { createPairing, formatPairingCode } from "../sync";
import { CopyField } from "./AppCard";
import { isAllowedParent } from "../data/accessAllowlist";
import { signOutUser } from "../firebase";
import type { KidId } from "../types";

// A family only sees the first-run setup once. Keyed by family id so a second
// household on the same device gets its own guided setup.
const key = (fid: string | null) => `kids-corner:onboarded:${fid ?? "none"}`;
export function isOnboarded(fid: string | null): boolean {
  try {
    return !!fid && localStorage.getItem(key(fid)) === "1";
  } catch {
    return false;
  }
}
export function setOnboarded(fid: string | null): void {
  try {
    if (fid) localStorage.setItem(key(fid), "1");
  } catch {
    /* ignore */
  }
}

const STEPS = [
  { label: "Family", emoji: "🏡" },
  { label: "Kids", emoji: "🧒" },
  { label: "Devices", emoji: "📱" },
] as const;

/**
 * First-run setup for a grown-up: name the family, add the kids, connect a
 * tablet — one calm step at a time, instead of dropping a brand-new parent into
 * the full dashboard. Step 1 (naming the family) reloads into the new family
 * scope and lands back here at the Kids step.
 */
export function OnboardingWizard({ onFinish }: { onFinish: () => void }) {
  const fam = useFamily();
  const [phase, setPhase] = useState<"kids" | "device" | "done">("kids");

  if (fam.needsFamily) {
    return (
      <Shell current={0}>
        <FamilyStep />
      </Shell>
    );
  }

  const current = phase === "kids" ? 1 : 2;
  return (
    <Shell current={current} allDone={phase === "done"}>
      {phase === "kids" && (
        <KidsStep onContinue={() => setPhase("device")} onSkip={onFinish} />
      )}
      {phase === "device" && (
        <DeviceStep onNext={() => setPhase("done")} onBack={() => setPhase("kids")} />
      )}
      {phase === "done" && <DoneStep onFinish={onFinish} />}
    </Shell>
  );
}

function Shell({
  current,
  allDone,
  children,
}: {
  current: number;
  allDone?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="wiz">
      <div className="wiz__card">
        <div className="wiz__brand">
          <span className="wiz__logo">☀️</span>
          <div>
            <h1 className="wiz__title">Kids Corner</h1>
            <p className="wiz__tagline">Let's set up your family</p>
          </div>
        </div>

        <ol className="wizsteps" aria-label="Setup progress">
          {STEPS.map((s, i) => {
            const done = allDone || i < current;
            const state = done ? "is-done" : i === current ? "is-current" : "";
            return (
              <li key={s.label} className={`wizsteps__node ${state}`}>
                <span className="wizsteps__dot">{done ? "✓" : s.emoji}</span>
                <span className="wizsteps__label">{s.label}</span>
              </li>
            );
          })}
        </ol>

        <div className="wiz__body">{children}</div>
      </div>
    </div>
  );
}

function FamilyStep() {
  const { user, createFamily } = useFamily();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isAllowedParent(user?.email)) {
    return (
      <div className="wizstep">
        <span className="wizstep__emoji">🚫</span>
        <h2 className="wizstep__h">You're not on the list yet</h2>
        <p className="wizstep__p">
          {user?.email ?? "This account"} isn't approved to create a family. Ask
          the Kids Corner admin to add you, then sign in again.
        </p>
        <button className="btn btn--primary btn--big wiz__cta" onClick={() => signOutUser()}>
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      await createFamily(name.trim()); // reloads into the Kids step
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Couldn't create your family.");
    }
  };

  return (
    <form className="wizstep" onSubmit={submit}>
      <span className="wizstep__emoji">🏡</span>
      <h2 className="wizstep__h">What's your family called?</h2>
      <p className="wizstep__p">
        Signed in as {user?.email}. This is just a friendly name for your
        family's space.
      </p>
      <input
        className="wiz__input"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. The Moon-Lee Family"
        maxLength={60}
        aria-label="Family name"
      />
      <button
        className="btn btn--primary btn--big wiz__cta"
        type="submit"
        disabled={busy || !name.trim()}
      >
        {busy ? "Creating…" : "Create family →"}
      </button>
      {error && <p className="wizstep__err">{error}</p>}
      <button type="button" className="wiz__link" onClick={() => signOutUser()}>
        Use a different account
      </button>
    </form>
  );
}

function KidsStep({
  onContinue,
  onSkip,
}: {
  onContinue: () => void;
  onSkip: () => void;
}) {
  const { state, dispatch } = useApp();
  const kids = kidList(state);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(KID_EMOJIS[0]);
  const [palette, setPalette] = useState(3);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const pal = KID_PALETTE[palette % KID_PALETTE.length];
  const canAdd = name.trim().length > 0 && pin.trim().length >= 3 && !busy;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAdd) return;
    setBusy(true);
    dispatch({
      type: "ADD_KID",
      firstName: name.trim(),
      emoji,
      paletteIndex: palette,
      pin: await hashPin(pin.trim()),
    });
    setName("");
    setPin("");
    setEmoji(KID_EMOJIS[(KID_EMOJIS.indexOf(emoji) + 1) % KID_EMOJIS.length]);
    setPalette((p) => (p + 1) % KID_PALETTE.length);
    setBusy(false);
  };

  const remove = (id: KidId) => dispatch({ type: "REMOVE_KID", kidId: id });

  return (
    <div className="wizstep">
      <h2 className="wizstep__h">Who's in your family?</h2>
      <p className="wizstep__p">
        Give each child a name, a look, and a secret PIN they'll type to log in.
      </p>

      {kids.length > 0 && (
        <ul className="wizkids">
          {kids.map((k) => (
            <li
              key={k.id}
              className="wizkids__chip"
              style={{ background: k.colorSoft }}
            >
              <span className="wizkids__face" style={{ background: k.color }}>
                {k.emoji}
              </span>
              <span className="wizkids__name">{k.firstName}</span>
              {kids.length > 1 && (
                <button
                  className="wizkids__x"
                  onClick={() => remove(k.id)}
                  aria-label={`Remove ${k.firstName}`}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form
        className="wizadd"
        onSubmit={add}
        style={
          {
            ["--c" as string]: pal.color,
            ["--cd" as string]: pal.colorDark,
            ["--cs" as string]: pal.colorSoft,
          } as React.CSSProperties
        }
      >
        <div className="wizadd__preview">
          <span className="wizadd__face">{emoji}</span>
          <span className="wizadd__pname">{name.trim() || "New kid"}</span>
        </div>

        <input
          className="wiz__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="First name"
          maxLength={24}
          aria-label="Child's first name"
        />

        <span className="wizadd__label">Pick a look</span>
        <div className="wizadd__row" role="group" aria-label="Avatar">
          {KID_EMOJIS.map((em) => (
            <button
              type="button"
              key={em}
              className={`avatarpick ${emoji === em ? "is-active" : ""}`}
              onClick={() => setEmoji(em)}
            >
              {em}
            </button>
          ))}
        </div>

        <span className="wizadd__label">Pick a color</span>
        <div className="wizadd__row" role="group" aria-label="Color">
          {KID_PALETTE.map((p, i) => (
            <button
              type="button"
              key={i}
              className={`colorpick ${palette === i ? "is-active" : ""}`}
              style={{ background: p.color }}
              onClick={() => setPalette(i)}
              aria-label={`Color ${i + 1}`}
            />
          ))}
        </div>

        <span className="wizadd__label">
          Secret PIN <span className="wizadd__hint">at least 3 numbers</span>
        </span>
        <input
          className="wiz__input wiz__input--pin"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
          placeholder="••••"
          aria-label="Child's PIN"
        />

        <button className="wizadd__btn" type="submit" disabled={!canAdd}>
          ＋ Add {name.trim() || "child"}
        </button>
      </form>

      <div className="wiz__foot">
        <button
          className="btn btn--primary btn--big wiz__cta"
          onClick={onContinue}
          disabled={kids.length === 0}
        >
          {kids.length === 0
            ? "Add a child to continue"
            : `Continue with ${kids.length} ${kids.length === 1 ? "kid" : "kids"} →`}
        </button>
        <button className="wiz__link" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

type PairUI =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "shown"; code: string }
  | { phase: "error"; msg: string };

function DeviceStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const fam = useFamily();
  const [pair, setPair] = useState<PairUI>({ phase: "idle" });

  const generate = async () => {
    if (!fam.activeFamilyId) return;
    setPair({ phase: "working" });
    try {
      const { code } = await createPairing(fam.activeFamilyId);
      setPair({ phase: "shown", code });
    } catch (e) {
      setPair({ phase: "error", msg: e instanceof Error ? e.message : "Couldn't make a code." });
    }
  };

  return (
    <div className="wizstep">
      <span className="wizstep__emoji">📱</span>
      <h2 className="wizstep__h">Set up a kids' tablet?</h2>
      <p className="wizstep__p">
        Kids don't sign in with Google. Get a setup code, then type it on the
        tablet — it will show only your family.
      </p>

      {pair.phase !== "shown" ? (
        <button
          className="btn btn--primary btn--big wiz__cta"
          onClick={generate}
          disabled={pair.phase === "working"}
        >
          {pair.phase === "working" ? "Making a code…" : "Get a setup code"}
        </button>
      ) : (
        <div className="wizcode">
          <CopyField label="Setup code" value={formatPairingCode(pair.code)} />
          <p className="wizstep__p">
            On the tablet, tap <strong>I'm a Kid</strong> and type this code. It
            works for <strong>5 minutes</strong>.
          </p>
          <button className="wiz__link" onClick={generate}>
            Make a new code
          </button>
        </div>
      )}
      {pair.phase === "error" && <p className="wizstep__err">{pair.msg}</p>}

      <div className="wiz__foot">
        <button className="btn btn--primary btn--big wiz__cta" onClick={onNext}>
          {pair.phase === "shown" ? "All done →" : "Skip — connect a tablet later →"}
        </button>
        <button className="wiz__link" onClick={onBack}>
          ← Back to kids
        </button>
      </div>
    </div>
  );
}

function DoneStep({ onFinish }: { onFinish: () => void }) {
  const { state } = useApp();
  const fam = useFamily();
  const kids = kidList(state);
  const famName = fam.families.find((f) => f.id === fam.activeFamilyId)?.name;

  return (
    <div className="wizstep wizstep--done">
      <span className="wizstep__emoji wizstep__emoji--big">🎉</span>
      <h2 className="wizstep__h">You're all set!</h2>
      <p className="wizstep__p">
        {famName ? `${famName} is ready.` : "Your family is ready."}{" "}
        {kids.length > 0 &&
          `${kids.length} ${kids.length === 1 ? "kid is" : "kids are"} good to go.`}
      </p>

      {kids.length > 0 && (
        <ul className="wizkids wizkids--center">
          {kids.map((k) => (
            <li key={k.id} className="wizkids__chip" style={{ background: k.colorSoft }}>
              <span className="wizkids__face" style={{ background: k.color }}>
                {k.emoji}
              </span>
              <span className="wizkids__name">{k.firstName}</span>
            </li>
          ))}
        </ul>
      )}

      <button className="btn btn--primary btn--big wiz__cta" onClick={onFinish}>
        Go to my dashboard →
      </button>
    </div>
  );
}
