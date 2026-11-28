# Security Policy

This repository is the source of **https://info.sahaj.si**, the personal portfolio of Sahaj Saliya.
It is public so the site can be hosted and inspected. **It is not offered for reuse.**

## Use of this repository

- The design, text, photographs, images, certificates, data and brand (everything under `content/`, `data/` and
  `assets/` other than the code and third-party files named in [LICENSE](LICENSE)) are © Sahaj Saliya,
  **all rights reserved**. You may not copy, mirror, host, republish, modify or build on them, in whole or in part,
  without written permission.
- Do **not** deploy this repository, or any copy or fork of it, as a website of your own, and do not present any part
  of it as your own work or as belonging to anyone other than Sahaj Saliya.
- Do **not** use the personal data here (name, photos, CV, profile, achievements) to impersonate Sahaj Saliya, to
  build profiles of him, or to train or fine-tune machine-learning models.
- Forks exist only because GitHub allows them on public repositories; a fork grants no rights beyond [LICENSE](LICENSE).
  Copies found online will be reported to their host under the DMCA.

Permission requests: see the contact below.

## What the site does (its security model)

- A **static site** on GitHub Pages, served over HTTPS only. There is no server, no database, no login, no forms that
  send data anywhere, and no secrets in the code or in the published files.
- **No third-party requests.** Every script, font, model and image is served from info.sahaj.si itself; there are no
  CDNs, no analytics, no ads, no cookies and no IP lookup.
- The AI features (chat, search, "show it an image") run **entirely in the visitor's browser** with models stored in
  this repository. Text you type and images you choose never leave your device.
- The only third-party code shipped is listed with its licence in `assets/vendor/` and `assets/models/`.
- Builds run in GitHub Actions with the minimum token permissions; the published branch (`gh-pages`) is written only
  by `scripts/deploy-pages.sh`.

## Supported versions

Only the live site and the latest commit of the `info.sahaj.si` branch are supported. Older commits and forks get no
fixes.

## Reporting a vulnerability

Please report security problems **privately**, never in a public issue, pull request or discussion:

- GitHub: **Security → Report a vulnerability** on this repository (private advisory), or
- Email: **sahajs7959@gmail.com** with the subject `SECURITY: info.sahaj.si`.

Include what you found, where (URL or file), the steps to reproduce it and its impact. You will get an answer within
**7 days**, and a fix or a decision within **30 days** for confirmed issues. With your agreement you will be credited
once it is fixed.

### In scope

- info.sahaj.si and its subpaths, and the code in this repository.
- Cross-site scripting, content injection, a script or file that leaks visitor data or makes requests to another
  host, a secret committed to the repository, or a weakness in the GitHub Actions workflows.

### Out of scope

- Missing security headers that GitHub Pages does not let a site set (it allows no custom headers).
- Reports from automated scanners with no demonstrated impact, clickjacking on pages with no sensitive action,
  self-XSS, and issues in third-party services (GitHub itself, browsers).
- Denial-of-service, load or spam testing, social engineering and physical attacks: **do not attempt these.**

## Rules for testing

Test only against your own copy running locally (`node scripts/serve.mjs`) or with ordinary, light requests to the
live site. Do not access, change or destroy data that is not yours, and do not degrade the site for others.
Good-faith research that follows this policy will not be pursued legally; anything outside it is not authorised.
