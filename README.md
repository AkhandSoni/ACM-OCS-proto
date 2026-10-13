# ACM-VIT — The Sketchbook Issue

An interactive Three.js comic book with simple colorful stick figures and five ways to grow an idea. Each domain has a different figure color; the final pages bring the whole group together. It combines pencil comic borders, textured paper, rigid front and back hardcovers, flexible sheets, and application pages you can read before expanding them.

## Run locally

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`, then serve it with `npm run preview`. `npm test` checks the spread model, page motion, and page content.

## Deploy to GitHub Pages

In the `AkhandSoni/ACM-OCS-proto` repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. Push to `main` to run `.github/workflows/deploy.yml`, which installs dependencies, builds the app, and publishes only `dist/`. Keep `node_modules/` and `dist/` in `.gitignore`.

The published address is `https://akhandsoni.github.io/ACM-OCS-proto/`. Production asset paths use `/ACM-OCS-proto/`, configured in `vite.config.ts`; development still uses `/`. Serving the unbuilt root `index.html` will not run the TypeScript app. If the repository name changes, update the production base path.

## Read and write

Drag a sheet across the spine, scroll, or use the arrows to turn. The cover moves as a rigid sheet; interior pages bend while keeping their length. Choose a chapter from the book's index or chapter navigation. Bottom chapter buttons turn the intervening sheets at a brisk, visible pace, then slow down to land on the chosen chapter. On a phone, the Left page / Right page button changes which side you read.

Click a comic page or use the expand button to read it at a larger size. Click the cover nameplate to enter your name, registration number, VIT email, and year once. Every domain uses this shared profile. Existing personal details are recovered from the most complete saved domain draft when possible. Click a domain application page to edit only its questions and portfolio. Answers autosave to browser storage and appear on the physical book page. Export JSON to keep a copy. A single application export includes the current shared profile; Export All stores one profile alongside the domain answers. Demo submission records a local status; it sends nothing to ACM-VIT.

Use the bookmark button to keep a chapter, and the help button to return to it. Reading progress is saved on this device; a continue button appears on the cover when a saved chapter exists. The Back cover chapter closes the book from its final spread; click the back cover or use the previous arrow to reopen it. The shared year menu includes 1st through 5th year. Keyboard shortcuts: arrows to turn, Z to expand, Home to close the book, Escape to close a dialog. Fullscreen is available from the top toolbar.

Browsers without WebGL receive a canvas book with CSS cover/page rotation and the same content, reading controls, drafts, and exports. That view has simpler page motion than the Three.js renderer. Reduced motion disables automatic cover opening.

## Project notes

- [Architecture](docs/ARCHITECTURE.md)
- [Storyboard](docs/STORYBOARD.md)
- [Asset record](docs/ASSET-LICENSES.md)
- [QA report and verification limits](docs/QA.md)
