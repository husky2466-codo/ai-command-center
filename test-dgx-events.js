/**
 * Test Script: DGX Event Emission
 *
 * This script demonstrates that command events are now emitted
 * regardless of whether commands are executed via HTTP API or IPC.
 *
 * Usage:
 * 1. Start the app: npm run dev:electron
 * 2. Connect to a DGX in the UI
 * 3. Run this script: node test-dgx-events.js
 * 4. Check the DGX Spark UI - command should appear in history
 */

const CONNECTION_ID = '32fb7a69-890e-4074-83d8-8f3e15b8b28a'; // Replace with your connection ID

async function testHttpApi() {
  console.log('Testing HTTP API command execution...');

  const response = await fetch(`http://localhost:3939/api/dgx/exec/${CONNECTION_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'echo "Test from HTTP API - $(date)"' })
  });

  const result = await response.json();
  console.log('HTTP API Result:', result);

  if (result.success) {
    console.log('✅ Command executed successfully');
    console.log('Expected: Event should be emitted to renderer');
    console.log('Action: Check DGX Spark UI for new command in history');
  } else {
    console.error('❌ Command failed:', result.error);
  }
}

async function testCommandHistory() {
  console.log('\nFetching command history...');

  const response = await fetch(`http://localhost:3939/api/dgx/exec/${CONNECTION_ID}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'echo "History test - $(date)"' })
  });

  await response.json();

  // Wait a bit for history to update
  await new Promise(resolve => setTimeout(resolve, 500));

  const historyResponse = await fetch('http://localhost:3939/api/dgx/exec/history');
  const history = await historyResponse.json();

  console.log('Command History (last 5):');
  if (history.success && history.data) {
    history.data.slice(-5).forEach((cmd, i) => {
      console.log(`  ${i + 1}. ${cmd.command} (${cmd.success ? '✅' : '❌'}) - ${cmd.duration}ms`);
    });
  }
}

async function main() {
  try {
    // Test 1: Execute command via HTTP API
    await testHttpApi();

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Check command history
    await testCommandHistory();

    console.log('\n📝 Verification Steps:');
    console.log('1. Open DGX Spark tab in AI Command Center');
    console.log('2. Check that commands appear in the command history panel');
    console.log('3. Events should show up in real-time (no refresh needed)');
    console.log('4. Each command should show: command text, timestamp, duration, success status');

  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('\nMake sure:');
    console.log('- AI Command Center is running (npm run dev:electron)');
    console.log('- API server is running on port 3939');
    console.log('- Connection ID is correct');
  }
}

main();
