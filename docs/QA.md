# QA Report

## Automated checks

- `npm run build`: TypeScript compilation and Vite production bundling.
- `npm test`: ordered domains, nine spreads, and eight immutable sheet face mappings.
- Page motion regression checks: both material groups render a face; top vertices match texture orientation; paper remains within 0.02 world units of its original width while bending; midpoint vertices rise away from the book; forward and reverse endpoints face the correct direction; front and back covers close and reopen as thick boxes with the appropriate stationary pages hidden; spring timing is consistent at 30, 60, and 120 fps; queued navigation and cancelled turns restore the correct content; chapter navigation crosses the whole book in 2–4.5 simulated seconds at 30, 60, and 120 fps, with a visibly slower destination sheet, handles a new destination mid-turn, and restores the normal pace for manual turns.
- Page content checks: all eighteen canvases have text within their page height; the four common fields appear on the cover, and domain worksheets contain their questions and answers without repeating those fields; the finale shows saved draft status; font syntax and the full size bold cover title are validated; each domain draws its assigned colorful stick figure, no cartoon images are drawn, and the finale draws all five figure colors. These use a canvas context stub and do not verify real font rendering or pixel layout.

- Shared profile checks: migration chooses the most complete existing profile, preserves domain answers, updates every domain from one profile, honors cleared fields, validates the common profile for demo submission, and keeps common inputs out of domain forms, and includes and accepts 5th year.

## Browser limitations

Vite cannot bind a server port in this sandbox (`listen EPERM`). Headless Chromium was attempted with a writable profile; it exits because socket operations required by its process infrastructure are blocked. Browser screenshots and manual interaction checks therefore remain unverified.

## Browser review to perform

Check automatic cover opening, dragging in both directions, slow and quick releases, cancelled turns, returning to the closed cover, chapter navigation during a turn, and both mobile page sides. Check real text layout, speech bubbles, shadows, field previews, modal focus trapping, local draft restoration, summary status, JSON exports, zoom, bookmarks, continue reading, fullscreen, reduced motion, and the WebGL fallback. No successful browser review is claimed by the automated checks.
