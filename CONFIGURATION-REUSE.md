# Configuration Reuse Guide

## How Configuration Reuse Works

The tool **automatically saves and reuses** your configuration so you don't have to enter everything again!

## First Run - Initial Setup

When you run the tool for the first time:

```bash
npm start verify
```

You'll be prompted to enter:
1. ✍️ Google Sheet URL
2. ✍️ Comment text column (e.g., L)
3. ✍️ Comment link column (e.g., N)
4. ✍️ Screenshot URL column (e.g., O) - optional
5. ✍️ Link result column (e.g., Q)
6. ✍️ Screenshot result column (e.g., R) - optional

At the **end of verification**, you'll see:

```
? Save configuration for next time? (Y/n)
```

**Press Enter** to save everything! ✅

This creates a file: `.ynam-tools.json` in your project folder.

---

## Second Run - Automatic Reuse

The next time you run:

```bash
npm start verify
```

You'll see a **beautiful preview** of your saved configuration:

```
📋 Previous Configuration Found:
────────────────────────────────────────────────────────────
Sheet URL:
  https://docs.google.com/spreadsheets/d/18cg0Ik9a30DfY_S8-Ba-QI4VSs_iiUWu3VR2A4wT7pA/edit?gid=1616810619#gid=1616810619

Column Mapping:
  Comment text:      L
  Comment link:      N
  Screenshot URL:    O
  Link result:       Q
  Screenshot result: R
────────────────────────────────────────────────────────────

? Load this previous configuration? (Y/n)
```

**Just press Enter** and you're done! 🎉

No need to type anything again!

---

## What Gets Saved

Your `.ynam-tools.json` file stores:

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
  "concurrency": 1,
  "port": 9222
}
```

All your settings in one place! ✨

---

## Using a Different Sheet

If you want to verify a **different sheet** with the same column layout:

### Option 1: Use Saved Columns, New Sheet URL

```bash
npm start verify

# When prompted:
? Load this previous configuration? No  ← Type 'n'

# Then enter new sheet URL
# Column mappings will still be suggested based on saved config
```

### Option 2: Command Line Override

```bash
npm start verify -- --sheet="https://docs.google.com/spreadsheets/d/NEW_SHEET_ID/..."

# This will:
# - Use the new sheet URL
# - Still show saved column mappings as default
# - Ask if you want to use saved mappings
```

---

## Different Column Layout

If you have a sheet with **different column positions**:

```bash
npm start verify

# When prompted:
? Load this previous configuration? No  ← Type 'n'

# Then enter:
# - Sheet URL
# - New column mappings
# - Save when done
```

This will **update** `.ynam-tools.json` with the new configuration.

---

## Manual Configuration File Management

### View Current Configuration

```bash
cat .ynam-tools.json
```

### Delete Configuration (Start Fresh)

```bash
rm .ynam-tools.json
```

Next run will prompt for everything again.

### Edit Configuration Manually

```bash
# Edit with your favorite editor
nano .ynam-tools.json
# or
code .ynam-tools.json
```

**Example**:
```json
{
  "lastSheet": "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/...",
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

---

## Multiple Sheets / Projects

### Strategy 1: Different Directories

Keep different projects in different folders:

```
projects/
  client-a/
    .ynam-tools.json  ← Client A config
  client-b/
    .ynam-tools.json  ← Client B config
  client-c/
    .ynam-tools.json  ← Client C config
```

### Strategy 2: Backup & Swap

```bash
# Save current config
cp .ynam-tools.json .ynam-tools-clientA.json

# Switch to client B
cp .ynam-tools-clientB.json .ynam-tools.json

# Run verification
npm start verify
```

### Strategy 3: Use Command Line Options

Override config without saving:

```bash
# Use different sheet, keep old config saved
npm start verify -- \
  --sheet="https://docs.google.com/..." \
  --comment-col=L \
  --link-col=N \
  --link-result-col=Q

# At the end, choose "No" when asked to save
? Save configuration for next time? No
```

---

## Configuration Precedence

The tool uses this priority order:

1. **Command-line flags** (highest priority)
   ```bash
   npm start verify -- --sheet="..." --comment-col=L
   ```

2. **Saved configuration** (`.ynam-tools.json`)
   - Used if no command-line flags provided
   - Shown in preview for confirmation

3. **Interactive prompts** (fallback)
   - Used if no saved config exists
   - Used if user declines saved config

---

## Example Workflow

### Week 1 - Initial Setup
```bash
$ npm start verify

? Enter Google Sheet URL: https://docs.google.com/spreadsheets/d/...
? Comment text column (e.g., L): L
? Comment link column (e.g., N): N
? Screenshot URL column (optional): O
? Link result output column (e.g., Q): Q
? Screenshot result output column (optional): R

[Verification runs...]

? Save configuration for next time? Yes
✓ Configuration saved to .ynam-tools.json
```

### Week 2 - Just Press Enter
```bash
$ npm start verify

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

? Load this previous configuration? Yes
✓ Loading previous configuration...

[Verification starts immediately!]
```

### Week 3 - Process New Batch
```bash
$ npm start verify -- --rows=501-750

📋 Previous Configuration Found:
[Same preview as before]

? Load this previous configuration? Yes
✓ Loading previous configuration...

[Only processes rows 501-750!]
```

---

## Troubleshooting

### "No previous configuration found"

This means `.ynam-tools.json` doesn't exist yet. This is normal on first run.

**Solution**: Complete one verification and choose "Yes" when asked to save.

### Configuration doesn't load

Check if file exists:
```bash
ls -la .ynam-tools.json
```

If file exists but doesn't load, it might be corrupted:
```bash
# View contents
cat .ynam-tools.json

# Delete and start fresh
rm .ynam-tools.json
```

### Want to skip preview

Use command-line flags to bypass interactive prompts:
```bash
npm start verify -- \
  --sheet="https://..." \
  --comment-col=L \
  --link-col=N \
  --screenshot-col=O \
  --link-result-col=Q \
  --screenshot-result-col=R
```

---

## Benefits

✅ **Save Time**: No retyping long sheet URLs
✅ **Avoid Errors**: Column mappings remembered correctly
✅ **Easy Review**: See exactly what will be used before running
✅ **Flexible**: Easy to use different sheets when needed
✅ **Safe**: Review before loading (no automatic changes)

---

## Summary

1. **First run**: Enter everything, save at the end
2. **Every other run**: Just press Enter to load saved config
3. **Different sheet**: Type 'n' when prompted, enter new info
4. **Configuration file**: `.ynam-tools.json` in project folder
5. **Manual edit**: Directly edit JSON file if needed

**It's that simple!** 🚀
