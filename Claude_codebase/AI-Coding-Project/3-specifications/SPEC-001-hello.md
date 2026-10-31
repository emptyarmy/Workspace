---
- Version: 1
- Date: 2026-06-20
- Author: Set Up Your Mac
- Depends on: 2-decisions/EDR-001-example-decision.md
---

# SPEC-001: Hello, world

**Status:** done

## Goal

A tiny program that prints a friendly greeting, so the project has one working, spec-backed feature to learn from.

## Why

To demonstrate the decide → spec → playbook → build → track loop end to end with the smallest possible feature.

## Behavior

- When run, print: `Hello from your AI-Coding-Project!`
- Keep the greeting in a small function so it's easy to test or reuse later.

## Done when (acceptance)

- [x] Running the program prints the greeting.
- [x] `CHANGELOG.md` records the change.

## Out of scope

- Greeting the user by name — that's a great SPEC-002 to try next.
- Any input, files, or network access.
