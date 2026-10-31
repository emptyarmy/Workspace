// End-to-end tests: start the built server over stdio and drive it with the MCP
// client. Requires a local QCAD installation (skipped otherwise).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { findQcad } from "../dist/qcad.js";

let qcad;
try {
  qcad = findQcad();
} catch {
  qcad = null;
}

describe("qcad-mcp", { skip: !qcad && "QCAD not installed" }, () => {
  const outDir = mkdtempSync(join(tmpdir(), "qcad-mcp-test-"));
  let client;

  const call = async (name, args = {}) => {
    const res = await client.callTool({ name, arguments: args });
    return { ...res, text: res.content.find((c) => c.type === "text")?.text };
  };

  before(async () => {
    client = new Client({ name: "test", version: "0" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: ["dist/index.js"],
        env: { ...process.env, QCAD_MCP_OUTPUT_DIR: outDir },
      }),
    );
  });

  after(async () => {
    await client?.close();
    rmSync(outDir, { recursive: true, force: true });
  });

  test("builds and saves a drawing as DXF and DWG", async () => {
    await call("new_drawing", { name: "platte" });
    await call("add_layer", { name: "Kontur", color: "red", lineweight: 0.5 });
    await call("add_layer", { name: "Mitte", color: "blue", linetype: "CENTER" });
    const added = await call("add_entities", {
      entities: [
        { type: "rectangle", corner: [0, 0], width: 120, height: 80, layer: "Kontur" },
        { type: "circle", center: [60, 40], radius: 15, layer: "Kontur" },
        { type: "line", start: [40, 40], end: [80, 40], layer: "Mitte" },
        { type: "dim_linear", p1: [0, 0], p2: [120, 0], dimLine: [60, -15] },
        { type: "dim_linear", p1: [120, 0], p2: [120, 80], dimLine: [135, 40], direction: "vertical" },
        { type: "dim_diameter", center: [60, 40], radius: 15 },
        { type: "text", text: "Platte 120×80", position: [60, 90], height: 5, hAlign: "center" },
      ],
    });
    assert.equal(added.isError, undefined, added.text);
    assert.deepEqual(JSON.parse(added.text).added, ["e1", "e2", "e3", "e4", "e5", "e6", "e7"]);

    const dxf = await call("save_drawing");
    assert.equal(dxf.isError, undefined, dxf.text);
    const result = JSON.parse(dxf.text);
    assert.equal(result.entityCount, 7);
    assert.equal(result.path, join(outDir, "platte.dxf"));
    // The vertical dimension must sit at x=135, not on the edge (regression for setRotation order).
    assert.ok(result.boundingBox[2] > 134, `bbox ${result.boundingBox}`);
    const content = readFileSync(result.path, "utf8");
    assert.match(content, /Kontur/);
    assert.match(content, /Platte 120/);
    assert.match(content, /\$DIMDEC\s*\n\s*70\s*\n\s*2\s*\n/, "default dimension precision of 2 decimals");

    const dwg = await call("save_drawing", { path: "sub/platte.dwg" });
    assert.equal(dwg.isError, undefined, dwg.text);
    assert.ok(existsSync(join(outDir, "sub", "platte.dwg")));
  });

  test("rejects entities on unknown layers", async () => {
    await call("new_drawing");
    const res = await call("add_entities", { entities: [{ type: "point", position: [0, 0], layer: "Nope" }] });
    assert.equal(res.isError, true);
    assert.match(res.text, /unknown layer "Nope"/);
  });

  test("removes entities by id", async () => {
    await call("new_drawing");
    await call("add_entities", {
      entities: [
        { type: "line", start: [0, 0], end: [10, 0] },
        { type: "arc", center: [0, 0], radius: 5, startAngle: 0, endAngle: 90 },
      ],
    });
    const res = JSON.parse((await call("remove_entities", { ids: ["e1", "e9"] })).text);
    assert.deepEqual(res, { removed: ["e1"], notFound: ["e9"] });
    assert.equal(JSON.parse((await call("get_drawing")).text).entities.length, 1);
  });

  test("reports QCAD errors such as unknown linetypes", async () => {
    await call("new_drawing");
    await call("add_entities", { entities: [{ type: "line", start: [0, 0], end: [1, 1], linetype: "NOPE" }] });
    const res = await call("save_drawing", { path: "bad.dxf" });
    assert.equal(res.isError, true);
    assert.match(res.text, /Unknown linetype 'NOPE'/);
  });

  test("renders a PNG preview", { skip: !qcad?.dwg2bmp && "dwg2bmp not available" }, async () => {
    await call("new_drawing");
    await call("add_entities", {
      entities: [
        { type: "hatch", loops: [{ points: [[0, 0], [50, 0], [50, 30], [0, 30]] }, { circle: { center: [25, 15], radius: 8 } }] },
        { type: "ellipse", center: [80, 15], majorAxis: [20, 0], ratio: 0.5 },
        { type: "polyline", points: [[0, 40], [50, 40, 1], [50, 60], [0, 60]], closed: true },
      ],
    });
    const res = await client.callTool({ name: "preview_drawing", arguments: { width: 400, height: 300 } });
    assert.equal(res.isError, undefined, JSON.stringify(res.content));
    const image = res.content.find((c) => c.type === "image");
    assert.equal(image.mimeType, "image/png");
    assert.equal(Buffer.from(image.data, "base64").subarray(1, 4).toString(), "PNG");
  });

  test("runs custom scripts against existing files", async () => {
    await call("new_drawing");
    await call("add_entities", { entities: [{ type: "circle", center: [0, 0], radius: 10 }] });
    await call("save_drawing", { path: "input.dxf" });
    const res = await call("run_qcad_script", {
      input_file: "input.dxf",
      output_file: "output.dxf",
      code: `
        var op = new RAddObjectsOperation();
        op.addObject(new RLineEntity(doc, new RLineData(new RVector(-10, 0), new RVector(10, 0))), false);
        di.applyOperation(op);
        log("added");
        return doc.queryAllEntities().length;
      `,
    });
    assert.equal(res.isError, undefined, res.text);
    const result = JSON.parse(res.text);
    assert.equal(result.result, 2);
    assert.deepEqual(result.log, ["added"]);
    assert.ok(existsSync(join(outDir, "output.dxf")));
  });
});
