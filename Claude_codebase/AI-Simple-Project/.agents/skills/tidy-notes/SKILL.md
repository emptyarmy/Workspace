---
name: tidy-notes
description: Turn rough, unstructured notes into a clean summary with action items. Use when the user asks to tidy, clean up, organize, or summarize a notes file (e.g. notes.md).
---

# Tidy notes

When the user asks you to tidy, clean up, or organize a notes file:

1. Read the file they name (default to `notes.md` if they don't say which).
2. Produce a cleaned version with these sections:
   - **Summary** — one or two sentences on what the notes are about.
   - **Key points** — short bullets, grouped sensibly.
   - **Action items** — each as a task; include an owner and a due date when the notes mention one.
   - **Open questions** — anything unresolved or marked with a "?".
3. Show the cleaned version in the chat first, then ask whether to **overwrite the file** or **save it as a new file** (e.g. `notes-tidy.md`). Never overwrite without asking.

Keep the user's own voice and facts — don't invent details that aren't in the notes. If something is ambiguous, list it under Open questions rather than guessing.
