import request from 'supertest';

describe('API key management integration', () => {
    let app: any;

    beforeAll(() => {
        // admin key must be authorized and listed as admin
        process.env.AGENTIC_API_KEYS = 'admin-1';
        process.env.AGENTIC_ADMIN_KEYS = 'admin-1';
        app = require('../../server/index').default;
    });

    it('rejects non-admin access to /api/keys', async () => {
        // use a non-admin key - reload server with new env
        process.env.AGENTIC_API_KEYS = 'user-1';
        delete require.cache[require.resolve('../../server/index')];
        const app2 = require('../../server/index').default;
        const res = await request(app2).get('/api/keys').set('X-API-Key', 'user-1');
        expect(res.status).toBe(403);
    });

    it('allows admin to add and remove keys', async () => {
        const resAdd = await request(app).post('/api/keys').set('X-API-Key', 'admin-1').send({ key: 'new-key' });
        expect(resAdd.status).toBe(200);
        expect(resAdd.body.added).toBe(true);

        const resGet = await request(app).get('/api/keys').set('X-API-Key', 'admin-1');
        expect(resGet.status).toBe(200);
        expect(typeof resGet.body.count).toBe('number');

        const resDel = await request(app).delete('/api/keys').set('X-API-Key', 'admin-1').send({ key: 'new-key' });
        expect(resDel.status).toBe(200);
        expect(resDel.body.removed).toBe(true);
    });
});
