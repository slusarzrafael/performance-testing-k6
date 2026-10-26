export const DEFAULT_THRESHOLDS = {
  http_req_duration: [
    { threshold: 'p(95)<1500', abortOnFail: true, delayAbortEval: '20s' },
    'p(99)<3000',
  ],
  http_req_failed: ['rate<0.02'],
  checks: ['rate>0.95'],
  qp_pizza_generation_ms: ['p(95)<1200'],
  qp_api_success_rate: ['rate>0.95'],
};