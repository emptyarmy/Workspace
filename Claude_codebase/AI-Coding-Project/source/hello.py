"""Implements SPEC-001: print a friendly greeting.

Run it with:  uv run source/hello.py
"""


def greeting() -> str:
    """Return the project's hello message (kept small so it's easy to reuse)."""
    return "Hello from your AI-Coding-Project!"


def main() -> None:
    print(greeting())


if __name__ == "__main__":
    main()
