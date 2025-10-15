# Repository Guidelines

## Project Structure & Module Organization
Angular sources live in `src/app`, with feature-specific flows under `src/app/features/{forms,flow,run}` and shareable contracts in `src/app/shared/models`. Root wiring sits in `src/app/app.routes.ts` and `src/app/app.config.ts`. Global styles are centralized in `src/styles.scss`, while static assets (logos, localization files) belong in `public/`. Build and TypeScript settings are managed via `angular.json` and the `tsconfig*.json` files—mirror existing patterns when adding new modules or paths.

## Build, Test & Development Commands
- `npm install`: Install or refresh Angular CLI, Material, and shared control dependencies.
- `npm start`: Launch the dev server (`ng serve`) on the default port with HMR-ready rebuilds.
- `npm run build`: Produce an optimized production bundle via `ng build`.
- `npm run watch`: Rebuild in development mode while watching file changes.
- `npm test`: Execute Karma/Jasmine specs in Chrome; keep the watcher open when iterating.

## Coding Style & Naming Conventions
Use TypeScript with Angular standalone components and 2-space indentation. File names should follow Angular conventions (`feature-name.component.ts`, `form-runner.service.ts`) and colocate HTML/SCSS alongside their component. Prefer SCSS modules, securing class names with a component-based prefix. Keep imports ordered (Angular → library → local) and favor readonly `const` declarations for configuration. Run the Angular CLI generators (`ng g component`, `ng g service`) to scaffold compliant boilerplate when possible.

## Testing Guidelines
Jasmine/Karma tests live next to their targets using the `*.spec.ts` suffix (e.g., `forms-overview.component.spec.ts`). When adding UI or workflow logic, couple it with behavior-driven specs that assert emitted events and translated text. Aim to preserve or raise the current coverage by validating success and failure paths, and rerun `npm test` before pushing to ensure deterministic results.

## Commit & Pull Request Guidelines
Git history favors concise Portuguese summaries (`Ajuste dos ícones dos nós`, `Correção de pequenos bugs`). Write single-purpose commits in the imperative mood, referencing related tickets when available. For pull requests, include a clear problem statement, key changes, manual verification steps, and UI screenshots whenever you touch templates or styles. Request review from a teammate who owns the affected feature, and confirm CI/test results before marking ready for merge.
