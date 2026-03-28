# Code Lookup — File & Feature Index

> Fast navigation for Claude. Check here first before searching the codebase.
> For architecture details and gotchas see ARCHITECTURE.md.

## File Registry

| File | Owns |
|------|------|
| (populated by iterations as files are created) | |

## Feature → File Map

| Feature | File | Location hint |
|---------|------|---------------|
| (populated by iterations as features are built) | | |

## Atomic File Philosophy

Each source file owns **one well-defined area of responsibility**. When adding features:
- New system → new file, not bolted onto existing files
- New constants → add to the constants file, correct section
- If a file grows beyond ~200 lines, consider splitting
- File name = the thing it does

When adding a new file, add a row to both tables above.
