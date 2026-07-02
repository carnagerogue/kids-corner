import { useEffect, useState } from "react";
import { useApp } from "../store/AppContext";
import { getKid, kidList } from "../store/selectors";
import { pinMatches } from "../lib/hash";
import { PinDots, PinPad } from "./PinPad";
import { AppIcon } from "./AppIcon";
import type { KidId } from "../types";

const MAX_PIN_LEN = 8;
/** Wrong tries before a gentle cooldown — stops a sibling guessing a PIN. */
const MAX_TRIES = 5;
const COOLDOWN_MS = 30_000;

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
  const [fails, setFails] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const locked = lockUntil > nowTick;
  // While cooling down, tick each second so the countdown updates and the pad
  // wakes back up on its own.
  useEffect(() => {
    if (!locked) return;
    const t = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [locked]);

  const kid = picked ? getKid(state, picked) : null;

  const reset = () => {
    setPicked(null);
    setEntry("");
    setError(false);
    setFails(0);
  };

  const fail = () => {
    setError(true);
    setEntry("");
    const next = fails + 1;
    if (next >= MAX_TRIES) {
      setFails(0);
      setNowTick(Date.now());
      setLockUntil(Date.now() + COOLDOWN_MS);
    } else {
      setFails(next);
    }
  };

  // PINs are stored hashed, so we no longer know the real PIN's length up
  // front — re-check after every digit (once at least 3 are typed, the
  // shortest allowed PIN). A right entry logs in instantly; a wrong one is
  // only knowable when the kid taps ✓ (or the pad fills up).
  const checkEntry = async (kidId: KidId, next: string) => {
    if (next.length < 3) return;
    const stored = state.kidPins[kidId] ?? "";
    if (await pinMatches(next, stored)) {
      onLogin(kidId);
    } else if (next.length >= MAX_PIN_LEN) {
      fail();
    }
  };

  const press = (d: string) => {
    if (!picked || locked) return;
    const kidId = picked;
    setError(false);
    setEntry((prev) => {
      const next = (prev + d).slice(0, MAX_PIN_LEN);
      void checkEntry(kidId, next);
      return next;
    });
  };

  // The ✓ key: instant "that wasn't it" feedback at any length, instead of
  // silently waiting for all 8 slots to fill.
  const submit = async () => {
    if (!picked || locked) return;
    const stored = state.kidPins[picked] ?? "";
    if (entry.length >= 3 && (await pinMatches(entry, stored))) {
      onLogin(picked);
    } else {
      fail();
    }
  };

  const secondsLeft = Math.max(0, Math.ceil((lockUntil - nowTick) / 1000));

  const back = () => setEntry((e) => e.slice(0, -1));

  return (
    <div className="login">
      <div className="login__card">
        <img
          className="login__logo-full"
          src={`${import.meta.env.BASE_URL}luminara-logo.png`}
          alt="Luminara — Spark curiosity, Build skills, Light tomorrow"
        />

        {!picked ? (
          <>
            <h2 className="login__prompt">Who’s learning today?</h2>
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
                    <span className="loginkid__avatar loginkid__initial" aria-hidden="true">
                      {k.firstName.slice(0, 1).toUpperCase()}
                    </span>
                    <span className="loginkid__name">{k.firstName}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="login__foot">
              {onBack && (
                <button className="login__parent" onClick={onBack}>
                  <AppIcon name="arrow-left" /> Back to Luminara
                </button>
              )}
              <button className="login__parent" onClick={onParent}>
                <AppIcon name="lock" /> Grown-ups
              </button>
            </div>
            <button className="login__hint" onClick={onParent}>
              Not your family? Ask a grown-up →
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
            <span className="login__avatarbig login__initialbig" aria-hidden="true">
              {kid!.firstName.slice(0, 1).toUpperCase()}
            </span>
            <h2 className="login__prompt">Hi {kid!.firstName}! Enter your PIN</h2>
            <div className={error ? "is-error" : ""}>
              <PinDots count={entry.length} total={Math.max(entry.length, 4)} />
            </div>
            {locked ? (
              <p className="login__error">
                Let's take a little break — try again in {secondsLeft}s
              </p>
            ) : error ? (
              <p className="login__error">Oops, try again!</p>
            ) : (
              <p className="login__padhint">Tap ✓ when you're done</p>
            )}
            <PinPad
              onDigit={press}
              onBack={back}
              onSubmit={() => void submit()}
              disabled={locked}
            />
            <button className="login__parent" onClick={reset}>
              <AppIcon name="arrow-left" /> Not {kid!.firstName}? Go back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
