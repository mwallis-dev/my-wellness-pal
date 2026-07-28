#!/usr/bin/env python3
"""Render a private Markdown health summary from the project's annual log."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path


DATE_HEADING = re.compile(r"^## (\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE)
FIELD = re.compile(r"^- ([^:]+):\s*(.*)$", re.MULTILINE)
MOOD_ORDER = [
    "Very Unpleasant",
    "Unpleasant",
    "Slightly Unpleasant",
    "Neutral",
    "Slightly Pleasant",
    "Pleasant",
    "Very Pleasant",
]

DEMO_LOG = """# Health log — 2026

## 2026-07-25

### Readiness — Outsiders App

- Score: 42%
- Description: Low Readiness

### Body metrics — Outsiders App

- Sleeping heart rate: 61 bpm
- HRV: 39 ms
- Respiratory rate: 16 br/min
- Blood oxygen: 97%

### Sleep — Outsiders App

- Duration: 6h 48m
- Quality: Fair

### State of Mind — iOS Health

- Kind: Daily Mood
- Valence classification: Neutral

## 2026-07-27

### Readiness — Outsiders App

- Score: 64%
- Description: Good Readiness

### Body metrics — Outsiders App

- Sleeping heart rate: 58 bpm
- HRV: 45 ms
- Respiratory rate: 15 br/min
- Blood oxygen: 98%

### Sleep — Outsiders App

- Duration: 7h 31m
- Quality: Good

### State of Mind — iOS Health

- Kind: Daily Mood
- Valence classification: Slightly Pleasant
"""


@dataclass(frozen=True)
class Record:
    day: date
    fields: dict[str, str]


def parse_records(markdown: str) -> list[Record]:
    matches = list(DATE_HEADING.finditer(markdown))
    records: list[Record] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        section = markdown[match.end() : end]
        fields = {name.strip(): value.strip() for name, value in FIELD.findall(section)}
        records.append(Record(date.fromisoformat(match.group(1)), fields))
    return sorted(records, key=lambda record: record.day)


def readiness_bar(value: str, width: int = 10) -> str:
    match = re.fullmatch(r"(\d{1,3})%", value)
    if not match:
        return "·"
    percent = max(0, min(100, int(match.group(1))))
    filled = round(percent * width / 100)
    return "█" * filled + "░" * (width - filled)


def mood_scale(value: str) -> str:
    if value not in MOOD_ORDER:
        return "·"
    position = MOOD_ORDER.index(value)
    return "".join("●" if index == position else "○" for index in range(len(MOOD_ORDER)))


def shown(value: str | None) -> str:
    if not value or value in {"Not captured", "No data"}:
        return "·"
    return value.replace("|", "\\|")


def numeric_value(value: str | None) -> float | None:
    if not value or value in {"Not captured", "No data"}:
        return None
    match = re.search(r"\d+(?:\.\d+)?", value.replace(",", ""))
    return float(match.group()) if match else None


def duration_minutes(value: str | None) -> int | None:
    if not value or value in {"Not captured", "No data"}:
        return None
    match = re.fullmatch(r"(?:(\d+)h\s*)?(?:(\d+)m)?", value.strip())
    if not match or not any(match.groups()):
        return None
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    return hours * 60 + minutes


def ordered_mood(value: str | None) -> int | None:
    return MOOD_ORDER.index(value) if value in MOOD_ORDER else None


def change_marker(current: float | int | None, previous: float | int | None) -> str:
    if current is None or previous is None:
        return "—"
    if current > previous:
        return "↑"
    if current < previous:
        return "↓"
    return "→"


def absent_days(first: date, last: date, records: list[Record]) -> int:
    recorded = {record.day for record in records}
    cursor = first
    missing = 0
    while cursor <= last:
        if cursor not in recorded:
            missing += 1
        cursor += timedelta(days=1)
    return missing


def render(records: list[Record], days: int, as_of: date | None) -> str:
    eligible = [record for record in records if as_of is None or record.day <= as_of]
    selected = eligible[-days:]
    if not selected:
        raise ValueError("No dated health records match the requested range.")

    latest = selected[-1]
    previous = selected[-2] if len(selected) >= 2 else None
    first_day, last_day = selected[0].day.isoformat(), selected[-1].day.isoformat()
    missing_days = absent_days(selected[0].day, selected[-1].day, selected)
    lines = [
        f"# Health dashboard — {first_day} to {last_day}",
        "",
        (
            f"> {len(selected)} recorded day(s); {missing_days} absent daily section(s) "
            "in this span. Descriptive only; no targets or health assessment."
        ),
        "",
        f"## Latest recorded day — {latest.day.isoformat()}",
        "",
    ]

    latest_fields = latest.fields
    previous_fields = previous.fields if previous else {}
    snapshot = [
        (
            "Readiness",
            latest_fields.get("Score"),
            readiness_bar(latest_fields.get("Score", "")),
            change_marker(
                numeric_value(latest_fields.get("Score")),
                numeric_value(previous_fields.get("Score")),
            ),
        ),
        (
            "Sleep",
            latest_fields.get("Duration"),
            "—",
            change_marker(
                duration_minutes(latest_fields.get("Duration")),
                duration_minutes(previous_fields.get("Duration")),
            ),
        ),
        ("Sleep quality", latest_fields.get("Quality"), "—", "—"),
        (
            "HRV",
            latest_fields.get("HRV"),
            "—",
            change_marker(
                numeric_value(latest_fields.get("HRV")),
                numeric_value(previous_fields.get("HRV")),
            ),
        ),
        (
            "Sleeping HR",
            latest_fields.get("Sleeping heart rate"),
            "—",
            change_marker(
                numeric_value(latest_fields.get("Sleeping heart rate")),
                numeric_value(previous_fields.get("Sleeping heart rate")),
            ),
        ),
        (
            "Resp. rate",
            latest_fields.get("Respiratory rate"),
            "—",
            change_marker(
                numeric_value(latest_fields.get("Respiratory rate")),
                numeric_value(previous_fields.get("Respiratory rate")),
            ),
        ),
        (
            "Blood oxygen",
            latest_fields.get("Blood oxygen"),
            "—",
            change_marker(
                numeric_value(latest_fields.get("Blood oxygen")),
                numeric_value(previous_fields.get("Blood oxygen")),
            ),
        ),
        (
            "State of Mind",
            latest_fields.get("Valence classification"),
            mood_scale(latest_fields.get("Valence classification", "")),
            change_marker(
                ordered_mood(latest_fields.get("Valence classification")),
                ordered_mood(previous_fields.get("Valence classification")),
            ),
        ),
    ]
    lines.append("```text")
    for label, value, display, marker in snapshot:
        lines.append(f"{label:<14} {shown(value):<21} {display:<10} {marker}")
    lines.append("```")
    readiness_label = shown(latest_fields.get("Description"))
    if readiness_label != "·":
        lines.extend(["", f"Tracker-provided readiness label: **{readiness_label}**"])

    lines.extend(
        [
            "",
            "## Recent records",
            "",
            "| Date | Readiness | Sleep | HRV | Sleeping HR | State of Mind |",
            "|---|---:|---:|---:|---:|---|",
        ]
    )
    for record in selected:
        fields = record.fields
        lines.append(
            "| "
            + " | ".join(
                [
                    record.day.isoformat(),
                    shown(fields.get("Score")),
                    shown(fields.get("Duration")),
                    shown(fields.get("HRV")),
                    shown(fields.get("Sleeping heart rate")),
                    shown(fields.get("Valence classification")),
                ]
            )
            + " |"
        )

    lines.extend(
        [
            "",
            (
                "_Encoding: readiness bar = source 0–100 percentage; mood dots = recorded "
                "seven-category position; ↑/↓/→ = recorded value higher/lower/same as the "
                "previous recorded day, without health judgment; · = not recorded; "
                "— = no extra visual encoding._"
            ),
        ]
    )
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        nargs="+",
        help="One or more annual health Markdown files",
    )
    parser.add_argument("--days", type=int, default=14, help="Number of recorded days to show")
    parser.add_argument("--as-of", type=date.fromisoformat, help="Latest included date (YYYY-MM-DD)")
    parser.add_argument("--demo", action="store_true", help="Render synthetic data instead of a private log")
    args = parser.parse_args()
    if not args.demo and args.input is None:
        parser.error("--input is required unless --demo is used")
    if args.days < 1:
        parser.error("--days must be at least 1")
    return args


def main() -> int:
    args = parse_args()
    markdown = (
        DEMO_LOG
        if args.demo
        else "\n".join(path.read_text(encoding="utf-8") for path in args.input)
    )
    try:
        print(render(parse_records(markdown), args.days, args.as_of))
    except ValueError as error:
        raise SystemExit(str(error)) from error
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
