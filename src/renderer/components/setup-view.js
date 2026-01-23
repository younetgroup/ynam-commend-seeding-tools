/**
 * Setup View Component
 * Handles initial sheet loading and permission checks
 */

document.addEventListener('DOMContentLoaded', async () => {
  const serviceAccountEmailInput = document.getElementById('service-account-email');
  const copyEmailBtn = document.getElementById('copy-email-btn');
  const sheetUrlInput = document.getElementById('sheet-url-input');
  const loadSheetBtn = document.getElementById('load-sheet-btn');
  const setupStatus = document.getElementById('setup-status');

  // Load saved config
  let savedConfig = null;
  try {
    savedConfig = await window.electronAPI.loadConfig();
    window.appState.savedConfig = savedConfig;

    // Pre-fill sheet URL if available
    if (savedConfig && savedConfig.lastSheet) {
      sheetUrlInput.value = savedConfig.lastSheet;
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

  // Load service account email
  try {
    const email = await window.electronAPI.getServiceAccountEmail();
    serviceAccountEmailInput.value = email;
  } catch (error) {
    serviceAccountEmailInput.value = 'Error loading email';
  }

  // Copy email to clipboard
  copyEmailBtn.addEventListener('click', () => {
    serviceAccountEmailInput.select();
    document.execCommand('copy');
    copyEmailBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyEmailBtn.textContent = 'Copy';
    }, 2000);
  });

  // Load sheet
  loadSheetBtn.addEventListener('click', async () => {
    const url = sheetUrlInput.value.trim();

    if (!url) {
      utils.showStatus('setup-status', 'Please enter a Google Sheet URL', 'error');
      return;
    }

    if (!url.includes('docs.google.com/spreadsheets')) {
      utils.showStatus('setup-status', 'Invalid Google Sheet URL', 'error');
      return;
    }

    loadSheetBtn.classList.add('loading');
    loadSheetBtn.disabled = true;
    utils.showStatus('setup-status', 'Checking permissions...', 'info');

    try {
      const result = await window.electronAPI.loadSheet(url);

      if (result.success) {
        window.appState.sheetUrl = url;
        window.appState.sheetMetadata = result.metadata;

        // Save sheet URL to config
        const config = window.appState.savedConfig || {};
        config.lastSheet = url;
        await window.electronAPI.saveConfig(config);
        window.appState.savedConfig = config;

        utils.showStatus('setup-status', 'Sheet loaded successfully!', 'success');

        setTimeout(() => {
          showHeaderSelectionDialog();
        }, 1000);
      } else {
        utils.showStatus('setup-status', `Error: ${result.error}`, 'error');
        loadSheetBtn.classList.remove('loading');
        loadSheetBtn.disabled = false;
      }
    } catch (error) {
      utils.showStatus('setup-status', `Error: ${error.message}`, 'error');
      loadSheetBtn.classList.remove('loading');
      loadSheetBtn.disabled = false;
    }
  });

  function showHeaderSelectionDialog() {
    const setupScreen = document.getElementById('setup-screen');
    const headerDialog = document.getElementById('header-selection-dialog');
    const metadata = window.appState.sheetMetadata;

    // Hide setup screen
    setupScreen.classList.remove('active');
    setupScreen.classList.add('hidden');

    // Show header selection dialog
    headerDialog.classList.remove('hidden');
    headerDialog.classList.add('active');

    // Populate header previews
    document.getElementById('header-preview-1').textContent = metadata.row1.slice(0, 10).join(' | ');
    document.getElementById('header-preview-2').textContent = metadata.row2.slice(0, 10).join(' | ');

    // Add confirm button handler
    const confirmBtn = document.getElementById('confirm-header-btn');
    confirmBtn.onclick = () => {
      const selectedRow = document.querySelector('input[name="header-row"]:checked').value;
      window.appState.headerRow = parseInt(selectedRow);

      // Update headers based on selection
      if (selectedRow === '2') {
        window.appState.sheetMetadata.headers = metadata.row2;
      } else {
        window.appState.sheetMetadata.headers = metadata.row1;
      }

      transitionToMainScreen();
    };
  }

  function transitionToMainScreen() {
    const headerDialog = document.getElementById('header-selection-dialog');
    const mainScreen = document.getElementById('main-screen');

    // Hide header dialog
    if (headerDialog && !headerDialog.classList.contains('hidden')) {
      headerDialog.classList.remove('active');
      headerDialog.classList.add('hidden');
    }

    // Show main screen (remove hidden, add active)
    mainScreen.classList.remove('hidden');
    mainScreen.classList.add('active');

    // Populate column dropdowns
    populateColumnDropdowns();

    // Update sheet name display
    document.getElementById('current-sheet-name').textContent = window.appState.sheetUrl;
  }

  function populateColumnDropdowns() {
    const columnLetters = window.appState.sheetMetadata.columnLetters;
    const headers = window.appState.sheetMetadata.headers || [];
    const config = window.appState.savedConfig || {};

    // Function to format option label: "A - Header Name" or just "A" if no header
    const formatOption = (letter, index) => {
      const header = headers[index];
      if (header && header.trim()) {
        return `${letter} - ${header}`;
      }
      return letter;
    };

    // Verify tab dropdowns
    const verifySelects = [
      'verify-comment-col',
      'verify-link-col',
      'verify-screenshot-col',
      'verify-link-result-col',
      'verify-screenshot-result-col'
    ];

    verifySelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      select.innerHTML = columnLetters.map((letter, index) =>
        `<option value="${letter}">${formatOption(letter, index)}</option>`
      ).join('');
    });

    // Set defaults from config or use hardcoded defaults
    const verifyConfig = config.desktop?.verify || {};
    document.getElementById('verify-comment-col').value = verifyConfig.commentCol || 'L';
    document.getElementById('verify-link-col').value = verifyConfig.linkCol || 'N';
    document.getElementById('verify-screenshot-col').value = verifyConfig.screenshotCol || 'O';
    document.getElementById('verify-link-result-col').value = verifyConfig.linkResultCol || 'Q';
    document.getElementById('verify-screenshot-result-col').value = verifyConfig.screenshotResultCol || 'R';

    // DupDetection tab dropdowns
    const dupSelects = ['dup-comment-col', 'dup-cluster-col'];

    dupSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      select.innerHTML = columnLetters.map((letter, index) =>
        `<option value="${letter}">${formatOption(letter, index)}</option>`
      ).join('');
    });

    // Set defaults from config
    const dupConfig = config.desktop?.dupdetector || {};
    document.getElementById('dup-comment-col').value = dupConfig.commentCol || 'P';
    document.getElementById('dup-cluster-col').value = dupConfig.clusterCol || 'S';

    // Set threshold if available
    const thresholdSlider = document.getElementById('dup-threshold');
    if (thresholdSlider && dupConfig.threshold) {
      thresholdSlider.value = dupConfig.threshold;
      document.getElementById('dup-threshold-value').textContent = dupConfig.threshold;
    }

    // Add auto-save listeners to all form fields
    setupAutoSave();
  }

  function setupAutoSave() {
    // Verify tab auto-save
    const verifyFields = [
      'verify-comment-col',
      'verify-link-col',
      'verify-screenshot-col',
      'verify-link-result-col',
      'verify-screenshot-result-col',
      'verify-concurrency',
      'verify-verbose',
      'verify-overwrite'
    ];

    verifyFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', saveVerifyConfig);
      }
    });

    // Dup detection tab auto-save
    const dupFields = [
      'dup-comment-col',
      'dup-cluster-col',
      'dup-threshold'
    ];

    dupFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('change', saveDupConfig);
      }
    });
  }

  async function saveVerifyConfig() {
    const config = window.appState.savedConfig || {};
    if (!config.desktop) config.desktop = {};
    if (!config.desktop.verify) config.desktop.verify = {};

    config.desktop.verify = {
      commentCol: document.getElementById('verify-comment-col')?.value,
      linkCol: document.getElementById('verify-link-col')?.value,
      screenshotCol: document.getElementById('verify-screenshot-col')?.value,
      linkResultCol: document.getElementById('verify-link-result-col')?.value,
      screenshotResultCol: document.getElementById('verify-screenshot-result-col')?.value,
      concurrency: parseInt(document.getElementById('verify-concurrency')?.value || '1'),
      verbose: document.getElementById('verify-verbose')?.checked || false,
      overwrite: document.getElementById('verify-overwrite')?.checked || false
    };

    await window.electronAPI.saveConfig(config);
    window.appState.savedConfig = config;
  }

  async function saveDupConfig() {
    const config = window.appState.savedConfig || {};
    if (!config.desktop) config.desktop = {};
    if (!config.desktop.dupdetector) config.desktop.dupdetector = {};

    config.desktop.dupdetector = {
      commentCol: document.getElementById('dup-comment-col')?.value,
      clusterCol: document.getElementById('dup-cluster-col')?.value,
      threshold: parseInt(document.getElementById('dup-threshold')?.value || '85')
    };

    await window.electronAPI.saveConfig(config);
    window.appState.savedConfig = config;
  }

  // Make save functions globally accessible for other components
  window.saveVerifyConfig = saveVerifyConfig;
  window.saveDupConfig = saveDupConfig;
});
