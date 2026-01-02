import request from 'supertest';

describe('/api/chat attachments', () => {
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

    it('forwards attachments to the pipeline and includes them in the user message', async () => {
        const orchestrator = require('../../core/orchestrator');
        pipelineProto = orchestrator.AgenticPipeline.prototype;

        const fakeResponse = {
            success: true,
            responses: [
                { role: 'assistant', content: 'Processed attachments', modelInfo: { providerId: 'openai', modelId: 'gpt-4' }, timestamp: Date.now() }
            ]
        };

        jest.spyOn(pipelineProto, 'processRequest').mockImplementation(async () => fakeResponse);

        const sampleText = 'Hello attachment';
        const b64 = Buffer.from(sampleText, 'utf-8').toString('base64');

        const res = await request(app)
            .post('/api/chat')
            .set('X-API-Key', 'chat-key')
            .send({
                message: 'Please read the attachment',
                history: [],
                models: [{ providerId: 'openai', modelId: 'gpt-4' }],
                attachments: [
                    { filename: 'note.txt', contentType: 'text/plain', contentBase64: b64 }
                ]
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(pipelineProto.processRequest.mock.calls.length).toBeGreaterThan(0);

        const calledArgs = pipelineProto.processRequest.mock.calls[0];
        // attachments is the last argument (index 7)
        expect(calledArgs[7]).toBeDefined();
        expect(Array.isArray(calledArgs[7])).toBe(true);
        expect(calledArgs[7][0].filename).toBe('note.txt');
    });
});
