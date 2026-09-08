# Sahil Verma — Data Analyst Portfolio

Modern, fast, accessible portfolio for a Data Analyst / Data Science fresher — built with vanilla HTML/CSS/JS + Vite.

## Features
- **Responsive** — mobile hamburger, fluid grids, accessible semantics
- **GitHub API integration** — auto-fetches public repos (`/users/:user/repos`), shows name, description, languages, topics, stars/forks, GitHub link + live demo (repo `homepage`).
- **Caching & rate-limit handling** — 10-min localStorage cache, graceful fallback to featured projects.
- **Sections** — About, Skills, Projects, Experience/Education, Contact
- **Subtle animations** — IntersectionObserver reveals, typed role loop, count-up stats
- **Contact form** — validates and opens `mailto:` (no backend needed)
- **Accessibility** — skip link, focus-visible, aria-live for projects, keyboard nav
- **Performance** — no framework, system fonts + Inter/Sora, <30KB CSS, Vite optimized build

## Quick start

```bash
# from portfolio folder
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview  # preview build
```

Or open `index.html` directly (works, but use Vite for hot reload).

## Customize
Edit `js/config.js`:

```js
githubUsername: "sahilvermaa2310-cpu",
name: "Sahil Verma",
social: { github: "https://github.com/sahilvermaa2310-cpu", linkedin: "...", email: "mailto:..." },
resumeUrl: "/assets/resume.pdf",
featuredProjects: [ ... ] // real snapshot fallback — auto-updated when you push a new repo
```

- Place resume PDF at `assets/resume.pdf` and update `resumeUrl`.
- Change colors in `css/style.css` `:root` variables.
- Projects: all public repos for `sahilvermaa2310-cpu` load automatically on page open; **View All Projects on GitHub →** links to `https://github.com/sahilvermaa2310-cpu?tab=repositories`.

## Folder
```
portfolio/
  index.html
  css/style.css
  js/app.js
  js/config.js
  assets/
  package.json
  vite.config.js
```

## GitHub API notes
- **Live & automatic**: Fetches `https://api.github.com/users/sahilvermaa2310-cpu/repos?per_page=100` with pagination — new public repos appear without code changes.
- **No secret in frontend**: Unauthenticated (60/hr) with 10-min cache + languages enrichment for top 12. No private credential exposed.
- **Ordering**: Relevance-ranked (catastrophe/HDI/economics/analytics first), then stars, then updated — less relevant still visible with search/filter.
- If rate-limited, shows real snapshot fallback (not fake) and retries next load.

## Deployment
`npm run build` → upload `dist/` to GitHub Pages / Netlify / Vercel. For GitHub Pages, set `base` in `vite.config.js` if repo is not root.

---
Built for Sahil Verma — HDI research, Power BI, Python/R/SQL.
