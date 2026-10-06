// Содержимое страниц. Оболочка отдаёт сюда контекст и вставляет результат
// под h1; заголовок и крошки страницы не рисуют, их берут из реестра.

import { contexts, user } from './data.js';

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

// Состояние страниц на время сеанса (demo): завершённые сеансы входа.
export const ui = { endedSessions: new Set() };

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const plural = (n, one, few, many) => {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  return b === 1 ? one : many;
};

export const avatar = (who, extra = '') =>
  `<span class="avatar avatar-${esc(who.tone)} ${extra}" aria-hidden="true">${esc(who.initials)}</span>`;

const card = (title, body, { id = '', action = '', flush = false } = {}) => `
  <section class="card panel h-100"${id ? ` aria-labelledby="${id}"` : ''}>
    <div class="panel-head">
      <h2 class="panel-title"${id ? ` id="${id}" tabindex="-1"` : ''}>${title}</h2>${action}
    </div>
    <div class="${flush ? '' : 'panel-body'}">${body}</div>
  </section>`;

function kpi(k) {
  const better = k.delta === 0 ? null : (k.delta < 0) === (k.good === 'down');
  const sign = k.delta > 0 ? '+' : k.delta < 0 ? '−' : '';
  const trend =
    k.delta === 0
      ? '<span class="trend trend-flat"><i class="bi bi-dash" aria-hidden="true"></i> без изменений</span>'
      : `<span class="trend ${better ? 'trend-good' : 'trend-bad'}">
          <i class="bi bi-arrow-${k.delta > 0 ? 'up' : 'down'}-right" aria-hidden="true"></i>
          ${sign}${Math.abs(k.delta)}${k.unit ? ` ${esc(k.unit)}` : ''}
          <span class="visually-hidden">${better ? 'лучше' : 'хуже'}, чем неделю назад</span>
        </span>`;
  return `<div class="col-6 col-xl-3">
    <div class="card panel kpi h-100">
      <div class="kpi-icon" aria-hidden="true"><i class="bi bi-${esc(k.icon)}"></i></div>
      <div class="kpi-label">${esc(k.label)}</div>
      <div class="kpi-value" data-stat>${esc(k.value)}</div>
      <div class="kpi-trend">${trend}<span class="kpi-period">к прошлой неделе</span></div>
    </div>
  </div>`;
}

function barChart(values) {
  const today = new Date();
  const days = values.map((v, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (values.length - 1 - i));
    return { label: `${d.getDate()} ${MONTHS[d.getMonth()]}`, value: v };
  });
  const top = Math.max(2, Math.ceil(Math.max(...values) / 2) * 2);
  const total = values.reduce((a, b) => a + b, 0);
  return `
    <figure class="chart mb-0">
      <div class="chart-plot" role="img"
           aria-label="Закрыто задач по дням за ${values.length} дней: всего ${total}, больше всего ${Math.max(...values)} за день">
        <div class="chart-grid" aria-hidden="true">
          ${[top, top / 2, 0].map((t) => `<div class="chart-line"><span>${t}</span></div>`).join('')}
        </div>
        <div class="chart-bars">
          ${days
            .map(
              (d) => `<div class="chart-col" data-tip="${esc(d.label)}: ${d.value} ${plural(d.value, 'задача', 'задачи', 'задач')}">
                <div class="chart-bar${d.value === 0 ? ' is-zero' : ''}" style="height:${(d.value / top) * 100}%"></div>
              </div>`,
            )
            .join('')}
        </div>
      </div>
      <div class="chart-x" aria-hidden="true">
        <span>${esc(days[0].label)}</span><span>${esc(days[7].label)}</span><span>${esc(days.at(-1).label)}</span>
      </div>
      <table class="visually-hidden">
        <caption>Закрыто задач по дням</caption>
        <thead><tr><th>День</th><th>Задач</th></tr></thead>
        <tbody>${days.map((d) => `<tr><td>${esc(d.label)}</td><td>${d.value}</td></tr>`).join('')}</tbody>
      </table>
    </figure>`;
}

const taskRows = (tasks) => `
  <ul class="rows">${tasks
    .map(
      (t) => `<li class="row-item task">
        <span class="task-title">${esc(t.title)}</span>
        <span class="task-who">${avatar(t.who, 'avatar-sm')}<span>${esc(t.who.name)}</span></span>
        <span class="task-status"><span class="badge status status-${esc(t.tone)}">${esc(t.status)}</span></span>
        <span class="task-due"><i class="bi bi-calendar3" aria-hidden="true"></i> ${esc(t.due)}</span>
      </li>`,
    )
    .join('')}</ul>`;

const eventRows = (events) => `
  <ul class="rows">${events
    .map(
      (e) => `<li class="row-item event">
        ${avatar(e.who)}
        <div class="min-w-0"><div><strong>${esc(e.who.name)}</strong> ${esc(e.text)}</div>
        <div class="text-muted-2">${esc(e.when)}</div></div>
      </li>`,
    )
    .join('')}</ul>`;

const saveBar = (label = 'Сохранить') => `
  <div class="save-bar">
    <button class="btn btn-primary" type="submit">${label}</button>
    <span class="text-muted-2" role="status" data-form-status></span>
  </div>`;

export const pages = {
  '/app': (ctx, { nav }) => {
    const mine = ctx.tasks.filter((t) => t.who.name === user.name);
    const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    return `
    <p class="page-lead">${esc(date[0].toUpperCase() + date.slice(1))}. В пространстве «${esc(ctx.short)}»
      ${ctx.today.length} ${plural(ctx.today.length, 'дело', 'дела', 'дел')} на сегодня
      и ${ctx.events.length} ${plural(ctx.events.length, 'новое событие', 'новых события', 'новых событий')}.</p>
    <div class="row g-3">
      <div class="col-12 col-lg-7">
        ${card(
          'На сегодня',
          `<ul class="rows">${ctx.today
            .map((t) => `<li class="row-item"><span class="time">${esc(t.time)}</span><span>${esc(t.text)}</span></li>`)
            .join('')}</ul>
          <h3 class="panel-subtitle">Мои задачи</h3>
          ${mine.length ? taskRows(mine) : '<p class="text-muted-2 px-3 pb-3 mb-0">Задач на вас нет.</p>'}`,
          { flush: true },
        )}
      </div>
      <div class="col-12 col-lg-5">
        ${card('Что нового', eventRows(ctx.events), { flush: true })}
      </div>
      <div class="col-12">
        ${card(
          'Разделы',
          `<ul class="rows quick">${nav
            .flatMap((s) => s.items)
            .filter((i) => i.path !== '/app')
            .map(
              (i) => `<li><a class="row-item row-link" href="${i.href}">
                <span class="quick-icon" aria-hidden="true"><i class="bi bi-${esc(i.icon)}"></i></span>
                <span class="me-auto">${esc(i.title)}</span>
                <i class="bi bi-chevron-right text-muted-2" aria-hidden="true"></i></a></li>`,
            )
            .join('')}</ul>
          <p class="panel-note">Этот список, меню и крошки собраны из одного реестра маршрутов.</p>`,
          { flush: true },
        )}
      </div>
    </div>`;
  },

  '/app/overview': (ctx) => `
    <p class="page-lead">Сводка по пространству «${esc(ctx.short)}» за последние две недели.</p>
    <div class="row g-3 mb-3">${ctx.kpis.map(kpi).join('')}</div>
    <div class="row g-3">
      <div class="col-12 col-xl-8">${card('Закрыто задач по дням', barChart(ctx.closedByDay))}</div>
      <div class="col-12 col-xl-4">${card('Последние события', eventRows(ctx.events), { flush: true })}</div>
      <div class="col-12">
        ${card(
          'Задачи в работе',
          `<div class="rows-head task" aria-hidden="true"><span>Задача</span><span>Исполнитель</span><span>Статус</span><span>Срок</span></div>
          ${taskRows(ctx.tasks)}`,
          { flush: true },
        )}
      </div>
    </div>`,

  '/app/workspaces': (ctx) => `
    <p class="page-lead">Пространства, где у вас есть доступ. Адреса страниц при переключении остаются прежними.</p>
    <div class="row g-3">${contexts
      .map(
        (c) => `<div class="col-12 col-md-6 col-xl-4">
        <div class="card panel workspace h-100${c.id === ctx.id ? ' is-current' : ''}">
          <div class="d-flex align-items-center gap-3">
            ${avatar(c, 'avatar-lg avatar-square')}
            <div class="min-w-0">
              <div class="fw-semibold text-truncate">${esc(c.name)}</div>
              <div class="text-muted-2">${esc(c.role)}</div>
            </div>
          </div>
          <div class="workspace-meta">
            <span class="avatar-stack">${c.members.slice(0, 4).map((m) => avatar(m, 'avatar-sm')).join('')}</span>
            <span class="text-muted-2">${c.members.length} ${plural(c.members.length, 'участник', 'участника', 'участников')}</span>
          </div>
          <div class="mt-auto">${
            c.id === ctx.id
              ? '<span class="badge status status-success"><i class="bi bi-check2" aria-hidden="true"></i> Вы здесь</span>'
              : `<button type="button" class="btn btn-outline-primary btn-sm" data-switch-context="${esc(c.id)}">Перейти в «${esc(c.short)}»</button>`
          }</div>
        </div>
      </div>`,
      )
      .join('')}</div>`,

  '/app/settings': (ctx) => `
    <p class="page-lead">Настройки есть только у командных пространств. Сейчас открыто «${esc(ctx.short)}».</p>
    <form class="settings-form" novalidate>
      <div class="row g-3">
        <div class="col-12 col-xl-7">
          ${card(
            'Общее',
            `<div class="mb-3">
              <label class="form-label" for="team-title">Название</label>
              <input class="form-control" id="team-title" value="${esc(ctx.settings.title)}">
            </div>
            <div class="mb-3">
              <label class="form-label" for="team-slug">Адрес</label>
              <div class="input-group">
                <span class="input-group-text">app/</span>
                <input class="form-control" id="team-slug" value="${esc(ctx.settings.slug)}">
              </div>
            </div>
            <div>
              <label class="form-label" for="team-tz">Часовой пояс</label>
              <select class="form-select" id="team-tz">
                ${['Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg']
                  .map((tz) => `<option${tz === ctx.settings.timezone ? ' selected' : ''}>${tz}</option>`)
                  .join('')}
              </select>
            </div>`,
          )}
        </div>
        <div class="col-12 col-xl-5">
          ${card(
            'Уведомления',
            `<div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" role="switch" id="team-digest"${ctx.settings.digest ? ' checked' : ''}>
              <label class="form-check-label" for="team-digest">Утренняя сводка на почту</label>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" role="switch" id="team-mentions"${ctx.settings.mentions ? ' checked' : ''}>
              <label class="form-check-label" for="team-mentions">Сообщать, когда меня упомянули</label>
            </div>`,
          )}
        </div>
        <div class="col-12">
          ${card(
            'Участники',
            `<ul class="rows">${ctx.members
              .map(
                (m) => `<li class="row-item">${avatar(m)}<span class="me-auto">${esc(m.name)}</span>
                  <span class="badge status status-secondary">${esc(m.role)}</span></li>`,
              )
              .join('')}</ul>`,
            { flush: true },
          )}
        </div>
      </div>
      ${saveBar()}
    </form>`,

  '/app/account': (ctx) => `
    <div class="row g-3">
      <div class="col-12 col-lg-4">
        <div class="card panel profile h-100">
          ${avatar(user, 'avatar-xl')}
          <div class="fs-5 fw-semibold mt-3">${esc(user.name)}</div>
          <div class="text-muted-2">${esc(user.email)}</div>
          <div class="mt-3"><span class="badge status status-primary" data-role>${esc(ctx.role)} · ${esc(ctx.short)}</span></div>
          <p class="text-muted-2 small mt-3 mb-0">Профиль общий для всех пространств, роль у каждого своя.</p>
        </div>
      </div>
      <div class="col-12 col-lg-8">
        <form class="h-100" novalidate>
          ${card(
            'Личные данные',
            `<div class="row g-3">
              <div class="col-12 col-md-6">
                <label class="form-label" for="me-name">Имя и фамилия</label>
                <input class="form-control" id="me-name" value="${esc(user.name)}" autocomplete="name">
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label" for="me-phone">Телефон</label>
                <input class="form-control" id="me-phone" value="${esc(user.phone)}" autocomplete="tel">
              </div>
              <div class="col-12">
                <label class="form-label" for="me-email">Почта</label>
                <input class="form-control" id="me-email" type="email" value="${esc(user.email)}" autocomplete="email">
              </div>
            </div>
            ${saveBar()}`,
          )}
        </form>
      </div>
    </div>`,

  '/app/account/security': () => {
    const sessions = user.sessions.filter((s) => !ui.endedSessions.has(s.id));
    return `
    <div class="row g-3">
      <div class="col-12 col-lg-6">
        ${card(
          'Вход с подтверждением',
          `<p class="text-muted-2">После пароля спрашиваем код из приложения.</p>
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" id="twofa" checked>
            <label class="form-check-label" for="twofa">Включено</label>
          </div>`,
          { action: '<span class="badge status status-success"><i class="bi bi-shield-check" aria-hidden="true"></i> Защищено</span>' },
        )}
      </div>
      <div class="col-12 col-lg-6">
        ${card(
          'Пароль',
          `<p class="text-muted-2">Меняли 3 месяца назад.</p>
          <form novalidate class="d-flex flex-wrap align-items-center gap-2">
            <button class="btn btn-outline-primary" type="submit">Сменить пароль</button>
            <span class="text-muted-2" role="status" data-form-status></span>
          </form>`,
        )}
      </div>
      <div class="col-12">
        ${card(
          'Активные сеансы',
          `<ul class="rows">${sessions
            .map(
              (s) => `<li class="row-item session">
                <span class="quick-icon" aria-hidden="true"><i class="bi bi-${esc(s.icon)}"></i></span>
                <div class="me-auto min-w-0"><div class="fw-medium">${esc(s.device)}</div>
                <div class="text-muted-2">${esc(s.place)} · ${s.current ? 'этот сеанс' : esc(s.when)}</div></div>
                ${
                  s.current
                    ? '<span class="badge status status-success">Вы здесь</span>'
                    : `<button type="button" class="btn btn-sm btn-outline-danger" data-end-session="${esc(s.id)}">Завершить<span class="visually-hidden"> сеанс ${esc(s.device)}</span></button>`
                }
              </li>`,
            )
            .join('')}</ul>`,
          { id: 'sessions-title', flush: true },
        )}
      </div>
    </div>`;
  },
};
