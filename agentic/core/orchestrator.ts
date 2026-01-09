import { ConfigLoader } from '../services/config-loader';
import { ContextManager } from './context-manager';
import { PromptBuilder } from './prompt-builder';
import { ModelExecutor } from './executor';
import { Message, ModelInfo, PipelineResponse, ConversationContext, Attachment } from '../types';
import { auditLogger } from '../services/audit-logger';
import { createLogger } from '../utils/logger';
import { ATTACHMENT_CONFIG, PII_CONFIG } from '../config/constants';

const logger = createLogger('Orchestrator');

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
        options?: { temperature?: number; maxTokens?: number; topP?: number },
        analysisModel?: ModelInfo,
        analysisOptions?: { temperature?: number; maxTokens?: number; topP?: number },
        attachments?: Attachment[]
    ): Promise<PipelineResponse> {
        // Generate IDs for audit trail
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        // 1. Attachment processing: use AttachmentProcessor service to extract text/previews/images
        let attachmentTextCombined = '';
        try {
            // Use require in a try/catch to avoid TypeScript module resolution failures in test environments
            interface AttachmentModule {
                processAttachments: (attachments?: Attachment[]) => Promise<Array<{
                    filename?: string;
                    size?: number;
                    textPreview?: string;
                    images?: unknown[];
                    error?: string;
                }>>;
            }

            let attachmentModule: AttachmentModule | null = null;
            try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                attachmentModule = require('../services/attachment-processor');
            } catch (e) {
                logger.debug({ err: e }, 'Attachment processor module not available');
                attachmentModule = null;
            }

            const processed = attachmentModule && attachmentModule.processAttachments
                ? await attachmentModule.processAttachments(attachments)
                : [];
            const metas = processed.map(p => ({
                filename: p.filename,
                size: p.size,
                hasImages: (p.images && p.images.length > 0),
                error: p.error
            }));

            // Build a combined text preview for context and PII scanning
            for (const p of processed) {
                if (p && p.textPreview) {
                    attachmentTextCombined += `\n\n[Attachment: ${p.filename}]\n` + String(p.textPreview).substring(0, ATTACHMENT_CONFIG.MAX_TEXT_PREVIEW_LENGTH);
                }
            }

            try {
                await auditLogger.logEvent(
                    // @ts-ignore
                    'ADMIN_ACTION',
                    // @ts-ignore
                    'INFO',
                    'SYSTEM',
                    'Attachments processed',
                    { attachments: metas }
                );
            } catch (auditError) {
                logger.debug({ err: auditError }, 'Failed to log attachment processing audit event');
            }
        } catch (err) {
            logger.warn({ err }, 'Attachment processing failed');
        }

        // 2. Context Building
        const combinedForContext = userContent + (attachmentTextCombined ? `\n\n${attachmentTextCombined}` : '');
        const practiceArea = this.contextManager.detectPracticeArea(combinedForContext);
        const advisoryArea = this.contextManager.detectAdvisoryArea(combinedForContext);
        const piiResult = this.contextManager.scanForPII(combinedForContext, jurisdictions);

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
                    messagePreview: userContent.substring(0, PII_CONFIG.MESSAGE_PREVIEW_LENGTH)
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
            logger.warn({ riskLevel: piiResult.riskLevel, findingsCount: piiResult.findings.length }, 'PII detected in request');
        }

        // 3. Prompt Construction
        const systemPrompt = this.promptBuilder.buildSystemPrompt(
            practiceArea,
            advisoryArea,
            jurisdictions
        );

        const userMessage: Message = {
            role: 'user',
            content: userContent + (attachmentTextCombined ? `\n\n[Attachments]\n${attachmentTextCombined}` : ''),
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

            const result: PipelineResponse = {
                success: true,
                responses,
            };

            // Optional analysis pass using a separate model and the analysis system prompt
            if (analysisModel) {
                try {
                    const analysisPrompt = this.configLoader.getAnalysisPrompt() || systemPrompt;
                    const analysisResponses = await this.executor.executeRequests(
                        analysisPrompt,
                        [...history, userMessage, ...responses],
                        userMessage,
                        [analysisModel],
                        analysisOptions
                    );

                    result.analysis = { success: true, message: analysisResponses[0] };
                } catch (err) {
                    result.analysis = { success: false, error: err instanceof Error ? err.message : String(err) };
                }
            }

            return result;
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

    /**
     * Return a list of all configured models with provider references
     */
    public getAllModels() {
        const providers = this.configLoader.getAllProviders();
        const models: Array<{ providerId: string; modelId: string; name?: string; enabled?: boolean; maxContextWindow?: number }> = [];
        for (const p of providers) {
            if (p.models && Array.isArray(p.models)) {
                for (const m of p.models) {
                    models.push({
                        providerId: p.id,
                        modelId: m.id,
                        name: m.name,
                        enabled: m.enabled,
                        maxContextWindow: m.maxContextWindow
                    });
                }
            }
        }
        return models;
    }

    // Helper to expose scanner separately for UI pre-checks
    public scanContent(content: string, jurisdictions: string[] = []) {
        return this.contextManager.scanForPII(content, jurisdictions);
    }
}
