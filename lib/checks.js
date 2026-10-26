import { check } from 'k6';
import { apiSuccessRate, pizzaGenerationDuration, pizzasGenerated } from './metrics.js';

export function checkPizzaResponse(response) {
  const valid = check(response, {
    'pizza recommendation returns 200': (res) => res.status === 200,
    'pizza response includes an id': (res) => Boolean(res.json('pizza.id')),
    'pizza response includes ingredients': (res) => Array.isArray(res.json('pizza.ingredients')),
  }, { endpoint: 'pizza' });

  apiSuccessRate.add(valid);

  if (valid) {
    pizzasGenerated.add(1);
    pizzaGenerationDuration.add(response.timings.duration);
  }

  return valid;
}

export function checkApiStatus(response, expectedStatus, label) {
  const valid = check(response, {
    [label]: (res) => res.status === expectedStatus,
  });
  apiSuccessRate.add(valid);
  return valid;
}