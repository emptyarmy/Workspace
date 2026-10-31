from __future__ import annotations

import argparse
import sys

from .client import LocalLLMClient


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Send a prompt to a local LLM endpoint.")
    parser.add_argument("prompt", nargs="?", help="Prompt to send to the model.")
    parser.add_argument("--base-url", default=None, help="Base URL for the local model server.")
    parser.add_argument("--model", default=None, help="Model name to use.")
    parser.add_argument("--system", default=None, help="Optional system instructions.")
    parser.add_argument("--chat", action="store_true", help="Use the OpenAI-compatible chat completion endpoint.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.prompt is None:
        args.prompt = sys.stdin.read().strip()

    if not args.prompt:
        parser.error("A prompt is required.")

    client = LocalLLMClient(base_url=args.base_url, model=args.model)
    if args.chat:
        result = client.chat(args.prompt, system_prompt=args.system)
    else:
        result = client.generate(args.prompt, system_prompt=args.system)
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
