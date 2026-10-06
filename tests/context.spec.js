// Контекст: живёт в одном сторе оболочки, адреса от него не меняются,
// меняются подписи и данные; страница без смысла уводит на обзор.

import { test, expect } from '@playwright/test';

const title = (page) => page.locator('#page-title');
const contextName = (page) => page.locator('#context-name');
const overviewBadge = (page) => page.locator('#nav a[href="#/app/overview"] .nav-badge');

test('смена контекста с клавиатуры меняет данные, но не адрес', async ({ page }) => {
  await page.goto('/#/app/overview');
  await expect(contextName(page)).toHaveText('Команда «Север»');
  await expect(page.locator('[data-stat]').first()).toHaveText('12');
  await expect(overviewBadge(page)).toHaveText(/^3 /);

  const button = page.locator('#context-button');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#context-menu')).toBeVisible();
  await page.keyboard.press('ArrowDown'); // Север, текущий
  await page.keyboard.press('ArrowDown'); // Юг
  await expect(page.locator('#context-menu [data-switch-context="south"]')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(contextName(page)).toHaveText('Команда «Юг»');
  await expect(page).toHaveURL(/#\/app\/overview$/);
  await expect(title(page)).toHaveText('Обзор');
  await expect(page.locator('[data-stat]').first()).toHaveText('27');
  await expect(overviewBadge(page)).toHaveText(/^7 /);
  await expect(button).toBeFocused();
  await expect(page.locator('#announcer')).toContainText('Команда «Юг»');
});

test('страница без смысла в новом контексте уводит на обзор', async ({ page }) => {
  await page.goto('/#/app/settings');
  await expect(title(page)).toHaveText('Настройки команды');

  await page.locator('#context-button').click();
  await page.locator('#context-menu [data-switch-context="personal"]').click();

  await expect(page).toHaveURL(/#\/app\/overview$/);
  await expect(title(page)).toHaveText('Обзор');
  await expect(title(page)).toBeFocused();
  await expect(page.locator('#nav a[href="#/app/settings"]')).toHaveCount(0);
  await expect(page.locator('#nav [aria-current="page"]')).toHaveAttribute('href', '#/app/overview');
  await expect(page.locator('#announcer')).toContainText('открыт обзор');
});

test('контекст переживает перезагрузку, прямой адрес недоступной страницы уводит на обзор', async ({ page }) => {
  await page.goto('/#/app/workspaces');
  await page.locator('#page [data-switch-context="personal"]').click();
  await expect(contextName(page)).toHaveText('Личное пространство');
  await expect(page).toHaveURL(/#\/app\/workspaces$/);
  await expect(title(page)).toBeFocused();

  await page.reload();
  await expect(contextName(page)).toHaveText('Личное пространство');

  await page.goto('/#/app/settings');
  await expect(page).toHaveURL(/#\/app\/overview$/);
  await expect(title(page)).toHaveText('Обзор');
});

test('неизвестный адрес уводит на главную', async ({ page }) => {
  await page.goto('/#/app/nope');
  await expect(page).toHaveURL(/#\/app$/);
  await expect(title(page)).toHaveText('Главная');

  await page.goto('/');
  await expect(page).toHaveURL(/#\/app$/);
});
