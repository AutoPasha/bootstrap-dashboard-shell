// Сценарии поверх матрицы: поиск по разделам, тема, свёрнутое меню,
// дела на сегодня, фильтр задач, завершение сеанса.

import { test, expect } from '@playwright/test';

const LG = 992;
const title = (page) => page.locator('#page-title');
const palette = (page) => page.locator('#palette');
const paletteInput = (page) => page.locator('#palette-input');

async function noHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'страница шире окна').toBeLessThanOrEqual(0);
}

test('поиск Ctrl+K находит раздел и переводит туда с фокусом на h1', async ({ page }) => {
  await page.goto('/#/app');
  await expect(title(page)).toHaveText('Главная');

  await page.keyboard.press('Control+k');
  await expect(palette(page)).toBeVisible();
  await expect(paletteInput(page)).toBeFocused();
  await noHorizontalScroll(page);

  await page.keyboard.type('безоп');
  const active = page.locator('#palette-list [aria-selected="true"]');
  await expect(active).toContainText('Безопасность');
  await expect(paletteInput(page)).toHaveAttribute('aria-activedescendant', await active.getAttribute('id'));
  await page.keyboard.press('Enter');

  await expect(palette(page)).toBeHidden();
  await expect(page).toHaveURL(/#\/app\/account\/security$/);
  await expect(title(page)).toHaveText('Безопасность');
  await expect(title(page)).toBeFocused();
});

test('поиск: стрелки выбирают пункт, Esc закрывает и возвращает фокус на кнопку', async ({ page }) => {
  await page.goto('/#/app/overview');
  const button = page.locator('#search-button');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(paletteInput(page)).toBeFocused();

  const options = page.locator('#palette-list [role="option"]');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(options.last()).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.type('нет такого раздела');
  await expect(page.locator('#palette-list')).toContainText('Ничего не нашлось');

  await page.keyboard.press('Escape');
  await expect(palette(page)).toBeHidden();
  await expect(button).toBeFocused();
  await expect(page).toHaveURL(/#\/app\/overview$/);
});

test('поиск переключает пространство, адрес остаётся', async ({ page }) => {
  await page.goto('/#/app/workspaces');
  await page.keyboard.press('Control+k');
  await page.keyboard.type('юг');
  await expect(page.locator('#palette-list [aria-selected="true"]')).toContainText('Перейти в «Юг»');
  await page.keyboard.press('Enter');

  await expect(page.locator('#context-name')).toHaveText('Команда «Юг»');
  await expect(page).toHaveURL(/#\/app\/workspaces$/);
  await expect(title(page)).toBeFocused();
});

test('тёмная тема включается и переживает перезагрузку', async ({ page }, testInfo) => {
  await page.goto('/#/app/overview');
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'light');

  if (testInfo.project.use.viewport.width >= 576) {
    const toggle = page.locator('#theme-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  } else {
    await page.keyboard.press('Control+k');
    await page.keyboard.type('тёмн');
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(10, 16, 32)');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-bs-theme', 'dark');
  await expect(title(page)).toHaveText('Обзор');
  await noHorizontalScroll(page);
});

test('свёрнутое меню на ноутбуке: иконки, активный пункт, подписи для читалки', async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport.width < LG, 'меню сворачивается только от 992px');
  await page.goto('/#/app/account/security');
  const sidebar = page.locator('.shell-sidebar');
  const wide = (await sidebar.boundingBox()).width;

  await page.locator('#collapse-toggle').click();
  await expect(page.locator('html')).toHaveClass(/is-collapsed/);
  await expect(page.locator('#collapse-toggle')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await sidebar.boundingBox()).width).toBeLessThan(wide / 2);

  const active = page.locator('#nav [aria-current="page"]');
  await expect(active).toBeVisible();
  await expect(active).toHaveAccessibleName('Безопасность');
  await noHorizontalScroll(page);

  await page.reload();
  await expect(page.locator('html')).toHaveClass(/is-collapsed/);
  await page.locator('#collapse-toggle').click();
  await expect(page.locator('html')).not.toHaveClass(/is-collapsed/);
});

test('дело на сегодня отмечается с клавиатуры, фильтр задач держит фокус', async ({ page }) => {
  await page.goto('/#/app');
  const box = page.locator('[data-today]').first();
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
  await expect(page.locator('.today-item').first()).toHaveClass(/is-done/);

  await page.goto('/#/app/overview');
  const rows = page.locator('.rows .task');
  await expect(rows).toHaveCount(4);
  const mine = page.locator('[data-task-filter="mine"]');
  await mine.click();
  await expect(mine).toHaveAttribute('aria-pressed', 'true');
  await expect(mine).toBeFocused();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Шаблон счёта');
});

test('завершение сеанса убирает строку и ставит фокус на заголовок списка', async ({ page }) => {
  await page.goto('/#/app/account/security');
  const sessions = page.locator('.session');
  await expect(sessions).toHaveCount(3);
  await page.locator('[data-end-session]').first().click();
  await expect(sessions).toHaveCount(2);
  await expect(page.locator('#sessions-title')).toBeFocused();
  await expect(page.locator('#announcer')).toContainText('Сеанс завершён');
});
