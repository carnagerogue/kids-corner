import { useState } from "react";
import { useFamily } from "../store/FamilyContext";

/**
 * Shown on the kid entry when a device isn't yet BOUND to a family. It reveals
 * NO children — a stranger (or a kid from another family) sees only a friendly
 * "ask a grown-up to connect this tablet" prompt. A grown-up generates a setup
 * code from their dashboard; entering it here binds the device and the real kid
 * picker appears. The error copy never says whether a code was wrong, expired,
 * or never existed.
 */
export function ConnectDevice({
  onBack,
  onParent,
}: {
  onBack: () => void;
  onParent: () => void;
}) {
  const { pairDevice } = useFamily();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c || busy) return;
    setBusy(true);
    setError(false);
    try {
      await pairDevice(c); // reloads on success
    } catch {
      setBusy(false);
      setError(true);
      setCode("");
    }
  };

  return (
    <div className="login">
      <div className="login__card">
        <img
          className="login__logo-full"
          src={`${import.meta.env.BASE_URL}luminara-logo.png`}
          alt="Luminara — Spark curiosity, Build skills, Light tomorrow"
        />

        <span className="connect__mascot" aria-hidden="true">
          📱✨
        </span>
        <h2 className="login__prompt">Let's connect this tablet!</h2>
        <p className="connect__sub">
          Ask a grown-up for the setup code from their dashboard.
        </p>

        <form className="connect__form" onSubmit={submit}>
          <input
            className={`connect__code ${error ? "is-error" : ""}`}
            value={code}
            onChange={(e) => {
              // Auto-group as ABCDE-FGHIJ, exactly how the grown-up's screen
              // shows it, so a kid can type-along character by character.
              const raw = e.target.value
                .toUpperCase()
                .replace(/[^0-9A-Z]/g, "")
                .slice(0, 10);
              setCode(raw.length > 5 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : raw);
              setError(false);
            }}
            placeholder="ABCDE-FGHIJ"
            aria-label="Grown-up setup code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            maxLength={11}
            autoFocus
            disabled={busy}
          />
          <button
            className="btn btn--primary btn--big connect__go"
            type="submit"
            disabled={busy || !code.trim()}
          >
            {busy ? "Connecting…" : "Connect ✨"}
          </button>
        </form>
        {error && (
          <p className="login__error">
            Hmm, that code didn't work — ask your grown-up.
          </p>
        )}

        <div className="login__foot">
          <button className="login__parent" onClick={onBack}>
            ← Back
          </button>
          <button className="login__parent" onClick={onParent}>
            🔒 Grown-Ups
          </button>
        </div>
      </div>
    </div>
  );
}
