# info.sahaj.si

Portfolio of **Sahaj Saliya**, an AI/ML engineer. The site is a static page that updates itself every hour: scrapers feed a build-time ML step, the static build is checked, and the result is published to GitHub Pages.

```
┌─ sources ───────────────┐   ┌─ analyse (build time) ─────────┐   ┌─ ship ───────────────────┐
│ GitHub REST + GraphQL   │   │ TF-IDF over repo READMEs        │   │ zero-dependency SSG       │
│ LeetCode GraphQL        │──▶│ PCA → 2-D latent map            │──▶│ quality gate (check.mjs)  │
│ X embed (best effort)   │   │ k-means topic clusters          │   │ skip if content unchanged │
│ LinkedIn (best effort)  │   │ skill × project evidence matrix │   │ gh-pages → info.sahaj.si  │
│ Résumé PDF (RESUME_URL) │   │ BM25 corpus for in-page RAG     │   └───────────────────────────┘
└─────────────────────────┘   └────────────────────────────────┘
        cron: 17 * * * *  ·  on push to info.sahaj.si  ·  manual dispatch
```

## What's on the page

| Section | The idea |
|---|---|
| Hero | The name runs as a **diffusion process**: particles diffuse into noise and are denoised back onto the glyphs. Hovering adds noise again. The tagline is decoded **token by token**, showing the sampling candidates. The portrait has a **ViT patch-attention** overlay that follows the cursor. |
| Model card | Your profile written as a Hugging Face–style model card, with real evaluation numbers. |
| Training run | Your experience plotted as a loss curve, with a checkpoint for each role. |
| Selected work | Each case study is drawn as the pipeline it runs, with an animated token packet and retry loops. |
| Repositories | Synced live, with a grid view and a **latent map** (PCA + k-means computed at build time). Cards show "≈ related" cosine neighbours. |
| Attention map | A skill × project matrix computed from READMEs and roles, so every skill has evidence. |
| Live signals | GitHub contribution heatmap, LeetCode breakdown, language mix, and per-source sync status. |
| AI workflow | The tools you use, plus this site's own pipeline with live status. |
| Ask my portfolio | In-browser RAG: BM25, plus optional MiniLM embeddings (Transformers.js) fused with RRF. Answers are extractive with citations and a retrieval trace, and the assistant abstains when confidence is low. Deep link: `/?q=your+question`. |
| ⌘K / Ctrl K / `/` | Command palette for navigation, actions and asking questions. |

The site is readable by machines too: `/llms.txt`, `/profile.json`, JSON-LD `Person`, a sitemap, and an OG card.

## Updating content

| Want to change… | Do this |
|---|---|
| Repos, stars, contributions, LeetCode | Nothing. It syncs hourly. |
| Headline, roles, projects, skills, certs | Edit `content/profile.json` and push. LinkedIn blocks scrapers (HTTP 999), so this file is the source of truth for LinkedIn-type content. |
| Résumé | Replace `public/resume/Sahaj_Saliya_Resume.pdf` and push, **or** set the repo variable `RESUME_URL` to a direct-download PDF link. The hourly sync then pulls it automatically. |
| Portrait / OG image | Replace the files in `public/img/`. |
| Force a sync now | Actions → *Sync & deploy* → **Run workflow**. |

## Local development

Requires Node ≥ 20. There are no npm dependencies.

```bash
npm run all      # scrape live data, then build into dist/
npm run dev      # build + serve on http://localhost:4321
npm run check    # quality gate (also runs in CI)
```

Set `GITHUB_TOKEN` (for example `GITHUB_TOKEN=$(gh auth token)`) to include the contribution calendar locally. Set `PREV_URL=` to disable reusing the deployed snapshot.

## Layout

```
content/profile.json   hand-maintained profile (source of truth for non-scrapable data)
scripts/scrape.mjs     live collectors with per-source fallback to the last good snapshot
scripts/ml.mjs         TF-IDF, PCA, k-means, evidence matrix, RAG corpus
scripts/build.mjs      static generator: inline SVG charts, SEO, llms.txt, redirects
scripts/check.mjs      quality gate: anchors, alt text, budgets, no leaked email
src/                   styles.css · app.js (motion, palette) · ask.js (RAG, lazy-loaded)
public/                fonts, images, résumé, favicon
```
