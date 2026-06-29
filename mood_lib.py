"""Mood cards — strict read, normalize, validate, atomic append."""
from __future__ import annotations

import json
import os
import re
from copy import deepcopy
from pathlib import Path
from typing import Any

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MOOD_KEYS = ("sad", "happy", "alone", "angry", "rindu")
CARD_KEYS = frozenset({"text", "sub", "date"})


class MoodNotesError(Exception):
    pass


def clean_card(raw: dict[str, Any], *, require_date: bool = False) -> dict[str, str]:
    text = str(raw.get("text", "")).strip()
    if not text:
        raise MoodNotesError("Card text cannot be empty")
    card: dict[str, str] = {"text": text}
    sub = raw.get("sub")
    if sub is not None and str(sub).strip():
        card["sub"] = str(sub).strip()
    date = raw.get("date")
    if date is not None and str(date).strip():
        date = str(date).strip()
        if not DATE_RE.match(date):
            raise MoodNotesError(f"Invalid date: {date!r}")
        card["date"] = date
    elif require_date:
        raise MoodNotesError("Daily mood cards need a date")
    return card


def clean_mood(key: str, raw: dict[str, Any]) -> dict[str, Any]:
    if key not in MOOD_KEYS:
        raise MoodNotesError(f"Unknown mood: {key!r}")
    label = str(raw.get("label", "")).strip()
    emoji = str(raw.get("emoji", "")).strip()
    if not label or not emoji:
        raise MoodNotesError(f"Mood {key} needs label and emoji")
    cards_raw = raw.get("cards")
    if not isinstance(cards_raw, list):
        raise MoodNotesError(f"Mood {key} cards must be a list")
    cards = [clean_card(item) for item in cards_raw if isinstance(item, dict)]
    if not cards:
        raise MoodNotesError(f"Mood {key} must have at least one card")
    return {"label": label, "emoji": emoji, "cards": cards}


def normalize_moods(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise MoodNotesError("moods.json must be a JSON object")
    out: dict[str, Any] = {}
    for key in MOOD_KEYS:
        if key not in data:
            raise MoodNotesError(f"Missing mood: {key}")
        out[key] = clean_mood(key, data[key])
    extra = set(data.keys()) - set(MOOD_KEYS)
    if extra:
        raise MoodNotesError(f"Unknown moods: {sorted(extra)}")
    return out


def read_moods(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise MoodNotesError("moods.json not found")
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        raise MoodNotesError("moods.json is empty")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise MoodNotesError(f"moods.json is not valid JSON: {exc}") from exc
    return normalize_moods(data)


def write_moods(path: Path, moods: dict[str, Any]) -> None:
    normalized = normalize_moods(moods)
    tmp = path.with_suffix(path.suffix + ".tmp")
    text = json.dumps(normalized, indent=2, ensure_ascii=False) + "\n"
    tmp.write_text(text, encoding="utf-8", newline="\n")
    try:
        roundtrip = normalize_moods(json.loads(tmp.read_text(encoding="utf-8")))
    except json.JSONDecodeError as exc:
        tmp.unlink(missing_ok=True)
        raise MoodNotesError(f"Written file failed validation: {exc}") from exc
    for key in MOOD_KEYS:
        if len(roundtrip[key]["cards"]) != len(normalized[key]["cards"]):
            tmp.unlink(missing_ok=True)
            raise MoodNotesError(f"Mood {key} lost cards during save — aborted")
    os.replace(tmp, path)


def append_mood_card(
    path: Path,
    mood: str,
    date: str,
    text: str,
    sub: str | None = None,
) -> dict[str, Any]:
    if mood not in MOOD_KEYS:
        raise MoodNotesError(f"Unknown mood: {mood!r}")
    moods = read_moods(path)
    entry = clean_card({"date": date, "text": text, **({"sub": sub} if sub else {})}, require_date=True)
    updated = deepcopy(moods)
    updated[mood]["cards"].append(entry)
    write_moods(path, updated)
    return updated


MOOD_MENU = {
    "1": "sad",
    "2": "happy",
    "3": "alone",
    "4": "angry",
    "5": "rindu",
}