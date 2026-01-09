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
import { Message, ModelInfo, ChatRequest } from '../types';
import { ApiKeyAuth, loadApiKeysFromEnv, loadAdminKeysFromEnv } from './auth';
import { createLogger } from '../utils/logger';
import { KeyManager } from '../services/key-manager';
import { AuditEventType, AuditSeverity } from '../services/audit-logger';
import { SERVER_CONFIG, RATE_LIMIT_CONFIG, MODEL_PARAMS } from '../config/constants';

const logger = createLogger('Server');

const app = express();
const port = SERVER_CONFIG.PORT;

// CORS: restrict origins via AGENTIC_CORS_ORIGINS (comma separated). Defaults to localhost.
const allowedOrigins = (process.env.AGENTIC_CORS_ORIGINS || SERVER_CONFIG.DEFAULT_CORS_ORIGINS)
    .split(',')
    .map(s => s.trim());

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // allow server-to-server or curl
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('Origin not allowed by CORS'));
    }
}));

// Body size limit to protect provider quotas
app.use(express.json({ limit: SERVER_CONFIG.JSON_BODY_LIMIT }));

// Basic rate limiting
const limiter = rateLimit({
    windowMs: RATE_LIMIT_CONFIG.WINDOW_MS,
    max: RATE_LIMIT_CONFIG.MAX_REQUESTS,
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
const keyManager = new KeyManager();
const startTime = Date.now();

// Apply API key authentication to all /api/* endpoints
app.use('/api/*', apiKeyAuth.middleware());

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, models, jurisdictions, temperature, maxTokens, topP, analysisModel, analysisOptions, attachments } = req.body as ChatRequest;

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
        const normalizedModels = (models || []).map((m: Partial<ModelInfo> & { provider?: string; model?: string }) => ({
            providerId: m.providerId || m.provider || '',
            modelId: m.modelId || m.model || '',
            endpoint: m.endpoint
        }));

        const invalidModels = normalizedModels.filter(m => !pipeline.isValidModel(m.modelId));
        if (invalidModels.length > 0) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: `Unknown model(s): ${invalidModels.map(m => m.modelId).join(', ')}`
            });
        }

        // Validate optional parameters
        if (temperature !== undefined && (typeof temperature !== 'number' || temperature < MODEL_PARAMS.MIN_TEMPERATURE || temperature > MODEL_PARAMS.MAX_TEMPERATURE)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: `Temperature must be a number between ${MODEL_PARAMS.MIN_TEMPERATURE} and ${MODEL_PARAMS.MAX_TEMPERATURE}`
            });
        }

        if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens <= 0)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: 'maxTokens must be a positive number'
            });
        }

        if (topP !== undefined && (typeof topP !== 'number' || topP < MODEL_PARAMS.MIN_TOP_P || topP > MODEL_PARAMS.MAX_TOP_P)) {
            return res.status(400).json({
                success: false,
                responses: [],
                error: `topP must be a number between ${MODEL_PARAMS.MIN_TOP_P} and ${MODEL_PARAMS.MAX_TOP_P}`
            });
        }

        // Process Request (PII scanning happens inside the pipeline)
        const options = {
            temperature,
            maxTokens,
            topP
        };

        // Normalize analysisModel if provided
        const normalizedAnalysisModel = analysisModel ? {
            providerId: (analysisModel as Partial<ModelInfo> & { provider?: string }).providerId || (analysisModel as Partial<ModelInfo> & { provider?: string }).provider || '',
            modelId: (analysisModel as Partial<ModelInfo> & { model?: string }).modelId || (analysisModel as Partial<ModelInfo> & { model?: string }).model || ''
        } as ModelInfo : undefined;

        const result = await pipeline.processRequest(
            message,
            history || [],
            normalizedModels,
            jurisdictions || [],
            options,
            normalizedAnalysisModel,
            analysisOptions,
            attachments
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
        } catch (auditError) {
            logger.debug({ err: auditError }, 'Failed to log audit event');
        }
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Return effective model availability for the calling key
app.get('/api/keys/me/models', apiKeyAuth.middleware(), (req, res) => {
    try {
        const callerKeyShape = (req as any).apiKeyShape as string;
        const isAdmin = (req as any).isAdmin as boolean;
        const targetKey = typeof req.query.key === 'string' ? String(req.query.key) : undefined;

        if (targetKey && !isAdmin) return res.status(403).json({ error: 'Admin required to query other keys' });

        // Use targetKey if provided (and admin), otherwise use the shape of the caller's key for display
        const displayKey = targetKey || callerKeyShape;

        // For now, policy per key is not implemented. We'll return configured models and mark enabled based on model config.
        const allModels = pipeline.getAllModels();
        const models = allModels.map(m => {
            const providerKey = keyManager.getApiKey(m.providerId);
            const enabledByProvider = !!providerKey;
            const enabled = !!m.enabled && enabledByProvider;
            const reason = enabled ? null : (!m.enabled ? 'disabled_by_config' : 'no_provider_key');
            return {
                providerId: m.providerId,
                modelId: m.modelId,
                enabled,
                reason,
                maxContextWindow: m.maxContextWindow
            };
        });

        res.json({ key: displayKey, models });
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
        } catch (auditError) {
            logger.debug({ err: auditError }, 'Failed to log audit event for export failure');
        }
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
    } catch (auditError) {
        logger.debug({ err: auditError }, 'Failed to log KEY_ADDED audit event');
    }
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
    } catch (auditError) {
        logger.debug({ err: auditError }, 'Failed to log KEY_REMOVED audit event');
    }
    res.json({ removed: true, total: apiKeyAuth.getKeyCount() });
});

if (require.main === module) {
    app.listen(port, () => {
        logger.info({ port }, 'Agentic Pipeline Service started');
    });
}

export default app;
