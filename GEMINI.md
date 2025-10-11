# GEMINI.md

This document provides a comprehensive overview of the "Crisis Command" project for the Gemini AI agent.

## Project Overview

This is a web-based, single-player crisis simulation game where the user assumes a role in an AI-powered election misinformation crisis. The game is a Tabletop Exercise (TTX) designed to test strategic thinking. The Google Gemini API acts as the Game Master, dynamically generating scenarios, consequences, and AI opponents.

The frontend is built with **React** and **TypeScript**, using **Vite** for bundling. The UI is styled with **Tailwind CSS**. State is currently managed with React hooks, but there is a plan to migrate to **Zustand**. The game uses **Cytoscape.js** to visualize the action space.

The core game logic resides on the client-side. The `geminiService.ts` communicates with the Gemini API (via a LiteLLM proxy) to drive the narrative and game mechanics. The `prompts.ts` file contains the detailed instructions for the AI model.

A detailed plan exists in `DESIGN.md` to refactor this into a multiplayer application with a **FastAPI** backend.

## Building and Running

The project is a standard Node.js application.

*   **Install dependencies:**
    ```bash
    npm install
    ```
*   **Run the development server:**
    ```bash
    npm run dev
    ```
*   **Build for production:**
    ```bash
    npm run build
    ```
*   **Preview the production build:**
    ```bash
    npm run preview
    ```

### Environment Variables

The application requires the following environment variables (defined in `.env` and loaded by Vite):

*   `VITE_LITELLM_BASE_URL`: The base URL for the LiteLLM proxy.
*   `VITE_LITELLM_API_KEY`: The API key for the LiteLLM proxy.
*   `VITE_LLM_MODEL`: The specific Gemini model to use (e.g., `gemini-1.5-flash`).

## Development Conventions

*   **Code Style:** The project uses TypeScript with strict settings. Code is organized into `components`, `services`, and `types`.
*   **State Management:** The current implementation uses React hooks (`useState`, `useEffect`). The `README.md` and `DESIGN.md` outline a future migration to Zustand.
*   **AI Interaction:** All prompts for the Gemini API are centralized in `prompts.ts`. The `geminiService.ts` file handles all API calls. `zod` is used to define schemas and validate the AI's JSON responses.
*   **Game Logic:** The main game loop is in `App.tsx`. The game progresses through phases (`LOBBY`, `STARTING`, `ACTION`, `CONSEQUENCE`, `END`).
*   **Git Workflow:** Before committing, run the `./git-push.sh` script to ensure a clean `package-lock.json` and a reproducible build.

## Key Files

*   `App.tsx`: The main React component, containing the core game state and logic.
*   `prompts.ts`: Contains all prompts sent to the Gemini API. This is the heart of the AI's behavior.
*   `geminiService.ts`: The service that communicates with the Gemini API via a LiteLLM proxy.
*   `types.ts`: Defines all the data structures and types for the application.
*   `constants.tsx`: Defines game constants, such as player roles and game configuration.
*   `DESIGN.md`: Outlines the future architecture for a multiplayer version of the game.
*   `README.md`: Provides a high-level overview of the project.
*   `package.json`: Defines project scripts and dependencies.

## Current Progress (As of Oct 10, 2025)

Implemented the **Dynamic Scenario Generation** feature. This major update allows users to move beyond the single, hardcoded "Crisis Command" default scenario and create their own unique crisis simulations.

### Key Changes:

*   **Dual Game Paths:** The UI now presents a choice between "Play Classic Scenario" and "Create Custom Scenario".
*   **Custom Scenario Input:** A new screen was added to allow users to write a description of a crisis they want to simulate.
*   **AI-Powered Game Setup:** A new service function (`generateCustomScenario`) and a corresponding AI prompt were created. These take the user's input and generate a complete `GameSetup` object, including a scenario title, description, a thematic `coreMetric` (e.g., "Public Trust", "Ecological Integrity"), and a list of 4-6 relevant stakeholder roles with unique objectives.
*   **Dynamic UI:** The application was refactored to handle the dynamic data. The lobby now displays the generated scenario and roles, and the in-game UI (like the status panel) displays the dynamic core metric.
*   **Code Refactoring:** 
    *   The core `GameState` was updated to use a generic `coreMetric` object instead of a hardcoded `publicScore`.
    *   Type definitions were generalized to support dynamic string-based role names instead of a fixed enum.
    *   A fallback `BeakerIcon` was added to gracefully handle roles that don't have a pre-defined icon.
*   **Bug Fixes:**
    *   Resolved a critical bug where the core metric would display as `NaN%` by strengthening the AI prompt to require an integer and adding defensive validation to the application code.
    *   Fixed numerous build errors related to type mismatches and syntax errors introduced during the refactoring process.

## Next Steps

1.  **Generalize In-Game AI Prompts:** The prompts that generate the story, consequences, and action options during the game (`getConsequencesPromptAndSchema`, `getActionOptionsPromptAndSchema`) are still tailored to the original "Crisis Command" default narrative. They need to be updated to be more generic, incorporating the dynamically generated `scenarioTitle` and `coreMetric` to ensure the AI's responses are thematically consistent with the user's custom scenario.
2.  **UI/UX Polish:** The custom scenario flow is functional but could be improved. This could include adding more distinct loading states during scenario generation and providing the user with more feedback.
3.  **Zustand State Management:** As outlined in the initial project plan, migrating the React hook-based state management to Zustand would be a valuable next step to simplify state logic, especially as the application's complexity grows.
