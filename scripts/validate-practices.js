#!/usr/bin/env node
/**
 * Practices Configuration Validator
 * Validates practices.yaml for duplicates, schema compliance, and data integrity
 */

const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');

console.log('\n🔍 Validating practices.yaml...\n');

let exitCode = 0;

try {
    // Load configuration
    const yamlContent = fs.readFileSync('./public/config/practices.yaml', 'utf8');
    const config = yaml.load(yamlContent);

    // Load schema
    const schema = require('../src/schemas/practice-config.schema.json');

    // Step 1: Pre-validation checks
    console.log('Step 1: Pre-validation checks...');

    if (!config.practiceAreas || !Array.isArray(config.practiceAreas)) {
        console.error('  ❌ Missing or invalid practiceAreas array');
        process.exit(1);
    }

    console.log(`  ✅ Found ${config.practiceAreas.length} practice areas`);

    // Step 2: Check for duplicate keywords
    console.log('\nStep 2: Checking for duplicate keywords...');
    let duplicateFound = false;

    // Step 2.5: Check customized status
    if (config.customized !== undefined) {
        console.log(`\n  ℹ️  Configuration status: ${config.customized ? 'CUSTOMIZED' : 'FACTORY DEFAULT'}`);
    }

    config.practiceAreas.forEach((area, areaIndex) => {
        if (!area.keywords || !Array.isArray(area.keywords)) {
            console.error(`  ❌ Area ${area.id} (index ${areaIndex}) has no keywords array`);
            exitCode = 1;
            return;
        }

        // Track different types of duplicates
        const seen = new Map();
        const seenLower = new Map();
        const seenNormalized = new Map();

        // Normalize function: removes special chars, normalizes spaces
        const normalize = (str) => {
            return str
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, ' ');
        };

        area.keywords.forEach((keyword, kwIndex) => {
            // Check exact duplicates
            if (!seen.has(keyword)) {
                seen.set(keyword, []);
            }
            seen.get(keyword).push(kwIndex);

            // Check case-insensitive duplicates
            const lower = keyword.toLowerCase();
            if (!seenLower.has(lower)) {
                seenLower.set(lower, []);
            }
            seenLower.get(lower).push(kwIndex);

            // Check normalized duplicates
            const normalized = normalize(keyword);
            if (!seenNormalized.has(normalized)) {
                seenNormalized.set(normalized, []);
            }
            seenNormalized.get(normalized).push(kwIndex);
        });

        // Report exact duplicates
        seen.forEach((indices, keyword) => {
            if (indices.length > 1) {
                console.error(`\n  🔴 EXACT DUPLICATE in ${area.id} (index ${areaIndex}):`);
                console.error(`     Keyword: "${keyword}"`);
                console.error(`     Found at indices: ${indices.join(', ')}`);
                duplicateFound = true;
                exitCode = 1;
            }
        });

        // Report case-insensitive duplicates (excluding exact matches)
        seenLower.forEach((indices, lower) => {
            if (indices.length > 1) {
                const keywords = indices.map(i => area.keywords[i]);
                const allSame = keywords.every(k => k === keywords[0]);
                if (!allSame) {
                    console.error(`\n  🟡 CASE-INSENSITIVE DUPLICATE in ${area.id} (index ${areaIndex}):`);
                    console.error(`     Normalized: "${lower}"`);
                    console.error(`     Actual keywords:`);
                    indices.forEach(i => {
                        console.error(`       [${i}] "${area.keywords[i]}"`);
                    });
                    duplicateFound = true;
                    exitCode = 1;
                }
            }
        });

        // Report normalized duplicates (excluding exact and case-insensitive matches)
        seenNormalized.forEach((indices, normalized) => {
            if (indices.length > 1) {
                const keywords = indices.map(i => area.keywords[i]);
                const allSame = keywords.every(k => k === keywords[0]);
                const allSameLower = keywords.every(k => k.toLowerCase() === keywords[0].toLowerCase());
                if (!allSame && !allSameLower) {
                    console.error(`\n  🟠 NORMALIZED DUPLICATE in ${area.id} (index ${areaIndex}):`);
                    console.error(`     Normalized: "${normalized}"`);
                    console.error(`     Actual keywords:`);
                    indices.forEach(i => {
                        console.error(`       [${i}] "${area.keywords[i]}"`);
                    });
                    duplicateFound = true;
                    exitCode = 1;
                }
            }
        });

        // Check for empty keywords
        area.keywords.forEach((keyword, kwIndex) => {
            if (!keyword || keyword.trim() === '') {
                console.error(`  ❌ Area ${area.id} has empty keyword at index ${kwIndex}`);
                exitCode = 1;
            }
        });
    });

    if (!duplicateFound) {
        console.log('  ✅ No duplicate keywords found');
    }

    // Step 3: Check for duplicate practice area IDs
    console.log('\nStep 3: Checking for duplicate practice area IDs...');
    const areaIds = new Set();
    let duplicateIds = false;

    config.practiceAreas.forEach((area) => {
        if (areaIds.has(area.id)) {
            console.error(`  ❌ Duplicate practice area ID: '${area.id}'`);
            duplicateIds = true;
            exitCode = 1;
        }
        areaIds.add(area.id);
    });

    if (!duplicateIds) {
        console.log('  ✅ No duplicate practice area IDs');
    }

    // Step 4: Schema validation
    console.log('\nStep 4: Validating against JSON schema...');
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema);
    const valid = validate(config);

    if (!valid) {
        console.error('  ❌ Schema validation failed:\n');
        validate.errors.forEach((error, index) => {
            console.error(`  Error ${index + 1}:`);
            console.error(`    Path: ${error.instancePath || error.schemaPath}`);
            console.error(`    Message: ${error.message}`);
            if (error.params) {
                console.error(`    Params: ${JSON.stringify(error.params, null, 2)}`);
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
        console.log('✅ practices.yaml validation PASSED');
        console.log(`✅ ${config.practiceAreas.length} practice areas validated successfully`);
    } else {
        console.error('❌ practices.yaml validation FAILED');
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
