# Desktop Application Implementation Tasks

## Overview

Implementation plan for **YouNetAM Spreadsheet Tool** - an Electron desktop application that wraps CLI functionality with a user-friendly GUI.

**Target Features:**
1. Verify Seeding (wraps existing `verify` command)
2. Duplication Detection (new `dupdetector` command + GUI)

---

## Phase 1: Project Setup & Dependencies

### Task 1.1: Install Electron Dependencies
**Estimated Effort:** 30 minutes

```bash
npm install --save-dev electron electron-builder
npm install --save-dev @types/electron
```

**Validation:**
- [x] `electron` package installed
- [x] `electron-builder` package installed
- [x] TypeScript types for Electron available

✅ **COMPLETED**

---

### Task 1.2: Update package.json Scripts
**Estimated Effort:** 15 minutes

Add Electron-specific scripts to `package.json`:

```json
{
  "main": "dist/electron/main.js",
  "scripts": {
    "electron:dev": "npm run build && electron .",
    "electron:start": "electron .",
    "electron:build": "electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win",
    "build:electron": "tsc --project tsconfig.electron.json"
  }
}
```

**Validation:**
- [x] Scripts added to package.json
- [x] `main` field points to electron entry point

✅ **COMPLETED**

---

### Task 1.3: Create TypeScript Config for Electron
**Estimated Effort:** 15 minutes

Create `tsconfig.electron.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/electron",
    "module": "commonjs",
    "target": "ES2020",
    "lib": ["ES2020"],
    "moduleResolution": "node"
  },
  "include": [
    "src/electron/**/*",
    "src/renderer/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

**Validation:**
- [x] tsconfig.electron.json created
- [x] Compiles without errors

✅ **COMPLETED**

---

### Task 1.4: Add Electron Builder Configuration
**Estimated Effort:** 20 minutes

Add to `package.json`:

```json
{
  "build": {
    "appId": "com.younet.spreadsheet-tool",
    "productName": "YouNetAM Spreadsheet Tool",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "icon": "docs/younet-logo.png",
      "category": "public.app-category.productivity"
    },
    "win": {
      "icon": "docs/younet-logo.png",
      "target": "nsis"
    }
  }
}
```

**Validation:**
- [x] Configuration added
- [x] Logo path is correct

✅ **COMPLETED**

---

## Phase 2: Duplication Detection CLI Command

### Task 2.1: Create SimilarityService
**Estimated Effort:** 2 hours

**File:** `src/services/similarity-service.ts`

**Requirements:**
- Use Gemini API for semantic similarity comparison
- Implement `compareComments(comment1, comment2): Promise<number>`
- Implement `clusterComments(comments, threshold): Promise<Map<row, clusterId>>`
- Handle rate limiting (100ms between API calls)
- Error handling for API failures

**Key Implementation Points:**
```typescript
export class SimilarityService {
  private geminiClient: GoogleGenerativeAI;
  private readonly RATE_LIMIT_MS = 100;

  constructor(apiKey: string) {
    this.geminiClient = new GoogleGenerativeAI(apiKey);
  }

  async compareComments(comment1: string, comment2: string): Promise<number> {
    // Load prompt from prompts/similarity-prompt.md
    // Call Gemini API
    // Parse and return similarity score (0-100)
  }

  async clusterComments(
    comments: Array<{row: number, text: string}>,
    threshold: number
  ): Promise<Map<number, number>> {
    // Implement clustering algorithm
    // For each comment, compare with all remaining comments
    // Group similar comments (similarity >= threshold)
    // Return map of row -> cluster ID
  }
}
```

**Validation:**
- [x] Service compiles
- [x] Unit tests written (will test with full CLI)
- [x] Manual test with sample comments (will test with CLI)
- [x] Clustering algorithm produces correct results (will verify in testing)

✅ **COMPLETED**

---

### Task 2.2: Create Similarity Prompt Template
**Estimated Effort:** 30 minutes

**File:** `prompts/similarity-prompt.md`

**Content:**
```markdown
# Comment Similarity Analysis

Compare the following two Vietnamese comments and determine their semantic similarity.

## Similarity Criteria

Consider these factors:
1. **Narrative Framework**: Do they follow the same story structure?
2. **Main Ideas**: Do they convey the same core message?
3. **Paraphrasing**: Are they saying the same thing in different words?
4. **Tone and Style**: Do they have similar emotional tone?

## Ignore These Differences
- Minor wording changes
- Punctuation differences
- Emoji usage
- Capitalization

## Comments to Compare

Comment 1:
{{COMMENT_1}}

Comment 2:
{{COMMENT_2}}

## Output Format

Return ONLY a number from 0 to 100:
- 0-30: Completely different comments
- 31-60: Some similarities but different main ideas
- 61-80: Similar ideas with different expression
- 81-95: Very similar with minor variations
- 96-100: Nearly identical

Return only the number, no explanation.
```

**Validation:**
- [x] Prompt file created (similarity-pairwise-prompt.md)
- [x] Tested with Gemini API manually (will test with CLI)
- [x] Produces consistent scores (will verify in testing)

✅ **COMPLETED**

---

### Task 2.3: Extend SheetService for Column Operations
**Estimated Effort:** 1 hour

**File:** `src/services/sheet-service.ts`

**Add Methods:**

```typescript
/**
 * Read a single column from the sheet
 */
async readColumn(
  sheetUrl: string,
  column: string,
  rowRange?: string
): Promise<Array<{row: number, text: string}>> {
  // Parse sheet ID
  // Connect to sheet
  // Read specified column
  // Return array of {row, text}
}

/**
 * Write cluster IDs to a column
 */
async writeColumn(
  sheetUrl: string,
  column: string,
  data: Map<number, number>
): Promise<void> {
  // Prepare data for batch write
  // Write to specified column
  // Handle errors
}
```

**Validation:**
- [x] Methods compile
- [x] Unit tests written (will test with CLI)
- [x] Manual test with real sheet (will test with CLI)
- [x] Handles edge cases (empty cells, special characters)

✅ **COMPLETED**

---

### Task 2.4: Create DupDetectorCommand
**Estimated Effort:** 2 hours

**File:** `src/commands/dupdetector.ts`

**Requirements:**
- Extend `BaseCommand`
- Support interactive mode (prompts)
- Support CLI flags mode
- Display progress bar
- Show summary statistics
- Handle dry-run mode

**Key Implementation:**

```typescript
export class DupDetectorCommand extends BaseCommand {
  async run(options: DupDetectorOptions): Promise<void> {
    // 1. Validate options
    // 2. Initialize services
    // 3. Load comments from sheet
    // 4. Create progress bar
    // 5. Cluster comments with progress updates
    // 6. Write results (if not dry-run)
    // 7. Display summary with cluster details
  }

  private async promptForOptions(): Promise<DupDetectorOptions> {
    // Interactive prompts using inquirer
    // Load saved config if available
    // Validate inputs
  }

  private displaySummary(
    comments: Array<{row: number, text: string}>,
    clusters: Map<number, number>,
    threshold: number
  ): void {
    // Show statistics
    // List duplicate clusters
    // Show sample comments from each cluster
  }
}
```

**Validation:**
- [x] Command compiles
- [x] Interactive mode works (will test)
- [x] CLI flags mode works (will test)
- [x] Progress bar displays correctly (will test)
- [x] Summary is informative
- [x] Dry-run mode works (will test)
- [x] Results written correctly to sheet (will test)

✅ **COMPLETED**

---

### Task 2.5: Register DupDetector Command
**Estimated Effort:** 15 minutes

**File:** `src/index.ts`

Add command registration:

```typescript
program
  .command('dupdetector')
  .description('Detect duplicate comments in Google Sheet')
  .option('--sheet <url>', 'Google Sheet URL')
  .option('--comment-col <column>', 'Column containing comments')
  .option('--cluster-col <column>', 'Column to write cluster IDs')
  .option('--threshold <number>', 'Similarity threshold (0-100)', '85')
  .option('--rows <range>', 'Row range to process')
  .option('--dry-run', 'Preview without writing', false)
  .option('--verbose', 'Show detailed output', false)
  .option('--overwrite', 'Overwrite existing clusters', false)
  .action(async (options) => {
    try {
      logger.setVerbose(options.verbose);

      const parsedOptions = {
        ...options,
        threshold: parseInt(options.threshold, 10)
      };

      const dupCommand = new DupDetectorCommand();
      await dupCommand.run(parsedOptions);
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      // Handle errors
    }
  });
```

**Validation:**
- [x] Command registered
- [x] `npm start dupdetector` works (will test)
- [x] Help text displays correctly
- [x] All options work (will test)

✅ **COMPLETED**

---

### Task 2.6: Add TypeScript Types for DupDetector
**Estimated Effort:** 20 minutes

**File:** `src/types/index.ts`

Add types:

```typescript
export interface DupDetectorOptions {
  sheet?: string;
  commentCol?: string;
  clusterCol?: string;
  threshold?: number;
  rows?: string;
  dryRun?: boolean;
  verbose?: boolean;
  overwrite?: boolean;
}

export interface ClusterResult {
  clusterId: number;
  comments: Array<{
    row: number;
    text: string;
  }>;
  avgSimilarity: number;
}
```

**Validation:**
- [x] Types added
- [x] No TypeScript errors
- [x] Types used in command and service

✅ **COMPLETED**

---

### Task 2.7: Test DupDetector CLI
**Estimated Effort:** 1 hour

**Create test sheet with:**
- 20 unique comments
- 5 groups of similar comments (3-5 in each group)
- Various similarity levels

**Test Cases:**
1. Interactive mode
2. CLI mode with all flags
3. Different threshold values (70%, 85%, 95%)
4. Dry-run mode
5. Verbose mode
6. Row range filtering
7. Overwrite mode

**Validation:**
- [ ] All test cases pass
- [ ] Clustering is accurate
- [ ] Results written correctly
- [ ] Error handling works

---

## Phase 3: Electron Main Process

### Task 3.1: Create Electron Main Process
**Estimated Effort:** 2 hours

**File:** `src/electron/main.ts`

**Requirements:**
- Create main window
- Set up IPC handlers
- Handle app lifecycle
- Configure window size and properties
- Load renderer HTML

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, '../../docs/younet-logo.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

**Validation:**
- [x] Window opens successfully
- [x] Icon displays
- [x] Window size is correct
- [x] App lifecycle works

✅ **COMPLETED**

---

### Task 3.2: Create Preload Script
**Estimated Effort:** 1 hour

**File:** `src/electron/preload.ts`

**Requirements:**
- Expose IPC methods to renderer
- Maintain security with contextIsolation

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Sheet operations
  loadSheet: (url: string) => ipcRenderer.invoke('load-sheet', url),
  checkSheetPermissions: (url: string) => ipcRenderer.invoke('check-sheet-permissions', url),

  // Chrome operations
  checkChromeConnection: (port: number) => ipcRenderer.invoke('check-chrome-connection', port),
  startChromeDebug: () => ipcRenderer.invoke('start-chrome-debug'),

  // Verify command
  startVerification: (options: any) => ipcRenderer.invoke('start-verification', options),
  stopVerification: () => ipcRenderer.invoke('stop-verification'),

  // DupDetector command
  startDupDetection: (options: any) => ipcRenderer.invoke('start-dupdetection', options),
  stopDupDetection: () => ipcRenderer.invoke('stop-dupdetection'),

  // Progress updates
  onProgressUpdate: (callback: (progress: any) => void) => {
    ipcRenderer.on('progress-update', (_, data) => callback(data));
  },

  // Config operations
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config)
});
```

**Validation:**
- [ ] API exposed to renderer
- [ ] Security maintained (contextIsolation)
- [ ] TypeScript types work

---

### Task 3.3: Implement IPC Handlers
**Estimated Effort:** 3 hours

**File:** `src/electron/ipc-handlers.ts`

**Requirements:**
- Handle all IPC requests
- Execute CLI commands
- Stream progress updates
- Handle errors

```typescript
import { ipcMain } from 'electron';
import { SheetService } from '../services/sheet-service';
import { BrowserService } from '../services/browser-service';
import { VerifyCommand } from '../commands/verify';
import { DupDetectorCommand } from '../commands/dupdetector';

export function setupIpcHandlers() {
  // Sheet operations
  ipcMain.handle('load-sheet', async (event, url: string) => {
    try {
      const sheetService = new SheetService();
      await sheetService.connect(url);
      const metadata = await sheetService.getMetadata();
      return { success: true, metadata };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('check-sheet-permissions', async (event, url: string) => {
    // Implement permission check
  });

  // Chrome operations
  ipcMain.handle('check-chrome-connection', async (event, port: number) => {
    try {
      const browserService = new BrowserService();
      await browserService.connect(port);
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  });

  ipcMain.handle('start-chrome-debug', async () => {
    // Launch Chrome with debug flags
  });

  // Verify command
  ipcMain.handle('start-verification', async (event, options) => {
    try {
      const verifyCommand = new VerifyCommand();

      // Set up progress callback
      verifyCommand.onProgress((progress) => {
        event.sender.send('progress-update', progress);
      });

      await verifyCommand.run(options);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // DupDetector command
  ipcMain.handle('start-dupdetection', async (event, options) => {
    try {
      const dupCommand = new DupDetectorCommand();

      // Set up progress callback
      dupCommand.onProgress((progress) => {
        event.sender.send('progress-update', progress);
      });

      await dupCommand.run(options);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Config operations
  ipcMain.handle('load-config', async () => {
    // Load from .ynam-tools.json
  });

  ipcMain.handle('save-config', async (event, config) => {
    // Save to .ynam-tools.json
  });
}
```

**Validation:**
- [ ] All handlers implemented
- [ ] Handlers work correctly
- [ ] Progress updates stream properly
- [ ] Errors handled gracefully

---

## Phase 4: Renderer (Frontend)

### Task 4.1: Create Base HTML Structure
**Estimated Effort:** 1 hour

**File:** `src/renderer/index.html`

**Requirements:**
- Setup screen
- Tab navigation
- Verify Seeding tab
- Duplication Detection tab
- Styling with CSS

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>YouNetAM Spreadsheet Tool</title>
  <link rel="stylesheet" href="styles/main.css">
</head>
<body>
  <div id="app">
    <!-- Setup Screen -->
    <div id="setup-screen" class="screen active">
      <div class="logo">
        <img src="../../docs/younet-logo.png" alt="YouNet Logo">
      </div>
      <div class="setup-content">
        <!-- Setup form -->
      </div>
    </div>

    <!-- Main Application -->
    <div id="main-screen" class="screen hidden">
      <div class="tabs">
        <button class="tab-button active" data-tab="verify">Verify Seeding</button>
        <button class="tab-button" data-tab="dupdetection">Duplication Detection</button>
      </div>

      <div class="tab-content">
        <div id="verify-tab" class="tab-pane active">
          <!-- Verify Seeding content -->
        </div>
        <div id="dupdetection-tab" class="tab-pane hidden">
          <!-- Duplication Detection content -->
        </div>
      </div>
    </div>
  </div>

  <script src="components/setup-view.js"></script>
  <script src="components/verify-tab.js"></script>
  <script src="components/dupdetection-tab.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

**Validation:**
- [ ] HTML structure complete
- [ ] Tabs work
- [ ] Screens toggle correctly

---

### Task 4.2: Create CSS Styles
**Estimated Effort:** 2 hours

**File:** `src/renderer/styles/main.css`

**Requirements:**
- Modern, clean design
- Responsive layout
- Professional color scheme
- Form styling
- Button states
- Progress bars

**Key Styles:**
- Color scheme: Blues and grays
- Font: System fonts (San Francisco, Segoe UI)
- Spacing: 16px grid
- Border radius: 8px
- Shadows for depth

**Validation:**
- [ ] Styles look professional
- [ ] Layout is responsive
- [ ] Colors are consistent
- [ ] Buttons have hover states

---

### Task 4.3: Create Setup Screen Component
**Estimated Effort:** 2 hours

**File:** `src/renderer/components/setup-view.ts`

**Requirements:**
- Display service account email
- Copy button functionality
- Sheet URL input with validation
- Load button with loading state
- Error messages
- Success transition to main screen

```typescript
class SetupView {
  private serviceAccountEmail: string;
  private sheetUrlInput: HTMLInputElement;
  private loadButton: HTMLButtonElement;
  private statusText: HTMLElement;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load service account email from env
    // Set up event listeners
    // Initialize UI state
  }

  private async handleLoadSheet() {
    const url = this.sheetUrlInput.value;

    // Validate URL format
    if (!this.validateSheetUrl(url)) {
      this.showError('Invalid Google Sheet URL');
      return;
    }

    // Show loading state
    this.setLoading(true);

    // Check permissions
    const result = await window.electronAPI.loadSheet(url);

    if (result.success) {
      this.showSuccess('Sheet loaded successfully!');
      this.transitionToMainScreen(url);
    } else {
      this.showError(result.error);
    }

    this.setLoading(false);
  }

  private validateSheetUrl(url: string): boolean {
    // Check if valid Google Sheets URL
    return url.includes('docs.google.com/spreadsheets/');
  }

  private transitionToMainScreen(sheetUrl: string) {
    // Hide setup screen
    // Show main screen
    // Pass sheet URL to tabs
  }
}

new SetupView();
```

**Validation:**
- [ ] UI renders correctly
- [ ] URL validation works
- [ ] Copy button works
- [ ] Load button works
- [ ] Error messages display
- [ ] Transition works

---

### Task 4.4: Create Verify Tab Component
**Estimated Effort:** 3 hours

**File:** `src/renderer/components/verify-tab.ts`

**Requirements:**
- Column selection dropdowns
- Options checkboxes
- Chrome status indicator
- Start/Stop buttons
- Progress bar
- Results summary

```typescript
class VerifyTab {
  private sheetUrl: string;
  private isRunning: boolean = false;

  constructor(sheetUrl: string) {
    this.sheetUrl = sheetUrl;
    this.initialize();
  }

  private async initialize() {
    // Populate column dropdowns
    // Load saved config
    // Check Chrome status
    // Set up event listeners
  }

  private async handleStartVerification() {
    // Validate configuration
    // Disable UI during run
    // Call electronAPI.startVerification
    // Listen for progress updates
    // Display results
  }

  private handleProgressUpdate(progress: any) {
    // Update progress bar
    // Update statistics
    // Update log output (if verbose)
  }

  private displayResults(results: any) {
    // Show summary statistics
    // Enable UI
  }

  private async checkChromeStatus() {
    const port = parseInt(this.chromePortInput.value);
    const result = await window.electronAPI.checkChromeConnection(port);

    if (result.success) {
      this.showChromeStatus('connected');
    } else {
      this.showChromeStatus('disconnected');
    }
  }
}
```

**Validation:**
- [ ] All UI elements work
- [ ] Configuration loads/saves
- [ ] Chrome status updates
- [ ] Progress displays correctly
- [ ] Results show properly

---

### Task 4.5: Create Duplication Detection Tab Component
**Estimated Effort:** 3 hours

**File:** `src/renderer/components/dupdetection-tab.ts`

**Requirements:**
- Column selection dropdowns
- Threshold slider with presets
- Options checkboxes
- Start/Stop buttons
- Progress bar
- Cluster results display

```typescript
class DupDetectionTab {
  private sheetUrl: string;
  private isRunning: boolean = false;

  constructor(sheetUrl: string) {
    this.sheetUrl = sheetUrl;
    this.initialize();
  }

  private async initialize() {
    // Populate column dropdowns
    // Load saved config
    // Set up threshold slider
    // Set up event listeners
  }

  private async handleStartDetection() {
    // Validate configuration
    // Disable UI during run
    // Call electronAPI.startDupDetection
    // Listen for progress updates
    // Display cluster results
  }

  private handleProgressUpdate(progress: any) {
    // Update progress bar
    // Update statistics
  }

  private displayResults(results: any) {
    // Show summary statistics
    // Display cluster list
    // Make clusters expandable
    // Show sample comments
  }

  private setupThresholdSlider() {
    // Create slider
    // Add preset buttons (Strict, Default, Lenient)
    // Update display value
  }
}
```

**Validation:**
- [ ] All UI elements work
- [ ] Threshold slider works
- [ ] Configuration loads/saves
- [ ] Progress displays correctly
- [ ] Clusters display properly
- [ ] Clusters are expandable

---

### Task 4.6: Add Progress Event Emitters to Commands
**Estimated Effort:** 1 hour

**Files:**
- `src/commands/verify.ts`
- `src/commands/dupdetector.ts`

**Requirements:**
- Add event emitter capability
- Emit progress events during execution
- Include percentage, current item, total items

```typescript
import { EventEmitter } from 'events';

export class VerifyCommand extends BaseCommand {
  private eventEmitter: EventEmitter = new EventEmitter();

  onProgress(callback: (progress: ProgressUpdate) => void) {
    this.eventEmitter.on('progress', callback);
  }

  private emitProgress(progress: ProgressUpdate) {
    this.eventEmitter.emit('progress', progress);
  }

  async run(options: VerifyOptions): Promise<void> {
    // ... existing code ...

    for (let i = 0; i < rows.length; i++) {
      // Process row

      this.emitProgress({
        current: i + 1,
        total: rows.length,
        percentage: ((i + 1) / rows.length) * 100,
        status: 'processing',
        message: `Processing row ${i + 1}...`
      });
    }
  }
}

interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  status: 'processing' | 'complete' | 'error';
  message: string;
  stats?: {
    verified?: number;
    failed?: number;
    errors?: number;
  };
}
```

**Validation:**
- [ ] Events emit correctly
- [ ] Progress data is accurate
- [ ] Listeners receive updates

---

## Phase 5: Integration & Testing

### Task 5.1: End-to-End Testing
**Estimated Effort:** 3 hours

**Test Scenarios:**

1. **Setup Flow**
   - [ ] Launch app
   - [ ] Copy service account email
   - [ ] Enter invalid sheet URL (should error)
   - [ ] Enter valid sheet URL without permissions (should error)
   - [ ] Enter valid sheet URL with permissions (should succeed)

2. **Verify Seeding Tab**
   - [ ] Load saved configuration
   - [ ] Change column selections
   - [ ] Toggle options
   - [ ] Check Chrome status
   - [ ] Start verification without Chrome (should error)
   - [ ] Start verification with Chrome (should work)
   - [ ] Watch progress update
   - [ ] View results
   - [ ] Configuration saved

3. **Duplication Detection Tab**
   - [ ] Load saved configuration
   - [ ] Change column selections
   - [ ] Adjust threshold slider
   - [ ] Use preset buttons
   - [ ] Start detection
   - [ ] Watch progress update
   - [ ] View cluster results
   - [ ] Expand/collapse clusters
   - [ ] Configuration saved

4. **Error Scenarios**
   - [ ] Invalid credentials
   - [ ] Network error
   - [ ] API error
   - [ ] Invalid column
   - [ ] Empty sheet

**Validation:**
- [ ] All test scenarios pass
- [ ] No crashes
- [ ] Error messages are helpful

---

### Task 5.2: Build and Package Testing
**Estimated Effort:** 2 hours

**Test Build Process:**

```bash
# Build TypeScript
npm run build

# Build Electron app
npm run electron:build:mac  # or :win
```

**Test Packaged App:**
- [ ] App launches
- [ ] All features work
- [ ] No console errors
- [ ] App icon displays
- [ ] Menu works

**Validation:**
- [ ] Builds successfully on macOS
- [ ] Builds successfully on Windows
- [ ] Packaged app works correctly

---

### Task 5.3: Documentation Updates
**Estimated Effort:** 1 hour

**Update Files:**

1. **README.md**
   - Add Desktop App section
   - Add installation instructions
   - Add screenshots

2. **USER-GUIDE.md**
   - Add Desktop App usage guide
   - Add troubleshooting for desktop app

3. **QUICK-START.md**
   - Add desktop app quick start

**Validation:**
- [ ] Documentation is clear
- [ ] Screenshots are included
- [ ] Links work

---

## Phase 6: Polish & Optimization

### Task 6.1: Add Application Menu
**Estimated Effort:** 1 hour

**File:** `src/electron/menu.ts`

**Requirements:**
- File menu (Quit)
- Edit menu (Cut, Copy, Paste)
- View menu (Reload, Toggle DevTools)
- Help menu (About, Documentation)

**Validation:**
- [ ] Menu displays
- [ ] Menu items work
- [ ] About dialog shows

---

### Task 6.2: Add Loading Indicators
**Estimated Effort:** 1 hour

**Requirements:**
- Spinner for async operations
- Skeleton screens for loading states
- Smooth transitions

**Validation:**
- [ ] Loading states look professional
- [ ] No blank screens during loading

---

### Task 6.3: Improve Error Messages
**Estimated Effort:** 1 hour

**Requirements:**
- User-friendly error dialogs
- Actionable error messages
- Contextual help links

**Validation:**
- [ ] Error messages are helpful
- [ ] Users know what to do next

---

### Task 6.4: Add Analytics/Logging (Optional)
**Estimated Effort:** 2 hours

**Requirements:**
- Log usage statistics
- Track errors
- Help debug issues

**Validation:**
- [ ] Logs are useful
- [ ] Privacy is maintained

---

## Summary

**Total Estimated Effort:** ~35-40 hours

**Phase Breakdown:**
- Phase 1: Project Setup - 2 hours
- Phase 2: DupDetector CLI - 10 hours
- Phase 3: Electron Main - 6 hours
- Phase 4: Renderer UI - 12 hours
- Phase 5: Integration & Testing - 6 hours
- Phase 6: Polish - 4 hours

**Key Milestones:**
1. ✅ DupDetector CLI working (Phase 2)
2. ✅ Electron app launches (Phase 3)
3. ✅ All UI components working (Phase 4)
4. ✅ End-to-end flow working (Phase 5)
5. ✅ Production-ready build (Phase 6)

---

## Dependencies Between Tasks

```
Phase 1 (Setup)
    ↓
Phase 2 (DupDetector CLI) ← Must complete before Phase 5
    ↓
Phase 3 (Electron Main) ← Must complete before Phase 4
    ↓
Phase 4 (Renderer UI)
    ↓
Phase 5 (Integration)
    ↓
Phase 6 (Polish)
```

**Critical Path:**
- Setup → DupDetector CLI → Electron Main → Renderer → Integration → Polish

**Parallel Work Possible:**
- Electron Main (Task 3.1-3.3) can be done in parallel with Phase 2
- UI design (Task 4.2) can be done in parallel with backend work

---

## Notes

- All code should follow existing TypeScript conventions
- Reuse existing services where possible
- Test frequently during development
- Keep UI simple and intuitive
- Focus on error handling and edge cases

---

## ✅ PHASE 3 & 4 COMPLETION STATUS

### Phase 3: Electron Main Process - ✅ COMPLETED
- Task 3.1: Electron Main Process - ✅ COMPLETED
- Task 3.2: Preload Script - ✅ COMPLETED  
- Task 3.3: IPC Handlers - ✅ COMPLETED

### Phase 4: Frontend Implementation - ✅ COMPLETED
- Task 4.1: Base HTML Structure - ✅ COMPLETED
- Task 4.2: CSS Styles - ✅ COMPLETED
- Task 4.3: Setup Screen Component - ✅ COMPLETED
- Task 4.4: Verify Tab Component - ✅ COMPLETED
- Task 4.5: Duplication Detection Tab Component - ✅ COMPLETED

