# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2024-05-23

### Added
- **Opponent Status Tracker:** Added a real-time progress tracker that shows when each AI opponent has completed their turn.
- **Action Space Visualization:** Integrated Cytoscape.js to create a dynamic graph in the event log, visualizing each player's available and chosen actions for the round.

### Changed
- **Increased Timer:** Round timer increased from 2 minutes to 5 minutes.
- **Flashing Timer:** The timer now flashes during the last 30 seconds to create urgency.
- **Hid AI Personal Scores:** In the event log, the specific numerical personal score change for AI players is now hidden to increase strategic ambiguity. The justification for the change is still shown.

### Fixed
- Re-keyed `ActionSelection` component to ensure state resets properly each round.

## [0.3.0] - 2024-05-22

### Added
- **Counterfactual Analysis:** The end-of-round narrative now includes a data-driven "Counterfactual Analysis" section, explaining what would have happened if no actions were taken. This is calculated via a separate, dedicated API call.
- **Gamification animations:** Added fade-in animations for new log entries and a "pop" effect for score changes to provide more engaging visual feedback.

### Changed
- **Sophisticated AI Logic:** AI decision-making is now a two-step process. The AI first generates a set of strategic options and then separately chooses from that set, allowing for more nuanced behavior.
- **Logical Flow:** Reordered the round summary to a more coherent `Event -> Actions -> Narrative` sequence.
- **Prompt Engineering:** Updated prompts to support the new two-step AI logic and the counterfactual calculation.

## [0.2.0] - 2024-05-21

### Fixed
- Action points now correctly reset to 3 for the human player at the start of each round.

### Changed
- Improved AI Game Master narrative to explicitly justify changes in the "Democratic Legitimacy" score based on player actions.

## [0.1.1] - 2024-05-20

### Fixed
- Corrected initial game state logic to prevent the game from ending prematurely. The public score now consistently starts at 100 and the initial scenario provides a score *delta*, aligning with subsequent rounds.
- Updated AI prompt for the initial scenario to reflect the new score delta logic.

## [0.1.0] - 2024-05-19

### Added
- Initial version of the AI Election Crisis simulation game.
- Core gameplay loop: role selection, scenario generation, action phase, and consequence phase.
- UI components for displaying game state, player roles, event logs, and action selection.
- Integration with Google Gemini API for dynamic content generation.
- Debug logging for state transitions and API calls.
- `CHANGELOG.md` and `README.md`.