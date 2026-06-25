/** Kid-friendly numeric keypad for entering a PIN. */
export function PinPad({
  onDigit,
  onBack,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  disabled?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div className="pinpad">
      {keys.map((k) => (
        <button
          key={k}
          className="pinpad__key"
          disabled={disabled}
          onClick={() => onDigit(k)}
        >
          {k}
        </button>
      ))}
      <span className="pinpad__spacer" />
      <button
        className="pinpad__key"
        disabled={disabled}
        onClick={() => onDigit("0")}
      >
        0
      </button>
      <button
        className="pinpad__key pinpad__key--back"
        disabled={disabled}
        onClick={onBack}
        aria-label="Delete"
      >
        ⌫
      </button>
    </div>
  );
}

/** Filled/empty dots showing how many digits have been entered. */
export function PinDots({ count, total = 4 }: { count: number; total?: number }) {
  const slots = Math.max(total, count);
  return (
    <div className="pindots">
      {Array.from({ length: slots }, (_, i) => (
        <span key={i} className={`pindot ${i < count ? "is-filled" : ""}`} />
      ))}
    </div>
  );
}
