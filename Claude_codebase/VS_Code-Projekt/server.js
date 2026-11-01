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

// In-memory storage for tapes and entries
let tapes = new Map();
let nextTapeId = 1;

const server = createServer(async (req, res) => {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const method = req.method;

  // API routes handling
  if (urlPath.startsWith("/v1/tapes")) {
    await handleApiRequest(req, res, urlPath, method);
    return;
  }

  // Static file serving for the frontend
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

// API request handler
async function handleApiRequest(req, res, urlPath, method) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  try {
    // Parse URL to get parts
    const parts = urlPath.split("/").filter(p => p);

    // Handle different API endpoints
    if (parts.length >= 4 && parts[1] === "tapes" && parts[3] === "entries") {
      // /v1/tapes/{tapeId}/entries - handle entries
      // IDs sind im Map als Zahl gespeichert, aus der URL kommen Strings
      const tapeId = Number(parts[2]);
      const entryId = parts[4];

      if (parts.length > 5) {
        // /v1/tapes/{tapeId}/entries/{entryId}/... gibt es nicht
        sendError(res, 404, "Not found");
      } else if (method === "POST" && !entryId) {
        await handlePostEntry(req, res, tapeId);
      } else if (method === "DELETE" && entryId) {
        await handleDeleteEntry(req, res, tapeId, entryId);
      } else if (method === "DELETE" && !entryId) {
        await handleDeleteAllEntries(req, res, tapeId);
      } else {
        sendError(res, 405, "Method not allowed");
      }
    } else if (parts.length >= 2 && parts[1] === "tapes") {
      const tapeId = parts[2] && Number(parts[2]);

      // Nach Pfadlänge unterscheiden, damit z. B. DELETE /v1/tapes/{id}/total nicht die Rolle löscht
      if (parts.length === 2) {
        // /v1/tapes
        if (method === "POST") {
          await handleCreateTape(req, res);
        } else {
          sendError(res, 405, "Method not allowed");
        }
      } else if (parts.length === 3) {
        // /v1/tapes/{tapeId}
        if (method === "GET" && tapeId) {
          await handleGetTape(req, res, tapeId);
        } else if (method === "DELETE" && tapeId) {
          await handleDeleteTape(req, res, tapeId);
        } else {
          sendError(res, 405, "Method not allowed");
        }
      } else if (parts.length === 4 && parts[3] === "total") {
        // /v1/tapes/{tapeId}/total
        if (method === "GET" && tapeId) {
          await handleGetTotal(req, res, tapeId);
        } else {
          sendError(res, 405, "Method not allowed");
        }
      } else {
        sendError(res, 404, "Not found");
      }
    } else {
      sendError(res, 404, "Not found");
    }
  } catch (error) {
    console.error("API Error:", error);
    sendError(res, 500, "Internal server error");
  }
}

// POST /v1/tapes - create new tape
async function handleCreateTape(req, res) {
  try {
    const body = await getRequestBody(req);
    const tapeId = nextTapeId++;

    tapes.set(tapeId, {
      id: tapeId,
      entries: [],
      createdAt: new Date().toISOString()
    });

    res.writeHead(201);
    res.end(JSON.stringify({ id: tapeId }));
  } catch (error) {
    sendError(res, 400, "Invalid request body");
  }
}

// GET /v1/tapes/{tapeId} - get tape with entries, sum, count, average
async function handleGetTape(req, res, tapeId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  const sum = tape.entries.reduce((acc, entry) => acc + Number(entry), 0);
  const count = tape.entries.length;
  const average = count > 0 ? sum / count : 0;

  res.writeHead(200);
  res.end(JSON.stringify({
    id: tape.id,
    entries: tape.entries,
    sum: sum,
    count: count,
    average: average
  }));
}

// DELETE /v1/tapes/{tapeId} - delete tape
async function handleDeleteTape(req, res, tapeId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  tapes.delete(tapeId);
  res.writeHead(200);
  res.end(JSON.stringify({ message: "Tape deleted" }));
}

// POST /v1/tapes/{tapeId}/entries - add entry/entries
async function handlePostEntry(req, res, tapeId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  try {
    const body = await getRequestBody(req);
    let entriesToAdd = [];

    // Handle both single number and array of numbers
    if (Array.isArray(body)) {
      entriesToAdd = body;
    } else {
      entriesToAdd = [body];
    }

    // Validate entries
    for (const entry of entriesToAdd) {
      if (typeof entry !== "number" && typeof entry !== "string") {
        sendError(res, 400, { error: "invalid_number", value: entry });
        return;
      }

      const numValue = Number(entry);
      if (isNaN(numValue)) {
        sendError(res, 400, { error: "invalid_number", value: entry });
        return;
      }
    }

    // Add entries to tape
    for (const entry of entriesToAdd) {
      tape.entries.push(String(entry));
    }

    res.writeHead(200);
    res.end(JSON.stringify({ message: "Entries added" }));
  } catch (error) {
    sendError(res, 400, "Invalid request body");
  }
}

// DELETE /v1/tapes/{tapeId}/entries/{entryId} - delete single entry
async function handleDeleteEntry(req, res, tapeId, entryId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  const index = tape.entries.findIndex(entry => entry === entryId);

  if (index === -1) {
    sendError(res, 404, "Entry not found");
    return;
  }

  tape.entries.splice(index, 1);

  res.writeHead(200);
  res.end(JSON.stringify({ message: "Entry deleted" }));
}

// DELETE /v1/tapes/{tapeId}/entries - delete all entries
async function handleDeleteAllEntries(req, res, tapeId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  tape.entries = [];

  res.writeHead(200);
  res.end(JSON.stringify({ message: "All entries deleted" }));
}

// GET /v1/tapes/{tapeId}/total - get just the sum
async function handleGetTotal(req, res, tapeId) {
  const tape = tapes.get(tapeId);

  if (!tape) {
    sendError(res, 404, "Tape not found");
    return;
  }

  const sum = tape.entries.reduce((acc, entry) => acc + Number(entry), 0);

  res.writeHead(200);
  res.end(JSON.stringify({ total: sum }));
}

// Helper to get request body
async function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', chunk => {
      data += chunk.toString();
    });

    req.on('end', () => {
      try {
        if (data.trim() === '') {
          resolve({});
        } else {
          resolve(JSON.parse(data));
        }
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

// Helper to send error response
function sendError(res, statusCode, message) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  if (typeof message === "string") {
    res.end(JSON.stringify({ error: message }));
  } else {
    res.end(JSON.stringify(message));
  }
}

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
