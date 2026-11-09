# ADR-004: KI-Anbindung für Handlungsempfehlungen

- **Status:** akzeptiert (08.11.2026)
- **Bezug:** F-04

## Entscheidung
- Anbieter, Modell, Endpunkt und Parameter legt der Admin **je Firma im Admin-Bereich** fest (S-04); mehrere KI-Module je Firma möglich.
- Unterstützte Adapter (Release 1): Anthropic (Claude), OpenAI, Azure OpenAI, Ollama, LM Studio sowie „OpenAI-kompatibel (benutzerdefiniert)“.
- Die **regelbasierte Engine** ist immer aktiv und dient als Fallback.
- Alle KI-Aufrufe laufen über den Server-Proxy; API-Schlüssel werden verschlüsselt gespeichert und nie an den Browser ausgegeben.

## Konsequenzen
- Für jeden Anbieter gibt es einen Adapter mit einheitlicher Schnittstelle `generateRecommendations(context) → Recommendation[]`.
- Ein Verbindungstest gehört zum Admin-Bereich.
- In Playwright-Tests werden die Anbieter gemockt.
