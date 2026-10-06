// Реестр маршрутов — единственный источник для меню, Offcanvas, крошек,
// заголовка h1 и document.title. Новая страница появляется во всех местах
// сразу, как только её строка попала сюда.
//
//   path    — адрес страницы (в demo живёт в hash: #/app/overview)
//   title   — подпись в меню, крошках и h1
//   parent  — путь родителя; из цепочки parent строятся крошки и вложенность меню
//   section — раздел меню; null — страницы нет в меню, но она есть в крошках
//   icon    — имя иконки Bootstrap Icons
//   only    — необязательно: виды контекста, в которых у страницы есть смысл

export const sections = [
  { id: 'work', title: 'Работа' },
  { id: 'account', title: 'Аккаунт' },
];

export const routes = [
  { path: '/app', title: 'Главная', parent: null, section: 'work', icon: 'house' },
  { path: '/app/overview', title: 'Обзор', parent: '/app', section: 'work', icon: 'speedometer2' },
  { path: '/app/workspaces', title: 'Пространства', parent: '/app', section: 'work', icon: 'grid-1x2' },
  { path: '/app/settings', title: 'Настройки команды', parent: '/app', section: 'work', icon: 'sliders', only: ['team'] },
  { path: '/app/account', title: 'Профиль', parent: '/app', section: 'account', icon: 'person-circle' },
  { path: '/app/account/security', title: 'Безопасность', parent: '/app/account', section: 'account', icon: 'shield-lock' },
];

export const registry = { sections, routes };

// Куда вести, если адреса нет в реестре.
export const HOME = '/app';
// Куда вести, если у текущей страницы нет смысла в выбранном контексте.
export const FALLBACK = '/app/overview';
