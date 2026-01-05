const fs = require('fs');
const yaml = require('js-yaml');

try {
    const data = yaml.load(fs.readFileSync('public/config/practices.yaml', 'utf8'));
    console.log(`Loaded ${data.practiceAreas.length} practice areas`);

    const pi = data.practiceAreas.find(a => a.id === 'personal-injury');
    if (!pi) {
        console.log('personal-injury not found!');
        process.exit(1);
    }

    const keywords = pi.keywords;
    console.log(`Found ${keywords.length} keywords in personal-injury`);

    const seen = new Map();
    let foundDup = false;

    keywords.forEach((k, i) => {
        // Check exact match
        if (seen.has(k)) {
            console.log(`Exact duplicate: "${k}" at positions ${seen.get(k)} and ${i}`);
            foundDup = true;
        } else {
            seen.set(k, i);
        }
    });

    // Try alternative: check if array has duplicates when stringified
    const keywordSet = new Set(keywords);
    if (keywordSet.size !== keywords.length) {
        console.log(`\nSet size: ${keywordSet.size}, Array length: ${keywords.length}`);
        console.log(`Difference: ${keywords.length - keywordSet.size} duplicate(s)`);
    }

    // Also check positions 114 and 143 specifically
    if (keywords.length > 143) {
        console.log(`\nChecking positions 114 and 143 (from validator error):`);
        console.log(`keywords[114] = "${keywords[114]}"`);
        console.log(`keywords[143] = "${keywords[143]}"`);
        console.log(`keywords[114].length = ${keywords[114].length}`);
        console.log(`keywords[143].length = ${keywords[143].length}`);
        console.log(`Are they === ? ${keywords[114] === keywords[143]}`);
        console.log(`Are they == ? ${keywords[114] == keywords[143]}`);

        // Check byte by byte
        const k114 = keywords[114];
        const k143 = keywords[143];
        console.log(`\nByte comparison:`);
        console.log(`114 bytes:`, Buffer.from(k114).toString('hex'));
        console.log(`143 bytes:`, Buffer.from(k143).toString('hex'));
    }

    if (!foundDup) {
        console.log('\nNo duplicates found!');
    }
} catch (error) {
    console.error('Error:', error.message);
}
