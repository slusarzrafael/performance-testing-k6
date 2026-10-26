const PUBLIC_BASE_URL = 'https://quickpizza.grafana.com';
const LOCAL_BASE_URLS = ['http://localhost:3333', 'http://127.0.0.1:3333'];

export const BASE_URL = (__ENV.BASE_URL || PUBLIC_BASE_URL).replace(/\/+$/, '');
export const IS_LOCAL = LOCAL_BASE_URLS.includes(BASE_URL);
export const HIGH_LOAD_ENABLED = __ENV.ENABLE_HIGH_LOAD === 'true';

if (BASE_URL !== PUBLIC_BASE_URL && !IS_LOCAL) {
  throw new Error('BASE_URL deve ser QuickPizza público ou a instância local na porta 3333.');
}

export function readVus(defaultValue = 5, publicMaximum = 20, localMaximum = 100) {
  const requested = Number.parseInt(__ENV.VUS || String(defaultValue), 10);
  const maximum = IS_LOCAL ? localMaximum : publicMaximum;

  if (!Number.isInteger(requested) || requested < 1 || requested > maximum) {
    throw new Error(`VUS deve ser um inteiro entre 1 e ${maximum} para este BASE_URL.`);
  }

  return requested;
}

export function readDuration(defaultSeconds = 120, publicMaximum = 600, localMaximum = 1800) {
  const value = __ENV.DURATION || `${defaultSeconds}s`;
  const match = /^(\d+)(s|m)$/.exec(value);

  if (!match) {
    throw new Error('DURATION deve usar segundos ou minutos, por exemplo 90s ou 3m.');
  }

  const seconds = Number(match[1]) * (match[2] === 'm' ? 60 : 1);
  const maximum = IS_LOCAL ? localMaximum : publicMaximum;

  if (seconds < 1 || seconds > maximum) {
    throw new Error(`DURATION deve ser no máximo ${maximum} segundos para este BASE_URL.`);
  }

  return `${seconds}s`;
}

export function readRate(defaultValue = 5, publicMaximum = 10, localMaximum = 100) {
  const requested = Number.parseInt(__ENV.RATE || String(defaultValue), 10);
  const maximum = IS_LOCAL ? localMaximum : publicMaximum;

  if (!Number.isInteger(requested) || requested < 1 || requested > maximum) {
    throw new Error(`RATE deve ser um inteiro entre 1 e ${maximum} por segundo.`);
  }

  return requested;
}

export function ratingIsEnabled() {
  if (__ENV.QP_ENABLE_RATING !== 'true') {
    return false;
  }

  if (!IS_LOCAL && (!__ENV.QP_USERNAME || !__ENV.QP_PASSWORD)) {
    throw new Error('Ratings no host público exigem QP_USERNAME e QP_PASSWORD explícitos.');
  }

  return true;
}