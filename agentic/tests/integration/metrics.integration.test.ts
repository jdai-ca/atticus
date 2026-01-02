import request from 'supertest';

describe('Metrics endpoint integration', () => {
    let app: any;

    beforeAll(() => {
        // Ensure env has a valid API key before loading server
        process.env.AGENTIC_API_KEYS = 'test-key';
        // Load app after env set
        app = require('../../server/index').default;
    });

    it('rejects unauthenticated access to /metrics', async () => {
        const res = await request(app).get('/metrics');
        expect(res.status).toBe(401);
    });

    it('allows authenticated access to /metrics', async () => {
        const res = await request(app).get('/metrics').set('X-API-Key', 'test-key');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBeDefined();
        expect(typeof res.text).toBe('string');
    });
});
