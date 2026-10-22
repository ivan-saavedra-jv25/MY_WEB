const THEME_KEY = 'portfolio-theme';
const SVG_NS = 'http://www.w3.org/2000/svg';
const REPOS_CACHE_KEY = 'portfolio-repos';
const REPOS_CACHE_MS = 60 * 60 * 1000;

const safeStorage = {
  get(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, value); } catch { /* storage no disponible */ }
  },
};

/* ---------- Utilidades de DOM y datos ---------- */

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else node.setAttribute(key, value === true ? '' : value);
  });
  node.append(...children.filter(Boolean));
  return node;
}

function icon(id) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function externalProps(external) {
  return external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
}

function chipList(items) {
  return el('ul', { class: 'chips' }, ...items.map((item) => el('li', { text: item })));
}

async function loadJson(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`No se pudo leer data/${name}.json (${response.status})`);
  return response.json();
}

function mount(id, ...nodes) {
  document.getElementById(id)?.replaceChildren(...nodes);
}

function showDataError(error) {
  console.error(error);
  const box = document.getElementById('data-error');
  if (!box) return;
  box.hidden = false;
  box.textContent = location.protocol === 'file:'
    ? 'No se pudo cargar el contenido: el navegador bloquea la lectura de archivos JSON al abrir index.html directamente. Sirve la carpeta con un servidor estático (ver README).'
    : 'No se pudo cargar parte del contenido. Recarga la página para reintentar.';
}

/* ---------- Render por área ---------- */

function renderAbout(data) {
  mount('facts-list', ...data.facts.map((fact) => el('div', {},
    el('dt', {}, icon(fact.icon), ` ${fact.label}`),
    el('dd', {}, fact.href ? el('a', { href: fact.href, text: fact.value }) : fact.value),
  )));
}

function renderAreas(data) {
  mount('areas-list', ...data.items.map((item) => el('li', {},
    el('strong', { text: item.title }),
    el('span', { text: item.text }),
  )));
}

function renderStack(data) {
  mount('stack-grid', ...data.groups.map((group) => el('div', {},
    el('h3', { text: group.title }),
    chipList(group.items),
  )));
}

function renderProjects(data) {
  mount('projects-featured', ...data.featured.map((project) => el('article', { class: 'card glass project' },
    el('span', { class: 'tag', text: project.tag }),
    el('div', { class: 'thumb', 'aria-hidden': 'true' }, icon(project.icon)),
    el('h3', { text: project.title }),
    el('p', { text: project.description }),
    el('p', { class: 'meta', text: project.meta }),
    chipList(project.tech),
    project.link && el('a', { class: 'more', href: project.link.href }, `${project.link.label} `, icon('i-arrow')),
  )));
  mount('projects-secondary', ...data.secondary.map((project) => el('article', { class: 'card glass project' },
    el('span', { class: 'tag', text: project.tag }),
    el('h3', { text: project.title }),
    el('p', { text: project.description }),
    chipList(project.tech),
  )));
}

function renderExperience(data) {
  mount('experience-list', ...data.items.map((job) => el('li', {},
    el('span', { class: 'node', 'aria-hidden': 'true' }, icon(job.icon)),
    el('div', {},
      el('p', { class: 'period', text: job.period }),
      el('h3', { text: job.role }),
      el('p', { class: 'company', text: job.company }),
      el('ul', {}, ...job.highlights.map((text) => el('li', { text }))),
    ),
  )));
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function renderEducation(data) {
  const { degree } = data;
  mount('degree',
    icon(degree.icon),
    el('div', {},
      el('strong', { text: degree.title }),
      el('span', { text: `${degree.institution} · ${degree.year}` }),
    ),
  );

  const certificates = [...data.certificates].sort((a, b) => b.date.localeCompare(a.date));
  mount('cert-grid', ...certificates.map((cert) => {
    const date = formatDate(cert.date);
    return el('li', { class: 'cert' },
      el('a', {
        class: 'cert-thumb',
        href: cert.file,
        target: '_blank',
        rel: 'noopener',
        'aria-label': `Abrir certificado ${cert.title} (${cert.type}, pestaña nueva)`,
      }, el('img', {
        src: cert.preview,
        alt: `Certificado ${cert.issuer}: ${cert.title}, ${date}`,
        loading: 'lazy',
        width: cert.width,
        height: cert.height,
      })),
      el('h3', { text: cert.title }),
      el('p', { text: `${cert.issuer} · ${date} · ${cert.hours} h` }),
    );
  }));
}

function renderContact(data) {
  mount('contact-list', ...data.items.map((item) => el('li', {},
    icon(item.icon),
    el('div', {},
      el('span', { text: item.label }),
      item.href
        ? el('a', { href: item.href, text: item.value, ...externalProps(item.external) })
        : item.value,
    ),
  )));
  mount('social-list', ...data.social.map((item) => el('li', {},
    el('a', {
      class: 'icon-btn',
      href: item.href,
      'aria-label': item.external ? `${item.label} (se abre en una pestaña nueva)` : item.label,
      ...externalProps(item.external),
    }, icon(item.icon)),
  )));
}

/* ---------- Repositorios de GitHub ---------- */

async function fetchUserRepos(user) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!response.ok) throw new Error(`GitHub respondió ${response.status} para ${user}`);
  return response.json();
}

async function loadRepos(config) {
  const cacheId = JSON.stringify([config.users, config.excludeForks]);
  try {
    const cached = JSON.parse(sessionStorage.getItem(REPOS_CACHE_KEY) || 'null');
    if (cached && cached.id === cacheId && Date.now() - cached.time < REPOS_CACHE_MS) return cached.repos;
  } catch { /* sin caché */ }

  const lists = await Promise.all(config.users.map(fetchUserRepos));
  const repos = lists.flat()
    .filter((repo) => !(config.excludeForks && repo.fork))
    .map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      url: repo.html_url,
      description: repo.description,
      language: repo.language,
      pushed: repo.pushed_at,
    }))
    .sort((a, b) => b.pushed.localeCompare(a.pushed));

  try {
    sessionStorage.setItem(REPOS_CACHE_KEY, JSON.stringify({ id: cacheId, time: Date.now(), repos }));
  } catch { /* sin caché */ }
  return repos;
}

function createRepoCard(repo) {
  const date = new Date(repo.pushed).toLocaleDateString('es-CL', { year: 'numeric', month: 'short' });
  return el('li', { class: 'card glass repo' },
    el('h4', {}, el('a', { href: repo.url, text: repo.name, ...externalProps(true) })),
    el('p', { text: repo.description || 'Sin descripción en GitHub.' }),
    el('p', { class: 'repo-meta', text: `${repo.language || 'Sin lenguaje'} · ${repo.owner} · ${date}` }),
  );
}

async function renderRepos(config) {
  const grid = document.getElementById('repo-grid');
  const status = document.getElementById('repos-status');
  const filters = document.getElementById('repo-filters');
  const moreButton = document.getElementById('repos-more');
  const subtitle = document.getElementById('repos-sub');
  if (!grid || !status || !filters || !moreButton) return;

  if (subtitle) {
    const links = config.users.flatMap((user, index) => [
      index ? (index === config.users.length - 1 ? ' y ' : ', ') : '',
      el('a', { href: `https://github.com/${user}`, text: user, ...externalProps(true) }),
    ]);
    subtitle.replaceChildren('Lista obtenida en vivo desde ', ...links, config.excludeForks ? '. No incluye forks.' : '.');
  }

  let repos;
  try {
    repos = await loadRepos(config);
  } catch (error) {
    console.error(error);
    status.textContent = 'No se pudo cargar la lista desde GitHub en este momento. Puedes verla directamente en los perfiles enlazados arriba.';
    return;
  }
  if (!repos.length) {
    status.textContent = 'No hay repositorios públicos para mostrar.';
    return;
  }

  let language = 'Todos';
  let visible = config.pageSize;

  const render = () => {
    const filtered = repos.filter((repo) => language === 'Todos' || repo.language === language);
    grid.replaceChildren(...filtered.slice(0, visible).map(createRepoCard));
    status.textContent = `${filtered.length} repositorio${filtered.length === 1 ? '' : 's'}${language === 'Todos' ? '' : ` en ${language}`}.`;
    moreButton.hidden = filtered.length <= visible;
    filters.querySelectorAll('button').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
  };

  const languages = ['Todos', ...new Set(repos.map((repo) => repo.language).filter(Boolean))];
  filters.replaceChildren(...languages.map((name) => {
    const button = el('button', { type: 'button', class: 'filter-btn', 'data-language': name, text: name });
    button.addEventListener('click', () => {
      language = name;
      visible = config.pageSize;
      render();
    });
    return button;
  }));
  filters.hidden = false;

  moreButton.addEventListener('click', () => {
    visible += config.pageSize;
    render();
  });
  render();
}

/* ---------- Carga de contenido ---------- */

const CONTENT_SOURCES = [
  ['about', renderAbout],
  ['areas', renderAreas],
  ['stack', renderStack],
  ['projects', renderProjects],
  ['experience', renderExperience],
  ['education', renderEducation],
  ['contact', renderContact],
  ['repos', renderRepos],
];

async function initContent() {
  const results = await Promise.allSettled(CONTENT_SOURCES.map(async ([name, render]) => {
    render(await loadJson(name));
  }));
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) showDataError(failed.reason);
}

/* ---------- Interacciones ---------- */

function initTheme() {
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  const saved = safeStorage.get(THEME_KEY);

  const apply = (theme) => {
    root.dataset.theme = theme;
    if (!button) return;
    const isDark = theme === 'dark';
    button.setAttribute('aria-label', isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    button.querySelector('use').setAttribute('href', isDark ? '#i-sun' : '#i-moon');
  };

  apply(saved === 'light' ? 'light' : 'dark');

  button?.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    apply(next);
    safeStorage.set(THEME_KEY, next);
  });
}

function initMobileMenu() {
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initActiveLinks() {
  const links = [...document.querySelectorAll('.main-nav a[href^="#"]')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach((section) => observer.observe(section));
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.05 });
  items.forEach((item) => observer.observe(item));
}

function initBackToTop() {
  document.getElementById('back-to-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function initYear() {
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
}

initTheme();
initMobileMenu();
initActiveLinks();
initReveal();
initBackToTop();
initYear();
initContent();
