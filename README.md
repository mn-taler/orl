# Open Random Link – Web App

Standalone web app version of Open Random Link. Save links, open a random one in a new tab. Data is stored in your browser (localStorage). Works on desktop and mobile; you can add it to your home screen as a PWA.

## Project structure

The app is vanilla HTML, CSS, and ES modules. There is no build step.

```
index.html              # page shell
manifest.json           # PWA manifest
icons/                  # app icon
src/
  main.js               # composition root
  config.js             # shared constants
  domain/               # data model, no DOM
    store.js            # normalize, persist, import/export
    groups.js           # groups, subgroups, open filters
    links.js            # link entries
    tags.js             # tag catalog and palette
  data/
    preferences.js      # theme, amount, filter prefs
  ui/                   # DOM and events
    collection.js
    editor.js
    open-options.js
    settings.js
    chips.js
    status.js
    dom.js
styles/
  main.css              # imports the layers below
  tokens.css            # color and theme variables
  base.css              # reset and typography
  layout.css            # page frame and glass panels
  components.css        # settings, options, tags, collection
tests/                  # Vitest unit tests
```

`src/main.js` wires the UI modules. Domain code does not touch the DOM.

## Deploy to GitHub Pages

1. **Create a new repository** on GitHub (e.g. `open-random-link`).

2. **Put the webapp files in the repo root** so GitHub Pages can serve them:
   - Copy `index.html`, `manifest.json`, `README.md`, plus the `src`, `styles`, and `icons` folders.
   - The repo root should contain `index.html` directly.

3. **Enable GitHub Pages:** Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder **/ (root)** → Save. The site will be at `https://<username>.github.io/<repo-name>/`.

4. On your phone, open that URL and use the browser menu **Add to Home Screen** so it opens like an app.

## Run locally

Serve this folder (modules will not load from `file://`), e.g. `python3 -m http.server 8080`, then open `http://localhost:8080`.

## Tests

Unit tests cover the app logic (links, groups, tags, store, preferences) plus a few small DOM helpers. They run in Vitest with jsdom, without a real browser.

```
npm install
npm test
```

`npm run test:watch` re-runs tests on change. There are no integration or end-to-end tests; the domain layer is where the behavior lives.
