# Research: YNAM Comment Verification Tool

**Feature Branch**: `001-comment-verification`
**Date**: 2026-01-14
**Status**: Complete

## Research Tasks

### 1. Playwright CDP Connection Best Practices

**Decision**: Use Playwright's `connectOverCDP()` method to connect to existing Chrome instance.

**Rationale**:
- Playwright natively supports CDP connection without additional libraries
- Preserves user's login state and cookies (required for Facebook access)
- Supports tab management for concurrent processing
- Cross-platform compatible (macOS, Windows, Linux)

**Alternatives Considered**:
- **Puppeteer**: Similar capability but Playwright has better TypeScript support and modern API
- **Chrome DevTools Protocol directly**: More complex, requires manual protocol management
- **Selenium**: Heavier, less suited for CDP connection to existing browser

**Implementation Notes**:
```typescript
import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const contexts = browser.contexts();
const page = contexts[0]?.pages()[0] || await browser.newPage();
```

### 2. Google Sheets API Authentication Pattern

**Decision**: Use Service Account authentication with `googleapis` library.

**Rationale**:
- Service accounts work headlessly (no OAuth popup required)
- Suitable for automation/CLI tools
- Sheet must be shared with the service account email
- Well-documented, stable API

**Alternatives Considered**:
- **OAuth2 User Flow**: Requires browser interaction, not suitable for CLI automation
- **API Key**: Read-only access, cannot write verification results back

**Implementation Notes**:
- Store service account JSON path in `GOOGLE_SERVICE_ACCOUNT_PATH` env var
- Use `google.auth.GoogleAuth` with `scopes: ['https://www.googleapis.com/auth/spreadsheets']`
- Parse sheet ID from URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/...`

### 3. OCR with Vietnamese Text Support

**Decision**: Use Tesseract.js as primary OCR with Gemini Vision fallback.

**Rationale**:
- Tesseract.js runs locally, no API costs for most cases
- Supports Vietnamese language pack (`vie`)
- Gemini Vision handles edge cases where OCR confidence is low
- Dual approach balances cost vs accuracy

**Alternatives Considered**:
- **Gemini Vision only**: Higher accuracy but more expensive, API rate limits
- **Google Cloud Vision**: Good accuracy but requires additional GCP setup
- **Amazon Textract**: Similar to Cloud Vision, additional AWS dependencies

**Implementation Notes**:
```typescript
import Tesseract from 'tesseract.js';

const result = await Tesseract.recognize(imageBuffer, 'vie+eng');
if (result.data.confidence > 80) {
  // Use OCR result
} else {
  // Fallback to Gemini Vision
}
```

### 4. Vietnamese Text Normalization

**Decision**: Use Unicode NFD normalization with diacritics stripping for comparison.

**Rationale**:
- Vietnamese has many diacritics that may render differently across systems
- NFD decomposition separates base characters from combining marks
- Stripping diacritics allows fuzzy matching while preserving meaning
- Case-insensitive comparison handles display variations

**Alternatives Considered**:
- **Exact matching only**: Too strict, would miss valid matches
- **Levenshtein distance**: Overkill for this use case, slower
- **Phonetic matching**: Unnecessary complexity

**Implementation Notes**:
```typescript
function normalizeVietnamese(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/[đĐ]/g, 'd')           // Handle special Vietnamese character
    .replace(/\s+/g, ' ')
    .trim();
}
```

### 5. CLI Framework Selection

**Decision**: Use Commander.js for CLI parsing with Inquirer.js for interactive prompts.

**Rationale**:
- Commander is lightweight, well-maintained, TypeScript-friendly
- Inquirer provides rich interactive prompts (select, confirm, input)
- Both are widely used in Node.js ecosystem
- Support for both flag-based and interactive modes

**Alternatives Considered**:
- **yargs**: More feature-rich but heavier
- **oclif**: Enterprise-grade but overkill for single-command CLI
- **cac**: Lighter but less interactive prompt support

**Implementation Notes**:
```typescript
import { Command } from 'commander';
import inquirer from 'inquirer';

const program = new Command()
  .name('ynam-tools')
  .version('1.0.0');

program
  .command('verify')
  .option('--sheet <url>', 'Google Sheet URL')
  .option('--dry-run', 'Validate without processing')
  .action(async (options) => {
    if (!options.sheet) {
      const answers = await inquirer.prompt([
        { type: 'input', name: 'sheet', message: 'Sheet URL:' }
      ]);
      options.sheet = answers.sheet;
    }
  });
```

### 6. Progress and Reporting

**Decision**: Use cli-progress for progress bars, generate standalone HTML reports.

**Rationale**:
- cli-progress provides clean terminal progress bars with ETA
- HTML reports are self-contained, no external dependencies to view
- Can include simple charts via inline SVG or CSS-based visualizations

**Alternatives Considered**:
- **ora**: Good for spinners but limited progress bar support
- **PDF reports**: Requires additional libraries (pdfkit), harder to generate
- **Markdown reports**: Less visual, no charts

### 7. Rate Limiting and Retry Strategy

**Decision**: Implement exponential backoff with jitter for API calls.

**Rationale**:
- Gemini API has rate limits that can trigger 429 errors
- Exponential backoff is industry standard for handling transient failures
- Jitter prevents thundering herd when multiple retries happen simultaneously
- Max 5 retries with 30s ceiling balances reliability vs timeout

**Implementation Notes**:
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  baseDelay = 1000,
  maxDelay = 30000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const jitter = delay * 0.1 * Math.random();
      await sleep(delay + jitter);
    }
  }
}
```

### 8. Configuration Persistence

**Decision**: Store configuration in `.ynam-tools.json` in current working directory.

**Rationale**:
- Project-local config allows different settings per project
- JSON format is human-readable and easily editable
- Standard pattern for CLI tools (similar to .eslintrc, .prettierrc)

**Alternatives Considered**:
- **Home directory config**: Would apply globally, not project-specific
- **YAML config**: Requires additional parser dependency
- **Environment variables only**: Less convenient for complex settings

**Schema**:
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

## Dependencies Summary

| Package | Version | Purpose |
|---------|---------|---------|
| playwright | ^1.40.0 | Browser automation via CDP |
| googleapis | ^130.0.0 | Google Sheets API |
| @google/generative-ai | ^0.2.0 | Gemini Vision API |
| tesseract.js | ^5.0.0 | Local OCR |
| commander | ^12.0.0 | CLI parsing |
| inquirer | ^9.2.0 | Interactive prompts |
| cli-progress | ^3.12.0 | Progress bars |
| chalk | ^5.3.0 | Terminal colors |
| dotenv | ^16.4.0 | Environment variable loading |

**Dev Dependencies**:
| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.3.0 | TypeScript compiler |
| vitest | ^1.2.0 | Unit/integration testing |
| @types/node | ^20.0.0 | Node.js type definitions |
| @types/inquirer | ^9.0.0 | Inquirer type definitions |
| tsx | ^4.7.0 | TypeScript execution |

## Unresolved Questions

None - all technical decisions have been made based on the SPEC.md requirements.
