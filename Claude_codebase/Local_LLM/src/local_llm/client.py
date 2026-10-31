from __future__ import annotations

import os
from typing import Any, Iterable

import requests


class LocalLLMClient:
    """Simple HTTP client for local LLM APIs such as Ollama."""

    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: int = 60):
        self.base_url = (base_url or os.getenv("LOCAL_LLM_BASE_URL", "http://localhost:11434")).rstrip("/")
        self.model = model or os.getenv("LOCAL_LLM_MODEL", "llama3.2")
        self.timeout = timeout

    def _endpoint(self, path: str) -> str:
        return f"{self.base_url}{path}"

    @staticmethod
    def _extract_text_from_response(data: Any) -> str:
        if isinstance(data, str):
            return data

        if isinstance(data, dict):
            if "response" in data and isinstance(data["response"], str):
                return data["response"]
            if "content" in data and isinstance(data["content"], str):
                return data["content"]
            if "text" in data and isinstance(data["text"], str):
                return data["text"]
            if "choices" in data and isinstance(data["choices"], list):
                for item in data["choices"]:
                    if isinstance(item, dict):
                        if "text" in item and isinstance(item["text"], str):
                            return item["text"]
                        message = item.get("message", {})
                        if isinstance(message, dict) and "content" in message and isinstance(message["content"], str):
                            return message["content"]
            if "messages" in data and isinstance(data["messages"], list):
                for item in data["messages"]:
                    if isinstance(item, dict) and "content" in item and isinstance(item["content"], str):
                        return item["content"]

        if isinstance(data, list):
            parts = []
            for item in data:
                text = LocalLLMClient._extract_text_from_response(item)
                if text:
                    parts.append(text)
            return "".join(parts)

        raise ValueError(f"Unsupported local LLM payload format: {type(data).__name__}")

    def generate(self, prompt: str, system_prompt: str | None = None, options: dict[str, Any] | None = None) -> str:
        payload: dict[str, Any] = {"model": self.model, "prompt": prompt, "stream": False}

        if system_prompt:
            payload["system"] = system_prompt
        if options:
            payload["options"] = options

        response = requests.post(self._endpoint("/api/generate"), json=payload, timeout=self.timeout)
        response.raise_for_status()
        return self._extract_text_from_response(response.json())

    def chat(self, prompt: str, system_prompt: str | None = None, options: dict[str, Any] | None = None) -> str:
        messages = [{"role": "user", "content": prompt}]
        if system_prompt:
            messages.insert(0, {"role": "system", "content": system_prompt})

        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }
        if options:
            payload["options"] = options

        response = requests.post(self._endpoint("/v1/chat/completions"), json=payload, timeout=self.timeout)
        response.raise_for_status()
        return self._extract_text_from_response(response.json())
