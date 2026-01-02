import request from 'supertest';

describe('CORS integration', () => {
    let app: any;

    beforeAll(() => {
        process.env.AGENTIC_CORS_ORIGINS = 'http://localhost:3000';
        app = require('../../server/index').default;
    });

    it('responds with Access-Control-Allow-Origin for allowed origin', async () => {
        const res = await request(app).get('/health').set('Origin', 'http://localhost:3000');
        expect(res.headers['access-control-allow-origin']).toBeDefined();
        expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });
});
