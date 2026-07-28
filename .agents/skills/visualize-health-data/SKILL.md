---
name: visualize-health-data
description: Create private, descriptive Markdown visualizations from the annual health logs in health/YYYY.md. Use when the user asks to view, chart, compare, summarize, or explore their captured readiness, body metrics, sleep, or State of Mind data. Start with portable text views; use richer charts only when they add meaning. Never use this skill to capture new values, alter health records, diagnose, prescribe, score unbounded metrics, or publish personal health data.
---

# Visualize health data

Turn the local annual health log into a compact visual view while preserving privacy and the source meaning.

## Keep visualization separate from capture

- Treat `health/YYYY.md` as read-only.
- Use `$capture-daily-health` for accepting or changing health values.
- Never infer, normalize, carry forward, or repair a missing value.
- Never create another health record or edit a dated section.
- Do not stage, commit, push, sync, upload, or browse with health values.
- Return the view inline by default. Do not save a data-bearing visualization unless the user explicitly asks and its destination is confirmed private and ignored by Git.

## Build the first view

1. Resolve the requested dates. Default to the latest 14 recorded days when the user gives no period.
2. Read only the required `health/YYYY.md` files.
3. Run the deterministic renderer:

```bash
python3 .agents/skills/visualize-health-data/scripts/render_health_summary.py \
  --input health/2026.md \
  --days 14
```

Pass multiple annual files after `--input` when the requested range crosses a year boundary.

4. Present the renderer output inline.
5. Explain the encoding in one sentence:
   - `█`/`░` shows the source's real 0–100 readiness scale.
   - `●` on the seven-position mood scale shows the recorded valence category.
   - `↑`/`↓`/`→` shows that the recorded value is higher/lower/the same as the previous recorded day, without implying better or worse.
   - `·` means no recorded value for that field on that day.
   - `—` means the value has no additional visual encoding.
6. Describe only what is directly visible: dates, values, coverage, and changes between recorded values.

Use `--as-of YYYY-MM-DD` to end the view on a particular date. Use `--demo` to teach or test the view without reading private data.

## Preserve meaning

- Treat Outsiders App readiness as a tracker-provided label, not an independent assessment.
- Show HRV, sleeping heart rate, respiratory rate, blood oxygen, sleep duration, and sleep quality as recorded values.
- Do not invent targets, thresholds, healthy ranges, red/amber/green states, or lower-is-better/higher-is-better rules.
- Treat State of Mind as the user's recorded experience. Keep its seven categories ordered from Very Unpleasant to Very Pleasant without calling movement improvement or decline.
- Distinguish `Not captured`, `No data`, and an absent daily section when the distinction is relevant.
- Say “the recorded value changed” rather than claiming a trend when evidence is sparse.
- Do not make causal claims or connect two measures without an explicitly requested, appropriately caveated descriptive analysis.

## Choose the visual form

- Use the included Markdown snapshot and recent-record table first.
- Add a simple comparison only when there are at least two recorded values.
- Add time-series charts only when enough dated observations make the sequence legible.
- Prefer small multiples over combining measures with unrelated units on one axis.
- Label sample count and missingness for every richer view.

Read [references/design-principles.md](references/design-principles.md) before designing a richer text, SVG, or interactive visualization.

## Verify before reporting

- Confirm the rendered date range matches the request.
- Spot-check the latest displayed values against the source section.
- Confirm no invented values or evaluations appear.
- Confirm `git status` does not show a generated data-bearing artifact.
- Keep the response descriptive and non-medical.
