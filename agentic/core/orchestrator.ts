import { ConfigLoader } from '../services/config-loader';
import { ContextManager } from './context-manager';
import { PromptBuilder } from './prompt-builder';
import { ModelExecutor } from './executor';
import { Message, ModelInfo, PipelineResponse, ConversationContext } from '../types';
import { auditLogger } from '../services/audit-logger';

export class AgenticPipeline {
    private configLoader: ConfigLoader;
    private contextManager: ContextManager;
    private promptBuilder: PromptBuilder;
    private executor: ModelExecutor;

    constructor() {
        this.configLoader = new ConfigLoader();
        this.contextManager = new ContextManager(this.configLoader);
        this.promptBuilder = new PromptBuilder(this.configLoader);
        this.executor = new ModelExecutor(this.configLoader);
    }

    public async processRequest(
        userContent: string,
        history: Message[],
        selectedModels: ModelInfo[],
        jurisdictions: string[] = [],
        options?: { temperature?: number; maxTokens?: number; topP?: number }
    ): Promise<PipelineResponse> {
        // Generate IDs for audit trail
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // 1. Context Building
        const practiceArea = this.contextManager.detectPracticeArea(userContent);
        const advisoryArea = this.contextManager.detectAdvisoryArea(userContent);
        const piiResult = this.contextManager.scanForPII(userContent, jurisdictions);

        // 2. PII Check with Audit Logging
        if (piiResult.detected) {
            // Log PII scan
            await auditLogger.logPIIScan(
                conversationId,
                messageId,
                {
                    hasFindings: piiResult.detected,
                    findingsCount: piiResult.findings.length,
                    riskLevel: piiResult.riskLevel,
                    detectedTypes: piiResult.findings.map(f => f.type),
                    messagePreview: userContent.substring(0, 100)
                },
                piiResult.riskLevel === 'critical' || piiResult.riskLevel === 'high'
            );

            if (piiResult.riskLevel === 'critical' || piiResult.riskLevel === 'high') {
                const highRiskFindings = piiResult.findings
                    .filter(f => f.riskLevel === 'critical' || f.riskLevel === 'high')
                    .map(f => f.description)
                    .join(', ');

                return {
                    success: false,
                    responses: [],
                    error: `PII Detected (${piiResult.riskLevel.toUpperCase()} RISK): Request blocked. Found: ${highRiskFindings}. Please remove sensitive information.`
                };
            }
            console.warn(`[PII WARNING] Detected ${piiResult.riskLevel} risk PII in request.`);
        }

        // 3. Prompt Construction
        const systemPrompt = this.promptBuilder.buildSystemPrompt(
            practiceArea,
            advisoryArea,
            jurisdictions
        );

        const userMessage: Message = {
            role: 'user',
            content: userContent,
            practiceArea,
            advisoryArea,
            timestamp: Date.now(),
            conversationId,
            messageId
        };

        // 4. Execution
        try {
            const responses = await this.executor.executeRequests(
                systemPrompt,
                history,
                userMessage,
                selectedModels,
                options
            );

            return {
                success: true,
                responses,
            };
        } catch (error) {
            return {
                success: false,
                responses: [],
                error: error instanceof Error ? error.message : 'Unknown error during execution'
            };
        }
    }

    // Helper to exposed stats for Health Check
    public getStats() {
        return {
            providers: this.configLoader.getAllProviders().length,
            practices: this.configLoader.getAllPractices().length,
            advisory: this.configLoader.getAllAdvisory().length,
            hasAnalysisPrompt: !!this.configLoader.getAnalysisPrompt()
        };
    }

    /**
     * Validate whether a model id exists in the loaded configuration
     */
    public isValidModel(modelId: string): boolean {
        return !!this.configLoader.getModel(modelId);
    }

    /**
     * Return model configuration if available
     */
    public getModelInfo(modelId: string) {
        return this.configLoader.getModel(modelId);
    }

    // Helper to expose scanner separately for UI pre-checks
    public scanContent(content: string, jurisdictions: string[] = []) {
        return this.contextManager.scanForPII(content, jurisdictions);
    }
}
