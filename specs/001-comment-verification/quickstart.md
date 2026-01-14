# Quickstart: YNAM Comment Verification Tool

**Feature Branch**: `001-comment-verification`
**Date**: 2026-01-14

## Prerequisites

Before using this tool, ensure you have:

1. **Node.js 18+** installed
2. **Google Chrome** browser
3. **Google Cloud Service Account** with Sheets API access
4. **Gemini API Key** for AI vision fallback

## Setup

### 1. Clone and Install

```bash
git clone <repository>
cd ynam-tools
npm install
```

### 2. Configure Environment

Create `.env` file in project root:

```bash
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
```

### 3. Set Up Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Google Sheets API
4. Create a Service Account
5. Download the JSON key file
6. Share your Google Sheet with the service account email

### 4. Start Chrome with Debugging

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Windows:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222
```

### 5. Log into Facebook

In the Chrome window you just opened, navigate to Facebook and log in with your account.

## Usage

### Interactive Mode (Recommended)

```bash
npm start
# or
npx tsx src/index.ts verify
```

Follow the prompts:
1. Enter your Google Sheet URL
2. Select columns for comment text, links, screenshots
3. Select output columns for results
4. Watch the verification progress

### Command Line Mode

```bash
npx tsx src/index.ts verify \
  --sheet="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit" \
  --comment-col=L \
  --link-col=N \
  --screenshot-col=O \
  --link-result-col=Q \
  --screenshot-result-col=R
```

### Common Options

| Option | Description | Example |
|--------|-------------|---------|
| `--dry-run` | Preview without making changes | `--dry-run` |
| `--verbose` | Show per-row status | `--verbose` |
| `--rows` | Process specific rows | `--rows=10-50` |
| `--concurrency` | Parallel processing | `--concurrency=3` |
| `--watch` | Auto-process new rows | `--watch --interval=5` |
| `--report` | Generate HTML report | `--report` |

## Expected Sheet Format

Your Google Sheet should have columns like:

| A | ... | L | N | O | Q | R |
|---|-----|---|---|---|---|---|
| Date | ... | Comment Content | Comment Link | Screenshot | Link Result | Screenshot Result |
| ... | ... | Hello world | https://fb.com/... | https://img/... | | |

- **Column L**: The comment text to verify
- **Column N**: Direct link to Facebook comment
- **Column O**: Screenshot URL (optional)
- **Column Q**: Tool writes link verification result (1/0)
- **Column R**: Tool writes screenshot verification result (1/0/ERROR)

## Output Values

| Value | Meaning |
|-------|---------|
| `1` | Verification passed - content found |
| `0` | Verification failed - content not found |
| `ERROR` | Unable to process (404, timeout, etc.) |

## Troubleshooting

### Chrome Connection Failed

```
Error: Chrome is not running with debugging enabled.
```

**Solution**: Close all Chrome windows and restart with `--remote-debugging-port=9222`

### Google Sheets Permission Denied

```
Error: The caller does not have permission
```

**Solution**: Share the Google Sheet with your service account email (found in the JSON key file)

### Gemini API Rate Limited

The tool automatically retries with exponential backoff. If persistent:
- Wait a few minutes before retrying
- Reduce `--concurrency` to 1
- Check your Gemini API quota

### Facebook Login Required

If you see login prompts on Facebook pages:
1. Make sure you logged into Facebook in the debugging Chrome window
2. Don't close that Chrome window while the tool runs

## Next Steps

- Use `--watch` mode for continuous monitoring
- Generate `--report` for stakeholder documentation
- Configure defaults in `.ynam-tools.json` for repeated use
