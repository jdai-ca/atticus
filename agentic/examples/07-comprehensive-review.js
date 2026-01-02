// Comprehensive review example:
// - multiple models selected
// - history array provided for context
// - PDF and Word attachments included as base64
// - analysisModel selected for a separate review pass

const fs = require('fs');
const path = require('path');

const ENDPOINT = process.env.AGENTIC_ENDPOINT || 'http://localhost:3000';
const API_KEY = process.env.AGENTIC_API_KEY || 'testkey';

function fileToBase64(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buf = fs.readFileSync(filePath);
  return buf.toString('base64');
}

async function main() {
  // Place sample files in `agentic/examples/assets/sample.pdf` and `.../sample.docx`
  const assetsDir = path.join(__dirname, 'assets');
  const pdfPath = path.join(assetsDir, 'sample.pdf');
  const docPath = path.join(assetsDir, 'sample.docx');

  const attachments = [];
  const pdfBase64 = fileToBase64(pdfPath);
  if (pdfBase64) attachments.push({ filename: 'sample.pdf', contentType: 'application/pdf', contentBase64: pdfBase64 });
  const docBase64 = fileToBase64(docPath);
  if (docBase64) attachments.push({ filename: 'sample.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', contentBase64: docBase64 });

  const history = [
    { role: 'user', content: 'Please review the attached contract and flag any obligations over $50,000.' },
    { role: 'assistant', content: 'I will scan the contract and summarize key financial obligations.' }
  ];

  const request = {
    message: 'Perform a compliance and obligations review of the attached documents. Produce a short summary and list of any risky clauses.',
    history,
    models: [
      { providerId: 'openai', modelId: 'gpt-4' },
      { providerId: 'anthropic', modelId: 'claude-2' }
    ],
    attachments, // server may accept attachments as base64 payloads to be processed by the pipeline
    analysisModel: { providerId: 'openai', modelId: 'gpt-4o-mini' },
    analysisOptions: { temperature: 0.0, maxTokens: 800 },
    temperature: 0.2,
    maxTokens: 1500
  };

  const res = await fetch(`${ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(request)
  });

  if (!res.ok) {
    console.error('Request failed', res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  console.log('Pipeline response:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(err => { console.error(err); process.exit(1); });
