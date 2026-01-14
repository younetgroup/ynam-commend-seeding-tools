# Feature Specification: YNAM Comment Verification Tool

**Feature Branch**: `001-comment-verification`
**Created**: 2026-01-14
**Status**: Draft
**Input**: User description: "I want to build apps in @SPEC.md" (referencing YNAM-Tools CLI for verifying Facebook comments against Google Sheets data)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Interactive Verification Session (Priority: P1)

A marketing team member needs to verify that comments posted on Facebook actually appear on the platform. They have a Google Sheet with comment content, Facebook links, and screenshot links. They want to run an interactive verification session to check all comments and record results.

**Why this priority**: This is the core value proposition - automating the tedious manual process of opening each Facebook link and checking if comments exist. Without this, the tool provides no value.

**Independent Test**: Can be fully tested by running `ynam-tools verify` with a configured Google Sheet containing at least 5 rows of test data, and verifying that results (1/0) are written to the output columns.

**Acceptance Scenarios**:

1. **Given** a user has Chrome running with debugging enabled and is logged into Facebook, **When** they run `ynam-tools verify` and provide a Google Sheet URL, **Then** they are prompted to select columns for comment text, links, screenshots, and result outputs.

2. **Given** a user has completed column selection, **When** the tool processes each row, **Then** it opens the Facebook comment link, searches for the comment text, and writes 1 (found) or 0 (not found) to the link result column.

3. **Given** the tool has finished processing all rows, **When** verification is complete, **Then** a summary is displayed showing total rows processed, pass/fail counts for both link and screenshot verification.

---

### User Story 2 - Screenshot Verification (Priority: P2)

A QA analyst needs to verify comments not just by opening Facebook links, but also by checking screenshot images. Screenshots serve as evidence that comments were posted, even if the original posts are later deleted.

**Why this priority**: Screenshot verification provides additional proof of comment existence and is explicitly required in the original specification. It extends the core verification with visual/OCR analysis.

**Independent Test**: Can be tested by providing rows with screenshot URLs and verifying that the tool extracts text from images and matches against expected comment content.

**Acceptance Scenarios**:

1. **Given** a row contains a screenshot URL, **When** the tool processes screenshot verification, **Then** it downloads the image and extracts text using OCR.

2. **Given** OCR extraction has low confidence (below 80%), **When** the tool processes the screenshot, **Then** it falls back to AI-based vision verification.

3. **Given** a screenshot URL returns a 404 error, **When** the tool attempts verification, **Then** it writes "ERROR" to the screenshot result column and continues processing.

---

### User Story 3 - Chrome Connection Guidance (Priority: P2)

A first-time user attempts to run the verification tool but Chrome is not running with debugging enabled. They need clear instructions to set up Chrome properly before the tool can function.

**Why this priority**: Without proper Chrome setup, the tool cannot function. Providing clear guidance prevents user frustration and support requests.

**Independent Test**: Can be tested by running the tool without Chrome debugging enabled and verifying the error message provides step-by-step instructions.

**Acceptance Scenarios**:

1. **Given** Chrome is not running with remote debugging, **When** the user runs the verification command, **Then** the tool displays clear instructions for starting Chrome with `--remote-debugging-port=9222`.

2. **Given** the user follows the instructions and restarts the tool, **When** Chrome is properly configured, **Then** the tool successfully connects and proceeds with verification.

---

### User Story 4 - Resume and Watch Mode (Priority: P3)

A power user has a continuously updating Google Sheet and wants the tool to automatically check for new unverified rows periodically, rather than running manual sessions.

**Why this priority**: This enhances efficiency for ongoing verification workflows but is not essential for basic functionality.

**Independent Test**: Can be tested by running with `--watch` flag and adding new rows to the sheet, verifying they are automatically processed.

**Acceptance Scenarios**:

1. **Given** existing results are in result columns, **When** the tool runs normally, **Then** it skips rows that already have values (resume capability).

2. **Given** the user runs with `--watch --interval=5`, **When** new rows appear in the sheet, **Then** the tool automatically processes them every 5 minutes.

3. **Given** watch mode is running, **When** the user presses Ctrl+C, **Then** the tool gracefully stops and displays a final summary.

---

### User Story 5 - Dry Run and Reporting (Priority: P3)

A team lead wants to preview what the tool will do before committing to a full verification run. They also want to generate reports for stakeholders showing verification results.

**Why this priority**: Dry run prevents accidental modifications; reports provide value for auditing but are supplementary to core functionality.

**Independent Test**: Can be tested by running with `--dry-run` flag and verifying no changes are made to the sheet while configuration is validated.

**Acceptance Scenarios**:

1. **Given** the user runs with `--dry-run`, **When** validation completes, **Then** the tool displays row counts, column mapping, and connection status without modifying the sheet.

2. **Given** the user runs with `--report`, **When** verification completes, **Then** an HTML report is generated with summary statistics, charts, and detailed row-by-row results.

---

### Edge Cases

- What happens when the Facebook link is broken or the post has been deleted?
  - System writes 0 to link result column, logs the error, and continues.

- What happens when the comment text contains Vietnamese diacritics that render differently on Facebook?
  - System normalizes text (case-insensitive, whitespace-normalized, diacritics-optional) before matching.

- What happens when the Google Sheet has no data rows?
  - System displays informative message and exits gracefully.

- What happens when rate limiting occurs on Gemini API?
  - System implements exponential backoff (1s, 2s, 4s, 8s, max 30s) with up to 5 retries.

- What happens when multiple columns have the same header name?
  - System allows selection by column letter (A, B, C) as alternative to header name.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST connect to an existing Chrome browser session via Chrome DevTools Protocol (CDP) on a configurable port (default 9222).

- **FR-002**: System MUST authenticate with Google Sheets API using a service account JSON file specified via environment variable.

- **FR-003**: System MUST display a preview of the Google Sheet data and allow interactive column selection for: comment text, comment link, screenshot link, link result output, and screenshot result output.

- **FR-004**: System MUST perform link verification by opening Facebook comment URLs in browser tabs, extracting page text, and comparing against expected comment content using normalized text matching.

- **FR-005**: System MUST perform screenshot verification using local OCR (Tesseract) as primary method, with fallback to AI vision (Gemini) when OCR confidence is below 80%.

- **FR-006**: System MUST write verification results directly to the specified output columns in Google Sheets (1 for found, 0 for not found, "ERROR" for failures).

- **FR-007**: System MUST support row range filtering via `--rows` flag to process specific subsets of data.

- **FR-008**: System MUST support concurrent processing via `--concurrency` flag with configurable parallelism (default 1).

- **FR-009**: System MUST implement resume capability by skipping rows that already have result values, with `--overwrite` flag to force reprocessing.

- **FR-010**: System MUST provide verbose output mode showing per-row status when `--verbose` flag is enabled.

- **FR-011**: System MUST implement watch mode that polls the sheet at configurable intervals and processes new unverified rows.

- **FR-012**: System MUST save successful configurations to a local JSON file and offer to reuse them on subsequent runs.

- **FR-013**: System MUST normalize Vietnamese text by handling diacritics, case differences, and whitespace variations during comparison.

- **FR-014**: System MUST implement retry logic with exponential backoff for failed operations (2-3 retries with increasing delays).

- **FR-015**: System MUST display a progress indicator during verification showing completion percentage and ETA.

- **FR-016**: System MUST generate HTML reports when `--report` flag is enabled, including summary statistics and detailed results.

- **FR-017**: System MUST provide a dry-run mode that validates configuration and displays planned actions without modifying the sheet.

### Key Entities

- **Comment Record**: Represents a single row from the Google Sheet containing comment text, Facebook link, screenshot URL, and result columns. Serves as the primary unit of work for verification.

- **Verification Result**: The outcome of a verification check - either passed (1), failed (0), or error ("ERROR"). Applied separately for link verification and screenshot verification.

- **Configuration**: User preferences including Google Sheet URL, column mappings, concurrency settings, and watch interval. Persisted between sessions.

- **Verification Session**: A single execution run containing multiple comment records, tracking overall progress and generating summary statistics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can verify 100 comment records within 15 minutes using sequential processing (single concurrency).

- **SC-002**: Users can complete the interactive setup (sheet URL entry, column selection) in under 2 minutes.

- **SC-003**: System successfully verifies comments containing Vietnamese text with diacritics at 95% accuracy.

- **SC-004**: First-time users can set up Chrome debugging and complete their first verification run within 10 minutes following the provided instructions.

- **SC-005**: System reduces manual verification time by at least 80% compared to manually opening each link and checking.

- **SC-006**: Resume capability allows interrupted sessions to continue without re-verifying already completed rows.

- **SC-007**: Watch mode successfully detects and processes new rows within the configured polling interval (default 5 minutes).

- **SC-008**: HTML reports are generated within 5 seconds after verification completion and include all required sections (summary, charts, details).

## Assumptions

- Users have access to install Node.js 18+ on their system.
- Users can obtain a Google Cloud service account with Sheets API access.
- Users can obtain a Gemini API key for vision-based verification.
- The Google Chrome browser is available on the user's system.
- Users have stable internet connectivity for accessing Google Sheets, Facebook, and screenshot URLs.
- Facebook comment pages are accessible without additional authentication beyond the logged-in Chrome session.
- Screenshot images are in common formats (PNG, JPG) and accessible via direct URL.
