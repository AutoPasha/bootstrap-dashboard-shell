// Сводка матрицы из JSON-отчёта Playwright: таблица маршрут × браузер × ширина.
// В GitHub Actions пишется в итоги прогона; падает, если сочетаний не 108
// или хоть одно не прошло, чтобы матрица не могла тихо сократиться.

import { readFileSync, appendFileSync } from 'node:fs';
import { registry } from '../src/routes.js';
import { WIDTHS } from '../playwright.config.js';

const BROWSERS = ['chromium', 'firefox', 'webkit'];
const EXPECTED = registry.routes.length * BROWSERS.length * WIDTHS.length;

const report = JSON.parse(readFileSync('test-results/results.json', 'utf8'));
const cells = new Map(); // `${route}|${project}` → ok
let contextOk = 0;
let contextAll = 0;

function walk(suite) {
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const ok = t.status === 'expected';
      if (spec.file.endsWith('matrix.spec.js')) cells.set(`${spec.title}|${t.projectName}`, ok);
      else {
        contextAll += 1;
        if (ok) contextOk += 1;
      }
    }
  }
  (suite.suites ?? []).forEach(walk);
}
report.suites.forEach(walk);

const passed = [...cells.values()].filter(Boolean).length;
const columns = BROWSERS.flatMap((b) => WIDTHS.map((w) => `${b}-${w}`));
const mark = (route, column) => {
  const ok = cells.get(`${route}|${column}`);
  return ok === undefined ? '·' : ok ? '✅' : '❌';
};

const lines = [
  `### Матрица: ${passed} из ${EXPECTED} зелёные`,
  '',
  `| маршрут | ${BROWSERS.map((b) => WIDTHS.map((w) => `${b.slice(0, 2)} ${w}`).join(' | ')).join(' | ')} |`,
  `|---|${columns.map(() => ':-:').join('|')}|`,
  ...registry.routes.map((r) => `| \`${r.path}\` | ${columns.map((c) => mark(r.path, c)).join(' | ')} |`),
  '',
  `Сценарии контекста: ${contextOk} из ${contextAll}.`,
];
const text = lines.join('\n');
console.log(text);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${text}\n`);

if (cells.size !== EXPECTED || passed !== EXPECTED || contextOk !== contextAll) {
  console.error(`ожидалось ${EXPECTED} зелёных сочетаний, есть ${passed} из ${cells.size}`);
  process.exit(1);
}
