import { useState } from "react";
import type { AppLink } from "../types";

/** A curriculum/app link card with optional copy-paste login fields. */
export function AppCard({ app, required }: { app: AppLink; required?: boolean }) {
  return (
    <div className={`appcard ${required ? "appcard--required" : ""}`}>
      <span className="appcard__icon">{app.emoji}</span>
      <div className="appcard__body">
        <strong className="appcard__name">{app.name}</strong>
        {app.note && <span className="appcard__note">{app.note}</span>}
        {app.credential && (
          <div className="appcard__creds">
            <CopyField label="Username" value={app.credential.username} />
            <CopyField label="Password" value={app.credential.password} />
          </div>
        )}
      </div>
      <a
        className="btn btn--primary"
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        ↗ Open
      </a>
    </div>
  );
}

export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — value is visible to type manually */
    }
  };
  return (
    <button className="copyfield" onClick={copy} title="Copy">
      <span className="copyfield__label">{label}</span>
      <code className="copyfield__value">{value}</code>
      <span className="copyfield__icon">{copied ? "✓" : "⧉"}</span>
    </button>
  );
}
