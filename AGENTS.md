# Repository Guidelines

## Project Structure & Module Organization
Source code lives under `src/app`, with standalone Angular features grouped in `src/app/features/{forms,flow,run}`. Keep reusable contracts in `src/app/shared/models`, and wire new routes or providers via `src/app/app.routes.ts` and `src/app/app.config.ts`. Place templates and SCSS beside their components, global styles in `src/styles.scss`, and static assets in `public/`. Update `angular.json` plus the relevant `tsconfig*.json` when introducing aliases, custom builders, or stricter compilation options.

## Build, Test & Development Commands
- `npm install`: Sync Angular CLI, Material modules, and shared control packages.
- `npm start`: Run `ng serve` with hot reload for local development.
- `npm run build`: Produce the production bundle (`ng build`) used by CI and releases.
- `npm run watch`: Rebuild continuously in development mode for rapid iteration.
- `npm test`: Launch Karma/Jasmine in Chrome; leave it open while iterating on specs.

## Coding Style & Naming Conventions
Author TypeScript with 2-space indentation and Angular standalone components. Name files by feature and artifact (`forms-overview.component.ts`, `run-queue.service.ts`), and prefix SCSS classes with the component name to avoid collisions. Order imports Angular → third-party → local, prefer `const` for configuration, and rely on Angular CLI generators (`ng g component FeatureName`) to scaffold compliant boilerplate. Keep templates declarative, push business rules into services, and document tricky flows with brief inline comments when necessary.

## Testing Guidelines
Unit and integration specs sit beside their targets as `*.spec.ts`. Use Jasmine’s `describe/it` vocabulary to cover success and failure paths, asserting both emitted events and translated text. Karma runs in watch mode by default, so fix failing specs before committing. When adding workflows, provide mock services for HTTP or translation dependencies to keep tests deterministic. Re-run `npm test` (or `ng test --watch=false` before CI) to verify coverage hasn’t regressed.

## Commit & Pull Request Guidelines
Commits follow concise Portuguese imperatives (`Ajusta validações do formulário`) and focus on a single concern. Reference tickets in the footer when applicable and avoid bundling unrelated refactors. Pull requests should outline the problem, highlight key changes, describe manual validation (commands run, browsers checked), and attach screenshots or clips for any UI touch. Ensure CI build/test jobs pass before requesting review and tag the feature owner for final approval.
