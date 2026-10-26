import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, IS_LOCAL } from '../config/env.js';

export const PUBLIC_DEMO_TOKEN = 'abcdef0123456789';

export function login(username, password) {
  const response = http.post(
    `${BASE_URL}/api/users/token/login`,
    JSON.stringify({ username, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'login', flow: 'auth' },
    },
  );

  const validLogin = check(response, {
    'login returns 200': (res) => res.status === 200,
    'login returns a token': (res) => Boolean(res.json('token')),
  });

  if (!validLogin) {
    throw new Error(`Falha no login QuickPizza (HTTP ${response.status}).`);
  }

  return response.json('token');
}

export function resolveToken(users) {
  const username = __ENV.QP_USERNAME;
  const password = __ENV.QP_PASSWORD;

  if (Boolean(username) !== Boolean(password)) {
    throw new Error('Defina QP_USERNAME e QP_PASSWORD juntos.');
  }

  if (username && password) {
    return login(username, password);
  }

  if (IS_LOCAL) {
    return login(users[0].username, users[0].password);
  }

  return PUBLIC_DEMO_TOKEN;
}

export function authHeaders(token) {
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
    'X-Load-Profile': __ENV.PROFILE || 'smoke',
  };
}