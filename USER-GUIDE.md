# 📖 YNAM Comment Verification Tool - User Guide

**Easy step-by-step guide for everyone, even if you're not technical!**

## 🎯 What Does This Tool Do?

This tool automatically checks if Facebook comments really exist on Facebook. Instead of manually clicking each link and reading each comment, the tool does it for you automatically!

**It can check:**
- ✅ If a comment link leads to a real comment on Facebook
- ✅ If a screenshot shows the correct comment text
- ✅ Hundreds of comments in minutes instead of hours

**Results are automatically written back to your Google Sheet:**
- `1` = Comment verified ✅
- `0` = Comment not found ❌
- `ERROR` = Something went wrong ⚠️

---

## 📋 Table of Contents

1. [Before You Start (Prerequisites)](#-before-you-start-prerequisites)
2. [Step 1: Install Node.js](#-step-1-install-nodejs)
3. [Step 2: Download the Tool](#-step-2-download-the-tool)
4. [Step 3: Set Up Google Sheets Access](#-step-3-set-up-google-sheets-access)
5. [Step 4: Get Gemini API Key (Optional)](#-step-4-get-gemini-api-key-optional)
6. [Step 5: Configure the Tool](#-step-5-configure-the-tool)
7. [Step 6: Prepare Your Google Sheet](#-step-6-prepare-your-google-sheet)
8. [Step 7: Start Chrome with Debugging](#-step-7-start-chrome-with-debugging)
9. [Step 8: Run the Tool](#-step-8-run-the-tool)
10. [Common Workflows](#-common-workflows)
11. [Troubleshooting](#-troubleshooting)

---

## 📦 Before You Start (Prerequisites)

You'll need:
- A computer (Windows, Mac, or Linux)
- Internet connection
- Google Chrome browser
- A Google account
- A Google Sheet with comment data
- About 30-45 minutes for first-time setup

---

## 💻 Step 1: Install Node.js

Node.js is software that lets you run this tool. Think of it like Microsoft Word - you need it installed to open documents.

### For Windows:

1. Go to: https://nodejs.org/
2. Click the big green button that says **"Download Node.js (LTS)"**
3. Open the downloaded file (it will be something like `node-v18.x.x.msi`)
4. Click "Next" through all the steps (keep all default settings)
5. Click "Finish" when done

### For Mac:

1. Go to: https://nodejs.org/
2. Click the big green button that says **"Download Node.js (LTS)"**
3. Open the downloaded file (it will be something like `node-v18.x.x.pkg`)
4. Click "Continue" through all the steps
5. Click "Install" (you may need to enter your Mac password)

### Verify Installation:

**Windows:**
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. Type: `node --version`
4. You should see something like `v18.19.0`

**Mac:**
1. Press `Command + Space`
2. Type `terminal` and press Enter
3. Type: `node --version`
4. You should see something like `v18.19.0`

✅ If you see a version number, Node.js is installed correctly!

---

## 📥 Step 2: Download the Tool

### Option A: If you have the code (recommended):

1. Download the project folder (you probably already have this!)
2. Unzip if needed
3. Open Terminal (Mac) or Command Prompt (Windows)
4. Navigate to the folder:

```bash
cd path/to/ynam-comment-seending-tools
```

**How to find the path:**
- **Windows**: Right-click the folder → "Copy as path"
- **Mac**: Drag the folder into Terminal (it will show the path)

5. Install required packages (this downloads everything the tool needs):

```bash
npm install
```

This might take 2-3 minutes. You'll see lots of text scrolling - that's normal!

✅ When you see "added XXX packages", installation is complete!

---

## 🔐 Step 3: Set Up Google Sheets Access

The tool needs permission to read and write to your Google Sheet. Here's how to set it up:

### 3.1: Create a Google Cloud Project

1. Go to: https://console.cloud.google.com/
2. Sign in with your Google account
3. Click **"Select a project"** at the top
4. Click **"NEW PROJECT"** button
5. Enter a project name: `YNAM Comment Tool`
6. Click **"CREATE"**
7. Wait 10-20 seconds for the project to be created

### 3.2: Enable Google Sheets API

1. In the search bar at the top, type: `Google Sheets API`
2. Click on **"Google Sheets API"** in the results
3. Click the blue **"ENABLE"** button
4. Wait for it to enable (about 5 seconds)

### 3.3: Create a Service Account

A "service account" is like a robot user that the tool uses to access your sheets.

1. Click the **☰ menu** (three horizontal lines) at the top left
2. Go to: **"IAM & Admin"** → **"Service Accounts"**
3. Click **"+ CREATE SERVICE ACCOUNT"** at the top
4. Fill in:
   - **Service account name**: `ynam-comment-verifier`
   - **Service account ID**: (auto-filled, leave as is)
   - **Description**: `Service account for comment verification`
5. Click **"CREATE AND CONTINUE"**
6. For "Grant this service account access to project":
   - Click **"Select a role"**
   - Choose **"Basic"** → **"Editor"**
   - Click **"CONTINUE"**
7. Click **"DONE"** (skip the third step)

### 3.4: Download the Service Account Key

1. You should see your new service account in the list
2. Click on the **email address** of the service account (looks like `ynam-comment-verifier@...`)
3. Click on the **"KEYS"** tab at the top
4. Click **"ADD KEY"** → **"Create new key"**
5. Choose **"JSON"** format
6. Click **"CREATE"**
7. A file will download automatically (keep it safe!)

**Important:** This file is like a password! Keep it secure!

### 3.5: Move the Key File

1. Rename the downloaded file to: `service-account.json`
2. Move it to your project folder (the same folder with `package.json`)

```
ynam-comment-seending-tools/
├── service-account.json  ← Your file goes here
├── package.json
├── src/
└── ...
```

### 3.6: Share Your Google Sheet

The last step is giving your service account access to your Google Sheet:

1. Open the `service-account.json` file with Notepad (Windows) or TextEdit (Mac)
2. Find the line that says `"client_email":`
3. Copy the email address (it looks like: `ynam-comment-verifier@...iam.gserviceaccount.com`)
4. Open your Google Sheet in Chrome
5. Click the **"Share"** button (top right)
6. Paste the service account email
7. Make sure it has **"Editor"** access
8. **Uncheck** "Notify people" (it's a robot, not a person!)
9. Click **"Share"**

✅ Your sheet is now accessible by the tool!

---

## 🤖 Step 4: Get Gemini API Key (Optional)

This step is **optional** but recommended for screenshot verification. Gemini AI helps verify screenshots when regular text reading isn't accurate enough.

**When do you need this?**
- If you want to verify screenshots of comments
- If OCR (text reading) doesn't work well on your images

**If you only verify links (not screenshots), you can skip this step!**

### 4.1: Get Your API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select your project: `YNAM Comment Tool` (from Step 3)
5. Click **"Create API Key in existing project"**
6. Your API key will appear - it looks like: `AIzaSyD...`
7. Click the **📋 copy icon** to copy it

**Important:** This is also like a password - keep it secure!

---

## ⚙️ Step 5: Configure the Tool

Now we'll tell the tool where to find your files:

### 5.1: Create Environment File

1. In your project folder, create a new file called `.env`
   - **Windows**: Right-click in folder → New → Text Document → Name it `.env` (delete the .txt)
   - **Mac**: In Terminal, type: `touch .env`

2. Open `.env` with Notepad (Windows) or TextEdit (Mac)

3. Add these two lines:

```
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GEMINI_API_KEY=your-api-key-here
```

4. Replace `your-api-key-here` with your actual Gemini API key from Step 4
   - **If you skipped Step 4**: Just leave it as `GEMINI_API_KEY=` (empty)

5. Save the file

**Your `.env` file should look like this:**

```
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GEMINI_API_KEY=AIzaSyDxxxxxxxxxxxxxxxxxxxxxxxx
```

✅ Configuration complete!

---

## 📊 Step 6: Prepare Your Google Sheet

Your Google Sheet needs specific columns for the tool to work:

### Minimum Required Columns:

| Column | What It Contains | Example |
|--------|-----------------|---------|
| **Comment Text** | The actual comment content | "Great product!" |
| **Comment Link** | Facebook link to the comment | https://facebook.com/... |
| **Link Result** | Where tool writes results | (empty - tool fills this) |

### Optional Columns (for screenshot verification):

| Column | What It Contains | Example |
|--------|-----------------|---------|
| **Screenshot URL** | Link to screenshot image | https://imgur.com/abc123.jpg |
| **Screenshot Result** | Screenshot verification result | (empty - tool fills this) |

### Example Sheet Layout:

```
| A    | B          | L (Comment) | N (Link)           | O (Screenshot)    | Q (Link Result) | R (Screenshot Result) |
|------|------------|-------------|--------------------|--------------------|-----------------|----------------------|
| Row1 | Header     | Comment     | Comment Link       | Screenshot URL     | Link Result     | Screenshot Result    |
| Row2 | Data       | Hello!      | https://fb.com/... | https://img.com... |                 |                      |
| Row3 | Data       | Nice work!  | https://fb.com/... |                    |                 |                      |
```

**Important Notes:**
- Row 1 should have headers (labels)
- Data starts from Row 2
- The tool will write `1`, `0`, or `ERROR` in the result columns
- You can use any column letters (A-Z, AA-ZZ, etc.)

✅ Sheet is ready!

---

## 🌐 Step 7: Start Chrome with Debugging

The tool needs to connect to Chrome to read Facebook pages. Here's how:

### ⚠️ IMPORTANT: Close ALL Chrome Windows First!

Before starting, make sure Chrome is completely closed:
- Close all Chrome windows
- Check your taskbar/dock - Chrome should not be running

### For Windows:

1. Press `Windows Key + R`
2. Copy and paste this command:

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

3. Press Enter
4. A new Chrome window will open

### For Mac:

1. Press `Command + Space`
2. Type `terminal` and press Enter
3. Copy and paste this command:

```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

4. Press Enter
5. A new Chrome window will open

### ✅ Verify It's Working:

1. In the Chrome window that opened, go to: `http://localhost:9222`
2. You should see a page with a list of tabs
3. If you see this, Chrome debugging is working! ✅

### 🔐 Log Into Facebook:

**IMPORTANT:** In this special Chrome window:
1. Go to Facebook.com
2. Log in with your Facebook account
3. Make sure you stay logged in
4. **Keep this Chrome window open** while using the tool

**Why?** The tool needs you to be logged in to Facebook to read comments!

---

## 🚀 Step 8: Run the Tool

You're ready! Let's run your first verification:

### 8.1: Open Terminal/Command Prompt

**Windows:**
1. Press `Windows Key + R`
2. Type `cmd` and press Enter
3. Navigate to your project folder:
   ```
   cd C:\path\to\ynam-comment-seending-tools
   ```

**Mac:**
1. Press `Command + Space`
2. Type `terminal` and press Enter
3. Navigate to your project folder:
   ```
   cd /path/to/ynam-comment-seending-tools
   ```

### 8.2: Start the Tool

Type this command and press Enter:

```bash
npm start
```

### 8.3: Answer the Questions

The tool will ask you some questions:

#### Question 1: "Enter Google Sheet URL:"
- Copy your Google Sheet URL from Chrome
- It looks like: `https://docs.google.com/spreadsheets/d/ABC123.../edit`
- Paste it and press Enter

#### Question 2: "Comment text column (e.g., L):"
- Type the letter of the column with comment text
- Example: `L`
- Press Enter

#### Question 3: "Comment link column (e.g., N):"
- Type the letter of the column with Facebook links
- Example: `N`
- Press Enter

#### Question 4: "Screenshot URL column (optional, press Enter to skip):"
- Type the column letter if you have screenshots
- Example: `O`
- Or just press Enter to skip

#### Question 5: "Link result output column (e.g., Q):"
- Type where you want link results written
- Example: `Q`
- Press Enter

#### Question 6: "Screenshot result output column (optional):"
- Type where you want screenshot results
- Example: `R`
- Or press Enter to skip

#### Question 7: "Save configuration for next time?"
- Type `y` and press Enter
- This saves your answers so you don't have to type them again!

### 8.4: Watch It Work!

The tool will now:
1. Show you a progress bar
2. Process each row one by one
3. Write results back to your sheet
4. Show you a summary when done

**Example Output:**

```
ℹ Reading records from Google Sheet...
ℹ Found 50 records to verify
Progress |████████████████████| 100% | 50/50 records

──────────────────────────────────────────────────
Verification Summary:

Link Verification:
  ✓ Passed: 42
  ✗ Failed: 6
  ⚠ Errors: 2
  Total: 50
──────────────────────────────────────────────────

✓ Verification complete!
```

### 8.5: Check Your Results

Open your Google Sheet and look at the result columns:
- `1` = Comment found! ✅
- `0` = Comment not found ❌
- `ERROR` = Something went wrong (link broken, page not loading, etc.) ⚠️

---

## 📚 Common Workflows

### Workflow 1: Quick Verification (Most Common)

**When to use:** You have a new batch of comments to verify

1. Make sure Chrome is running with debugging (Step 7)
2. Make sure you're logged into Facebook in that Chrome window
3. Run: `npm start`
4. The tool will remember your settings!
5. Just confirm and press Enter
6. Wait for results

**Time:** 100 comments = ~15 minutes

---

### Workflow 2: Re-verify Failed Comments

**When to use:** Some comments failed (result = `0`), and you want to check again

1. Run: `npm start -- --overwrite`
2. This will re-check ALL comments, even ones that already have results

**Or, to re-verify specific rows only:**

```bash
npm start -- --rows=10-20
```

This checks only rows 10 through 20.

---

### Workflow 3: Preview Without Changes (Dry Run)

**When to use:** You want to test your settings without actually writing results

1. Run: `npm start -- --dry-run`
2. The tool shows you what it will do, but doesn't change anything
3. Great for testing!

**Example Output:**

```
ℹ Running in dry-run mode (no changes will be made)

Configuration:
  Sheet URL: https://docs.google.com/spreadsheets/d/...
  Column Mapping:
    Comment: L
    Link: N
    Link Result: Q

✓ Dry-run complete (no records processed)
```

---

### Workflow 4: Watch Mode (Continuous Verification)

**When to use:** You want the tool to keep running and check for new comments automatically

1. Run: `npm start -- --watch`
2. The tool will check for new rows every 5 minutes
3. Press `Ctrl+C` when you want to stop

**To change the check interval:**

```bash
npm start -- --watch --interval=10
```

This checks every 10 minutes instead of 5.

**Great for:** Live campaigns where new comments arrive continuously!

---

### Workflow 5: Generate HTML Report

**When to use:** You want a nice-looking report to share with your team

1. Run: `npm start -- --report`
2. After verification, an HTML file is created
3. Open the file in Chrome to see your report
4. It includes:
   - Summary statistics
   - Pretty charts
   - Detailed results table
   - Professional formatting

**Example:** `verification-report-1705234567890.html`

You can email this file or print it!

---

### Workflow 6: Verify Specific Rows Only

**When to use:** You only want to check rows 20-50, not all rows

```bash
npm start -- --rows=20-50
```

**When to use:** You want to see detailed status for each row as it's processed

```bash
npm start -- --verbose
```

**Example Output:**

```
Row 2: Link PASS - Great product, highly recommend...
Row 3: Link FAIL - This is amazing...
Row 4: Link ERROR - Wonderful service...
```

---

## 🔧 Troubleshooting

### Problem: "Chrome is not running with debugging enabled"

**Solution:**
1. Close ALL Chrome windows
2. Follow Step 7 again to start Chrome with debugging
3. Make sure you use the EXACT command (copy and paste it)

---

### Problem: "GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set"

**Solution:**
1. Check that you have a `.env` file in your project folder
2. Check that it contains: `GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json`
3. Check that `service-account.json` exists in the same folder
4. Make sure there are no extra spaces

---

### Problem: "The caller does not have permission"

**Solution:**
1. Open your Google Sheet
2. Click "Share" button
3. Make sure the service account email is in the list
4. Make sure it has "Editor" access
5. The service account email is in `service-account.json` (look for `"client_email"`)

---

### Problem: "Failed to verify link" or lots of ERRORs

**Possible causes and solutions:**

**Cause 1: Not logged into Facebook**
- Solution: In the Chrome debugging window, go to Facebook and log in

**Cause 2: Facebook link is broken or deleted**
- Solution: This is actually correct! The comment really doesn't exist.
- Result: `0` (failed) is the correct result

**Cause 3: Facebook is blocking automated access**
- Solution: Wait a few minutes and try again
- Solution: Reduce speed with `--concurrency=1` (already the default)

**Cause 4: Internet connection is slow**
- Solution: Check your internet connection
- Solution: Try again when connection is better

---

### Problem: "Command not found: npm"

**Solution:**
1. Node.js is not installed correctly
2. Go back to Step 1 and reinstall Node.js
3. Close and reopen Terminal/Command Prompt after installing

---

### Problem: Tool is very slow

**Normal speed:** ~9 seconds per comment
- 100 comments = ~15 minutes
- 500 comments = ~75 minutes

**If it's slower:**
1. Check your internet connection
2. Facebook pages might be loading slowly
3. Try running at a different time of day

**If you want it faster:**
You can't make it much faster because:
- Facebook needs time to load each page
- Going too fast might trigger Facebook's anti-bot protection

---

### Problem: Screenshot verification always returns ERROR

**Possible causes:**

**Cause 1: GEMINI_API_KEY not set**
- Solution: Complete Step 4 to get an API key
- Or: Screenshot verification requires AI, so it won't work without the key

**Cause 2: Screenshot link is broken**
- Solution: Check if you can open the screenshot URL in Chrome
- If you can't open it, the tool can't either

**Cause 3: Screenshot is not an image**
- Solution: Make sure the URL ends with .jpg, .png, .gif, etc.

---

### Problem: "Rate limit exceeded" from Gemini API

**Solution:**
The tool has built-in rate limiting, but if you hit the limit:
1. Wait 1 minute
2. Run the tool again (it will resume where it left off)
3. Or: Verify fewer comments at a time using `--rows=1-50`

---

### Problem: Results show `0` but comment definitely exists

**Possible causes:**

**Cause 1: Comment text doesn't match exactly**
- The tool uses "fuzzy" matching (ignores capitalization, punctuation)
- But if the words are very different, it will fail
- Solution: Check if the comment text in your sheet matches Facebook

**Cause 2: Comment is on a private post**
- You must be logged in and have permission to see the post
- Solution: In Chrome debugging window, make sure you can see the comment

**Cause 3: Facebook page layout changed**
- Solution: Update to the latest version of the tool

---

## 💡 Tips for Best Results

### ✅ DO:

1. **Keep Chrome debugging window open** while tool runs
2. **Stay logged into Facebook** in that window
3. **Save your configuration** when prompted (saves time next time!)
4. **Use dry-run mode** first to test your settings
5. **Check a few results manually** to make sure everything works
6. **Use --verbose** to see what's happening in detail
7. **Generate reports** to share with your team

### ❌ DON'T:

1. **Don't close Chrome** while the tool is running
2. **Don't log out of Facebook** in the debugging window
3. **Don't use regular Chrome** - must use the debugging window
4. **Don't verify too fast** - respect Facebook's limits
5. **Don't share your API keys** or service account file
6. **Don't run multiple instances** of the tool at the same time

---

## 🆘 Getting Help

### Still having problems?

1. **Check this guide again** - the answer is usually here!
2. **Look at the error message carefully** - it often tells you what's wrong
3. **Try the troubleshooting section** for your specific error
4. **Run with --verbose** to see more details:
   ```bash
   npm start -- --verbose
   ```

### Error Messages Explained:

| Error Message | What It Means | What To Do |
|--------------|---------------|------------|
| "Chrome is not running" | Chrome debugging not started | Follow Step 7 |
| "Permission denied" | Service account can't access sheet | Follow Step 3.6 (Share sheet) |
| "API key" or "credentials" | Missing .env configuration | Follow Step 5 |
| "Invalid URL" | Sheet URL is wrong | Copy the full URL from Chrome |
| "Network error" | Internet connection problem | Check your internet |

---

## 📝 Quick Reference Card

**Print this out and keep it handy!**

### Start Chrome with Debugging:

**Windows:**
```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Mac:**
```
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

### Common Commands:

| Command | What It Does |
|---------|-------------|
| `npm start` | Run the tool (interactive) |
| `npm start -- --dry-run` | Preview without changes |
| `npm start -- --verbose` | Show detailed output |
| `npm start -- --rows=10-50` | Verify rows 10-50 only |
| `npm start -- --overwrite` | Re-verify all comments |
| `npm start -- --watch` | Continuous mode (checks every 5 min) |
| `npm start -- --report` | Generate HTML report |

### File Checklist:

- ✅ `service-account.json` (in project folder)
- ✅ `.env` file (with API keys)
- ✅ Google Sheet (shared with service account)
- ✅ Chrome running with debugging
- ✅ Logged into Facebook

### Result Codes:

- `1` = ✅ Verified (comment found)
- `0` = ❌ Failed (comment not found)
- `ERROR` = ⚠️ Error (couldn't check)

---

## 🎓 You're Ready!

Congratulations! You now know how to:
- ✅ Install and set up the tool
- ✅ Configure Google Sheets access
- ✅ Run verifications
- ✅ Use advanced features
- ✅ Troubleshoot common problems

**Remember:** The first time takes longer because of setup. After that, it's just:
1. Start Chrome with debugging
2. Run `npm start`
3. Press Enter a few times
4. Wait for results!

**Happy verifying! 🎉**

---

## 📞 Support

If you need help:
1. Re-read this guide carefully
2. Check the [Troubleshooting](#-troubleshooting) section
3. Try with `--verbose` to see what's happening
4. Make sure you followed ALL steps (especially Steps 3, 5, and 7!)

**Most problems are caused by:**
- Skipping a step in the guide
- Chrome not running with debugging
- Not being logged into Facebook
- Service account not having access to the sheet

---

*Last updated: January 2026*
*Tool version: 1.0.0*
