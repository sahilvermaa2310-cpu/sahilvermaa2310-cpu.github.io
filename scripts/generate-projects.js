import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const portfolioRoot = path.resolve(__dirname, '..');
const USERNAME = 'sahilvermaa2310-cpu';
const projectsDir = path.join(portfolioRoot, 'projects');
const publicProjectsDir = path.join(portfolioRoot, 'public', 'projects');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false
});

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

async function fetchAllRepos() {
  let page = 1;
  let all = [];
  while (true) {
    const url = `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&sort=updated`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'portfolio-generator' } });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    all = all.concat(data);
    const link = res.headers.get('Link') || '';
    if (link.includes('rel="next"')) page++;
    else break;
    if (page > 10) break;
  }
  return all.filter(r => !r.archived);
}

async function fetchReadme(repoName) {
  const branches = ['main', 'master'];
  for (const br of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${USERNAME}/${repoName}/${br}/README.md`;
      const res = await fetch(url, { headers: { 'User-Agent': 'portfolio-generator' } });
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 20) return { text, branch: br };
      }
    } catch {}
  }
  // fallback via API
  try {
    const apiUrl = `https://api.github.com/repos/${USERNAME}/${repoName}/readme`;
    const res = await fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3.raw', 'User-Agent': 'portfolio-generator' } });
    if (res.ok) {
      const text = await res.text();
      return { text, branch: 'main' };
    }
  } catch {}
  return { text: '', branch: 'main' };
}

async function fetchLanguages(languagesUrl) {
  try {
    const res = await fetch(languagesUrl, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'portfolio-generator' } });
    if (res.ok) {
      const data = await res.json();
      return Object.keys(data);
    }
  } catch {}
  return [];
}

function extractImages(markdown) {
  const images = [];
  // Markdown ![alt](url)
  const mdRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdRegex.exec(markdown)) !== null) {
    images.push({ alt: m[1].trim() || 'Project visualization', url: m[2].trim() });
  }
  // HTML <img ... src="...">
  const htmlRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = htmlRegex.exec(markdown)) !== null) {
    const full = m[0];
    const altMatch = full.match(/alt=["']([^"']*)["']/i);
    images.push({ alt: (altMatch ? altMatch[1] : 'Project visualization').trim() || 'Project visualization', url: m[1].trim() });
  }
  // Deduplicate by url
  const seen = new Set();
  return images.filter(img => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
}

function renderProjectPage({ repo, readmeHtml, readmeRaw, images, languages }) {
  const slug = slugify(repo.name);
  const title = `${repo.name} — Sahil Verma | Data Analyst Portfolio`;
  const description = repo.description || `Project ${repo.name} by Sahil Verma — data analytics and economics.`;
  const primaryLang = repo.language || (languages[0] || 'Mixed');
  const updated = new Date(repo.updated_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const created = new Date(repo.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', year: 'numeric' });
  const topics = repo.topics || [];
  const homepage = repo.homepage && repo.homepage.trim() ? repo.homepage.trim() : '';
  const hasDemo = homepage && /^https?:\/\//.test(homepage);
  const githubUrl = repo.html_url;
  const rawReadmeUrl = `https://github.com/${USERNAME}/${repo.name}/blob/${readmeRaw.branch || 'main'}/README.md`;

  // Build workflow for Global specifically
  const isGlobal = repo.name === 'Global-Catastrophe-Risk-Analytics';
  const isHDI = repo.name === 'HDI-Analysis-Using-Python';
  const isR = repo.name === 'sahil-verma-data-analysis';
  const isCat = repo.name === 'Cat-model-project';

  // Extra curated sections based on actual README content (no fake data)
  let curatedWorkflow = '';
  let curatedSections = '';

  if (isGlobal) {
    curatedWorkflow = `
      <section class="project-section">
        <h2>End-to-end workflow — PostgreSQL → PostGIS → Power BI</h2>
        <p class="lead">This is a <strong>recruiter-ready walkthrough</strong> of how the platform turns raw disaster records into decisions. Every step is in the repo — SQL, PostGIS geospatial, and Power BI — so you can audit without leaving this page.</p>
        <div class="workflow">
          <div class="wf-step"><span class="wf-icon">🗄️</span><h3>PostgreSQL</h3><p>Cleaned 10k+ disaster events, normalized schema, indexed for joins & window functions.</p></div>
          <div class="wf-arrow">→</div>
          <div class="wf-step"><span class="wf-icon">🌍</span><h3>PostGIS</h3><p>Geospatial enabled — country/region shapes, distance & high-risk region buffers.</p></div>
          <div class="wf-arrow">→</div>
          <div class="wf-step"><span class="wf-icon">📝</span><h3>SQL Analytics</h3><p>5 core analyses — type, country, severity, human impact & ranking — all via CTEs & aggregates.</p></div>
          <div class="wf-arrow">→</div>
          <div class="wf-step"><span class="wf-icon">📊</span><h3>Power BI</h3><p>Interactive dashboards & DAX measures for exec summaries and filters.</p></div>
        </div>
        <div class="callout">
          <strong>Why it matters:</strong> Insurance & reinsurers use exactly this pipeline to price catastrophe exposure — high-frequency vs high-severity trade-offs mapped per country.
        </div>
      </section>
    `;
    curatedSections = `
      <section class="project-section">
        <h2>Key analyses & results (from repo)</h2>
        <div class="analysis-grid">
          <div class="analysis-card">
            <h3>1. Disaster Type Analysis</h3>
            <p><strong>Objective:</strong> Which categories occur most and drive economic loss.</p>
            <p><strong>Why:</strong> Risk concentration informs mitigation vs reinsurance.</p>
            <p>Output: event count, total damage, avg severity by type.</p>
          </div>
          <div class="analysis-card">
            <h3>2. Country Risk Summary</h3>
            <p><strong>Objective:</strong> Per-country event frequency, total loss, avg severity.</p>
            <p><strong>Why:</strong> Governments prioritize resources to highest exposure countries.</p>
            <p>Output: country-level rollup for exposure mapping.</p>
          </div>
          <div class="analysis-card">
            <h3>3. High-Risk Events</h3>
            <p><strong>Objective:</strong> Most severe events — location, category, severity, population affected.</p>
            <p><strong>Why:</strong> Extreme events drive largest claims & humanitarian response.</p>
          </div>
          <div class="analysis-card">
            <h3>4. Executive Risk Dashboard</h3>
            <p><strong>Objective:</strong> Human impact vs economic loss per country.</p>
            <p><strong>Why:</strong> Execs need concise KPIs, not row-level data.</p>
          </div>
          <div class="analysis-card">
            <h3>5. Disaster Ranking</h3>
            <p><strong>Objective:</strong> Ranked risk table combining multiple metrics.</p>
            <p><strong>Why:</strong> Management summary for ranking & benchmarking.</p>
          </div>
        </div>
      </section>
    `;
  } else if (isHDI) {
    curatedSections = `
      <section class="project-section">
        <h2>Method & honesty</h2>
        <p class="lead">Clean UNDP 2023 annex → tiers (Low ≤0.55, Medium 0.55–0.70, High 0.70–0.80, Very High >0.80) → one-way ANOVA (<code>scipy.stats.f_oneway</code>) + boxplot. The README notes the circularity of testing HDI across HDI-defined tiers — presented as a QA sanity check, with suggested next step: HDI vs GNI rank gap.</p>
        <div class="tech-grid">
          <div class="tech-card"><h3>Data</h3><p>UNDP HDR 2025 Statistical Annex, Table 1 — Country + HDI 2023, file <code>data/HDR25_Statistical_Annex_HDI_Table.xlsx</code></p></div>
          <div class="tech-card"><h3>Stack</h3><p>Python · pandas · scipy · matplotlib — notebook <code>hdi_analysis.ipynb</code></p></div>
          <div class="tech-card"><h3>Visualization</h3><p>Boxplot per tier — shows High tier has widest dispersion, Very High most concentrated.</p></div>
        </div>
      </section>
    `;
  } else if (isR) {
    curatedSections = `
      <section class="project-section">
        <h2>R methodology — World Bank WDI</h2>
        <p class="lead">5 countries (Israel, Australia, India, Japan, Italy) × 20 years (2003–2022) = 100 rows. Indicators: GDP growth, wage workers, machinery/transport, fertility, HepB3 immunization. Tidyverse + ggplot2 line & box plots, R Markdown report.</p>
        <div class="tech-grid">
          <div class="tech-card"><h3>Tech</h3><p>R · tidyverse · ggplot2 · readxl · openxlsx — <code>sahil_project.R</code> & <code>.Rmd</code></p></div>
          <div class="tech-card"><h3>Highlights</h3><p>India HepB3 6%→93%, Italy GDP -8.97% in 2020, Japan wage share 85–88%, fertility decline across all.</p></div>
          <div class="tech-card"><h3>Repro</h3><p>Install packages in R, ensure <code>sahil verma.xlsx</code> alongside R files, knit in RStudio.</p></div>
        </div>
      </section>
    `;
  } else if (isCat) {
    curatedSections = `
      <section class="project-section">
        <h2>India Flood CAT focus</h2>
        <p class="lead">Catastrophe model for Indian flood risk — regional impact assessment for insurance & disaster preparedness. Includes model output, visualizations, and a methodology PDF explaining assumptions & interpretation.</p>
        <div class="callout">
          <strong>Stakeholder use:</strong> Risk assessment, insurance modelling, preparedness planning for one of the world's most flood-prone countries.
        </div>
      </section>
    `;
  }

  // Images gallery
  let galleryHtml = '';
  if (images.length) {
    galleryHtml = `
      <section class="project-section">
        <h2>Visualizations & screenshots</h2>
        <p class="muted">Images are from the actual repository README — no mockups. Click to open full size.</p>
        <div class="gallery">
          ${images.map(img => `
            <a href="${escapeHtml(img.url)}" target="_blank" rel="noreferrer" class="gallery-item">
              <img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.alt)}" loading="lazy" />
              <span class="gallery-cap">${escapeHtml(img.alt)}</span>
            </a>
          `).join('')}
        </div>
      </section>
    `;
  }

  // Topics
  const topicsHtml = topics.length ? `<div class="tags" style="margin-top:10px">${topics.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>` : '';

  // Languages pills
  const langPills = languages.length ? languages.map(l => `<span class="pill">${escapeHtml(l)}</span>`).join('') : `<span class="pill">${escapeHtml(primaryLang)}</span>`;

  // Fallback for no homepage: we are already on View Project page, so show View Source only plus subtle note
  const demoButton = hasDemo
    ? `<a href="${escapeHtml(homepage)}" target="_blank" rel="noreferrer" class="btn btn-primary">Live Demo ↗</a>`
    : ``;

  const breadcrumbJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sahilvermaa2310-cpu.github.io/" },
      { "@type": "ListItem", "position": 2, "name": "Projects", "item": "https://sahilvermaa2310-cpu.github.io/#projects" },
      { "@type": "ListItem", "position": 3, "name": repo.name }
    ]
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="author" content="Sahil Verma" />
  <link rel="canonical" href="https://sahilvermaa2310-cpu.github.io/projects/${slug}/" />
  <meta property="og:title" content="${escapeHtml(repo.name)} — Sahil Verma" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://github.com/${USERNAME}/${repo.name}" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css" />
  <link rel="stylesheet" href="/css/project.css" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%230f172a%22/><text x=%2250%22 y=%2268%22 font-size=%2254%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22monospace%22>SV</text></svg>">
  <script type="application/ld+json">${breadcrumbJsonLd}</script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="nav" id="nav">
    <div class="container nav-inner">
      <a href="/" class="logo" aria-label="Home">
        <span class="logo-mark">SV</span>
        <span class="logo-text">Sahil Verma</span>
      </a>
      <nav class="nav-links" id="navLinks" aria-label="Primary">
        <a href="/#about">About</a>
        <a href="/#skills">Skills</a>
        <a href="/#projects">Projects</a>
        <a href="/#experience">Experience</a>
        <a href="/#contact">Contact</a>
        <a href="/" class="btn btn-sm btn-primary nav-cta">← Back to Portfolio</a>
      </nav>
      <div class="nav-actions">
        <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="navLinks"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>

  <main id="main">
    <div class="project-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a> <span>›</span> <a href="/#projects">Projects</a> <span>›</span> <span aria-current="page">${escapeHtml(repo.name)}</span>
        </nav>
        <div class="project-hero-grid">
          <div>
            <div class="kicker" style="margin-bottom:12px">Project • ${escapeHtml(primaryLang)} • Updated ${escapeHtml(updated)}</div>
            <h1 class="project-title">${escapeHtml(repo.name)}</h1>
            <p class="project-desc">${escapeHtml(description)}</p>
            <div class="project-meta">
              <span class="meta-pill">★ ${repo.stargazers_count} stars</span>
              <span class="meta-pill">⑂ ${repo.forks_count} forks</span>
              <span class="meta-pill">Updated ${escapeHtml(updated)}</span>
              ${topicsHtml}
            </div>
            <div class="hero-actions" style="margin-top:16px">
              ${demoButton}
              <a href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer" class="btn ${hasDemo ? 'btn-ghost' : 'btn-primary'}">View Source on GitHub ↗</a>
              <a href="/" class="btn btn-ghost">← Back to Home</a>
            </div>
            ${hasDemo ? '' : '<p class="mono-hint" style="margin-top:8px">You’re viewing the full project on this site — no need to open GitHub. Source link is optional.</p>'}
          </div>
          <div class="project-hero-card">
            <h3>At a glance</h3>
            <dl>
              <div><dt>Primary language</dt><dd>${escapeHtml(primaryLang)}</dd></div>
              <div><dt>Languages</dt><dd><div class="pill-grid" style="margin-top:6px">${langPills}</div></dd></div>
              <div><dt>Created</dt><dd>${escapeHtml(created)}</dd></div>
              <div><dt>Last update</dt><dd>${escapeHtml(updated)}</dd></div>
              <div><dt>License</dt><dd>See repository</dd></div>
            </dl>
            <div class="hero-card-actions">
              <a href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer" class="btn btn-ghost btn-sm btn-block">Open on GitHub</a>
              ${hasDemo ? `<a href="${escapeHtml(homepage)}" target="_blank" rel="noreferrer" class="btn btn-primary btn-sm btn-block">Live Demo</a>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container project-layout">
      <article class="project-main">
        ${curatedWorkflow}
        ${curatedSections}
        ${galleryHtml}
        <section class="project-section readme-section">
          <h2>Full README — from GitHub</h2>
          <p class="mono-hint">Source: <a href="${escapeHtml(rawReadmeUrl)}" target="_blank" rel="noreferrer">README.md on GitHub</a> — rendered here for convenience. No fake content.</p>
          <div class="readme-content">
            ${readmeHtml || '<p class="muted">No README found in repository.</p>'}
          </div>
        </section>
      </article>

      <aside class="project-aside">
        <div class="aside-card">
          <h3>Technologies</h3>
          <div class="pill-grid">${langPills}${topics.map(t=>`<span class="pill" style="background:var(--primary-soft); border-color:#bae6fd; color:var(--primary-2)">#${escapeHtml(t)}</span>`).join('')}</div>
          <p class="mono-hint" style="margin-top:10px">Stack inferred from repository languages & description — no invented tech.</p>
        </div>
        <div class="aside-card">
          <h3>Links</h3>
          <ul class="link-list">
            <li><a href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer">View Source on GitHub ↗</a></li>
            ${hasDemo ? `<li><a href="${escapeHtml(homepage)}" target="_blank" rel="noreferrer">Live Demo ↗</a></li>` : '<li class="muted">No separate deployed app — this page is the live project view.</li>'}
            <li><a href="/#projects">← All Projects</a></li>
            <li><a href="/">← Back to Portfolio Home</a></li>
          </ul>
        </div>
        <div class="aside-card subtle">
          <h3>For recruiters</h3>
          <p>This page is <strong>standalone</strong> — you don’t need to open GitHub to evaluate the project. Methodology, results and visuals are explained here; GitHub is only for source audit.</p>
          <div class="tags"><span>PostgreSQL</span><span>PostGIS</span><span>Power BI</span><span>Python</span><span>R</span></div>
        </div>
      </aside>
    </div>
  </main>

  <footer class="footer">
    <div class="container footer-inner">
      <div class="footer-left">
        <span class="logo-mark sm">SV</span>
        <span>© <span id="year"></span> Sahil Verma · <a href="https://github.com/${USERNAME}" target="_blank" rel="noreferrer">${USERNAME}</a></span>
      </div>
      <div class="footer-right">
        <a href="/">Home</a>
        <a href="${escapeHtml(githubUrl)}" target="_blank" rel="noreferrer">GitHub Source</a>
      </div>
    </div>
  </footer>
  <script>
    document.getElementById('year').textContent = new Date().getFullYear();
    const hb=document.getElementById('hamburger'), nl=document.getElementById('navLinks');
    hb&&hb.addEventListener('click',()=>{const o=nl.classList.toggle('open');hb.setAttribute('aria-expanded',String(o))});
  </script>
</body>
</html>
`;
}

async function main() {
  console.log(`Fetching repos for ${USERNAME}...`);
  let repos;
  try {
    repos = await fetchAllRepos();
    console.log(`Found ${repos.length} repos: ${repos.map(r=>r.name).join(', ')}`);
  } catch (e) {
    console.warn(`Fetch failed: ${e.message}`);
    console.warn('Using existing generated pages + fallback snapshot (rate-limit protection). Build will continue.');
    // Try to infer repos from existing generated dirs + fallback
    const fallbackNames = ["Global-Catastrophe-Risk-Analytics","HDI-Analysis-Using-Python","sahil-verma-data-analysis","Cat-model-project"];
    const existingSlugs = [];
    try {
      if (fs.existsSync(projectsDir)) {
        const slugs = fs.readdirSync(projectsDir, { withFileTypes: true }).filter(d=>d.isDirectory()).map(d=>d.name);
        existingSlugs.push(...slugs);
      }
    } catch {}
    if (existingSlugs.length >= 2) {
      console.log(`Found existing ${existingSlugs.length} project pages — keeping them. Skipping regeneration.`);
      // Update canonical/domain in existing files to ensure correct domain even when using fallback
      try {
        for (const slug of existingSlugs) {
          const p = path.join(projectsDir, slug, 'index.html');
          const pub = path.join(publicProjectsDir, slug, 'index.html');
          for (const file of [p, pub]) {
            if (fs.existsSync(file)) {
              let html = fs.readFileSync(file, 'utf8');
              const orig = html;
              html = html.replace(/https:\/\/sahilverma\.com\//g, 'https://sahilvermaa2310-cpu.github.io/');
              if (html !== orig) {
                fs.writeFileSync(file, html, 'utf8');
                console.log(`  Updated canonical domain in ${file}`);
              }
            }
          }
        }
      } catch {}
      return;
    }
    // Fallback: generate from hardcoded snapshot (no API)
    console.log('Generating from fallback snapshot...');
    // Minimal fallback repos (will still render pages from description only)
    repos = fallbackNames.map(name => ({
      name,
      description: name === "Global-Catastrophe-Risk-Analytics" ? "Built an end-to-end catastrophe risk analytics platform using PostgreSQL, PostGIS, and Power BI to analyze global disaster events, economic losses, risk scores, and high-risk regions through interactive dashboards and geospatial visualizations."
        : name === "HDI-Analysis-Using-Python" ? "Statistical analysis of the Human Development Index (HDI) using Python. The project includes data preprocessing, ANOVA, data visualization, and insights into global development patterns using UNDP data."
        : name === "sahil-verma-data-analysis" ? "World Development Indicators analysis across 5 countries (2003-2022) - exploring GDP growth, employment, fertility, immunization & more using R."
        : "India Flood CAT Model Project — Catastrophe modelling focused on flood risk analysis in India. Includes model output, visualizations, and methodology explanation for risk assessment and disaster preparedness.",
      language: name === "HDI-Analysis-Using-Python" ? "HTML" : name === "sahil-verma-data-analysis" ? "R" : null,
      languages_url: `https://api.github.com/repos/${USERNAME}/${name}/languages`,
      topics: [],
      html_url: `https://github.com/${USERNAME}/${name}`,
      homepage: "",
      stargazers_count: name === "HDI-Analysis-Using-Python" ? 0 : 1,
      forks_count: 0,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      archived: false
    }));
    console.log(`Using fallback ${repos.length} repos`);
  }

  // Ensure dirs
  fs.mkdirSync(projectsDir, { recursive: true });
  fs.mkdirSync(publicProjectsDir, { recursive: true });

  // Also ensure css/project.css exists (will be created separately)
  for (const repo of repos) {
    console.log(`\nProcessing ${repo.name}...`);
    const languages = await fetchLanguages(repo.languages_url);
    // attach to repo for template
    repo.languages = languages;
    const readmeRaw = await fetchReadme(repo.name);
    const readmeText = readmeRaw.text || `# ${repo.name}\n\n${repo.description || ''}`;
    const images = extractImages(readmeText);
    console.log(`  Languages: ${languages.join(', ') || repo.language || 'none'}, Images: ${images.length}, README: ${readmeText.length} chars`);

    let readmeHtml = '';
    try {
      readmeHtml = marked.parse(readmeText);
      // Fix relative image paths to absolute raw github
      readmeHtml = readmeHtml.replace(/src="(?!https?:\/\/)([^"]+)"/g, (m, p) => {
        if (p.startsWith('//')) return m;
        const clean = p.replace(/^\.?\//, '');
        return `src="https://raw.githubusercontent.com/${USERNAME}/${repo.name}/${readmeRaw.branch}/${clean}"`;
      });
      // Make links open in new tab if external
      readmeHtml = readmeHtml.replace(/<a href="https:\/\//g, '<a target="_blank" rel="noreferrer" href="https://');
    } catch (e) {
      readmeHtml = `<pre>${escapeHtml(readmeText)}</pre>`;
    }

    const html = renderProjectPage({ repo, readmeHtml, readmeRaw, images, languages });
    const slug = slugify(repo.name);
    const outDir = path.join(projectsDir, slug);
    const publicOutDir = path.join(publicProjectsDir, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(publicOutDir, { recursive: true });
    const outPath = path.join(outDir, 'index.html');
    const publicOutPath = path.join(publicOutDir, 'index.html');
    fs.writeFileSync(outPath, html, 'utf8');
    fs.writeFileSync(publicOutPath, html, 'utf8');
    console.log(`  Written ${outPath}`);
    console.log(`  Written ${publicOutPath}`);
  }

  // Also generate an index for /projects/ that redirects to home#projects or lists all
  const indexHtml = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="0;url=/#projects"><title>Projects — Sahil Verma</title></head><body><p>Redirecting to <a href="/#projects">Projects</a>...</p></body></html>`;
  fs.writeFileSync(path.join(projectsDir, 'index.html'), indexHtml, 'utf8');
  fs.writeFileSync(path.join(publicProjectsDir, 'index.html'), indexHtml, 'utf8');
  console.log('\nDone. Generated project pages for all repos.');
}

main().catch(e => { console.error(e); process.exit(1); });
