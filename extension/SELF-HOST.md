# Kids Corner Guardian — self-hosted install (no Chrome Web Store)

This installs the Guardian **from your own Firebase Hosting**, force-installed by
policy so a child can't remove it. Use this on **Windows / Mac computers** and
**managed Chromebooks**. It does NOT work on a **personal (home) Chromebook** —
those can only install from the Chrome Web Store, so use the Unlisted store
listing for those.

> Each computer needs a **one-time admin step** (a registry key on Windows, a
> configuration profile on Mac). Once set, the extension installs silently,
> auto-updates, and the child can't turn it off.

## The two values you need

- **Extension ID:** `jcidbnilldagoigommaalmndbgkkkbdk`
- **Update URL:** `https://kids-corner-45fc2.firebaseapp.com/guardian/updates.xml`

(The signed extension lives at
`https://kids-corner-45fc2.firebaseapp.com/guardian/kids-corner-guardian.crx`.)

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
