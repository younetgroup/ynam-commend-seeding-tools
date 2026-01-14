/**
 * Service Contracts: YNAM Comment Verification Tool
 *
 * This file defines the TypeScript interfaces for all services.
 * Implementation must conform to these contracts.
 */

// ============================================================================
// Types
// ============================================================================

export type VerificationResult = 0 | 1 | 'ERROR';

export interface ColumnMapping {
  comment: string;      // e.g., "L"
  link: string;         // e.g., "N"
  screenshot: string;   // e.g., "O"
  linkResult: string;   // e.g., "Q"
  screenshotResult: string; // e.g., "R"
}

export interface CommentRecord {
  rowNumber: number;
  commentText: string;
  commentLink: string;
  screenshotUrl: string | null;
  linkResult: VerificationResult | null;
  screenshotResult: VerificationResult | null;
}

export interface OCRResult {
  text: string;
  confidence: number; // 0-100
}

export interface SheetPreview {
  headers: string[];
  sampleRows: string[][];
  columnLetters: string[];
  totalRows: number;
}

export interface ResultStats {
  passed: number;
  failed: number;
  errors: number;
}

export interface VerificationSession {
  sheetUrl: string;
  startTime: Date;
  endTime: Date | null;
  totalRows: number;
  processedRows: number;
  skippedRows: number;
  linkResults: ResultStats;
  screenshotResults: ResultStats;
}

// ============================================================================
// BrowserService Contract
// ============================================================================

export interface IBrowserService {
  /**
   * Connect to Chrome via CDP on specified port
   * @param port Chrome debugging port (default 9222)
   * @returns true if connected, false otherwise
   */
  connect(port?: number): Promise<boolean>;

  /**
   * Check if currently connected to Chrome
   */
  isConnected(): boolean;

  /**
   * Navigate to URL and extract page text content
   * @param url URL to navigate to
   * @returns Page text content
   * @throws Error if navigation fails or page load timeout
   */
  getPageText(url: string): Promise<string>;

  /**
   * Close connection and cleanup resources
   */
  disconnect(): Promise<void>;

  /**
   * Get instructions for starting Chrome with debugging
   * @returns Multi-line string with setup instructions
   */
  getSetupInstructions(): string;
}

// ============================================================================
// SheetService Contract
// ============================================================================

export interface ISheetService {
  /**
   * Initialize service with service account credentials
   * @param credentialsPath Path to service account JSON file
   * @throws Error if credentials invalid or Sheets API unavailable
   */
  initialize(credentialsPath: string): Promise<void>;

  /**
   * Get preview of sheet data for column selection
   * @param sheetUrl Google Sheet URL
   * @param sheetName Sheet tab name (optional, uses first if not specified)
   * @returns Preview with headers, sample rows, and row count
   */
  getPreview(sheetUrl: string, sheetName?: string): Promise<SheetPreview>;

  /**
   * Read all comment records from sheet
   * @param sheetUrl Google Sheet URL
   * @param mapping Column mapping configuration
   * @param rowRange Optional row range (e.g., { start: 10, end: 50 })
   * @returns Array of comment records
   */
  readRecords(
    sheetUrl: string,
    mapping: ColumnMapping,
    rowRange?: { start: number; end: number }
  ): Promise<CommentRecord[]>;

  /**
   * Write verification result to sheet
   * @param sheetUrl Google Sheet URL
   * @param rowNumber Row number to update
   * @param column Column letter to write to
   * @param value Verification result value
   */
  writeResult(
    sheetUrl: string,
    rowNumber: number,
    column: string,
    value: VerificationResult
  ): Promise<void>;

  /**
   * Write multiple results in batch
   * @param sheetUrl Google Sheet URL
   * @param updates Array of { rowNumber, column, value }
   */
  batchWriteResults(
    sheetUrl: string,
    updates: Array<{ rowNumber: number; column: string; value: VerificationResult }>
  ): Promise<void>;

  /**
   * Parse sheet ID from Google Sheet URL
   * @param url Google Sheet URL
   * @returns Sheet ID string
   * @throws Error if URL format invalid
   */
  parseSheetId(url: string): string;
}

// ============================================================================
// AIService Contract
// ============================================================================

export interface IAIService {
  /**
   * Initialize service with Gemini API key
   * @param apiKey Gemini API key
   */
  initialize(apiKey: string): void;

  /**
   * Check if image contains specified text using Gemini Vision
   * @param imageBuffer Image data as Buffer
   * @param textToFind Text to search for in image
   * @returns true if text found, false if not found
   * @throws Error on API failure after retries
   */
  verifyImageContainsText(imageBuffer: Buffer, textToFind: string): Promise<boolean>;

  /**
   * Check if API key is configured and valid
   */
  isConfigured(): boolean;
}

// ============================================================================
// OCRService Contract
// ============================================================================

export interface IOCRService {
  /**
   * Extract text from image using Tesseract OCR
   * @param imageBuffer Image data as Buffer
   * @param languages Languages to use (default: 'vie+eng' for Vietnamese + English)
   * @returns OCR result with text and confidence score
   */
  extractText(imageBuffer: Buffer, languages?: string): Promise<OCRResult>;

  /**
   * Check if OCR engine is initialized and ready
   */
  isReady(): boolean;

  /**
   * Terminate OCR worker and free resources
   */
  terminate(): Promise<void>;
}

// ============================================================================
// ConfigService Contract
// ============================================================================

export interface IConfigService {
  /**
   * Load configuration from .ynam-tools.json
   * @returns Configuration object or null if not found
   */
  load(): Configuration | null;

  /**
   * Save configuration to .ynam-tools.json
   * @param config Configuration to save
   */
  save(config: Configuration): void;

  /**
   * Check if configuration file exists
   */
  exists(): boolean;
}

export interface Configuration {
  lastSheet: string | null;
  columnMapping: ColumnMapping | null;
  concurrency: number;
  port: number;
}

// ============================================================================
// TextMatcher Contract
// ============================================================================

export interface ITextMatcher {
  /**
   * Normalize text for comparison
   * - Lowercase
   * - Remove Vietnamese diacritics
   * - Normalize whitespace
   * - Remove punctuation
   * @param text Input text
   * @returns Normalized text
   */
  normalize(text: string): string;

  /**
   * Check if target text contains search text (normalized comparison)
   * @param target Text to search within
   * @param search Text to find
   * @returns true if search text found in target
   */
  contains(target: string, search: string): boolean;
}

// ============================================================================
// VerifyCommand Contract
// ============================================================================

export interface VerifyOptions {
  sheet?: string;
  commentCol?: string;
  linkCol?: string;
  screenshotCol?: string;
  linkResultCol?: string;
  screenshotResultCol?: string;
  rows?: string;
  concurrency?: number;
  dryRun?: boolean;
  verbose?: boolean;
  overwrite?: boolean;
  watch?: boolean;
  interval?: number;
  report?: boolean;
  port?: number;
}

export interface IVerifyCommand {
  /**
   * Execute the verify command
   * @param options Command options (from CLI or interactive prompts)
   */
  execute(options: VerifyOptions): Promise<void>;
}
