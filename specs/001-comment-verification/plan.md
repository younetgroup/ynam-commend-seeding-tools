# Implementation Plan: YNAM Comment Verification Tool

**Branch**: `001-comment-verification` | **Date**: 2026-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-comment-verification/spec.md`

## Summary

Build a CLI automation tool that verifies Facebook comments exist on the platform by:
1. Reading comment data from Google Sheets (comment text, links, screenshots)
2. Connecting to an existing Chrome session via CDP to check Facebook comment links
3. Using OCR/AI vision to verify screenshots contain expected comment text
4. Writing verification results (1/0/ERROR) back to Google Sheets

Technical approach: TypeScript/Node.js CLI with Playwright for CDP connection, Google Sheets API for data access, Tesseract for local OCR with Gemini Vision fallback, and Inquirer.js for interactive prompts.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 18+
**Primary Dependencies**: Playwright (CDP), googleapis (Sheets API), @google/generative-ai (Gemini), tesseract.js (OCR), inquirer (CLI prompts), commander (CLI parsing), cli-progress (progress bars)
**Storage**: Local JSON file for configuration persistence (`.ynam-tools.json`)
**Testing**: Vitest (unit/integration), Playwright Test (E2E)
**Target Platform**: macOS, Linux, Windows (cross-platform CLI)
**Project Type**: Single CLI application
**Performance Goals**: 100 rows verified in 15 minutes (sequential), ~9 seconds per row
**Constraints**: Chrome must be running with debugging port, requires internet connectivity, API rate limits (Gemini: 100ms delay, exponential backoff)
**Scale/Scope**: Single user CLI, typical workload 50-500 rows per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is not yet configured (contains template placeholders). This plan proceeds with standard software engineering best practices:

- [x] **Single Responsibility**: Each service handles one concern (Browser, Sheet, AI, OCR)
- [x] **Testability**: Services are injectable, enabling unit testing with mocks
- [x] **CLI Interface**: All functionality exposed via CLI with text I/O
- [x] **Error Handling**: Graceful degradation with clear error messages
- [x] **Security**: Credentials via environment variables, no hardcoded secrets

## Project Structure

### Documentation (this feature)

```text
specs/001-comment-verification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal API contracts)
├── checklists/          # Quality validation
│   └── requirements.md  # Specification checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── index.ts                 # CLI entry point
├── commands/
│   ├── base-command.ts      # Abstract base command interface
│   └── verify.ts            # Comment verification command
├── services/
│   ├── browser-service.ts   # Chrome CDP connection via Playwright
│   ├── sheet-service.ts     # Google Sheets API wrapper
│   ├── ai-service.ts        # Gemini API wrapper
│   └── ocr-service.ts       # Tesseract OCR wrapper
├── utils/
│   ├── text-matcher.ts      # Normalized text matching
│   ├── vietnamese.ts        # Vietnamese diacritics normalization
│   ├── config.ts            # Config file handling (.ynam-tools.json)
│   ├── logger.ts            # Logging utilities
│   └── retry.ts             # Exponential backoff retry logic
└── types/
    └── index.ts             # TypeScript interfaces

tests/
├── unit/
│   ├── text-matcher.test.ts
│   ├── vietnamese.test.ts
│   └── services/
│       ├── sheet-service.test.ts
│       └── ai-service.test.ts
├── integration/
│   ├── verify-flow.test.ts
│   └── sheet-integration.test.ts
└── fixtures/
    ├── sample-sheet-data.json
    └── test-screenshots/
```

**Structure Decision**: Single project structure selected because this is a standalone CLI tool without separate frontend/backend components. The command pattern enables future extensibility through additional command files.

## Complexity Tracking

> No constitution violations identified - proceeding with standard architecture.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
