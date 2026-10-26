import { DEFAULT_THRESHOLDS } from './thresholds.js';

export const DEFAULT_OPTIONS = {
  maxRedirects: 0,
  userAgent: 'k6-performance-lab/1.0',
  thresholds: DEFAULT_THRESHOLDS,
  discardResponseBodies: false,
};