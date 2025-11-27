#!/usr/bin/env node
/**
 * Providers Configuration Validator
 * Validates providers.yaml for schema compliance and data integrity
 */

const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');

// Try to load ajv-formats if available
let addFormats;
try {
    addFormats = require('ajv-formats');
} catch (e) {
    // ajv-formats not installed, will skip
    addFormats = null;
}

console.log('\n🔍 Validating providers.yaml...\n');

let exitCode = 0;

try {
    // Load configuration
    const yamlContent = fs.readFileSync('./public/config/providers.yaml', 'utf8');
    const config = yaml.load(yamlContent);

    // Load schema
    const schemaPath = './src/schemas/provider-config.schema.json';
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Step 1: Pre-validation checks
    console.log('Step 1: Pre-validation checks...');

    if (!config.providers || !Array.isArray(config.providers)) {
        console.error('  ❌ Missing or invalid providers array');
        process.exit(1);
    }

    console.log(`  ✅ Found ${config.providers.length} providers`);

    // Step 2: Check provider structure
    console.log('\nStep 2: Checking provider structure...');
    let structureError = false;

    config.providers.forEach((provider, index) => {
        if (!provider.id) {
            console.error(`  ❌ Provider at index ${index} missing 'id' field`);
            structureError = true;
            exitCode = 1;
        }
        if (!provider.name) {
            console.error(`  ❌ Provider '${provider.id}' missing 'name' field`);
            structureError = true;
            exitCode = 1;
        }
        if (!provider.displayName) {
            console.error(`  ❌ Provider '${provider.id}' missing 'displayName' field`);
            structureError = true;
            exitCode = 1;
        }
        if (!provider.models || !Array.isArray(provider.models)) {
            console.error(`  ❌ Provider '${provider.id}' missing or invalid 'models' array`);
            structureError = true;
            exitCode = 1;
        } else {
            // Check each model
            provider.models.forEach((model, modelIndex) => {
                if (!model.id) {
                    console.error(`  ❌ Provider '${provider.id}', model at index ${modelIndex} missing 'id' field`);
                    structureError = true;
                    exitCode = 1;
                }
                if (!model.name) {
                    console.error(`  ❌ Provider '${provider.id}', model '${model.id}' missing 'name' field`);
                    structureError = true;
                    exitCode = 1;
                }
            });
        }
    });

    if (!structureError) {
        console.log('  ✅ Provider structure valid');
    }

    // Step 3: Check for duplicate provider IDs
    console.log('\nStep 3: Checking for duplicate provider IDs...');
    const providerIds = new Set();
    let duplicateProviders = false;

    config.providers.forEach((provider) => {
        if (providerIds.has(provider.id)) {
            console.error(`  ❌ Duplicate provider ID: '${provider.id}'`);
            duplicateProviders = true;
            exitCode = 1;
        }
        providerIds.add(provider.id);
    });

    if (!duplicateProviders) {
        console.log('  ✅ No duplicate provider IDs');
    }

    // Step 4: Check for duplicate model IDs within each provider
    console.log('\nStep 4: Checking for duplicate model IDs...');
    let duplicateModels = false;

    config.providers.forEach((provider) => {
        if (!provider.models) return;

        const modelIds = new Set();
        provider.models.forEach((model) => {
            if (modelIds.has(model.id)) {
                console.error(`  ❌ Provider '${provider.id}' has duplicate model ID: '${model.id}'`);
                duplicateModels = true;
                exitCode = 1;
            }
            modelIds.add(model.id);
        });
    });

    if (!duplicateModels) {
        console.log('  ✅ No duplicate model IDs');
    }

    // Step 5: Schema validation
    console.log('\nStep 5: Validating against JSON schema...');
    const ajv = new Ajv({ allErrors: true, verbose: true });
    if (addFormats) {
        addFormats(ajv);
    }
    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
        console.error('  ❌ Schema validation failed:\n');
        validate.errors.forEach((error, index) => {
            console.error(`  Error ${index + 1}:`);
            console.error(`    Path: ${error.instancePath || 'root'}`);
            console.error(`    Message: ${error.message}`);
            if (error.params) {
                console.error(`    Details: ${JSON.stringify(error.params)}`);
            }
            console.error('');
        });
        exitCode = 1;
    } else {
        console.log('  ✅ Schema validation passed');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    if (exitCode === 0) {
        console.log('✅ providers.yaml validation PASSED');
        console.log(`\nConfiguration summary:`);
        console.log(`  Version: ${config.version}`);
        console.log(`  Min App Version: ${config.minAppVersion}`);
        console.log(`  Last Updated: ${config.lastUpdated}`);
        console.log(`  Providers: ${config.providers.length}`);

        const totalModels = config.providers.reduce((sum, p) => sum + (p.models?.length || 0), 0);
        console.log(`  Total Models: ${totalModels}`);

        console.log('\n  Provider breakdown:');
        config.providers.forEach((provider, index) => {
            console.log(`    ${index + 1}. ${provider.displayName} - ${provider.models?.length || 0} models`);
        });
    } else {
        console.error('❌ providers.yaml validation FAILED');
        console.error('Please fix the errors above before proceeding.');
    }
    console.log('='.repeat(60) + '\n');

} catch (error) {
    console.error(`\n❌ Validation error: ${error.message}\n`);
    if (error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
    }
    exitCode = 1;
}

process.exit(exitCode);
