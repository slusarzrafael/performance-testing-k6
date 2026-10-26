import http from 'k6/http';
import { group, sleep } from 'k6';
import exec from 'k6/execution';
import { BASE_URL } from '../config/env.js';
import { authHeaders } from './auth.js';
import { checkPizzaResponse } from './checks.js';
import { activeVirtualUsers } from './metrics.js';

export function generatePizza(token, testType, thinkTime = 1) {
  activeVirtualUsers.add(exec.instance.vusActive);

  let response;
  group(`${testType}.recomendacao`, () => {
    response = http.post(
      `${BASE_URL}/api/pizza`,
      JSON.stringify({
        mustBeVegetarian: true,
        minNumberOfToppings: 1,
        maxNumberOfToppings: 4,
      }),
      {
        headers: authHeaders(token),
        tags: { endpoint: 'pizza', test_type: testType },
      },
    );
    checkPizzaResponse(response);
  });

  sleep(thinkTime);
  return response;
}