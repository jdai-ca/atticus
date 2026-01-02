import { AgenticPipeline } from '../index';
import { ModelInfo } from '../types';

async function runTest() {
    console.log('Initializing Agentic Pipeline...');
    const pipeline = new AgenticPipeline();

    const userContent = 'I drafted a new contract agreement for my employee, but I am worried about the risk involved.';
    const history: any[] = [];
    const models: ModelInfo[] = [
        { providerId: 'openai', modelId: 'gpt-4' },
        { providerId: 'anthropic', modelId: 'claude-3' }
    ];
    const jurisdictions = ['CA', 'NY'];

    console.log('\n--- Processing Request ---');
    console.log('User Input:', userContent);

    const scanResult = pipeline.scanContent(userContent);
    console.log('PII Scan Result:', scanResult);

    const result = await pipeline.processRequest(userContent, history, models, jurisdictions);

    if (result.success) {
        console.log('\n--- Pipeline Success ---');
        result.responses.forEach(r => {
            console.log(`\n[${r.modelInfo?.providerId}]: ${r.content}`);
            console.log(`Practice Area: ${r.practiceArea}`);
            console.log(`Advisory Area: ${r.advisoryArea}`);
            console.log(`Trace: ${JSON.stringify(r.apiTrace)}`);
        });
    } else {
        console.error('\n--- Pipeline Failed ---', result.error);
    }
}

runTest().catch(console.error);
