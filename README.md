# info.sahaj.si

The source of Sahaj Saliya's portfolio. **The original site is [info.sahaj.si](https://info.sahaj.si).**
Any other address showing this design or content is a copy.

The design, text, photos and data are © 2026 Sahaj Saliya, all rights reserved. The code in `assets/js/` and
`scripts/` is MIT. See [LICENSE](LICENSE).

```sh
npm ci
npm run build    # render the pages from content/ and data/
npm run data     # fetch GitHub data, rebuild embeddings, then build
npm run serve    # http://localhost:5173
```

An hourly GitHub Action refreshes `data/` and writes `data/build.json`, the build manifest the footer checks.
