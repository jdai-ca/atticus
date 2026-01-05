#!/usr/bin/env node

/**
 * Validation script for provider configuration
 * Validates YAML syntax and schema compliance
 * Used in CI/CD pipeline and local development
 */

const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const configPath = process.argv[2] || './providers.yaml';
const schemaPath = process.argv[3] || './schemas/provider-config.schema.json';

console.log('\n🔍 Validating Provider Configuration...\n');
console.log(`Config: ${configPath}`);
console.log(`Schema: ${schemaPath}\n`);

let exitCode = 0;

try {
    // Step 1: Parse YAML
    console.log('Step 1: Checking YAML syntax...');
    const configYaml = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configYaml);
    console.log('  ✅ YAML syntax valid\n');

    // Step 2: Load schema
    console.log('Step 2: Loading JSON Schema...');
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    console.log('  ✅ Schema loaded\n');

    // Step 3: Validate against schema
    console.log('Step 3: Validating against schema...');
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
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
        console.log('  ✅ Schema validation passed\n');
    }

    // Step 4: Summary
    if (exitCode === 0) {
        console.log('Step 4: Configuration summary...');
        console.log(`  Version: ${config.version}`);
        console.log(`  Min App Version: ${config.minAppVersion}`);
        console.log(`  Last Updated: ${config.lastUpdated}`);
        console.log(`  Providers: ${config.providers.length}`);

        const totalModels = config.providers.reduce((sum, p) => sum + p.models.length, 0);
        console.log(`  Total Models: ${totalModels}`);

        console.log('\n  Provider breakdown:');
        config.providers.forEach((provider, index) => {
            console.log(`    ${index + 1}. ${provider.displayName} - ${provider.models.length} models`);
        });

        console.log('\n✨ All validation checks passed!\n');
    }

} catch (error) {
    console.error(`\n❌ Validation error: ${error.message}\n`);
    if (error.stack) {
        console.error('Stack trace:');
        console.error(error.stack);
    }
    exitCode = 1;
}

process.exit(exitCode);
