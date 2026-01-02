/**
 * Test script for Claude CLI Subscription Mode
 *
 * Run this to verify that the Claude CLI integration is working correctly.
 *
 * Usage:
 *   node test-cli-subscription.js
 */

const claudeCliService = require('./electron/services/claudeCliService.cjs');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function test1_CheckAvailability() {
  section('Test 1: Check CLI Availability');

  try {
    const result = await claudeCliService.checkAvailability();

    if (result.available) {
      log('✓ Claude CLI is installed', 'green');
      log(`  Version: ${result.version}`, 'blue');
    } else {
      log('✗ Claude CLI not found', 'red');
      log(`  Error: ${result.error}`, 'yellow');
      log('\nInstall with: npm install -g @anthropic-ai/claude-code', 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Error checking availability: ${error.message}`, 'red');
    return false;
  }
}

async function test2_CheckOAuth() {
  section('Test 2: Check OAuth Authentication');

  try {
    const result = await claudeCliService.checkOAuthStatus();

    if (result.authenticated) {
      log('✓ OAuth authenticated', 'green');
      log(`  Email: ${result.email}`, 'blue');
    } else {
      log('✗ Not authenticated', 'red');
      log(`  Error: ${result.error}`, 'yellow');
      log('\nAuthenticate with: claude login', 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Error checking OAuth: ${error.message}`, 'red');
    return false;
  }
}

async function test3_GetStatus() {
  section('Test 3: Get Service Status');

  try {
    const status = claudeCliService.getStatus();

    log('Service Status:', 'blue');
    log(`  Available: ${status.available}`, status.available ? 'green' : 'red');
    log(`  Version: ${status.version || 'N/A'}`, 'blue');
    log(`  Authenticated: ${status.authenticated}`, status.authenticated ? 'green' : 'red');
    log(`  Email: ${status.email || 'N/A'}`, 'blue');
    log(`  Active Requests: ${status.activeRequests}`, 'blue');
    log(`  Max Concurrent: ${status.maxConcurrent}`, 'blue');
    log(`  Queued Requests: ${status.queuedRequests}`, 'blue');

    return true;
  } catch (error) {
    log(`✗ Error getting status: ${error.message}`, 'red');
    return false;
  }
}

async function test4_SimpleQuery() {
  section('Test 4: Simple Text Query');

  try {
    const prompt = 'Say "Hello from Claude CLI!" and nothing else.';
    log(`Sending prompt: "${prompt}"`, 'yellow');

    const startTime = Date.now();
    const result = await claudeCliService.query(prompt, { maxTokens: 100 });
    const duration = Date.now() - startTime;

    if (result.success) {
      log('✓ Query successful', 'green');
      log(`  Response: ${result.content}`, 'blue');
      log(`  Duration: ${duration}ms`, 'blue');
    } else {
      log('✗ Query failed', 'red');
      log(`  Error: ${result.error}`, 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Error during query: ${error.message}`, 'red');
    return false;
  }
}

async function test5_ImageQuery() {
  section('Test 5: Image Query (Vision)');

  try {
    // Create a simple base64-encoded 1x1 red pixel PNG
    const redPixelBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    const prompt = 'What color is this image?';
    log(`Sending vision prompt: "${prompt}"`, 'yellow');

    const startTime = Date.now();
    const result = await claudeCliService.queryWithImage(prompt, redPixelBase64, { maxTokens: 100 });
    const duration = Date.now() - startTime;

    if (result.success) {
      log('✓ Vision query successful', 'green');
      log(`  Response: ${result.content}`, 'blue');
      log(`  Duration: ${duration}ms`, 'blue');
    } else {
      log('✗ Vision query failed', 'red');
      log(`  Error: ${result.error}`, 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Error during vision query: ${error.message}`, 'red');
    return false;
  }
}

async function test6_StreamQuery() {
  section('Test 6: Streaming Query');

  try {
    const prompt = 'Count from 1 to 5, with a newline between each number.';
    log(`Sending streaming prompt: "${prompt}"`, 'yellow');

    let receivedChunks = [];
    const startTime = Date.now();

    const result = await claudeCliService.streamQuery(
      prompt,
      { maxTokens: 100 },
      (chunk) => {
        receivedChunks.push(chunk);
        process.stdout.write(colors.blue + chunk + colors.reset);
      }
    );

    const duration = Date.now() - startTime;
    console.log(); // New line after streaming

    if (result.success) {
      log('✓ Streaming query successful', 'green');
      log(`  Chunks received: ${receivedChunks.length}`, 'blue');
      log(`  Duration: ${duration}ms`, 'blue');
    } else {
      log('✗ Streaming query failed', 'red');
      log(`  Error: ${result.error}`, 'yellow');
      return false;
    }

    return true;
  } catch (error) {
    log(`✗ Error during streaming: ${error.message}`, 'red');
    return false;
  }
}

async function test7_ConcurrentRequests() {
  section('Test 7: Concurrent Requests (Process Pool)');

  try {
    log('Sending 5 concurrent requests (max pool size is 3)...', 'yellow');

    const promises = [];
    for (let i = 1; i <= 5; i++) {
      promises.push(
        claudeCliService.query(`Say "Request ${i}" and nothing else.`, { maxTokens: 50 })
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    log(`✓ Concurrent requests completed`, 'green');
    log(`  Successful: ${successful}/${results.length}`, successful === results.length ? 'green' : 'yellow');
    log(`  Failed: ${failed}/${results.length}`, failed === 0 ? 'green' : 'red');
    log(`  Total duration: ${duration}ms`, 'blue');
    log(`  Average: ${Math.round(duration / results.length)}ms per request`, 'blue');

    // Show individual results
    results.forEach((result, i) => {
      if (result.success) {
        log(`  [${i + 1}] ${result.content}`, 'blue');
      } else {
        log(`  [${i + 1}] Error: ${result.error}`, 'red');
      }
    });

    return successful === results.length;
  } catch (error) {
    log(`✗ Error during concurrent requests: ${error.message}`, 'red');
    return false;
  }
}

async function test8_Cleanup() {
  section('Test 8: Cleanup');

  try {
    await claudeCliService.cleanup();
    log('✓ Cleanup successful', 'green');
    log('  All active processes terminated', 'blue');
    log('  Temp files deleted', 'blue');

    return true;
  } catch (error) {
    log(`✗ Error during cleanup: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║  Claude CLI Subscription Mode - Integration Test      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  const tests = [
    { name: 'CLI Availability', fn: test1_CheckAvailability, required: true },
    { name: 'OAuth Authentication', fn: test2_CheckOAuth, required: true },
    { name: 'Service Status', fn: test3_GetStatus, required: false },
    { name: 'Simple Query', fn: test4_SimpleQuery, required: true },
    { name: 'Image Query', fn: test5_ImageQuery, required: false },
    { name: 'Streaming Query', fn: test6_StreamQuery, required: false },
    { name: 'Concurrent Requests', fn: test7_ConcurrentRequests, required: false },
    { name: 'Cleanup', fn: test8_Cleanup, required: false },
  ];

  const results = [];

  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed, required: test.required });

      // If a required test fails, stop
      if (test.required && !passed) {
        log(`\n✗ Required test "${test.name}" failed. Stopping.`, 'red');
        break;
      }
    } catch (error) {
      log(`\n✗ Test "${test.name}" threw an error: ${error.message}`, 'red');
      results.push({ name: test.name, passed: false, required: test.required });

      if (test.required) {
        log('  Required test failed. Stopping.', 'red');
        break;
      }
    }
  }

  // Summary
  section('Test Summary');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? 'green' : 'red';
    const requiredLabel = result.required ? ' (required)' : '';
    log(`${icon} ${result.name}${requiredLabel}`, color);
  });

  console.log('\n' + '─'.repeat(60));
  log(`Total: ${passed}/${total} passed`, passed === total ? 'green' : 'yellow');

  if (passed === total) {
    log('\n✓ All tests passed! Subscription mode is ready to use.', 'green');
  } else if (failed > 0) {
    log(`\n✗ ${failed} test(s) failed. See errors above.`, 'red');
  }

  console.log('\n');
}

// Run tests
runAllTests().catch((error) => {
  log(`\nFatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
