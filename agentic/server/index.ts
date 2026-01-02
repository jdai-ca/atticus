/**
 * Agentic Pipeline HTTP Server
 * 
 * Provides REST API endpoints for the agentic legal assistant pipeline.
 * 
 * @module server/index
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { auditLogger } from '../services/audit-logger';
import client from 'prom-client';
import telemetry from '../telemetry';
import { AgenticPipeline } from '../core/orchestrator';
import { Message, ModelInfo } from '../types';
import { ApiKeyAuth, loadApiKeysFromEnv, loadAdminKeysFromEnv } from './auth';
import { createLogger } from '../utils/logger';
import { AuditEventType, AuditSeverity } from '../services/audit-logger';

const logger = createLogger('Server');

const app = express();
const port = process.env.PORT || 3000;

// CORS: restrict origins via AGENTIC_CORS_ORIGINS (comma separated). Defaults to localhost.
const allowedOrigins = (process.env.AGENTIC_CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // allow server-to-server or curl
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed by CORS'));
    }
}));

// Body size limit to protect provider quotas
app.use(express.json({ limit: process.env.AGENTIC_JSON_LIMIT || '256kb' }));

// Basic rate limiting
const limiter = rateLimit({
    windowMs: Number(process.env.AGENTIC_RATE_LIMIT_WINDOW_MS) || 60_000, // 1 minute
    max: Number(process.env.AGENTIC_RATE_LIMIT_MAX) || 60, // 60 requests per window
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Metrics: use shared telemetry module
const { register, requestsTotal, providerDuration } = telemetry;

// Initialize API key authentication
const apiKeys = loadApiKeysFromEnv();
const adminKeys = loadAdminKeysFromEnv ? loadAdminKeysFromEnv() : [];
const apiKeyAuth = new ApiKeyAuth(apiKeys, adminKeys);

// Protect metrics endpoint; only allow authenticated callers
app.get('/metrics', apiKeyAuth.middleware(), async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.send(metrics);
    } catch (err) {
        logger.error({ err }, 'Failed to collect metrics');
        res.status(500).send('Failed to collect metrics');
    }
});

const pipeline = new AgenticPipeline();
const startTime = Date.now();

interface ChatRequest {
    message: string;
    history: Message[];
    models: ModelInfo[];
    jurisdictions?: string[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    analysisModel?: ModelInfo;
    analysisOptions?: any;
}

// Apply API key authentication to all /api/* endpoints
app.use('/api/*', apiKeyAuth.middleware());

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, models, jurisdictions, temperature, maxTokens, topP, analysisModel, analysisOptions } = req.body as ChatRequest;

        // Input validation
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'Message is required and must be a non-empty string'
            });
        }

        if (!models || !Array.isArray(models) || models.length === 0) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'At least one model must be specified'
            });
        }

        // Normalize incoming model objects to `ModelInfo` shape and validate
        const normalizedModels = (models || []).map((m: any) => ({
            providerId: m.providerId || m.provider,
            modelId: m.modelId || m.model,
            endpoint: m.endpoint
        }));

        const invalidModels = normalizedModels.filter(m => !pipeline.isValidModel(m.modelId));
        if (invalidModels.length > 0) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: `Unknown model(s): ${invalidModels.map(m=>m.modelId).join(', ')}`
            });
        }

        // Validate optional parameters
        if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 2)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'Temperature must be a number between 0 and 2'
            });
        }

        if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens <= 0)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'maxTokens must be a positive number'
            });
        }

        if (topP !== undefined && (typeof topP !== 'number' || topP < 0 || topP > 1)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'topP must be a number between 0 and 1'
            });
        }

        if (!message || !models || models.length === 0) {
            return res.status(400).json({ error: 'Message and at least one model are required.' });
        }

        // Process Request (PII scanning happens inside the pipeline)
        const options = {
            temperature,
            maxTokens,
            topP
        };

        // Normalize analysisModel if provided
        const normalizedAnalysisModel = analysisModel ? {
            providerId: (analysisModel as any).providerId || (analysisModel as any).provider,
            modelId: (analysisModel as any).modelId || (analysisModel as any).model
        } as any : undefined;

        const result = await pipeline.processRequest(
            message,
            history || [],
            normalizedModels,
            jurisdictions || [],
            options,
            normalizedAnalysisModel,
            analysisOptions
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error({ error }, 'API request failed');
        try {
            auditLogger.logEvent(
                AuditEventType.SYSTEM_ERROR,
                AuditSeverity.ERROR,
                'SYSTEM',
                'API request failed',
                { error: String(error) }
            );
        } catch (_) {
            // best-effort
        }
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Return effective model availability for the calling key
app.get('/api/keys/me/models', apiKeyAuth.middleware(), (req, res) => {
    try {
        const callerKey = (req as any).apiKey as string;
        const isAdmin = (req as any).isAdmin as boolean;
        const targetKey = typeof req.query.key === 'string' ? String(req.query.key) : undefined;

        if (targetKey && !isAdmin) return res.status(403).json({ error: 'Admin required to query other keys' });

        // For now, policy per key is not implemented. We'll return configured models and mark enabled based on model config.
        const allModels = pipeline.getAllModels();
        const models = allModels.map(m => ({
            providerId: m.providerId,
            modelId: m.modelId,
            enabled: !!m.enabled,
            reason: m.enabled ? null : 'disabled_by_config',
            maxContextWindow: m.maxContextWindow
        }));

        res.json({ key: targetKey || callerKey, models });
    } catch (error) {
        logger.error({ error }, 'Failed to list models for key');
        res.status(500).json({ error: 'Failed to list models' });
    }
});

app.get('/health', (req, res) => {
    // Phase 3: Robust Health Check
    // We can't easily access the pipeline's internal configLoader here because pipeline is private/protected or instantiated locally.
    // However, we can modify the pipeline to expose stats or just instantiate a temporary loader? 
    // Better: Make AgenticPipeline expose a `getStats` method.
    // Alternatively, since this is a simple service, we can leak the stats via pipeline instance if we make it public.
    const stats = pipeline.getStats ? pipeline.getStats() : { status: 'running' };

    res.json({
        status: 'ok',
        service: 'atticus-agentic-pipeline',
        timestamp: new Date().toISOString(),
        stats,
        apiKeyCount: apiKeyAuth.getKeyCount(),
        uptimeMs: Date.now() - startTime
    });
});

// Audit export endpoint (requires authentication)
app.get('/audit/export', apiKeyAuth.middleware(), async (req, res) => {
    try {
        const { auditLogger } = await import('../services/audit-logger');
        const conversationId = req.query.conversationId as string | undefined;

        const logs = await auditLogger.exportForCompliance(conversationId);

        res.setHeader('Content-Type', 'application/x-ndjson');
        res.setHeader('Content-Disposition', `attachment; filename="audit-${conversationId || 'all'}-${Date.now()}.jsonl"`);
        res.send(logs);
    } catch (error) {
        logger.error({ error }, 'Audit export failed');
        try {
            const convId = (req.query && req.query.conversationId) ? String(req.query.conversationId) : undefined;
            auditLogger.logEvent(
                AuditEventType.SYSTEM_ERROR,
                AuditSeverity.ERROR,
                'SYSTEM',
                'Audit export failed',
                { error: String(error), conversationId: convId }
            );
        } catch (_) {}
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

// Runtime API key management (requires an existing valid API key)
app.get('/api/keys', apiKeyAuth.middleware(), (req, res) => {
    if (!(req as any).isAdmin) return res.status(403).json({ error: 'Admin required' });
    res.json({ count: apiKeyAuth.getKeyCount() });
});

app.post('/api/keys', apiKeyAuth.middleware(), (req, res) => {
    const { key } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required in body' });
    if (!(req as any).isAdmin) return res.status(403).json({ error: 'Admin required' });
    apiKeyAuth.addKey(key);
    try {
        auditLogger.logEvent(
            AuditEventType.KEY_ADDED,
            AuditSeverity.INFO,
            'SYSTEM',
            'API key added',
            { addedKeyHash: String(key).slice(0, 8) }
        );
    } catch (_) {}
    res.json({ added: true, total: apiKeyAuth.getKeyCount() });
});

app.delete('/api/keys', apiKeyAuth.middleware(), (req, res) => {
    const { key } = req.body || {};
    if (!key || typeof key !== 'string') return res.status(400).json({ error: 'key required in body' });
    if (!(req as any).isAdmin) return res.status(403).json({ error: 'Admin required' });
    apiKeyAuth.removeKey(key);
    try {
        auditLogger.logEvent(
            AuditEventType.KEY_REMOVED,
            AuditSeverity.INFO,
            'SYSTEM',
            'API key removed',
            { removedKeyHash: String(key).slice(0, 8) }
        );
    } catch (_) {}
    res.json({ removed: true, total: apiKeyAuth.getKeyCount() });
});

if (require.main === module) {
    app.listen(port, () => {
        logger.info({ port }, 'Agentic Pipeline Service started');
    });
}

export default app;
