// Objetivo: medir a experiência do usuário no fluxo principal do QuickPizza.
// Fluxo: carregar a página, conferir o título e solicitar uma recomendação.
// Carga: 1 navegador Chromium por 30s; execução somente manual.
// Interpretação: avaliar LCP/FCP/CLS e os checks de navegação e recomendação.
import { browser } from 'k6/browser';
import { check } from 'k6';
import { BASE_URL } from '../../config/env.js';
import { writeSummary } from '../../lib/summary.js';

export const options = {
  scenarios: {
    browser: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      options: {
        browser: { type: 'chromium' },
      },
      tags: { test_type: 'browser' },
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
    browser_web_vital_lcp: [{ threshold: 'p(95)<2500', abortOnFail: true, delayAbortEval: '10s' }],
    browser_web_vital_fcp: ['p(95)<1800'],
    browser_web_vital_cls: ['p(95)<0.1'],
  },
};

export default async function () {
  const page = await browser.newPage();

  try {
    const response = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    const heading = await page.locator('h1').textContent();

    check(response, {
      'QuickPizza page returns 200': (res) => res.status() === 200,
    });
    check(heading, {
      'page displays the QuickPizza prompt': (text) => text === 'Looking to break out of your pizza routine?',
    });
    check(page.url(), {
      'browser stays on configured QuickPizza origin': (url) => url.startsWith(BASE_URL),
    });

    await page.locator('button').click();
    const recommendations = page.locator('div#recommendations');
    await recommendations.waitFor({ state: 'visible', timeout: 10000 });
    const recommendationText = await recommendations.textContent();

    check(recommendationText, {
      'pizza recommendation is rendered': (text) => Boolean(text && text.trim()),
    });
  } finally {
    await page.close();
  }
}

export function handleSummary(data) {
  return writeSummary(data);
}