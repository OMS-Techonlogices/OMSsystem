# OMS Business Suite Desktop — Cloud Edition

Prepared for Matrix Data Egypt (MDE). This desktop shell targets Windows, macOS, and Linux using Electron. Invoice, Media, and Admin remain separate portals and are loaded from their HTTPS production URLs.

## Architecture

- Electron desktop shell only; no local PostgreSQL service.
- No local Node.js API processes and no `npm run dev` in packaged production.
- Invoice, Media, and Admin frontends are hosted web applications.
- Their APIs and database remain in the cloud and are owned by the respective deployed services.
- Offline mode is intentionally deferred.

## Required configuration

On first launch the app creates:

- Windows: `%APPDATA%/oms-desktop-suite/oms-desktop.config.json`
- macOS: `~/Library/Application Support/oms-desktop-suite/oms-desktop.config.json`
- Linux: `~/.config/oms-desktop-suite/oms-desktop.config.json`

Fill it with the production frontend URLs:

```json
{
  "portals": {
    "invoice": { "url": "https://YOUR-INVOICE-FRONTEND.example.com", "healthUrl": "https://YOUR-INVOICE-FRONTEND.example.com" },
    "media": { "url": "https://YOUR-MEDIA-FRONTEND.example.com", "healthUrl": "https://YOUR-MEDIA-FRONTEND.example.com" },
    "admin": { "url": "https://YOUR-ADMIN-FRONTEND.example.com", "healthUrl": "https://YOUR-ADMIN-FRONTEND.example.com" }
  }
}
```

The app accepts HTTPS URLs in packaged mode. `healthUrl` can point to a lightweight health endpoint if the frontend root is not suitable. Do not put database passwords, Supabase service-role keys, JWT signing secrets, or other server secrets in this file or in the desktop application.

## Frontend/API prerequisite

The three deployed frontends must already use their production cloud API base URLs. The uploaded desktop folder did not include the three frontend `api.ts`/API client files or their built `dist` folders, so this desktop update cannot safely change or verify those API endpoints. Do not point the desktop to localhost APIs.

## Build

Install dependencies in this directory:

```bash
npm install
```

Build on the corresponding operating system:

```bash
npm run dist:win
npm run dist:mac
npm run dist:linux
```

`dist:all` is a convenience command, but reliable macOS packaging/signing should be performed on macOS. For production distribution, configure code signing for Windows and Developer ID signing + notarization for macOS. Linux AppImage/DEB outputs should be tested on supported target distributions.

## Branding assets still required

The uploaded files did not include the `assets` folder or `logo-cropped.png`. Add the original approved OMS logo assets under `assets/` and reference them in `index.html`. Add platform icon files before release if branded app icons are required. No replacement logo has been invented in this package.

## Important release checklist

- [ ] Replace all three example frontend URLs with the real production URLs.
- [ ] Confirm each frontend API client uses the correct cloud API endpoint.
- [ ] Confirm CORS allows the deployed frontend origins where required.
- [ ] Add the original OMS logo assets and platform icons.
- [ ] Test login, navigation, printing, file upload/download, and authentication persistence on all three OS families.
- [ ] Configure signing/notarization and release/update hosting.
