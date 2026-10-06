// Содержимое страниц. Оболочка отдаёт сюда контекст и вставляет результат
// под h1; заголовок и крошки страницы не рисуют, их берут из реестра.

import { contexts, user } from './data.js';

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

const lead = (text) => `<p class="lead text-body-secondary">${text}</p>`;

function statCards(ctx) {
  return `<div class="row g-3 mb-4">${ctx.stats
    .map(
      (s) => `<div class="col-12 col-sm-4">
        <div class="card h-100"><div class="card-body">
          <div class="text-body-secondary small">${esc(s.label)}</div>
          <div class="fs-2 fw-semibold" data-stat>${esc(s.value)}</div>
        </div></div></div>`,
    )
    .join('')}</div>`;
}

export const pages = {
  '/app': (ctx, { nav }) => `
    ${lead(`Вы в пространстве <strong>${esc(ctx.name)}</strong>, роль: ${esc(ctx.role)}.`)}
    <div class="row g-3">${nav
      .flatMap((section) => section.items)
      .filter((item) => item.path !== '/app')
      .map(
        (item) => `<div class="col-12 col-md-6 col-xl-4">
          <a class="card h-100 text-decoration-none tile" href="${item.href}">
            <div class="card-body d-flex align-items-center gap-3">
              <i class="bi bi-${esc(item.icon)} fs-3 text-primary" aria-hidden="true"></i>
              <span class="fw-semibold">${esc(item.title)}</span>
            </div>
          </a></div>`,
      )
      .join('')}</div>
    <p class="small text-body-secondary mt-3">Плитки собраны той же функцией buildNav, что и меню.</p>`,

  '/app/overview': (ctx) => `
    ${lead(`Сводка по пространству «${esc(ctx.name)}».`)}
    ${statCards(ctx)}
    <h2 class="h5">Последние события</h2>
    <ul class="list-group">${ctx.events.map((e) => `<li class="list-group-item">${esc(e)}</li>`).join('')}</ul>`,

  '/app/workspaces': (ctx) => `
    ${lead('Пространства, где у вас есть доступ. Адреса страниц от выбора не меняются.')}
    <ul class="list-group">${contexts
      .map(
        (c) => `<li class="list-group-item d-flex flex-wrap align-items-center gap-2">
          <div class="me-auto">
            <div class="fw-semibold">${esc(c.name)}</div>
            <div class="small text-body-secondary">${esc(c.role)}</div>
          </div>
          ${
            c.id === ctx.id
              ? '<span class="badge text-bg-primary">Текущее</span>'
              : `<button type="button" class="btn btn-sm btn-outline-primary" data-switch-context="${esc(c.id)}">Перейти</button>`
          }
        </li>`,
      )
      .join('')}</ul>`,

  '/app/settings': (ctx) => `
    ${lead(`Настройки видны только в командных пространствах. Сейчас: «${esc(ctx.name)}».`)}
    <form class="settings-form" novalidate>
      <div class="mb-3">
        <label class="form-label" for="team-title">Короткое имя</label>
        <input class="form-control" id="team-title" value="${esc(ctx.settings.title)}">
      </div>
      <div class="mb-3">
        <label class="form-label" for="team-tz">Часовой пояс</label>
        <select class="form-select" id="team-tz">
          ${['Europe/Moscow', 'Europe/Samara', 'Asia/Yekaterinburg']
            .map((tz) => `<option ${tz === ctx.settings.timezone ? 'selected' : ''}>${tz}</option>`)
            .join('')}
        </select>
      </div>
      <div class="form-check form-switch mb-3">
        <input class="form-check-input" type="checkbox" role="switch" id="team-digest" ${ctx.settings.digest ? 'checked' : ''}>
        <label class="form-check-label" for="team-digest">Ежедневная сводка на почту</label>
      </div>
      <button class="btn btn-primary" type="submit">Сохранить</button>
      <span class="ms-2 small text-body-secondary" role="status" data-form-status></span>
    </form>`,

  '/app/account': (ctx) => `
    ${lead('Профиль общий для всех пространств, меняется только роль.')}
    <dl class="row mb-0">
      <dt class="col-sm-3">Имя</dt><dd class="col-sm-9">${esc(user.name)}</dd>
      <dt class="col-sm-3">Почта</dt><dd class="col-sm-9">${esc(user.email)}</dd>
      <dt class="col-sm-3">Роль здесь</dt><dd class="col-sm-9" data-role>${esc(ctx.role)}, ${esc(ctx.name)}</dd>
    </dl>
    <a class="btn btn-outline-primary mt-3" href="#/app/account/security">Безопасность</a>`,

  '/app/account/security': () => `
    ${lead('Активные сеансы входа.')}
    <ul class="list-group mb-3">${user.sessions
      .map(
        (s) => `<li class="list-group-item d-flex flex-wrap gap-2">
          <span class="me-auto">${esc(s.device)} · ${esc(s.place)}</span>
          <span class="text-body-secondary small">${s.current ? 'этот сеанс' : esc(s.when)}</span>
        </li>`,
      )
      .join('')}</ul>
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch" id="twofa" checked>
      <label class="form-check-label" for="twofa">Вход с подтверждением по коду</label>
    </div>`,
};
