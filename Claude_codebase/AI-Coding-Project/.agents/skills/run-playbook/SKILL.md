---
name: run-playbook
description: Follow an existing playbook in 4-playbooks/ — build a spec from its task list one task at a time, or run a repeated procedure. Use when the user says "build from PB-003", "run PB-002" or "follow the playbook".
---

# Execute a playbook

When asked to follow a playbook:

1. Read the named playbook in `4-playbooks/` (ask which one if it's unclear), and the spec or decisions it depends on.
2. Work through it in order. For a task list, do one task at a time: check it, tick its box, and tell the user before starting the next. For a procedure, show the user each step and its result. Pause if a step needs a decision from them.
3. If reality differs from the playbook — a step is wrong, missing, or out of date — tell the user and offer to update the playbook so it's right next time. If the spec itself is wrong, fix the spec and confirm with the user before you code.

When a task list is finished, check the work against the spec's "Done when" list, then offer to preserve the work.
