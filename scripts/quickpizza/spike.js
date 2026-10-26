// Objetivo: medir a resposta do QuickPizza a um pico súbito de tráfego.
// Fluxo: gerar recomendações com taxa normal, pico em 5s e retorno rápido.
// Carga: desativada por padrão; público até 10 iterações/s e 20 VUs.
// Interpretação: compare latência e falhas antes, durante e após o pico.
import { DEFAULT_OPTIONS } from '../../config/options.js';
import { BASE_URL, HIGH_LOAD_ENABLED, readDuration, readRate, readVus } from '../../config/env.js';
import { resolveToken } from '../../lib/auth.js';
import { loadUsers } from '../../lib/data.js';
import { generatePizza } from '../../lib/pizzaFlow.js';
import { writeSummary } from '../../lib/summary.js';

const USERS = loadUsers();
const VUS = readVus(10);
const PEAK_RATE = readRate(10);
const NORMAL_RATE = Math.max(1, Math.floor(PEAK_RATE / 5));
const BASELINE_DURATION = readDuration(20, 120, 600);
const PRE_ALLOCATED_VUS = Math.min(VUS, PEAK_RATE);

export const options = {
  ...DEFAULT_OPTIONS,
  scenarios: {
    spike: HIGH_LOAD_ENABLED
      ? {
          executor: 'ramping-arrival-rate',
          startRate: NORMAL_RATE,
          timeUnit: '1s',
          preAllocatedVUs: PRE_ALLOCATED_VUS,
          maxVUs: VUS,
          stages: [
            { duration: BASELINE_DURATION, target: NORMAL_RATE },
            { duration: '5s', target: PEAK_RATE },
            { duration: '5s', target: NORMAL_RATE },
            { duration: BASELINE_DURATION, target: NORMAL_RATE },
            { duration: '5s', target: 0 },
          ],
          tags: { test_type: 'spike' },
        }
      : { executor: 'shared-iterations', vus: 1, iterations: 1 },
  },
};

export function setup() {
  if (!HIGH_LOAD_ENABLED) {
    console.log('Spike desativado: defina ENABLE_HIGH_LOAD=true para habilitar.');
    return { enabled: false };
  }

  return { enabled: true, token: resolveToken(USERS) };
}

export default function (data) {
  if (data.enabled) {
    generatePizza(data.token, 'spike', 0);
  }
}

export function teardown() {
  console.log(`Spike QuickPizza concluído em ${BASE_URL}.`);
}

export function handleSummary(data) {
  return writeSummary(data);
}