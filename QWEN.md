# Project Context for Qwen Code

## Overview
This project is an Angular application named "Forms Workflow". It's designed to manage form workflows, likely involving dynamic form creation, validation, and submission processes.

## Key Technologies & Tools
- **Framework**: Angular (TypeScript)
- **Build Tool**: Angular CLI
- **Package Manager**: npm
- **UI Framework**: Angular Material
- **Icons**: FontAwesome
- **Styling**: Likely CSS or SCSS (check `angular.json` for style settings)
- **Testing**: Karma/Jasmine (standard Angular setup)
- **Linting**: ESLint (likely configured, check `.eslintrc.json` if present)

## Project Structure (Key Folders & Files)
- `src/`: Main source code directory.
- `src/app/`: Core application components, modules, and services.
- `src/assets/`: Static assets like images, icons.
- `src/environments/`: Environment-specific configuration files.
- `angular.json`: Angular workspace configuration.
- `package.json`: Lists dependencies and scripts.
- `tsconfig.json`: TypeScript compiler options.

## Common Commands
- `ng serve`: Starts the development server.
- `ng build`: Builds the project.
- `ng test`: Runs unit tests.
- `ng lint`: Lints the codebase.
- `ng generate component <name>`: Generates a new component.

## Development Notes
- Always run `npm install` after pulling changes to ensure dependencies are up-to-date.
- Use `ng generate` for creating new components, services, etc., to maintain consistency.
- Follow Angular style guide for coding practices.
- Ensure all new features are covered by unit tests.
- Adhere to best UX/UI practices for a high-quality user experience.

## Specific Areas of Interest
- Dynamic form handling (likely in `src/app`).
- Workflow logic (services or specific modules).
- State management (if used, e.g., NgRx, Services).

## Assumptions
- The project follows a standard Angular CLI structure.
- Routing is handled by Angular Router.
- HTTP requests are managed by Angular's HttpClient.