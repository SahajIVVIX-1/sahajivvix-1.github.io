# Personal Redirect Gateway & Portfolio Hub

An editorial, high-performance personal URL gateway, interactive portfolio, and resume archive built with **React 18**, **Vite**, **TypeScript**, and **Tailwind CSS**. Designed for deployment to **GitHub Pages** (`https://sahajivvix-1.github.io/`) or any modern static hosting service (Vercel, Netlify, Cloudflare Pages).

---

## 🌟 Highlights & Features

- **Personal Gateway & Smart Routing**: Instant, secure redirect pipeline for personal endpoints (`/Github`, `/Linkedin`, `/Portfolio`, etc.) with live connection telemetry and pause/resume controls.
- **Curriculum Vitae Portal (`/Resume`)**: Integrated PDF viewer with zoom controls, smooth morphing preview toggle, and instant fallback download.
- **Living Organic Butterfly Transitions**: Center-sweeping curtain transitions that glide outward as content and background float in.
- **Localized Liquid Cursor Effect**: Natural underwater fluid displacement attached directly to the cursor that gently floats and recovers typography and visual elements via real spring physics.
- **Custom Frosted Glass Tooltip**: Replaces native browser tooltips with a glassmorphism hover card featuring an animated celestial motion logo (`RadialBurstLoader`), with viewport edge collision detection that never clips.
- **Visitor Telemetry & Intelligence Profile**: Non-invasive live network session diagnostics modal (IP detection, browser environment, approximate geolocation, connection latency).
- **GitHub Pages Native SPA Support**: Automatically generates `404.html` fallback and pre-generated slug directories on build for direct HTTP 200 navigation without client-side routing errors.

---

## 📋 Prerequisites

Before you start, make sure you have the following installed on your machine:

- **Node.js**: `v18.0.0` or higher (Node 20+ LTS recommended)
  - Verify with: `node -v`
- **npm**: `v9.0.0` or higher (bundled with Node.js)
  - Verify with: `npm -v`
- **Git**: Installed and configured
  - Verify with: `git --version`

---

## 🚀 Quick Start Guide

Get the project running on your local machine in under two minutes:

### 1. Clone the Repository
```bash
git clone https://github.com/sahajivvix-1/sahajivvix-1.github.io.git
cd sahajivvix-1.github.io
```
*(Or navigate to your project directory if already extracted).*

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server
```bash
npm run dev
```

The application will start on:
```
http://localhost:3000
```
Open this address in your browser. Any edits you make to the source code will update in real time via Vite.

---

## 📦 Available Scripts

All scripts can be run from the root project folder:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite local development server on `http://localhost:3000` |
| `npm run build` | Runs TypeScript compilation (`tsc -b`) and generates production bundle in `dist/` |
| `npm run preview` | Locally serves the production `dist/` folder to preview the built application |
| `npm run lint` | Runs TypeScript compiler checks to validate syntax and types |
| `npm run deploy` | Runs `npm run build` and automatically pushes `dist/` to the `gh-pages` branch |

---

## 🗂️ Project Structure

```
├── public/
│   ├── .nojekyll                 # Prevents GitHub Pages from ignoring files with underscores
│   ├── favicon.svg               # Vector brand favicon
│   ├── favicon.png               # High-res PNG favicon
│   └── resume/
│       ├── Resume_Icon.pdf       # Primary resume PDF asset
│       └── Resume_WIcon.pdf      # Secondary resume document asset
├── src/
│   ├── components/               # UI components
│   │   ├── AppHeader.tsx         # Universal high-blur frosted glass navigation header
│   │   ├── AppFooter.tsx         # Persistent bottom navigation footer
│   │   ├── BrandLogo.tsx         # Interactive living brand ribbon emblem
│   │   ├── Button.tsx            # Button component with transition hooks
│   │   ├── EditorialHero.tsx     # Typography hero with letter drift and blur resolve
│   │   ├── EditorialPdfViewer.tsx# PDF reader with zoom controls & canvas rendering
│   │   ├── FloatingWords.tsx     # Ambient floating background vocabulary words
│   │   ├── FlyingIpBadge.tsx     # Animated telemetry badge flight motion
│   │   ├── GatewayProcessCard.tsx# Live gateway diagnostics & terminal telemetry card
│   │   ├── GlassTooltip.tsx      # Frosted glass hover card with motion logo
│   │   ├── LiquidCursorEffect.tsx# Localized cursor fluid-flow displacement
│   │   ├── OrganicShapes.tsx     # Celestial winged butterfly curtain transition
│   │   ├── PortalShell.tsx       # Standard editorial container frame
│   │   ├── RadialBurstLoader.tsx # 12-spoke solar burst insignia motion logo
│   │   ├── SmoothCrossfadeText.tsx # Crossfading header/footer subtitle text
│   │   ├── SmoothHeaderControl.tsx # Dimensional sliding container for dynamic controls
│   │   ├── TransitionLink.tsx    # Route link with butterfly curtain transition trigger
│   │   └── VisitorProfileModal.tsx# Network telemetry and visitor intelligence modal
│   ├── config/
│   │   ├── redirects.ts          # Slug resolution logic & routing helpers
│   │   └── resume.ts             # Configuration paths for PDF documents & downloads
│   ├── context/
│   │   ├── HeaderFooterContext.tsx # Context for persistent header/footer subtitles
│   │   └── TransitionContext.tsx   # Global route transition orchestration
│   ├── data/
│   │   └── redirects.ts          # Central registry of redirect destinations
│   ├── pages/
│   │   ├── HomePage.tsx          # Main gateway portal and link index
│   │   ├── NotFoundPage.tsx      # Editorial 404 page with return route
│   │   ├── RedirectPage.tsx      # Destination resolution & dispatch screen
│   │   └── ResumePage.tsx        # Curriculum Vitae reader and download page
│   ├── types/
│   │   └── redirect.ts           # TypeScript interfaces for destination data
│   ├── utils/
│   │   └── visitorDetection.ts   # Client-side session and telemetry utilities
│   ├── App.tsx                   # Main React component, routing, and provider tree
│   ├── index.css                 # Tailwind CSS 4 setup and global animations
│   └── main.tsx                  # React DOM entry point
├── package.json                  # Dependencies, scripts, and project metadata
├── tsconfig.json                 # TypeScript compiler configuration
└── vite.config.ts                # Vite build plugins & GitHub Pages SPA generation
```

---

## 🛠️ How to Customize

### 1. Adding or Editing Redirect Links
All gateway URLs are managed in **`src/data/redirects.ts`**. To add or update a destination:

```typescript
// src/data/redirects.ts
export const REDIRECT_DESTINATIONS: Record<string, RedirectDestination> = {
  // Existing:
  github: {
    slug: 'Github',
    displayName: 'GitHub',
    destinationUrl: 'https://github.com/sahajivvix-1',
    description: 'Explore open-source repositories and engineering projects.',
    category: 'code',
    status: 'active',
  },
  // Add your new link:
  twitter: {
    slug: 'Twitter',
    displayName: 'X (Twitter)',
    destinationUrl: 'https://x.com/yourhandle',
    description: 'Personal thoughts and technology updates.',
    category: 'social',
    status: 'active',
  },
};
```

If you want the route to support direct URL hits on GitHub Pages (e.g., `https://domain.com/Twitter`), also add the slug to `PREGEN_SLUGS` in **`vite.config.ts`**:
```typescript
// vite.config.ts
const PREGEN_SLUGS = [
  'Github', 'github',
  'LinkedIn', 'linkedin',
  'Portfolio', 'portfolio',
  'Resume', 'resume',
  'Twitter', 'twitter', // <-- add here
];
```

### 2. Updating the Resume Document
1. Place your new PDF file inside **`public/resume/`** (e.g. `public/resume/MyResume.pdf`).
2. Update the filename in **`src/config/resume.ts`**:
```typescript
export const RESUME_CONFIG = {
  viewerPath: '/resume/MyResume.pdf',
  downloadFileName: 'Sahaj_Resume.pdf',
  documentTitle: 'Sahaj — Curriculum Vitae',
};
```

### 3. Modifying General Branding
- **Title and Meta tags**: Edit `<title>` and `<meta name="description">` in `index.html`.
- **Header Title**: Change the text in `src/components/AppHeader.tsx`.
- **Favicon**: Replace `public/favicon.svg` and `public/favicon.png`.

---

## 🚢 Production Build & Deployment

### Build the Project
To test the production build locally:
```bash
npm run build
npm run preview
```
The output files will be created in the `dist/` directory.

### Deploy to GitHub Pages
The project includes automated deployment via the `gh-pages` package:

```bash
npm run deploy
```

This single command will:
1. Compile TypeScript and build the optimized bundle into `dist/`.
2. Generate `404.html` and pre-rendered subfolders for clean URL routing.
3. Commit and push the `dist/` bundle to the `gh-pages` branch on GitHub.

#### GitHub Pages Settings:
1. In your GitHub repository, navigate to **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
3. Select branch: `gh-pages` and folder: `/ (root)`.
4. Click **Save**. Your site will be live within 1–2 minutes!

---

## ❓ Troubleshooting & FAQs

### Port 3000 is already in use
If port 3000 is occupied by another application, you can specify a different port when running the dev server:
```bash
npx vite --port 3001
```
Or kill the process currently using port 3000:
- **macOS / Linux**: `npx kill-port 3000`
- **Windows**: `netstat -ano | findstr :3000` followed by `taskkill /PID <PID> /F`

### Clean Reinstall
If you encounter missing modules or dependency conflicts on a new machine:
```bash
rm -rf node_modules dist package-lock.json
npm install
npm run build
```

### TypeScript or Linting Issues
To check for any typing mismatches across all files:
```bash
npm run lint
```

---

## 📄 License

Private personal project. Created for Sahaj's personal gateway and portfolio record.
