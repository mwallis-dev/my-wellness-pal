# My Wellness Pal

Screenshot-only personal health log. Drop in app screenshots; the agent saves a local Markdown record.

## How it works

1. Attach Outsiders App and/or iOS Health State of Mind screenshots in chat.
2. The agent extracts in-scope fields and merges them into `health/YYYY.md`.
3. Later screenshots fill gaps. Conflicts stop instead of overwriting.

Ask for **assessment**, **preview**, or **no save** if you want extraction without writing.

Details: [`AGENTS.md`](./AGENTS.md) · [capture skill](./.agents/skills/capture-daily-health/SKILL.md)

## Visualize your records

Ask to **visualize**, **compare**, or **explore** the saved records. The
[`visualization skill`](./.agents/skills/visualize-health-data/SKILL.md) starts
with a private, read-only Markdown view and keeps missing values visible. It
does not add targets, medical interpretation, or causal claims.

### Local web dashboard

To view the richer dashboard in a normal web browser:

```bash
python3 scripts/serve_health_dashboard.py
```

Then open <http://127.0.0.1:8765>. The server is available only on this
computer, reads approved fields from the ignored annual health files at request
time, and does not persist rendered health data. The dashboard defaults to the
latest 14 recorded days; use `?days=30` to change the number shown.

## What is captured

**Outsiders App** — readiness (score, description); body metrics (sleeping heart rate, HRV, respiratory rate, blood oxygen); sleep (duration, quality)

**iOS Health** — State of Mind daily mood (valence, labels, associations, additional context)

Only these fields. Everything else on the screens is ignored.

## Data format

One file per year: `health/YYYY.md`. One `## YYYY-MM-DD` section per day.

```markdown
## 2026-07-27

### Readiness — Outsiders App
- Score: 28%
- Description: Low Readiness

### Body metrics — Outsiders App
- Sleeping heart rate: 59 bpm
- HRV: 44 ms
- Respiratory rate: 16 br/min
- Blood oxygen: 97%

### Sleep — Outsiders App
- Duration: 7h 31m
- Quality: Good

### State of Mind — iOS Health
- Kind: Daily Mood
- Valence classification: Slightly Pleasant
- Labels:
  - Content
- Associations:
  - Self-Care
```

## Disclaimer

Stores tracker labels and your own wording as written. Does not diagnose, prescribe, or give medical advice.
