---
- Version: 1
- Date: 2026-06-20
- Author: Set Up Your Mac
- Depends on: 3-specifications/SPEC-001-hello.md
---

# PB-002: Run the example

This playbook is a procedure you repeat, which operations teams call a runbook. (Most playbooks are a one-time plan and task list for building a spec — see `PB-001`.) This one runs the hello example.

1. Open a terminal in this folder.
2. Run: `uv run source/hello.py`
3. If your terminal says `command not found: uv`, uv isn't installed yet. Run Set Up Your Mac again and tick Python on the Languages screen.
4. You should see: `Hello from your AI-Coding-Project!`

To run it in another language, see the `rewrite-in-language` skill — or just ask your assistant.
