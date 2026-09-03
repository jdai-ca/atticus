import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import path from 'node:path';
import chalk from 'chalk';
import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assertTest(name: string, condition: boolean, failMsg = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(chalk.green(`  [PASS] ${name}`));
  } else {
    console.log(chalk.red(`  [FAIL] ${name} ${failMsg ? `(${failMsg})` : ''}`));
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log(chalk.cyan('\n=== Step 1: Building Atticus Main Process ==='));
  try {
    execSync('npx vite build', { cwd: WORKSPACE_ROOT, stdio: 'inherit' });
  } catch (error) {
    console.error(chalk.red('Failed to build project. Ensure vite builds without errors.'));
    process.exit(1);
  }

  console.log(chalk.cyan('\n=== Step 2: Locating Electron wrapper ==='));
  const electronCmd = path.join(WORKSPACE_ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron');

  console.log(chalk.cyan('\n=== Step 3: Launching Headless Atticus MCP Server ==='));
  
  const mcpPort = 3133;
  const serverProcess = spawn(electronCmd, ['.', '--mcp'], {
    cwd: WORKSPACE_ROOT,
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ATTICUS_MCP_PORT: mcpPort.toString(),
      ELECTRON_ENABLE_LOGGING: 'true',
      ELECTRON_NO_ATTACH_CONSOLE: 'false'
    }
  });

  serverProcess.stdout.on('data', data => console.log(chalk.gray(`[Server Stdout] ${data.toString().trim()}`)));
  serverProcess.stderr.on('data', data => console.log(chalk.gray(`[Server Stderr] ${data.toString().trim()}`)));

  // Give the server time to start up correctly via Electron IPC and load app.whenReady
  console.log(chalk.yellow('Waiting 3s for Electron subsystem to start HTTP SSE server...'));
  await sleep(3000);
  
  // Use SSEClientTransport connecting to electron HTTP listener
  const sseUrl = new URL(`http://localhost:${mcpPort}/sse`);
  const transport = new SSEClientTransport(sseUrl);

  const client = new Client(
    {
      name: 'typescript-mcp-tester',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    // 1. Initialization
    console.log(chalk.gray('\n=== Test 0: Initialization Handshake ==='));
    // connect() automatically handles the initialize request and notifications/initialized!
    await client.connect(transport);
    assertTest('Client connected successfully via SSE', true);

    // 2. List tools
    console.log(chalk.gray('\n=== Test 1: List MCP Tools ==='));
    const toolsResponse = await client.listTools();
    assertTest('Response has tools array', !!toolsResponse.tools);
    
    const toolNames = toolsResponse.tools.map(t => t.name);
    assertTest('Exposes list_providers', toolNames.includes('list_providers'));
    assertTest('Exposes send_chat_message', toolNames.includes('send_chat_message'));
    assertTest('Exposes srais_scan', toolNames.includes('srais_scan'));
    assertTest('Exposes pii_scan', toolNames.includes('pii_scan'));
    assertTest('Exposes list_conversations', toolNames.includes('list_conversations'));
    assertTest('Exposes load_conversation', toolNames.includes('load_conversation'));
    assertTest('Exposes save_conversation', toolNames.includes('save_conversation'));

    // 3. Call list_providers
    console.log(chalk.gray('\n=== Test 2: Call list_providers ==='));
    const providersResult = await client.callTool({
      name: 'list_providers',
      arguments: {}
    });
    assertTest('Call successful (no error)', !providersResult.isError);
    assertTest('Contains content payload', providersResult.content && providersResult.content.length > 0);

    // 4. Call srais_scan (Clear text)
    console.log(chalk.gray('\n=== Test 3: Call srais_scan (Clear text) ==='));
    const sraisClearResult = await client.callTool({
      name: 'srais_scan',
      arguments: {
        text: 'This is a simple corporate guideline regarding non-profit disclosures.'
      }
    });
    assertTest('No error on srais_scan', !sraisClearResult.isError);
    const sraisClearData = JSON.parse(sraisClearResult.content[0].text as string);
    assertTest('scan hasFindings is false', sraisClearData.hasFindings === false);

    // 5. Call srais_scan (With Fraud Harm Pattern)
    console.log(chalk.gray('\n=== Test 4: Call srais_scan (With Fraud Harm Pattern) ==='));
    const sraisFraudResult = await client.callTool({
      name: 'srais_scan',
      arguments: {
        text: 'I think we need to delete evidence, destroy and conceal records before the audit so we can avoid litigation and bankruptcy lawsuit penalties.'
      }
    });
    assertTest('No error on active srais_scan', !sraisFraudResult.isError);
    const sraisFraudData = JSON.parse(sraisFraudResult.content[0].text as string);
    assertTest('scan hasFindings is true', sraisFraudData.hasFindings === true);

    // 6. Call pii_scan (Clear text)
    console.log(chalk.gray('\n=== Test 5: Call pii_scan (Clear text) ==='));
    const piiClearResult = await client.callTool({
      name: 'pii_scan',
      arguments: {
        text: 'Hello team, let us meet tomorrow at 10 AM to discuss the timeline.'
      }
    });
    assertTest('No error on pii_scan', !piiClearResult.isError);
    const piiClearData = JSON.parse(piiClearResult.content[0].text as string);
    assertTest('pii hasFindings is false', piiClearData.hasFindings === false);

    // 7. Call pii_scan (With PII Patterns)
    console.log(chalk.gray('\n=== Test 6: Call pii_scan (With PII matches) ==='));
    const piiFraudResult = await client.callTool({
      name: 'pii_scan',
      arguments: {
        text: 'The customer email is test-customer123@gmail.com and password is "superPassword123!".'
      }
    });
    assertTest('No error on active pii_scan', !piiFraudResult.isError);
    const piiFraudData = JSON.parse(piiFraudResult.content[0].text as string);
    assertTest('pii hasFindings is true', piiFraudData.hasFindings === true);
    
    // 8. Call list_conversations
    console.log(chalk.gray('\n=== Test 7: Call list_conversations ==='));
    const listConvResult = await client.callTool({
      name: 'list_conversations',
      arguments: {}
    });
    assertTest('No error on list_conversations', !listConvResult.isError);
    assertTest('Contains list array', Array.isArray(JSON.parse(listConvResult.content[0].text as string)));

  } catch (err: any) {
    console.error(chalk.red(`\nUnexpected Testing Error: ${err.message}`));
    assertTest('Execution Flow', false, err.message);
  } finally {
    // Terminate
    console.log(chalk.cyan('\n=== Test Run Summaries ==='));
    console.log(chalk.white(`Total Verified Tests: ${totalTests}`));
    if (passedTests === totalTests) {
        console.log(chalk.bold.green(`Success: All ${passedTests}/${totalTests} Tests Passed!`));
    } else {
        console.log(chalk.bold.red(`Warning: ${totalTests - passedTests} Tests Failed.`));
    }
    
    console.log(chalk.cyan('\n=== Shutting down cleanly ==='));
    try {
      await transport.close();
    } catch {}
    
    serverProcess.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

runTests();