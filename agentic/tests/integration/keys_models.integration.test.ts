import request from 'supertest';

describe('API key models endpoint', () => {
    let app: any;

    beforeAll(() => {
        process.env.AGENTIC_API_KEYS = 'testkey,admin-1';
        process.env.AGENTIC_ADMIN_KEYS = 'admin-1';
        delete require.cache[require.resolve('../../server/index')];
        app = require('../../server/index').default;
    });

    it('returns models for caller key', async () => {
        const res = await request(app).get('/api/keys/me/models').set('X-API-Key', 'testkey');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.models)).toBe(true);
        expect(res.body.models.length).toBeGreaterThan(0);
        expect(res.body.models[0]).toHaveProperty('providerId');
        expect(res.body.models[0]).toHaveProperty('modelId');
        expect(res.body.models[0]).toHaveProperty('enabled');
    });

    it('admin can query another key', async () => {
        const res = await request(app).get('/api/keys/me/models').query({ key: 'testkey' }).set('X-API-Key', 'admin-1');
        expect(res.status).toBe(200);
        expect(res.body.key).toBe('testkey');
    });

    it('non-admin cannot query other key', async () => {
        const res = await request(app).get('/api/keys/me/models').query({ key: 'admin-1' }).set('X-API-Key', 'testkey');
        expect(res.status).toBe(403);
    });
});
