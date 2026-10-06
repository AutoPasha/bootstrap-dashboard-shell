// Demo-данные. В настоящем приложении это ответы API; оболочке всё равно,
// откуда они пришли: она получает контекст и отдаёт его страницам.

export const user = {
  name: 'Анна Демина',
  initials: 'АД',
  email: 'anna@example.com',
  phone: '+7 900 000-00-00',
  sessions: [
    { id: 's1', device: 'Chrome, Linux', icon: 'laptop', place: 'Москва', when: 'сейчас', current: true },
    { id: 's2', device: 'Safari, iPhone', icon: 'phone', place: 'Москва', when: 'вчера, 21:40', current: false },
    { id: 's3', device: 'Firefox, Windows', icon: 'pc-display', place: 'Казань', when: '2 октября', current: false },
  ],
};

const people = {
  olga: { name: 'Ольга Ветрова', initials: 'ОВ', tone: 'teal' },
  ilya: { name: 'Илья Громов', initials: 'ИГ', tone: 'amber' },
  anna: { name: 'Анна Демина', initials: 'АД', tone: 'blue' },
  sergey: { name: 'Сергей Лунин', initials: 'СЛ', tone: 'rose' },
  vera: { name: 'Вера Ким', initials: 'ВК', tone: 'violet' },
};

export const contexts = [
  {
    id: 'north',
    kind: 'team',
    name: 'Команда «Север»',
    short: 'Север',
    initials: 'С',
    tone: 'blue',
    role: 'Администратор',
    badges: { '/app/overview': 3 },
    kpis: [
      { label: 'Открытые задачи', value: 12, delta: -3, good: 'down', icon: 'list-check' },
      { label: 'Закрыто за неделю', value: 31, delta: 6, good: 'up', icon: 'check2-circle' },
      { label: 'Первый ответ', value: '1 ч 40 мин', delta: -12, unit: 'мин', good: 'down', icon: 'chat-left-text' },
      { label: 'Участники', value: 8, delta: 1, good: 'up', icon: 'people' },
    ],
    closedByDay: [3, 5, 2, 6, 4, 1, 0, 4, 7, 5, 6, 3, 1, 2],
    tasks: [
      { title: 'Импорт прайса поставщика', who: people.olga, status: 'Готово', tone: 'success', due: 'сегодня' },
      { title: 'Выгрузка остатков на склад', who: people.ilya, status: 'В работе', tone: 'primary', due: 'завтра' },
      { title: 'Шаблон счёта для юрлиц', who: people.anna, status: 'На проверке', tone: 'warning', due: '9 окт' },
      { title: 'Права доступа для бухгалтерии', who: people.vera, status: 'В работе', tone: 'primary', due: '10 окт' },
    ],
    today: [
      { time: '11:00', text: 'Созвон по выгрузке остатков' },
      { time: '15:30', text: 'Проверить шаблон счёта' },
    ],
    events: [
      { who: people.olga, text: 'закрыла задачу «Импорт прайса поставщика»', when: '12 мин назад' },
      { who: people.ilya, text: 'вступил в команду', when: '1 ч назад' },
      { who: people.vera, text: 'оставила комментарий к задаче «Права доступа»', when: 'вчера' },
    ],
    members: [
      { ...people.anna, role: 'Администратор' },
      { ...people.olga, role: 'Участник' },
      { ...people.ilya, role: 'Участник' },
      { ...people.vera, role: 'Наблюдатель' },
    ],
    settings: { title: 'Север', slug: 'north', timezone: 'Europe/Moscow', digest: true, mentions: true },
  },
  {
    id: 'south',
    kind: 'team',
    name: 'Команда «Юг»',
    short: 'Юг',
    initials: 'Ю',
    tone: 'amber',
    role: 'Участник',
    badges: { '/app/overview': 7 },
    kpis: [
      { label: 'Открытые задачи', value: 27, delta: 5, good: 'down', icon: 'list-check' },
      { label: 'Закрыто за неделю', value: 9, delta: -4, good: 'up', icon: 'check2-circle' },
      { label: 'Первый ответ', value: '3 ч 05 мин', delta: 25, unit: 'мин', good: 'down', icon: 'chat-left-text' },
      { label: 'Участники', value: 4, delta: 0, good: 'up', icon: 'people' },
    ],
    closedByDay: [1, 0, 2, 1, 3, 0, 0, 1, 2, 1, 0, 2, 1, 1],
    tasks: [
      { title: 'Новый заказ из формы на сайте', who: people.sergey, status: 'Новая', tone: 'secondary', due: 'сегодня' },
      { title: 'Акт сверки с поставщиком', who: people.anna, status: 'В работе', tone: 'primary', due: 'завтра' },
      { title: 'Обновить реквизиты в договоре', who: people.sergey, status: 'Ждёт ответа', tone: 'warning', due: '12 окт' },
    ],
    today: [{ time: '12:00', text: 'Разобрать заказы из формы' }],
    events: [
      { who: people.sergey, text: 'переназначил задачу «Акт сверки» на вас', when: '30 мин назад' },
      { who: people.sergey, text: 'создал задачу «Новый заказ из формы»', when: '2 ч назад' },
    ],
    members: [
      { ...people.sergey, role: 'Администратор' },
      { ...people.anna, role: 'Участник' },
    ],
    settings: { title: 'Юг', slug: 'south', timezone: 'Europe/Samara', digest: false, mentions: true },
  },
  {
    id: 'personal',
    kind: 'personal',
    name: 'Личное пространство',
    short: 'Личное',
    initials: 'Л',
    tone: 'teal',
    role: 'Владелец',
    badges: {},
    kpis: [
      { label: 'Мои задачи', value: 5, delta: -1, good: 'down', icon: 'list-check' },
      { label: 'Закрыто за неделю', value: 6, delta: 2, good: 'up', icon: 'check2-circle' },
      { label: 'Заметки', value: 14, delta: 3, good: 'up', icon: 'journal-text' },
      { label: 'Напоминания', value: 2, delta: 0, good: 'down', icon: 'bell' },
    ],
    closedByDay: [0, 1, 1, 0, 2, 0, 0, 1, 0, 1, 2, 0, 1, 1],
    tasks: [
      { title: 'Продлить домен', who: people.anna, status: 'Срочно', tone: 'danger', due: 'пятница' },
      { title: 'Собрать документы для визы', who: people.anna, status: 'В работе', tone: 'primary', due: '20 окт' },
    ],
    today: [{ time: '19:00', text: 'Продлить домен до пятницы' }],
    events: [{ who: people.anna, text: 'добавили напоминание «Продлить домен»', when: 'вчера' }],
    members: [{ ...people.anna, role: 'Владелец' }],
    settings: null,
  },
];

export const DEFAULT_CONTEXT = 'north';
