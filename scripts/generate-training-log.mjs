#!/usr/bin/env node
/**
 * Generates the static "Training Log" profile card (dist/training-log.svg).
 *
 * Unlike generate-heatmap.mjs, this one does NOT need live GitHub data —
 * it's just your bio/stack rendered as a fake "training script" terminal
 * log. Run it manually whenever you want to update your info:
 *
 *   node scripts/generate-training-log.mjs
 *
 * Why generate this instead of hand-writing the SVG?
 * The typing animation needs a <clipPath> + <animate> pair PER LINE, each
 * with a slightly later start time (so lines type out one after another).
 * Writing that by hand for 16+ lines is error-prone and painful to edit —
 * a script keeps content and timing in sync automatically whenever you
 * add/remove a line.
 */

import fs from "node:fs";
import path from "node:path";

const OUTPUT = "dist/training-log.svg";

// ---- layout constants -------------------------------------------------
const WIDTH = 980;
const HEIGHT = 460;
const RIGHT_X = 340; // where the terminal log column starts
const LINE_HEIGHT = 21;
const LOG_START_Y = 56;
const TYPE_DUR = 0.34; // seconds to "type" each line
const LINE_GAP = 0.11; // stagger between lines starting

// ---- colors (dark hacker / classic green terminal) --------------------
const COLORS = {
  bg: "#0a0e0a",
  border: "#39d353",
  ascii: "#39d353",
  prompt: "#7ee787",
  section: "#58a6ff",
  key: "#7ee787",
  value: "#c9d1d9",
  dim: "#4d5b4d",
  curve: "#39d353",
  curveGlow: "#7ee787",
};

// "AH" stylized as blocky ASCII art
const ASCII_ART = [
  "   ###    ##  ##  ",
  "  #   #   ##  ##  ",
  " #     #  ##  ##  ",
  " #     #  ##  ##  ",
  " #######  ######  ",
  " #     #  ##  ##  ",
  " #     #  ##  ##  ",
  " #     #  ##  ##  ",
];

// The terminal "log" content. Each entry becomes one typed line.
// type: "prompt" | "section" | "kv" | "blank"
const LINES = [
  { type: "prompt", text: "abrar@ai-engineer:~$ python train.py --student abrar_ul_hasnain" },
  { type: "blank" },
  { type: "section", text: "training log" },
  { type: "kv", key: "epoch 01/∞", val: "base_role   : Frontend Developer         loss: 0.91" },
  { type: "kv", key: "epoch 02/∞", val: "fine_tune  +: Backend & AI Systems        loss: 0.68" },
  { type: "kv", key: "epoch 03/∞", val: "fine_tune  +: LLMs · RAG · AI Agents       loss: 0.44" },
  { type: "kv", key: "status", val: "training (no early stopping)" },
  { type: "blank" },
  { type: "section", text: "checkpoint" },
  { type: "kv", key: "role", val: "AI Engineer (in training)" },
  { type: "kv", key: "focus", val: "LLMs, RAG, AI Agents, ML Systems" },
  { type: "kv", key: "education", val: "BS Artificial Intelligence @ Air University" },
  { type: "blank" },
  { type: "section", text: "contact" },
  { type: "kv", key: "email", val: "abrarulhasnain7@gmail.com" },
  { type: "kv", key: "linkedin", val: "linkedin.com/in/muhammadabrar12" },
  { type: "kv", key: "github", val: "github.com/abrarulhasnain" },
  { type: "blank" },
  { type: "section", text: "live stats" },
  { type: "kv", key: "note", val: "see contribution graph below ↓" },
];

function fmt(n) {
  return Number(n.toFixed(3));
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Builds one typed line wrapped in a clip-path so it "reveals" left-to-right.
function buildLine(line, index, y) {
  const begin = fmt(0.4 + index * LINE_GAP);
  const clipId = `lc${index}`;
  const estWidth = 700; // wide enough to cover the longest line

  let spans = "";
  if (line.type === "blank") {
    return { clip: "", group: `<g clip-path="url(#${clipId})"><text x="${RIGHT_X}" y="${y}"></text></g>`, clipDef: "" };
  }
  if (line.type === "prompt") {
    spans = `<tspan class="prompt">${escapeXml(line.text)}</tspan>`;
  } else if (line.type === "section") {
    spans = `<tspan class="section">-- ${escapeXml(line.text)} </tspan><tspan class="dim">${"-".repeat(40)}</tspan>`;
  } else if (line.type === "kv") {
    const paddedKey = line.key.padEnd(11, " ");
    spans = `<tspan class="key">${escapeXml(paddedKey)}</tspan><tspan class="dim">: </tspan><tspan class="value">${escapeXml(line.val)}</tspan>`;
  }

  const clipDef = `<clipPath id="${clipId}"><rect x="${RIGHT_X}" y="${y - 16}" width="0" height="22"><animate attributeName="width" from="0" to="${estWidth}" dur="${TYPE_DUR}s" begin="${begin}s" fill="freeze"/></rect></clipPath>`;
  const group = `<g clip-path="url(#${clipId})"><text x="${RIGHT_X}" y="${y}" class="mono">${spans}</text></g>`;
  return { clipDef, group };
}

function buildLog() {
  let clipDefs = "";
  let groups = "";
  LINES.forEach((line, i) => {
    const y = LOG_START_Y + i * LINE_HEIGHT;
    const { clipDef, group } = buildLine(line, i, y);
    clipDefs += clipDef;
    groups += group + "\n";
  });

  // blinking cursor after the last line
  const cursorY = LOG_START_Y + LINES.length * LINE_HEIGHT;
  const cursorBegin = fmt(0.4 + LINES.length * LINE_GAP + TYPE_DUR);
  const cursor = `<rect x="${RIGHT_X}" y="${cursorY - 14}" width="8" height="16" fill="${COLORS.prompt}" opacity="0">
    <animate attributeName="opacity" values="0;1;0" dur="1s" begin="${cursorBegin}s" repeatCount="indefinite"/>
  </rect>`;

  return { clipDefs, groups, cursor };
}

function buildAsciiArt() {
  const startX = 40;
  const startY = 70;
  const lineHeight = 15;
  const tspans = ASCII_ART.map(
    (row, i) => `<tspan x="${startX}" y="${startY + i * lineHeight}" xml:space="preserve">${escapeXml(row)}</tspan>`
  ).join("\n");
  return `<text class="ascii">${tspans}</text>`;
}

// Small declining "loss curve" under the ASCII art — ties the visual
// theme (training loop) together. Purely decorative, drawn with a
// stroke-dasharray "draw-in" animation.
function buildLossCurve() {
  const x0 = 40, y0 = 240, w = 260, h = 90;
  // A few points that trend downward with a little noise, like a real loss curve
  const points = [
    [0, 0], [30, 12], [55, 30], [80, 34], [110, 55],
    [140, 58], [170, 70], [200, 74], [230, 82], [260, 86],
  ].map(([px, py]) => [x0 + px, y0 + py]);
  const path = points.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");

  return `
  <text x="${x0}" y="${y0 - 14}" class="mono dim" font-size="11">loss</text>
  <line x1="${x0}" y1="${y0 - 4}" x2="${x0}" y2="${y0 + h}" stroke="${COLORS.dim}" stroke-width="1"/>
  <line x1="${x0}" y1="${y0 + h}" x2="${x0 + w}" y2="${y0 + h}" stroke="${COLORS.dim}" stroke-width="1"/>
  <text x="${x0 + w - 20}" y="${y0 + h + 16}" class="mono dim" font-size="11">epoch</text>
  <path d="${path}" fill="none" stroke="${COLORS.curve}" stroke-width="2" filter="url(#glow)"
    stroke-dasharray="400" stroke-dashoffset="400">
    <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2.4s" begin="1.2s" fill="freeze" calcMode="spline" keySplines="0.25 0.1 0.25 1"/>
  </path>
  <circle r="3.5" fill="${COLORS.curveGlow}">
    <animateMotion path="${path}" dur="2.4s" begin="1.2s" fill="freeze"/>
  </circle>`;
}

function buildSvg() {
  const { clipDefs, groups, cursor } = buildLog();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<defs>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
    <feGaussianBlur stdDeviation="2.2" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#39d353"/>
    <stop offset="50%" stop-color="#58a6ff"/>
    <stop offset="100%" stop-color="#39d353"/>
  </linearGradient>
  ${clipDefs}
  <style>
    .mono    { font-family: 'Courier New', Consolas, monospace; font-size: 13.5px; }
    .ascii   { font-family: 'Courier New', Consolas, monospace; font-size: 13px; fill: ${COLORS.ascii}; filter: url(#glow); }
    .prompt  { fill: ${COLORS.prompt}; font-weight: bold; }
    .section { fill: ${COLORS.section}; font-weight: bold; }
    .key     { fill: ${COLORS.key}; }
    .value   { fill: ${COLORS.value}; }
    .dim     { fill: ${COLORS.dim}; }
  </style>
</defs>

<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="14" fill="${COLORS.bg}"/>

${buildAsciiArt()}
${buildLossCurve()}

<line x1="320" y1="20" x2="320" y2="${HEIGHT - 20}" stroke="${COLORS.dim}" stroke-width="1" opacity="0.5"/>

${groups}
${cursor}

<rect x="3" y="3" width="${WIDTH - 6}" height="${HEIGHT - 6}" rx="14" fill="none" stroke="url(#borderGrad)" stroke-width="2" opacity="0.7">
  <animate attributeName="opacity" values="0.4;0.85;0.4" dur="3s" repeatCount="indefinite"/>
</rect>
</svg>`;
}

function main() {
  const svg = buildSvg();
  const outPath = path.resolve(OUTPUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, svg, "utf8");
  console.log(`Wrote ${outPath}`);
}

main();
