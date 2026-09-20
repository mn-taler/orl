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
.github/workflows/      # GitHub Actions: test, then deploy
```

`src/main.js` wires the UI modules. Domain code does not touch the DOM.

## Deploy to GitHub Pages

CI is defined in `.github/workflows/ci.yml`. On every push and pull request it runs `npm test`. A deploy to GitHub Pages runs only on `main`, and only after those tests pass.

1. Once, in the GitHub repo: **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. After a green workflow the site is at `https://<username>.github.io/<repo-name>/`.
3. On your phone, open that URL and use the browser menu **Add to Home Screen**.

This works on a free GitHub account. Actions minutes are free for public repositories. GitHub Pages on the free plan is also meant for public repos.

Project Pages share origin (`https://<user>.github.io`) across repos. Another site on that host can read the same `localStorage`. Use a custom domain if you want isolation, and do not store secrets in link URLs.

## Run locally

Serve this folder (modules will not load from `file://`), e.g. `python3 -m http.server 8080`, then open `http://localhost:8080`.

## Tests

Unit tests cover the app logic (links, groups, tags, store, preferences) plus a few small DOM helpers. They run in Vitest with jsdom, without a real browser.

```
npm install
npm test
```

`npm run test:watch` re-runs tests on change. There are no integration or end-to-end tests; the domain layer is where the behavior lives.
