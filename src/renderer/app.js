/**
 * Main Application Logic
 * Handles tab switching and global state
 */

// Global state
window.appState = {
  sheetUrl: null,
  sheetMetadata: null
};

// Tab switching
document.addEventListener('DOMContentLoaded', () => {
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      // Update active states and manage hidden class
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabPanes.forEach(pane => {
        pane.classList.remove('active');
        pane.classList.add('hidden');
      });

      button.classList.add('active');
      const targetPane = document.getElementById(`${tabName}-tab`);
      targetPane.classList.remove('hidden');
      targetPane.classList.add('active');
    });
  });

  // Back to Setup button handler
  const backToSetupBtn = document.getElementById('back-to-setup-btn');
  if (backToSetupBtn) {
    backToSetupBtn.addEventListener('click', () => {
      const setupScreen = document.getElementById('setup-screen');
      const mainScreen = document.getElementById('main-screen');

      if (mainScreen && setupScreen) {
        mainScreen.classList.remove('active');
        mainScreen.classList.add('hidden');

        setupScreen.classList.add('active');
        setupScreen.classList.remove('hidden');

        // If we have existing sheet data, show the header selection
        if (window.appState.sheetMetadata && window.showExistingHeaderSelection) {
          window.showExistingHeaderSelection();
        }
      }
    });
  }
});

// Utility functions
window.utils = {
  showStatus: (elementId, message, type) => {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
  },

  hideStatus: (elementId) => {
    const element = document.getElementById(elementId);
    element.className = 'status-message';
  },

  formatTime: (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  },

  switchTab: (tabName) => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabPanes.forEach(pane => {
      pane.classList.remove('active');
      pane.classList.add('hidden');
    });

    const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
    const targetPane = document.getElementById(`${tabName}-tab`);

    if (targetButton && targetPane) {
      targetButton.classList.add('active');
      targetPane.classList.remove('hidden');
      targetPane.classList.add('active');
    }
  },

  // Modal utilities
  showModal: (title, message, type = 'info', options = {}) => {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      const modal = overlay.querySelector('.modal');
      const modalIcon = document.getElementById('modal-icon');
      const modalTitle = document.getElementById('modal-title');
      const modalMessage = document.getElementById('modal-message');
      const confirmBtn = document.getElementById('modal-confirm');
      const cancelBtn = document.getElementById('modal-cancel');
      const closeBtn = document.getElementById('modal-close');

      // Set type class
      modal.className = `modal ${type}`;
      modalIcon.className = `modal-icon ${type}`;

      // Set content
      modalTitle.textContent = title;
      if (typeof message === 'string') {
        modalMessage.textContent = message;
      } else {
        modalMessage.innerHTML = message;
      }

      // Configure buttons
      confirmBtn.textContent = options.confirmText || 'OK';
      confirmBtn.className = `btn ${options.confirmClass || 'btn-primary'}`;

      if (options.showCancel) {
        cancelBtn.classList.remove('hidden');
        cancelBtn.textContent = options.cancelText || 'Cancel';
      } else {
        cancelBtn.classList.add('hidden');
      }

      // Show modal
      overlay.classList.remove('hidden');

      // Event handlers
      const cleanup = () => {
        overlay.classList.add('hidden');
        confirmBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
        closeBtn.removeEventListener('click', handleCancel);
        overlay.removeEventListener('click', handleOverlayClick);
      };

      const handleConfirm = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          handleCancel();
        }
      };

      confirmBtn.addEventListener('click', handleConfirm);
      cancelBtn.addEventListener('click', handleCancel);
      closeBtn.addEventListener('click', handleCancel);
      overlay.addEventListener('click', handleOverlayClick);
    });
  },

  showError: (title, message) => {
    return window.utils.showModal(title, message, 'error', {
      confirmText: 'OK',
      confirmClass: 'btn-danger'
    });
  },

  showSuccess: (title, message) => {
    return window.utils.showModal(title, message, 'success', {
      confirmText: 'OK',
      confirmClass: 'btn-success'
    });
  },

  showInfo: (title, message) => {
    return window.utils.showModal(title, message, 'info', {
      confirmText: 'OK'
    });
  },

  showConfirm: (title, message) => {
    return window.utils.showModal(title, message, 'confirm', {
      showCancel: true,
      confirmText: 'Confirm',
      cancelText: 'Cancel'
    });
  }
};

// Menu event handlers
if (window.electronAPI) {
  // Tab switching via menu
  window.electronAPI.onMenuEvent('switch-tab', (tabName) => {
    window.utils.switchTab(tabName);
  });

  // Load sheet dialog
  window.electronAPI.onMenuEvent('load-sheet-dialog', () => {
    const setupScreen = document.getElementById('setup-screen');
    const mainScreen = document.getElementById('main-screen');

    if (mainScreen && !mainScreen.classList.contains('hidden')) {
      // Show setup screen to load new sheet
      mainScreen.classList.remove('active');
      mainScreen.classList.add('hidden');
      setupScreen.classList.add('active');
      setupScreen.classList.remove('hidden');
    }
  });

  // New sheet (reset to setup)
  window.electronAPI.onMenuEvent('new-sheet', () => {
    const setupScreen = document.getElementById('setup-screen');
    const mainScreen = document.getElementById('main-screen');

    window.appState.sheetUrl = null;
    window.appState.sheetMetadata = null;

    if (mainScreen) {
      mainScreen.classList.remove('active');
      mainScreen.classList.add('hidden');
    }
    if (setupScreen) {
      setupScreen.classList.add('active');
      setupScreen.classList.remove('hidden');
    }

    // Reset input
    const input = document.getElementById('sheet-url-input');
    if (input) input.value = '';
  });

  // Export results
  window.electronAPI.onMenuEvent('export-results', () => {
    window.utils.showInfo(
      'Export Results',
      'Export functionality is coming soon! You can currently view results directly in the spreadsheet.'
    );
  });

  // Show preferences
  window.electronAPI.onMenuEvent('show-preferences', () => {
    window.utils.showInfo(
      'Preferences',
      'Preferences dialog is coming soon! Current settings are automatically saved as you use the app.'
    );
  });

  // Show Help Guide
  window.electronAPI.onMenuEvent('show-readme', () => {
    const helpContent = `
      <div style="font-size: 13px; line-height: 1.6; color: #333;">
        <h4 style="margin-top:0; border-bottom:1px solid #eee; padding-bottom:8px;">Getting Started</h4>
        <ol style="padding-left: 20px; margin-bottom: 16px;">
          <li><strong>Setup Connection:</strong> Copy the Service Account Email from the Setup screen and share your Google Sheet with it (Editor access).</li>
          <li><strong>Load Sheet:</strong> Paste the full Google Sheet URL and click "Load Sheet".</li>
          <li><strong>Select Header:</strong> Choose the row that contains your column headers.</li>
        </ol>

        <h4 style="margin-top:16px; border-bottom:1px solid #eee; padding-bottom:8px;">Features</h4>
        
        <div style="margin-bottom:12px;">
          <strong>1. Verify Seeding</strong>
          <p style="margin:4px 0 8px 0; color:#666;">Automates the verification of Facebook comments using Chrome automation.</p>
          <ul style="padding-left: 20px; color:#555;">
            <li><strong>Column Mapping:</strong> Map your sheet columns to the tool's required fields (Comment, Link, Screenshot).</li>
            <li><strong>Browser:</strong> Click "Launch Chrome Debug" to open a controlled browser instance.</li>
            <li><strong>Run:</strong> Click "Start Verification" to process rows automatically.</li>
          </ul>
        </div>

        <div style="margin-bottom:12px;">
          <strong>2. Duplication Detection</strong>
          <p style="margin:4px 0 8px 0; color:#666;">Detects similar comments to avoid spamming.</p>
          <ul style="padding-left: 20px; color:#555;">
            <li><strong>Configuration:</strong> Select the comment column and a column to output cluster IDs.</li>
            <li><strong>Threshold:</strong> Adjust the similarity percentage (85% is recommended).</li>
          </ul>
        </div>
      </div>
    `;
    window.utils.showInfo('YNG Tool Help Guide', helpContent);
  });

  // Show about
  window.electronAPI.onMenuEvent('show-about', () => {
    const version = '1.0.0';
    const aboutContent = `
      <div style="text-align: center;">
        <p><strong>Version:</strong> ${version}</p>
        <p><strong>Developed for:</strong> YNG</p>
        <p style="margin-top: 16px;">Built with Electron, TypeScript, and modern web technologies.</p>
        <p style="margin-top: 12px; font-size: 0.9rem; color: #666;">
          Features fuzzy text matching for Vietnamese comments,<br>
          browser automation with Chrome DevTools Protocol,<br>
          and Google Sheets API integration.
        </p>
      </div>
    `;
    window.utils.showInfo('About YNG Sheet Utilities', aboutContent);
  });
};
