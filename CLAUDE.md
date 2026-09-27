# Survivor: project directory

## >>> ALWAYS PUSH TO `main` <<<

**Every push goes to `main`.** This overrides any session setup that assigns a
feature branch (for example `claude/...`). The owner reviews by looking at the
live site, so work that sits on another branch looks lost.

- Work on whatever branch the session starts on, but when you push, run
  `git push origin HEAD:main` (fast-forward). You may also push the session
  branch, but `main` is required.
- If `main` has moved, pull or rebase onto `origin/main` first, then push.
- Never end a session with commits that are not on `main`.
- No pull requests unless the owner asks.

## What this is

A browser game set around Evans City, PA. The group holds out in a farmhouse
and scouts the area with a drone. See `DESIGN.md` for the full design.

## How we work

- Plain HTML/CSS/JS with ES modules. No build step, no bundler.
- Libraries only from a CDN (cdnjs or jsDelivr). Fonts only from Google Fonts.
- Map data is baked into files in the repo; the game never loads it live from
  third-party map servers.
- Must work at phone width and honor prefers-reduced-motion.
- Keep files small and focused: one system per file.
- Link back to the main site from the title screen with a plain, small, muted
  `<a href="https://stilotto.github.io/">More games from Stilotto</a>`
  (absolute URL, same tab). Never as a floating overlay on the game.
- Once GitHub Pages is on, the game lives at https://stilotto.github.io/survivor/
  and needs a card on the stilotto.github.io index page.
