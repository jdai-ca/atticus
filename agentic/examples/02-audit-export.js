// Simple script to call /audit/export and print NDJSON results
const ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const ADMIN_KEY = process.env.AGENTIC_ADMIN_KEYS || process.env.ADMIN_API_KEY || 'testadminkey';

async function main(conversationId) {
  const url = `${ENDPOINT}/api/audit/export${conversationId ? `?conversationId=${encodeURIComponent(conversationId)}` : ''}`;

  const res = await fetch(url, {
    headers: {
      'X-API-Key': ADMIN_KEY
    }
  });

  if (!res.ok) {
    console.error('Export failed', res.status, await res.text());
    process.exit(1);
  }

  const text = await res.text();
  console.log('NDJSON export:\n');
  console.log(text);
}

main(process.argv[2]).catch(err => {
  console.error(err);
  process.exit(1);
});
