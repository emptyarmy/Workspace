---
- Version: 1
- Date: 2026-06-20
- Author: Set Up Your Mac
- Depends on: 3-specifications/SPEC-001-hello.md
---

# PB-001: Implement SPEC-001 (hello)

**Status:** done

A playbook is step-by-step instructions your assistant follows. This one is a one-time handoff: it turns a spec into a plan and a task list, so a fresh session can build the feature without the conversation that wrote the spec. (A playbook can also be a procedure you repeat — see `PB-002`.)

## Read first

- `3-specifications/SPEC-001-hello.md` — what to build, and how you'll know it's done.
- `2-decisions/EDR-001-example-decision.md` — already decided: the example is in Python.

## Plan

One small file, `source/hello.py`. The greeting lives in its own function so it's easy to test or reuse; a `main()` prints it when you run the file.

## Tasks

Do one task at a time, check it, and tick its box before starting the next.

- [x] 1. Create `source/hello.py` with a `greeting()` function that returns `Hello from your AI-Coding-Project!`.
- [x] 2. Add a `main()` that prints the greeting when the file is run.
- [x] 3. Run `uv run source/hello.py` and check that the output matches the spec.
- [x] 4. Tick the spec's "Done when" boxes and set its Status to `done`.
- [x] 5. Update `CHANGELOG.md` and write a work-ledger note.

## Done when

Every task above is ticked, and so is every box in the spec's "Done when" list.
