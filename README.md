# Open Random Link – Web App

Standalone web app version of Open Random Link. Save links, open a random one in a new tab. Data is stored in your browser (localStorage). Works on desktop and mobile; you can add it to your home screen as a PWA.

## Deploy to GitHub Pages

1. **Create a new repository** on GitHub (e.g. `open-random-link`).

2. **Put the webapp files in the repo root** so GitHub Pages can serve them:
   - Copy the **contents** of this `webapp` folder into the root of the new repo: `index.html`, `style.css`, `app.js`, `manifest.json`, this `README.md`, and the `icons` folder (with `icon128.png`).
   - The repo root should contain `index.html` directly (no `webapp` subfolder).

3. **Enable GitHub Pages:** Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder **/ (root)** → Save. The site will be at `https://<username>.github.io/<repo-name>/`.

4. On your phone, open that URL and use the browser menu **Add to Home Screen** so it opens like an app.

## Run locally

Open `index.html` in a browser, or run a local server (e.g. `python3 -m http.server 8080` in this folder) and open `http://localhost:8080`.