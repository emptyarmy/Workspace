---
- Version: 1
- Date: 2026-06-20
- Author: Set Up Your Mac
- Depends on: 1-research/2026-06-20-example-note.md
---

# EDR-001: Use Python for the example feature

**Status:** accepted

An EDR (Engineering Decision Record — also called an ADR) captures a choice and *why*, so it isn't relitigated later. Keep them short.

## Decision

Write the hello-world example (SPEC-001) in Python.

## Why

Python is installed via `uv`, is beginner-friendly, and is the most universally readable language for a first example. (Evidence: `1-research/2026-06-20-example-note.md`.)

## Alternatives considered

- Node / Ruby / Java / Rust — all supported. Use the `rewrite-in-language` skill to port the example to any of them.

## Consequences

The example ships in Python; moving to another language is a one-skill step.
