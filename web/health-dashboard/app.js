const query = new URLSearchParams(window.location.search);
const requestedDays = Number(query.get("days") ?? 14);
const days = Number.isFinite(requestedDays) && requestedDays > 0
  ? Math.floor(requestedDays)
  : 14;
const asOf = query.get("asOf");

const moodOrder = [
  "Very Unpleasant",
  "Unpleasant",
  "Slightly Unpleasant",
  "Neutral",
  "Slightly Pleasant",
  "Pleasant",
  "Very Pleasant",
];
const missingValues = new Set(["", "Not captured", "No data"]);

function recorded(value) {
  return value != null && !missingValues.has(String(value).trim());
}

function display(value) {
  return recorded(value) ? String(value) : "·";
}

function numericValue(value) {
  if (!recorded(value)) return null;
  const match = String(value).replaceAll(",", "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function durationMinutes(value) {
  if (!recorded(value)) return null;
  const match = String(value).trim().match(/^(?:(\d+)h\s*)?(?:(\d+)m)?$/);
  if (!match || (!match[1] && !match[2])) return null;
  return Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0);
}

function moodPosition(value) {
  const position = moodOrder.indexOf(value);
  return position === -1 ? null : position;
}

function durationLabel(minutes) {
  if (minutes == null) return "·";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function plainNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
}

function dateLabel(isoDate) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function absentDayCount(firstDay, lastDay, selectedRecords) {
  const recordedDays = new Set(selectedRecords.map((record) => record.day));
  const cursor = new Date(`${firstDay}T00:00:00Z`);
  const end = new Date(`${lastDay}T00:00:00Z`);
  let missing = 0;

  while (cursor <= end) {
    if (!recordedDays.has(cursor.toISOString().slice(0, 10))) missing += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return missing;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function changeDetails(current, previous, unit, formatDifference = plainNumber) {
  if (current == null || previous == null) {
    return { symbol: "—", text: "No comparison", label: "No previous recorded value" };
  }

  const difference = current - previous;
  if (difference === 0) {
    return { symbol: "→", text: "same", label: "Same as previous recorded day" };
  }

  const symbol = difference > 0 ? "↑" : "↓";
  const amount = formatDifference(Math.abs(difference));
  const suffix = unit ? ` ${unit}` : "";
  const direction = difference > 0 ? "higher" : "lower";
  return {
    symbol,
    text: `${amount}${suffix}`,
    label: `${amount}${suffix} ${direction} than previous recorded day`,
  };
}

function countLabel(values, total) {
  const count = values.filter((value) => value != null).length;
  const missing = total - count;
  return `${count} recorded · ${missing} missing`;
}

function appendChange(parent, change) {
  const changeNode = el("div", "wellness-change");
  changeNode.setAttribute("aria-label", change.label);
  changeNode.append(
    el("span", "wellness-change__symbol", change.symbol),
    el("span", "wellness-change__value", change.text),
  );
  parent.append(changeNode);
}

function appendMetricShell(list, label, value) {
  const item = el("li", "wellness-metric");
  item.append(
    el("div", "wellness-metric__label", label),
    el("div", "wellness-metric__value", display(value)),
  );
  list.append(item);
  return item;
}

function appendReadiness(list, selected, latest, previous) {
  const value = latest.fields.Score;
  const item = appendMetricShell(list, "Readiness", value);
  const numeric = numericValue(value);
  const previousNumeric = numericValue(previous?.fields.Score);
  const values = selected.map((record) => numericValue(record.fields.Score));
  const visual = el("div", "wellness-visual");
  const track = el("div", "wellness-progress");
  track.setAttribute(
    "aria-label",
    numeric == null ? "Readiness not recorded" : `Readiness ${numeric} percent`,
  );
  track.setAttribute("role", "img");
  const fill = el("span", "wellness-progress__fill");
  fill.style.width = `${Math.max(0, Math.min(100, numeric ?? 0))}%`;
  track.append(fill);
  visual.append(track, el("div", "wellness-visual__meta", countLabel(values, selected.length)));

  const label = latest.fields.Description;
  if (recorded(label)) {
    visual.append(el("div", "wellness-source-label", `Tracker label: ${label}`));
  }

  item.append(visual);
  appendChange(item, changeDetails(numeric, previousNumeric, "pp"));
}

function rangePosition(value, minimum, maximum) {
  if (maximum === minimum) return 50;
  return ((value - minimum) / (maximum - minimum)) * 100;
}

function appendRangeVisual(
  list,
  selected,
  latest,
  previous,
  definition,
) {
  const rawValue = latest.fields[definition.field];
  const item = appendMetricShell(list, definition.label, rawValue);
  const points = selected
    .map((record) => ({
      day: record.day,
      raw: record.fields[definition.field],
      value: definition.parse(record.fields[definition.field]),
    }))
    .filter((point) => point.value != null);
  const visual = el("div", "wellness-visual");

  if (!points.length) {
    visual.append(
      el("div", "wellness-empty-visual", "Not recorded"),
      el("div", "wellness-visual__meta", `0 recorded · ${selected.length} missing`),
    );
  } else {
    const values = points.map((point) => point.value);
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = el("div", "wellness-range");
    const minimumLabel = el("span", "wellness-range__endpoint", definition.axis(minimum));
    const maximumLabel = el("span", "wellness-range__endpoint", definition.axis(maximum));
    const track = el("span", "wellness-range__track");
    track.setAttribute("role", "img");
    track.setAttribute(
      "aria-label",
      `${definition.label}: observed range ${definition.axis(minimum)} to ${definition.axis(maximum)} across ${points.length} recorded values`,
    );

    for (const point of points) {
      const marker = el(
        "span",
        point.day === latest.day
          ? "wellness-range__marker wellness-range__marker--latest"
          : "wellness-range__marker wellness-range__marker--history",
      );
      marker.style.left = `${rangePosition(point.value, minimum, maximum)}%`;
      marker.title = `${dateLabel(point.day)}: ${display(point.raw)}`;
      track.append(marker);
    }

    range.append(minimumLabel, track, maximumLabel);
    visual.append(
      range,
      el(
        "div",
        "wellness-visual__meta",
        countLabel(selected.map((record) => definition.parse(record.fields[definition.field])), selected.length),
      ),
    );
  }

  item.append(visual);
  appendChange(
    item,
    changeDetails(
      definition.parse(rawValue),
      definition.parse(previous?.fields[definition.field]),
      definition.deltaUnit,
      definition.deltaFormat ?? plainNumber,
    ),
  );
}

function appendSleepQuality(list, selected, latest, previous) {
  const current = latest.fields.Quality;
  const prior = previous?.fields.Quality;
  const item = appendMetricShell(list, "Sleep quality", current);
  const visual = el("div", "wellness-visual");
  const transition = recorded(current) && recorded(prior)
    ? `${prior} → ${current}`
    : "No comparison";
  visual.append(
    el("div", "wellness-category-transition", transition),
    el(
      "div",
      "wellness-visual__meta",
      countLabel(selected.map((record) => recorded(record.fields.Quality) ? 1 : null), selected.length),
    ),
  );
  item.append(visual);

  const same = recorded(current) && recorded(prior) && current === prior;
  const changed = recorded(current) && recorded(prior) && current !== prior;
  appendChange(item, {
    symbol: same ? "→" : "—",
    text: same ? "same" : changed ? "changed" : "No comparison",
    label: same
      ? "Same as previous recorded day"
      : changed
        ? "Different from previous recorded day; categories are not ranked"
        : "No previous recorded value",
  });
}

function appendMood(list, selected, latest, previous) {
  const current = latest.fields["Valence classification"];
  const item = appendMetricShell(list, "State of Mind", current);
  const visual = el("div", "wellness-visual");
  const scale = el("div", "wellness-mood-scale");
  scale.setAttribute(
    "aria-label",
    recorded(current) ? `Recorded State of Mind: ${current}` : "State of Mind not recorded",
  );
  scale.setAttribute("role", "img");

  moodOrder.forEach((mood) => {
    const marker = el("span", mood === current ? "is-current" : "");
    marker.title = mood;
    scale.append(marker);
  });

  visual.append(
    scale,
    el(
      "div",
      "wellness-visual__meta",
      countLabel(
        selected.map((record) => moodPosition(record.fields["Valence classification"])),
        selected.length,
      ),
    ),
  );
  item.append(visual);
  appendChange(
    item,
    changeDetails(moodPosition(current), moodPosition(previous?.fields["Valence classification"]), "positions"),
  );
}

function appendHistory(container, selected) {
  const details = el("details", "wellness-history");
  details.append(el("summary", "", "Recent recorded values"));
  const scroller = el("div", "wellness-history__scroller");
  const table = el("table", "wellness-history__table");
  const head = el("thead");
  const headingRow = el("tr");

  ["Date", "Readiness", "Sleep", "HRV", "Sleeping HR", "State of Mind"].forEach((label) => {
    headingRow.append(el("th", "", label));
  });
  head.append(headingRow);

  const body = el("tbody");
  [...selected].reverse().forEach((record) => {
    const row = el("tr");
    [
      dateLabel(record.day),
      display(record.fields.Score),
      display(record.fields.Duration),
      display(record.fields.HRV),
      display(record.fields["Sleeping heart rate"]),
      display(record.fields["Valence classification"]),
    ].forEach((value) => row.append(el("td", "", value)));
    body.append(row);
  });

  table.append(head, body);
  scroller.append(table);
  details.append(scroller);
  container.append(details);
}

function render(records) {
  const root = document.querySelector("#dashboard-root");
  const eligible = records
    .filter((record) => !asOf || record.day <= asOf)
    .sort((left, right) => left.day.localeCompare(right.day));
  const selected = eligible.slice(-days);

  if (!selected.length) {
    const empty = el("section", "wellness-dashboard wellness-dashboard--empty");
    empty.append(
      el("h1", "", "Health dashboard"),
      el("p", "", "No dated health records match this view."),
    );
    root.replaceChildren(empty);
    return;
  }

  const latest = selected.at(-1);
  const previous = selected.at(-2);
  const first = selected[0];
  const missingDays = absentDayCount(first.day, latest.day, selected);

  const dashboard = el("section", "wellness-dashboard");
  dashboard.setAttribute("aria-labelledby", "wellness-dashboard-title");

  const header = el("header", "wellness-dashboard__header");
  const headingGroup = el("div");
  headingGroup.append(
    el("p", "wellness-dashboard__eyebrow", "Latest recorded day"),
    el("h2", "wellness-dashboard__title", dateLabel(latest.day)),
  );
  headingGroup.lastElementChild.id = "wellness-dashboard-title";
  header.append(
    headingGroup,
    el(
      "p",
      "wellness-dashboard__coverage",
      `${selected.length} recorded day${selected.length === 1 ? "" : "s"} · ${missingDays} absent daily section${missingDays === 1 ? "" : "s"}`,
    ),
  );
  dashboard.append(header);

  const legend = el("div", "wellness-dashboard__legend");
  legend.append(
    el("span", "", "● latest"),
    el("span", "", "○ earlier"),
    el("span", "", "Arrows show recorded change, not health direction"),
  );
  dashboard.append(legend);

  const metrics = el("ul", "wellness-metrics");
  appendReadiness(metrics, selected, latest, previous);

  const numericDefinitions = [
    {
      field: "Duration",
      label: "Sleep",
      parse: durationMinutes,
      axis: durationLabel,
      deltaUnit: "",
      deltaFormat: durationLabel,
    },
    {
      field: "HRV",
      label: "HRV",
      parse: numericValue,
      axis: (value) => `${plainNumber(value)} ms`,
      deltaUnit: "ms",
    },
    {
      field: "Sleeping heart rate",
      label: "Sleeping HR",
      parse: numericValue,
      axis: (value) => `${plainNumber(value)} bpm`,
      deltaUnit: "bpm",
    },
    {
      field: "Respiratory rate",
      label: "Resp. rate",
      parse: numericValue,
      axis: (value) => `${plainNumber(value)} br/min`,
      deltaUnit: "br/min",
    },
    {
      field: "Blood oxygen",
      label: "Blood oxygen",
      parse: numericValue,
      axis: (value) => `${plainNumber(value)}%`,
      deltaUnit: "pp",
    },
  ];

  appendRangeVisual(metrics, selected, latest, previous, numericDefinitions[0]);
  appendSleepQuality(metrics, selected, latest, previous);
  numericDefinitions.slice(1).forEach((definition) => {
    appendRangeVisual(metrics, selected, latest, previous, definition);
  });
  appendMood(metrics, selected, latest, previous);
  dashboard.append(metrics);

  const note = el(
    "p",
    "wellness-dashboard__note",
    "Range tracks use only the selected recorded values. Position and arrows are descriptive; they do not indicate better, worse, healthy, or unhealthy.",
  );
  dashboard.append(note);
  appendHistory(dashboard, selected);
  root.replaceChildren(dashboard);
  document.title = `Health dashboard — ${dateLabel(latest.day)}`;
}

async function start() {
  const response = await fetch("/api/health", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Dashboard data request failed (${response.status})`);
  }
  const payload = await response.json();
  render(Array.isArray(payload.records) ? payload.records : []);
}

start().catch((error) => {
  console.error(error);
  const root = document.querySelector("#dashboard-root");
  const failure = el("section", "wellness-dashboard wellness-dashboard--empty");
  failure.append(
    el("h1", "", "Health dashboard"),
    el("p", "", "The local health data could not be loaded."),
    el("p", "wellness-dashboard__note", "Start this page with the project’s local dashboard server, then reload."),
  );
  root.replaceChildren(failure);
});
