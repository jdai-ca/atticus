import request from 'supertest';
import { auditLogger } from '../../services/audit-logger';

describe('Audit export integration', () => {
    let app: any;

    beforeAll(async () => {
        process.env.AGENTIC_API_KEYS = 'audit-key';
        app = require('../../server/index').default;
        // write a test audit event
        await auditLogger.logEvent(
            (auditLogger as any).AuditEventType?.SYSTEM_ERROR || 'SYSTEM_ERROR',
            (auditLogger as any).AuditSeverity?.ERROR || 'ERROR',
            'SYSTEM',
            'integration-test',
            { test: true },
            'integration-conv'
        );
    });

    it('requires auth for /audit/export and returns NDJSON', async () => {
        const unauth = await request(app).get('/audit/export');
        expect(unauth.status).toBe(401);

        const res = await request(app).get('/audit/export').set('X-API-Key', 'audit-key');
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/x-ndjson/);
        expect(typeof res.text).toBe('string');
        expect(res.text.length).toBeGreaterThan(0);
    });
});
