# SkiTrackerGPX Copilot Instructions

## Project Context

SkiTrackerGPX is a React-based Single Page Application (SPA) for analyzing ski tracks from GPX files. It processes data entirely client-side, utilizing Vite for bundling and Tailwind CSS for a modern, dark-themed UI.

## Architecture & Code Structure

- **Single-File Component Architecture**: The core application logic, custom UI components ("Atoms"), and business logic are centralized in `src/App.jsx`.
  - Do not split files unless explicitly requested.
  - Maintain the existing structure where components and helper functions are defined before the main `App` component.
- **Entry Point**: `src/main.jsx` handles the React root mounting.

## Key Patterns

### UI Components (Atoms)

- **Definition**: Components like `Button`, `Card`, and `Badge` are defined locally within `src/App.jsx`.
- **Pattern**: Use a `variants` object to map prop values (like `variant="primary"`) to Tailwind class strings.
- **Iconography**: Use `lucide-react` for icons. Pass icons as components (e.g., `icon={Activity}`).

### Data Processing (Business Logic)

- **GPX Parsing**: `parseGPXRaw` uses the browser's `DOMParser` to extract `lat`, `lon`, `ele`, and `time` from GPX XML.
- **Track Analysis**: `analyzeTrack` is the core function for deriving statistics (speed, distance) and detecting segments (ascent/descent).
- **Math**: Use `calculateDistanceHaversine` for distance calculations between coordinates.

### Styling

- **Tailwind CSS**: Used exclusively for styling.
- **Theme**: Dark mode default (`zinc-900` backgrounds), with gradient accents (`orange-300` to `rose-400`).
- **Class Management**: Classes are generally constructed using template literals or defined in constant objects within components.

## Development Workflow

- **Run**: `npm run dev` starts the Vite development server.
- **Build**: `npm run build` generates the production bundle.
- **Lint**: `npm run lint` checks for code quality issues.

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **Utils**: `clsx` and `tailwind-merge` are available in dependencies (use them if class logic becomes complex).
