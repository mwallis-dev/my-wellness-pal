# My Wellness Pal

Screenshot-only personal health log for [Cursor](https://cursor.com). Drop in app screenshots; the agent saves a local Markdown record. Health data stays off GitHub (`health/` is gitignored).

## How it works

1. Attach Outsiders App and/or iOS Health State of Mind screenshots in chat.
2. The agent extracts in-scope fields and merges them into `health/YYYY.md`.
3. Later screenshots fill gaps. Conflicts stop instead of overwriting.

Ask for **assessment**, **preview**, or **no save** if you want extraction without writing.

Details: [`AGENTS.md`](./AGENTS.md) · [capture skill](./.agents/skills/capture-daily-health/SKILL.md)

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
