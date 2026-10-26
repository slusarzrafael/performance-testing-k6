// Objetivo: verificar a página, endpoints públicos e recomendação autenticada.
// Fluxo: nomes/frases em batch, cookie, status 418 esperado e gerar pizza.
// Carga: 1 VU por 30s; rating é opt-in porque altera dados do demo público.
// Interpretação: checks e thresholds devem passar; compare p95/p99 e falhas HTTP.
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import exec from 'k6/execution';
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, ratingIsEnabled } from '../../config/env.js';
import { authHeaders, resolveToken } from '../../lib/auth.js';
import { checkApiStatus, checkPizzaResponse } from '../../lib/checks.js';
import { loadUsers } from '../../lib/data.js';
import { activeVirtualUsers } from '../../lib/metrics.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { test_type: 'smoke' },
    },
  },
};

export function setup() {
  return {
    token: resolveToken(USERS),
    enableRating: ratingIsEnabled(),
  };
}

export default function (data) {
  activeVirtualUsers.add(exec.instance.vusActive);

  group('endpoints-publicos', () => {
    const responses = http.batch([
      {
        method: 'GET',
        url: `${BASE_URL}/api/names`,
        params: { tags: { endpoint: 'names', flow: 'smoke' } },
      },
      {
        method: 'GET',
        url: `${BASE_URL}/api/quotes`,
        params: { tags: { endpoint: 'quotes', flow: 'smoke' } },
      },
    ]);

    check(responses[0], {
      'names returns 200': (response) => response.status === 200,
      'names response is not empty': (response) => response.json('names').length > 0,
    });
    check(responses[1], {
      'quotes returns 200': (response) => response.status === 200,
      'quotes response is not empty': (response) => response.json('quotes').length > 0,
    });

    const cookieJar = http.cookieJar();
    cookieJar.set(BASE_URL, 'k6_lab', 'smoke');
    const cookieResponse = http.get(`${BASE_URL}/api/cookies`, {
      tags: { endpoint: 'cookies', flow: 'smoke' },
    });
    check(cookieResponse, {
      'cookie endpoint echoes the test cookie': (response) => response.json('cookies.k6_lab') === 'smoke',
    });

    const expectedClientError = http.get(`${BASE_URL}/api/status/418`, {
      responseCallback: http.expectedStatuses(200, 418),
      tags: { endpoint: 'expected-status', flow: 'smoke' },
    });
    checkApiStatus(expectedClientError, 418, 'documented 418 is returned');
  });

  group('recomendacao-autenticada', () => {
    const response = http.post(
      `${BASE_URL}/api/pizza`,
      JSON.stringify({
        mustBeVegetarian: true,
        minNumberOfToppings: 1,
        maxNumberOfToppings: 4,
      }),
      {
        headers: authHeaders(data.token),
        tags: { endpoint: 'pizza', flow: 'smoke' },
      },
    );
    const validPizza = checkPizzaResponse(response);

    if (validPizza && data.enableRating && __ITER === 0) {
      const catalogPizza = http.get(`${BASE_URL}/api/pizza/1`, {
        headers: authHeaders(data.token),
        tags: { endpoint: 'pizza-by-id', flow: 'rating' },
      });
      const validCatalogPizza = check(catalogPizza, {
        'catalog pizza 1 returns 200': (res) => res.status === 200,
      });

      if (validCatalogPizza) {
        const rating = http.post(
          `${BASE_URL}/api/ratings`,
          JSON.stringify({ pizza_id: 1, stars: 5 }),
          {
            headers: authHeaders(data.token),
            tags: { endpoint: 'ratings', flow: 'rating' },
          },
        );
        const created = check(rating, {
          'rating returns 201': (res) => res.status === 201,
        });

        if (created && rating.json('id')) {
          const deletion = http.del(`${BASE_URL}/api/ratings/${rating.json('id')}`, null, {
            headers: authHeaders(data.token),
            tags: { endpoint: 'ratings', flow: 'rating-cleanup' },
          });
          check(deletion, {
            'rating cleanup returns 204': (res) => res.status === 204,
          });
        }
      }
    }
  });

  sleep(1);
}

export function teardown() {
  console.log('Smoke QuickPizza concluído.');
}

export function handleSummary(data) {
  return writeSummary(data);
}