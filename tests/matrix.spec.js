// Матрица: 6 маршрутов × 3 браузера × 6 ширин = 108 прогонов.
// Каждый прогон: заголовок, активный пункт, крошки, нет прокрутки вбок,
// skip-link, меню с клавиатуры (Offcanvas до lg, sidebar от lg) и фокус на h1
// после перехода на соседнюю страницу.

import { test, expect } from '@playwright/test';
import { registry } from '../src/routes.js';
import { breadcrumbs } from '../src/nav.js';

const LG = 992;
const { routes } = registry;

async function noHorizontalScroll(page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, 'страница шире окна, появилась прокрутка вбок').toBeLessThanOrEqual(client);
}

async function expectRoute(page, route) {
  await expect(page.locator('#page-title')).toHaveText(route.title);
  await expect(page).toHaveTitle(`${route.title} · Dashboard Shell`);

  const current = page.locator('#nav [aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('href', `#${route.path}`);

  const crumbs = page.locator('#crumbs li');
  await expect(crumbs).toHaveText(breadcrumbs(registry, route.path).map((c) => c.title));
  await expect(crumbs.last()).toHaveAttribute('aria-current', 'page');
  await expect(crumbs.last().locator('a')).toHaveCount(0);
}

// Tab, пока фокус не встанет на ссылку с нужным адресом: настоящая клавиатура, без .focus().
async function tabTo(page, href, limit = 30) {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    const at = await page.evaluate(() => document.activeElement?.getAttribute('href'));
    if (at === href) return;
  }
  throw new Error(`за ${limit} нажатий Tab фокус не дошёл до ${href}`);
}

routes.forEach((route, i) => {
  const target = routes[(i + 1) % routes.length];

  test(route.path, async ({ page }, testInfo) => {
    const narrow = testInfo.project.use.viewport.width < LG;
    const title = page.locator('#page-title');
    const toggle = page.locator('#menu-toggle');
    const sidebar = page.locator('#sidebar');
    const activeLink = page.locator('#nav [aria-current="page"]');

    await page.goto(`/#${route.path}`);
    await expectRoute(page, route);
    await noHorizontalScroll(page);

    // skip-link: первый Tab, виден, Enter ставит фокус на h1 и не трогает адрес
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(title).toBeFocused();
    expect(new URL(page.url()).hash).toBe(`#${route.path}`);

    await page.reload();
    await expectRoute(page, route);
    await page.keyboard.press('Tab'); // skip-link

    if (narrow) {
      await expect(toggle).toBeVisible();
      await expect(activeLink).toBeHidden();

      await page.keyboard.press('Tab');
      await expect(toggle).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(sidebar).toHaveClass(/\bshow\b/);
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(activeLink).toBeFocused();
      await noHorizontalScroll(page);

      // Esc закрывает меню и возвращает фокус на кнопку
      await page.keyboard.press('Escape');
      await expect(sidebar).not.toHaveClass(/\bshow\b/);
      await expect(toggle).toBeFocused();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');

      // снова открыть и уйти на соседнюю страницу: меню закрывается само
      await page.keyboard.press('Enter');
      await expect(activeLink).toBeFocused();
      await tabTo(page, `#${target.path}`);
      await page.keyboard.press('Enter');
      await expect(sidebar).not.toHaveClass(/\bshow\b/);
    } else {
      await expect(toggle).toBeHidden();
      await expect(activeLink).toBeInViewport();

      await tabTo(page, `#${target.path}`);
      await page.keyboard.press('Enter');
    }

    // после перехода фокус на h1 новой страницы, меню и крошки уже про неё
    await expect(title).toBeFocused();
    await expectRoute(page, target);
    await noHorizontalScroll(page);
  });
});
