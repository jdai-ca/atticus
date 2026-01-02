/**
 * API Key Authentication Tests
 */

import { ApiKeyAuth, loadApiKeysFromEnv } from '../server/auth';
import { Request, Response, NextFunction } from 'express';

describe('ApiKeyAuth', () => {
    let auth: ApiKeyAuth;
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        auth = new ApiKeyAuth(['valid-key-1', 'valid-key-2']);

        mockReq = {
            headers: {}
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
    });

    describe('middleware', () => {
        it('should accept valid API key', () => {
            mockReq.headers = { 'x-api-key': 'valid-key-1' };

            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should reject request without API key', () => {
            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Unauthorized',
                message: 'API key required. Provide X-API-Key header.'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject invalid API key', () => {
            mockReq.headers = { 'x-api-key': 'invalid-key' };

            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                message: 'Invalid API key'
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should accept second valid key', () => {
            mockReq.headers = { 'x-api-key': 'valid-key-2' };

            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('key management', () => {
        it('should add new key', () => {
            expect(auth.getKeyCount()).toBe(2);

            auth.addKey('new-key');
            expect(auth.getKeyCount()).toBe(3);

            mockReq.headers = { 'x-api-key': 'new-key' };
            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should remove key', () => {
            auth.removeKey('valid-key-1');
            expect(auth.getKeyCount()).toBe(1);

            mockReq.headers = { 'x-api-key': 'valid-key-1' };
            const middleware = auth.middleware();
            middleware(mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should ignore empty keys', () => {
            auth.addKey('');
            auth.addKey('   ');
            expect(auth.getKeyCount()).toBe(2);
        });
    });

    describe('initialization', () => {
        it('should filter out empty keys', () => {
            const authWithEmpty = new ApiKeyAuth(['key1', '', '  ', 'key2']);
            expect(authWithEmpty.getKeyCount()).toBe(2);
        });

        it('should handle empty key list', () => {
            const authEmpty = new ApiKeyAuth([]);
            expect(authEmpty.getKeyCount()).toBe(0);
        });
    });

    describe('loadApiKeysFromEnv', () => {
        const originalEnv = process.env.AGENTIC_API_KEYS;

        afterEach(() => {
            if (originalEnv) {
                process.env.AGENTIC_API_KEYS = originalEnv;
            } else {
                delete process.env.AGENTIC_API_KEYS;
            }
        });

        it('should load keys from environment', () => {
            process.env.AGENTIC_API_KEYS = 'key1,key2,key3';
            const keys = loadApiKeysFromEnv();
            expect(keys).toEqual(['key1', 'key2', 'key3']);
        });

        it('should trim whitespace', () => {
            process.env.AGENTIC_API_KEYS = ' key1 , key2 , key3 ';
            const keys = loadApiKeysFromEnv();
            expect(keys).toEqual(['key1', 'key2', 'key3']);
        });

        it('should filter empty keys', () => {
            process.env.AGENTIC_API_KEYS = 'key1,,key2,  ,key3';
            const keys = loadApiKeysFromEnv();
            expect(keys).toEqual(['key1', 'key2', 'key3']);
        });

        it('should return empty array when not set', () => {
            delete process.env.AGENTIC_API_KEYS;
            const keys = loadApiKeysFromEnv();
            expect(keys).toEqual([]);
        });
    });
});
