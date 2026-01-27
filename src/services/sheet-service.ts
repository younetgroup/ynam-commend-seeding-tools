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
   * Parse gid (sheet tab ID) from Google Sheet URL
   * Returns null if no gid is specified (use first sheet)
   */
  parseGid(url: string): number | null {
    // Try to match gid from query params or hash
    const gidMatch = url.match(/[?&#]gid=(\d+)/);
    if (gidMatch) {
      return parseInt(gidMatch[1], 10);
    }
    return null;
  }

  /**
   * Get sheet name by gid (sheet ID within spreadsheet)
   * Returns the sheet title for the given gid, or first sheet's title if gid is null
   */
  async getSheetNameByGid(spreadsheetId: string, gid: number | null): Promise<string> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
      });

      const sheets = response.data.sheets || [];
      if (sheets.length === 0) {
        throw new Error('No sheets found in spreadsheet');
      }

      // If no gid specified, return first sheet name
      if (gid === null) {
        return sheets[0].properties.title;
      }

      // Find sheet by gid
      const targetSheet = sheets.find((s: any) => s.properties.sheetId === gid);
      if (!targetSheet) {
        throw new Error(`Sheet with gid ${gid} not found. Available sheets: ${sheets.map((s: any) => `${s.properties.title} (gid=${s.properties.sheetId})`).join(', ')}`);
      }

      return targetSheet.properties.title;
    } catch (error) {
      throw new Error(
        `Failed to get sheet name: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get preview of sheet data for column selection (T019)
   * Automatically resolves sheet name from gid in URL
   */
  async getPreview(sheetUrl: string, sheetName?: string): Promise<SheetPreview> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // If no sheet name provided, resolve from gid in URL
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    const range = `'${resolvedSheetName}'!A1:ZZ100`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range
      });

      const rows = response.data.values || [];
      if (rows.length === 0) {
        throw new Error('Sheet is empty');
      }

      // Get raw first 3 rows for header selection
      const row1 = rows[0] || [];
      const row2 = rows[1] || [];
      const row3 = rows[2] || [];

      const headers = rows[0] || [];
      const sampleRows = rows.slice(1, 6); // Get first 5 data rows

      // Find the maximum number of columns across all rows (not just header)
      // This ensures we show all columns even if header row has empty cells
      const maxColumns = Math.max(...rows.map((row: any[]) => row.length));
      const columnLetters = this.generateColumnLetters(maxColumns);

      return {
        headers,
        sampleRows,
        columnLetters,
        totalRows: rows.length - 1, // Exclude header
        row1,
        row2,
        row3,
        sheetName: resolvedSheetName // Include resolved sheet name for later use
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch sheet preview: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Read all comment records from sheet (T020)
   * @param sheetName - Optional sheet name (tab name) to read from
   */
  async readRecords(
    sheetUrl: string,
    mapping: ColumnMapping,
    rowRange?: { start: number; end: number },
    sheetName?: string,
    headerRow: number = 1
  ): Promise<CommentRecord[]> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // Resolve sheet name if not provided
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    // Build range string with sheet name
    const startRow = rowRange?.start || (headerRow + 1); // Start after header
    const endRow = rowRange?.end || 10000; // Read up to row 10000 if no end specified
    const range = `'${resolvedSheetName}'!A${startRow}:ZZ${endRow}`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
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
   * @param sheetName - Optional sheet name (tab name) to write to
   */
  async writeResult(
    sheetUrl: string,
    rowNumber: number,
    column: string,
    value: VerificationResult,
    sheetName?: string
  ): Promise<void> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // Resolve sheet name if not provided
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    const range = `'${resolvedSheetName}'!${column}${rowNumber}`;

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
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
   * @param sheetName - Optional sheet name (tab name) to write to
   */
  async batchWriteResults(
    sheetUrl: string,
    updates: Array<{ rowNumber: number; column: string; value: VerificationResult }>,
    sheetName?: string
  ): Promise<void> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // Resolve sheet name if not provided
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    const data = updates.map(update => ({
      range: `'${resolvedSheetName}'!${update.column}${update.rowNumber}`,
      values: [[update.value]]
    }));

    try {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: spreadsheetId,
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

  /**
   * Read a single column from the sheet
   * Returns array of {row, text} for duplication detection
   * @param sheetName - Optional sheet name (tab name) to read from
   */
  async readColumn(
    sheetUrl: string,
    column: string,
    rowRange?: { start: number; end: number },
    sheetName?: string,
    headerRow: number = 1
  ): Promise<Array<{ row: number; text: string }>> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // Resolve sheet name if not provided
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    // Build range string with sheet name
    const startRow = rowRange?.start || (headerRow + 1); // Start after header
    const endRow = rowRange?.end || 10000; // Read up to row 10000 if no end specified
    const range = `'${resolvedSheetName}'!${column}${startRow}:${column}${endRow}`;

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range
      });

      const rows = response.data.values || [];
      const result: Array<{ row: number; text: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const text = rows[i][0] || '';
        const rowNumber = startRow + i;

        // Skip empty cells
        if (text.trim()) {
          result.push({
            row: rowNumber,
            text: text.trim()
          });
        }
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to read column from sheet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Write cluster IDs to a column
   * Takes a map of row number -> cluster ID
   * @param sheetName - Optional sheet name (tab name) to write to
   */
  async writeColumn(
    sheetUrl: string,
    column: string,
    data: Map<number, number>,
    sheetName?: string
  ): Promise<void> {
    const formattedData = new Map<number, string>();
    data.forEach((clusterId, rowNumber) => {
      formattedData.set(rowNumber, `Cluster ${clusterId}`);
    });

    return this.batchWriteColumnData(sheetUrl, column, formattedData, sheetName);
  }

  /**
   * Write generic string data to a column in batch
   * Takes a map of row number -> string value
   * @param sheetUrl - Google Sheet URL
   * @param column - Column letter (e.g., "S")
   * @param data - Map of row number to string value
   * @param sheetName - Optional sheet name (tab name) to write to
   */
  async batchWriteColumnData(
    sheetUrl: string,
    column: string,
    data: Map<number, string>,
    sheetName?: string
  ): Promise<void> {
    const spreadsheetId = this.parseSheetId(sheetUrl);

    // Resolve sheet name if not provided
    let resolvedSheetName = sheetName;
    if (!resolvedSheetName) {
      const gid = this.parseGid(sheetUrl);
      resolvedSheetName = await this.getSheetNameByGid(spreadsheetId, gid);
    }

    // Convert map to batch update format with sheet name
    const updates = Array.from(data.entries()).map(([rowNumber, value]) => ({
      range: `'${resolvedSheetName}'!${column}${rowNumber}`,
      values: [[value]]
    }));

    try {
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to write column data to sheet: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
