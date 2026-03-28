# 0harness — Autonomous Build Loop Template

A template for autonomously building iOS apps and games using Claude Code. Each run of `loop.sh` (a **batch**) executes N **iterations**, where each iteration is a fresh Claude session that picks up one task, writes tests, implements it, verifies the build, and commits.

## Quick Start

### 1. Create your project repo on GitHub

Create a new repo through the GitHub UI (or `gh repo create`).

### 2. Clone and copy the template

```bash
cd ~/dev
git clone <your-new-repo-url> MyNewGame
cp -r 0harness/* MyNewGame/
cp -r 0harness/.claude MyNewGame/
cd MyNewGame
```

### 3. Run the init script

```bash
chmod +x harness-init.sh
./harness-init.sh
```

The script will ask for:
- **Project name** — used for the Xcode scheme and project file references
- **Xcode scheme** — defaults to `"<ProjectName> iOS"`
- **Simulator destination** — defaults to `iPhone 15 Pro,OS=17.5`
- **GitHub remote URL** — optional, sets up `origin`

It will:
- Initialize a local git repo (if needed)
- Configure the remote
- Fill in `project.config.md` with your settings
- Make `loop.sh` executable

### 4. Set up your Xcode project

Create your Xcode project in the same directory. Make sure the `.xcodeproj` name matches what you entered in the init script. Set up a test target — the loop runs tests every iteration.

### 5. Fill in the project files

- **`CLAUDE.md`** — Fill in Section 2 (Project Brief) with your app's overview, features, and constraints. Section 1 (harness) is pre-filled.
- **`IDEAS.md`** — Add your feature ideas and dreams.
- **`implementation-plan.md`** — Create your ordered task list. The loop works top-down.

### 6. Run the loop

```bash
./loop.sh 5   # Run 5 iterations
./loop.sh     # Run 1 iteration (default)
```

### 7. Stop early (optional)

Create a STOP file in the project root:
```bash
touch STOP
```
The loop checks for this before each iteration and halts gracefully. Remove it when ready to resume:
```bash
rm STOP
```

## Viewing the Dashboard

The dashboard is a single HTML file that reads your loop data. Serve it locally:

```bash
python3 -m http.server 8080
```

Then open [http://localhost:8080/dashboard.html](http://localhost:8080/dashboard.html).

The dashboard shows:
- **Batches** — each run of `loop.sh` with start/end times and iteration counts
- **Iterations** — click into any batch to see its iterations, click an iteration for full detail
- **Tie-offs** — tasks that failed 3 consecutive times and were abandoned
- **Implementation Plan** — current state of the work queue
- **Ideas** — the dream board

## How It Works

### Terminology
- **Batch**: One run of `loop.sh`. Has a start time, end time, and N iterations.
- **Iteration**: One Claude session performing one task.

### Iteration Flow

Each iteration follows these steps:

1. **Pre-flight** — Check for STOP file and unclosed iterations (circuit breaker)
2. **Orient** — Read project docs (CLAUDE.md, ARCHITECTURE.md, LOOKUP.md, implementation plan, last log)
3. **Claim task** — Take the top unchecked item from the plan. If the previous iteration failed, retry that task. After 3 consecutive failures, tie off and move on.
4. **Validate size** — If the task is too big, decompose it into sub-items
5. **Write tests** (TDD) — Write unit tests first; they should fail
6. **Implement** — Write code to make tests pass
7. **Build** — Run `xcodebuild` to verify compilation
8. **Run tests** — Run test suite; one fix attempt on failure, then revert
9. **Update docs** — LOOKUP.md, ARCHITECTURE.md, implementation plan, IDEAS.md
10. **Commit** — Stage and commit (never pushes)
11. **Log** — Write detailed iteration log, close the looplog entry, tag the commit

### Failure Handling

- **Build failure**: One fix attempt. If still broken, revert all changes, log as failed, stop.
- **Test failure**: One fix attempt. If still broken, revert all changes, log as failed, stop.
- **Consecutive failures**: If the same task fails 3 iterations in a row, it's marked `⛔ ABANDONED` and the loop moves to the next task.
- **Crash (no close entry)**: The next iteration detects the unclosed `🟡 STARTED` and circuit-breaks. You investigate manually.

## File Reference

| File | Purpose |
|------|---------|
| `loop.sh` | Runs N iterations with 1-min cooldown between each |
| `loopprompt.md` | Instruction set for each iteration (Claude reads this) |
| `project.config.md` | Build/test commands, simulator settings, project-specific notes |
| `CLAUDE.md` | Project brief (you fill in) + harness docs (pre-filled) |
| `ARCHITECTURE.md` | Technical architecture (grows with the project) |
| `LOOKUP.md` | File/feature index (iterations populate this) |
| `implementation-plan.md` | Ordered work queue |
| `IDEAS.md` | Feature ideas and dreams |
| `looplog.md` | Batch bookends + iteration start/finish markers |
| `looplog/` | Detailed per-iteration logs (`looplog-N.md`) |
| `.claude/settings.local.json` | Pre-configured permissions for autonomous mode |
| `dashboard.html` | Browser-based run viewer |
| `harness-init.sh` | One-time setup script |

## Tips

- **Review before pushing**: The loop never pushes to remote. Review the commits and `git push` when satisfied.
- **Use STOP to pause**: If you want to intervene mid-batch, `touch STOP` and the loop halts cleanly before the next iteration.
- **Keep ideas flowing**: Add to `IDEAS.md` anytime. The loop pulls from it when the plan runs dry.
- **Watch for NEEDS HUMAN tags**: New Swift files need to be added to Xcode manually. Check `implementation-plan.md` for `⏳ NEEDS HUMAN` items after each batch.
- **Dashboard after each batch**: Run `python3 -m http.server 8080` and check the dashboard to review what happened.
