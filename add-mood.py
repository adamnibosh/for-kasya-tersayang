#!/usr/bin/env python3
"""Add a mood card — append only, validated, atomic write, then deploy."""
from __future__ import annotations

import subprocess
import sys
from datetime import date
from pathlib import Path

from mood_lib import MOOD_MENU, MoodNotesError, append_mood_card, read_moods, write_moods

ROOT = Path(__file__).resolve().parent
JSON_PATH = ROOT / "moods.json"


def run_git(args: list[str]) -> None:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise MoodNotesError(f"git {' '.join(args)} failed: {detail}")


def repair_only() -> int:
    moods = read_moods(JSON_PATH)
    write_moods(JSON_PATH, moods)
    total = sum(len(m["cards"]) for m in moods.values())
    print(f"Repaired moods.json — {total} card(s) OK")
    return 0


def pick_mood() -> str:
    print("Pick mood:")
    print("  1 = sedih   2 = happy   3 = alone")
    print("  4 = marah   5 = rindu")
    choice = input("Mood (1-5): ").strip()
    mood = MOOD_MENU.get(choice)
    if not mood:
        raise MoodNotesError("Pick a mood from 1 to 5")
    return mood


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--repair":
        try:
            return repair_only()
        except MoodNotesError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1

    today = date.today().isoformat()
    print()
    print("=== Add mood card (append only - old cards stay) ===")
    print(f"Today: {today}")
    print()

    try:
        mood = pick_mood()
        moods = read_moods(JSON_PATH)
        label = moods[mood]["label"]
        print(f"Mood: {moods[mood]['emoji']} {label}")
        print()

        text = input("Message for Kasya (main text): ").strip()
        if not text:
            print("Cancelled - no text entered.")
            return 1

        sub = input("Small sub-line (Enter to skip): ").strip() or None
        updated = append_mood_card(JSON_PATH, mood, today, text, sub)
        count = len(updated[mood]["cards"])
        print()
        print(f"Added {label} card for {today} ({count} cards in this mood)")
        print("Validating before deploy...")
        read_moods(JSON_PATH)
        print("Deploying to GitHub...")
        run_git(["add", "moods.json"])
        run_git(["commit", "-m", f"Mood card {mood} for {today}"])
        run_git(["push", "origin", "main"])
        print()
        print("DONE. Sayang will see it in ayat sweett on the site.")
        print()
        return 0
    except MoodNotesError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nCancelled.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())