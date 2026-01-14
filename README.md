# 🎯 YNAM Comment Verification Tool

**Automatically verify Facebook comments from Google Sheets**

Tired of manually checking if Facebook comments are real? This tool does it automatically! It reads comment data from your Google Sheet, verifies each comment on Facebook, and writes the results back to your sheet.

---

## ✨ Features

- ✅ **Automatic Link Verification**: Checks if Facebook comment links are valid
- ✅ **Screenshot Verification**: Uses OCR + AI to verify screenshots contain the correct text
- ✅ **Google Sheets Integration**: Reads from and writes results back to Google Sheets
- ✅ **Smart Text Matching**: Handles Vietnamese diacritics, capitalization, and punctuation
- ✅ **Resume Capability**: Automatically skips already-verified comments
- ✅ **Watch Mode**: Continuously monitors for new comments
- ✅ **HTML Reports**: Generate professional reports for your team
- ✅ **Progress Tracking**: Real-time progress bars and summaries
- ✅ **Error Handling**: Clear error messages with helpful hints

---

## 📸 What It Does

```
Google Sheet                     Facebook                      Results
┌─────────────┐                 ┌──────────┐                ┌─────────────┐
│ Comment Text│  ──────────>    │ Verify   │  ──────────>  │ 1 (Found)   │
│ Comment Link│                 │ On Site  │                │ 0 (Missing) │
│ Screenshot  │                 └──────────┘                │ ERROR       │
└─────────────┘                                             └─────────────┘
```

**Time Savings:**
- Manual: 30 seconds per comment × 100 = 50 minutes
- Automated: 9 seconds per comment × 100 = 15 minutes
- **Saves 70% of your time!** ⏱️

---

## 🚀 Quick Start

**Choose your path:**

### 🏃 I Want to Start FAST
→ See [QUICK-START.md](./QUICK-START.md) (15-minute setup)

### 📖 I Want Detailed Instructions
→ See [USER-GUIDE.md](./USER-GUIDE.md) (Complete step-by-step guide)

### 💻 I'm a Developer
→ See [Technical Documentation](#-technical-documentation) below

---

## 📋 Requirements

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **Google Chrome** browser
- **Google Account** (for Sheets access)
- **Facebook Account** (to verify comments)
- **Gemini API Key** (optional, for screenshot verification)

---

## ⚡ Installation (Developer)

```bash
# Clone the repository
cd ynam-comment-seending-tools

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Build the project
npm run build

# Run the tool
npm start
```

---

## 🎯 Basic Usage

### Interactive Mode (Recommended)

```bash
npm start
```

The tool will ask you questions and guide you through the process!

### Command Line Mode

```bash
npm start -- \
  --sheet="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" \
  --comment-col=L \
  --link-col=N \
  --screenshot-col=O \
  --link-result-col=Q \
  --screenshot-result-col=R
```

### Advanced Options

```bash
# Dry run (preview without changes)
npm start -- --dry-run

# Verify specific rows only
npm start -- --rows=10-50

# Show detailed output
npm start -- --verbose

# Re-verify all comments
npm start -- --overwrite

# Generate HTML report
npm start -- --report

# Watch mode (check every 5 minutes)
npm start -- --watch --interval=5
```

---

## 📊 Example Workflow

1. **Prepare your Google Sheet** with comment data
2. **Start Chrome** with debugging:
   ```bash
   # Windows
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

   # Mac
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
3. **Log into Facebook** in the Chrome debugging window
4. **Run the tool**: `npm start`
5. **Answer the prompts** (or use saved configuration)
6. **Check results** in your Google Sheet!

---

## 📈 Understanding Results

The tool writes these values to your result columns:

| Value | Meaning | Description |
|-------|---------|-------------|
| `1` | ✅ Pass | Comment found and verified on Facebook |
| `0` | ❌ Fail | Comment not found on Facebook |
| `ERROR` | ⚠️ Error | Could not verify (broken link, timeout, etc.) |

---

## 🏗️ Project Structure

```
ynam-comment-seending-tools/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/             # Command implementations
│   │   ├── base-command.ts
│   │   └── verify.ts         # Main verification logic
│   ├── services/             # Core services
│   │   ├── browser-service.ts    # Chrome CDP connection
│   │   ├── sheet-service.ts      # Google Sheets API
│   │   ├── ai-service.ts         # Gemini Vision API
│   │   └── ocr-service.ts        # Tesseract OCR
│   ├── utils/                # Utilities
│   │   ├── config.ts         # Configuration management
│   │   ├── logger.ts         # Logging
│   │   ├── retry.ts          # Retry logic
│   │   ├── text-matcher.ts   # Text normalization
│   │   ├── vietnamese.ts     # Vietnamese text handling
│   │   ├── image.ts          # Image downloading
│   │   └── report.ts         # HTML report generation
│   └── types/                # TypeScript types
│       └── index.ts
├── specs/                    # Specification documents
├── tests/                    # Test files
├── .env.example              # Environment template
├── package.json              # Project dependencies
├── tsconfig.json             # TypeScript config
├── USER-GUIDE.md            # 📖 Detailed user guide
├── QUICK-START.md           # ⚡ Quick setup guide
└── README.md                # 👈 You are here
```

---

## 🔧 Technical Documentation

### Architecture

The tool follows a clean service-based architecture:

- **CLI Layer**: Commander.js for command parsing, Inquirer.js for interactive prompts
- **Service Layer**: Isolated services for different concerns
- **Utility Layer**: Shared utilities for common tasks
- **Type Safety**: Full TypeScript with strict mode

### Key Technologies

| Technology | Purpose |
|-----------|---------|
| **TypeScript** | Type-safe development |
| **Playwright** | Chrome DevTools Protocol connection |
| **googleapis** | Google Sheets API integration |
| **@google/generative-ai** | Gemini Vision API |
| **tesseract.js** | Local OCR processing |
| **commander** | CLI argument parsing |
| **inquirer** | Interactive prompts |
| **cli-progress** | Progress bars |

### Services

#### BrowserService
- Connects to Chrome via CDP
- Navigates to Facebook pages
- Extracts page text content

#### SheetService
- Authenticates with service account
- Reads comment records from sheets
- Writes verification results back

#### OCRService
- Extracts text from images using Tesseract
- Supports Vietnamese + English
- Returns confidence scores

#### AIService
- Fallback for low-confidence OCR results
- Uses Gemini Vision API
- Includes rate limiting (100ms between calls)

### Configuration

Configuration is stored in `.ynam-tools.json`:

```json
{
  "lastSheet": "https://docs.google.com/spreadsheets/d/.../edit",
  "columnMapping": {
    "comment": "L",
    "link": "N",
    "screenshot": "O",
    "linkResult": "Q",
    "screenshotResult": "R"
  },
  "concurrency": 1,
  "port": 9222
}
```

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error |
| 3 | Connection error |
| 4 | Validation error |
| 5 | Authentication error |

---

## 🧪 Development

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Run Linter

```bash
npm run lint
```

### Development Mode

```bash
npm start
```

---

## 📝 Environment Variables

Create a `.env` file with:

```bash
# Required: Path to Google service account JSON
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json

# Optional: Gemini API key (for screenshot verification)
GEMINI_API_KEY=your-api-key-here
```

---

## 🔒 Security

- **Service Account Keys**: Keep `service-account.json` secure, never commit to git
- **API Keys**: Keep `GEMINI_API_KEY` secure, never share publicly
- **.env File**: Listed in `.gitignore`, never commit credentials
- **Chrome Session**: Uses your existing login, no password storage

---

## 🐛 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| "Chrome is not running" | Start Chrome with `--remote-debugging-port=9222` |
| "Permission denied" | Share Google Sheet with service account email |
| "API key error" | Check `.env` file has correct format |
| "Network error" | Check internet connection |
| Many `ERROR` results | Make sure you're logged into Facebook |

**For detailed troubleshooting, see [USER-GUIDE.md](./USER-GUIDE.md#-troubleshooting)**

---

## 📖 Documentation

- **[USER-GUIDE.md](./USER-GUIDE.md)** - Complete step-by-step guide for non-technical users
- **[QUICK-START.md](./QUICK-START.md)** - Fast 15-minute setup guide
- **[specs/](./specs/)** - Technical specifications and design documents

---

## 🤝 Contributing

This is a private tool developed for YNAM. For internal use only.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙋 Support

**For Users:**
- See [USER-GUIDE.md](./USER-GUIDE.md) for detailed instructions
- Check [Troubleshooting](#-troubleshooting) section above
- Run with `--verbose` flag to see detailed logs

**For Developers:**
- Check the [specs/](./specs/) directory for technical documentation
- Review the code comments in source files
- See TypeScript interfaces in `src/types/index.ts`

---

## 🎉 Credits

Developed for YNAM to automate Facebook comment verification workflows.

**Built with:**
- TypeScript + Node.js
- Playwright (Browser automation)
- Google APIs (Sheets + Gemini)
- Tesseract.js (OCR)
- Commander + Inquirer (CLI)

---

## 📊 Stats

- **Total Lines of Code**: ~3,500
- **Services**: 4 (Browser, Sheet, OCR, AI)
- **Utilities**: 7
- **Commands**: 1 main command with 15+ options
- **Test Coverage**: Integration tests included
- **TypeScript**: Strict mode enabled
- **Platform Support**: Windows, Mac, Linux

---

**Ready to automate your comment verification? [Get Started →](./QUICK-START.md)**
