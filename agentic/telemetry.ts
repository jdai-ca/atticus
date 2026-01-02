import client from 'prom-client';
import { createLogger } from './utils/logger';

const logger = createLogger('telemetry');

export const collectDefaultMetrics = client.collectDefaultMetrics;

// Initialize default metrics collection once
try {
    collectDefaultMetrics({ prefix: 'agentic_' });
} catch (err) {
    logger.warn({ err }, 'collectDefaultMetrics failed (already initialized?)');
}

export const requestsTotal = new client.Counter({
    name: 'agentic_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
});

export const providerDuration = new client.Histogram({
    name: 'agentic_provider_duration_seconds',
    help: 'Duration of provider calls in seconds',
    labelNames: ['provider', 'model']
});

export const register = client.register;

export default {
    collectDefaultMetrics,
    requestsTotal,
    providerDuration,
    register
};
