# Maintenance site

Everything for the info.sahaj.si maintenance page lives in this folder. Edit files here only.

```
maintenance/
├── index.html            # the page
├── favicon.ico           # fallback icon browsers request automatically
├── .nojekyll             # tells GitHub Pages to serve files as-is
└── assets/
    ├── brand/            # logos
    │   ├── logo-app-icon.png    # black rounded-square S. (512px), shown on the page
    │   ├── logo-monogram.svg    # white S. monogram, vector
    │   └── logo-monogram.png
    └── icons/            # favicons and app icons
        ├── favicon-32.png
        ├── favicon-64.png
        ├── apple-touch-icon.png # 180px, iPhone home screen
        └── icon-512.png
```

## Deploying

The contents of this folder (not the folder itself) are copied to the root of the `gh-pages` branch, which serves info.sahaj.si.
Asset paths are absolute (`/assets/...`), so they resolve from the site root.
