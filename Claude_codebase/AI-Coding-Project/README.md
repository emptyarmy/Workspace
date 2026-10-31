# 👋 Start here — your AI-Coding-Project

**Set Up Your Mac** made this folder to show you a calmer, more reliable way to build software with an AI assistant: **spec-driven development** with a real project structure. Instead of "vibe coding" — asking the AI to build things with no plan until it collapses under its own mess — you keep a little structure: decide what and why before you build, write it down, and preserve it. This is the same shape the Set Up Your Mac team uses for its own work, scaled down for you to grow into.

## Why this works — the folder is the memory

Here's the thing nobody tells beginners: **an AI assistant has no memory of past sessions.** Every time you open this folder, the assistant starts fresh — it knows only what it can *read here* (this README, `CLAUDE.md` / `AGENTS.md`, your specs, decisions, playbooks, and the `work-ledger`), plus whatever you say in that session and whatever the tool keeps in its own settings. Nothing else carries over.

And even *within* one session, an assistant's working memory — its "context" — is limited. On a big task it fills up, and once it does the assistant starts to lose the thread and get careless: forgetting earlier decisions, redoing work, contradicting itself.

Writing things down is how you beat both problems. A spec before you build, a decision when you choose, a ledger note when you finish — each is context you've saved *outside* the assistant's head, in files it will re-read next time. **The folder becomes the project's memory.** That's what lets one assistant — or several, across many sessions — keep working coherently on something bigger than a single sitting. Spec-driven development isn't bureaucracy; it's how you make an AI assistant reliable on a real project.

## The loop

Six small habits. Each has a **skill** in `.claude/skills/` that guides you and your assistant through it — just ask (e.g. *"start a new spec"*), or let the assistant reach for it.

1. **Plan** — capture what you're building and why, plus a rough roadmap, in `0-project-management/`. *(skill: `plan`)*
2. **Decide** — when you make a real choice (a library, an approach), record it and why, in `2-decisions/`. *(skill: `new-decision`)*
3. **Write a spec** — before building a feature, write what it should do and how you'll know it's done, in `3-specifications/`. *(skill: `new-spec`)*
4. **Write a playbook** — turn the spec into a plan and a task list in `4-playbooks/`, with no code yet: a handoff to the session that will build it. A playbook can also hold steps you'll repeat, such as run, test or release. *(skill: `new-playbook`)*
5. **Execute a playbook** — start a fresh session and have the assistant build from the playbook one task at a time, putting the code in `source/`; or have it run a procedure you repeat. It fixes the playbook if reality has drifted. *(skill: `run-playbook`)*
6. **Preserve your work** — when you finish a chunk, update `CHANGELOG.md` and write a `work-ledger/` note so the next session can pick up cold. *(skill: `preserve-your-work`)*

This folder already contains one worked example of the loop: research note → `EDR-001` decision → `SPEC-001` spec → `PB-001` playbook (the plan and tasks) → `source/hello.py` → `CHANGELOG` + `work-ledger` entry, plus `PB-002`, a playbook you repeat to run the program. Follow the trail to see how the pieces connect.

## What's in here — the full structure

Numbered folders hold your **thinking**; `source/` holds your **code**. Keeping them apart is the point — the plan outlives any single chunk of code.

- **`0-project-management/`** — the big picture: `overview.md` (what this is, roadmap, status) and **`work-ledger/`** (handoff notes — step 6). Orientation starts here.
- **`1-research/`** — what you learned before deciding: options compared, links, trade-offs.
- **`2-decisions/`** — short records of choices and *why* (often called ADRs).
- **`3-specifications/`** — one spec per feature; `SPEC-template.md` to start, `SPEC-001-hello.md` worked example.
- **`4-playbooks/`** — step-by-step instructions for your assistant: a plan and task list to build a spec (`PB-001`), or a procedure you repeat, such as running the program (`PB-002`).
- **`source/`** — the code. `hello.py` implements SPEC-001.
- **`CHANGELOG.md`** — a dated log of changes, newest first.
- **`AGENTS.md`** — the rules for your AI assistant; **`CLAUDE.md`** points Claude to it (see below).
- **`.claude/skills/`** — the loop's helpers (above), plus `rewrite-in-language`.
- **`.gitignore`** — keeps secrets and build clutter out of version control.

Every Markdown file in the numbered folders starts with a small **frontmatter** block (Version / Date / Author / Depends on) — a habit that makes it obvious when a doc was last touched and what it builds on. Your assistant maintains it.

## CLAUDE.md and AGENTS.md

`AGENTS.md` holds the rules, and Codex and the Warp agent read it. `CLAUDE.md` is the one line `@AGENTS.md`, so Claude reads the same file. Edit `AGENTS.md` only.

## Run the example

```
uv run source/hello.py
```

If your terminal says `command not found: uv`, uv isn't installed yet. Run Set Up Your Mac again and tick Python on the Languages screen.

The example is in **Python** and runs with `uv`. Prefer another language? Ask: *"rewrite the hello example in Rust"* — the `rewrite-in-language` skill ports it to Node, Ruby, Java, or Rust, and offers to install one if you don't have it.

## Try it

1. *"Start a new spec for a program that greets me by name."* → `3-specifications/SPEC-002-….md`.
2. Read it and tweak anything until it says what you want.
3. *"Write a playbook for SPEC-002."* → `4-playbooks/PB-003-….md`, a plan and a task list, with no code yet.
4. Start a fresh session: *"Build from PB-003, one task at a time."*
5. *"Preserve our work."* → updates the changelog and writes a ledger note.

You just did spec-driven development with a real paper trail. That's the habit this folder is here to build.
