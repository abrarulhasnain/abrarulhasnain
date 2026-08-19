#!/usr/bin/env node
/**
 * Generates dist/heatmap.svg — your real GitHub contribution grid, with a
 * "gradient descent" loss curve underneath it computed from your REAL
 * cumulative contributions (loss = 1 - cumulative_so_far / total). A
 * marble traces the curve left-to-right while the matching grid column
 * flashes, so the grid and the curve move in lockstep.
 *
 * Why compute loss from real data instead of a fake declining line?
 * It's the whole point of the card — the "loss decreasing" story should
 * actually be driven by your commit history, not decoration.
 *
 * Env vars:
 *   GH_USERNAME  - GitHub login to fetch contributions for (required)
 *   GH_TOKEN     - token for the GraphQL API (required)
 *   OUTPUT_PATH  - where to write the SVG (default: dist/heatmap.svg)
 */

import fs from "node:fs";
import path from "node:path";

const USERNAME = process.env.GH_USERNAME;
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OUTPUT = process.env.OUTPUT_PATH || "dist/heatmap.svg";

// ---- layout constants -------------------------------------------------
const COLS = 53; // ~1 year of weeks, same as GitHub's own contribution graph
const ROWS = 7;
const CELL = 10;
const STEP = 12; // cell + gap
const GRID_X = 34;
const GRID_Y = 24;
const GRID_H = ROWS * STEP; // height of the cell grid
const CURVE_Y0 = GRID_Y + GRID_H + 34; // top of the loss-curve band
const CURVE_H = 70; // height of the loss-curve band
const WIDTH = GRID_X * 2 + COLS * STEP;
const HEIGHT = CURVE_Y0 + CURVE_H + 30;
const LOOP_DUR = 14; // seconds for one left-to-right pass
const FLASH_COLOR = "#7ee787";
const CURVE_COLOR = "#39d353";
const MARBLE_COLOR = "#7ee787";
const EMPTY_COLOR = "#161b22";

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

async function fetchWeeks() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: USERNAME } }),
  });
  if (!res.ok) {
    throw new Error(`GitHub API error ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

function fmt(n) {
  return Number(n.toFixed(4));
}

// Take the most recent COLS weeks, left-padding with empty weeks if the
// account is newer than COLS weeks old (same approach as GitHub's own graph).
function buildColumns(weeks) {
  const recent = weeks.slice(-COLS);
  const padCount = COLS - recent.length;
  const padded = Array.from({ length: padCount }, () => ({
    contributionDays: Array.from({ length: ROWS }, () => ({ contributionCount: 0, color: EMPTY_COLOR })),
  })).concat(recent);

  return padded.map((week, col) => ({
    col,
    total: week.contributionDays.reduce((s, d) => s + (d.contributionCount || 0), 0),
    days: week.contributionDays.map((d, row) => ({
      row,
      count: d.contributionCount || 0,
      color: d.color || EMPTY_COLOR,
    })),
  }));
}

// loss[col] = 1 - (cumulative contributions through this column) / (total)
function computeLoss(columns) {
  const total = columns.reduce((s, c) => s + c.total, 0) || 1; // avoid /0
  let cum = 0;
  return columns.map((c) => {
    cum += c.total;
    return 1 - cum / total;
  });
}

function colX(col) {
  return GRID_X + col * STEP;
}

function buildGrid(columns, keyTimeForCol) {
  let svg = "";
  for (const col of columns) {
    for (const d of col.days) {
      const x = colX(col.col);
      const y = GRID_Y + d.row * STEP;
      if (d.count === 0) {
        svg += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${d.color}"/>\n`;
        continue;
      }
      const t = keyTimeForCol(col.col);
      const dur = 0.01;
      svg +=
        `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${d.color}">` +
        `<animate attributeName="fill" dur="${LOOP_DUR}s" repeatCount="indefinite" ` +
        `keyTimes="0;${fmt(t)};${fmt(t + dur)};1" values="${d.color};${d.color};${FLASH_COLOR};${d.color}"/>` +
        `</rect>\n`;
    }
  }
  return svg;
}

function buildCurve(columns, loss) {
  const points = columns.map((c) => {
    const x = colX(c.col) + CELL / 2;
    const y = CURVE_Y0 + (1 - loss[c.col]) * CURVE_H;
    return [fmt(x), fmt(y)];
  });
  const pathD = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const pathLen = COLS * STEP * 1.4; // rough overestimate is fine for a draw-in effect

  const curveDraw =
    `<path d="${pathD}" fill="none" stroke="${CURVE_COLOR}" stroke-width="2" opacity="0.9" ` +
    `stroke-dasharray="${pathLen}" stroke-dashoffset="${pathLen}">` +
    `<animate attributeName="stroke-dashoffset" from="${pathLen}" to="0" dur="${LOOP_DUR}s" repeatCount="indefinite" calcMode="linear"/>` +
    `</path>`;

  const marble =
    `<circle r="3.2" fill="${MARBLE_COLOR}">` +
    `<animateMotion path="${pathD}" dur="${LOOP_DUR}s" repeatCount="indefinite"/>` +
    `</circle>`;

  const axisY = CURVE_Y0 + CURVE_H;
  const axis =
    `<line x1="${GRID_X}" y1="${CURVE_Y0 - 4}" x2="${GRID_X}" y2="${axisY}" stroke="#4d5b4d"/>` +
    `<line x1="${GRID_X}" y1="${axisY}" x2="${GRID_X + COLS * STEP}" y2="${axisY}" stroke="#4d5b4d"/>` +
    `<text x="${GRID_X}" y="${CURVE_Y0 - 10}" font-family="Courier New, monospace" font-size="10" fill="#4d5b4d">loss (real, from contributions)</text>`;

  return axis + curveDraw + marble;
}

// keyTime a column is reached, scaled to leave a little headroom at both ends
function keyTimeForCol(col) {
  const span = 0.96;
  return 0.02 + (col / (COLS - 1)) * span;
}

function buildSvg(weeks) {
  const columns = buildColumns(weeks);
  const loss = computeLoss(columns);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="14" fill="#0a0e0a"/>
<text x="${GRID_X}" y="16" font-family="Courier New, monospace" font-size="11" fill="#4d5b4d">contributions (last ${COLS} weeks)</text>
${buildGrid(columns, keyTimeForCol)}
${buildCurve(columns, loss)}
<rect x="3" y="3" width="${WIDTH - 6}" height="${HEIGHT - 6}" rx="14" fill="none" stroke="#39d353" stroke-width="1.5" opacity="0.5"/>
</svg>`;
}

async function main() {
  if (!USERNAME) {
    console.error("Missing GH_USERNAME env var");
    process.exit(1);
  }
  if (!TOKEN) {
    console.error("Missing GH_TOKEN / GITHUB_TOKEN env var");
    process.exit(1);
  }
  console.log(`Fetching contributions for ${USERNAME}...`);
  const weeks = await fetchWeeks();
  const svg = buildSvg(weeks);
  const outPath = path.resolve(OUTPUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}

// Only run when executed directly (`node generate-heatmap.mjs`), not when
// imported — this is what lets a test script reuse buildSvg() with mock
// data instead of hitting the real GitHub API.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { buildSvg, buildColumns, computeLoss };
