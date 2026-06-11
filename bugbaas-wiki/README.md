# BugBaas Wiki

Static Netlify-ready wiki for BugBaas.

## Deploy

The repository has a root `netlify.toml` with:

- publish directory: `bugbaas-wiki`
- build command: none

Preview deploy:

```powershell
npm run wiki:deploy
```

Production deploy:

```powershell
npm run wiki:deploy:prod
```

These commands need a Netlify login or `NETLIFY_AUTH_TOKEN`.

## Local preview

Open `index.html` directly in a browser, or run:

```powershell
python -m http.server 8088 -d bugbaas-wiki
```

Then open `http://localhost:8088`.
