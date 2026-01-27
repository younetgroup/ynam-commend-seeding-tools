/**
 * Verify Tab Component
 * Handles verification workflow
 */

document.addEventListener('DOMContentLoaded', () => {
  const startChromeBtn = document.getElementById('start-chrome-btn');
  const startVerifyBtn = document.getElementById('start-verify-btn');
  const stopVerifyBtn = document.getElementById('stop-verify-btn');
  const chromeStatus = document.getElementById('chrome-status');
  const progressSection = document.getElementById('verify-progress');
  const progressFill = document.getElementById('verify-progress-fill');
  const progressStatus = document.getElementById('verify-status');
  const summary = document.getElementById('verify-summary');

  // Check Chrome connection
  async function checkChromeConnection() {
    chromeStatus.textContent = 'Checking connection...';
    chromeStatus.className = 'chrome-status-indicator';

    const port = parseInt(document.getElementById('verify-port').value);
    const result = await window.electronAPI.checkChromeConnection(port);

    if (result.success) {
      chromeStatus.textContent = '✓ Chrome connected on port ' + port;
      chromeStatus.className = 'chrome-status-indicator connected';
      startVerifyBtn.disabled = false;
    } else {
      chromeStatus.textContent = '⚠ Chrome not running on port ' + port;
      chromeStatus.className = 'chrome-status-indicator not-connected';
      startVerifyBtn.disabled = true;
    }
  }

  // Check on load and port change
  setTimeout(checkChromeConnection, 1000);
  document.getElementById('verify-port').addEventListener('change', checkChromeConnection);

  // Start Chrome
  startChromeBtn.addEventListener('click', async () => {
    startChromeBtn.classList.add('loading');
    startChromeBtn.disabled = true;

    const result = await window.electronAPI.startChromeDebug();

    if (result.success) {
      chromeStatus.textContent = 'Chrome started. Checking connection...';
      chromeStatus.className = 'chrome-status-indicator';
      setTimeout(async () => {
        await checkChromeConnection();
        startChromeBtn.classList.remove('loading');
        startChromeBtn.disabled = false;
      }, 3000);
    } else {
      chromeStatus.textContent = `Error starting Chrome: ${result.error}`;
      chromeStatus.className = 'chrome-status-indicator not-connected';
      startChromeBtn.classList.remove('loading');
      startChromeBtn.disabled = false;
    }
  });

  // Start verification
  startVerifyBtn.addEventListener('click', async () => {
    const options = {
      sheet: window.appState.sheetUrl,
      commentCol: document.getElementById('verify-comment-col').value,
      linkCol: document.getElementById('verify-link-col').value,
      screenshotCol: document.getElementById('verify-screenshot-col').value,
      linkResultCol: document.getElementById('verify-link-result-col').value,
      screenshotResultCol: document.getElementById('verify-screenshot-result-col').value,
      rows: document.getElementById('verify-rows').value,
      concurrency: parseInt(document.getElementById('verify-concurrency').value),
      verbose: document.getElementById('verify-verbose').checked,
      overwrite: document.getElementById('verify-overwrite').checked,
      port: parseInt(document.getElementById('verify-port').value),
      headerRow: window.appState.headerRow
    };

    startVerifyBtn.classList.add('hidden');
    stopVerifyBtn.classList.remove('hidden');
    progressSection.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressStatus.textContent = 'Starting verification...';
    summary.innerHTML = '';

    // Log Container Handling
    let logContainer = document.getElementById('verify-logs-container');
    if (!logContainer) {
      logContainer = document.createElement('div');
      logContainer.id = 'verify-logs-container';
      logContainer.className = 'verify-logs hidden';
      progressSection.appendChild(logContainer);
    }
    logContainer.innerHTML = ''; // Clear logs

    if (options.verbose) {
      logContainer.classList.remove('hidden');
    } else {
      logContainer.classList.add('hidden');
    }

    // Listen for log updates
    window.electronAPI.onLogUpdate((log) => {
      if (!logContainer) return;

      const entry = document.createElement('div');
      entry.className = `log-entry log-type-${log.type}`;

      // Simple timestamp
      const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Icons for types
      let icon = '';
      if (log.type === 'success') icon = '✓ ';
      if (log.type === 'error') icon = '✗ ';
      if (log.type === 'warn') icon = '⚠ ';
      if (log.type === 'info') icon = 'ℹ ';

      entry.textContent = `[${time}] ${icon}${log.message}`;
      logContainer.appendChild(entry);
      logContainer.scrollTop = logContainer.scrollHeight;
    });

    // Listen for progress updates
    window.electronAPI.onProgressUpdate((progress) => {
      if (progress.percentage) {
        progressFill.style.width = progress.percentage + '%';
      }
      if (progress.message) {
        progressStatus.textContent = progress.message;
      }
      if (progress.stats) {
        updateSummary(progress.stats);
      }
      if (progress.status === 'complete') {
        onVerificationComplete();
      }
      if (progress.status === 'error') {
        onVerificationError(progress.error);
      }
    });

    const result = await window.electronAPI.startVerification(options);

    if (!result.success) {
      utils.showStatus('chrome-status', `Error: ${result.error}`, 'error');
      onVerificationComplete();
    }
  });

  // Stop verification
  stopVerifyBtn.addEventListener('click', async () => {
    await window.electronAPI.stopVerification();
    onVerificationComplete();
  });

  function updateSummary(stats) {
    summary.innerHTML = `
      <h3>📊 Summary</h3>
      <ul>
        <li>Processed: ${stats.processed || 0} comments</li>
        <li>Verified: ${stats.verified || 0} ✓</li>
        <li>Failed: ${stats.failed || 0} ✗</li>
        <li>Errors: ${stats.errors || 0} ⚠️</li>
      </ul>
    `;
  }

  function onVerificationComplete() {
    startVerifyBtn.classList.remove('hidden');
    startVerifyBtn.disabled = false;
    stopVerifyBtn.classList.add('hidden');

    // Show completion message
    progressStatus.textContent = '✅ Verification Complete!';
    progressFill.style.width = '100%';
    chromeStatus.textContent = '✓ Verification finished. Chrome still connected.';
    chromeStatus.className = 'chrome-status-indicator connected';

    window.electronAPI.removeProgressListener();
    window.electronAPI.removeLogListener();
  }

  function onVerificationError(error) {
    utils.showStatus('chrome-status', `Error: ${error}`, 'error');
    onVerificationComplete();
  }
});
