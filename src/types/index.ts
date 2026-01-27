/**
 * Type definitions for YNAM Comment Verification Tool
 * Based on contracts/services.ts
 */

// ============================================================================
// Core Types
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
  row1: string[];
  row2: string[];
  row3?: string[];
  sheetName?: string;
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

export interface Configuration {
  lastSheet: string | null;
  columnMapping: ColumnMapping | null;
  concurrency: number;
  port: number;
}

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
  headerRow?: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface IBrowserService {
  connect(port?: number): Promise<boolean>;
  isConnected(): boolean;
  getPageText(url: string): Promise<string>;
  disconnect(): Promise<void>;
  getSetupInstructions(): string;
}

export interface ISheetService {
  initialize(credentialsPath: string): Promise<void>;
  getPreview(sheetUrl: string, sheetName?: string): Promise<SheetPreview>;
  readColumn(
    sheetUrl: string,
    column: string,
    rowRange?: { start: number; end: number },
    sheetName?: string,
    headerRow?: number
  ): Promise<Array<{ row: number; text: string }>>;
  readRecords(
    sheetUrl: string,
    mapping: ColumnMapping,
    rowRange?: { start: number; end: number },
    sheetName?: string,
    headerRow?: number
  ): Promise<CommentRecord[]>;
  writeResult(
    sheetUrl: string,
    rowNumber: number,
    column: string,
    value: VerificationResult
  ): Promise<void>;
  batchWriteResults(
    sheetUrl: string,
    updates: Array<{ rowNumber: number; column: string; value: VerificationResult }>
  ): Promise<void>;
  parseSheetId(url: string): string;
}

export interface IAIService {
  initialize(apiKey: string): void;
  verifyImageContainsText(imageBuffer: Buffer, textToFind: string): Promise<boolean>;
  isConfigured(): boolean;
}

export interface IOCRService {
  extractText(imageBuffer: Buffer, languages?: string): Promise<OCRResult>;
  isReady(): boolean;
  terminate(): Promise<void>;
}

export interface IConfigService {
  load(): Configuration | null;
  save(config: Configuration): void;
  exists(): boolean;
}

export interface ITextMatcher {
  normalize(text: string): string;
  contains(target: string, search: string): boolean;
}

export interface IVerifyCommand {
  execute(options: VerifyOptions): Promise<void>;
}

// ============================================================================
// Duplication Detection Types
// ============================================================================

export interface DupDetectorOptions {
  sheet?: string;
  commentCol?: string;
  clusterCol?: string;
  clusterRowsCol?: string;
  threshold?: number;
  rows?: string;
  dryRun?: boolean;
  verbose?: boolean;
  overwrite?: boolean;
  headerRow?: number;
}

export interface ClusterResult {
  clusterId: number;
  comments: Array<{
    row: number;
    text: string;
  }>;
  avgSimilarity: number;
}

export interface DupDetectionStats {
  totalComments: number;
  uniqueComments: number;
  duplicateClusters: number;
  largestClusterSize: number;
  threshold: number;
}
