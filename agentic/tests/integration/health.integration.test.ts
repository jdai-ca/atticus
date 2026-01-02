import request from 'supertest';

describe('Health endpoint integration', () => {
    let app: any;

    beforeAll(() => {
        process.env.AGENTIC_API_KEYS = 'health-key';
        app = require('../../server/index').default;
    });

    it('returns status ok and basic fields', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.service).toBeDefined();
        expect(typeof res.body.uptimeMs).toBe('number');
        expect(typeof res.body.timestamp).toBe('string');
    });
});
