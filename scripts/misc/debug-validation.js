const fs = require('fs');
const yaml = require('js-yaml');
const Ajv = require('ajv');

const schema = JSON.parse(fs.readFileSync('src/schemas/practice-config.schema.json', 'utf8'));
const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const data = yaml.load(fs.readFileSync('public/config/practices.yaml', 'utf8'));

const valid = validate(data);

if (!valid) {
    console.log('Validation errors:');
    validate.errors.forEach((err, idx) => {
        console.log(`\nError ${idx + 1}:`);
        console.log(`  Path: ${err.dataPath}`);
        console.log(`  Message: ${err.message}`);
        console.log(`  Params:`, err.params);

        // If it's the uniqueItems error, show the actual values
        if (err.keyword === 'uniqueItems' && err.params.i !== undefined && err.params.j !== undefined) {
            const path = err.dataPath.split('.').filter(p => p);
            let current = data;
            for (const p of path) {
                const match = p.match(/([^\[]+)\[(\d+)\]/);
                if (match) {
                    current = current[match[1]][parseInt(match[2])];
                } else {
                    current = current[p];
                }
            }

            console.log(`  Item at index ${err.params.i}: "${current[err.params.i]}"`);
            console.log(`  Item at index ${err.params.j}: "${current[err.params.j]}"`);
            console.log(`  Are they equal? ${current[err.params.i] === current[err.params.j]}`);
        }
    });
} else {
    console.log('✅ Validation passed!');
}
