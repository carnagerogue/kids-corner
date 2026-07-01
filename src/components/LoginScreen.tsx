import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, kidList } from "../store/selectors";
import { pinMatches } from "../lib/hash";
import { PinDots, PinPad } from "./PinPad";
import type { KidId } from "../types";

const MAX_PIN_LEN = 8;

export function LoginScreen({
  onLogin,
  onParent,
  onBack,
}: {
  onLogin: (kidId: KidId) => void;
  onParent: () => void;
  onBack?: () => void;
}) {
  const { state } = useApp();
  const [picked, setPicked] = useState<KidId | null>(null);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  const kid = picked ? getKid(state, picked) : null;

  const reset = () => {
    setPicked(null);
    setEntry("");
    setError(false);
  };

  // PINs are stored hashed, so we no longer know the real PIN's length up
  // front — re-check after every digit (once at least 3 are typed, the
  // shortest allowed PIN) instead of waiting for a known target length.
  const checkEntry = async (kidId: KidId, next: string) => {
    if (next.length < 3) return;
    const stored = state.kidPins[kidId] ?? "";
    if (await pinMatches(next, stored)) {
      onLogin(kidId);
    } else if (next.length >= MAX_PIN_LEN) {
      setError(true);
      setEntry("");
    }
  };

  const press = (d: string) => {
    if (!picked) return;
    const kidId = picked;
    setError(false);
    setEntry((prev) => {
      const next = (prev + d).slice(0, MAX_PIN_LEN);
      void checkEntry(kidId, next);
      return next;
    });
  };

  const back = () => setEntry((e) => e.slice(0, -1));

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="login__logo">☀️</span>
          <div>
            <h1 className="login__title">Kids Corner</h1>
            <p className="login__subtitle">Summer Command Center</p>
          </div>
        </div>

        {!picked ? (
          <>
            <h2 className="login__prompt">Which kid? 👋</h2>
            {kidList(state).length === 0 ? (
              <p className="login__empty">
                No kids set up yet — a grown-up can add them in the Grown-Ups
                area.
              </p>
            ) : (
              <div className="login__pick">
                {kidList(state).map((k) => (
                  <button
                    key={k.id}
                    className="loginkid"
                    style={{
                      ["--this-kid" as string]: k.color,
                      ["--this-kid-soft" as string]: k.colorSoft,
                    }}
                    onClick={() => {
                      setPicked(k.id);
                      setEntry("");
                      setError(false);
                    }}
                  >
                    <span className="loginkid__avatar">{k.emoji}</span>
                    <span className="loginkid__name">{k.firstName}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="login__foot">
              {onBack && (
                <button className="login__parent" onClick={onBack}>
                  ← Back
                </button>
              )}
              <button className="login__parent" onClick={onParent}>
                🔒 Grown-Ups
              </button>
            </div>
          </>
        ) : (
          <div
            className="login__pin"
            style={{
              ["--kid" as string]: kid!.color,
              ["--kid-dark" as string]: kid!.colorDark,
              ["--kid-soft" as string]: kid!.colorSoft,
            }}
          >
            <span className="login__avatarbig">{kid!.emoji}</span>
            <h2 className="login__prompt">Hi {kid!.firstName}! Enter your PIN</h2>
            <div className={error ? "is-error" : ""}>
              <PinDots count={entry.length} total={Math.max(entry.length, 4)} />
            </div>
            {error && <p className="login__error">Oops, try again!</p>}
            <PinPad onDigit={press} onBack={back} />
            <button className="login__parent" onClick={reset}>
              ← Not {kid!.firstName}? Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
