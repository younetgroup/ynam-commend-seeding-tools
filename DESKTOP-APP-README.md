# YouNetAM Spreadsheet Tool - Desktop Application

A professional Electron desktop application for Google Sheets automation, featuring comment verification and duplication detection.

## Features

### 1. **Verify Seeding**
- Automatically verify Facebook comments from Google Sheets
- Check comment links and screenshot accuracy
- Real-time progress tracking
- Configurable column mapping
- Chrome browser integration

### 2. **Duplication Detection**
- Detect similar comments using fuzzy text matching
- Adjustable similarity threshold (0-100%)
- Vietnamese text normalization
- Cluster similar comments automatically
- Visual cluster display

## Installation

### Prerequisites
- Node.js 18+ installed
- Google Chrome browser
- Google Service Account credentials

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment:**
Create a `.env` file in the project root:
```bash
GOOGLE_SERVICE_ACCOUNT_PATH=./path/to/service-account.json
GEMINI_API_KEY=your-api-key-here  # Optional, for screenshot verification
```

3. **Build the application:**
```bash
npm run build:electron
```

4. **Run the application:**
```bash
npm run electron:start
```

## Development

### Running in Development Mode
```bash
npm run electron:dev
```

This will:
1. Build TypeScript files
2. Copy renderer assets
3. Launch the Electron app with DevTools

### Building for Distribution

**macOS:**
```bash
npm run electron:build:mac
```

**Windows:**
```bash
npm run electron:build:win
```

Built applications will be in the `dist-electron/` directory.

## Usage

### Initial Setup

1. **Launch the application**
2. **Copy the service account email** displayed on the setup screen
3. **Share your Google Sheet** with the service account (Editor permissions)
4. **Enter your Google Sheet URL**
5. **Click "Load Sheet"**

### Verify Seeding Tab

1. Configure column mappings:
   - Comment Text Column
   - Comment Link Column
   - Screenshot URL Column
   - Link Result Column
   - Screenshot Result Column

2. Set processing options:
   - Row range (optional)
   - Concurrency level
   - Verbose output
   - Overwrite existing results
   - Dry run mode

3. Ensure Chrome is running with debug mode:
   - Click "Start Chrome with Debug Mode" button
   - Or manually run: `chrome --remote-debugging-port=9222`

4. Click "Start Verification"

5. Monitor real-time progress:
   - Progress bar
   - Current status
   - Running summary statistics

### Duplication Detection Tab

1. Configure columns:
   - Comment Column (column to analyze)
   - Result Cluster Column (where to write cluster IDs)

2. Set similarity threshold:
   - Use slider (0-100%)
   - Or click preset buttons:
     - Strict (95%)
     - Default (85%)
     - Lenient (70%)

3. Optional: Set row range

4. Click "Start Detection"

5. View results:
   - Summary statistics
   - Duplicate cluster details
   - Preview of similar comments

## Architecture

### Tech Stack
- **Electron**: Desktop framework
- **TypeScript**: Type-safe development
- **Playwright**: Browser automation (CDP)
- **Google Sheets API**: Sheet integration
- **Fuzzy Text Matching**: Vietnamese comment comparison

### Project Structure
```
src/
├── electron/           # Electron main process
│   ├── main.ts        # App entry point
│   ├── preload.ts     # IPC bridge
│   └── ipc-handlers.ts # Backend handlers
├── renderer/          # Frontend
│   ├── index.html     # Main UI
│   ├── styles/        # CSS
│   └── components/    # JavaScript components
├── commands/          # CLI commands
│   ├── verify.ts      # Verification logic
│   └── dupdetector.ts # Duplication detection
└── services/          # Backend services
    ├── sheet-service.ts
    ├── browser-service.ts
    └── similarity-service.ts
```

### How It Works

**IPC Communication:**
```
Renderer (UI) ← IPC → Main Process ← Services → External APIs
                                      ├─ Google Sheets
                                      ├─ Chrome (CDP)
                                      └─ Similarity Engine
```

**Progress Streaming:**
- Commands emit progress events
- IPC handlers forward events to UI
- Real-time updates in frontend

## Configuration

### Saved Settings
Configuration is automatically saved to `.ynam-tools.json`:
```json
{
  "lastSheet": "https://docs.google.com/spreadsheets/d/.../edit",
  "desktop": {
    "verify": {
      "commentCol": "L",
      "linkCol": "N",
      ...
    },
    "dupdetector": {
      "commentCol": "P",
      "clusterCol": "S",
      "threshold": 85
    }
  }
}
```

## Troubleshooting

### "Chrome is not running"
**Solution:** Click "Start Chrome with Debug Mode" or manually run:
- **Mac:** `/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222`
- **Windows:** `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`

### "Cannot access the Google Sheet"
**Solution:** Ensure the sheet is shared with the service account email shown in setup

### "GOOGLE_SERVICE_ACCOUNT_PATH not set"
**Solution:** Create a `.env` file with the path to your service account JSON file

### App won't launch
**Solution:** Run `npm run build:electron` first to compile TypeScript

## Performance

### Duplication Detection
- **Algorithm:** Levenshtein distance with Vietnamese normalization
- **Speed:** ~1000 comparisons/second
- **Memory:** Efficient O(n²) space complexity

### Verify Seeding
- **Concurrency:** 1-3 parallel verifications recommended
- **Speed:** ~9 seconds per comment
- **Chrome:** Uses existing browser session

## Security

- ✅ Service account credentials stored locally
- ✅ No credentials transmitted to external servers
- ✅ Context isolation enabled
- ✅ Sandbox mode for renderer process
- ✅ IPC input validation

## License

MIT License - See LICENSE file for details

## Support

For issues or questions, please refer to:
- Main README.md
- USER-GUIDE.md
- SPEC.md (technical specification)

## Credits

Developed for YNAM to automate Facebook comment verification workflows.

Built with TypeScript, Electron, and modern web technologies.
