#!/usr/bin/env node
/**
 * Analysis Configuration Validator
 * Validates analysis.yaml for schema compliance and data integrity
 */

const fs = require('fs');
const yaml = require('js-yaml');

console.log('\n🔍 Validating analysis.yaml...\n');

let exitCode = 0;

try {
    // Load configuration
    const yamlContent = fs.readFileSync('./public/config/analysis.yaml', 'utf8');
    const config = yaml.load(yamlContent);

    // Step 1: Pre-validation checks
    console.log('Step 1: Pre-validation checks...');

    if (!config.analysis) {
        console.error('  ❌ Missing analysis configuration object');
        process.exit(1);
    }

    console.log('  ✅ Found analysis configuration');

    // Step 2: Validate required fields
    console.log('\nStep 2: Validating required fields...');

    const requiredFields = ['version', 'minAppVersion', 'lastUpdated'];
    let missingFields = [];

    requiredFields.forEach(field => {
        if (!config[field]) {
            missingFields.push(field);
        }
    });

    if (missingFields.length > 0) {
        console.error(`  ❌ Missing required fields: ${missingFields.join(', ')}`);
        exitCode = 1;
    } else {
        console.log('  ✅ All required top-level fields present');
    }

    // Step 3: Validate system prompt
    console.log('\nStep 3: Validating system prompt...');

    if (!config.analysis.systemPrompt) {
        console.error('  ❌ Missing systemPrompt in analysis configuration');
        exitCode = 1;
    } else if (typeof config.analysis.systemPrompt !== 'string') {
        console.error('  ❌ systemPrompt must be a string');
        exitCode = 1;
    } else if (config.analysis.systemPrompt.trim().length === 0) {
        console.error('  ❌ systemPrompt cannot be empty');
        exitCode = 1;
    } else if (config.analysis.systemPrompt.length < 50) {
        console.warn('  ⚠️  Warning: systemPrompt seems very short (< 50 characters)');
        console.log(`  ✅ System prompt is ${config.analysis.systemPrompt.length} characters`);
    } else {
        console.log(`  ✅ System prompt is ${config.analysis.systemPrompt.length} characters`);
    }

    // Step 3.5: Check customized status
    if (config.customized !== undefined) {
        console.log(`\n  ℹ️  Configuration status: ${config.customized ? 'CUSTOMIZED' : 'FACTORY DEFAULT'}`);
    }

    // Step 4: Version format validation
    console.log('\nStep 4: Validating version format...');

    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(config.version)) {
        console.error(`  ❌ Invalid version format: ${config.version} (expected x.y.z)`);
        exitCode = 1;
    } else {
        console.log(`  ✅ Version format is valid: ${config.version}`);
    }

    // Step 5: Date validation
    console.log('\nStep 5: Validating lastUpdated date...');

    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (!dateRegex.test(config.lastUpdated)) {
        console.error(`  ❌ Invalid date format: ${config.lastUpdated} (expected ISO 8601)`);
        exitCode = 1;
    } else {
        const date = new Date(config.lastUpdated);
        if (isNaN(date.getTime())) {
            console.error(`  ❌ Invalid date value: ${config.lastUpdated}`);
            exitCode = 1;
        } else {
            console.log(`  ✅ Date format is valid: ${config.lastUpdated}`);
        }
    }

    // Final result
    console.log('\n' + '='.repeat(60));
    if (exitCode === 0) {
        console.log('✅ analysis.yaml validation PASSED');
        console.log('✅ Configuration is valid and ready to use');
    } else {
        console.log('❌ analysis.yaml validation FAILED');
        console.log('❌ Please fix the errors above');
    }
    console.log('='.repeat(60) + '\n');

    process.exit(exitCode);

} catch (error) {
    console.error('\n❌ Fatal error during validation:');
    console.error(error.message);
    if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
    }
    process.exit(1);
}
