// Оболочка: роутер, меню, крошки, переключатель контекста, поиск по разделам,
// тема и фокус. Всё, что видно в навигации, берётся из реестра (routes.js)
// через nav.js.

import { registry, HOME, FALLBACK } from './routes.js';
import { buildNav, breadcrumbs, findRoute, isAvailable } from './nav.js';
import { shellStore, currentContext } from './store.js';
import { contexts } from './data.js';
import { pages, ui, esc } from './pages.js';

const APP_NAME = 'Dashboard Shell';
const $ = (selector) => document.querySelector(selector);
const root = document.documentElement;

const el = {
  sidebar: $('#sidebar'),
  nav: $('#nav'),
  toggle: $('#menu-toggle'),
  crumbs: $('#crumbs'),
  title: $('#page-title'),
  page: $('#page'),
  skip: $('.skip-link'),
  ctxButton: $('#context-button'),
  ctxAvatar: $('#context-avatar'),
  ctxName: $('#context-name'),
  ctxRole: $('#context-role'),
  ctxMenu: $('#context-menu'),
  collapse: $('#collapse-toggle'),
  search: $('#search-button'),
  palette: $('#palette'),
  paletteInput: $('#palette-input'),
  paletteList: $('#palette-list'),
  announcer: $('#announcer'),
  tooltip: $('#tooltip'),
};

const offcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(el.sidebar);
const paletteModal = window.bootstrap.Modal.getOrCreateInstance(el.palette);
let currentPath = null;
// Куда вернуть фокус, когда Offcanvas закроется: на кнопку меню (Esc, крестик)
// или на h1 новой страницы (переход по пункту меню).
let focusAfterClose = 'toggle';

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
      <ul class="nav flex-column nav-list">
        ${section.items
          .map((item) => {
            const active = item.path === activePath;
            const trail = !active && chain.has(item.path) && item.path !== HOME;
            return `<li class="nav-item">
              <a class="nav-link${active ? ' active' : ''}${trail ? ' is-trail' : ''}"
                 href="${item.href}" title="${esc(item.title)}"${active ? ' aria-current="page"' : ''}>
                <i class="bi bi-${esc(item.icon)}" aria-hidden="true"></i>
                <span class="nav-text">${esc(item.title)}</span>
                ${item.badge ? `<span class="nav-badge">${item.badge}<span class="visually-hidden"> новых</span></span>` : ''}
              </a></li>`;
          })
          .join('')}
      </ul>`,
    )
    .join('');
}

function renderCrumbs(activePath) {
  const chain = breadcrumbs(registry, activePath);
  const last = chain.length - 1;
  el.crumbs.innerHTML = chain
    .map((c, i) => {
      // корень показываем домиком, промежуточные на самом узком экране прячем
      const label =
        i === 0 ? `<i class="bi bi-house-door" aria-hidden="true"></i><span class="crumb-root">${esc(c.title)}</span>` : esc(c.title);
      const cls = `breadcrumb-item${i === 0 ? ' is-root' : ''}${i > 0 && i < last ? ' is-middle' : ''}`;
      return i === last
        ? `<li class="${cls} active" aria-current="page">${label}</li>`
        : `<li class="${cls}"><a href="${c.href}">${label}</a></li>`;
    })
    .join('');
}

function renderContextSwitcher(context) {
  el.ctxName.textContent = context.name;
  el.ctxRole.textContent = context.role;
  el.ctxAvatar.textContent = context.initials;
  el.ctxAvatar.className = 'avatar avatar-square avatar-sm avatar-accent';
  el.ctxMenu.innerHTML = `<li><h2 class="dropdown-header">Пространства</h2></li>${contexts
    .map(
      (c) => `<li><button type="button" class="dropdown-item context-item${c.id === context.id ? ' is-current' : ''}"
        data-switch-context="${esc(c.id)}"${c.id === context.id ? ' aria-current="true"' : ''}>
        <span class="avatar avatar-square avatar-sm${c.id === context.id ? ' avatar-accent' : ''}" aria-hidden="true">${esc(c.initials)}</span>
        <span class="context-item-text"><span>${esc(c.name)}</span><span class="context-item-role">${esc(c.role)}</span></span>
        ${c.id === context.id ? '<i class="bi bi-check2 ms-auto" aria-hidden="true"></i>' : ''}
      </button></li>`,
    )
    .join('')}`;
}

function renderPage(context, route) {
  el.title.textContent = route.title;
  document.title = `${route.title} · ${APP_NAME}`;
  el.tooltip.hidden = true;
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

// ---------- фокус и объявления ----------

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

// ---------- тема и свёрнутое меню ----------

const isDark = () => root.getAttribute('data-bs-theme') === 'dark';

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // приватный режим Safari: живём без запоминания
  }
}

function syncTheme() {
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(isDark())));
}

function setTheme(dark) {
  root.setAttribute('data-bs-theme', dark ? 'dark' : 'light');
  save('demo-shell:theme', dark ? 'dark' : 'light');
  syncTheme();
  announce(dark ? 'Тёмная тема' : 'Светлая тема');
}

const isCollapsed = () => root.classList.contains('is-collapsed');

function syncCollapse() {
  const on = isCollapsed();
  el.collapse.setAttribute('aria-pressed', String(on));
  el.collapse.title = on ? 'Развернуть меню' : 'Свернуть меню';
  el.collapse.querySelector('.tool-text').textContent = on ? 'Развернуть меню' : 'Свернуть меню';
}

function setCollapsed(on) {
  root.classList.toggle('is-collapsed', on);
  save('demo-shell:collapsed', on ? '1' : '0');
  syncCollapse();
}

// ---------- поиск по разделам (Ctrl+K) ----------
// Пункты те же, что в меню: buildNav по текущему контексту. Плюс пространства и действия.

const palette = { items: [], active: 0, opener: null, pending: null };
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');

function paletteItems() {
  const context = currentContext();
  const routes = buildNav(registry, context).flatMap((section) =>
    section.items.map((item) => ({
      group: 'Разделы',
      icon: item.icon,
      label: item.title,
      hint: item.path === currentPath ? 'вы здесь' : section.title,
      keys: `${item.title} ${section.title} ${item.path}`,
      run: () => (item.path === currentPath ? focusTitle() : go(item.path)),
    })),
  );
  const spaces = contexts
    .filter((c) => c.id !== context.id)
    .map((c) => ({
      group: 'Пространства',
      icon: 'arrow-left-right',
      label: `Перейти в «${c.short}»`,
      hint: c.role,
      keys: `${c.name} ${c.short} пространство контекст`,
      run: () => {
        switchContext(c.id);
        focusTitle();
      },
    }));
  const actions = [
    {
      group: 'Действия',
      icon: 'circle-half',
      label: isDark() ? 'Светлая тема' : 'Тёмная тема',
      hint: '',
      keys: 'тема тёмная светлая ночь dark light',
      run: () => setTheme(!isDark()),
      keepFocus: true,
    },
  ];
  if (window.matchMedia('(min-width: 992px)').matches) {
    actions.push({
      group: 'Действия',
      icon: 'layout-sidebar',
      label: isCollapsed() ? 'Развернуть меню' : 'Свернуть меню',
      hint: '',
      keys: 'меню свернуть развернуть sidebar',
      run: () => setCollapsed(!isCollapsed()),
      keepFocus: true,
    });
  }
  return [...routes, ...spaces, ...actions];
}

function renderPalette() {
  const q = norm(el.paletteInput.value.trim());
  palette.items = paletteItems().filter((item) => !q || norm(`${item.label} ${item.keys}`).includes(q));
  palette.active = Math.min(palette.active, Math.max(0, palette.items.length - 1));

  if (!palette.items.length) {
    el.paletteList.innerHTML = '<li class="palette-empty" role="presentation">Ничего не нашлось</li>';
    el.paletteInput.removeAttribute('aria-activedescendant');
    return;
  }

  let group = '';
  el.paletteList.innerHTML = palette.items
    .map((item, i) => {
      const head = item.group !== group ? `<li class="palette-group" role="presentation">${esc(item.group)}</li>` : '';
      group = item.group;
      return `${head}<li class="palette-option${i === palette.active ? ' is-active' : ''}" role="option"
        id="palette-option-${i}" data-index="${i}" aria-selected="${i === palette.active}">
        <i class="bi bi-${esc(item.icon)}" aria-hidden="true"></i>
        <span>${esc(item.label)}</span>
        ${item.hint ? `<span class="palette-hint">${esc(item.hint)}</span>` : ''}
      </li>`;
    })
    .join('');
  el.paletteInput.setAttribute('aria-activedescendant', `palette-option-${palette.active}`);
  el.paletteList.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
}

function openPalette() {
  if (el.palette.classList.contains('show')) return;
  palette.opener = document.activeElement;
  palette.pending = null;
  palette.active = 0;
  el.paletteInput.value = '';
  renderPalette();
  if (el.sidebar.classList.contains('show')) offcanvas.hide();
  paletteModal.show();
}

function choose(index) {
  const item = palette.items[index];
  if (!item) return;
  palette.pending = item;
  paletteModal.hide();
}

el.palette.addEventListener('shown.bs.modal', () => el.paletteInput.focus());
el.palette.addEventListener('hidden.bs.modal', () => {
  const item = palette.pending;
  palette.pending = null;
  if (item) item.run();
  if (!item || item.keepFocus) palette.opener?.focus?.();
});

el.paletteInput.addEventListener('input', () => {
  palette.active = 0;
  renderPalette();
});

el.paletteInput.addEventListener('keydown', (event) => {
  const count = palette.items.length;
  if (!count) return;
  const moves = { ArrowDown: 1, ArrowUp: -1 };
  if (event.key in moves) {
    event.preventDefault();
    palette.active = (palette.active + moves[event.key] + count) % count;
    renderPalette();
  } else if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault();
    palette.active = event.key === 'Home' ? 0 : count - 1;
    renderPalette();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    choose(palette.active);
  }
});

el.paletteList.addEventListener('click', (event) => {
  const option = event.target.closest('[data-index]');
  if (option) choose(Number(option.dataset.index));
});

el.paletteList.addEventListener('pointermove', (event) => {
  const option = event.target.closest('[data-index]');
  if (option && Number(option.dataset.index) !== palette.active) {
    palette.active = Number(option.dataset.index);
    renderPalette();
  }
});

el.search.addEventListener('click', openPalette);

document.addEventListener('keydown', (event) => {
  const typing = event.target.closest?.('input, textarea, select, [contenteditable="true"]');
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openPalette();
  } else if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    openPalette();
  }
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
  // открыли меню — фокус на текущий пункт, чтобы идти Tab от него
  el.nav.querySelector('[aria-current="page"]')?.focus();
});
el.sidebar.addEventListener('hidden.bs.offcanvas', () => {
  el.toggle.setAttribute('aria-expanded', 'false');
  if (focusAfterClose === 'title') focusTitle();
  else if (focusAfterClose === 'toggle' && el.toggle.offsetParent !== null) el.toggle.focus();
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
  const themeButton = event.target.closest('[data-theme-toggle]');
  if (themeButton) {
    setTheme(!isDark());
    return;
  }
  const button = event.target.closest('[data-switch-context]');
  if (!button) return;
  const fromMenu = el.ctxMenu.contains(button);
  switchContext(button.dataset.switchContext);
  // кнопка, по которой нажали, могла исчезнуть при перерисовке — фокус не теряем
  if (fromMenu) el.ctxButton.focus();
  else focusTitle();
});

el.collapse.addEventListener('click', () => setCollapsed(!isCollapsed()));

el.page.addEventListener('submit', (event) => {
  event.preventDefault();
  const status = event.target.querySelector('[data-form-status]');
  if (status) status.textContent = 'Сохранено в demo, на сервер ничего не ушло.';
});

el.page.addEventListener('change', (event) => {
  const box = event.target.closest('[data-today]');
  if (!box) return;
  if (box.checked) ui.doneToday.add(box.dataset.today);
  else ui.doneToday.delete(box.dataset.today);
  box.closest('.today-item').classList.toggle('is-done', box.checked);
});

el.page.addEventListener('click', (event) => {
  const filter = event.target.closest('[data-task-filter]');
  if (filter) {
    ui.taskFilter = filter.dataset.taskFilter;
    render();
    el.page.querySelector(`[data-task-filter="${ui.taskFilter}"]`)?.focus();
    return;
  }
  const end = event.target.closest('[data-end-session]');
  if (end) {
    ui.endedSessions.add(end.dataset.endSession);
    render();
    announce('Сеанс завершён.');
    // кнопка исчезла вместе со строкой — фокус на заголовок списка
    el.page.querySelector('#sessions-title')?.focus();
  }
});

// Подсказка над столбцом графика: hit-зона — вся высота столбца.
el.page.addEventListener('pointerover', (event) => {
  const col = event.target.closest('[data-tip]');
  if (!col) return;
  const box = col.getBoundingClientRect();
  el.tooltip.textContent = col.dataset.tip;
  el.tooltip.hidden = false;
  const tip = el.tooltip.getBoundingClientRect();
  const left = Math.min(Math.max(8, box.left + box.width / 2 - tip.width / 2), window.innerWidth - tip.width - 8);
  el.tooltip.style.left = `${left + window.scrollX}px`;
  el.tooltip.style.top = `${box.top + window.scrollY - tip.height - 8}px`;
});
el.page.addEventListener('pointerout', (event) => {
  if (event.target.closest('[data-tip]') && !event.relatedTarget?.closest?.('[data-tip]')) el.tooltip.hidden = true;
});

syncTheme();
syncCollapse();
onRoute();
