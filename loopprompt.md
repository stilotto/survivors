# Loop Prompt — Autonomous Build Iteration

**You are running an autonomous build iteration. Execute the steps below immediately. Do not summarize this file, ask for confirmation, or wait for human input — begin Step 0 now.**

> This file is the instruction set for one iteration.
> One iteration = one task. When done, stop.

---

## Step 0: Pre-flight Checks

### Circuit breakers — check these FIRST, before doing anything else

1. **STOP file**: If a file called `STOP` exists in the project root, log "Stopped by STOP file" to `looplog.md` and **stop immediately**. Do no work.

2. **Unclosed iteration**: Read `looplog.md`. If the last entry is a `🟡 STARTED` line with no matching `🟢 FINISHED` or `🔴 FAILED` line, a previous iteration crashed mid-work. Log "Circuit break: iteration N did not close cleanly" and **stop immediately**. Do not attempt to clean up — the user will investigate.

If both checks pass, proceed.

### Orient

Read these files to understand the project:

1. `CLAUDE.md` — project brief, code philosophy, dev constraints
2. `project.config.md` — build/test commands, project-specific gotchas
3. `ARCHITECTURE.md` — technical architecture, gotchas, current state
4. `LOOKUP.md` — file/feature index (check here before searching the codebase)
5. `implementation-plan.md` — the ordered work queue (this is your task list)
6. The **most recent** file in `looplog/` — to understand what the last iteration did

Do NOT read `IDEAS.md` unless you need to pull a new item into the implementation plan.

---

## Step 1: Claim Your Task

1. Determine the iteration number: check `looplog.md` for the highest iteration number, then add 1.

2. **Write a start entry** to `looplog.md` immediately:
   ```
   🟡 STARTED iteration <N> — <date and time>
   ```
   This is the heartbeat. If you crash before finishing, the next iteration will see this unclosed entry and circuit-break.

3. **Check for failed predecessor**: Read `looplog.md`. If the previous iteration was a `🔴 FAILED`, check how many consecutive failures there have been on the same task:
   - **1-2 consecutive failures**: Your job is to fix the failing tests / build from the previous attempt. Do NOT start a new task. Read the previous iteration's looplog for the failure details.
   - **3 consecutive failures on the same task**: This task is stuck. Tie it off:
     - Mark the item in `implementation-plan.md` with `⛔ ABANDONED: <brief reason summarizing what went wrong across all attempts>`
     - Log the tie-off in your detailed log
     - Take the **next** unchecked item instead

4. If NOT retrying a failure: Open `implementation-plan.md`. Find the **top unchecked item** (`- [ ]`). This is your task. Do not skip ahead. Do not pick a different task because it looks more interesting.

5. If the top item is tagged `⏳ NEEDS HUMAN`, skip it and take the next unchecked item that is NOT blocked.

6. If there are no unchecked items (excluding `⛔ ABANDONED` and `⏳ NEEDS HUMAN`), you may pull the next logical item from `IDEAS.md` into the plan. Place it respecting dependency order.

---

## Step 2: Validate the Task is Bite-Sized

**If you cannot describe the change in one sentence, it is too big.**

A single iteration should:
- Touch **at most 2-3 files** (plus tests)
- Produce a diff **reviewable in under a minute**
- Be completable **well under 10 minutes**

If the task is too large:
1. Decompose it into sub-items in `implementation-plan.md` (indent with `  - [ ]`)
2. Take only the first sub-item
3. Note the decomposition in your log

If you discover a dependency that must be completed first:
1. Add the dependency to `implementation-plan.md` **above** the current task
2. Work on that dependency instead
3. Note the reordering in your log

---

## Step 3: Write Tests (TDD — Tests First)

Before writing any implementation code:

1. Identify or create the appropriate test file for this task
2. Write unit tests that describe the expected behavior of the feature/fix
3. The tests **should fail** at this point — you haven't written the implementation yet
4. If modifying existing functionality, update existing tests first

### Test file conventions
- Test files live alongside source files or in a dedicated test target
- One test file per feature/system, matching the source file name (e.g., `FooTests.swift` for `Foo.swift`)
- Register new test files in `LOOKUP.md`

### New test files
New `.swift` test files carry the same cost as source files:
- They must be manually added to the Xcode test target
- If you create a new test file: tag dependent items with `⏳ NEEDS HUMAN: <filename> must be added to Xcode test target`
- Note in your log that the user needs to add the file

---

## Step 4: Implement

- Check `LOOKUP.md` first to find the right files
- Read the files you need to modify before changing them
- Follow the project's code philosophy (see `CLAUDE.md`)
- Write the minimum code needed to make your tests pass

### New Swift files

You CAN create new Swift files, but they carry a cost:
- New `.swift` files must be manually added to Xcode via "Add Files to <ProjectName>..."
- The build verification step WILL FAIL if the new file references aren't in the project
- **If you create a new file**: mark ALL dependent items in `implementation-plan.md` as `⏳ NEEDS HUMAN: <filename> must be added to Xcode project`
- Note in your log that the user needs to add the file before the next iteration can build

### Permissions and blockers

If a change would require something you can't do autonomously (network access, installing packages, Xcode GUI interaction, etc.):
1. Do NOT ask for permission — there is no human present
2. Tag the item in `implementation-plan.md` with `⏳ NEEDS HUMAN: <what you need>`
3. Log it and move to the next available task

---

## Step 5: Build Verification

Run the build command from `project.config.md` to verify your changes compile.

### If the build succeeds:
Proceed to Step 6.

### If the build fails:
1. Read the error output
2. Attempt to fix the issue (if it's a simple mistake you made)
3. Re-run the build
4. If you cannot fix it after one attempt: **revert all your changes** using the revert command from `project.config.md`
5. Log the failure with the error message
6. Write a `🔴 FAILED` closing entry to `looplog.md`
7. Tag the item in `implementation-plan.md` with `⚠️ BUILD FAILED: <brief error>`
8. Stop — do not attempt another task

---

## Step 6: Run Tests

Run the test command from `project.config.md`.

### If tests pass:
Proceed to Step 7.

### If tests fail:
1. Read the test output
2. Attempt to fix the issue — adjust implementation (not tests, unless the test itself has a bug)
3. Re-run build, then re-run tests
4. If you cannot fix it after one attempt: **revert all your changes** using the revert command from `project.config.md`
5. Log the failure with the test output
6. Write a `🔴 FAILED` closing entry to `looplog.md`
7. Tag the item in `implementation-plan.md` with `⚠️ TESTS FAILED: <brief error>`
8. Stop — do not attempt another task

---

## Step 7: Update Documentation

If your change affects the project structure or technical details:

- **`LOOKUP.md`**: Add/update rows if you created or renamed files, or added features to existing files. **This is mandatory for every new file.**
- **`ARCHITECTURE.md`**: Update if you changed architecture, added systems, or made technical decisions worth documenting
- **`IDEAS.md`**: Mark items `- [x]` when their implementation is complete
- **`implementation-plan.md`**: Mark the completed item `- [x]`

---

## Step 8: Commit

Stage and commit only the files you changed. Use `git -C <project-root>` for all git commands — never `cd && git`.

1. Write the commit message to `/tmp/loop_commit_msg.txt` using the Write tool:
   ```
   <one-sentence description>

   Autonomous loop iteration <N>. See looplog/looplog-<N>.md for details.

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   ```

2. Stage and commit using `git -C`:
   ```bash
   git -C <project-root> add <specific files>
   git -C <project-root> commit -F /tmp/loop_commit_msg.txt
   ```

3. Clean up:
   ```bash
   rm /tmp/loop_commit_msg.txt
   ```

**Do NOT push to remote.** The user will review and push manually.

---

## Step 9: Log and Tag

### Write the detailed log

Create `looplog/looplog-<N>.md`:

```markdown
# Iteration <N> — <date and time>

**Task**: <which implementation-plan item was completed>
**Status**: <completed / failed / abandoned>
**Files changed**: <list>
**Tests written**: <list of test files/methods>
**What was done**: <1-3 sentences>
**Decomposed**: <yes/no — if yes, what sub-items were created>
**Blocked items noted**: <any items tagged NEEDS HUMAN, or "none">
**New files created**: <list, or "none" — if any, user must add to Xcode>
**Build result**: <pass/fail>
**Test result**: <pass/fail — number of tests run>
**Retry context**: <if this was a retry of a failed iteration, note which iteration and what was different>
**Tie-off**: <if a task was abandoned, note the task and cumulative failure reason>
**Next up**: <what the next iteration will work on per the implementation plan>
```

### Close the looplog entry

Append to `looplog.md`:
```
🟢 FINISHED iteration <N> — <date and time>
```

### Tag the commit

```bash
git -C <project-root> tag loop-iteration-<N>
```

Tag goes LAST — after log, after close entry, after commit. This way a tag always means a complete, logged iteration.

---

## Step 10: Stop

You are done. Do not pick up another task. One iteration = one task.
