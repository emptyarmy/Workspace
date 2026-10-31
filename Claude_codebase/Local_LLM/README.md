# Local LLM

A lightweight Python starter for querying a local LLM server from the command line.

## Features

- Connect to an Ollama-style local endpoint or an OpenAI-compatible local server
- Send a prompt via CLI
- Keep the setup simple and dependency-light

## Quick start

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m local_llm.cli "Write a short haiku about sunrise"
```

## Environment variables

- `LOCAL_LLM_BASE_URL` — default: `http://localhost:11434`
- `LOCAL_LLM_MODEL` — default: `llama3.2`

## Example

```bash
export LOCAL_LLM_BASE_URL=http://localhost:11434
export LOCAL_LLM_MODEL=llama3.2
python -m local_llm.cli "Explain quantum computing in one paragraph"
```

## Notes

This project is intentionally minimal. It expects a local model server such as Ollama to be running and reachable on the configured URL.
