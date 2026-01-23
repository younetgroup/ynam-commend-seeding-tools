# YNAM Paid Buzz Content Generator Specification

## Overview

**ynam-tools paidbuzz** is a content generation command that automatically creates social media comments for the MSD HPV awareness campaign ("Paid Buzz"). It reads Medical Claims from a Google Sheet, generates multiple persona-appropriate comments following strict guidelines, and writes results back to the sheet.

### Primary Use Case
Generate authentic, diverse Vietnamese comments based on:
1. Medical Claims (input from Google Sheet)
2. Quantity specification per claim
3. Cohort targeting (persona groups)
4. Content style guidelines (5 phong cách)
5. Strict compliance rules (brand mention, disclaimer, banned words)

---

## Requirements Summary

### Input/Output Columns
```
Sheet at: [User-provided Google Sheet URL]
- Column D (default): Medical Claim - The health claim/message to base comments on
- Column G (default): Quantity of content - How many comments to generate per claim
- Column M (default): Output - STT - Persona (e.g., "1 - YAW", "2 - MAW")
- Column N (default): Output - Phong cách (content style used)
- Column O (default): Output - Hướng chính bình luận (main comment direction)
- Column P (default): Output - Nội dung bình luận (full comment content)

Optional:
- Cohort column: -1 (random) by default, or specified cohorts separated by ","
```

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ / TypeScript |
| AI/LLM | Gemini API (@google/generative-ai) |
| Sheet Access | Google Sheets API (Service Account) |
| CLI Framework | Inquirer.js (interactive prompts) |
| CLI Parsing | Commander.js |
| Progress Display | cli-progress |
| Architecture | Command pattern (extends existing base-command) |

### Environment Variables
```bash
# Required
GEMINI_API_KEY=<your-gemini-api-key>
GOOGLE_SERVICE_ACCOUNT_PATH=<path-to-service-account.json>

# Optional (with defaults)
GEMINI_DEFAULT_MODEL=gemini-1.5-flash  # Model for both generation and validation
```

---

## Architecture

### New Files Structure
```
src/
├── commands/
│   └── paidbuzz.ts              # Paid Buzz content generation command
├── services/
│   ├── content-generator.ts      # LLM-based content generation logic
│   └── content-validator.ts      # Validation and refinement logic
├── prompts/                      # External prompt template files
│   ├── generation-prompt.md      # Main generation prompt template
│   ├── validation-prompt.md      # Validation/refinement prompt template
│   ├── similarity-prompt.md      # Duplicate detection prompt template
│   ├── cohort-guidelines.md      # Cohort definitions and examples
│   ├── style-guidelines.md       # 5 Phong cách definitions
│   ├── comment-formula.md        # 4-part comment structure rules
│   └── brand-keywords.md         # Brand mention keywords and rules
└── types/
    └── paidbuzz.ts               # TypeScript interfaces for paidbuzz
```

### Service Responsibilities

**ContentGeneratorService**
- Load prompt templates from `/prompts/` directory
- Construct generation prompts with context (medical claim, cohort, style, length)
- Call Gemini API for content generation
- Parse structured output (persona, style, direction, content)
- Handle batch-aware generation for diversity

**ContentValidatorService**
- Validate generated content against rules:
  - Banned words check (tiêm, chích, forbidden diseases)
  - Brand mention presence (vaccine + healthy lifestyle + screening)
  - Disclaimer presence and correctness
  - Icon usage per cohort (required for YAW/MAW/MWT, forbidden for MALE)
  - Word count within target range (±15% tolerance)
- Call Gemini API for validation/refinement
- Detect duplicate narrative frameworks via LLM comparison

**SheetService (existing, extended)**
- Read claims with column mapping
- Insert rows for quantity > 1 output
- Write results per-claim after generation

---

## Content Generation Flow

### Hybrid Approach: Generation + Validation

```
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 1: BATCH PLANNING                                             │
├─────────────────────────────────────────────────────────────────────┤
│ 1. Load all rows from sheet                                         │
│ 2. Calculate total comments needed (sum of quantities)              │
│ 3. Assign length cycle: Short → Medium → Long → repeat (global)     │
│ 4. For each row, determine cohort (random if -1)                    │
│ 5. LLM analyzes Medical Claims → selects appropriate Phong cách     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 2: GENERATION (per claim)                                     │
├─────────────────────────────────────────────────────────────────────┤
│ For each claim:                                                     │
│   1. Build context: claim, cohorts, styles, lengths, prev comments  │
│   2. Call Gemini API with generation prompt                         │
│   3. Parse output: [persona, style, direction, content] × quantity  │
│   4. Proceed to validation                                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 3: VALIDATION (per comment, up to 3 attempts)                 │
├─────────────────────────────────────────────────────────────────────┤
│ For each generated comment:                                         │
│   1. Check banned words (programmatic)                              │
│   2. Check brand mention presence (programmatic)                    │
│   3. Check disclaimer presence (programmatic, LLM fixes if needed)  │
│   4. Check icon usage per cohort (programmatic)                     │
│   5. Check word count ±15% of target (programmatic)                 │
│   6. If any fail → regenerate with specific feedback (max 3 tries)  │
│   7. After 3 failures → mark as [MANUAL REVIEW]                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 4: SIMILARITY CHECK (per batch)                               │
├─────────────────────────────────────────────────────────────────────┤
│ After generating all comments for a claim:                          │
│   1. Send batch to LLM for narrative framework similarity analysis  │
│   2. If duplicates detected → auto-regenerate flagged comments      │
│   3. Re-validate regenerated comments                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PHASE 5: WRITE TO SHEET (per claim)                                 │
├─────────────────────────────────────────────────────────────────────┤
│ For each claim batch:                                               │
│   1. Write first comment to source row (overwrite M, N, O, P)       │
│   2. Insert additional rows below for comments 2+                   │
│   3. Write remaining comments to inserted rows                      │
│   4. Update progress display                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Interactive TUI Column Selection
```
? Sheet URL: https://docs.google.com/spreadsheets/d/...

Fetching sheet preview...

   | A    | B      | C    | D                    | G  | M        | N          | O              | P        |
---|------|--------|------|----------------------|----|----------|------------|----------------|----------|
 1 | Date | Author | Type | Medical Claim        | Qty| STT-Pers | Phong cách | Hướng chính    | Nội dung |
 2 | ...  | ...    | ...  | Nhiễm HPV phổ biến...| 5  |          |            |                |          |
 3 | ...  | ...    | ...  | 40.3% người VN...    | 3  |          |            |                |          |

? Column containing Medical Claim: D (default: D)
? Column containing Quantity: G (default: G)
? Column for Cohort (optional, -1 for random): (default: -1)
? Output column for STT - Persona: M (default: M)
? Output column for Phong cách: N (default: N)
? Output column for Hướng chính: O (default: O)
? Output column for Nội dung: P (default: P)
```

### 2. Cohort Distribution
- **Random (default)**: When Cohort column is -1 or not specified, randomly assign from 5 cohorts:
  - MASS (Đại chúng)
  - MWT (Mom With Teen)
  - MAW (Middle Aged Woman)
  - YAW (Young Adult Woman)
  - MALE (Nam giới)
- **Specified**: User can specify cohorts as comma-separated list (e.g., "MASS, MWT, YAW")

### 3. Content Style Selection (LLM-Derived)
The LLM analyzes the Medical Claim sentiment and selects appropriate style:
1. **Người Am Hiểu** (The Savvy Researcher) - Data-driven, objective
2. **Người Kể Chuyện Đồng Cảm** (The Empathetic Storyteller) - Emotional, personal
3. **Người Giải Quyết Vấn Đề** (The Problem Solver) - Practical, advisory
4. **Người Truyền Cảm Hứng Tích Cực** (The Positive Encourager) - Optimistic, empowering
5. **Người Phá Vỡ Định Kiến** (The Myth Buster) - Direct, corrective

### 4. Comment Length Cycling (Global Row Order)
```
Row 1, Comment 1: Ngắn (52-70 words)
Row 1, Comment 2: Trung bình (70-90 words)
Row 1, Comment 3: Dài (90-120 words)
Row 2, Comment 1: Ngắn (52-70 words)
Row 2, Comment 2: Trung bình (70-90 words)
... continues cycling
```

### 5. Validation Rules (Strict)

| Rule | Check Type | Action on Failure |
|------|------------|-------------------|
| Banned words (tiêm, chích) | Programmatic | Regenerate |
| Forbidden diseases | Programmatic | Regenerate |
| Brand mention presence | Programmatic | Regenerate |
| Disclaimer correctness | LLM validation | LLM fixes or regenerate |
| Icon usage (per cohort) | Programmatic | Regenerate |
| Word count (±15%) | Programmatic | Regenerate |
| Narrative framework duplicate | LLM comparison | Regenerate flagged |

### 6. Multi-Row Output Handling
When Quantity > 1:
1. First comment overwrites source row (columns M, N, O, P)
2. Additional comments are inserted as new rows immediately below
3. New rows copy claim data but have their own generated content

### 7. Dry Run Mode
```bash
npm start paidbuzz -- --dry-run
```
Output shows what would be generated without writing to sheet:
```
DRY RUN MODE - No changes will be made

Sheet: https://docs.google.com/spreadsheets/d/...
Rows to process: 10
Total comments to generate: 45

Preview of first claim:
  Medical Claim: "Nhiễm HPV sinh dục là bệnh lây truyền..."
  Quantity: 5
  Cohorts: Random

  Generated Comments:
  [1 - YAW] Phong cách: Người Kể Chuyện Đồng Cảm
  Hướng chính: Chia sẻ trải nghiệm cá nhân về nhận thức HPV
  Nội dung: "Mình cũng từng nghĩ HPV là chuyện xa vời..."

  [2 - MAW] ...
```

### 8. Watch Mode
```bash
npm start paidbuzz -- --watch --interval=5
```
- Poll sheet every N minutes for new rows (empty output columns)
- Automatically process new rows
- Stop with Ctrl+C

### 9. Progress Display (Detailed)
```
Processing claims...

Claim 1/10: "Nhiễm HPV sinh dục..."
  Comment 1/5: Generating... ✓ Validating... ✓ Done
  Comment 2/5: Generating... ✓ Validating... ✗ Regenerating... ✓ Done
  Comment 3/5: Generating... ✓ Validating... ✓ Done
  Comment 4/5: Generating... ✓ Validating... ✓ Done
  Comment 5/5: Generating... ✓ Validating... ✓ Done
  Similarity check... ✓ No duplicates
  Writing to sheet... ✓

Claim 2/10: "40.3% người tham gia khảo sát..."
  ...
```

---

## CLI Interface

### Commands
```bash
# Interactive mode (recommended)
npm start paidbuzz

# With options
npm start paidbuzz -- \
  --sheet="https://docs.google.com/spreadsheets/d/..." \
  --claim-col=D \
  --quantity-col=G \
  --cohort-col=H \
  --persona-result-col=M \
  --style-result-col=N \
  --direction-result-col=O \
  --content-result-col=P \
  --rows=1-100 \
  --verbose

# Dry run
npm start paidbuzz -- --dry-run

# Watch mode
npm start paidbuzz -- --watch --interval=5
```

### Flags
| Flag | Description | Default |
|------|-------------|---------|
| `--sheet` | Google Sheet URL | (prompt) |
| `--claim-col` | Column letter for Medical Claim | D |
| `--quantity-col` | Column letter for quantity | G |
| `--cohort-col` | Column for cohort (-1 for random) | -1 |
| `--persona-result-col` | Column to write STT - Persona | M |
| `--style-result-col` | Column to write Phong cách | N |
| `--direction-result-col` | Column to write Hướng chính | O |
| `--content-result-col` | Column to write Nội dung | P |
| `--rows` | Row range to process (e.g., "2-50") | all |
| `--dry-run` | Preview generation without writing | false |
| `--verbose` | Show detailed per-comment status | false |
| `--overwrite` | Overwrite rows with existing results | false |
| `--watch` | Enable watch mode | false |
| `--interval` | Watch mode poll interval (minutes) | 5 |

---

## Output Format

### Terminal Summary (Always shown)
```
═══════════════════════════════════════════════════════════════
  CONTENT GENERATION COMPLETE
═══════════════════════════════════════════════════════════════
  Claims processed:        10
  Comments generated:      45
  Validation passes:       42
  Regenerations:           8
  Manual review needed:    3

  Cohort distribution:
    MASS: 9  |  MWT: 10  |  MAW: 8  |  YAW: 12  |  MALE: 6

  Style distribution:
    Am Hiểu: 12  |  Đồng Cảm: 8  |  Giải Quyết: 10  |  Tích Cực: 9  |  Phá Vỡ: 6

  Time elapsed: 5m 23s
  Results written to sheet: ✓
═══════════════════════════════════════════════════════════════
```

---

## Prompt Template Files

The system loads prompt templates from external files to allow updates without code changes.

### `/prompts/generation-prompt.md`
Contains the main generation prompt with placeholders:
- `{{MEDICAL_CLAIM}}` - The input claim
- `{{QUANTITY}}` - Number of comments to generate
- `{{COHORTS}}` - Assigned cohorts for this batch
- `{{LENGTHS}}` - Length targets for each comment
- `{{PREVIOUS_COMMENTS}}` - Recent comments for diversity awareness
- `{{COHORT_GUIDELINES}}` - Loaded from cohort-guidelines.md
- `{{STYLE_GUIDELINES}}` - Loaded from style-guidelines.md
- `{{COMMENT_FORMULA}}` - Loaded from comment-formula.md
- `{{BRAND_KEYWORDS}}` - Loaded from brand-keywords.md

### `/prompts/validation-prompt.md`
Contains validation/refinement instructions for checking:
- Compliance with all rules
- Disclaimer correctness
- Suggestions for fixes

### `/prompts/similarity-prompt.md`
Contains instructions for detecting duplicate narrative frameworks.

---

## Error Handling

### Retry Strategy
- **API calls**: 3 retries with exponential backoff (1s, 2s, 4s, max 10s)
- **Validation failures**: Up to 3 regeneration attempts per comment
- **After max retries**: Mark as `[MANUAL REVIEW]` and continue

### Error Codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Configuration error (API key, env vars) |
| 3 | Google Sheets authentication failed |
| 4 | Invalid sheet URL or permissions |
| 5 | Gemini API error |

---

## Configuration Persistence

After first successful run:
```
? Save this configuration for future use? (Y/n)
```

Saves to `.ynam-tools.json`:
```json
{
  "paidbuzz": {
    "lastSheet": "https://docs.google.com/spreadsheets/d/...",
    "columnMapping": {
      "claim": "D",
      "quantity": "G",
      "cohort": "-1",
      "personaResult": "M",
      "styleResult": "N",
      "directionResult": "O",
      "contentResult": "P"
    }
  }
}
```

---

## Security Considerations

- Service account JSON should not be committed to git
- API keys stored in environment variables, not code
- No sensitive data logged in verbose mode
- Prompt templates should be reviewed before use

---

## Validation Checklist

### Programmatic Checks
1. **Banned Words**: `tiêm`, `chích`, `ung thư dương vật`, `ung thư hầu họng`, `ung thư vòm họng`
2. **Brand Mention**: Must include at least one keyword from approved list AND mention vaccine + healthy lifestyle + screening for women
3. **Disclaimer**: Must contain exact disclaimer text (can be at end)
4. **Icons**: Required for YAW/MAW/MWT, forbidden for MALE
5. **Word Count**: Within ±15% of target (Ngắn: 44-80, TB: 60-103, Dài: 77-138)

### LLM-Based Checks
1. **Disclaimer Validation**: Verify disclaimer is correct and well-placed
2. **Narrative Similarity**: Detect duplicate "khung sườn ý tưởng" across batch

---

## Future Extensibility

This command follows the existing command pattern, allowing future additions:
- `npm start earnedbuzz` - Similar generator for Earned Buzz campaign
- `npm start analyze` - Analyze existing comments for compliance
- `npm start translate` - Translate generated content to other languages

---

# Desktop Application Specification

## Overview

**YouNetAM Spreadsheet Tool** is an Electron-based desktop application that provides a GUI wrapper for the CLI tools, making them accessible to non-technical users. The application includes the existing verification functionality plus new duplication detection capabilities.

### Application Name
**YouNetAM Spreadsheet Tool**

### Logo
`docs/younet-logo.png`

---

## Architecture

### Technology Stack
| Component | Technology |
|-----------|------------|
| Desktop Framework | Electron |
| Frontend | HTML/CSS/JavaScript (or React) |
| Backend | Node.js (reuse existing CLI services) |
| IPC | Electron IPC for main-renderer communication |
| Shared Services | Reuse existing services from src/services/ |

### Application Structure
```
ynam-comment-seending-tools/
├── src/
│   ├── electron/                    # Electron-specific code
│   │   ├── main.ts                  # Electron main process
│   │   ├── preload.ts               # Preload script for IPC
│   │   └── menu.ts                  # Application menu
│   ├── renderer/                    # Frontend code
│   │   ├── index.html               # Main application window
│   │   ├── styles/                  # CSS styles
│   │   ├── components/              # UI components
│   │   │   ├── setup-view.ts        # Initial setup screen
│   │   │   ├── verify-tab.ts        # Verify Seeding tab
│   │   │   └── dupdetection-tab.ts  # Duplication Detection tab
│   │   └── utils/                   # Frontend utilities
│   ├── commands/
│   │   ├── verify.ts                # Existing verify command
│   │   ├── paidbuzz.ts              # Existing paidbuzz command
│   │   └── dupdetector.ts           # NEW: Duplication detection command
│   └── services/
│       └── similarity-service.ts    # NEW: Comment similarity detection
```

---

## Features

### 1. Initial Setup Screen

**Purpose**: Guide users through prerequisite setup before accessing main functionality.

**UI Elements**:
```
┌─────────────────────────────────────────────────────────────┐
│  YouNetAM Spreadsheet Tool                    [_] [□] [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [YouNet Logo]                                               │
│                                                               │
│  📋 Setup Instructions                                       │
│                                                               │
│  Before you begin, please ensure:                            │
│                                                               │
│  1. Share your Google Sheet with this service account:       │
│     ┌───────────────────────────────────────────────────┐  │
│     │ service-account@project.iam.gserviceaccount.com    │  │
│     │                                         [Copy]      │  │
│     └───────────────────────────────────────────────────┘  │
│                                                               │
│  2. Grant "Editor" permissions to allow read/write access    │
│                                                               │
│  3. Enter your Google Sheet URL below:                       │
│     ┌───────────────────────────────────────────────────┐  │
│     │ https://docs.google.com/spreadsheets/...          │  │
│     └───────────────────────────────────────────────────┘  │
│                                                               │
│                              [Load Sheet]                     │
│                                                               │
│  Status: Waiting for sheet URL...                            │
└─────────────────────────────────────────────────────────────┘
```

**Functionality**:
- Display service account email from environment variables
- Copy button for easy sharing
- Sheet URL input with validation
- "Load Sheet" button that:
  - Validates URL format
  - Checks sheet permissions
  - Loads sheet metadata (name, number of rows)
  - Enables tabs on success
  - Shows error message on failure

**Permission Check**:
```typescript
async function checkSheetPermissions(sheetUrl: string): Promise<boolean> {
  try {
    const sheetService = new SheetService();
    await sheetService.connect(sheetUrl);
    // Try to read first row to verify read permission
    await sheetService.getHeaders();
    return true;
  } catch (error) {
    return false;
  }
}
```

---

### 2. Tab Navigation

After successful sheet loading, the following tabs become active:

```
┌─────────────────────────────────────────────────────────────┐
│  YouNetAM Spreadsheet Tool                    [_] [□] [×]   │
├─────────────────────────────────────────────────────────────┤
│  [Verify Seeding] [Duplication Detection]                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Tab content here]                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Verify Seeding Tab

**Purpose**: GUI wrapper for the existing `verify` command.

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Verify Seeding                                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Column Configuration                                     │
│                                                               │
│  Comment Text Column:      [L  ▼]  (Column containing comment text)
│  Comment Link Column:      [N  ▼]  (Column containing Facebook link)
│  Screenshot URL Column:    [O  ▼]  (Column containing screenshot URL)
│  Link Result Column:       [Q  ▼]  (Column to write link verification)
│  Screenshot Result Column: [R  ▼]  (Column to write screenshot result)
│                                                               │
│  ⚙️ Processing Options                                       │
│                                                               │
│  Row Range:  [All rows ▼]  or  From [__] to [__]            │
│  Concurrency: [1 ▼] (Number of parallel verifications)      │
│                                                               │
│  ☑ Show verbose output                                       │
│  ☑ Overwrite existing results                                │
│  ☐ Dry run (preview without changes)                         │
│                                                               │
│  🌐 Browser Settings                                         │
│                                                               │
│  Chrome Debug Port: [9222]                                   │
│                                                               │
│  Status: ⚠️ Chrome is not running on port 9222              │
│         [Start Chrome with Debug Mode]                       │
│                                                               │
│                     [Start Verification]                      │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Progress: ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50% (25/50 rows)            │
│                                                               │
│  📊 Summary:                                                 │
│    - Processed: 25 comments                                  │
│    - Verified: 20 ✓                                          │
│    - Failed: 3 ✗                                             │
│    - Errors: 2 ⚠️                                            │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Column Dropdowns**:
- Auto-populate with sheet column letters (A-Z, AA-ZZ)
- Remember last used configuration
- Load from `.ynam-tools.json` if available

**Browser Detection**:
- Check if Chrome is running on specified port
- Show status indicator (green = connected, red = not running)
- "Start Chrome with Debug Mode" button launches Chrome with proper flags

**Progress Display**:
- Real-time progress bar
- Current row being processed
- Running summary of results
- Live log output if verbose mode enabled

**Button States**:
- Disabled during processing
- "Stop Verification" button replaces "Start" during run
- Results summary shown after completion

---

### 4. Duplication Detection Tab (NEW)

**Purpose**: Detect similar comments in a spreadsheet based on semantic similarity.

**UI Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Duplication Detection                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  📋 Column Configuration                                     │
│                                                               │
│  Comment Column:        [P  ▼]  (Column containing comments to analyze)
│  Result Cluster Column: [S  ▼]  (Column to write cluster IDs)
│                                                               │
│  🎯 Detection Settings                                       │
│                                                               │
│  Similarity Threshold: [85] % (0-100)                        │
│                       ├────────┼────────┤                    │
│                    Strict    Default  Lenient                │
│                                                               │
│  Row Range:  [All rows ▼]  or  From [__] to [__]            │
│                                                               │
│  ⚙️ Options                                                  │
│                                                               │
│  ☑ Show verbose output                                       │
│  ☐ Dry run (preview without changes)                         │
│                                                               │
│                    [Start Detection]                          │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Progress: ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50% (25/50 comments)        │
│                                                               │
│  📊 Results:                                                 │
│    - Total comments: 50                                      │
│    - Unique comments: 38                                     │
│    - Duplicate clusters: 6                                   │
│    - Largest cluster: 5 comments                             │
│                                                               │
│  🔍 Duplicate Clusters Found:                                │
│                                                               │
│  Cluster 1 (5 comments) - Similarity: 92%                    │
│    • Row 5: "Mình cũng từng nghĩ HPV là..."                 │
│    • Row 12: "Mình cũng từng nghĩ rằng HPV..."              │
│    • Row 23: "Trước đây mình cũng nghĩ HPV..."              │
│    [View All]                                                │
│                                                               │
│  Cluster 2 (3 comments) - Similarity: 88%                    │
│    • Row 8: "Nghe tin về HPV mình cũng..."                  │
│    ...                                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

**Similarity Threshold**:
- Slider from 0-100%
- Presets: Strict (95%), Default (85%), Lenient (70%)
- Tooltip explaining: "Higher values detect only very similar comments"

**Cluster Assignment**:
- Each unique cluster gets an ID (Cluster 1, Cluster 2, etc.)
- All comments in same cluster share the same ID
- Unique comments get their own cluster ID
- Written to Result Cluster Column

**Results Display**:
- Show summary statistics
- Expandable list of clusters
- Click to highlight rows in sheet
- Export duplicate report option

---

## CLI Command: dupdetector

### Command Specification

```bash
# Interactive mode
npm start dupdetector

# With options
npm start dupdetector -- \
  --sheet="https://docs.google.com/spreadsheets/d/..." \
  --comment-col=P \
  --cluster-col=S \
  --threshold=85 \
  --rows=1-100 \
  --verbose \
  --dry-run
```

### Flags
| Flag | Description | Default |
|------|-------------|---------|
| `--sheet` | Google Sheet URL | (prompt) |
| `--comment-col` | Column containing comments | P |
| `--cluster-col` | Column to write cluster IDs | S |
| `--threshold` | Similarity threshold (0-100) | 85 |
| `--rows` | Row range to process | all |
| `--dry-run` | Preview without writing | false |
| `--verbose` | Show detailed output | false |
| `--overwrite` | Overwrite existing clusters | false |

---

## Implementation: Duplication Detection Algorithm

### Approach: LLM-Based Semantic Similarity

**Why LLM over traditional methods?**
- Vietnamese text nuances (diacritics, word order)
- Semantic understanding (paraphrasing detection)
- Handles narrative framework similarity (not just exact words)

### SimilarityService

```typescript
// src/services/similarity-service.ts

export class SimilarityService {
  private geminiClient: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.geminiClient = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Compare two comments and return similarity score
   */
  async compareComments(comment1: string, comment2: string): Promise<number> {
    const prompt = `
      Compare these two Vietnamese comments and rate their similarity from 0-100.

      Consider:
      - Same narrative framework/structure
      - Similar main ideas and message
      - Paraphrasing and word substitutions

      Comment 1: "${comment1}"
      Comment 2: "${comment2}"

      Return only a number from 0-100.
    `;

    const model = this.geminiClient.getGenerativeModel({
      model: 'gemini-1.5-flash'
    });
    const result = await model.generateContent(prompt);
    const score = parseInt(result.response.text().trim());
    return score;
  }

  /**
   * Cluster comments by similarity
   */
  async clusterComments(
    comments: Array<{row: number, text: string}>,
    threshold: number
  ): Promise<Map<number, number>> {
    const clusters = new Map<number, number>(); // row -> cluster ID
    let currentClusterId = 1;

    for (let i = 0; i < comments.length; i++) {
      if (clusters.has(comments[i].row)) continue;

      const cluster: number[] = [comments[i].row];

      for (let j = i + 1; j < comments.length; j++) {
        if (clusters.has(comments[j].row)) continue;

        const similarity = await this.compareComments(
          comments[i].text,
          comments[j].text
        );

        if (similarity >= threshold) {
          cluster.push(comments[j].row);
        }
      }

      // Assign cluster ID to all members
      cluster.forEach(row => {
        clusters.set(row, currentClusterId);
      });

      currentClusterId++;
    }

    return clusters;
  }
}
```

### DupDetectorCommand

```typescript
// src/commands/dupdetector.ts

export class DupDetectorCommand extends BaseCommand {
  async run(options: DupDetectorOptions): Promise<void> {
    // 1. Load comments from sheet
    const sheetService = new SheetService();
    const comments = await sheetService.readColumn(
      options.sheet,
      options.commentCol,
      options.rows
    );

    // 2. Cluster similar comments
    const similarityService = new SimilarityService(
      process.env.GEMINI_API_KEY!
    );
    const clusters = await similarityService.clusterComments(
      comments,
      options.threshold
    );

    // 3. Write cluster IDs back to sheet
    if (!options.dryRun) {
      await sheetService.writeColumn(
        options.sheet,
        options.clusterCol,
        clusters
      );
    }

    // 4. Display summary
    this.displaySummary(comments, clusters, options.threshold);
  }

  private displaySummary(
    comments: Array<{row: number, text: string}>,
    clusters: Map<number, number>,
    threshold: number
  ): void {
    const uniqueClusters = new Set(clusters.values());
    const clusterSizes = new Map<number, number>();

    clusters.forEach((clusterId) => {
      clusterSizes.set(clusterId, (clusterSizes.get(clusterId) || 0) + 1);
    });

    const duplicateClusters = Array.from(clusterSizes.entries())
      .filter(([_, size]) => size > 1)
      .sort((a, b) => b[1] - a[1]);

    logger.info('\n═══════════════════════════════════════════════');
    logger.info('  DUPLICATION DETECTION COMPLETE');
    logger.info('═══════════════════════════════════════════════');
    logger.info(`  Total comments:      ${comments.length}`);
    logger.info(`  Unique comments:     ${uniqueClusters.size}`);
    logger.info(`  Duplicate clusters:  ${duplicateClusters.length}`);
    logger.info(`  Similarity threshold: ${threshold}%`);

    if (duplicateClusters.length > 0) {
      logger.info('\n  Duplicate Clusters:');
      duplicateClusters.forEach(([clusterId, size]) => {
        logger.info(`    Cluster ${clusterId}: ${size} comments`);
      });
    }
  }
}
```

---

## Desktop Application Flow

### 1. Application Startup
```
1. Load Electron main process
2. Create main window
3. Load setup screen
4. Check environment variables (GOOGLE_SERVICE_ACCOUNT_PATH, GEMINI_API_KEY)
5. Display service account email
6. Wait for user input
```

### 2. Sheet Loading
```
1. User enters sheet URL
2. Click "Load Sheet"
3. Validate URL format
4. Check sheet permissions
5. Load sheet metadata
6. Enable tabs on success
7. Populate column dropdowns
8. Load saved configuration (if exists)
```

### 3. Verify Seeding Flow
```
1. User configures columns
2. User sets options
3. Check Chrome connection
4. Click "Start Verification"
5. Execute verify command via IPC
6. Stream progress updates to UI
7. Display results
8. Save configuration
```

### 4. Duplication Detection Flow
```
1. User selects comment column
2. User sets similarity threshold
3. User selects result column
4. Click "Start Detection"
5. Execute dupdetector command via IPC
6. Stream progress updates to UI
7. Display clusters
8. Write results to sheet
9. Save configuration
```

---

## IPC Communication

### Main Process → Renderer
```typescript
// Events sent from main to renderer
ipcMain.handle('check-chrome-connection', async (_, port: number) => {
  // Check if Chrome is running
});

ipcMain.handle('start-verification', async (_, options: VerifyOptions) => {
  // Execute verify command
});

ipcMain.handle('start-dupdetection', async (_, options: DupDetectorOptions) => {
  // Execute dupdetector command
});

ipcMain.handle('load-sheet', async (_, sheetUrl: string) => {
  // Load and validate sheet
});

// Progress updates
ipcMain.on('verification-progress', (event, progress) => {
  event.sender.send('progress-update', progress);
});
```

### Renderer → Main Process
```typescript
// From renderer
ipcRenderer.invoke('check-chrome-connection', port);
ipcRenderer.invoke('start-verification', options);
ipcRenderer.invoke('start-dupdetection', options);
ipcRenderer.invoke('load-sheet', sheetUrl);

// Listen for updates
ipcRenderer.on('progress-update', (_, progress) => {
  // Update UI
});
```

---

## Configuration Persistence

### Desktop App Config
Store in `.ynam-tools.json`:
```json
{
  "desktop": {
    "lastSheet": "https://docs.google.com/spreadsheets/d/...",
    "verify": {
      "commentCol": "L",
      "linkCol": "N",
      "screenshotCol": "O",
      "linkResultCol": "Q",
      "screenshotResultCol": "R",
      "concurrency": 1,
      "port": 9222
    },
    "dupdetector": {
      "commentCol": "P",
      "clusterCol": "S",
      "threshold": 85
    }
  }
}
```

---

## Build & Distribution

### Package Scripts
```json
{
  "scripts": {
    "electron:dev": "electron .",
    "electron:build": "electron-builder",
    "electron:build:mac": "electron-builder --mac",
    "electron:build:win": "electron-builder --win"
  }
}
```

### Electron Builder Config
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

---

## Security Considerations

- Service account credentials stored in environment variables
- API keys never exposed to renderer process
- IPC handlers validate all inputs
- Sheet URLs validated before processing
- No credential storage in desktop app UI

---

## Error Handling

### User-Friendly Error Messages
```
Chrome Not Running:
  "Chrome browser is not running in debug mode.
   Click 'Start Chrome with Debug Mode' to launch it automatically."

Sheet Permission Error:
  "Cannot access the Google Sheet.
   Please ensure you've shared it with: [service-account-email]"

Invalid Column:
  "Column 'XYZ' does not exist in the sheet.
   Please select a valid column from the dropdown."

API Error:
  "Failed to connect to Gemini API.
   Please check your GEMINI_API_KEY in the .env file."
```

---

## Testing Strategy

### Desktop App Testing
- Manual UI testing for all workflows
- IPC communication testing
- Integration testing with actual sheets
- Error scenario testing

### CLI Testing
- Unit tests for SimilarityService
- Integration tests for DupDetectorCommand
- Test with various similarity thresholds
- Test clustering algorithm accuracy
