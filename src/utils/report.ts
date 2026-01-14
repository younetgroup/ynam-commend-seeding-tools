/**
 * HTML Report Generator
 * Creates detailed verification reports in HTML format
 */

import fs from 'fs';
import path from 'path';
import { CommentRecord, VerificationSession } from '../types/index.js';
import { logger } from './logger.js';

/**
 * T054-T057: Generate HTML report with summary, details, and visualizations
 */
export async function generateHtmlReport(
  records: CommentRecord[],
  session: Partial<VerificationSession>,
  outputPath?: string
): Promise<string> {
  const filePath = outputPath || `verification-report-${Date.now()}.html`;

  // Calculate statistics
  const linkPassed = records.filter(r => r.linkResult === 1).length;
  const linkFailed = records.filter(r => r.linkResult === 0).length;
  const linkErrors = records.filter(r => r.linkResult === 'ERROR').length;

  const screenshotRecords = records.filter(r => r.screenshotResult !== null);
  const screenshotPassed = screenshotRecords.filter(r => r.screenshotResult === 1).length;
  const screenshotFailed = screenshotRecords.filter(r => r.screenshotResult === 0).length;
  const screenshotErrors = screenshotRecords.filter(r => r.screenshotResult === 'ERROR').length;

  // Generate HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YNAM Comment Verification Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
    }

    h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .timestamp {
      opacity: 0.9;
      font-size: 14px;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
    }

    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 5px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: bold;
      color: #111827;
    }

    .stat-pass { color: #10b981; }
    .stat-fail { color: #ef4444; }
    .stat-error { color: #f59e0b; }

    .chart-section {
      padding: 30px;
    }

    .chart-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }

    .charts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }

    .chart {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .chart h3 {
      font-size: 16px;
      margin-bottom: 15px;
      color: #374151;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bar-label {
      width: 80px;
      font-size: 14px;
      color: #6b7280;
    }

    .bar-container {
      flex: 1;
      height: 30px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
    }

    .bar-fill {
      height: 100%;
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 10px;
      color: white;
      font-size: 14px;
      font-weight: 600;
    }

    .bar-pass { background: #10b981; }
    .bar-fail { background: #ef4444; }
    .bar-error { background: #f59e0b; }

    .details-section {
      padding: 30px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }

    tr:hover {
      background: #f9fafb;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pass {
      background: #d1fae5;
      color: #065f46;
    }

    .status-fail {
      background: #fee2e2;
      color: #991b1b;
    }

    .status-error {
      background: #fef3c7;
      color: #92400e;
    }

    .comment-text {
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    footer {
      padding: 20px 30px;
      background: #f9fafb;
      color: #6b7280;
      font-size: 14px;
      text-align: center;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>📊 YNAM Comment Verification Report</h1>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
      ${session.sheetUrl ? `<div class="timestamp">Sheet: ${session.sheetUrl}</div>` : ''}
    </header>

    <!-- T055: Summary Statistics Section -->
    <div class="summary">
      <div class="stat-card">
        <div class="stat-label">Total Records</div>
        <div class="stat-value">${records.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Link Verification</div>
        <div class="stat-value stat-pass">${linkPassed}</div>
        <div class="stat-label">Passed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Link Verification</div>
        <div class="stat-value stat-fail">${linkFailed}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Errors</div>
        <div class="stat-value stat-error">${linkErrors}</div>
        <div class="stat-label">Total Errors</div>
      </div>
    </div>

    <!-- T057: Pass/Fail/Error Chart Visualization -->
    <div class="chart-section">
      <h2 class="chart-title">Verification Results</h2>
      <div class="charts">
        <div class="chart">
          <h3>Link Verification</h3>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-label">Passed</div>
              <div class="bar-container">
                <div class="bar-fill bar-pass" style="width: ${records.length > 0 ? (linkPassed / records.length * 100) : 0}%">
                  ${linkPassed}
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Failed</div>
              <div class="bar-container">
                <div class="bar-fill bar-fail" style="width: ${records.length > 0 ? (linkFailed / records.length * 100) : 0}%">
                  ${linkFailed}
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Errors</div>
              <div class="bar-container">
                <div class="bar-fill bar-error" style="width: ${records.length > 0 ? (linkErrors / records.length * 100) : 0}%">
                  ${linkErrors}
                </div>
              </div>
            </div>
          </div>
        </div>

        ${screenshotRecords.length > 0 ? `
        <div class="chart">
          <h3>Screenshot Verification</h3>
          <div class="bar-chart">
            <div class="bar-row">
              <div class="bar-label">Passed</div>
              <div class="bar-container">
                <div class="bar-fill bar-pass" style="width: ${screenshotRecords.length > 0 ? (screenshotPassed / screenshotRecords.length * 100) : 0}%">
                  ${screenshotPassed}
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Failed</div>
              <div class="bar-container">
                <div class="bar-fill bar-fail" style="width: ${screenshotRecords.length > 0 ? (screenshotFailed / screenshotRecords.length * 100) : 0}%">
                  ${screenshotFailed}
                </div>
              </div>
            </div>
            <div class="bar-row">
              <div class="bar-label">Errors</div>
              <div class="bar-container">
                <div class="bar-fill bar-error" style="width: ${screenshotRecords.length > 0 ? (screenshotErrors / screenshotRecords.length * 100) : 0}%">
                  ${screenshotErrors}
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- T056: Detailed Row-by-Row Results Table -->
    <div class="details-section">
      <h2 class="chart-title">Detailed Results</h2>
      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>Comment Text</th>
            <th>Link Result</th>
            ${screenshotRecords.length > 0 ? '<th>Screenshot Result</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${records.map(record => `
            <tr>
              <td>${record.rowNumber}</td>
              <td class="comment-text" title="${escapeHtml(record.commentText)}">
                ${escapeHtml(record.commentText)}
              </td>
              <td>
                <span class="status-badge status-${getStatusClass(record.linkResult)}">
                  ${formatResult(record.linkResult)}
                </span>
              </td>
              ${screenshotRecords.length > 0 ? `
                <td>
                  ${record.screenshotResult !== null ? `
                    <span class="status-badge status-${getStatusClass(record.screenshotResult)}">
                      ${formatResult(record.screenshotResult)}
                    </span>
                  ` : '-'}
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <footer>
      Generated by YNAM Comment Verification Tool
    </footer>
  </div>
</body>
</html>`;

  // Write HTML file
  fs.writeFileSync(filePath, html, 'utf-8');
  logger.info(`Report saved to: ${path.resolve(filePath)}`);

  return filePath;
}

// Helper functions
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getStatusClass(result: number | string | null): string {
  if (result === 1) return 'pass';
  if (result === 0) return 'fail';
  if (result === 'ERROR') return 'error';
  return 'unknown';
}

function formatResult(result: number | string | null): string {
  if (result === 1) return 'Pass';
  if (result === 0) return 'Fail';
  if (result === 'ERROR') return 'Error';
  return 'N/A';
}
