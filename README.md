# info.sahaj.si

## Folder structure

```
/
├── index.html              # what visitors see at info.sahaj.si (currently the maintenance page)
├── favicon.ico             # fallback icon browsers request automatically
├── maintenance/
│   └── index.html          # maintenance page (source of truth)
└── assets/
    ├── brand/              # logos
    │   ├── logo-app-icon.png    # black rounded-square S. (512px)
    │   ├── logo-monogram.svg    # white S. monogram, vector
    │   └── logo-monogram.png
    └── icons/              # favicons and app icons
        ├── favicon-32.png
        ├── favicon-64.png
        ├── apple-touch-icon.png # 180px, iPhone home screen
        └── icon-512.png
```

All asset paths are absolute (`/assets/...`), so the maintenance page works both at `/` and at `/maintenance/`.

## Turning maintenance mode on or off

On: `cp maintenance/index.html index.html`, commit, deploy.
Off: replace `index.html` with the real site's page, commit, deploy. The maintenance page stays reachable at `/maintenance/`.
