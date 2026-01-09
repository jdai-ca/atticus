import { ApiKeyAuth, loadApiKeysFromEnv, loadAdminKeysFromEnv } from '../server/auth';
import { Request, Response, NextFunction } from 'express';

describe('ApiKeyAuth admin support', () => {
    let auth: ApiKeyAuth;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        // admin key must also be in the authorized keys set to be accepted
        auth = new ApiKeyAuth(['key1', 'key2', 'admin-1'], ['admin-1']);
        mockReq = { headers: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    it('attaches isAdmin flag for admin keys', () => {
        mockReq.headers = { 'x-api-key': 'admin-1' };
        const middleware = auth.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect((mockReq as any).isAdmin).toBe(true);
        expect((mockReq as any).apiKeyShape).toBe('admin-1...');
        expect((mockReq as any).apiKey).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('non-admin keys are not admin', () => {
        mockReq.headers = { 'x-api-key': 'key1' };
        const middleware = auth.middleware();
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect((mockReq as any).isAdmin).toBe(false);
        expect((mockReq as any).apiKeyShape).toBe('key1...');
        expect((mockReq as any).apiKey).toBeUndefined();
        expect(mockNext).toHaveBeenCalled();
    });

    it('loadAdminKeysFromEnv supports ADMIN_API_KEY and AGENTIC_ADMIN_KEYS', () => {
        const origAdmin = process.env.ADMIN_API_KEY;
        const origList = process.env.AGENTIC_ADMIN_KEYS;
        try {
            process.env.ADMIN_API_KEY = 'single-admin';
            expect(loadAdminKeysFromEnv()).toContain('single-admin');

            process.env.AGENTIC_ADMIN_KEYS = 'a,b,c';
            delete process.env.ADMIN_API_KEY;
            const keys = loadAdminKeysFromEnv();
            expect(keys).toEqual(['a', 'b', 'c']);
        } finally {
            if (origAdmin) process.env.ADMIN_API_KEY = origAdmin; else delete process.env.ADMIN_API_KEY;
            if (origList) process.env.AGENTIC_ADMIN_KEYS = origList; else delete process.env.AGENTIC_ADMIN_KEYS;
        }
    });
});
