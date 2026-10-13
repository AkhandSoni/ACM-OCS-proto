# Repository Guidelines

## Project Structure & Module Organization

This repository is a single-page sketchbook built with TypeScript, Three.js, and Vite. `src/main.ts` contains the scene setup, page-turn interactions, and application form behavior; `src/style.css` contains the interface styling. `index.html` is Vite's entry document, and `public/` is for static files served as-is. TypeScript settings live in `tsconfig.json`. There is no dedicated test directory or test suite at present.

## Build, Test, and Development Commands

Run these commands from the repository root:

- `npm install` installs the dependencies in `package.json`.
- `npm run dev` starts the Vite development server, listening on all interfaces.
- `npm run build` runs the TypeScript compiler and creates the production bundle in `dist/`.
- `npm run preview` serves the built bundle locally for a production-style preview; run `npm run build` first.

No test or lint script is currently defined. For changes to rendering or interactions, use the development server and check the affected behavior in a browser.

## Coding Style & Naming Conventions

Use TypeScript for application logic and keep browser-facing behavior in `src/main.ts`; put visual rules in `src/style.css`. Follow the existing two-space indentation, semicolon-terminated statements, and single-quoted TypeScript strings. Use `camelCase` for variables and functions, `PascalCase` for types, and descriptive lowercase names for CSS classes. Keep dependencies minimal and do not add generated build output to source directories.

## Testing Guidelines

There is no automated test framework or coverage requirement. Before submitting, run `npm run build` to catch TypeScript and bundling errors. Manually check page turning in both directions, index navigation, form draft saving/export, and responsive layout when a change affects those areas.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout, so no repository-specific commit convention can be confirmed. Write concise commit subjects that describe the change, such as `Fix reverse page turning`. Pull requests should explain the user-visible change, list verification steps and results, link any related issue, and include screenshots or a short recording for visual changes.

## Security & Configuration Tips

Application drafts are stored in browser `localStorage` and can be exported as JSON; there is no server-side submission endpoint. Do not commit secrets, personal application data, or local environment files. Review third-party asset licenses before adding assets to `public/`.
