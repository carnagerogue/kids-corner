# Luminara Guardian — self-hosted install (no Chrome Web Store)

This installs the Guardian **from your own Firebase Hosting**, force-installed by
policy so a child can't remove it. Use this on **Windows / Mac computers** and
**managed Chromebooks**. It does NOT work on a **personal (home) Chromebook** —
those can only install from the Chrome Web Store, so use the Unlisted store
listing for those.

> **Easy front door:** send grown-ups to
> **https://kids-corner-45fc2.firebaseapp.com/guardian/install.html** — it
> detects their OS and hands them a one-click installer (a `.reg` on Windows,
> a profile on Mac). The child installs nothing and can't remove it. Everything
> below is the manual equivalent of what that page does.

## The two values you need

- **Extension ID:** `jcidbnilldagoigommaalmndbgkkkbdk`
- **Update URL:** `https://kids-corner-45fc2.firebaseapp.com/guardian/updates.xml`

(The signed extension lives at
`https://kids-corner-45fc2.firebaseapp.com/guardian/kids-corner-guardian.crx`.)

---

## Quickest install, no admin — "Load unpacked" (Windows/Mac, Chrome or Edge)

Best while the Web Store listing is in review. It installs in ~30 seconds with
no policy setup. (Trade-off: the child can turn it off, and Chrome shows a
"developer mode extensions" reminder on startup. For a lock they can't remove,
use the force-install method below instead.)

1. Download and unzip:
   `https://kids-corner-45fc2.firebaseapp.com/guardian/kids-corner-guardian-unpacked.zip`
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the unzipped **kids-corner-guardian** folder.

Sign in to Luminara and it turns on automatically.

> ChromeOS note: "Load unpacked" needs Developer Mode (a device powerwash) on a
> **personal** Chromebook, so it isn't practical there — a personal Chromebook
> should wait for the Web Store listing.

---

## Windows (Chrome) — run in an **Administrator** Command Prompt

```
reg add "HKLM\Software\Policies\Google\Chrome\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "jcidbnilldagoigommaalmndbgkkkbdk;https://kids-corner-45fc2.firebaseapp.com/guardian/updates.xml" /f
```

Windows (Edge): same command with the Edge path:

```
reg add "HKLM\Software\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "jcidbnilldagoigommaalmndbgkkkbdk;https://kids-corner-45fc2.firebaseapp.com/guardian/updates.xml" /f
```

Then fully quit and reopen Chrome/Edge. Confirm at `chrome://policy` (click
**Reload policies**) and `chrome://extensions` — Guardian shows as *Installed by
enterprise policy* and can't be removed.

## Mac (Chrome)

1. On the child's Mac, download the profile:
   `https://kids-corner-45fc2.firebaseapp.com/guardian/kids-corner-guardian-mac.mobileconfig`
2. Open **System Settings → General → Device Management** (older macOS:
   **System Preferences → Profiles**), select the profile, and **Install**
   (enter an admin password).
3. Quit and reopen Chrome. Verify at `chrome://policy`.

## Managed Chromebook (Google Workspace / Education admin only)

Personal Chromebooks can't do this — this is only for Chromebooks enrolled in
your organization.

1. **admin.google.com → Devices → Chrome → Apps & extensions → Users & browsers**.
2. Pick the org unit with the kids' accounts.
3. Click **＋ → Add Chrome app or extension by ID**, choose **"From a custom URL"**,
   and enter:
   - ID: `jcidbnilldagoigommaalmndbgkkkbdk`
   - URL: `https://kids-corner-45fc2.firebaseapp.com/guardian/updates.xml`
4. Set installation policy to **Force install**. Save.

---

## Shipping an update

The signing key `extension/guardian-signing-key.pem` is **gitignored — keep a
backup and never share it**. It's what proves future versions are the same
extension; lose it and you'd have to re-deploy under a new ID.

To publish a new version:

1. Edit the extension, then bump `"version"` in `extension/manifest.json` **and**
   the `version` in `public/guardian/updates.xml`.
2. Re-pack the signed `.crx` (from the repo root):

   ```
   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   rm -rf /tmp/kcg && mkdir -p /tmp/kcg/pkg/icons
   cp extension/manifest.json extension/background.js extension/content.js \
      extension/blocked.html extension/blocked.js /tmp/kcg/pkg/
   cp extension/icons/*.png /tmp/kcg/pkg/icons/
   "$CHROME" --pack-extension=/tmp/kcg/pkg --pack-extension-key=extension/guardian-signing-key.pem
   cp /tmp/kcg/pkg.crx public/guardian/kids-corner-guardian.crx
   ```

3. Commit and push (deploys hosting). Devices pick up the new version within a
   few hours, or immediately on `chrome://extensions → Update`.

## Reminder — how this compares to the store

The Unlisted Web Store listing is a one-click install with zero per-machine
setup and covers personal Chromebooks too. This self-hosted route trades that
convenience for: no review/wait, and a **force-install the child can't remove**.
Use whichever fits each device.
