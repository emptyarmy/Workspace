# 👋 Start here — your AI-Simple-Project

**Set Up Your Mac** made this folder so you have a place to try working with an AI assistant. You don't need to know how to code.

## 1. Open this folder with your AI assistant

- **Claude Code (terminal):** open a terminal in this folder, then run `claude`. If you kept the app's default, that's `cd ~/Documents/AI-Simple-Project`.
- **Claude Desktop:** open the **Code** tab and point it at this folder
- **Warp:** open this folder in Warp and use the agent (needs a Warp account and AI usage credits)
- **Codex:** open this folder and run `codex`

## 2. Try a prompt

Copy one of these to your assistant and see what happens:

- *"What's in this folder, and what can you help me do here?"*
- *"Tidy up notes.md into a clean summary with action items."*

## 3. The two guidance files: CLAUDE.md and AGENTS.md

You'll notice two files, `AGENTS.md` and `CLAUDE.md`. `AGENTS.md` holds the guidance for your assistant, and Codex and the Warp agent read it. `CLAUDE.md` is a single line, `@AGENTS.md`, which makes Claude (Claude Code and Claude Desktop) read the same file. So every assistant gets the same instructions from one place. To change them, edit `AGENTS.md` and leave `CLAUDE.md` as it is.

## 4. Keep going

- Edit `notes.md` (or add your own files) and ask the assistant to help.
- Anything secret (passwords, API keys) goes in your `~/.env` file, never in chat or code. This folder ignores `.env` so it can't be shared by accident.

That's it — experiment freely. You can't break anything important here.
