// Objetivo: medir o comportamento sustentado do QuickPizza sob carga típica.
// Fluxo: reusar um token obtido no setup e solicitar recomendações de pizza.
// Carga: rampa até VUS, patamar configurável e descida; padrão 5 VUs por 2 min.
// Interpretação: observar p95/p99, taxa de falhas, checks e pizzas por segundo.
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, readDuration, readVus } from '../../config/env.js';
import { resolveToken } from '../../lib/auth.js';
import { loadUsers } from '../../lib/data.js';
import { generatePizza } from '../../lib/pizzaFlow.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();
const VUS = readVus(5);
const HOLD_DURATION = readDuration(120);

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    load: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: VUS },
        { duration: HOLD_DURATION, target: VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
      tags: { test_type: 'load' },
    },
  },
};

export function setup() {
  return { token: resolveToken(USERS) };
}

export default function (data) {
  generatePizza(data.token, 'load');
}

export function teardown() {
  console.log(`Load QuickPizza concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}