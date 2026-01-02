import request from 'supertest';

describe('Metrics content integration', () => {
    let app: any;

    beforeAll(() => {
        process.env.AGENTIC_API_KEYS = 'm-key';
        app = require('../../server/index').default;
    });

    it('contains provider and requests metrics', async () => {
        const res = await request(app).get('/metrics').set('X-API-Key', 'm-key');
        expect(res.status).toBe(200);
        expect(res.text.includes('agentic_provider_duration_seconds')).toBe(true);
        expect(res.text.includes('agentic_requests_total')).toBe(true);
    });
});
