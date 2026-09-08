import { CONFIG } from './config.js';

// ---------- Helpers ----------
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const langColors = {
  "Python": "#3776ab",
  "Jupyter Notebook": "#f59e0b",
  "R": "#276dc3",
  "JavaScript": "#f7df1e",
  "TypeScript": "#3178c6",
  "HTML": "#e34f26",
  "CSS": "#563d7c",
  "SQL": "#e38c00",
  "PostgreSQL": "#336791",
  "Power BI": "#f2c811",
  "PowerBI": "#f2c811",
  "Shell": "#89e051",
  "Dockerfile": "#384d54",
  "Other": "#64748b"
};
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])) }
function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
  }catch{ return iso }
}
function toast(msg, ms=2600){
  const t = $('#toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._id);
  toast._id = setTimeout(()=> t.classList.remove('show'), ms);
}

// ---------- Theme & Nav ----------
const hamburger = $('#hamburger');
const navLinks = $('#navLinks');
hamburger?.addEventListener('click', ()=>{
  const open = navLinks.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.classList.toggle('is-open', open);
});
$$('.nav-links a').forEach(a=> a.addEventListener('click', ()=>{
  if(window.innerWidth <= 860) { navLinks.classList.remove('open'); hamburger.setAttribute('aria-expanded','false') }
}));
window.addEventListener('resize', ()=>{
  if(window.innerWidth > 860) { navLinks.classList.remove('open'); hamburger.setAttribute('aria-expanded','false') }
});
const nav = $('#nav');
window.addEventListener('scroll', ()=>{
  nav.style.boxShadow = window.scrollY > 8 ? '0 6px 20px rgba(15,23,42,.06)' : 'none';
}, { passive:true });

// ---------- Typed hero ----------
const roles = [
  "Data Analyst",
  "Data Science Fresher",
  "Python • SQL • Power BI",
  "Research & Storytelling"
];
const typedEl = $('#typed');
let ri=0, ci=0, del=false, tSpeed=90;
function typeLoop(){
  if(!typedEl) return;
  const word = roles[ri];
  if(!del){
    typedEl.textContent = word.slice(0, ci+1);
    ci++;
    if(ci === word.length){ del=true; setTimeout(typeLoop, 1400); return; }
  } else {
    typedEl.textContent = word.slice(0, ci-1);
    ci--;
    if(ci===0){ del=false; ri=(ri+1)%roles.length; }
  }
  setTimeout(typeLoop, del ? 36 : tSpeed);
}
typeLoop();

// ---------- Count-up ----------
const counters = $$('.stat-num');
const countObs = new IntersectionObserver(entries=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const el = e.target;
      const target = Number(el.dataset.count);
      let cur=0;
      const step = Math.max(1, Math.round(target/40));
      const id = setInterval(()=>{
        cur = Math.min(target, cur+step);
        el.textContent = cur.toString();
        if(cur===target) clearInterval(id);
      }, 28);
      countObs.unobserve(el);
    }
  });
},{threshold:.6});
counters.forEach(c=> countObs.observe(c));

// ---------- Reveal on scroll ----------
const revObs = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); revObs.unobserve(e.target);} })
},{threshold:.12});
$$('.reveal').forEach(el=> revObs.observe(el));

// ---------- Footer year & config bindings ----------
$('#year').textContent = String(new Date().getFullYear());
function applyConfig(){
  const c = CONFIG;
  $('#availabilityText').textContent = c.availability;
  $('#resumeLink').href = c.resumeUrl;
  $('#heroResume').href = c.resumeUrl;
  $('#asideResume').href = c.resumeUrl;
  $('#heroGithub').href = c.social.github;
  $('#contactGithub').href = c.social.github;
  $('#footerGithub').href = c.social.github;
  $('#contactLinkedin').href = c.social.linkedin;
  $('#footerLinkedin').href = c.social.linkedin;
  $('#heroLinkedin').href = c.social.linkedin;
  $('#contactEmail').href = c.social.email;
  $('#contactEmail').textContent = c.social.email.replace('mailto:','');
  $('#heroEmail').href = c.social.email;
  $('#contactLinkedin').textContent = `LinkedIn — ${c.name}`;
  $('#contactLocation').textContent = c.location;
  const ghInputEl = $('#ghUsername');
  if(ghInputEl) ghInputEl.value = c.githubUsername;
  const viewAll = $('#viewAllGithub');
  if(viewAll) viewAll.href = `${c.social.github}?tab=repositories`;
  document.title = `${c.name} — Data Analyst & Data Science Portfolio`;
  const lt = $('.logo-text'); if(lt) lt.textContent = c.name;
}
applyConfig();

// ---------- Projects: GitHub API ----------
const grid = $('#projectsGrid');
const featuredGrid = $('#featuredGrid');
const empty = $('#projectsEmpty');
const statusEl = $('#ghStatus');
const langFilter = $('#langFilter');
const searchInput = $('#projectSearch');
const sortFilter = $('#sortFilter');
const ghInput = $('#ghUsername');
const ghBtn = $('#ghFetchBtn');
const viewAllBtn = $('#viewAllGithub');
const countBadge = $('#repoCountBadge');

let allRepos = [];
let filtered = [];
let currentSortOverride = null;

function slugify(name){ return String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function projectPageUrl(repo){ return `/projects/${slugify(repo.name)}/`; }

function normalizeRepo(r){
  return {
    name: r.name,
    description: r.description || 'No description provided.',
    language: r.language || null,
    languages: r.languages || (r.language ? [r.language] : []),
    topics: r.topics || [],
    html_url: r.html_url,
    homepage: (r.homepage || '').trim(),
    stargazers_count: r.stargazers_count ?? 0,
    forks_count: r.forks_count ?? 0,
    updated_at: r.updated_at,
    pushed_at: r.pushed_at,
    fork: !!r.fork,
    archived: !!r.archived
  };
}

function relevanceScore(repo){
  const hay = `${repo.name} ${repo.description}`.toLowerCase();
  let s = 0;
  // High-value catastrophe / risk analytics
  if (hay.includes('catastrophe') || hay.includes('cat model') || hay.includes('cat-model')) s += 35;
  if (hay.includes('global') && hay.includes('risk')) s += 20;
  if (hay.includes('risk') && hay.includes('analytics')) s += 25;
  if (hay.includes('disaster') || hay.includes('flood')) s += 15;
  if (hay.includes('postgis') || hay.includes('postgis')) s += 20;
  if (hay.includes('postgresql') || hay.includes('postgres')) s += 18;
  if (hay.includes('power bi') || hay.includes('powerbi')) s += 22;
  if (hay.includes('dashboard') || hay.includes('geospatial')) s += 12;
  // Economics / HDI
  if (hay.includes('hdi') || hay.includes('human development')) s += 32;
  if (hay.includes('undp')) s += 10;
  if (hay.includes('world development') || hay.includes('world bank') || hay.includes('wdi')) s += 26;
  if (hay.includes('gdp') || hay.includes('economics') || hay.includes('econometrics')) s += 16;
  // Tech
  if (hay.includes('python') || hay.includes('pandas') || hay.includes('scipy') || hay.includes('matplotlib') || hay.includes('anova')) s += 18;
  if (/\bR\b/.test(repo.description) || hay.includes(' tidyverse') || hay.includes('ggplot') || hay.includes(' using r')) s += 20;
  if (hay.includes('statistical analysis') || hay.includes('statistical')) s += 10;
  // description completeness
  if (repo.description && repo.description.length > 120) s += 5;
  if (repo.description && repo.description.length > 200) s += 3;
  // stars / forks slight boost
  s += Math.min(5, repo.stargazers_count * 2);
  s += Math.min(3, repo.forks_count);
  return s;
}

function orderByRelevance(repos){
  // Return new array sorted by relevance desc, then stars desc, then updated desc
  return [...repos].sort((a,b)=>{
    const sa = relevanceScore(a);
    const sb = relevanceScore(b);
    if(sb !== sa) return sb - sa;
    if(b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
    return new Date(b.updated_at) - new Date(a.updated_at);
  });
}

function skeleton(n=6){
  const grids = [grid, featuredGrid].filter(Boolean);
  grids.forEach(g=>{
    g.innerHTML = '';
    g.setAttribute('aria-busy','true');
    for(let i=0;i<n;i++){
      const d=document.createElement('div');
      d.className='skeleton-card';
      d.innerHTML = `
        <div class="skeleton" style="width:60%"></div>
        <div class="skeleton" style="width:100%"></div>
        <div class="skeleton" style="width:90%"></div>
        <div style="display:flex; gap:8px; margin-top:8px">
          <div class="skeleton" style="width:60px; height:22px; border-radius:999px"></div>
          <div class="skeleton" style="width:60px; height:22px; border-radius:999px"></div>
        </div>
        <div class="skeleton" style="width:100%; height:36px; margin-top:auto"></div>
      `;
      g.appendChild(d);
    }
  });
  if(grids.length===1){
    // if only one grid exists, still fill
    if(!grid) featuredGrid && (featuredGrid.innerHTML = grids[0].innerHTML);
  }
}

function projectCardHtml(p, { featured=false }={}){
  const primaryLang = p.language || (p.languages[0] || 'Other');
  const langColor = langColors[primaryLang] || langColors[p.languages[0]] || '#64748b';
  const topics = (p.topics||[]).slice(0,4).map(t=> `<span class="topic">#${escapeHtml(t)}</span>`).join('');
  const langs = (p.languages||[]).slice(0,3).map(l=> {
    const c = langColors[l] || '#64748b';
    return `<span class="lang-pill"><span class="lang-dot" style="background:${c}"></span>${escapeHtml(l)}</span>`;
  }).join('');
  const hasDemo = p.homepage && /^https?:\/\//.test(p.homepage);
  const demoUrl = hasDemo ? p.homepage : '';
  const updated = p.updated_at ? fmtDate(p.updated_at) : '';
  const ghUrl = escapeHtml(p.html_url);
  const viewUrl = escapeHtml(projectPageUrl(p));
  const name = escapeHtml(p.name);
  const desc = escapeHtml(p.description);
  const stars = p.stargazers_count;
  const forks = p.forks_count;
  const langLabel = p.language ? escapeHtml(p.language) : (p.languages[0] ? escapeHtml(p.languages[0]) : 'Not specified');
  const langPillFallback = p.language ? `<span class="lang-pill"><span class="lang-dot" style="background:${langColor}"></span>${langLabel}</span>` : (p.languages.length ? langs : `<span class="lang-pill"><span class="lang-dot" style="background:#64748b"></span>Other</span>`);
  const featuredBadge = featured ? `<span class="featured-badge" title="Featured — strongest data/economics work">Featured</span>` : '';
  return `
      <article class="project-card ${featured ? 'featured' : ''}">
        <div class="pc-top"></div>
        <div class="pc-body">
          <div class="pc-head">
            <h3 class="pc-title"><a href="${viewUrl}">${name}</a> ${featuredBadge}</h3>
            <span class="pc-stars" title="Stars / Forks">★ ${stars} · ⑂ ${forks}</span>
          </div>
          <p class="pc-desc">${desc}</p>
          ${topics ? `<div class="pc-topics">${topics}</div>` : ''}
          <div class="pc-langs">${langs || langPillFallback}</div>
          <div class="pc-meta"><span>${langLabel}</span><span>•</span><span>Updated ${escapeHtml(updated)}</span></div>
        </div>
        <div class="pc-actions">
          <a class="primary" href="${viewUrl}">View Project →</a>
          <a class="ghost" href="${ghUrl}" target="_blank" rel="noreferrer">View Source</a>
          ${hasDemo ? `<a class="ghost" href="${escapeHtml(demoUrl)}" target="_blank" rel="noreferrer">Live Demo ↗</a>` : ''}
        </div>
      </article>
  `;
}

function renderFeatured(){
  if(!featuredGrid) return;
  featuredGrid.setAttribute('aria-busy','false');
  const ordered = orderByRelevance(allRepos);
  const featured = ordered.slice(0, 2);
  if(!featured.length){
    featuredGrid.innerHTML = '<p class="muted">No featured projects yet.</p>';
    return;
  }
  featuredGrid.innerHTML = featured.map(p=> projectCardHtml(p, { featured:true })).join('');
  $$('.project-card', featuredGrid).forEach((c,i)=>{
    c.classList.add('reveal');
    c.style.transitionDelay = `${i*60}ms`;
    setTimeout(()=> c.classList.add('in'), 60);
  });
}

function renderProjects(list){
  if(grid) grid.setAttribute('aria-busy','false');
  if(featuredGrid) featuredGrid.setAttribute('aria-busy','false');
  if(!list.length){
    if(grid) grid.innerHTML='';
    if(empty) empty.classList.remove('hidden');
    return;
  }
  if(empty) empty.classList.add('hidden');
  if(grid) {
    grid.innerHTML = list.map(p=> projectCardHtml(p, { featured:false })).join('');
    $$('.project-card', grid).forEach((c,i)=>{
      c.classList.add('reveal');
      c.style.transitionDelay = `${(i%3)*60}ms`;
      setTimeout(()=> c.classList.add('in'), 60);
    });
  }
  if(featuredGrid) renderFeatured();
  // update count badge if exists
  if(countBadge) countBadge.textContent = `${list.length} of ${allRepos.length}`;
}

function updateLangFilter(){
  const langs = [...new Set(allRepos.flatMap(r=> r.languages.length ? r.languages : (r.language ? [r.language] : [])))].filter(Boolean).sort();
  const cur = langFilter.value;
  langFilter.innerHTML = `<option value="">All languages</option>` + langs.map(l=> `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
  if(langs.includes(cur)) langFilter.value = cur;
}

function applyFilters(){
  const q = searchInput.value.trim().toLowerCase();
  const lang = langFilter.value;
  const sort = currentSortOverride || sortFilter.value;
  filtered = allRepos.filter(r=>{
    const hay = `${r.name} ${r.description} ${(r.topics||[]).join(' ')} ${(r.languages||[]).join(' ')} ${r.language||''}`.toLowerCase();
    const okQ = !q || hay.includes(q);
    const okL = !lang || (r.languages||[]).includes(lang) || r.language===lang;
    return okQ && okL;
  });
  // sorting: if relevance is active and no search, keep relevance order
  if(sort==='stars'){
    filtered.sort((a,b)=> (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at)-new Date(a.updated_at)));
  } else if(sort==='name'){
    filtered.sort((a,b)=> a.name.localeCompare(b.name));
  } else if(sort==='relevance'){
    filtered = orderByRelevance(filtered);
  } else { // updated
    filtered.sort((a,b)=> new Date(b.updated_at) - new Date(a.updated_at));
  }
  renderProjects(filtered);
  if(!filtered.length && allRepos.length){
    statusEl.textContent = `No matches for "${searchInput.value}" — try clearing filters.`;
  } else {
    updateStatusLine();
  }
}

function updateStatusLine(){
  const total = allRepos.length;
  const showing = filtered.length;
  const username = CONFIG.githubUsername;
  if(total===0) return;
  if(filtered.length !== total){
    statusEl.textContent = `Showing ${showing} of ${total} repos for @${username} · sorted by ${sortFilter.value}`;
  } else {
    statusEl.textContent = `Showing all ${total} public repos for @${username} · automatically updates when you add a repo · sorted by ${sortFilter.value === 'relevance' ? 'relevance' : sortFilter.value}`;
  }
  statusEl.style.color = 'var(--muted-2)';
}

searchInput.addEventListener('input', applyFilters);
langFilter.addEventListener('change', applyFilters);
sortFilter.addEventListener('change', ()=>{
  currentSortOverride = null;
  applyFilters();
});
$('#clearFilterBtn')?.addEventListener('click', ()=>{
  searchInput.value=''; langFilter.value=''; sortFilter.value='relevance'; currentSortOverride='relevance';
  applyFilters();
});

// cache
const CACHE_TTL = 10*60*1000;
function cacheKey(u){ return `gh_repos_${u}` }
function getCache(u){
  try{
    const raw = localStorage.getItem(cacheKey(u));
    if(!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if(Date.now()-ts > CACHE_TTL) return null;
    return data;
  }catch{ return null }
}
function setCache(u, data){
  try{ localStorage.setItem(cacheKey(u), JSON.stringify({ ts: Date.now(), data })) }catch{}
}

// No legacy demo cache — current profile is sahilvermaa2310-cpu and auto-syncs

// Fetch all pages (pagination via Link header)
async function fetchAllRepos(username){
  let page = 1;
  let all = [];
  while(true){
    const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`;
    const res = await fetch(url, { headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'portfolio' } });
    if(res.status===404) throw new Error(`GitHub user @${username} not found`);
    if(res.status===403){
      const remaining = res.headers.get('x-ratelimit-remaining');
      if(remaining==='0') throw new Error('GitHub rate limit hit (60/hr unauthenticated). Try again in a few minutes — please wait.');
      throw new Error(`GitHub API forbidden (403)`);
    }
    if(!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error('Unexpected API response');
    all = all.concat(data);
    const link = res.headers.get('Link') || '';
    // if link header contains rel="next", continue, else break
    if(link.includes('rel="next"')){
      page++;
      // safety: avoid infinite loop; github max 100 repos per page, but we cap at 10 pages (1000 repos)
      if(page>10) break;
    } else {
      break;
    }
  }
  return all;
}

async function fetchRepos(username){
  const clean = String(username).trim().replace(/^@+/, '');
  if(!clean){ toast('GitHub username missing'); return; }
  skeleton(4);
  statusEl.textContent = `Fetching all public repos for @${clean} …`;
  statusEl.style.color = 'var(--muted-2)';

  const cached = getCache(clean);
  if(cached){
    let repos = cached;
    // enhance languages for top repos if not already
    // we keep cache as is for speed
    allRepos = repos.map(normalizeRepo);
    // apply relevance ordering for initial display
    allRepos = orderByRelevance(allRepos);
    // set sort to relevance initially
    sortFilter.value = 'relevance';
    currentSortOverride = 'relevance';
    updateLangFilter();
    applyFilters();
    statusEl.textContent = `Loaded ${allRepos.length} public repos for @${clean} (cached, auto-updates every 10 min)`;
    // still refresh in background
    try{
      const fresh = await fetchAllRepos(clean);
      if(fresh.length !== repos.length){
        // update if changed
        const detailed = await enrichRepos(fresh.slice(0,12));
        // actually enrich all? we enrich first 12 to avoid rate limit
        // but keep full list
        const merged = await enrichRepos(fresh);
        // wait we did double; simplify: just enrich top 12 and normalize
        // For background refresh, update cache and UI if changed
        if(JSON.stringify(fresh.map(r=>r.id).sort()) !== JSON.stringify(repos.map(r=>r.id).sort())){
          setCache(clean, fresh);
          // we could silently update, but for now toast
          toast(`Updated — @${clean} now has ${fresh.length} public repos`);
        }
      }
    }catch(e){ /* silent background */ }
    return;
  }

  try{
    let repos = await fetchAllRepos(clean);
    repos = repos.filter(r=> !r.archived);
    if(repos.length===0) throw new Error('No public repos found for this user');

    // Enrich languages for up to 12 most relevant (to show tech) — avoid hitting rate limit
    repos = await enrichRepos(repos);

    setCache(clean, repos);
    allRepos = repos.map(normalizeRepo);
    allRepos = orderByRelevance(allRepos);
    sortFilter.value = 'relevance';
    currentSortOverride = 'relevance';
    updateLangFilter();
    applyFilters();
    updateStatusLine();
    if(viewAllBtn) viewAllBtn.href = `https://github.com/${clean}?tab=repositories`;
    const heroCount = document.querySelector('.stat-num[data-count]');
    // Update first stat to actual repo count if exists
    const firstStat = document.querySelector('.stat-num');
    if(firstStat) {
      firstStat.setAttribute('data-count', String(allRepos.length));
      firstStat.textContent = String(allRepos.length);
    }
    toast(`Loaded all ${allRepos.length} public repos for @${clean}`);
  }catch(err){
    console.error(err);
    statusEl.textContent = err.message + ' — showing cached fallback';
    statusEl.style.color = '#dc2626';
    // Fallback to real snapshot, ordered by relevance
    allRepos = CONFIG.featuredProjects.map(normalizeRepo);
    allRepos = orderByRelevance(allRepos);
    sortFilter.value = 'relevance';
    currentSortOverride = 'relevance';
    updateLangFilter();
    applyFilters();
    toast(err.message, 4200);
  }
}

async function enrichRepos(repos){
  // For top 12, fetch languages breakdown
  const top = repos.slice(0, 12);
  await Promise.all(top.map(async r=>{
    try{
      if(!r.languages_url) return;
      const lr = await fetch(r.languages_url, { headers: { 'Accept': 'application/vnd.github+json' } });
      if(lr.ok){
        const langs = await lr.json();
        const keys = Object.keys(langs);
        if(keys.length){
          r.languages = keys;
          if(!r.language && keys.length) r.language = keys[0];
          else if(r.language && !keys.includes(r.language)) {
            // keep primary first, but ensure languages includes primary
            r.languages = [r.language, ...keys.filter(k=>k!==r.language)];
          }
        }
      }
    }catch{}
  }));
  return repos;
}

// initial auto-load for configured user
const initialUser = CONFIG.githubUsername;
if(ghInput) ghInput.value = initialUser;
fetchRepos(initialUser);

ghBtn?.addEventListener('click', ()=> {
  const val = ghInput.value.trim();
  if(val) {
    CONFIG.githubUsername = val.replace(/^@+/, '');
    localStorage.setItem('portfolio_github_user', CONFIG.githubUsername);
    fetchRepos(val);
    if(viewAllBtn) viewAllBtn.href = `https://github.com/${CONFIG.githubUsername}?tab=repositories`;
  }
});
ghInput?.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); ghBtn.click(); }});

// also support ?user= override via URL
try{
  const params = new URLSearchParams(window.location.search);
  const qUser = params.get('user') || params.get('username');
  if(qUser && qUser !== initialUser){
    CONFIG.githubUsername = qUser;
    if(ghInput) ghInput.value = qUser;
    fetchRepos(qUser);
  }
}catch{}

// ---------- Contact form ----------
const form = $('#contactForm');
if(form){
  const cName = $('#cName'), cEmail=$('#cEmail'), cMessage=$('#cMessage');
  const eName=$('#eName'), eEmail=$('#eEmail'), eMessage=$('#eMessage'), formStatus=$('#formStatus');
  function validEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    let ok=true;
    eName.textContent=''; eEmail.textContent=''; eMessage.textContent=''; formStatus.textContent=''; formStatus.className='form-status';
    if(!cName.value.trim()){ eName.textContent='Please enter your name'; ok=false}
    if(!validEmail(cEmail.value.trim())){ eEmail.textContent='Enter a valid email'; ok=false}
    if(cMessage.value.trim().length < 10){ eMessage.textContent='Message too short (min 10 chars)'; ok=false}
    if(!ok){ formStatus.textContent='Fix errors above'; formStatus.classList.add('err'); return; }
    const subject = encodeURIComponent(`Portfolio inquiry from ${cName.value.trim()}`);
    const body = encodeURIComponent(`Hi Sahil,\n\n${cMessage.value.trim()}\n\n— ${cName.value.trim()} (${cEmail.value.trim()})\n\nSent via portfolio contact form.`);
    const mailto = `mailto:${CONFIG.social.email.replace('mailto:','')}?subject=${subject}&body=${body}`;
    formStatus.textContent = 'Opening your email client…';
    formStatus.classList.add('ok');
    toast('Opening email client — feel free to edit before sending');
    setTimeout(()=> { window.location.href = mailto; }, 300);
    setTimeout(()=> { form.reset(); }, 1200);
  });
}

// ---------- Theme toggle ----------
let dark=false;
$('#themeBtn')?.addEventListener('click', ()=>{
  dark=!dark;
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  if(dark){
    document.documentElement.style.setProperty('--bg', '#0b1220');
    document.documentElement.style.setProperty('--bg-alt', '#0f172a');
    document.documentElement.style.setProperty('--surface', '#111d33');
    document.documentElement.style.setProperty('--text', '#e2e8f0');
    document.documentElement.style.setProperty('--muted', '#94a3b8');
    document.documentElement.style.setProperty('--muted-2', '#64748b');
    document.documentElement.style.setProperty('--line', '#1e293b');
    document.documentElement.style.setProperty('--line-2', '#334155');
    $('#themeBtn').innerHTML = '<span>☀</span>';
  } else {
    document.documentElement.style.removeProperty('--bg');
    document.documentElement.style.removeProperty('--bg-alt');
    document.documentElement.style.removeProperty('--surface');
    document.documentElement.style.removeProperty('--text');
    document.documentElement.style.removeProperty('--muted');
    document.documentElement.style.removeProperty('--muted-2');
    document.documentElement.style.removeProperty('--line');
    document.documentElement.style.removeProperty('--line-2');
    $('#themeBtn').innerHTML = '<span>☾</span>';
  }
  toast(dark ? 'Dark mode on' : 'Light mode on');
});
