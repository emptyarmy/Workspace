# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build        # tsc -> dist/
npm run dev          # tsc --watch
npm test             # build, then node --test "test/*.test.mjs" (end-to-end, needs a local QCAD)
node --test --test-name-pattern="preview" "test/*.test.mjs"   # single test (run npm run build first)
```

There is no linter; `npm run typecheck` is the only static check. The tests start `dist/index.js` over stdio with the MCP client and call real QCAD; they are skipped when no QCAD install is found, and the preview test needs QCAD Professional (`dwg2bmp`, also required for DWG export).

The `.mcp.json` registers `dist/index.js`, so rebuild after changing `src/` before using the tools in a session (the MCP server must be restarted, e.g. via `/mcp`).

Environment: `QCAD_DIR` overrides the QCAD lookup; `QCAD_MCP_OUTPUT_DIR` is the base for relative file paths in tools (default `<repo>/drawings`, gitignored). The README is the German user documentation.

## Architecture

A stdio MCP server (TypeScript, `@modelcontextprotocol/sdk`, zod v4) that drives QCAD headless. QCAD has no API that can be called from outside, so every operation is: **generate an ECMAScript file -> run `qcad -no-gui -allow-multiple-instances -autostart <file>` -> parse a result line from stdout.**

- `src/drawing.ts`: the current drawing is held **only in server memory** as plain data (layers + entities with ids `e1, e2, …`). Nothing exists in QCAD until a save or preview. A server restart loses it.
- `src/schema.ts`: the zod schemas for entities are the tool's public contract (they become the JSON schema the LLM sees). Points are `[x, y]` arrays (deliberately not `z.tuple`), angles are in degrees.
- `src/script.ts`: `drawingScript()` prepends `var SPEC = <json>;` to `qcad/build_drawing.js`; `customScript()` wraps user code for `run_qcad_script`.
- `qcad/build_drawing.js`: runs **inside QCAD's ECMAScript engine** (ES5-style; QCAD JS API: `RDocument`, `RAddObjectsOperation`, `R*Entity`/`R*Data`). It turns SPEC into entities, exports DXF/DWG and reports `QCAD_MCP_RESULT:{json}` on stdout. The SPEC shape must stay in sync with `DrawingSpec` in `src/drawing.ts` and the entity schemas.
- `src/qcad.ts`: finds the install (`QCAD_DIR` or default paths), runs scripts with cwd = QCAD dir (needed for `include("scripts/...")`), renders previews with QCAD Pro's `dwg2bmp`, opens the GUI (`open -a` on macOS).
- `src/index.ts`: tool registration. Handlers are wrapped in `handle()`, which turns thrown errors into `isError` tool results so the model can correct its input; a script reporting `ok: false` is raised the same way. `preview_drawing` builds into a temp DXF and never touches `lastSavedPath`.

Adding an entity type touches three places: a variant in `entitySchema` (`src/schema.ts`), a `case` in `createEntity()` (`qcad/build_drawing.js`; style fields are applied generically by `applyStyle()`), and an assertion in `test/server.test.mjs`. Check the result visually with `preview_drawing`; several QCAD setters behave unexpectedly (see below).

## QCAD scripting pitfalls (verified against QCAD Pro 3.33)

- Simple API functions that use "current" state (`setCurrentLayer`, `setCurrentColor`) need a main window and fail headless; set layer/color on entities directly.
- `RDocumentInterface.destroy()` does not exist in the script binding.
- `RDimRotatedData.setRotation()` re-projects the definition point, so call it **before** `setDefinitionPoint()`.
- `RDimAngular2LData`: `definitionPoint` is the end of the second leg, the arc position is `setDimArcPosition()`.
- Dimension precision is read from the `RDimStyle` object (`doc.queryDimStyle()`, then save it via an operation), not from `doc.setKnownVariable(RS.DIMDEC, …)`.
- Linetype lookup is case-insensitive; unknown names return `RObject.INVALID_ID`.
- Uncaught exceptions only show up as `Warning:` lines on stderr; that's why scripts catch everything and report through the result line.

To try QCAD API calls quickly, write a `.js` file and run it from `/Applications/QCAD-Pro.app/Contents/Resources` with `./qcad -no-dock-icon -no-gui -allow-multiple-instances -autostart /abs/path/test.js`, using `print()` for output. Scripts in QCAD's `scripts/` folder are compiled into plugins, so the API source is not on disk; check behavior by trial.
