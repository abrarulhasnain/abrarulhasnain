# Setup guide

This has to live in a special repo: one named **exactly** your GitHub
username. GitHub shows that repo's README on your profile page automatically.

## 1. Create the special repo

- On GitHub, click **New repository**.
- Name it exactly `abrarulhasnain` (same as your username).
- Make it **Public**.
- Don't add a README/gitignore/license — leave it empty, we already have our own.
- Create it.

## 2. Push these files with GitHub Desktop

- Open GitHub Desktop → **File → Add Local Repository** → pick this folder
  (`github-profile`).
- If it asks to initialize a repo, let it.
- **Repository → Repository Settings → Remote** (or "Publish repository")
  → point it at `abrarulhasnain/abrarulhasnain` on GitHub.
- Commit all the files, then **Push origin**.

## 3. Turn on the daily heatmap update

Nothing extra to configure — `.github/workflows/update-heatmap.yml` uses the
`GITHUB_TOKEN` that GitHub Actions provides automatically, since contribution
data is public.

- On GitHub, go to your new repo → **Actions** tab → you should see
  "Update contribution heatmap SVG".
- Click into it → **Run workflow** (the manual trigger) once, so
  `dist/heatmap.svg` gets generated from your real data immediately instead
  of waiting for tomorrow's scheduled run.
- After that it re-runs automatically every day at 05:30 UTC.

## 4. Whenever your bio/stack changes

Edit the `LINES` array in `scripts/generate-training-log.mjs`, then
regenerate locally:

```bash
npm install    # first time only (no dependencies to install, but sets things up)
node scripts/generate-training-log.mjs
```

Commit and push the updated `dist/training-log.svg` with GitHub Desktop.

## 5. Check your profile

Visit `github.com/abrarulhasnain` — the README should render both cards.
GitHub caches raw SVGs briefly, so give it a minute if it looks stale.
