const fs = require('fs');
const yaml = require('js-yaml');

const c = yaml.load(fs.readFileSync('./public/config/practices.yaml', 'utf8'));
const a = c.practiceAreas[41];
console.log('Area:', a.id);
console.log('Keywords count:', a.keywords.length);
console.log('\nKeywords with indices:');
a.keywords.forEach((kw, i) => {
    console.log(`[${i}] "${kw}"`);
});

console.log('\n\nChecking for exact duplicates:');
const seen = {};
a.keywords.forEach((kw, i) => {
    if (seen[kw] !== undefined) {
        console.log(`🔴 DUPLICATE at [${i}]: "${kw}" (also at [${seen[kw]}])`);
    } else {
        seen[kw] = i;
    }
});

console.log('\n\nChecking for case-insensitive duplicates:');
const seenLower = {};
a.keywords.forEach((kw, i) => {
    const lower = kw.toLowerCase();
    if (seenLower[lower] !== undefined && seenLower[lower] !== i) {
        console.log(`🟡 CASE DUPLICATE at [${i}]: "${kw}" vs [${seenLower[lower]}]: "${a.keywords[seenLower[lower]]}"`);
    } else {
        seenLower[lower] = i;
    }
});
