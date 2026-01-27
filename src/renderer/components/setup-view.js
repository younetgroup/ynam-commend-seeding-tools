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
  const headerSelectionCard = document.getElementById('header-selection-card');
  const continueBtn = document.getElementById('continue-to-main-btn');
  const setupInstructionsCard = document.getElementById('setup-instructions-card');
  const setupCardHeader = document.getElementById('setup-card-header');

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

  // Collapsible card header click
  if (setupCardHeader) {
    setupCardHeader.addEventListener('click', () => {
      setupInstructionsCard.classList.toggle('collapsed');
    });
  }

  // Hide header selection when URL changes
  sheetUrlInput.addEventListener('input', () => {
    if (headerSelectionCard && !headerSelectionCard.classList.contains('hidden')) {
      headerSelectionCard.classList.add('hidden');
      // Expand the instructions card
      setupInstructionsCard.classList.remove('collapsed');
      // Reset status
      setupStatus.className = 'status-message';
      setupStatus.textContent = '';
      // Re-enable load button
      loadSheetBtn.classList.remove('loading');
      loadSheetBtn.disabled = false;
    }
  });

  // Load sheet
  loadSheetBtn.addEventListener('click', async () => {
    const url = sheetUrlInput.value.trim();

    if (!url) {
      showStatus('Please enter a Google Sheet URL', 'error');
      return;
    }

    if (!url.includes('docs.google.com/spreadsheets')) {
      showStatus('Invalid Google Sheet URL', 'error');
      return;
    }

    loadSheetBtn.classList.add('loading');
    loadSheetBtn.disabled = true;
    showStatus('Checking permissions...', 'info');

    try {
      const result = await window.electronAPI.loadSheet(url);

      if (result.success) {
        // Update app state with new sheet data
        window.appState.sheetUrl = url;
        window.appState.sheetMetadata = result.metadata;

        // Save sheet URL to config
        const config = window.appState.savedConfig || {};
        config.lastSheet = url;
        await window.electronAPI.saveConfig(config);
        window.appState.savedConfig = config;

        showStatus('Sheet loaded successfully! Select header row below.', 'success');

        // Show inline header selection
        showHeaderSelection(result.metadata);

        // Collapse the instructions card to make room
        setupInstructionsCard.classList.add('collapsed');
      } else {
        showStatus(`Error: ${result.error}`, 'error');
        loadSheetBtn.classList.remove('loading');
        loadSheetBtn.disabled = false;
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
      loadSheetBtn.classList.remove('loading');
      loadSheetBtn.disabled = false;
    }
  });

  function showStatus(message, type) {
    setupStatus.textContent = message;
    setupStatus.className = `status-message ${type}`;
  }

  function showHeaderSelection(metadata) {
    const preview1 = document.getElementById('header-preview-1');
    const preview2 = document.getElementById('header-preview-2');
    const preview3 = document.getElementById('header-preview-3');

    // Clear and populate previews
    preview1.innerHTML = '';
    preview2.innerHTML = '';
    preview3.innerHTML = '';

    requestAnimationFrame(() => {
      const row1Preview = metadata.row1 ? metadata.row1.slice(0, 8).join(' | ') : 'No data';
      const row2Preview = metadata.row2 ? metadata.row2.slice(0, 8).join(' | ') : 'No data';
      // Row 3 - we might need to fetch this or use row2 shifted
      const row3Preview = metadata.row3 ? metadata.row3.slice(0, 8).join(' | ') : '(Row 3 data not available)';

      preview1.textContent = row1Preview || 'Empty row';
      preview2.textContent = row2Preview || 'Empty row';
      preview3.textContent = row3Preview || 'Empty row';
    });

    // Show the card (using hidden class, not visible)
    headerSelectionCard.classList.remove('hidden');
  }

  // Expose function to show header selection when returning from main screen
  window.showExistingHeaderSelection = function () {
    if (window.appState.sheetMetadata) {
      showHeaderSelection(window.appState.sheetMetadata);
      // Show success status
      showStatus('Sheet loaded successfully! Select header row below.', 'success');
      // Collapse the instructions card
      setupInstructionsCard.classList.add('collapsed');
    }
  };

  // Continue button handler
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      const selectedRow = document.querySelector('input[name="header-row"]:checked').value;
      const metadata = window.appState.sheetMetadata;

      window.appState.headerRow = parseInt(selectedRow);

      // Update headers based on selection
      if (selectedRow === '3' && metadata.row3) {
        window.appState.sheetMetadata.headers = metadata.row3;
      } else if (selectedRow === '2' && metadata.row2) {
        window.appState.sheetMetadata.headers = metadata.row2;
      } else {
        window.appState.sheetMetadata.headers = metadata.row1;
      }

      transitionToMainScreen(metadata);
    });
  }

  function transitionToMainScreen(metadata) {
    const setupScreen = document.getElementById('setup-screen');
    const mainScreen = document.getElementById('main-screen');

    // Hide setup screen
    setupScreen.classList.remove('active');
    setupScreen.classList.add('hidden');

    // Show main screen
    mainScreen.classList.remove('hidden');
    mainScreen.classList.add('active');

    // Populate column dropdowns with FRESH metadata
    populateColumnDropdowns(metadata);

    // Update sheet name display
    document.getElementById('current-sheet-name').textContent = window.appState.sheetUrl;
  }

  function populateColumnDropdowns(metadata) {
    const columnLetters = metadata.columnLetters;
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
      if (select) {
        select.innerHTML = columnLetters.map((letter, index) =>
          `<option value="${letter}">${formatOption(letter, index)}</option>`
        ).join('');
      }
    });

    // Set defaults from config or use hardcoded defaults
    const verifyConfig = config.desktop?.verify || {};
    const verifyCommentCol = document.getElementById('verify-comment-col');
    const verifyLinkCol = document.getElementById('verify-link-col');
    const verifyScreenshotCol = document.getElementById('verify-screenshot-col');
    const verifyLinkResultCol = document.getElementById('verify-link-result-col');
    const verifyScreenshotResultCol = document.getElementById('verify-screenshot-result-col');

    if (verifyCommentCol) verifyCommentCol.value = verifyConfig.commentCol || 'L';
    if (verifyLinkCol) verifyLinkCol.value = verifyConfig.linkCol || 'N';
    if (verifyScreenshotCol) verifyScreenshotCol.value = verifyConfig.screenshotCol || 'O';
    if (verifyLinkResultCol) verifyLinkResultCol.value = verifyConfig.linkResultCol || 'Q';
    if (verifyScreenshotResultCol) verifyScreenshotResultCol.value = verifyConfig.screenshotResultCol || 'R';

    // DupDetection tab dropdowns
    const dupSelects = ['dup-comment-col', 'dup-cluster-col', 'dup-cluster-rows-col'];

    dupSelects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = columnLetters.map((letter, index) =>
          `<option value="${letter}">${formatOption(letter, index)}</option>`
        ).join('');
      }
    });

    // Set defaults from config
    const dupConfig = config.desktop?.dupdetector || {};
    const dupCommentCol = document.getElementById('dup-comment-col');
    const dupClusterCol = document.getElementById('dup-cluster-col');
    const dupClusterRowsCol = document.getElementById('dup-cluster-rows-col');

    if (dupCommentCol) dupCommentCol.value = dupConfig.commentCol || 'P';
    if (dupClusterCol) dupClusterCol.value = dupConfig.clusterCol || 'S';
    if (dupClusterRowsCol) dupClusterRowsCol.value = dupConfig.clusterRowsCol || 'T';

    // Set threshold if available
    const thresholdSlider = document.getElementById('dup-threshold');
    if (thresholdSlider && dupConfig.threshold) {
      thresholdSlider.value = dupConfig.threshold;
      const thresholdValue = document.getElementById('dup-threshold-value');
      if (thresholdValue) thresholdValue.textContent = dupConfig.threshold;
    }

    // Add auto-save listeners to all form fields (only once)
    if (!window.autoSaveSetup) {
      setupAutoSave();
      window.autoSaveSetup = true;
    }
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
