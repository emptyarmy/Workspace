import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

/** Prefix of the single stdout line a QCAD script uses to report its result. */
export const RESULT_MARK = "QCAD_MCP_RESULT:";

export interface QcadInstall {
  /** Directory containing the `qcad` launcher and the scripts/ folder. */
  dir: string;
  launcher: string;
  /** Command-line rasterizer, only shipped with QCAD Professional. */
  dwg2bmp: string | null;
  /** macOS .app bundle, used to open files in the GUI. */
  app: string | null;
}

function candidateDirs(): string[] {
  const dirs: string[] = [];
  if (process.env.QCAD_DIR) dirs.push(process.env.QCAD_DIR);
  if (process.platform === "darwin") {
    for (const root of ["/Applications", join(homedir(), "Applications")]) {
      for (const app of ["QCAD-Pro.app", "QCAD.app", "QCAD-CAM.app"]) {
        dirs.push(join(root, app, "Contents", "Resources"));
      }
    }
  } else if (process.platform === "win32") {
    dirs.push("C:\\Program Files\\QCAD", "C:\\Program Files\\QCAD Pro");
  } else {
    for (const root of [join(homedir(), "opt"), "/opt"]) {
      for (const name of ["qcad-pro", "qcad", "qcadcam"]) dirs.push(join(root, name));
    }
  }
  return dirs;
}

let cached: QcadInstall | undefined;

export function findQcad(): QcadInstall {
  if (cached) return cached;
  const exe = process.platform === "win32" ? ".exe" : "";
  for (const dir of candidateDirs()) {
    const launcher = join(dir, `qcad${exe}`);
    if (!existsSync(launcher)) continue;
    const dwg2bmp = join(dir, process.platform === "win32" ? "dwg2bmp.bat" : "dwg2bmp");
    const appDir = dirname(dirname(dir));
    cached = {
      dir,
      launcher,
      dwg2bmp: existsSync(dwg2bmp) ? dwg2bmp : null,
      app: appDir.endsWith(".app") ? appDir : null,
    };
    return cached;
  }
  throw new Error(
    `QCAD not found. Searched: ${candidateDirs().join(", ")}. ` +
      "Set QCAD_DIR to the directory containing the qcad launcher " +
      "(macOS: /Applications/QCAD-Pro.app/Contents/Resources).",
  );
}

function headlessArgs(): string[] {
  const args = ["-no-gui", "-allow-multiple-instances"];
  if (process.platform === "darwin") args.unshift("-no-dock-icon");
  return args;
}

function run(cmd: string, args: string[], cwd: string, timeoutMs: number): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (d) => (output += d));
    child.stderr.on("data", (d) => (output += d));
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${basename(cmd)} timed out after ${timeoutMs} ms.\n${cleanLog(output)}`));
    }, timeoutMs);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, output });
    });
  });
}

/** Drops QCAD's startup noise so error messages stay readable. */
export function cleanLog(output: string): string {
  return output
    .split("\n")
    .filter((l) => l.trim() && !/Debug:|Unimplemented code|^QCAD version|Plugin does not implement/.test(l))
    .join("\n");
}

export function parseResult<T>(output: string): T | undefined {
  const line = output.split("\n").find((l) => l.startsWith(RESULT_MARK));
  return line ? (JSON.parse(line.slice(RESULT_MARK.length)) as T) : undefined;
}

/**
 * Runs an ECMAScript file headless inside QCAD and returns the object the
 * script reported via RESULT_MARK. Scripts must be run from the QCAD directory
 * so that include("scripts/...") resolves.
 */
export async function runScript<T>(script: string, timeoutMs = 120_000): Promise<T> {
  const qcad = findQcad();
  const tmp = await mkdtemp(join(tmpdir(), "qcad-mcp-"));
  const file = join(tmp, "script.js");
  try {
    await writeFile(file, script, "utf8");
    const { code, output } = await run(qcad.launcher, [...headlessArgs(), "-autostart", file], qcad.dir, timeoutMs);
    const result = parseResult<T>(output);
    if (result === undefined) {
      throw new Error(`QCAD produced no result (exit code ${code}).\n${cleanLog(output)}`);
    }
    return result;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export async function renderPng(
  drawing: string,
  png: string,
  options: { width: number; height: number; background: string },
): Promise<void> {
  const qcad = findQcad();
  if (!qcad.dwg2bmp) {
    throw new Error("Preview needs the dwg2bmp tool, which only ships with QCAD Professional.");
  }
  const args = [
    ...headlessArgs().filter((a) => a !== "-no-gui"),
    "-f", "-a", "-c",
    `-background=${options.background}`,
    `-width=${options.width}`,
    `-height=${options.height}`,
    "-margin=20",
    `-outfile=${png}`,
    drawing,
  ];
  const { code, output } = await run(qcad.dwg2bmp, args, qcad.dir, 120_000);
  if (code !== 0 || !existsSync(png)) {
    throw new Error(`dwg2bmp failed (exit code ${code}).\n${cleanLog(output)}`);
  }
}

/** Opens a drawing in the QCAD GUI without waiting for it. */
export function openInGui(file: string): void {
  const qcad = findQcad();
  const child =
    process.platform === "darwin" && qcad.app
      ? spawn("open", ["-a", qcad.app, file], { detached: true, stdio: "ignore" })
      : spawn(qcad.launcher, [file], { cwd: qcad.dir, detached: true, stdio: "ignore" });
  child.unref();
}
