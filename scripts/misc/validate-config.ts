#!/usr/bin/env node
/**
 * Configuration Validation Script
 * 
 * Validates YAML configuration files for:
 * - Duplicate keywords within practice/advisory areas
 * - Schema compliance
 * - Formatting issues
 * - Cross-file consistency
 * 
 * Usage: npm run validate:config
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

interface KeywordIssue {
    areaId: string;
    areaIndex: number;
    keyword: string;
    indices: number[];
    type: 'exact-duplicate' | 'case-insensitive-duplicate' | 'normalized-duplicate';
}

interface ValidationResult {
    file: string;
    valid: boolean;
    errors: string[];
    warnings: string[];
    keywordIssues: KeywordIssue[];
}

class ConfigValidator {
    private results: ValidationResult[] = [];

    constructor() {
        // No AJV needed - we're doing custom validation
    }

    /**
     * Normalize a keyword for comparison
     * Handles: trimming, lowercase, removing special chars
     */
    private normalizeKeyword(keyword: string): string {
        return keyword
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
            .replace(/\s+/g, ' '); // Normalize whitespace
    }

    /**
     * Detect duplicate keywords using multiple strategies
     */
    private findDuplicateKeywords(keywords: string[], areaId: string, areaIndex: number): KeywordIssue[] {
        const issues: KeywordIssue[] = [];
        const seen = new Map<string, number[]>();
        const seenCaseInsensitive = new Map<string, number[]>();
        const seenNormalized = new Map<string, number[]>();

        keywords.forEach((keyword, index) => {
            // Exact duplicates
            if (!seen.has(keyword)) {
                seen.set(keyword, []);
            }
            seen.get(keyword)!.push(index);

            // Case-insensitive duplicates
            const lower = keyword.toLowerCase();
            if (!seenCaseInsensitive.has(lower)) {
                seenCaseInsensitive.set(lower, []);
            }
            seenCaseInsensitive.get(lower)!.push(index);

            // Normalized duplicates (stemming-like)
            const normalized = this.normalizeKeyword(keyword);
            if (!seenNormalized.has(normalized)) {
                seenNormalized.set(normalized, []);
            }
            seenNormalized.get(normalized)!.push(index);
        });

        // Report exact duplicates
        seen.forEach((indices, keyword) => {
            if (indices.length > 1) {
                issues.push({
                    areaId,
                    areaIndex,
                    keyword,
                    indices,
                    type: 'exact-duplicate'
                });
            }
        });

        // Report case-insensitive duplicates (if not already reported as exact)
        seenCaseInsensitive.forEach((indices, lower) => {
            if (indices.length > 1) {
                const kwList: string[] = indices.map(i => keywords[i]);
                const allSame = kwList.every((k: string) => k === kwList[0]);
                if (!allSame) {
                    issues.push({
                        areaId,
                        areaIndex,
                        keyword: lower,
                        indices,
                        type: 'case-insensitive-duplicate'
                    });
                }
            }
        });

        // Report normalized duplicates (if not already reported)
        seenNormalized.forEach((indices, normalized) => {
            if (indices.length > 1) {
                const kwList: string[] = indices.map(i => keywords[i]);
                const allSame = kwList.every((k: string) => k === kwList[0]);
                const allSameLower = kwList.every((k: string) => k.toLowerCase() === kwList[0].toLowerCase());
                if (!allSame && !allSameLower) {
                    issues.push({
                        areaId,
                        areaIndex,
                        keyword: normalized,
                        indices,
                        type: 'normalized-duplicate'
                    });
                }
            }
        });

        return issues;
    }

    /**
     * Validate practices.yaml
     */
    private validatePractices(configPath: string): ValidationResult {
        const result: ValidationResult = {
            file: 'practices.yaml',
            valid: true,
            errors: [],
            warnings: [],
            keywordIssues: []
        };

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = yaml.load(content) as any;

            if (!config.practiceAreas || !Array.isArray(config.practiceAreas)) {
                result.errors.push('Missing or invalid practiceAreas array');
                result.valid = false;
                return result;
            }

            // Validate each practice area
            config.practiceAreas.forEach((area: any, index: number) => {
                // Check required fields
                if (!area.id) {
                    result.errors.push(`Practice area at index ${index} missing 'id' field`);
                    result.valid = false;
                }
                if (!area.name) {
                    result.errors.push(`Practice area '${area.id}' missing 'name' field`);
                    result.valid = false;
                }
                if (!area.keywords || !Array.isArray(area.keywords)) {
                    result.errors.push(`Practice area '${area.id}' missing or invalid 'keywords' array`);
                    result.valid = false;
                    return;
                }

                // Check for duplicate keywords
                const duplicates = this.findDuplicateKeywords(area.keywords, area.id, index);
                if (duplicates.length > 0) {
                    result.keywordIssues.push(...duplicates);
                    result.valid = false;
                }

                // Check for empty keywords
                area.keywords.forEach((keyword: string, kwIndex: number) => {
                    if (!keyword || keyword.trim() === '') {
                        result.errors.push(`Practice area '${area.id}' has empty keyword at index ${kwIndex}`);
                        result.valid = false;
                    }
                });

                // Warn about very short keywords (likely too generic)
                area.keywords.forEach((keyword: string, kwIndex: number) => {
                    if (keyword.length < 3) {
                        result.warnings.push(`Practice area '${area.id}' has very short keyword '${keyword}' at index ${kwIndex}`);
                    }
                });
            });

            // Check for duplicate practice area IDs
            const areaIds = new Set<string>();
            config.practiceAreas.forEach((area: any) => {
                if (areaIds.has(area.id)) {
                    result.errors.push(`Duplicate practice area ID: '${area.id}'`);
                    result.valid = false;
                }
                areaIds.add(area.id);
            });

        } catch (error) {
            result.errors.push(`Failed to parse YAML: ${error}`);
            result.valid = false;
        }

        return result;
    }

    /**
     * Validate advisory.yaml
     */
    private validateAdvisory(configPath: string): ValidationResult {
        const result: ValidationResult = {
            file: 'advisory.yaml',
            valid: true,
            errors: [],
            warnings: [],
            keywordIssues: []
        };

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = yaml.load(content) as any;

            if (!config.advisoryAreas || !Array.isArray(config.advisoryAreas)) {
                result.errors.push('Missing or invalid advisoryAreas array');
                result.valid = false;
                return result;
            }

            // Validate each advisory area
            config.advisoryAreas.forEach((area: any, index: number) => {
                if (!area.id) {
                    result.errors.push(`Advisory area at index ${index} missing 'id' field`);
                    result.valid = false;
                }
                if (!area.name) {
                    result.errors.push(`Advisory area '${area.id}' missing 'name' field`);
                    result.valid = false;
                }
                if (!area.keywords || !Array.isArray(area.keywords)) {
                    result.errors.push(`Advisory area '${area.id}' missing or invalid 'keywords' array`);
                    result.valid = false;
                    return;
                }

                // Check for duplicate keywords
                const duplicates = this.findDuplicateKeywords(area.keywords, area.id, index);
                if (duplicates.length > 0) {
                    result.keywordIssues.push(...duplicates);
                    result.valid = false;
                }

                // Check for empty keywords
                area.keywords.forEach((keyword: string, kwIndex: number) => {
                    if (!keyword || keyword.trim() === '') {
                        result.errors.push(`Advisory area '${area.id}' has empty keyword at index ${kwIndex}`);
                        result.valid = false;
                    }
                });
            });

            // Check for duplicate advisory area IDs
            const areaIds = new Set<string>();
            config.advisoryAreas.forEach((area: any) => {
                if (areaIds.has(area.id)) {
                    result.errors.push(`Duplicate advisory area ID: '${area.id}'`);
                    result.valid = false;
                }
                areaIds.add(area.id);
            });

        } catch (error) {
            result.errors.push(`Failed to parse YAML: ${error}`);
            result.valid = false;
        }

        return result;
    }

    /**
     * Validate providers.yaml
     */
    private validateProviders(configPath: string): ValidationResult {
        const result: ValidationResult = {
            file: 'providers.yaml',
            valid: true,
            errors: [],
            warnings: [],
            keywordIssues: []
        };

        try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = yaml.load(content) as any;

            if (!config.providers || !Array.isArray(config.providers)) {
                result.errors.push('Missing or invalid providers array');
                result.valid = false;
                return result;
            }

            config.providers.forEach((provider: any, index: number) => {
                if (!provider.id) {
                    result.errors.push(`Provider at index ${index} missing 'id' field`);
                    result.valid = false;
                }
                if (!provider.name) {
                    result.errors.push(`Provider '${provider.id}' missing 'name' field`);
                    result.valid = false;
                }
                if (!provider.models || !Array.isArray(provider.models)) {
                    result.errors.push(`Provider '${provider.id}' missing or invalid 'models' array`);
                    result.valid = false;
                }
            });

        } catch (error) {
            result.errors.push(`Failed to parse YAML: ${error}`);
            result.valid = false;
        }

        return result;
    }

    /**
     * Run all validations
     */
    public validate(): boolean {
        const configDir = path.join(process.cwd(), 'public', 'config');

        console.log('🔍 Validating configuration files...\n');

        // Validate each config file
        const practicesPath = path.join(configDir, 'practices.yaml');
        const advisoryPath = path.join(configDir, 'advisory.yaml');
        const providersPath = path.join(configDir, 'providers.yaml');

        if (fs.existsSync(practicesPath)) {
            this.results.push(this.validatePractices(practicesPath));
        } else {
            console.error(`❌ practices.yaml not found at ${practicesPath}`);
        }

        if (fs.existsSync(advisoryPath)) {
            this.results.push(this.validateAdvisory(advisoryPath));
        } else {
            console.error(`❌ advisory.yaml not found at ${advisoryPath}`);
        }

        if (fs.existsSync(providersPath)) {
            this.results.push(this.validateProviders(providersPath));
        } else {
            console.error(`❌ providers.yaml not found at ${providersPath}`);
        }

        // Print results
        let allValid = true;
        this.results.forEach(result => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`📄 ${result.file}`);
            console.log(`${'='.repeat(60)}`);

            if (result.valid && result.warnings.length === 0 && result.keywordIssues.length === 0) {
                console.log('✅ Valid - no issues found');
            } else {
                if (result.errors.length > 0) {
                    console.log(`\n❌ ERRORS (${result.errors.length}):`);
                    result.errors.forEach(error => console.log(`   • ${error}`));
                    allValid = false;
                }

                if (result.keywordIssues.length > 0) {
                    console.log(`\n🔴 DUPLICATE KEYWORDS (${result.keywordIssues.length} areas affected):`);
                    result.keywordIssues.forEach(issue => {
                        console.log(`\n   Area: ${issue.areaId} (index ${issue.areaIndex})`);
                        console.log(`   Type: ${issue.type}`);
                        console.log(`   Keyword: "${issue.keyword}"`);
                        console.log(`   Indices: ${issue.indices.join(', ')}`);
                        console.log(`   Values: ${issue.indices.map(i => `[${i}]="${issue.keyword}"`).join(', ')}`);
                    });
                    allValid = false;
                }

                if (result.warnings.length > 0) {
                    console.log(`\n⚠️  WARNINGS (${result.warnings.length}):`);
                    result.warnings.forEach(warning => console.log(`   • ${warning}`));
                }
            }
        });

        console.log(`\n${'='.repeat(60)}`);
        if (allValid) {
            console.log('✅ All configuration files are valid!');
        } else {
            console.log('❌ Configuration validation failed. Please fix the errors above.');
        }
        console.log(`${'='.repeat(60)}\n`);

        return allValid;
    }
}

// Run validation
const validator = new ConfigValidator();
const isValid = validator.validate();
process.exit(isValid ? 0 : 1);
