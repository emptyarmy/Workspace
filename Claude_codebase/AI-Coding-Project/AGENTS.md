# Working in this project

This is **AI-Coding-Project**, a starter that practices **spec-driven development** with a real project structure (the same shape the Set Up Your Mac team uses, scaled down). Help the user keep the discipline — it's the point of this folder.

## Why the discipline matters

You have no memory of past sessions: you know only what's written in this folder (this file, the specs, decisions, playbooks, and `0-project-management/work-ledger/`) plus the current conversation. And your context can fill up on a long task, after which your quality degrades. So the **written artifacts are the project's memory** — read the relevant ones before acting, and keep them current so the next session (or a different assistant) can continue coherently.

## What this file is

`AGENTS.md` holds the guidance. Codex and the Warp agent read it directly; `CLAUDE.md` is the single line `@AGENTS.md`, which makes Claude read this same file. Put instructions here; `CLAUDE.md` only points to it.

## The loop (and the skills that guide it)

1. **Plan** (`plan`) — keep `0-project-management/overview.md` current: what, why, roadmap, status.
2. **Decide** (`new-decision`) — record real choices and *why* in `2-decisions/`.
3. **Write a spec** (`new-spec`) — a spec in `3-specifications/` before building. Don't code without an agreed spec.
4. **Write a playbook** (`new-playbook`) — usually a plan and task list from an agreed spec, handed to the session that builds it; or a procedure the user repeats (run, test, release). Both go in `4-playbooks/`.
5. **Execute a playbook** (`run-playbook`) — build from it one task at a time, code in `source/`, or run its procedure; update it if reality has drifted.
6. **Preserve your work** (`preserve-your-work`) — update `CHANGELOG.md` and write a `0-project-management/work-ledger/` handoff note when finishing a chunk.

Implement specs, nothing more; if a spec is wrong, fix the spec and confirm, then code. Explain as you go, in small steps, and define any technical term the first time you use it. Prefer the simplest thing that works; ask before installing global software or deleting files.

## The structure

- `0-project-management/` — `overview.md` + `work-ledger/` (handoff notes).
- `1-research/` — what was learned before deciding.
- `2-decisions/` — decision records (EDR/ADR).
- `3-specifications/` — one spec per feature (`SPEC-NNN-name.md`).
- `4-playbooks/` — plans and task lists, and repeated procedures (`PB-NNN-name.md`).
- `source/` — the code.
- `CHANGELOG.md` — dated log of changes.
- `.claude/skills/` — `plan`, `new-decision`, `new-spec`, `new-playbook`, `run-playbook`, `preserve-your-work`, `rewrite-in-language`.

## Conventions

- **Frontmatter:** every `.md` in the numbered folders starts with a `Version / Date / Author / Depends on` block. Maintain it — bump Version, set Date on substantive edits.
- **Secrets:** API keys go in the user's `~/.env` (loaded by the terminal) — never in code, committed files, or chat. `.gitignore` excludes `.env`.
- **Toolchain:** if `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md` has a "Development environment (Set Up Your Mac)" section, it documents the toolchain; otherwise check what is installed. The example is Python (`uv run source/hello.py`); `rewrite-in-language` ports it to Node/Ruby/Java/Rust.
- **Changelog entries:** one to three sentences on what changed and in which files; the reasoning goes in the work-ledger note.
- **Dates:** check today's date with `date` before writing one — a conversation can run past midnight.
- **Commits:** stage files by name (`git add <file>`), never `git add -A`, and never commit `.env`.

## Keeping this file useful

This file is how you remember this project between conversations, so keep it short and current:

- **When the user corrects you on something that will come up again, offer to add one line here** — the rule, not the story behind it.
- **Keep it to a page or two.** Longer material goes in its own file, with one line here saying when to read it.
- **Before stopping mid-task, offer to write a handoff note in `0-project-management/work-ledger/`** (the `preserve-your-work` skill does this).
- **Write down facts that are easy to get wrong** — a version, an account name — as a rule plus a link to where the detail lives, not the whole story, dated when you checked the real value.
