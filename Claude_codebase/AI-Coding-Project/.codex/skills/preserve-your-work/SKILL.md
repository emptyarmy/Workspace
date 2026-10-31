---
name: preserve-your-work
description: Save the session's progress so the next session can continue — update CHANGELOG.md and write a work-ledger handoff note. Use when finishing a chunk of work, wrapping up, or when the user says "preserve our work" / "checkpoint this".
---

# Preserve your work

**Why this exists:** you don't remember past sessions, and your context fills up within a long one. The next session knows only what's written in this folder. So before you stop, save what you did and what's next — that written trail is the project's memory.

Steps:

1. **Check today's date** with `date` first — a conversation can run past midnight, so don't reuse a date from earlier in it.
2. **CHANGELOG.md** — add a dated bullet (newest first): one to three sentences on what changed and in which files, referencing the spec. The reasoning goes in the ledger entry, not here.
3. **work-ledger** — in `0-project-management/work-ledger/`, add a dated entry `YYYY-MM-DD-<short-slug>.md` (with frontmatter) capturing: **what** you did, **why** (decisions made and paths rejected — the reasoning that isn't obvious from the files), and **what's next**. Then add a one-line link to it from `0-project-management/work-ledger/index.md`.
4. If the project uses git, offer to commit the changes. Stage files by name (`git add <file>`), never `git add -A`. **Never commit secrets** (`.env` is git-ignored).

Write a ledger entry for a *meaningful chunk* of work, not every tiny edit — its job is handoff. A future session, or a different assistant, should be able to read it and continue cold.
