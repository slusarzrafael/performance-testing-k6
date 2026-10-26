import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

export const pizzasGenerated = new Counter('qp_pizzas_generated');
export const pizzaGenerationDuration = new Trend('qp_pizza_generation_ms', true);
export const apiSuccessRate = new Rate('qp_api_success_rate');
export const activeVirtualUsers = new Gauge('qp_active_vus');