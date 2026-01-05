/**
 * Manual Test Script for Config Loader
 * Run this to test the YAML config loading independently
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n=== Config Loader Test ===\n');

// Test 1: Check if YAML file exists
console.log('Test 1: Checking if YAML config exists...');
const yamlPath = path.join(process.cwd(), 'public/config/providers.yaml');
const exists = fs.existsSync(yamlPath);
console.log(`  ✅ File exists: ${exists}`);
console.log(`  📁 Path: ${yamlPath}\n`);

if (!exists) {
    console.error('  ❌ YAML file not found!');
    process.exit(1);
}

// Test 2: Read and parse YAML
console.log('Test 2: Reading and parsing YAML...');
try {
    const fileContents = fs.readFileSync(yamlPath, 'utf8');
    const config = yaml.load(fileContents);
    console.log(`  ✅ YAML parsed successfully`);
    console.log(`  📊 Version: ${config.version}`);
    console.log(`  📊 Min App Version: ${config.minAppVersion}`);
    console.log(`  📊 Provider Count: ${config.providers?.length || 0}\n`);

    // Test 3: Validate structure
    console.log('Test 3: Validating config structure...');
    const requiredFields = ['version', 'minAppVersion', 'lastUpdated', 'updateUrl', 'providers'];
    let allFieldsPresent = true;

    requiredFields.forEach(field => {
        const present = config.hasOwnProperty(field);
        console.log(`  ${present ? '✅' : '❌'} ${field}: ${present ? 'present' : 'MISSING'}`);
        if (!present) allFieldsPresent = false;
    });

    if (!allFieldsPresent) {
        console.error('\n  ❌ Config structure validation failed!');
        process.exit(1);
    }

    // Test 4: Validate providers
    console.log('\nTest 4: Validating providers...');
    console.log(`  Total providers: ${config.providers.length}`);

    config.providers.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.displayName} (${provider.id})`);
        console.log(`     - Models: ${provider.models?.length || 0}`);
        console.log(`     - Icon: ${provider.ui?.icon || 'N/A'}`);
        console.log(`     - Endpoint: ${provider.endpoint ? '✅' : '❌'}`);
    });

    // Test 5: Summary
    console.log('\n=== Test Summary ===');
    console.log(`✅ YAML file exists`);
    console.log(`✅ YAML parses correctly`);
    console.log(`✅ Config structure valid`);
    console.log(`✅ ${config.providers.length} providers loaded`);
    console.log(`✅ All tests passed!\n`);

    // Show expected providers
    const expectedProviders = [
        'openai', 'anthropic', 'google', 'azure',
        'xai', 'mistral', 'cohere', 'perplexity', 'groq'
    ];

    const loadedProviderIds = config.providers.map(p => p.id);
    const missing = expectedProviders.filter(id => !loadedProviderIds.includes(id));
    const extra = loadedProviderIds.filter(id => !expectedProviders.includes(id));

    if (missing.length > 0) {
        console.log(`⚠️  Missing expected providers: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
        console.log(`ℹ️  Extra providers found: ${extra.join(', ')}`);
    }

    if (missing.length === 0 && extra.length === 0) {
        console.log('✅ All expected providers present, no extras\n');
    }

} catch (error) {
    console.error('  ❌ Error:', error.message);
    process.exit(1);
}
