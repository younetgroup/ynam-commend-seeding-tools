# ynam-comment-seending-tools Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-14

## Active Technologies

- TypeScript 5.x / Node.js 18+ + Playwright (CDP), googleapis (Sheets API), @google/generative-ai (Gemini), tesseract.js (OCR), inquirer (CLI prompts), commander (CLI parsing), cli-progress (progress bars) (001-comment-verification)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / Node.js 18+: Follow standard conventions

## Recent Changes

- 001-comment-verification: Added TypeScript 5.x / Node.js 18+ + Playwright (CDP), googleapis (Sheets API), @google/generative-ai (Gemini), tesseract.js (OCR), inquirer (CLI prompts), commander (CLI parsing), cli-progress (progress bars)

## Intent Layer

### READ-FIRST: System Architecture

This is a **CLI tool** that automates Facebook comment verification through Google Sheets integration. The architecture follows a clean separation of concerns:

```
CLI Entry (index.ts)
    ↓
Commands Layer (commands/)
    ↓
Service Layer (services/)
    ↓
Utility Layer (utils/)
```

**Core Workflow**: Google Sheet → Read rows → Browser automation → AI/OCR verification → Write results back

### Navigation Guide

**Start here when:**
- Adding a new command: `src/commands/` - Extend `base-command.ts`
- Integrating external APIs: `src/services/` - Follow service isolation pattern
- Adding utility functions: `src/utils/` - Keep stateless and focused
- Defining types: `src/types/index.ts` - Central type definitions

### Key Patterns & Invariants

**Service Isolation**
- Each service is self-contained with a single responsibility
- Services never call other services directly (orchestrated by commands)
- All services use dependency injection for testability

**Configuration Management**
- Environment variables: Required credentials (`.env`)
- Persistent config: User preferences (`.ynam-tools.json`)
- Never store credentials in persistent config

**Error Handling**
- All commands use consistent exit codes (src/index.ts:17-24)
- Errors categorized by type: CONFIG_ERROR, CONNECTION_ERROR, etc.
- User-facing error messages include actionable hints

**Browser Automation**
- Uses Chrome DevTools Protocol (CDP) via Playwright
- Requires Chrome running with `--remote-debugging-port=9222`
- Reuses existing browser session (no password storage)

**Sheet Integration**
- Uses service account authentication (not OAuth)
- Reads/writes happen per-batch (not per-row) for efficiency
- Column mapping is user-configurable and persistent

**Text Verification**
- Vietnamese text handling: Diacritic normalization (utils/vietnamese.ts)
- Fuzzy matching: Handles punctuation and capitalization differences
- Two-phase approach: OCR first (fast), AI fallback (accurate)

### Critical Files

- `src/index.ts` - CLI entry point, command registration, exit codes
- `src/commands/verify.ts` - Main verification orchestration
- `src/services/browser-service.ts` - CDP connection, page navigation
- `src/services/sheet-service.ts` - Google Sheets API integration
- `src/services/ai-service.ts` - Gemini Vision API (screenshot verification)
- `src/services/ocr-service.ts` - Tesseract.js (local OCR)
- `src/utils/config.ts` - Configuration persistence
- `src/utils/text-matcher.ts` - Vietnamese text comparison

### Common Gotchas

- **Chrome must be running first**: Browser service connects to existing instance
- **Service account permissions**: Sheet must be shared with service account email
- **Rate limiting**: AI service includes 100ms delay between calls
- **Resume capability**: Results are never overwritten unless `--overwrite` flag used
- **Watch mode**: Polling-based, not real-time (uses `--interval` flag)

### Testing Strategy

- Integration tests in `tests/` directory
- Focus on service layer (mock external APIs)
- Manual testing checklist in USER-GUIDE.md

### Future Directions

The codebase is designed for extensibility:
- New commands: Follow the `VerifyCommand` pattern in `commands/`
- New verification methods: Add services in `services/`
- New platforms: Abstract browser automation (currently Facebook-specific)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
