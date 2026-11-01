// API Testfälle: Tests für die RESTful API der Rechnungen (Tapes)
import { test, expect } from "@playwright/test";

/** Legt eine neue Rolle an und liefert ihre id. */
async function erstelleRolle(request) {
  const antwort = await request.post("/v1/tapes", { data: {} });
  expect(antwort.status()).toBe(201);
  return (await antwort.json()).id;
}

/** Fügt Posten hinzu und prüft, dass das geklappt hat. */
async function fuegePostenHinzu(request, tapeId, posten) {
  const antwort = await request.post(`/v1/tapes/${tapeId}/entries`, { data: posten });
  expect(antwort.status()).toBe(200);
}

/** Liefert die id einer Rolle, die garantiert nicht (mehr) existiert. */
async function unbekannteRollenId(request) {
  const tapeId = await erstelleRolle(request);
  expect((await request.delete(`/v1/tapes/${tapeId}`)).status()).toBe(200);
  return tapeId;
}

async function holeRolle(request, tapeId) {
  const antwort = await request.get(`/v1/tapes/${tapeId}`);
  expect(antwort.status()).toBe(200);
  return antwort.json();
}

/** Sendet einen Body unverändert, z. B. ungültiges JSON (ein String würde als JSON-String verpackt). */
function rohBody(text) {
  return { data: Buffer.from(text), headers: { "Content-Type": "application/json" } };
}

test.describe("API - Tapes", () => {
  test("A01: POST /v1/tapes erstellt eine neue Rolle", async ({ request }) => {
    const antwort = await request.post("/v1/tapes", { data: {} });

    expect(antwort.status()).toBe(201);
    const body = await antwort.json();
    expect(typeof body.id).toBe("number");
  });

  test("A02: GET /v1/tapes/{tapeId} liefert Rolle mit Posten, Summe, Anzahl und Durchschnitt", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [10, 20, 30]);

    const antwort = await request.get(`/v1/tapes/${tapeId}`);

    expect(antwort.status()).toBe(200);
    expect(await antwort.json()).toEqual({
      id: tapeId,
      entries: ["10", "20", "30"],
      sum: 60,
      count: 3,
      average: 20
    });
  });

  test("A03: DELETE /v1/tapes/{tapeId} löscht eine Rolle", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.delete(`/v1/tapes/${tapeId}`);

    expect(antwort.status()).toBe(200);
    expect((await antwort.json()).message).toBe("Tape deleted");
    expect((await request.get(`/v1/tapes/${tapeId}`)).status()).toBe(404);
  });

  test("A04: POST /v1/tapes/{tapeId}/entries fügt Posten hinzu", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.post(`/v1/tapes/${tapeId}/entries`, { data: [10, 20, 30] });

    expect(antwort.status()).toBe(200);
    expect((await antwort.json()).message).toBe("Entries added");
    expect((await holeRolle(request, tapeId)).count).toBe(3);
  });

  test("A05: GET /v1/tapes/{tapeId}/total liefert nur die Summe", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [10, 20, 30]);

    const antwort = await request.get(`/v1/tapes/${tapeId}/total`);

    expect(antwort.status()).toBe(200);
    expect(await antwort.json()).toEqual({ total: 60 });
  });

  test("A06: DELETE /v1/tapes/{tapeId}/entries löscht alle Posten", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [10, 20, 30]);

    const antwort = await request.delete(`/v1/tapes/${tapeId}/entries`);

    expect(antwort.status()).toBe(200);
    expect((await antwort.json()).message).toBe("All entries deleted");
    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: [], sum: 0, count: 0, average: 0 });
  });

  test("A07: DELETE /v1/tapes/{tapeId}/entries/{entryId} löscht einzelnen Posten", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [10, 20, 30]);

    const antwort = await request.delete(`/v1/tapes/${tapeId}/entries/10`);

    expect(antwort.status()).toBe(200);
    expect((await antwort.json()).message).toBe("Entry deleted");
    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: ["20", "30"], sum: 50, count: 2 });
  });

  test("A14: POST /v1/tapes/{tapeId}/entries akzeptiert eine einzelne Zahl", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    await fuegePostenHinzu(request, tapeId, 10);

    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: ["10"], sum: 10, count: 1 });
  });

  test("A15: numerische Strings werden unverändert gespeichert und nur mit exaktem Wert gelöscht", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, ["12.50", "-3"]);

    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: ["12.50", "-3"], sum: 9.5, average: 4.75 });

    const gerundet = await request.delete(`/v1/tapes/${tapeId}/entries/12.5`);
    expect(gerundet.status()).toBe(404);
    expect(await gerundet.json()).toEqual({ error: "Entry not found" });

    const exakt = await request.delete(`/v1/tapes/${tapeId}/entries/12.50`);
    expect(exakt.status()).toBe(200);
    expect((await holeRolle(request, tapeId)).entries).toEqual(["-3"]);
  });

  test("A16: bei doppeltem Wert wird nur das erste Vorkommen gelöscht", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [10, 10, 5]);

    expect((await request.delete(`/v1/tapes/${tapeId}/entries/10`)).status()).toBe(200);

    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: ["10", "5"], sum: 15, count: 2 });
  });

  test("A17: Durchschnitt mit Nachkommastellen", async ({ request }) => {
    const tapeId = await erstelleRolle(request);
    await fuegePostenHinzu(request, tapeId, [1, 2]);

    expect(await holeRolle(request, tapeId)).toMatchObject({ sum: 3, count: 2, average: 1.5 });
  });

  test("A18: OPTIONS liefert die CORS-Header", async ({ request }) => {
    const antwort = await request.fetch("/v1/tapes", { method: "OPTIONS" });

    expect(antwort.status()).toBe(200);
    expect(antwort.headers()).toMatchObject({
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
      "access-control-allow-headers": "Content-Type"
    });
  });
});

test.describe("API - Fehlerbehandlung", () => {
  test("A08: POST /v1/tapes/{tapeId}/entries mit ungültiger Zahl gibt Fehler zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.post(`/v1/tapes/${tapeId}/entries`, { data: ["abc"] });

    expect(antwort.status()).toBe(400);
    expect(await antwort.json()).toEqual({ error: "invalid_number", value: "abc" });
    expect((await holeRolle(request, tapeId)).count).toBe(0);
  });

  test("A09: GET /v1/tapes/{nonexistentId} gibt Fehler zurück", async ({ request }) => {
    const tapeId = await unbekannteRollenId(request);

    const antwort = await request.get(`/v1/tapes/${tapeId}`);

    expect(antwort.status()).toBe(404);
    expect(await antwort.json()).toEqual({ error: "Tape not found" });
  });

  test("A10: GET /v1/tapes/{nonexistentId}/total gibt Fehler zurück", async ({ request }) => {
    const tapeId = await unbekannteRollenId(request);

    const antwort = await request.get(`/v1/tapes/${tapeId}/total`);

    expect(antwort.status()).toBe(404);
    expect(await antwort.json()).toEqual({ error: "Tape not found" });
  });

  test("A11: DELETE /v1/tapes/{tapeId}/entries/{entryId} mit unbekanntem Posten gibt Fehler zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.delete(`/v1/tapes/${tapeId}/entries/42`);

    expect(antwort.status()).toBe(404);
    expect(await antwort.json()).toEqual({ error: "Entry not found" });
  });

  test("A12: DELETE /v1/tapes/{tapeId}/total ist nicht erlaubt und löscht die Rolle nicht", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.delete(`/v1/tapes/${tapeId}/total`);

    expect(antwort.status()).toBe(405);
    expect(await antwort.json()).toEqual({ error: "Method not allowed" });
    expect((await request.get(`/v1/tapes/${tapeId}`)).status()).toBe(200);
  });

  test("A13: unbekannte Unterpfade geben 404 zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const rolle = await request.get(`/v1/tapes/${tapeId}/xyz`);
    expect(rolle.status()).toBe(404);
    expect(await rolle.json()).toEqual({ error: "Not found" });

    const posten = await request.delete(`/v1/tapes/${tapeId}/entries/10/xyz`);
    expect(posten.status()).toBe(404);
    expect(await posten.json()).toEqual({ error: "Not found" });
  });

  test("A19: Array mit einem ungültigen Wert wird komplett abgelehnt", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.post(`/v1/tapes/${tapeId}/entries`, { data: [1, "abc", 2] });

    expect(antwort.status()).toBe(400);
    expect(await antwort.json()).toEqual({ error: "invalid_number", value: "abc" });
    expect(await holeRolle(request, tapeId)).toMatchObject({ entries: [], count: 0 });
  });

  test("A20: ungültiges JSON beim Anlegen einer Rolle gibt Fehler zurück", async ({ request }) => {
    const antwort = await request.post("/v1/tapes", rohBody("[1,"));

    expect(antwort.status()).toBe(400);
    expect(await antwort.json()).toEqual({ error: "Invalid request body" });
  });

  test("A21: ungültiges JSON beim Hinzufügen von Posten gibt Fehler zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.post(`/v1/tapes/${tapeId}/entries`, rohBody("[1, 2"));

    expect(antwort.status()).toBe(400);
    expect(await antwort.json()).toEqual({ error: "Invalid request body" });
  });

  test("A22: leerer Body beim Hinzufügen von Posten gibt Fehler zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    const antwort = await request.post(`/v1/tapes/${tapeId}/entries`);

    expect(antwort.status()).toBe(400);
    expect(await antwort.json()).toEqual({ error: "invalid_number", value: {} });
  });

  test("A23: unbekannte Rolle löschen, Posten hinzufügen oder leeren gibt Fehler zurück", async ({ request }) => {
    const tapeId = await unbekannteRollenId(request);

    for (const antwort of [
      await request.delete(`/v1/tapes/${tapeId}`),
      await request.post(`/v1/tapes/${tapeId}/entries`, { data: [1] }),
      await request.delete(`/v1/tapes/${tapeId}/entries`)
    ]) {
      expect(antwort.status()).toBe(404);
      expect(await antwort.json()).toEqual({ error: "Tape not found" });
    }
  });

  test("A24: nicht erlaubte Methoden geben 405 zurück", async ({ request }) => {
    const tapeId = await erstelleRolle(request);

    for (const antwort of [
      await request.get("/v1/tapes"),
      await request.put(`/v1/tapes/${tapeId}`, { data: {} })
    ]) {
      expect(antwort.status()).toBe(405);
      expect(await antwort.json()).toEqual({ error: "Method not allowed" });
    }
  });
});
