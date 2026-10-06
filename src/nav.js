// Чистые функции над реестром: без DOM, поэтому проверяются и в node (tests/unit).

export function findRoute(registry, path) {
  return registry.routes.find((r) => r.path === path) ?? null;
}

// Есть ли у страницы смысл в этом контексте. Маршрут при смене контекста
// не меняется, меняется только то, предлагаем ли мы на него перейти.
export function isAvailable(route, context) {
  return !route.only || route.only.includes(context.kind);
}

// Модель меню: разделы реестра с пунктами в порядке реестра. Её рисует одна
// функция renderNav в одну разметку, и эта разметка служит sidebar на
// десктопе и Offcanvas на телефоне (класс offcanvas-lg), разъехаться им негде.
// Контекст влияет на подписи и данные (счётчики), а не на адреса.
export function buildNav(registry, context) {
  return registry.sections
    .map((section) => ({
      id: section.id,
      title: section.title,
      items: registry.routes
        .filter((r) => r.section === section.id && isAvailable(r, context))
        .map((r) => ({
          path: r.path,
          href: `#${r.path}`,
          title: r.title,
          icon: r.icon,
          badge: context.badges?.[r.path] ?? null,
        })),
    }))
    .filter((section) => section.items.length > 0);
}

// Крошки: от корня к текущей странице по цепочке parent.
export function breadcrumbs(registry, path) {
  const chain = [];
  const seen = new Set();
  let route = findRoute(registry, path);
  while (route && !seen.has(route.path)) {
    seen.add(route.path);
    chain.unshift({ path: route.path, href: `#${route.path}`, title: route.title });
    route = route.parent ? findRoute(registry, route.parent) : null;
  }
  return chain;
}
