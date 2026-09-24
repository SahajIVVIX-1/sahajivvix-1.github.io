# Personal URL Redirect Service

Professional URL redirect website hosted on GitHub Pages (`https://sahajivvix-1.github.io`).

## Architecture Overview
- **Source of Truth:** `src/config/redirects.json` contains all redirect destinations and metadata.
- **Clean Routing:** During build, static HTML directories are generated (e.g. `/Github/index.html`, `/LinkedIn/index.html`) to ensure clean URLs without query parameters or file extensions.
- **Maintainability:** Adding a new redirect route only requires adding one entry into `src/config/redirects.json`.
- **Private Repo Compatibility:** Deploys via `npm run deploy` using `gh-pages` to publish the static build output to the `gh-pages` branch while keeping the source branch clean.

## Available Commands
- `npm run build`: Generates the static files into `dist/`.
- `npm run deploy`: Builds the project and publishes the `dist/` directory to GitHub Pages (`gh-pages` branch).
