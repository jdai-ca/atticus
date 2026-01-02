/**
 * Agentic Pipeline HTTP Server
 * 
 * Provides REST API endpoints for the agentic legal assistant pipeline.
 * 
 * @module server/index
 */

import express from 'express';
import cors from 'cors';
import { AgenticPipeline } from '../core/orchestrator';
import { Message, ModelInfo } from '../types';
import { ApiKeyAuth, loadApiKeysFromEnv } from './auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('Server');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize API key authentication
const apiKeys = loadApiKeysFromEnv();
const apiKeyAuth = new ApiKeyAuth(apiKeys);

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
}

// Apply API key authentication to all /api/* endpoints
app.use('/api/*', apiKeyAuth.middleware());

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, models, jurisdictions, temperature, maxTokens, topP } = req.body as ChatRequest;

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

        const result = await pipeline.processRequest(
            message,
            history || [],
            models,
            jurisdictions || [],
            options
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(500).json(result);
        }
    } catch (error) {
        logger.error({ error }, 'API request failed');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
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
        stats
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
        res.status(500).json({ error: 'Failed to export audit logs' });
    }
});

app.listen(port, () => {
    logger.info({ port }, 'Agentic Pipeline Service started');
});
