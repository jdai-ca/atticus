import request from 'supertest';

describe('/api/chat integration', () => {
    let app: any;
    let pipelineProto: any;

    beforeAll(() => {
        process.env.AGENTIC_API_KEYS = 'chat-key';
        app = require('../../server/index').default;
    });

    afterEach(() => {
        if (pipelineProto && pipelineProto.processRequest && pipelineProto.processRequest.mockRestore) {
            pipelineProto.processRequest.mockRestore();
        }
    });

    it('returns successful chat response when pipeline succeeds', async () => {
        const orchestrator = require('../../core/orchestrator');
        pipelineProto = orchestrator.AgenticPipeline.prototype;
        jest.spyOn(pipelineProto, 'processRequest').mockImplementation(async () => ({
            success: true,
            responses: [
                { role: 'assistant', content: 'Hello from mock', modelInfo: { providerId: 'openai', modelId: 'gpt-4' }, timestamp: Date.now() }
            ]
        }));

        const res = await request(app)
            .post('/api/chat')
            .set('X-API-Key', 'chat-key')
            .send({ message: 'Hi', history: [], models: [{ providerId: 'openai', modelId: 'gpt-4' }] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.responses)).toBe(true);
        expect(res.body.responses[0].content).toContain('Hello from mock');
    });

    it('includes analysis when analysisModel provided', async () => {
        const orchestrator = require('../../core/orchestrator');
        pipelineProto = orchestrator.AgenticPipeline.prototype;
        jest.spyOn(pipelineProto, 'processRequest').mockImplementation(async () => ({
            success: true,
            responses: [],
            analysis: { success: true, message: { role: 'assistant', content: 'Analysis result', timestamp: Date.now() } }
        }));

        const res = await request(app)
            .post('/api/chat')
            .set('X-API-Key', 'chat-key')
            .send({ message: 'Analyze', history: [], models: [{ providerId: 'openai', modelId: 'gpt-4' }], analysisModel: { providerId: 'openai', modelId: 'gpt-4' } });

        expect(res.status).toBe(200);
        expect(res.body.analysis).toBeDefined();
        expect(res.body.analysis.success).toBe(true);
        expect(res.body.analysis.message.content).toContain('Analysis result');
    });

    it('returns 500 when pipeline reports failure (e.g., PII blocked)', async () => {
        const orchestrator = require('../../core/orchestrator');
        pipelineProto = orchestrator.AgenticPipeline.prototype;
        jest.spyOn(pipelineProto, 'processRequest').mockImplementation(async () => ({
            success: false,
            responses: [],
            error: 'PII blocked'
        }));

        const res = await request(app)
            .post('/api/chat')
            .set('X-API-Key', 'chat-key')
            .send({ message: 'Contains SSN 123-45-6789', history: [], models: [{ providerId: 'openai', modelId: 'gpt-4' }] });

        expect(res.status).toBe(500);
        expect(res.body.success).toBe(false);
        expect(res.body.error).toBe('PII blocked');
    });
});
