# YNAM-Tools Specification

## Overview

**ynam-tools** is an extensible CLI automation toolkit for verifying Facebook comments against Google Sheets data. The tool connects to an existing Chrome browser session (with user's login) and automates the verification workflow.

### Primary Use Case
Verify that comment content from a Google Sheet appears on:
1. The Facebook comment page (direct link verification)
2. A screenshot image (OCR/Vision verification)

---

## Requirements Summary

### Original Problem
```
Sheet at: https://docs.google.com/spreadsheets/d/18cg0Ik9a30DfY_S8-Ba-QI4VSs_iiUWu3VR2A4wT7pA/edit?gid=1616810619#gid=1616810619
- Column L: Comment content
- Column N: Link to Facebook comment
- Column O: Screenshot link
- Column Q: Output - link verification result (1/0)
- Column R: Output - screenshot verification result (1/0/ERROR)
```

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js / TypeScript |
| Browser Automation | Playwright (CDP connection) |
| Sheet Access | Google Sheets API (Service Account) |
| OCR/Vision | Gemini API (multimodal) with local OCR fallback |
| CLI Framework | Inquirer.js (interactive prompts) |
| Architecture | Command pattern (extensible) |

### Environment Variables
```bash
GEMINI_API_KEY=<your-gemini-api-key>
GOOGLE_SERVICE_ACCOUNT_PATH=<path-to-service-account.json>
```

---

## Architecture

### Command Pattern Structure
```
src/
├── index.ts                 # CLI entry point
├── commands/
│   ├── base-command.ts      # Abstract base command
│   ├── verify.ts            # Comment verification command
│   └── [future commands]    # Content generation, etc.
├── services/
│   ├── browser-service.ts   # Chrome CDP connection
│   ├── sheet-service.ts     # Google Sheets API
│   ├── ai-service.ts        # Gemini API wrapper
│   └── ocr-service.ts       # Local OCR (Tesseract)
├── utils/
│   ├── text-matcher.ts      # Normalized text matching
│   ├── vietnamese.ts        # Diacritics normalization
│   ├── config.ts            # Config file handling
│   └── logger.ts            # Logging utilities
└── types/
    └── index.ts             # TypeScript interfaces
```

### Service Responsibilities

**BrowserService**
- Connect to Chrome via CDP (port 9222 default)
- Auto-detect running Chrome with debugging port
- Provide step-by-step guide if connection fails
- Manage tabs for concurrent processing

**SheetService**
- Authenticate via service account
- Read sheet data with column mapping
- Write results directly to specified columns
- Support both column letters (L, N, O) and header names

**AIService**
- Wrap Gemini API for vision tasks
- Handle rate limiting with exponential backoff
- Accept image + text prompt for verification

**OCRService**
- Local Tesseract OCR as primary method
- Fallback to Gemini Vision if confidence is low

---

## Features

### 1. Chrome Connection Flow
```
1. Attempt connection to localhost:9222
2. If success → proceed
3. If fail → display instructions:
   "Chrome is not running with debugging enabled.

    To enable:
    1. Close all Chrome windows
    2. Run: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222
    3. Login to Facebook in that Chrome window
    4. Re-run this tool"
4. Retry connection after user confirms
```

### 2. Interactive Column Selection
```
? Sheet URL: https://docs.google.com/spreadsheets/d/...

Fetching sheet preview...

   | A          | B      | C    | ... | L              | N                  | O                |
---|------------|--------|------|-----|----------------|--------------------| -----------------|
 1 | Date       | Author | Type | ... | Comment Content| Comment Link       | Screenshot Link  |
 2 | 2024-01-01 | User1  | FB   | ... | Hello World    | https://fb.com/... | https://img/...  |
 3 | 2024-01-02 | User2  | FB   | ... | Xin chào       | https://fb.com/... | https://img/...  |

? Column containing comment text: L (or "Comment Content")
? Column containing comment link: N (or "Comment Link")
? Column containing screenshot link: O (or "Screenshot Link")
? Column to write link verification result: Q
? Column to write screenshot verification result: R
```

### 3. Text Matching (Normalized)
- Case-insensitive comparison
- Whitespace normalization (multiple spaces → single space)
- Punctuation ignored
- Vietnamese diacritics normalization:
  - `Xin chào` matches `Xin chao` (fallback)
  - `Xin chào` matches `XIN CHÀO` (case)

### 4. Processing Modes
- **Sequential** (default): One row at a time
- **Parallel**: Configurable via `--concurrency=N` (default: 1)
- **Row Range**: Process specific rows via `--rows=10-50`

### 5. Error Handling
- Retry failed rows 2-3 times with exponential backoff
- On persistent failure: log error, write "ERROR" to result column, continue
- Bad screenshot URLs (404): write "ERROR" to column R

### 6. Output Behavior
- Write directly to Google Sheet
- Skip cells that already have values (resume capability)
- Support `--overwrite` flag to replace existing values

### 7. Dry Run Mode
```bash
ynam-tools verify --dry-run
```
Output:
```
DRY RUN MODE - No changes will be made

Sheet: https://docs.google.com/spreadsheets/d/...
Rows to process: 45 (rows 2-46)
Rows with existing results: 12 (will be skipped)
Rows to verify: 33

Column mapping:
  Comment text:    L (Comment Content)
  Comment link:    N (Comment Link)
  Screenshot:      O (Screenshot Link)
  Link result:     Q
  Screenshot result: R

Chrome connection: ✓ Connected to localhost:9222
Gemini API: ✓ API key configured
```

### 8. Watch Mode
```bash
ynam-tools verify --watch --interval=5
```
- Poll sheet every N minutes for new unfilled rows
- Process new rows automatically
- Stop with Ctrl+C

---

## CLI Interface

### Commands
```bash
# Interactive mode (recommended)
ynam-tools verify

# With options
ynam-tools verify \
  --sheet="https://docs.google.com/spreadsheets/d/..." \
  --comment-col=L \
  --link-col=N \
  --screenshot-col=O \
  --link-result-col=Q \
  --screenshot-result-col=R \
  --rows=1-100 \
  --concurrency=3 \
  --verbose

# Dry run
ynam-tools verify --dry-run

# Watch mode
ynam-tools verify --watch --interval=5
```

### Flags
| Flag | Description | Default |
|------|-------------|---------|
| `--sheet` | Google Sheet URL | (prompt) |
| `--comment-col` | Column with comment text | (prompt) |
| `--link-col` | Column with comment link | (prompt) |
| `--screenshot-col` | Column with screenshot URL | (prompt) |
| `--link-result-col` | Column to write link result | (prompt) |
| `--screenshot-result-col` | Column to write screenshot result | (prompt) |
| `--rows` | Row range to process (e.g., "10-50") | all |
| `--concurrency` | Parallel processing count | 1 |
| `--dry-run` | Validate config without processing | false |
| `--verbose` | Show per-row status | false |
| `--overwrite` | Overwrite existing results | false |
| `--watch` | Enable watch mode | false |
| `--interval` | Watch mode poll interval (minutes) | 5 |
| `--report` | Generate HTML report | false |
| `--port` | Chrome debugging port | 9222 |

---

## Output & Reporting

### Terminal Output (Default)
```
Processing 33 rows...
[████████████████████░░░░░░░░░░] 67% | 22/33 | ETA: 45s
```

### Verbose Output (`--verbose`)
```
Processing 33 rows...
Row 2: Link ✓ Screenshot ✓
Row 3: Link ✓ Screenshot ✓
Row 4: Link ✗ Screenshot ✓
Row 5: Link ✓ Screenshot ERROR (404)
...
```

### Summary (Always shown)
```
═══════════════════════════════════════════
  VERIFICATION COMPLETE
═══════════════════════════════════════════
  Total rows processed:  33
  Link verification:     30 passed, 3 failed
  Screenshot verification: 28 passed, 3 failed, 2 errors

  Time elapsed: 2m 34s
  Results written to sheet: ✓
═══════════════════════════════════════════
```

### HTML Report (`--report`)
Generates `verification-report-{timestamp}.html` with:
- Summary statistics
- Charts (pass/fail/error breakdown)
- Detailed row-by-row results
- Error log with links

---

## Configuration Persistence

After first successful run:
```
? Save this configuration for future use? (Y/n)
```

Saves to `.ynam-tools.json`:
```json
{
  "lastSheet": "https://docs.google.com/spreadsheets/d/...",
  "columnMapping": {
    "comment": "L",
    "link": "N",
    "screenshot": "O",
    "linkResult": "Q",
    "screenshotResult": "R"
  },
  "concurrency": 1
}
```

On subsequent runs:
```
? Use saved configuration? (Y/n)
  Sheet: https://docs.google.com/spreadsheets/d/...
  Columns: L→Q (link), O→R (screenshot)
```

---

## Verification Logic

### Link Verification (Column N → Q)
```typescript
async function verifyLink(commentText: string, linkUrl: string): Promise<0 | 1> {
  // 1. Open link in Chrome tab
  const page = await browser.newPage();
  await page.goto(linkUrl, { waitUntil: 'networkidle' });

  // 2. Get page text content
  const pageText = await page.evaluate(() => document.body.innerText);

  // 3. Normalized text match
  const normalizedComment = normalizeText(commentText);
  const normalizedPage = normalizeText(pageText);

  // 4. Return result
  return normalizedPage.includes(normalizedComment) ? 1 : 0;
}
```

### Screenshot Verification (Column O → R)
```typescript
async function verifyScreenshot(commentText: string, imageUrl: string): Promise<0 | 1 | 'ERROR'> {
  // 1. Download image
  const imageBuffer = await downloadImage(imageUrl);
  if (!imageBuffer) return 'ERROR';

  // 2. Try local OCR first
  const ocrResult = await ocrService.extractText(imageBuffer);
  if (ocrResult.confidence > 0.8) {
    const normalized = normalizeText(ocrResult.text);
    return normalized.includes(normalizeText(commentText)) ? 1 : 0;
  }

  // 3. Fallback to Gemini Vision
  const geminiResult = await aiService.verifyImageContainsText(imageBuffer, commentText);
  return geminiResult ? 1 : 0;
}
```

### Text Normalization
```typescript
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                          // Decompose Vietnamese diacritics
    .replace(/[\u0300-\u036f]/g, '')           // Remove diacritics (optional match)
    .replace(/[^\w\s]/g, '')                   // Remove punctuation
    .replace(/\s+/g, ' ')                      // Normalize whitespace
    .trim();
}
```

---

## Gemini API Integration

### Vision Verification Prompt
```typescript
const prompt = `
Look at this image and determine if the following text appears in it.
The text may be in Vietnamese.

Text to find: "${commentText}"

Respond with only "YES" if the text appears in the image, or "NO" if it does not.
Consider partial matches and slight variations as a match.
`;

const result = await gemini.generateContent([
  { inlineData: { mimeType: 'image/png', data: imageBase64 } },
  { text: prompt }
]);
```

### Rate Limiting
- Default delay between API calls: 100ms
- On 429 error: exponential backoff (1s, 2s, 4s, 8s, max 30s)
- Max retries: 5

---

## Future Extensibility

The command pattern architecture allows adding new commands:

```typescript
// Future: Content generation command
class GenerateCommand extends BaseCommand {
  name = 'generate';
  description = 'Generate content using AI';

  async execute(options: GenerateOptions): Promise<void> {
    // Implementation
  }
}

// Future: Summarize command
class SummarizeCommand extends BaseCommand {
  name = 'summarize';
  description = 'Summarize verification results';

  async execute(options: SummarizeOptions): Promise<void> {
    // Implementation
  }
}
```

Usage:
```bash
ynam-tools generate --type=response --input=comments.csv
ynam-tools summarize --sheet=... --output=report.md
```

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- Google Chrome browser
- Google Cloud service account with Sheets API access
- Gemini API key

### Installation
```bash
git clone <repository>
cd ynam-tools
npm install
```

### Configuration
```bash
# Create .env file
cp .env.example .env

# Edit with your credentials
GEMINI_API_KEY=your-api-key
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
```

### First Run
```bash
npm start
# or
npx ts-node src/index.ts verify
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Chrome connection failed |
| 2 | Google Sheets authentication failed |
| 3 | Invalid sheet URL or permissions |
| 4 | Gemini API error |
| 5 | Configuration error |

---

## Security Considerations

- Service account JSON should not be committed to git
- Chrome debugging port should only be bound to localhost
- API keys stored in environment variables, not code
- No sensitive data logged in verbose mode

---

## Changelog

### v1.0.0 (Initial)
- Comment verification via link and screenshot
- Interactive CLI with column selection
- Gemini Vision integration
- Local OCR fallback
- Watch mode
- HTML report generation
