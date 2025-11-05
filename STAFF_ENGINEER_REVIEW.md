# Staff Engineer Codebase Review

**Date:** November 4, 2025

## 1. Executive Summary

This document provides a staff-level engineering review of the "Crisis Command" codebase.

The project has a strong technical foundation, leveraging a modern stack (Next.js, TypeScript, Prisma, Vitest) and exhibiting good structural organization and a commitment to testing. The recent "Dynamic Scenario Generation" feature is a significant step forward.

However, the project suffers from several key strategic issues that are likely to impede velocity and increase maintenance overhead. The most critical problems are:

1.  **Outdated Documentation:** Core documents like `GEMINI.md` are out of sync with the codebase regarding the tech stack (Vite vs. Next.js) and state management (Zustand is already in use, not a future plan).
2.  **Incomplete Feature Implementation:** The core in-game AI prompts are still hardcoded for the original scenario, making the new dynamic scenario feature non-functional in practice.
3.  **Ambiguous Backend Strategy:** The project simultaneously contains Next.js API routes, a `server/` directory, and a documented plan for a separate FastAPI backend, creating confusion.

This review outlines these strengths and weaknesses and provides a prioritized action plan to address the critical issues.

## 2. Strengths

The project is well-positioned for success due to several positive factors:

*   **Modern, Performant Stack:** The choice of Next.js, TypeScript, and Tailwind CSS provides a robust foundation for building a modern web application.
*   **Clear Code Organization:** The codebase is logically structured into `components`, `services`, `hooks`, `stores`, and `app` routing, which makes it easy for developers to navigate.
*   **Strong Testing Culture:** The extensive `tests/` directory and integrated `vitest` scripts demonstrate a valuable commitment to code quality and reliability.
*   **Well-Defined AI Abstraction:** Centralizing AI prompts in `prompts.ts` and API logic in `geminiService.ts` is an excellent practice that isolates volatile parts of the system.
*   **Developer Experience (DX):** The inclusion of database scripts, pre-commit hooks, and detailed configuration files shows a mature approach to development workflow.

## 3. Areas for Strategic Improvement

The following issues should be addressed to improve maintainability, clarity, and future scalability.

### 3.1. Documentation & Codebase Drift (Critical)

*   **Problem:** The `GEMINI.md` file contains outdated information. It incorrectly identifies Vite as the primary bundler (it's Next.js) and describes a migration to Zustand as a future task, even though `zustand` is already a dependency and a `stores` directory exists.
*   **Impact:** This drift misleads new and existing developers, slows down onboarding, and erodes trust in the documentation. It creates confusion about the project's current state.
*   **Recommendation:**
    1.  Update `GEMINI.md` and any other relevant documents to accurately reflect the current architecture (Next.js, Vitest for testing, Zustand for state).
    2.  Establish a lightweight process to keep documentation in sync with major architectural changes.

### 3.2. Incomplete "Dynamic Scenario" Feature (Critical)

*   **Problem:** As noted in `GEMINI.md`, the prompts that drive the core gameplay loop (`getConsequencesPromptAndSchema`, `getActionOptionsPromptAndSchema`) are still hardcoded for the original "Crisis Command" scenario.
*   **Impact:** This renders the flagship "Create Custom Scenario" feature incomplete. Users can *create* a scenario, but they cannot *play* it as intended, which is a critical feature gap.
*   **Recommendation:** Prioritize the generalization of all in-game prompts. They must dynamically incorporate the `scenarioTitle`, `coreMetric`, and other outputs from the custom scenario generation step.

### 3.3. Ambiguous Backend & State Management Strategy (High)

*   **Problem:** The project has three potential backend strategies: Next.js API routes (in `app/api`), a `server/` directory (purpose unclear), and a plan for a FastAPI backend (`DESIGN.md`). Similarly, the state management strategy seems to be in transition between hooks and Zustand.
*   **Impact:** This ambiguity makes it unclear where new backend logic should be placed and how state should be managed. It risks creating a fragmented architecture that is difficult to maintain.
*   **Recommendation:**
    1.  **Backend:** Make a definitive decision. For the current scope, consolidating all backend logic into **Next.js API Routes** is the most pragmatic path. It leverages the existing framework, simplifies deployment, and reduces complexity. The `server/` directory should be removed if it's unused, and the FastAPI plan should be formally deprecated or clarified as a long-term vision for a separate service if needed.
    2.  **State Management:** Formally adopt **Zustand** as the primary state management solution. Create a small guide for the team on how to use it and refactor any remaining complex `useState`/`useContext` logic into the appropriate stores.

## 4. Prioritized Action Plan

1.  **P0 (Blocker):** **Update In-Game Prompts.** Generalize all AI prompts in `prompts.ts` to make the dynamic scenario feature fully functional.
2.  **P0 (Blocker):** **Update `GEMINI.md`**. Correct the architectural description to reflect the current Next.js/Vitest/Zustand stack.
3.  **P1 (High):** **Clarify Backend Strategy.** Formally decide to use Next.js API routes for all current backend logic. Remove the `server/` directory if it is unused.
4.  **P2 (Medium):** **Consolidate State Management.** Document the official adoption of Zustand and plan the migration of any remaining legacy state logic.

By addressing these points, the team can resolve key architectural ambiguities and ensure the project remains on a clear, maintainable, and scalable trajectory.
