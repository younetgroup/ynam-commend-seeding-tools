# Data Model: YNAM Comment Verification Tool

**Feature Branch**: `001-comment-verification`
**Date**: 2026-01-14

## Entities

### CommentRecord

Represents a single row from the Google Sheet containing data for verification.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| rowNumber | number | Sheet row number (1-indexed) | >= 2 (skip header) |
| commentText | string | Expected comment content | Non-empty |
| commentLink | string | Facebook comment URL | Valid URL, facebook.com domain |
| screenshotUrl | string \| null | Screenshot image URL | Valid URL or null |
| linkResult | VerificationResult \| null | Existing link verification result | null if not yet verified |
| screenshotResult | VerificationResult \| null | Existing screenshot result | null if not yet verified |

### VerificationResult

The outcome of a verification operation.

| Value | Type | Description |
|-------|------|-------------|
| 1 | number | Verification passed - content found |
| 0 | number | Verification failed - content not found |
| "ERROR" | string | Verification error - unable to process |

```typescript
type VerificationResult = 0 | 1 | 'ERROR';
```

### ColumnMapping

Maps logical column names to sheet column letters.

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| comment | string | Column with comment text | A-ZZ format |
| link | string | Column with Facebook link | A-ZZ format |
| screenshot | string | Column with screenshot URL | A-ZZ format |
| linkResult | string | Column for link verification output | A-ZZ format |
| screenshotResult | string | Column for screenshot output | A-ZZ format |

### Configuration

Persisted user preferences stored in `.ynam-tools.json`.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| lastSheet | string \| null | Last used Google Sheet URL | null |
| columnMapping | ColumnMapping \| null | Saved column configuration | null |
| concurrency | number | Parallel processing count | 1 |
| port | number | Chrome debugging port | 9222 |

### VerifyOptions

CLI command options for the verify command.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| sheet | string \| undefined | Google Sheet URL | (prompt) |
| commentCol | string \| undefined | Comment column | (prompt) |
| linkCol | string \| undefined | Link column | (prompt) |
| screenshotCol | string \| undefined | Screenshot column | (prompt) |
| linkResultCol | string \| undefined | Link result column | (prompt) |
| screenshotResultCol | string \| undefined | Screenshot result column | (prompt) |
| rows | string \| undefined | Row range (e.g., "10-50") | all |
| concurrency | number | Parallel processing count | 1 |
| dryRun | boolean | Validate without processing | false |
| verbose | boolean | Show per-row status | false |
| overwrite | boolean | Overwrite existing results | false |
| watch | boolean | Enable watch mode | false |
| interval | number | Watch poll interval (minutes) | 5 |
| report | boolean | Generate HTML report | false |
| port | number | Chrome debugging port | 9222 |

### VerificationSession

Tracks progress and results during a verification run.

| Field | Type | Description |
|-------|------|-------------|
| sheetUrl | string | Google Sheet being processed |
| startTime | Date | Session start timestamp |
| endTime | Date \| null | Session end timestamp |
| totalRows | number | Total rows in range |
| processedRows | number | Rows processed so far |
| skippedRows | number | Rows skipped (existing results) |
| linkResults | ResultStats | Link verification statistics |
| screenshotResults | ResultStats | Screenshot verification statistics |

### ResultStats

Aggregated statistics for verification results.

| Field | Type | Description |
|-------|------|-------------|
| passed | number | Count of verifications that passed (1) |
| failed | number | Count of verifications that failed (0) |
| errors | number | Count of verification errors (ERROR) |

### OCRResult

Result from Tesseract OCR processing.

| Field | Type | Description |
|-------|------|-------------|
| text | string | Extracted text content |
| confidence | number | OCR confidence score (0-100) |

### SheetPreview

Preview data for interactive column selection.

| Field | Type | Description |
|-------|------|-------------|
| headers | string[] | First row (header) values |
| sampleRows | string[][] | First 3-5 data rows |
| columnLetters | string[] | Column letter labels (A, B, C, ...) |
| totalRows | number | Total number of data rows |

## State Transitions

### Verification Flow

```
┌─────────────────┐
│   INITIALIZED   │
└────────┬────────┘
         │ connect to Chrome
         ▼
┌─────────────────┐
│    CONNECTED    │
└────────┬────────┘
         │ fetch sheet data
         ▼
┌─────────────────┐
│   PROCESSING    │◄──────────┐
└────────┬────────┘           │
         │ verify row         │ more rows
         ▼                    │
┌─────────────────┐           │
│  ROW_VERIFIED   │───────────┘
└────────┬────────┘
         │ no more rows
         ▼
┌─────────────────┐
│    COMPLETE     │
└─────────────────┘
```

### Row Verification States

```
PENDING → IN_PROGRESS → VERIFIED (pass/fail)
                     → ERROR (on failure)
```

## Relationships

```
Configuration (1) ─── contains ──► ColumnMapping (1)
                                        │
                                        │ maps to
                                        ▼
VerificationSession (1) ─── processes ──► CommentRecord (*)
                                              │
                                              │ produces
                                              ▼
                                        VerificationResult
```

## Validation Rules

### CommentRecord
- `rowNumber` must be >= 2 (row 1 is header)
- `commentText` must be non-empty string
- `commentLink` must be valid URL with facebook.com domain
- `screenshotUrl` can be null; if present, must be valid URL

### ColumnMapping
- All columns must be unique (no duplicate mappings)
- Column letters must match pattern: `^[A-Z]{1,2}$`
- Result columns must not overlap with input columns

### VerifyOptions
- `rows` must match pattern: `^\d+-\d+$` (e.g., "10-50")
- `concurrency` must be positive integer
- `interval` must be positive integer
- `port` must be valid port number (1-65535)
