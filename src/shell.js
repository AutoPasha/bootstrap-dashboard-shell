// Оболочка: роутер, меню, крошки, переключатель контекста и фокус.
// Всё, что видно в навигации, берётся из реестра (routes.js) через nav.js.

import { registry, HOME, FALLBACK } from './routes.js';
import { buildNav, breadcrumbs, findRoute, isAvailable } from './nav.js';
import { shellStore, currentContext } from './store.js';
import { contexts } from './data.js';
import { pages } from './pages.js';

const APP_NAME = 'Dashboard Shell';
const $ = (selector) => document.querySelector(selector);

const el = {
  sidebar: $('#sidebar'),
  nav: $('#nav'),
  toggle: $('#menu-toggle'),
  crumbs: $('#crumbs'),
  title: $('#page-title'),
  page: $('#page'),
  skip: $('.skip-link'),
  ctxButton: $('#context-button'),
  ctxName: $('#context-name'),
  ctxRole: $('#context-role'),
  ctxMenu: $('#context-menu'),
  announcer: $('#announcer'),
};

const offcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(el.sidebar);
let currentPath = null;
// Куда вернуть фокус, когда Offcanvas закроется: на кнопку меню (Esc, крестик)
// или на h1 новой страницы (переход по пункту меню).
let focusAfterClose = 'toggle';

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// ---------- маршрут ----------

function pathFromHash() {
  const hash = decodeURIComponent(location.hash.slice(1));
  return hash.startsWith('/') ? hash.replace(/\/+$/, '') || '/' : '';
}

function go(path, { replace = false } = {}) {
  const url = `#${path}`;
  if (replace) location.replace(url);
  else location.hash = url;
}

// ---------- отрисовка из реестра ----------

function renderNav(context, activePath) {
  const chain = new Set(breadcrumbs(registry, activePath).map((c) => c.path));
  el.nav.innerHTML = buildNav(registry, context)
    .map(
      (section) => `
      <h2 class="nav-section-title">${esc(section.title)}</h2>
      <ul class="nav nav-pills flex-column mb-3">
        ${section.items
          .map((item) => {
            const active = item.path === activePath;
            const trail = !active && chain.has(item.path) && item.path !== HOME;
            return `<li class="nav-item">
              <a class="nav-link d-flex align-items-center gap-2${active ? ' active' : ''}${trail ? ' is-trail' : ''}"
                 href="${item.href}"${active ? ' aria-current="page"' : ''}>
                <i class="bi bi-${esc(item.icon)}" aria-hidden="true"></i>
                <span class="me-auto">${esc(item.title)}</span>
                ${item.badge ? `<span class="badge rounded-pill text-bg-secondary" aria-label="${item.badge} новых">${item.badge}</span>` : ''}
              </a></li>`;
          })
          .join('')}
      </ul>`,
    )
    .join('');
}

function renderCrumbs(activePath) {
  const chain = breadcrumbs(registry, activePath);
  el.crumbs.innerHTML = chain
    .map((c, i) =>
      i === chain.length - 1
        ? `<li class="breadcrumb-item active" aria-current="page">${esc(c.title)}</li>`
        : `<li class="breadcrumb-item"><a href="${c.href}">${esc(c.title)}</a></li>`,
    )
    .join('');
}

function renderContextSwitcher(context) {
  el.ctxName.textContent = context.name;
  el.ctxRole.textContent = context.role;
  el.ctxMenu.innerHTML = contexts
    .map(
      (c) => `<li><button type="button" class="dropdown-item d-flex flex-column${c.id === context.id ? ' active' : ''}"
        data-switch-context="${esc(c.id)}"${c.id === context.id ? ' aria-current="true"' : ''}>
        <span>${esc(c.name)}</span><span class="small opacity-75">${esc(c.role)}</span>
      </button></li>`,
    )
    .join('');
}

function renderPage(context, route) {
  el.title.textContent = route.title;
  document.title = `${route.title} · ${APP_NAME}`;
  el.page.innerHTML = pages[route.path](context, { nav: buildNav(registry, context) });
}

function render() {
  const context = currentContext();
  const route = findRoute(registry, currentPath);
  renderNav(context, route.path);
  renderCrumbs(route.path);
  renderContextSwitcher(context);
  renderPage(context, route);
}

// ---------- фокус ----------

function focusTitle() {
  window.scrollTo(0, 0);
  el.title.focus();
}

function announce(text) {
  el.announcer.textContent = '';
  // повторное одинаковое сообщение тоже должно прозвучать
  requestAnimationFrame(() => (el.announcer.textContent = text));
}

// ---------- переходы ----------

function onRoute() {
  const path = pathFromHash();
  const route = findRoute(registry, path);
  if (!route) {
    go(HOME, { replace: true });
    return;
  }
  if (!isAvailable(route, currentContext())) {
    announce(`«${route.title}» не открывается в пространстве «${currentContext().name}», открыт обзор.`);
    go(FALLBACK, { replace: true });
    return;
  }

  if (route.path === currentPath) return;
  const first = currentPath === null;
  currentPath = route.path;
  render();

  // При первой загрузке фокус не трогаем: первым Tab человек попадает на skip-link.
  if (first) return;
  if (el.sidebar.classList.contains('show')) {
    focusAfterClose = 'title';
    offcanvas.hide();
  } else {
    focusTitle();
  }
}

function switchContext(id) {
  if (id === shellStore.get().contextId) return;
  shellStore.set({ contextId: id });
}

shellStore.subscribe(() => {
  const context = currentContext();
  const route = findRoute(registry, currentPath);
  if (!isAvailable(route, context)) {
    // Страница без смысла в новом контексте: уводим на обзор, фокус на его h1.
    announce(`Пространство «${context.name}». «${route.title}» здесь нет, открыт обзор.`);
    go(FALLBACK, { replace: true });
    return;
  }
  render();
  announce(`Пространство «${context.name}». Данные страницы обновлены.`);
});

// ---------- события ----------

window.addEventListener('hashchange', onRoute);

el.skip.addEventListener('click', (event) => {
  // href="#main" сломал бы hash-маршрут, поэтому переносим фокус сами
  event.preventDefault();
  focusTitle();
});

el.toggle.addEventListener('click', () => {
  focusAfterClose = 'toggle';
  offcanvas.show();
});

el.sidebar.addEventListener('show.bs.offcanvas', () => el.toggle.setAttribute('aria-expanded', 'true'));
el.sidebar.addEventListener('shown.bs.offcanvas', () => {
  // открыли меню — фокус на текущий пункт, чтобы стрелять Tab от него
  el.nav.querySelector('[aria-current="page"]')?.focus();
});
el.sidebar.addEventListener('hidden.bs.offcanvas', () => {
  el.toggle.setAttribute('aria-expanded', 'false');
  if (focusAfterClose === 'title') focusTitle();
  else if (el.toggle.offsetParent !== null) el.toggle.focus();
  focusAfterClose = 'toggle';
});

// Пункт меню на текущую страницу hashchange не даёт — закрываем меню сами.
el.nav.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#/"]');
  if (link && link.getAttribute('href') === `#${currentPath}`) {
    event.preventDefault();
    if (el.sidebar.classList.contains('show')) {
      focusAfterClose = 'title';
      offcanvas.hide();
    } else {
      focusTitle();
    }
  }
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-switch-context]');
  if (!button) return;
  const fromMenu = el.ctxMenu.contains(button);
  switchContext(button.dataset.switchContext);
  // кнопка, по которой нажали, могла исчезнуть при перерисовке — фокус не теряем
  if (fromMenu) el.ctxButton.focus();
  else focusTitle();
});

el.page.addEventListener('submit', (event) => {
  event.preventDefault();
  const status = el.page.querySelector('[data-form-status]');
  if (status) status.textContent = 'Demo: изменения не сохраняются.';
});

onRoute();
