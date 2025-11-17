# Repository Guidelines

## Project Structure & Module Organization
All Angular source lives in `src/app`, grouped by feature under `features/{forms,flow,run}` with standalone components. Shared contracts belong in `src/app/shared/models`, while cross-cutting providers and routes are wired via `src/app/app.config.ts` and `src/app/app.routes.ts`. Keep component HTML/SCSS beside their `.ts` files, store global styles in `src/styles.scss`, and place static assets under `public/`. Specs pair with their subjects (`component.spec.ts`), and any playground or builder-specific code should sit within `projects/`. Update `angular.json` or the appropriate `tsconfig*.json` whenever you introduce aliases, stricter compilation flags, or custom builders.

## Build, Test & Development Commands
- `npm install` — installs Angular CLI, Material, and internal control dependencies.
- `npm start` — runs `ng serve` with hot reload at the default dev port.
- `npm run watch` — performs incremental rebuilds for quick iteration.
- `npm run build` — compiles the production bundle via `ng build`.
- `npm test` — executes Karma/Jasmine in Chrome; keep it open while fixing specs.

## Coding Style & Naming Conventions
Author TypeScript with 2-space indentation, Angular imports before third-party, and local imports last. Name files by feature plus artifact (`forms-overview.component.ts`, `run-queue.service.ts`), and prefix SCSS classes with the component name to avoid collisions. Prefer standalone components, rely on `ng g component FeatureName` for scaffolding, and push business rules into services. Use `const` for configuration objects and document tricky flows with short comments only when indispensable.

## Testing Guidelines
Place Jasmine specs beside their targets and follow the `describe/it` vocabulary to cover success and failure paths, emitted events, and translated text. Mock HTTP or translation dependencies to keep tests deterministic. Run `npm test` for watch mode, or `ng test --watch=false` before CI, ensuring regressions are fixed prior to merging. Aim to touch meaningful user flows so coverage remains stable.

## Commit & Pull Request Guidelines
Commits use concise Portuguese imperatives (e.g., `Ajusta validações do formulário`) and focus on one concern; reference tickets in the footer when relevant. Pull requests should summarize the problem, highlight key changes, list manual validation steps (`npm test`, browsers checked), and attach screenshots or screen captures for UI updates. Confirm CI build/test jobs pass and tag the feature owner for review.

## Security & Configuration Tips
Never commit secrets or `.env` values; rely on environment-specific configuration files ignored by git. Validate that new modules update `angular.json` and relevant `tsconfig*.json` so isolated builds (`ng build --configuration=production`) succeed. Treat `public/` as read-only for runtime data—dynamic values should flow through services guarded by Angular interceptors.
