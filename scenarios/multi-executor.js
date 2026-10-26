// Objetivo: demonstrar executors por VU e compartilhados em um fluxo composto.
// Fluxo: solicitar recomendações autenticadas com um token obtido no setup.
// Carga: 2 VUs; 4 iterações por VU e 6 compartilhadas, sem rating mutável.
// Interpretação: compare duração e throughput por cenário no resumo.
import { DEFAULT_OPTIONS } from '../config/options.js';
import { BASE_URL } from '../config/env.js';
import { resolveToken } from '../lib/auth.js';
import { loadUsers } from '../lib/data.js';
import { generatePizza } from '../lib/pizzaFlow.js';
import { writeSummary } from '../lib/summary.js';

const USERS = loadUsers();

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    per_vu: {
      executor: 'per-vu-iterations',
      vus: 2,
      iterations: 2,
      maxDuration: '2m',
      exec: 'perVuFlow',
      tags: { test_type: 'multi-executor', executor: 'per-vu-iterations' },
    },
    shared: {
      executor: 'shared-iterations',
      vus: 2,
      iterations: 6,
      startTime: '10s',
      maxDuration: '2m',
      exec: 'sharedFlow',
      tags: { test_type: 'multi-executor', executor: 'shared-iterations' },
    },
  },
};

export function setup() {
  return { token: resolveToken(USERS) };
}

export function perVuFlow(data) {
  generatePizza(data.token, 'per-vu-iterations');
}

export function sharedFlow(data) {
  generatePizza(data.token, 'shared-iterations');
}

export function teardown() {
  console.log(`Cenário multi-executor concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}