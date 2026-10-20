# TRKLST

A responsive listening room for artists to sequence a project from a public Google Drive folder. Built with React, Vite, dnd-kit, and two stateless Vercel functions. No database, login, Google API key, or external storage service is required. Fonts and assets are served by the app. No emojis are used.

## Artist workflow

1. In Google Drive, place MP3s directly in a folder. Set General access to **Anyone with the link** and allow viewers to download files.
2. Paste the folder link into TRKLST and enter an artist name, project name, and optional cover image.
3. Hold a track's grip handle to drag on touch devices, or drag with a mouse. Keyboard users can focus the handle, press Space, use the arrow keys, then press Space again. Individual up/down buttons are also provided.
4. Listen from the top, or select a track. Playback follows the current order even after rearranging. Reordering does not reload the currently playing track. Repeat, seek, previous/next, undo, and text export are included.
5. **Copy project link** to retain or share the current arrangement. Changes also save automatically on the current device.

## The database-free contract

The URL fragment contains compressed project metadata, ordered Drive file IDs, resource keys where available, and a small JPEG copy of optional artwork. The fragment is not sent to the application server. The audio remains in Drive and is streamed through the app's stateless proxy; no MP3 is stored by TRKLST.

A copied link is a **snapshot**, not a centrally synchronized record. Copy it again after editing to bring the latest sequence to another device. On the same browser, a newer locally saved version takes precedence over an older link for the same project ID. Different devices can diverge; this is intentionally not real-time collaboration. Anyone with the link can read and edit their own copy. Public Google Drive files are not private or access-controlled by TRKLST. Clearing browser storage loses device-only edits; retained snapshot links still restore their contents.

Artwork is cropped to a 192 × 192 JPEG, kept below 18 KB, and embedded in the link. Links can be long, and some messaging services truncate long URLs. Copy the full link or use the exported text file, which includes it. Limits: 100 MP3s, 100-character project/artist names. Folder changes after import are not automatically synchronized; create a new room to import a fresh folder listing. Only MP3s directly in the linked folder are imported, not nested folders.

## Run and deploy

Use Node 22 or later. Run `npm install` then `npm run build`. `npm test` checks portable state, ordering, public folder parsing, and range/confirmation/error handling for the audio proxy. `.npmrc` disables `package-lock.json` as requested.

Import **caliphsafe/trklst** into Vercel, select **Vite**, and deploy `main`. `vercel.json` configures the build, output, headers, and serverless functions. No environment variables are required. `npm run dev` provides a frontend-only preview; use `vercel dev` for local Drive import and audio API functions.

The app needs serverless hosting for `/api/drive` and `/api/audio`; plain static file hosting cannot provide these routes. Runtime audio transfer consumes the hosting provider's bandwidth/function allowance even though no database or storage service is used.

## Google Drive compatibility

Folder import reads Google's anonymous embedded folder listing; this is not a guaranteed Drive API contract and may need maintenance if Google changes its markup. Audio supports resource keys, safe Google redirects, download confirmation forms, and byte ranges where Google provides them. No credentials or private-file access are used. Google can block downloads, rate-limit public files, impose quotas, or require sign-in. These cases show an error instead of passing HTML to the audio player. Large or throttled files can also exceed the hosting function duration. Ordinary user-initiated playback is required by mobile browsers; uninterrupted background playback is subject to the browser/OS.

The test suite uses representative Drive HTML and mocked HTTP responses for deterministic coverage. A live anonymous Drive folder listing was also checked during development. End-to-end playback with the artist's own public MP3 folder, physical touch testing, and hosted verification remain necessary; no artist folder was provided with the initial request.
