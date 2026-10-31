// Kleiner statischer Webserver ohne externe Abhängigkeiten.
// Start: npm start  →  http://localhost:3000
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = fileURLToPath(new URL("./public", import.meta.url));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const relativePath = urlPath === "/" ? "index.html" : urlPath;
  const filePath = normalize(join(PUBLIC_DIR, relativePath));

  // Zugriff außerhalb des public-Ordners verhindern
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end("Zugriff verweigert");
    return;
  }

  try {
    const content = await readFile(filePath);
    const type = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type }).end(content);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Seite nicht gefunden");
  }
});

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
