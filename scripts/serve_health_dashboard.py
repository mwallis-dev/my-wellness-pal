#!/usr/bin/env python3
"""Serve the private health dashboard on localhost without persisting rendered data."""

from __future__ import annotations

import argparse
import json
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEB_ROOT = PROJECT_ROOT / "web" / "health-dashboard"
HEALTH_ROOT = PROJECT_ROOT / "health"
DATE_HEADING = re.compile(r"^## (\d{4}-\d{2}-\d{2})\s*$", re.MULTILINE)
FIELD = re.compile(r"^- ([^:]+):\s*(.*)$", re.MULTILINE)
APPROVED_FIELDS = {
    "Score",
    "Description",
    "Sleeping heart rate",
    "HRV",
    "Respiratory rate",
    "Blood oxygen",
    "Duration",
    "Quality",
    "Valence classification",
}


def parse_records(markdown: str) -> list[dict[str, object]]:
    headings = list(DATE_HEADING.finditer(markdown))
    records: list[dict[str, object]] = []

    for index, heading in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        section = markdown[heading.end() : end]
        fields = {
            name.strip(): value.strip()
            for name, value in FIELD.findall(section)
            if name.strip() in APPROVED_FIELDS
        }
        records.append({"day": heading.group(1), "fields": fields})

    return records


def load_records() -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    for path in sorted(HEALTH_ROOT.glob("[0-9][0-9][0-9][0-9].md")):
        records.extend(parse_records(path.read_text(encoding="utf-8")))
    return sorted(records, key=lambda record: str(record["day"]))


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args: object, **kwargs: object) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()

    def do_GET(self) -> None:
        if urlparse(self.path).path == "/api/health":
            payload = json.dumps({"records": load_records()}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def log_message(self, format_string: str, *args: object) -> None:
        print(f"[dashboard] {format_string % args}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765, help="Local port (default: 8765)")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if not 1 <= args.port <= 65535:
        raise SystemExit("--port must be between 1 and 65535")

    server = ThreadingHTTPServer(("127.0.0.1", args.port), DashboardHandler)
    print(f"Health dashboard: http://127.0.0.1:{args.port}")
    print("Local only. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

