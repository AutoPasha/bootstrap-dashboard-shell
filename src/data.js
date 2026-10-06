// Demo-данные. В настоящем приложении это ответы API; оболочке всё равно,
// откуда они пришли: она получает контекст и отдаёт его страницам.

export const user = {
  name: 'Анна Демина',
  email: 'anna@example.com',
  sessions: [
    { device: 'Chrome, Linux', place: 'Москва', when: 'сейчас', current: true },
    { device: 'Safari, iPhone', place: 'Москва', when: 'вчера, 21:40', current: false },
    { device: 'Firefox, Windows', place: 'Казань', when: '2 октября', current: false },
  ],
};

export const contexts = [
  {
    id: 'north',
    kind: 'team',
    name: 'Команда «Север»',
    role: 'Администратор',
    badges: { '/app/overview': 3 },
    stats: [
      { label: 'Открытые задачи', value: 12 },
      { label: 'Закрыто за неделю', value: 31 },
      { label: 'Участники', value: 8 },
    ],
    events: [
      'Ольга закрыла задачу «Импорт прайса»',
      'Добавлен участник: Илья',
      'Ночная выгрузка прошла без ошибок',
    ],
    settings: { title: 'Север', timezone: 'Europe/Moscow', digest: true },
  },
  {
    id: 'south',
    kind: 'team',
    name: 'Команда «Юг»',
    role: 'Участник',
    badges: { '/app/overview': 7 },
    stats: [
      { label: 'Открытые задачи', value: 27 },
      { label: 'Закрыто за неделю', value: 9 },
      { label: 'Участники', value: 4 },
    ],
    events: [
      'Новый заказ из формы на сайте',
      'Сергей переназначил задачу «Акт сверки»',
    ],
    settings: { title: 'Юг', timezone: 'Europe/Samara', digest: false },
  },
  {
    id: 'personal',
    kind: 'personal',
    name: 'Личное пространство',
    role: 'Владелец',
    badges: {},
    stats: [
      { label: 'Мои задачи', value: 5 },
      { label: 'Закрыто за неделю', value: 6 },
      { label: 'Заметки', value: 14 },
    ],
    events: ['Напоминание: продлить домен до пятницы'],
    settings: null,
  },
];

export const DEFAULT_CONTEXT = 'north';
