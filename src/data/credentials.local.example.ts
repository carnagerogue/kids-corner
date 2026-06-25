// ---------------------------------------------------------------------------
// LOCAL LOGINS — TEMPLATE
//
// Copy this file to `credentials.local.ts` and fill in real logins to get
// copy-paste username/password buttons on the Applications page while running
// locally (`npm run dev`).
//
// `credentials.local.ts` is gitignored, so it is NEVER committed to git and
// NEVER included in the public build / GitHub Pages site. Anything you deploy
// publicly will simply show an "Open" button with no login.
// ---------------------------------------------------------------------------
import type { Credential, KidId } from "../types";

export const CREDENTIALS: Partial<Record<KidId, Credential>> = {
  // claire: { username: "your-username", password: "your-password" },
  // coby: { username: "...", password: "..." },
  // hailee: { username: "...", password: "..." },
};
