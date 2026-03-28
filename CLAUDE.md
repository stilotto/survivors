# Project Instructions

> This file has two sections. Keep them separate — do not mix harness concerns with project concerns.

---

## Section 1: Autonomous Loop Harness

> This section is universal across all projects using the 0harness template. Do not modify unless updating the harness itself.

### How the Loop Works
This project uses an autonomous build loop (`loop.sh` + `loopprompt.md`). Each run of `loop.sh` is a **batch**. Each batch contains N **iterations**, where each iteration is a fresh Claude session that picks up one task and completes it.

- **`loopprompt.md`** — instruction set for each iteration (do not act on it unless the loop is running)
- **`project.config.md`** — build/test commands and project-specific settings
- **`implementation-plan.md`** — ordered work queue
- **`IDEAS.md`** — dream board; items checked off when coded
- **`looplog.md`** — batch bookends + iteration start/finish markers; details in `looplog/looplog-<N>.md`

### Terminology
- **Batch**: One run of `loop.sh`. Has a start time, end time, and iteration count.
- **Iteration**: One Claude session performing one task. Has a start time, end time, and summary.

### Code Philosophy
- **Atomic files**: each file owns one focused area of responsibility — see LOOKUP.md
- **No bloat**: if a file exceeds ~200 lines, split it
- **New feature = new file**: don't bolt onto existing scenes/controllers; create a dedicated file and register it in LOOKUP.md
- **Constants stay centralized**: no magic numbers scattered in source files
- **TDD**: write tests first, then implement, then verify
- **LOOKUP.md is mandatory**: every new file must be registered

### Development Workflow
- **Batch changes**: slow build machine — sweep changes, test infrequently
- **Simulator only**: test via Xcode simulator
- **New Swift files**: must be added to Xcode project manually via "Add Files" dialog
- **Git**: pushes from Claude Code directly (keychain configured)

### Documentation Separation
When writing to memory files, ARCHITECTURE.md, LOOKUP.md, or any documentation:
- Harness mechanics (iteration flow, logging, circuit breakers) stay in harness docs
- Project/app details (features, game mechanics, UI, architecture) stay in project docs
- Never mix the two in the same section or memory entry

---

## Section 2: Project Brief

> Fill this section in for your specific app/game. Everything below is a template.

### Overview
<!-- What is this app? One paragraph. -->

### Core Features
<!-- Bullet list of the main features/mechanics -->

### Visual Design
<!-- Art style, color palette, general aesthetic -->

### Technical Constraints
<!-- Xcode version, deployment target, device limitations, etc. -->

### Implementation Phases
<!-- High-level roadmap. Details go in implementation-plan.md -->

#### Phase 1: Core Loop
<!-- Minimum viable product -->

#### Phase 2: Polish
<!-- Visual/audio/UX improvements -->

#### Phase 3: Progression
<!-- Meta-game, unlocks, difficulty scaling -->

### App-Specific Code Philosophy
<!-- Any project-specific conventions beyond the harness defaults -->
