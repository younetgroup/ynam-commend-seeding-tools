# Tasks: YNAM Comment Verification Tool

**Input**: Design documents from `/specs/001-comment-verification/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/services.ts, research.md, quickstart.md

**Tests**: Tests are NOT explicitly requested. Task list focuses on implementation only.

**Organization**: Tasks are grouped by user story (5 stories from spec.md: P1, P2×2, P3×2)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and TypeScript/Node.js structure

- [ ] T001 Initialize Node.js project with package.json in project root
- [ ] T002 Configure TypeScript with tsconfig.json for Node.js 18+ target
- [ ] T003 [P] Install core dependencies: playwright, googleapis, @google/generative-ai, tesseract.js
- [ ] T004 [P] Install CLI dependencies: commander, inquirer, cli-progress, chalk, dotenv
- [ ] T005 [P] Install dev dependencies: typescript, vitest, @types/node, tsx
- [ ] T006 [P] Create .env.example with GEMINI_API_KEY and GOOGLE_SERVICE_ACCOUNT_PATH
- [ ] T007 [P] Create .gitignore excluding node_modules, .env, service-account.json, dist/
- [ ] T008 Create src/ directory structure per plan.md architecture

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 [P] Create TypeScript interfaces in src/types/index.ts based on contracts/services.ts
- [ ] T010 [P] Implement text normalization utility in src/utils/text-matcher.ts with normalize() and contains() methods
- [ ] T011 [P] Implement Vietnamese diacritics handling in src/utils/vietnamese.ts
- [ ] T012 [P] Implement retry utility with exponential backoff in src/utils/retry.ts
- [ ] T013 [P] Implement logger utility in src/utils/logger.ts with verbose mode support
- [ ] T014 [P] Implement config persistence in src/utils/config.ts for .ynam-tools.json
- [ ] T015 Create base command interface in src/commands/base-command.ts
- [ ] T016 Create CLI entry point in src/index.ts with Commander setup and verify command routing

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Interactive Verification Session (Priority: P1) 🎯 MVP

**Goal**: Enable users to verify Facebook comments via interactive CLI session

**Independent Test**: Run `ynam-tools verify` with a Google Sheet containing 5+ rows, verify results (1/0) written to output columns

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement SheetService.initialize() for service account auth in src/services/sheet-service.ts
- [ ] T018 [P] [US1] Implement SheetService.parseSheetId() to extract sheet ID from URL in src/services/sheet-service.ts
- [ ] T019 [US1] Implement SheetService.getPreview() to fetch headers and sample rows in src/services/sheet-service.ts
- [ ] T020 [US1] Implement SheetService.readRecords() to read comment records in src/services/sheet-service.ts
- [ ] T021 [US1] Implement SheetService.writeResult() and batchWriteResults() in src/services/sheet-service.ts
- [ ] T022 [P] [US1] Implement BrowserService.connect() for CDP connection in src/services/browser-service.ts
- [ ] T023 [P] [US1] Implement BrowserService.isConnected() and disconnect() in src/services/browser-service.ts
- [ ] T024 [US1] Implement BrowserService.getPageText() to navigate and extract text in src/services/browser-service.ts
- [ ] T025 [US1] Create interactive prompts for sheet URL and column selection in src/commands/verify.ts
- [ ] T026 [US1] Implement link verification logic using BrowserService and text-matcher in src/commands/verify.ts
- [ ] T027 [US1] Implement progress bar display with cli-progress in src/commands/verify.ts
- [ ] T028 [US1] Implement summary output showing pass/fail counts in src/commands/verify.ts
- [ ] T029 [US1] Add verbose mode with per-row status output in src/commands/verify.ts
- [ ] T030 [US1] Add --rows flag support for row range filtering in src/commands/verify.ts
- [ ] T031 [US1] Add --concurrency flag support for parallel processing in src/commands/verify.ts

**Checkpoint**: User Story 1 complete - interactive link verification functional

---

## Phase 4: User Story 2 - Screenshot Verification (Priority: P2)

**Goal**: Verify comments via screenshot OCR with AI fallback

**Independent Test**: Provide rows with screenshot URLs, verify OCR extracts text and matches comment content

### Implementation for User Story 2

- [ ] T032 [P] [US2] Implement OCRService.extractText() with Tesseract.js in src/services/ocr-service.ts
- [ ] T033 [P] [US2] Implement OCRService.isReady() and terminate() in src/services/ocr-service.ts
- [ ] T034 [P] [US2] Implement AIService.initialize() with Gemini API key in src/services/ai-service.ts
- [ ] T035 [P] [US2] Implement AIService.isConfigured() in src/services/ai-service.ts
- [ ] T036 [US2] Implement AIService.verifyImageContainsText() with vision prompt in src/services/ai-service.ts
- [ ] T037 [US2] Implement image download utility for screenshot URLs in src/utils/image.ts
- [ ] T038 [US2] Implement screenshot verification logic with OCR primary and AI fallback in src/commands/verify.ts
- [ ] T039 [US2] Add 80% confidence threshold for OCR fallback decision in src/commands/verify.ts
- [ ] T040 [US2] Add ERROR result handling for failed screenshot downloads in src/commands/verify.ts

**Checkpoint**: User Story 2 complete - screenshot verification with OCR/AI working

---

## Phase 5: User Story 3 - Chrome Connection Guidance (Priority: P2)

**Goal**: Provide clear setup instructions when Chrome debugging is not available

**Independent Test**: Run tool without Chrome debugging enabled, verify step-by-step instructions displayed

### Implementation for User Story 3

- [ ] T041 [US3] Implement BrowserService.getSetupInstructions() with platform-specific commands in src/services/browser-service.ts
- [ ] T042 [US3] Add connection failure detection and instruction display in src/commands/verify.ts
- [ ] T043 [US3] Add retry prompt after user confirms Chrome setup in src/commands/verify.ts
- [ ] T044 [US3] Add --port flag support for custom debugging port in src/commands/verify.ts

**Checkpoint**: User Story 3 complete - first-time users get clear setup guidance

---

## Phase 6: User Story 4 - Resume and Watch Mode (Priority: P3)

**Goal**: Enable resume capability and automatic polling for new rows

**Independent Test**: Run with --watch flag, add new rows to sheet, verify automatic processing

### Implementation for User Story 4

- [ ] T045 [US4] Implement resume logic to skip rows with existing results in src/commands/verify.ts
- [ ] T046 [US4] Add --overwrite flag support to force reprocessing in src/commands/verify.ts
- [ ] T047 [US4] Implement watch mode polling loop with configurable interval in src/commands/verify.ts
- [ ] T048 [US4] Add --watch and --interval flag support in src/commands/verify.ts
- [ ] T049 [US4] Implement graceful Ctrl+C handling with final summary in src/commands/verify.ts
- [ ] T050 [US4] Add configuration save prompt after successful run in src/commands/verify.ts
- [ ] T051 [US4] Add configuration reuse prompt on subsequent runs in src/commands/verify.ts

**Checkpoint**: User Story 4 complete - resume and watch mode functional

---

## Phase 7: User Story 5 - Dry Run and Reporting (Priority: P3)

**Goal**: Preview verification without changes and generate HTML reports

**Independent Test**: Run with --dry-run flag, verify no sheet modifications; run with --report, verify HTML generated

### Implementation for User Story 5

- [ ] T052 [US5] Implement dry-run mode displaying row counts and column mapping in src/commands/verify.ts
- [ ] T053 [US5] Add --dry-run flag support in src/commands/verify.ts
- [ ] T054 [US5] Implement HTML report generator in src/utils/report.ts
- [ ] T055 [US5] Add summary statistics section to HTML report in src/utils/report.ts
- [ ] T056 [US5] Add detailed row-by-row results table to HTML report in src/utils/report.ts
- [ ] T057 [US5] Add pass/fail/error chart visualization to HTML report in src/utils/report.ts
- [ ] T058 [US5] Add --report flag support and report generation trigger in src/commands/verify.ts

**Checkpoint**: User Story 5 complete - dry-run and reporting functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T059 [P] Add comprehensive error messages with exit codes per SPEC.md in src/index.ts
- [ ] T060 [P] Add npm scripts: start, build, test in package.json
- [ ] T061 [P] Create bin entry point for global installation in package.json
- [ ] T062 Validate quickstart.md instructions work end-to-end
- [ ] T063 Add rate limiting delay (100ms) between Gemini API calls in src/services/ai-service.ts
- [ ] T064 Final code cleanup and TypeScript strict mode validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3)
  - US1 must complete before US2, US3, US4, US5 (US1 is core functionality)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 (screenshot verification extends link verification)
- **User Story 3 (P2)**: Can start after US1 (adds error handling to existing flow)
- **User Story 4 (P3)**: Depends on US1 (resume/watch extends verification flow)
- **User Story 5 (P3)**: Depends on US1 (dry-run and reporting wrap verification)

### Within Each User Story

- Service implementations before command integration
- Core functionality before optional features (flags, modes)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T007)
- All Foundational tasks marked [P] can run in parallel (T009-T014)
- Within US1: SheetService tasks (T017-T018) parallel with BrowserService tasks (T022-T023)
- Within US2: OCRService (T032-T033) parallel with AIService (T034-T035)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all foundational utilities together:
Task: "Create TypeScript interfaces in src/types/index.ts"
Task: "Implement text normalization utility in src/utils/text-matcher.ts"
Task: "Implement Vietnamese diacritics handling in src/utils/vietnamese.ts"
Task: "Implement retry utility in src/utils/retry.ts"
Task: "Implement logger utility in src/utils/logger.ts"
Task: "Implement config persistence in src/utils/config.ts"
```

## Parallel Example: User Story 1 Services

```bash
# Launch SheetService and BrowserService tasks together:
Task: "Implement SheetService.initialize() in src/services/sheet-service.ts"
Task: "Implement SheetService.parseSheetId() in src/services/sheet-service.ts"
Task: "Implement BrowserService.connect() in src/services/browser-service.ts"
Task: "Implement BrowserService.isConnected() in src/services/browser-service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Interactive Link Verification)
4. **STOP and VALIDATE**: Test with real Google Sheet and Facebook links
5. Deploy/demo if ready - MVP delivers core value

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP with link verification!)
3. Add User Story 2 → Test → Deploy (adds screenshot/OCR)
4. Add User Story 3 → Test → Deploy (adds setup guidance)
5. Add User Story 4 → Test → Deploy (adds resume/watch)
6. Add User Story 5 → Test → Deploy (adds dry-run/reports)
7. Each story adds value without breaking previous stories

### Key Files Summary

| File | Purpose |
|------|---------|
| src/index.ts | CLI entry point with Commander |
| src/commands/verify.ts | Main verification command |
| src/services/browser-service.ts | Chrome CDP connection |
| src/services/sheet-service.ts | Google Sheets API |
| src/services/ai-service.ts | Gemini Vision API |
| src/services/ocr-service.ts | Tesseract OCR |
| src/utils/text-matcher.ts | Text normalization |
| src/utils/config.ts | Config persistence |
| src/utils/report.ts | HTML report generation |
| src/types/index.ts | TypeScript interfaces |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable (after dependencies)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Total: 64 tasks across 8 phases
