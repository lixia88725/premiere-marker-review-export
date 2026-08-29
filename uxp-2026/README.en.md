# Marker Review Export — Premiere 2026 UXP

A UXP plugin for Premiere 26.3 and later. It reads active sequence markers and exports `review.html`, stills, video posters, and short MP4 previews. Marker comments can optionally be polished through any OpenAI-compatible HTTPS endpoint.

## Requirements

- Premiere 26.3+
- Adobe Media Encoder 26.3+ for duration-marker video previews
- UXP Developer Tool 2.2+
- Node.js 20+
- macOS or Windows

This version does not use CEP, ExtendScript, Node child processes, or FFmpeg.

## Build and test

From the repository root:

```sh
npm install
npm run typecheck
npm test
npm run build
```

Load the generated plugin from `uxp-2026/dist/`.

## Development loading

1. Install **UXP Developer Tools** from All Apps in Creative Cloud Desktop.
2. Enable Developer Mode in Premiere under `Settings > Plugins`, then restart Premiere.
3. Open UXP Developer Tool and choose `Add Plugin`.
4. Select `uxp-2026/dist/manifest.json`.
5. Click `Load`.
6. Open `Window > UXP Plugins > Marker Review Export` in Premiere.

Run `npm run build` before reloading after code changes.

## Package a `.ccx`

1. Run `npm run build`.
2. Add `dist/manifest.json` to UXP Developer Tool.
3. Open the plugin's `…` menu and choose `Package`.
4. Save the result under `uxp-2026/release/`.
5. Unload the development plugin, double-click the `.ccx`, install through Creative Cloud Desktop, and repeat the smoke test.

## AI and privacy

- Only marker metadata and comments are sent; video and audio are not uploaded.
- The Base URL must use HTTPS.
- Network access is declared for all domains to retain OpenAI-compatible endpoint support.
- API keys are held in UXP SecureStorage and excluded from ordinary preferences.
- AI failures preserve the original comments and do not block report export.

## Windows 26.3 smoke test

- Install the same `.ccx` and open the panel from `Window > UXP Plugins`.
- Verify persistent output-folder access and Windows paths containing spaces or Unicode.
- Export point-marker stills and duration-marker MP4/poster assets through AME.
- Confirm that the original sequence In/Out points are restored.
- Open the relative-path report locally in Edge or Chrome.
- Verify SecureStorage, HTTPS AI requests, editable previews, JSON backup, and GUID conflict protection.
