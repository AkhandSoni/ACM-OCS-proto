# Technical Audit

## Existing architecture

The app is a single Vite entry point. `src/main.ts` constructs the Three.js scene, generates page textures in canvas, owns pointer/wheel/keyboard input, and builds the application form as DOM markup. `src/style.css` styles the HUD and form overlay. There are no local art/font assets, tests, or application modules beyond those files.

## Book rendering and interaction

Seven coplanar `PlaneGeometry` sheets use 40 × 28 segments, translated so each pivots at its inner edge. Each has front and reverse canvas textures on separate `FrontSide`/`BackSide` materials. Reverse UVs are mirrored by a negative repeat. Page content is inferred from arithmetic on the physical sheet index rather than an explicit reading-order model. A broad `BoxGeometry` behind the pages acts as a block, but there are no separate covers, spine, stitch detail, layered edges, or page thickness.

The active sheet deforms with a sinusoidal bend but primarily rotates around its spine. Pointer dragging derives progress from horizontal displacement, then snaps to an endpoint on release; release velocity and intermediate settling are absent. Screen-space left/right selection enables reverse turns, while click navigation uses the raycast/book plane. Wheel input triggers one full turn per 650 ms. The camera uses a fixed FOV and a resize calculation that does not account for safe areas, UI, zoom, or single-page mobile reading.

## Materials, content, and application state

The scene uses basic hemisphere/directional lights and one paper color; canvas grain is repeated random speckling, and the doodle is a generic generated face. No distinct desk, contact shadow design, real page edge, or asset licensing record exists. The form collects only a subset of the requested fields, saves only on submit to `localStorage`, and gives a local-only status. There is no final summary or submission state.

## Risks and plan

Keep Three.js and the segmented mesh, but replace implicit page arithmetic with explicit face/spread metadata, improve the curl/settle model, and build physical book details and story-consistent canvas art. Keep form UI in accessible DOM and persist each edit. The [Qbject book](https://book.qbject.dev/) is an interaction/physical-book inspiration; its page is image-rendered, so its source implementation could not be audited from this environment. No third-party imagery or fonts are present, so original procedural artwork avoids unresolved asset licensing.
