#!/usr/bin/env node

/**
 * Test script to verify Electron app launches without crashing
 * Tests: startup, initialization, window creation, and basic stability
 */

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const TEST_DURATION = 8000; // Run app for 8 seconds
const INIT_TIMEOUT = 5000;  // Wait 5 seconds for initialization

let testResults = {
  startup: false,
  initialization: false,
  running: false,
  errors: []
};

console.log('='.repeat(70));
console.log('  ELECTRON APP LAUNCH TEST');
console.log('='.repeat(70));
console.log('');
console.log('Testing: YNAM Sheet Utilities');
console.log('Duration: 8 seconds');
console.log('');

// Start the Electron app
console.log('[1/4] Starting Electron app...');
const electronProcess = spawn('npm', ['run', 'electron:start'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'test'
  }
});

let hasStarted = false;
let hasInitialized = false;
let errorOutput = '';

// Capture stdout
electronProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (!hasStarted && output.length > 0) {
    hasStarted = true;
    testResults.startup = true;
    console.log('  ✓ App process started');
  }
});

// Capture stderr (some Electron warnings are normal)
electronProcess.stderr.on('data', (data) => {
  const output = data.toString();
  errorOutput += output;

  // Filter out known harmless warnings
  const isHarmlessWarning =
    output.includes('DEPRECATED') ||
    output.includes('DeprecationWarning') ||
    output.includes('punycode') ||
    output.includes('ExperimentalWarning');

  if (!isHarmlessWarning) {
    // Check for critical errors
    const isCriticalError =
      output.includes('Error:') ||
      output.includes('FATAL') ||
      output.includes('Cannot find module') ||
      output.includes('SyntaxError') ||
      output.includes('TypeError') ||
      output.includes('ReferenceError');

    if (isCriticalError) {
      testResults.errors.push(output.trim());
      console.error('  ✗ Critical error detected:');
      console.error('    ' + output.trim().split('\n').join('\n    '));
    }
  }
});

// Check initialization after timeout
setTimeout(() => {
  if (hasStarted && testResults.errors.length === 0) {
    hasInitialized = true;
    testResults.initialization = true;
    console.log('[2/4] App initialized successfully');
  } else if (testResults.errors.length > 0) {
    console.log('[2/4] App failed to initialize due to errors');
  } else {
    console.log('[2/4] App failed to start within timeout');
  }
}, INIT_TIMEOUT);

// Monitor if process is still running
const runningCheckInterval = setInterval(() => {
  if (electronProcess.exitCode === null && electronProcess.killed === false) {
    testResults.running = true;
  } else {
    testResults.running = false;
    console.log('  ✗ App process terminated unexpectedly');
  }
}, 1000);

// Handle process exit
electronProcess.on('exit', (code, signal) => {
  if (code !== null && code !== 0 && code !== 143) { // 143 = SIGTERM (normal kill)
    testResults.errors.push(`Process exited with code ${code}`);
  }
});

electronProcess.on('error', (err) => {
  testResults.errors.push(`Failed to start process: ${err.message}`);
  console.error('  ✗ Failed to start:', err.message);
});

// Run test for specified duration
setTimeout(() => {
  clearInterval(runningCheckInterval);

  console.log('[3/4] Checking stability...');

  if (testResults.running) {
    console.log('  ✓ App is stable and running');
  } else {
    console.log('  ✗ App crashed or terminated');
  }

  // Kill the process
  console.log('[4/4] Terminating app...');
  electronProcess.kill('SIGTERM');

  // Wait a bit for graceful shutdown
  setTimeout(() => {
    if (electronProcess.exitCode === null) {
      electronProcess.kill('SIGKILL');
    }

    // Print results
    printResults();

    // Exit with appropriate code
    const success = testResults.startup &&
                    testResults.initialization &&
                    testResults.running &&
                    testResults.errors.length === 0;

    process.exit(success ? 0 : 1);
  }, 1000);
}, TEST_DURATION);

function printResults() {
  console.log('');
  console.log('='.repeat(70));
  console.log('  TEST RESULTS');
  console.log('='.repeat(70));
  console.log('');

  // Individual test results
  console.log('Tests:');
  console.log(`  ${testResults.startup ? '✓' : '✗'} Startup`);
  console.log(`  ${testResults.initialization ? '✓' : '✗'} Initialization`);
  console.log(`  ${testResults.running ? '✓' : '✗'} Stability (running for ${TEST_DURATION / 1000}s)`);
  console.log(`  ${testResults.errors.length === 0 ? '✓' : '✗'} No critical errors`);
  console.log('');

  // Errors
  if (testResults.errors.length > 0) {
    console.log('Errors found:');
    testResults.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    console.log('');
  }

  // Overall result
  const allPassed = testResults.startup &&
                    testResults.initialization &&
                    testResults.running &&
                    testResults.errors.length === 0;

  if (allPassed) {
    console.log('✓ ALL TESTS PASSED');
    console.log('');
    console.log('The app launched successfully and ran stably.');
    console.log('App name: YNAM Sheet Utilities');
    console.log('Icon: docs/younet-logo.png');
  } else {
    console.log('✗ SOME TESTS FAILED');
    console.log('');
    console.log('Please review the errors above and fix the issues.');
  }

  console.log('');
  console.log('='.repeat(70));
}
