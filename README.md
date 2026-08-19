<p align="center">
  <img src="https://raw.githubusercontent.com/abrarulhasnain/abrarulhasnain/main/dist/training-log.svg" alt="Abrar ul Hasnain — training log" width="100%">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/abrarulhasnain/abrarulhasnain/main/dist/heatmap.svg" alt="Contribution heatmap with a real gradient-descent loss curve" width="100%">
</p>

<details>
<summary>How this works</summary>

<br>

Both cards are generated, not hand-drawn:

- **`dist/training-log.svg`** — a static card built by `scripts/generate-training-log.mjs`. Re-run it manually whenever your bio/stack changes:
  ```bash
  node scripts/generate-training-log.mjs
  ```
- **`dist/heatmap.svg`** — your real GitHub contribution grid, with a loss curve computed from your actual cumulative contributions (`loss = 1 - cumulative / total`). A GitHub Actions workflow (`.github/workflows/update-heatmap.yml`) regenerates it every day automatically, so it always reflects your latest activity.

Both are plain SVG with SMIL `<animate>` tags — no JS runtime needed to view them, they animate directly in the README.

</details>
