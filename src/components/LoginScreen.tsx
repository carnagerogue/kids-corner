import { useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, kidList } from "../store/selectors";
import { PinDots, PinPad } from "./PinPad";
import type { KidId } from "../types";

export function LoginScreen({
  onLogin,
  onParent,
}: {
  onLogin: (kidId: KidId) => void;
  onParent: () => void;
}) {
  const { state } = useApp();
  const [picked, setPicked] = useState<KidId | null>(null);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState(false);

  const kid = picked ? getKid(state, picked) : null;
  const pin = picked ? state.kidPins[picked] ?? "" : "";

  const reset = () => {
    setPicked(null);
    setEntry("");
    setError(false);
  };

  const press = (d: string) => {
    if (!picked) return;
    setError(false);
    const next = (entry + d).slice(0, Math.max(pin.length, 8));
    setEntry(next);
    if (next.length >= pin.length) {
      if (next === pin) {
        onLogin(picked);
      } else {
        setError(true);
        setEntry("");
      }
    }
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
            <h2 className="login__prompt">Who's here? 👋</h2>
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
            <button className="login__parent" onClick={onParent}>
              🔒 Grown-Ups
            </button>
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
              <PinDots count={entry.length} total={pin.length || 4} />
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
