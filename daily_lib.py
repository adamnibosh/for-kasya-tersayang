"""Shared daily-notes helpers — strict read, normalize, validate, atomic write."""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
REQUIRED_KEYS = frozenset({"date", "text"})


class DailyNotesError(Exception):
    pass


def clean_note(raw: dict[str, Any]) -> dict[str, str]:
    date = str(raw.get("date", "")).strip()
    text = str(raw.get("text", "")).strip()
    if not DATE_RE.match(date):
        raise DailyNotesError(f"Invalid date: {date!r}")
    if not text:
        raise DailyNotesError("Note text cannot be empty")
    note: dict[str, str] = {"date": date, "text": text}
    sub = raw.get("sub")
    if sub is not None and str(sub).strip():
        note["sub"] = str(sub).strip()
    return note


def normalize_notes(data: Any) -> list[dict[str, str]]:
    if data is None:
        return []
    if not isinstance(data, list):
        raise DailyNotesError("daily.json must be a JSON array")

    out: list[dict[str, str]] = []
    for item in data:
        if not isinstance(item, dict):
            continue
        if "value" in item and isinstance(item["value"], list):
            for nested in item["value"]:
                if isinstance(nested, dict):
                    out.append(clean_note(nested))
            continue
        if REQUIRED_KEYS.issubset(item.keys()):
            out.append(clean_note(item))
    return out


def read_notes(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise DailyNotesError(f"daily.json is not valid JSON: {exc}") from exc
    return normalize_notes(data)


def validate_notes(notes: list[dict[str, str]]) -> None:
    if not isinstance(notes, list):
        raise DailyNotesError("Notes must be a list")
    for i, note in enumerate(notes):
        if not isinstance(note, dict):
            raise DailyNotesError(f"Note {i + 1} is not an object")
        extra = set(note.keys()) - {"date", "text", "sub"}
        if extra:
            raise DailyNotesError(f"Note {i + 1} has unknown fields: {sorted(extra)}")
        clean_note(note)


def write_notes(path: Path, notes: list[dict[str, str]]) -> None:
    validate_notes(notes)
    payload = [{k: note[k] for k in ("date", "text", *(("sub",) if "sub" in note else ()))} for note in notes]
    tmp = path.with_suffix(path.suffix + ".tmp")
    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    tmp.write_text(text, encoding="utf-8", newline="\n")

    try:
        roundtrip = normalize_notes(json.loads(tmp.read_text(encoding="utf-8")))
    except json.JSONDecodeError as exc:
        tmp.unlink(missing_ok=True)
        raise DailyNotesError(f"Written file failed validation: {exc}") from exc

    if len(roundtrip) != len(notes):
        tmp.unlink(missing_ok=True)
        raise DailyNotesError("Written file lost notes during save — aborted")

    for before, after in zip(notes, roundtrip):
        if before != after:
            tmp.unlink(missing_ok=True)
            raise DailyNotesError("Written file does not match notes — aborted")

    os.replace(tmp, path)


def append_note(path: Path, date: str, text: str, sub: str | None = None) -> list[dict[str, str]]:
    notes = read_notes(path)
    entry = clean_note({"date": date, "text": text, **({"sub": sub} if sub else {})})
    notes.append(entry)
    write_notes(path, notes)
    return notes