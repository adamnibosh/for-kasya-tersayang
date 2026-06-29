#!/usr/bin/env python3
"""Fail if daily.json is missing, corrupt, or not append-safe."""
from __future__ import annotations

import sys
from pathlib import Path

from daily_lib import DailyNotesError, read_notes, write_notes

JSON_PATH = Path(__file__).resolve().parent / "daily.json"


def main() -> int:
    try:
        notes = read_notes(JSON_PATH)
        write_notes(JSON_PATH, notes)
        print(f"OK: {len(notes)} note(s)")
        return 0
    except DailyNotesError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())