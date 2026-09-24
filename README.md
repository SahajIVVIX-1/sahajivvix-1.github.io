# Personal Redirect Gateway

A clean, high-performance personal URL redirect gateway and link hub designed for GitHub Pages (`https://sahajivvix-1.github.io/`).

## Architecture

- **Framework:** React + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM (route-aware dynamic resolution with SPA fallback)
- **Centralized Configuration:** Destination definitions in `src/data/redirects.ts` and resolver in `src/config/redirects.ts`
- **Hosting:** GitHub Pages at root base path (`/`)

## Project Structure

```
src/
├── components/       # Reusable layout and UI components
├── pages/            # Top-level route pages (Home, Redirect, 404)
├── config/           # Route resolvers and destination configuration
├── data/             # Centralized redirect destination registry
├── hooks/            # Custom React hooks (useRedirect)
├── lib/              # General helper utilities
├── types/            # TypeScript interfaces & domain models
├── App.tsx           # Route definitions
├── main.tsx          # Application entry point
└── index.css         # Tailwind base and global reset styles
```

## Available Scripts

- `npm run dev`: Starts the local development server at port 3000.
- `npm run build`: Type-checks and creates production build in `dist/` with GitHub Pages SPA fallback.
- `npm run preview`: Previews the production build locally.
- `npm run deploy`: Builds and publishes the `dist/` bundle to GitHub Pages via `gh-pages`.
