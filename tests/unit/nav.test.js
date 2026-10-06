// Реестр и функции навигации без браузера: node --test tests/unit/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registry, HOME, FALLBACK } from '../../src/routes.js';
import { buildNav, breadcrumbs, findRoute, isAvailable } from '../../src/nav.js';
import { contexts } from '../../src/data.js';
import { pages } from '../../src/pages.js';

const byId = (id) => contexts.find((c) => c.id === id);
const paths = (nav) => nav.flatMap((s) => s.items.map((i) => i.path));

test('реестр целый: родители существуют, циклов нет, у каждой страницы есть содержимое', () => {
  const sectionIds = new Set(registry.sections.map((s) => s.id));
  for (const route of registry.routes) {
    if (route.parent) assert.ok(findRoute(registry, route.parent), `${route.path}: нет родителя ${route.parent}`);
    if (route.section) assert.ok(sectionIds.has(route.section), `${route.path}: нет раздела ${route.section}`);
    assert.equal(typeof pages[route.path], 'function', `${route.path}: нет страницы`);
    assert.equal(breadcrumbs(registry, route.path).at(-1).path, route.path);
  }
  assert.equal(new Set(registry.routes.map((r) => r.path)).size, registry.routes.length, 'пути повторяются');
  assert.ok(findRoute(registry, HOME));
  assert.ok(contexts.every((c) => isAvailable(findRoute(registry, FALLBACK), c)), 'обзор должен открываться везде');
});

test('buildNav: одно меню из реестра, в порядке реестра', () => {
  const nav = buildNav(registry, byId('north'));
  assert.deepEqual(nav.map((s) => s.title), ['Работа', 'Аккаунт']);
  assert.deepEqual(paths(nav), registry.routes.map((r) => r.path));
  assert.ok(nav.flatMap((s) => s.items).every((i) => i.href === `#${i.path}`));
});

test('buildNav: контекст меняет счётчики и убирает страницу без смысла, адреса прежние', () => {
  const north = buildNav(registry, byId('north'));
  const south = buildNav(registry, byId('south'));
  const personal = buildNav(registry, byId('personal'));
  const badge = (nav) => nav[0].items.find((i) => i.path === '/app/overview').badge;

  assert.equal(badge(north), 3);
  assert.equal(badge(south), 7);
  assert.equal(badge(personal), null);
  assert.deepEqual(paths(north), paths(south));
  assert.ok(!paths(personal).includes('/app/settings'));
  assert.deepEqual(paths(personal), paths(north).filter((p) => p !== '/app/settings'));
});

test('breadcrumbs: цепочка parent от корня', () => {
  assert.deepEqual(
    breadcrumbs(registry, '/app/account/security').map((c) => c.title),
    ['Главная', 'Профиль', 'Безопасность'],
  );
  assert.deepEqual(breadcrumbs(registry, '/app').map((c) => c.title), ['Главная']);
  assert.deepEqual(breadcrumbs(registry, '/missing'), []);
});

test('breadcrumbs не зацикливается на кривом реестре', () => {
  const broken = { sections: [], routes: [{ path: '/a', parent: '/b', title: 'A' }, { path: '/b', parent: '/a', title: 'B' }] };
  assert.deepEqual(breadcrumbs(broken, '/a').map((c) => c.path), ['/b', '/a']);
});
