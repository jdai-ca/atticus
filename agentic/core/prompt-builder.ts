/**
 * Prompt Builder
 * 
 * Constructs context-aware system prompts for LLM interactions.
 * Integrates practice area knowledge, advisory guidance, and analysis
 * instructions to create specialized prompts.
 * 
 * @module core/prompt-builder
 */

import { ConfigLoader } from '../services/config-loader';

/**
 * Builds context-aware system prompts for LLM requests.
 * 
 * Combines:
 * - Base analysis instructions
 * - Practice area-specific knowledge
 * - Advisory area guidance
 * - Jurisdiction-specific context
 */
export class PromptBuilder {
    private configLoader: ConfigLoader;

    /**
     * Creates a new PromptBuilder instance.
     * 
     * @param configLoader - Configuration loader for prompts and areas
     */
    constructor(configLoader: ConfigLoader) {
        this.configLoader = configLoader;
    }

    public buildSystemPrompt(
        practiceArea?: string,
        advisoryArea?: string,
        jurisdictions: string[] = []
    ): string {
        const parts: string[] = [];

        // Base Persona
        parts.push('You are Atticus, an AI legal assistant designed to help with legal and advisory queries.');

        // Practice Area Logic
        if (practiceArea) {
            // Find the config for this area to get the specific system prompt
            const practiceConfig = this.configLoader.getAllPractices().find(p => p.name === practiceArea);
            if (practiceConfig) {
                parts.push(`\n[Practice Area: ${practiceArea}]\n${practiceConfig.systemPrompt}`);
            } else {
                parts.push(`\n[Practice Area Context]\nYou are operating within the domain of ${practiceArea}. Ensure your responses adhere to the principles and terminology of this field.`);
            }
        }

        // Advisory Area Logic
        if (advisoryArea) {
            const advisoryConfig = this.configLoader.getAllAdvisory().find(a => a.name === advisoryArea);
            if (advisoryConfig) {
                parts.push(`\n[Advisory Context: ${advisoryArea}]\n${advisoryConfig.systemPrompt}`);
            } else {
                parts.push(`\n[Advisory Context]\nYour advice should focus on ${advisoryArea}.`);
            }
        }

        // Jurisdiction Logic
        if (jurisdictions.length > 0) {
            parts.push(`\n[Jurisdiction]\nThis conversation pertains to the following jurisdictions: ${jurisdictions.join(', ')}. Please tailor your legal analysis to the laws and regulations of these regions.`);
        } else {
            parts.push('\n[Jurisdiction]\nNo specific jurisdiction detected. Please provide general legal information and advise the user to consult local counsel.');
        }

        // Analysis / Systematic Thinking (from analysis.yaml)
        const analysisPrompt = this.configLoader.getAnalysisPrompt();
        if (analysisPrompt) {
            parts.push(`\n[Systematic Analysis]\n${analysisPrompt}`);
        } else {
            parts.push('\n[General Instructions]\nProvide clear, concise, and professional responses. Do not provide definitive legal advice; instead, offer legal information and guidance.');
        }

        return parts.join('\n\n' + '-'.repeat(40) + '\n\n');
    }
}
