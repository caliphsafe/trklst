# TRKLST
A public Google Drive MP3 listening room built with React, Vite, dnd-kit and stateless Vercel functions. No database, account system, additional storage service, or Google API key. Audio stays in Drive.

## Artist workflow
Paste a public Drive folder link, enter artist/project details, and optionally choose artwork. Drag the grip handles (touch-and-hold on phones), use keyboard Space/arrow keys to arrange tracks. Playback follows the current sequence.

Edits autosave to **localStorage in the current browser**. The stable artist link uses `#edit=project-id` and always opens the latest local save on that browser. No project file is uploaded or written to Drive. The artist must keep the same browser and site origin. Clearing browser data, private-mode session expiration, or changing devices loses access to device-only edits. Save status reports local save failures. “Transfer copy” creates an editable snapshot link for another device; those copies do not synchronize. Legacy `#p=` links still load and migrate to the stable local link after saving.

## Drive refresh
Opening a room checks Drive automatically. “Refresh from Drive” also checks manually. Existing track order is retained, names/resource keys update, new tracks append, and missing tracks stay visible as unavailable and are skipped by playback. A confirmed empty public folder can mark all existing tracks unavailable. A request error retains the saved list.

Refreshing changes the audio request revision so the next playback loads current bytes for the same file ID. Active audio is allowed to finish without being restarted. Google Drive's own caching, permissions and quotas still apply. Deleting/reuploading creates a new ID: the old track is flagged and the new file appends; it cannot safely be identified as the same song by filename alone.

## Listener links
“Share listening session” offers:
- **This exact sequence**: a compressed snapshot of the artist's current order/details/artwork. Later local artist edits cannot propagate to this link. Drive names, availability, and same-ID audio replacements refresh; new files are not added to a published snapshot.
- **Follow current Drive filenames**: a stable link that reloads all current folder MP3s in natural filename order. Rename files with 01, 02, 03 prefixes in Google Drive to control this order. It does not follow local drag-and-drop edits. Artist/title/artwork remain as shared.

Listeners have playback controls and Drive refresh, with no edit, reorder, version, or artist-share controls. Listener sessions do not overwrite artist localStorage or read a newer local artist draft. They refresh every minute while visible, on page reload, and manually. This is a read-only presentation, not DRM: recipients can copy public audio or build their own separate project.

## Password-encrypted links
An optional password of 10–200 characters encrypts the complete compressed listener payload using Web Crypto AES-256-GCM, a random 96-bit IV, and a key derived with PBKDF2-SHA-256 (310,000 iterations, random 128-bit salt). The password is not in the URL, persisted, or sent to the server. Passwords can be changed/removed when generating a new link from the editing page.

This encrypts **the link's project details**, not the already-public Drive files. Anyone who separately has a public Drive URL may access those files. Old links retain their original password and cannot be revoked, expired securely, or remotely changed. Use a strong passphrase and send it separately. The complete encrypted link must be retained.

## Additional tools
Save and restore up to 12 named sequence versions locally. Restore keeps current filenames/availability and appends new files. Versions do not synchronize. Configurable 0/1/2/3/5-second listening gaps, repeat, previous/next, seeking, undo, and text export are included. Mobile autoplay policies can require tapping Play after a delayed transition. No additional silence is added by default.

## Limits
100 tracks per project; MP3s directly in the folder, no subfolder recursion. Artwork is a compact 192px JPEG carried in transfer/listener links. Links may be long; some messaging services truncate them.

Without shared writable storage, the app cannot synchronize arbitrary drag-and-drop changes to existing listener links, synchronize artist edits across devices, revoke already-issued links/passwords, collect shared listener feedback, or enforce server-side expiry. It does not claim otherwise.

## Build and deployment
Node 22+. `npm install`, `npm test`, `npm run build`. No package-lock.json; .npmrc disables it. Vercel builds run tests before compilation. Import caliphsafe/trklst with the Vite preset; no environment variables required. `npm run dev` is frontend-only; `vercel dev` supplies API routes for local integration testing.

Google's anonymous embedded folder HTML is not a guaranteed API contract and may need maintenance. Download permissions, quotas, sign-in requirements and network errors are handled explicitly. Transient import failures get one retry. The serverless proxy stores no audio but uses hosting bandwidth/function time.

The provided FREE LIIPH folder was successfully imported and actual MP3 playback was observed before this release. Regression tests cover local links, listener isolation, refresh reconciliation, encrypted link authentication, network retries, empty folders and audio ranges. This release's browser/touch interactions still need device verification if the execution/browser environment is unavailable.

## Artist passwords and simplified playback
Optional artist passwords are offered at creation and under Artist password on the tracklisting page. The saved local project and named versions are encrypted with the same Web Crypto scheme as listener links. Reloading or using Lock requires the password again. Passwords stay only in memory during an unlocked session. Changing/removing the password rewrites the local record; protected transfer copies are encrypted as well. Legacy plaintext snapshots already copied elsewhere cannot be revoked. Public Drive files are unchanged. There is no password recovery.

The listener view shows artwork, artist, project title, track count, playback, and an icon-only refresh control. The player is a compact floating card on desktop and mobile. Visual up/down reorder buttons are removed; grip dragging and keyboard grip controls remain.

### Track transitions
Choose **Track transition** on the artist page: no gap, a 1–5 second delay, or start the next song 1–5 seconds early. Early start overlaps two audio elements at the chosen volume without cutting off the outgoing song or applying a fade. Pause controls both; seeking or manual skipping clears the outgoing tail. The next track is preloaded when possible, and automatic playback follows the current sequence. Streaming/buffering and browser background playback restrictions can affect timing. The setting autosaves with the project and is included in newly created listener links; previously shared snapshots retain their original settings.
