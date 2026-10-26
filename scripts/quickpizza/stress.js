// Objetivo: observar degradação progressiva do QuickPizza em degraus controlados.
// Fluxo: reusar token e gerar recomendações em rampas de VUs crescentes.
// Carga: desativada por padrão; habilite ENABLE_HIGH_LOAD=true; público até 20 VUs.
// Interpretação: acompanhe p95/p99, erros e o degrau em que thresholds falham.
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, HIGH_LOAD_ENABLED, readDuration, readVus } from '../../config/env.js';
import { resolveToken } from '../../lib/auth.js';
import { loadUsers } from '../../lib/data.js';
import { generatePizza } from '../../lib/pizzaFlow.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();
const VUS = readVus(8);
const STAGE_DURATION = readDuration(15, 120, 600);
const STAGES = [0.25, 0.5, 0.75, 1].map((fraction) => ({
  duration: STAGE_DURATION,
  target: Math.max(1, Math.ceil(VUS * fraction)),
}));
STAGES.push({ duration: '10s', target: 0 });

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    stress: HIGH_LOAD_ENABLED
      ? {
          executor: 'ramping-vus',
          startVUs: 1,
          stages: STAGES,
          gracefulRampDown: '5s',
          tags: { test_type: 'stress' },
        }
      : { executor: 'shared-iterations', vus: 1, iterations: 1 },
  },
};

export function setup() {
  if (!HIGH_LOAD_ENABLED) {
    console.log('Stress desativado: defina ENABLE_HIGH_LOAD=true para habilitar.');
    return { enabled: false };
  }

  return { enabled: true, token: resolveToken(USERS) };
}

export default function (data) {
  if (data.enabled) {
    generatePizza(data.token, 'stress');
  }
}

export function teardown() {
  console.log(`Stress QuickPizza concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}