# Batch Processing & Connection Reuse Guide

## Batch Processing with Row Ranges

### Process Specific Rows

Use the `--rows` flag to process only specific row ranges:

```bash
# Process rows 10 to 50
npm start verify -- --rows=10-50

# Process rows 100 to 200
npm start verify -- --rows=100-200

# Process a single row (e.g., row 25)
npm start verify -- --rows=25-25
```

### Processing Large Sheets in Batches

For large sheets (1000+ rows), process in batches to avoid timeouts and memory issues:

```bash
# Batch 1: Rows 2-250
npm start verify -- --rows=2-250

# Batch 2: Rows 251-500
npm start verify -- --rows=251-500

# Batch 3: Rows 501-750
npm start verify -- --rows=501-750

# And so on...
```

**Benefits**:
- ✅ Can stop and resume anytime
- ✅ Easier to track progress
- ✅ Less memory usage
- ✅ Can run different batches in parallel (advanced)

### Skip Already Processed Rows

By default, the tool **skips rows that already have results** (unless you use `--overwrite`):

```bash
# First run: Process all rows
npm start verify

# Second run: Only process NEW rows (those without results)
npm start verify

# Force re-process everything
npm start verify -- --overwrite
```

## Connection Reuse

### Chrome Connection

**Chrome connection is automatically reused** across all rows in a single session:

```
Session Start
  ↓
Connect to Chrome (one time)
  ↓
Row 1 → Use same connection
Row 2 → Use same connection
Row 3 → Use same connection
...
Row 582 → Use same connection
  ↓
Disconnect from Chrome
  ↓
Session End
```

**Important**:
- Chrome must stay open during the entire session
- Connection is reused for all rows (no reconnection overhead)
- Only ONE connection per session

### Google Sheets Connection

**Google Sheets API connection is also reused**:

```
Session Start
  ↓
Initialize Google Sheets (one time)
  ↓
Row 1 → Read data, Write result
Row 2 → Read data, Write result
Row 3 → Read data, Write result
...
  ↓
Session End
```

**Note**: Individual reads/writes are separate API calls, but the authenticated client is reused.

### OCR Worker

**Tesseract OCR worker is initialized once and reused**:

```
Session Start
  ↓
First screenshot → Initialize OCR worker
  ↓
Screenshot 1 → Use same worker
Screenshot 2 → Use same worker
...
  ↓
Terminate worker
  ↓
Session End
```

**Benefits**:
- OCR initialization takes 2-3 seconds
- Without reuse: 582 rows × 3 seconds = ~30 minutes of initialization!
- With reuse: 3 seconds total initialization ✅

## Session Configuration Reuse

### Save Configuration for Future Sessions

After the first run, save your configuration:

```bash
? Save configuration for next time? Yes
✓ Configuration saved to .ynam-tools.json
```

Next time you run:

```bash
npm start verify

📋 Previous Configuration Found:
────────────────────────────────────────────────────────────
Sheet URL:
  https://docs.google.com/spreadsheets/d/...

Column Mapping:
  Comment text:      L
  Comment link:      N
  Screenshot URL:    O
  Link result:       Q
  Screenshot result: R
────────────────────────────────────────────────────────────

? Load this previous configuration? (Y/n)
```

Just press **Enter** to reuse everything!

## Advanced Batch Strategies

### Strategy 1: Progressive Batches

Process in small batches and increase size if stable:

```bash
# Test batch (10 rows)
npm start verify -- --rows=2-11

# Small batch (50 rows)
npm start verify -- --rows=12-61

# Medium batch (100 rows)
npm start verify -- --rows=62-161

# Large batch (250 rows)
npm start verify -- --rows=162-411
```

### Strategy 2: Parallel Processing (Advanced)

If you have multiple Chrome profiles, you can run parallel batches:

**Terminal 1**:
```bash
# Start Chrome profile 1 on port 9222
./start-chrome-debug.sh

# Process rows 2-250
npm start verify -- --rows=2-250 --port=9222
```

**Terminal 2**:
```bash
# Start Chrome profile 2 on port 9223
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9223 \
  --user-data-dir="$HOME/.chrome-debug-profile-2"

# Process rows 251-500
npm start verify -- --rows=251-500 --port=9223
```

**Warning**: Only do this if you understand port management and have multiple Facebook accounts/profiles.

### Strategy 3: Resume After Interruption

If verification is interrupted (crash, Ctrl+C, etc.), just restart:

```bash
# Run interrupted at row 123
npm start verify

# Will automatically skip rows 2-122 (already have results)
# Will resume from row 123
```

## Performance Tips

### Optimize for Speed

```bash
# Use concurrency (EXPERIMENTAL - may cause issues)
npm start verify -- --concurrency=3

# Skip screenshot verification (link verification only)
# (Don't specify screenshot columns during setup)
npm start verify

# Disable verbose mode (faster progress bar)
npm start verify
```

### Optimize for Reliability

```bash
# Sequential processing (safer)
npm start verify -- --concurrency=1

# Verbose mode (see what's happening)
npm start verify -- --verbose

# Small batches
npm start verify -- --rows=2-50
```

## Troubleshooting Batch Processing

### "Chrome disconnected mid-session"

Chrome must stay open for the entire batch. If it crashes:

1. Restart Chrome with debugging
2. Run the same command again
3. Tool will skip already-processed rows

### "Rate limited by Google Sheets API"

Google Sheets API has limits. If you hit them:

1. Wait 1-2 minutes
2. Use smaller batches: `--rows=2-100`
3. Don't run multiple sessions in parallel

### "Memory issues with large batches"

For 1000+ rows:

```bash
# Instead of processing all at once:
npm start verify  # ❌ May run out of memory

# Process in batches:
npm start verify -- --rows=2-250    # ✅
npm start verify -- --rows=251-500  # ✅
npm start verify -- --rows=501-750  # ✅
```

## Examples

### Scenario 1: New Sheet (582 rows)

```bash
# Run once to process everything
npm start verify

# Takes ~30-60 minutes depending on screenshots
# All connections reused automatically
```

### Scenario 2: Daily Updates (50 new rows/day)

```bash
# Day 1: Process initial data
npm start verify

# Day 2: Only new rows processed automatically
npm start verify  # Skips rows with existing results

# Day 3: Same
npm start verify
```

### Scenario 3: Large Sheet (2000+ rows)

```bash
# Batch 1
npm start verify -- --rows=2-500

# Batch 2
npm start verify -- --rows=501-1000

# Batch 3
npm start verify -- --rows=1001-1500

# Batch 4
npm start verify -- --rows=1501-2000
```

### Scenario 4: Re-verify Failed Rows

```bash
# First run processes all
npm start verify

# Review results, fix issues in sheet

# Re-verify only failed rows (those with 0 or ERROR)
npm start verify -- --overwrite --rows=45-67
```

## Summary

✅ **Chrome connection**: Reused automatically for entire session
✅ **Google Sheets**: Authenticated client reused for all API calls
✅ **OCR worker**: Initialized once, reused for all screenshots
✅ **Configuration**: Saved and reused across sessions
✅ **Screenshot cache**: Reused for merged rows within same session
✅ **Batch processing**: Use `--rows=X-Y` to process specific ranges
✅ **Resume capability**: Automatically skips already-processed rows

**Best Practice**: For large sheets, process in batches of 100-250 rows at a time.
