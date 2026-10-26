// Objetivo: localizar a faixa de throughput em que o QuickPizza degrada.
// Fluxo: aumentar a taxa de recomendações em degraus progressivos.
// Carga: desativada por padrão; público até 10 iterações/s e 20 VUs.
// Interpretação: o primeiro degrau que cruza thresholds indica o limite observado.
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, HIGH_LOAD_ENABLED, readDuration, readRate, readVus } from '../../config/env.js';
import { resolveToken } from '../../lib/auth.js';
import { loadUsers } from '../../lib/data.js';
import { generatePizza } from '../../lib/pizzaFlow.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();
const VUS = readVus(10);
const MAX_RATE = readRate(10);
const STAGE_DURATION = readDuration(20, 120, 600);
const PRE_ALLOCATED_VUS = Math.min(VUS, MAX_RATE);
const STAGES = [0.25, 0.5, 0.75, 1].map((fraction) => ({
  duration: STAGE_DURATION,
  target: Math.max(1, Math.ceil(MAX_RATE * fraction)),
}));

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    breakpoint: HIGH_LOAD_ENABLED
      ? {
          executor: 'ramping-arrival-rate',
          startRate: Math.max(1, Math.ceil(MAX_RATE * 0.25)),
          timeUnit: '1s',
          preAllocatedVUs: PRE_ALLOCATED_VUS,
          maxVUs: VUS,
          stages: [...STAGES, { duration: '10s', target: 0 }],
          tags: { test_type: 'breakpoint' },
        }
      : { executor: 'shared-iterations', vus: 1, iterations: 1 },
  },
};

export function setup() {
  if (!HIGH_LOAD_ENABLED) {
    console.log('Breakpoint desativado: defina ENABLE_HIGH_LOAD=true para habilitar.');
    return { enabled: false };
  }

  return { enabled: true, token: resolveToken(USERS) };
}

export default function (data) {
  if (data.enabled) {
    generatePizza(data.token, 'breakpoint', 0);
  }
}

export function teardown() {
  console.log(`Breakpoint QuickPizza concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}