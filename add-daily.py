#!/usr/bin/env python3
"""Add a daily note — append only, validated, atomic write, then deploy."""
from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path

from daily_lib import DailyNotesError, append_note, read_notes, write_notes

ROOT = Path(__file__).resolve().parent
JSON_PATH = ROOT / "daily.json"


def run_git(args: list[str]) -> None:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise DailyNotesError(f"git {' '.join(args)} failed: {detail}")


def repair_only() -> int:
    notes = read_notes(JSON_PATH)
    write_notes(JSON_PATH, notes)
    print(f"Repaired daily.json — {len(notes)} note(s) OK")
    return 0


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--repair":
        try:
            return repair_only()
        except DailyNotesError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1

    today = date.today().isoformat()
    print()
    print("=== Add daily note (append only - old notes stay) ===")
    print(f"Today: {today}")
    print()

    try:
        text = input("Note for Kasya (main message): ").strip()
        if not text:
            print("Cancelled - no text entered.")
            return 1

        sub = input("Small sub-line (Enter to skip): ").strip() or None
        notes = append_note(JSON_PATH, today, text, sub)
        print()
        print(f"Added note for {today} ({len(notes)} total)")
        print("Validating before deploy...")
        read_notes(JSON_PATH)
        print("Deploying to GitHub...")
        run_git(["add", "daily.json"])
        run_git(["commit", "-m", f"Daily note for {today}"])
        run_git(["push", "origin", "main"])
        print()
        print("DONE. Sayang will see it in daily dari baby on the site.")
        print()
        return 0
    except DailyNotesError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())