# Atomix SP Tools

Internal tools for the Atomix Special Projects & Retail team.

Live at: `https://YOUR-USERNAME.github.io/atomix-tools/`

## Tools

| Tool | Status | Description |
|------|--------|-------------|
| [Labor Tracker](labor-tracker.html) | ✅ Live | Deploy staff, track hours by department, EOD clock-out |
| Project Tracker | 🔜 Soon | Special project status and deadlines |
| Daily Output Log | 🔜 Soon | Units completed per shift |

## How to deploy

1. Push this folder to a GitHub repo
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Site goes live at `https://YOUR-USERNAME.github.io/REPO-NAME/`

## Adding a new tool

1. Create a new `.html` file in the root (e.g. `project-tracker.html`)
2. Add a card for it in `index.html` inside the `.tools-grid` div
3. Copy the nav breadcrumb from `labor-tracker.html` into your new file
4. Push — GitHub Pages auto-deploys

## Notes

- All data is stored in `localStorage` — no backend, no server
- Data is per-browser, per-device
- Manager PIN defaults to `1234` — change it on first use
