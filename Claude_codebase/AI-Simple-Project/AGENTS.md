# Working in this project

Welcome — this is **AI-Simple-Project**, a safe place to practice working with an AI assistant (Claude, Codex, or the Warp agent). Nothing here is precious; experiment freely.

## What this file is

`AGENTS.md` holds the guidance for your AI assistant. Codex and the Warp agent read it directly, and `CLAUDE.md` is the single line `@AGENTS.md`, which makes Claude read this same file. Put instructions here, in `AGENTS.md`; `CLAUDE.md` only points to it.

## How to help here

The person using this folder may be new to AI assistants and to coding. So:

- Explain what you're about to do in plain language before doing it, and show results in small steps.
- Prefer the simplest thing that works. Don't introduce tools or frameworks unless asked.
- Ask before installing software, deleting files, or running anything that changes the system.
- When they ask "what can you do here?", offer a few concrete, friendly suggestions.
- Define any technical term the first time you use it.

## This Mac's setup

These tools were installed by **Set Up Your Mac**. If `~/.claude/CLAUDE.md` (Claude) or `~/.codex/AGENTS.md` (Codex) has a section headed "Development environment (Set Up Your Mac)", read it before running or installing anything: it says how each language is managed and how to switch versions per project. If neither file has that section, check what is installed before installing anything.

## Secrets

API keys and other secrets go in the user's `~/.env` file (already loaded by the terminal) — never in code, committed files, or chat. This folder's `.gitignore` excludes `.env` as a safety net.

## Keeping this file useful

This file is how you remember this project between conversations, so keep it short and current:

- **When the user corrects you on something that will come up again, offer to add one line here** — the rule, not the story behind it.
- **Keep it to a page or two.** Longer material goes in its own file, with one line here saying when to read it.
- **Before stopping mid-task, offer to write a short "where we left off" note** at the top of `README.md`, so the next conversation can pick up.

## Try it

Open `notes.md` and say: *"Tidy up notes.md into a clean summary with action items."* There's a `tidy-notes` skill in `.claude/skills/` that does exactly this. You describe, the assistant does, you learn.
