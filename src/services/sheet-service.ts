/**
 * Google Sheets Service
 * Handles authentication, reading, and writing to Google Sheets
 */

import { google } from 'googleapis';
import {
  ISheetService,
  SheetPreview,
  CommentRecord,
  ColumnMapping,
  VerificationResult
} from '../types/index.js';

export class SheetService implements ISheetService {
  private sheets: any;
  private auth: any;

  /**
   * Initialize service with service account credentials (T017)
   */
  async initialize(credentialsPath: string): Promise<void> {
    try {
      this.auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await this.auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: authClient });
    } catch (error) {
      throw new Error(
        `Failed to initialize Google Sheets service: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse sheet ID from Google Sheet URL (T018)
   */
  parseSheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheet URL format');
    }
    return match[1];
  }

  /**
   * Get preview of sheet data for column selection (T019)
   */
  async getPreview(sheetUrl: string, sheetName?: string): Promise<SheetPreview> {
    const sheetId = this.parseSheetId(sheetUrl);
    const range = sheetName ? `${sheetName}!A1:ZZ100` : 'A1:ZZ100';

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        throw new Error('Sheet is empty');
      }

      const headers = rows[0] || [];
      const sampleRows = rows.slice(1, 6); // Get first 5 data rows
      const columnLetters = this.generateColumnLetters(headers.length);

      return {
        headers,
        sampleRows,
        columnLetters,
        totalRows: rows.length - 1 // Exclude header
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch sheet preview: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Read all comment records from sheet (T020)
   */
  async readRecords(
    sheetUrl: string,
    mapping: ColumnMapping,
    rowRange?: { start: number; end: number }
  ): Promise<CommentRecord[]> {
    const sheetId = this.parseSheetId(sheetUrl);

    // Build range string
    const startRow = rowRange?.start || 2; // Start from row 2 (skip header)
    const endRow = rowRange?.end || 10000; // Read up to row 10000 if no end specified
    const range = `A${startRow}:ZZ${endRow}`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range
      });

      const rows = response.data.values || [];
      const records: CommentRecord[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = startRow + i;

        // Extract values from mapped columns
        const commentText = this.getCellValue(row, mapping.comment);
        const commentLink = this.getCellValue(row, mapping.link);
        const screenshotUrl = this.getCellValue(row, mapping.screenshot) || null;
        const linkResult = this.parseVerificationResult(
          this.getCellValue(row, mapping.linkResult)
        );
        const screenshotResult = this.parseVerificationResult(
          this.getCellValue(row, mapping.screenshotResult)
        );

        // Skip rows without required data
        if (!commentText || !commentLink) {
          continue;
        }

        records.push({
          rowNumber,
          commentText,
          commentLink,
          screenshotUrl,
          linkResult,
          screenshotResult
        });
      }

      return records;
    } catch (error) {
      throw new Error(
        `Failed to read records from sheet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write verification result to sheet (T021)
   */
  async writeResult(
    sheetUrl: string,
    rowNumber: number,
    column: string,
    value: VerificationResult
  ): Promise<void> {
    const sheetId = this.parseSheetId(sheetUrl);
    const range = `${column}${rowNumber}`;

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[value]]
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to write result to sheet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write multiple results in batch (T021)
   */
  async batchWriteResults(
    sheetUrl: string,
    updates: Array<{ rowNumber: number; column: string; value: VerificationResult }>
  ): Promise<void> {
    const sheetId = this.parseSheetId(sheetUrl);

    const data = updates.map(update => ({
      range: `${update.column}${update.rowNumber}`,
      values: [[update.value]]
    }));

    try {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          valueInputOption: 'RAW',
          data
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to batch write results: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Helper methods

  private getCellValue(row: string[], column: string): string {
    const index = this.columnLetterToIndex(column);
    return row[index] || '';
  }

  private columnLetterToIndex(letter: string): number {
    let index = 0;
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
  }

  private generateColumnLetters(count: number): string[] {
    const letters: string[] = [];
    for (let i = 0; i < count; i++) {
      letters.push(this.indexToColumnLetter(i));
    }
    return letters;
  }

  private indexToColumnLetter(index: number): string {
    let letter = '';
    let num = index;
    while (num >= 0) {
      letter = String.fromCharCode((num % 26) + 'A'.charCodeAt(0)) + letter;
      num = Math.floor(num / 26) - 1;
    }
    return letter;
  }

  private parseVerificationResult(value: string): VerificationResult | null {
    if (value === '1') return 1;
    if (value === '0') return 0;
    if (value === 'ERROR') return 'ERROR';
    return null;
  }
}
