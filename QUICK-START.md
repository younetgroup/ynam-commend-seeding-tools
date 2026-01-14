# ⚡ Quick Start Guide - YNAM Comment Verification Tool

**Get up and running in 15 minutes!**

## ✅ Checklist

Before starting, make sure you have:
- [ ] Node.js 18+ installed
- [ ] Google Chrome browser
- [ ] A Google account
- [ ] A Google Sheet with comment data

---

## 🚀 5-Step Setup

### Step 1: Install Dependencies (2 minutes)

```bash
cd ynam-comment-seending-tools
npm install
```

Wait for "added XXX packages" message.

---

### Step 2: Get Google Service Account (5 minutes)

1. Go to: https://console.cloud.google.com/
2. Create new project: "YNAM Comment Tool"
3. Enable "Google Sheets API"
4. Create Service Account:
   - IAM & Admin → Service Accounts → Create
   - Name: `ynam-comment-verifier`
   - Role: Editor
5. Create Key (JSON format)
6. Download and rename to `service-account.json`
7. Move to project root folder

---

### Step 3: Share Your Sheet (1 minute)

1. Open `service-account.json`, copy the `client_email`
2. Open your Google Sheet
3. Click "Share" → Paste email → Editor access → Share

---

### Step 4: Configure Environment (1 minute)

Create `.env` file in project root:

```
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GEMINI_API_KEY=
```

*(Optional: Get Gemini API key from https://aistudio.google.com/app/apikey for screenshot verification)*

---

### Step 5: Start Chrome with Debugging (1 minute)

**Mac (Easy Way - Recommended):**
```bash
./start-chrome-debug.sh
```
The script will guide you through the process!

**Mac (Manual Way):**
```bash
# 1. Close ALL Chrome windows first
# 2. Run this command:
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-debug-profile"
```
*Note: Chrome requires a separate profile for debugging. You'll need to log into Facebook again.*

**Windows:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=9222 ^
  --user-data-dir="%USERPROFILE%\.chrome-debug-profile"
```
*Note: Chrome requires a separate profile for debugging. You'll need to log into Facebook again.*

**Verify it's working:**
```bash
curl http://localhost:9222/json/version
```
You should see Chrome version info.

**Important:**
- Close ALL Chrome windows first! (Check Activity Monitor/Task Manager)
- Log into Facebook in the new window
- Keep this window open

---

## 🎯 First Run

```bash
npm start verify
```

Answer the questions:
1. **Sheet URL**: Paste from Chrome
2. **Comment column**: e.g., `L`
3. **Link column**: e.g., `N`
4. **Screenshot column**: e.g., `O` (or press Enter to skip)
5. **Link result column**: e.g., `Q`
6. **Screenshot result**: e.g., `R` (or press Enter to skip)

The tool will now verify your comments!

At the end:
```
? Save configuration for next time? (Y/n)
```
**Press Enter to save!** ✅ You won't need to enter this again!

---

## 🔄 Every Other Run (Configuration Reuse)

The next time you run:

```bash
npm start verify
```

You'll see:

```
📋 Previous Configuration Found:
────────────────────────────────────────────────────────────
Sheet URL:
  https://docs.google.com/spreadsheets/d/YOUR_SHEET/...

Column Mapping:
  Comment text:      L
  Comment link:      N
  Screenshot URL:    O
  Link result:       Q
  Screenshot result: R
────────────────────────────────────────────────────────────

? Load this previous configuration? (Y/n)
```

**Just press Enter!** 🎉 No need to type anything!

See [CONFIGURATION-REUSE.md](./CONFIGURATION-REUSE.md) for more details.

---

## 📊 Understanding Results

Your Google Sheet will show:
- `1` = ✅ Comment verified (found on Facebook)
- `0` = ❌ Comment not found
- `ERROR` = ⚠️ Could not verify (broken link, etc.)

---

## 🔧 Common Commands

```bash
# Normal verification (all rows)
npm start verify

# Preview without changes
npm start verify -- --dry-run

# Show detailed output
npm start verify -- --verbose

# Verify specific rows only (RECOMMENDED for large sheets)
npm start verify -- --rows=10-50

# Process in batches (for 500+ rows)
npm start verify -- --rows=2-250
npm start verify -- --rows=251-500
npm start verify -- --rows=501-750

# Re-verify everything (ignore existing results)
npm start verify -- --overwrite

# Generate HTML report
npm start verify -- --report

# Watch mode (check every 5 minutes)
npm start verify -- --watch

# Watch mode (custom interval)
npm start verify -- --watch --interval=10
```

**💡 Tip**: For large sheets (500+ rows), use batch processing:
```bash
npm start verify -- --rows=2-250   # First batch
npm start verify -- --rows=251-500 # Second batch
# etc...
```
See [BATCH-PROCESSING.md](./BATCH-PROCESSING.md) for details.

---

## ⚠️ Troubleshooting

### "Chrome is not running with debugging"
**Mac users:** Run `./start-chrome-debug.sh` - it will check everything for you!
**Or:** Follow Step 5 again, make sure Chrome is completely closed first.
**Verify:** Run `curl http://localhost:9222/json/version` - should show Chrome info

### "Permission denied"
→ Follow Step 3 again, make sure you shared the sheet

### "Environment variable not set"
→ Check your `.env` file exists and has the correct format

### Lots of ERRORs
→ Make sure you're logged into Facebook in the Chrome debugging window

### Results are `0` but comments exist
→ Check that comment text in your sheet matches Facebook exactly

### Test link ###
https://docs.google.com/spreadsheets/d/18cg0Ik9a30DfY_S8-Ba-QI4VSs_iiUWu3VR2A4wT7pA/edit?gid=1616810619#gid=1616810619
---

## 💡 Pro Tips

- ✅ Save your configuration (answer `y` when prompted)
- ✅ Test with `--dry-run` first
- ✅ Use `--verbose` to see what's happening
- ✅ Keep Chrome debugging window open and logged into Facebook
- ✅ Check a few results manually to verify accuracy

---

## 🆘 Need More Help?

See the full [USER-GUIDE.md](./USER-GUIDE.md) for:
- Detailed step-by-step instructions
- Screenshots and examples
- Complete troubleshooting guide
- Advanced workflows
- Tips and best practices

---

**That's it! You're ready to verify comments! 🎉**

*For detailed documentation, see USER-GUIDE.md*
