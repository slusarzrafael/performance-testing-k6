// Objetivo: observar estabilidade e degradação lenta do QuickPizza.
// Fluxo: gerar recomendações continuamente e reutilizar o token do setup.
// Carga: desativada por padrão; 5 VUs/10 min, configurável, público até 20 VUs.
// Interpretação: observe tendências de p95/p99, falhas e throughput ao longo do tempo.
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, HIGH_LOAD_ENABLED, readDuration, readVus } from '../../config/env.js';
import { resolveToken } from '../../lib/auth.js';
import { loadUsers } from '../../lib/data.js';
import { generatePizza } from '../../lib/pizzaFlow.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();
const VUS = readVus(5);
const DURATION = readDuration(600, 600, 1800);

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    soak: HIGH_LOAD_ENABLED
      ? {
          executor: 'constant-vus',
          vus: VUS,
          duration: DURATION,
          tags: { test_type: 'soak' },
        }
      : { executor: 'shared-iterations', vus: 1, iterations: 1 },
  },
};

export function setup() {
  if (!HIGH_LOAD_ENABLED) {
    console.log('Soak desativado: defina ENABLE_HIGH_LOAD=true para habilitar.');
    return { enabled: false };
  }

  return { enabled: true, token: resolveToken(USERS) };
}

export default function (data) {
  if (data.enabled) {
    generatePizza(data.token, 'soak');
  }
}

export function teardown() {
  console.log(`Soak QuickPizza concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}