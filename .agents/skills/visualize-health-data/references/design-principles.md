# Health visualization design principles

## Portable Markdown

Use characters that remain distinct in common monospace fonts:

```text
█ ░  ─ │  ● ○  ·
```

Avoid fractional block sparklines (`▁▂▃▄▅▆▇`), Braille density patterns, and emoji charts. Their rendering or width varies across fonts and platforms.

Use a progress bar only when the source measure has a true visible scale. In this project, readiness percentage can use a 0–100 bar:

```text
Readiness  64%  ██████░░░░
```

Do not create bars for HRV, heart rate, respiratory rate, sleep duration, blood oxygen, or categorical sleep quality unless the user explicitly chooses and understands a descriptive scale. Never imply that a fuller bar means healthier.

Use a fixed seven-position State of Mind scale:

```text
Very Unpleasant  ●○○○○○○
Unpleasant       ○●○○○○○
Slightly Unpleasant ○○●○○○○
Neutral          ○○○●○○○
Slightly Pleasant ○○○○●○○
Pleasant         ○○○○○●○
Very Pleasant    ○○○○○○●
```

The position encodes category order, not clinical severity or a target.

## Richer charts

Choose the next form from the question, not from novelty:

- Change over time: one line or dot plot per measure, with gaps for missing dates.
- Distribution: dot plot or histogram with sample count.
- Relationships: scatter plot only when both measures have enough paired dates; label it descriptive and avoid causal language.
- Daily overview: small multiples sharing the same date axis.
- Coverage: calendar or matrix showing recorded versus missing fields.

Do not place measures with different units on one numeric axis. Avoid dual axes. Show raw points when the sample is small.

## Interaction

For an interactive view, useful controls are:

- Date range
- Measure selection
- Raw values versus change from the first recorded value
- Missing-data visibility
- Annotation toggle for source labels

Keep data local. Prefer a self-contained local artifact with no analytics, external fonts, CDNs, or network requests. Do not persist a data-bearing artifact unless the user explicitly requests it and approves a private, Git-ignored destination.

## Honest framing

Every view should make these clear:

- Source and units
- Selected date range
- Number of recorded observations
- Missing values
- Whether an encoding uses a source scale, category order, or observed data range

Never add reference ranges, targets, forecasts, diagnoses, treatment suggestions, or causal conclusions.
