#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from mood_lib import MoodNotesError, read_moods, write_moods

JSON_PATH = Path(__file__).resolve().parent / "moods.json"


def main() -> int:
    try:
        moods = read_moods(JSON_PATH)
        write_moods(JSON_PATH, moods)
        total = sum(len(m["cards"]) for m in moods.values())
        print(f"OK: {total} card(s) across 5 moods")
        return 0
    except MoodNotesError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())