---
name: new-decision
description: Record a short decision (EDR/ADR) in 2-decisions/, numbered in sequence. Use when the user makes or asks to record a meaningful choice — a library, an approach, a trade-off.
---

# Record a decision

When a real choice is being made:

1. Find the highest `EDR-NNN-*.md` in `2-decisions/` and use the next number.
2. Create `2-decisions/EDR-<NNN>-<short-kebab-title>.md` with the frontmatter block, then: the **Decision**, **Why**, **Alternatives considered**, and **Consequences**.
3. Set Status to `accepted` (or `proposed` if not yet agreed). Link any research it rests on (`1-research/…`).

Keep it short — a decision record is a paragraph, not an essay. Its value is capturing *why*, so the choice isn't relitigated later.
