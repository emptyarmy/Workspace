---
name: rewrite-in-language
description: Rewrite the hello example (source/hello.py) in another supported language — Node, Ruby, Java, or Rust. Use when the user wants the example, or the project, in a different language. Works even if that language isn't installed yet.
---

# Rewrite the example in another language

The example ships in Python (`source/hello.py`). To port it to another supported language:

1. Ask which language: **Node**, **Ruby**, **Java**, or **Rust**.
2. Check whether it's installed (run its version command; the "Development environment (Set Up Your Mac)" section of `~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`, if there is one, lists what's set up). If it isn't, offer to install it first with the right manager:
   - Node / Ruby → `mise use node@lts` / `mise use ruby@latest`
   - Java → Temurin (via Homebrew) + `JAVA_HOME`
   - Rust → `rustup`
3. Write the equivalent program under `source/` (e.g. `source/hello.js`, `source/hello.rb`, `source/Hello.java`, or a small Cargo project), keeping the **same behavior** as `3-specifications/SPEC-001-hello.md`.
4. Note the port in SPEC-001, then preserve your work (`preserve-your-work`): a CHANGELOG entry and, if it was a real chunk, a ledger note. Tell the user how to run it.

This is a translation, not a redesign — keep the new version behavior-identical to the Python one.
