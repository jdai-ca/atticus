const fs = require('fs');
const yaml = require('js-yaml');

// Load the YAML
const yamlContent = fs.readFileSync('./public/config/practices.yaml', 'utf8');
const config = yaml.load(yamlContent);

const problemAreas = [
    { index: 15, name: 'estate', duplicates: [24, 113] },
    { index: 17, name: 'healthcare', duplicates: [48, 71] },
    { index: 18, name: 'international', duplicates: [212, 246] },
    { index: 19, name: 'labor', duplicates: [8, 64] },
    { index: 20, name: 'patent', duplicates: [189, 318] }
];

console.log('\n🔍 Finding Duplicate Keywords:\n');

problemAreas.forEach(area => {
    const practiceArea = config.practiceAreas[area.index];
    const keywords = practiceArea.keywords;

    console.log(`\n${practiceArea.name} (${practiceArea.id}):`);
    console.log(`  Total keywords: ${keywords.length}`);

    const [i, j] = area.duplicates;
    console.log(`  Duplicate at indices ${i} and ${j}:`);
    console.log(`    [${i}]: "${keywords[i]}"`);
    console.log(`    [${j}]: "${keywords[j]}"`);

    // Find all duplicates
    const seen = new Map();
    const allDuplicates = [];
    keywords.forEach((kw, idx) => {
        if (seen.has(kw)) {
            allDuplicates.push({ keyword: kw, indices: [seen.get(kw), idx] });
        } else {
            seen.set(kw, idx);
        }
    });

    if (allDuplicates.length > 1) {
        console.log(`  ⚠ Found ${allDuplicates.length} duplicate pairs total`);
        allDuplicates.forEach(dup => {
            console.log(`    "${dup.keyword}" at indices ${dup.indices.join(', ')}`);
        });
    }
});

// Check practice area 22 (general)
console.log(`\n\nGeneral Practice (index 22):`);
const generalArea = config.practiceAreas[22];
console.log(`  keywords type: ${typeof generalArea.keywords}`);
console.log(`  keywords value:`, generalArea.keywords);
console.log(`  is Array: ${Array.isArray(generalArea.keywords)}`);
