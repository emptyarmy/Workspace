---
name: new-playbook
description: Write a playbook in 4-playbooks/, numbered in sequence — usually a plan and task list from an agreed spec, for a fresh session to build from; sometimes a procedure the user repeats (run, build, test, release). Use when a spec is agreed and it's time to plan the build, or when the user has a task they'll do more than once.
---

# Write a playbook

A playbook is step-by-step instructions an assistant can follow without you in the room. There are two kinds, and both go in `4-playbooks/`:

- **A plan and task list from a spec** — the usual kind. It is a one-time handoff from the spec to the session that builds it.
- **A procedure you repeat** — such as run, build, test or release. Operations teams call this a runbook.

1. Find the highest `PB-NNN-*.md` in `4-playbooks/` and use the next number.
2. Create `4-playbooks/PB-<NNN>-<short-kebab-title>.md` with the frontmatter block. In `Depends on`, name the spec it builds, if any.
3. **For a spec:** read the agreed spec and any decisions it cites. Write a short plan (the approach, and which files change), then a checklist of small tasks in order, each one you can check when it's done. End with the spec's "Done when" list. Write no code yet.
4. **For a repeated procedure:** write a numbered list of exact steps — commands to run, choices to make, and what success looks like at the end.
5. Write it so someone — or a fresh session that never saw this conversation — could follow it cold.

When a plan and task list is ready, suggest starting a fresh session to build from it, one task at a time (the `run-playbook` skill).
