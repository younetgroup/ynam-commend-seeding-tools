/**
 * Verify command - Main verification workflow
 * Implements interactive verification session for Facebook comments
 */

import inquirer from 'inquirer';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { VerifyOptions, CommentRecord, ColumnMapping, VerificationResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { configService } from '../utils/config.js';
import { textMatcher } from '../utils/text-matcher.js';
import { SheetService } from '../services/sheet-service.js';
import { BrowserService } from '../services/browser-service.js';
import { OCRService } from '../services/ocr-service.js';
import { AIService } from '../services/ai-service.js';
import { downloadImage, convertToDirectImageUrl } from '../utils/image.js';
import { generateHtmlReport } from '../utils/report.js';

interface ScreenshotCache {
  url: string;
  extractedText: string;
  timestamp: number;
}

export class VerifyCommand extends BaseCommand<VerifyOptions> {
  private sheetService: SheetService;
  private browserService: BrowserService;
  private ocrService: OCRService;
  private aiService: AIService;
  private screenshotCache: ScreenshotCache | null = null;
  private stopped: boolean = false;

  constructor() {
    super();
    this.sheetService = new SheetService();
    this.browserService = new BrowserService();
    this.ocrService = new OCRService();
    this.aiService = new AIService();
  }

  stop(): void {
    this.stopped = true;
    logger.warn('Stopping verification...');
  }

  async execute(options: VerifyOptions): Promise<void> {
    try {
      // Initialize services early (needed for getPreview in getConfiguration)
      await this.initializeServices();

      // T025: Interactive prompts for sheet URL and column selection
      const config = await this.getConfiguration(options);

      // Dry run mode (T052 - added for completeness)
      if (options.dryRun) {
        await this.runDryRun(config);
        return;
      }

      // Connect to Chrome (T042, T043)
      let connected = await this.browserService.connect(config.port);
      if (!connected) {
        logger.error('Failed to connect to Chrome');
        logger.log('\n' + this.browserService.getSetupInstructions());

        // T043: Prompt to retry after user confirms Chrome setup
        const { retry } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'retry',
            message: 'Have you started Chrome with debugging? Retry connection?',
            default: true
          }
        ]);

        if (retry) {
          connected = await this.browserService.connect(config.port);
          if (!connected) {
            logger.error('Still unable to connect to Chrome. Please check the setup instructions.');
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }

      logger.success('Connected to Chrome successfully');

      // T047-T049: Watch mode implementation
      if (options.watch) {
        await this.runWatchMode(config, options);
      } else {
        await this.runSingleVerification(config, options);
      }

      // Cleanup
      await this.browserService.disconnect();
      await this.ocrService.terminate();
      logger.success('Verification complete!');

      // Save configuration for next time
      if (await this.promptSaveConfig()) {
        configService.save({
          lastSheet: config.sheetUrl,
          columnMapping: config.columnMapping,
          concurrency: config.concurrency,
          port: config.port
        });
        logger.success('Configuration saved to .ynam-tools.json');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error(`Verification failed: ${err.message}`, err);
      await this.browserService.disconnect();
      await this.ocrService.terminate();
      throw err; // Re-throw to let index.ts handle exit code
    }
  }

  /**
   * T025: Get configuration via interactive prompts or CLI options
   */
  private async getConfiguration(options: VerifyOptions): Promise<any> {
    const savedConfig = configService.load();

    // Check if we have a complete saved configuration
    const hasCompleteConfig = savedConfig?.lastSheet && savedConfig?.columnMapping;

    if (hasCompleteConfig && !options.sheet) {
      // Display saved configuration details
      const mapping = savedConfig!.columnMapping!;

      logger.blank();
      logger.log(chalk.bold.cyan('📋 Previous Configuration Found:'));
      logger.log(chalk.gray('─'.repeat(60)));
      logger.log(`${chalk.bold('Sheet URL:')}`);
      logger.log(`  ${chalk.cyan(savedConfig!.lastSheet!)}`);
      logger.log('');
      logger.log(`${chalk.bold('Column Mapping:')}`);
      logger.log(`  Comment text:      ${chalk.cyan(mapping.comment)}`);
      logger.log(`  Comment link:      ${chalk.cyan(mapping.link)}`);
      if (mapping.screenshot) {
        logger.log(`  Screenshot URL:    ${chalk.cyan(mapping.screenshot)}`);
      }
      logger.log(`  Link result:       ${chalk.cyan(mapping.linkResult)}`);
      if (mapping.screenshotResult) {
        logger.log(`  Screenshot result: ${chalk.cyan(mapping.screenshotResult)}`);
      }
      if (savedConfig!.concurrency && savedConfig!.concurrency > 1) {
        logger.log(`  Concurrency:       ${chalk.cyan(savedConfig!.concurrency)}`);
      }
      if (savedConfig!.port && savedConfig!.port !== 9222) {
        logger.log(`  Chrome port:       ${chalk.cyan(savedConfig!.port)}`);
      }
      logger.log(chalk.gray('─'.repeat(60)));
      logger.blank();

      const { useLastConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'useLastConfig',
          message: 'Load this previous configuration?',
          default: true
        }
      ]);

      if (useLastConfig) {
        logger.success('Loading previous configuration...');
        return {
          sheetUrl: savedConfig!.lastSheet!,
          columnMapping: mapping,
          rowRange: undefined,
          concurrency: options.concurrency || savedConfig!.concurrency || 1,
          port: options.port || savedConfig!.port || 9222
        };
      }
    }

    // Manual configuration flow
    let sheetUrl = options.sheet;

    if (!sheetUrl) {
      const { url } = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter Google Sheet URL:',
          validate: (input) => input.length > 0 || 'Sheet URL is required'
        }
      ]);
      sheetUrl = url;
    }

    // Ensure we have a sheet URL at this point
    if (!sheetUrl) {
      throw new Error('Sheet URL is required');
    }

    // Get sheet preview for column selection
    logger.info('Loading sheet preview...');
    const preview = await this.sheetService.getPreview(sheetUrl);

    logger.log('\nSheet Preview:');
    logger.log(chalk.gray(`Total rows: ${preview.totalRows}`));
    logger.log(chalk.gray(`Columns: ${preview.columnLetters.join(', ')}`));
    logger.log('\nHeaders:');
    preview.headers.forEach((header, i) => {
      logger.log(`  ${chalk.cyan(preview.columnLetters[i])}: ${header}`);
    });

    // Column mapping
    let columnMapping: ColumnMapping;

    if (options.commentCol && options.linkCol && options.linkResultCol) {
      columnMapping = {
        comment: options.commentCol,
        link: options.linkCol,
        screenshot: options.screenshotCol || '',
        linkResult: options.linkResultCol,
        screenshotResult: options.screenshotResultCol || ''
      };
    } else {
      columnMapping = await this.promptColumnMapping();
    }

    // Row range (T030)
    let rowRange: { start: number; end: number } | undefined;
    if (options.rows) {
      const match = options.rows.match(/^(\d+)-(\d+)$/);
      if (match) {
        rowRange = {
          start: parseInt(match[1], 10),
          end: parseInt(match[2], 10)
        };
      }
    }

    return {
      sheetUrl,
      columnMapping,
      rowRange,
      concurrency: options.concurrency || savedConfig?.concurrency || 1,
      port: options.port || savedConfig?.port || 9222,
      dryRun: options.dryRun || false,
      headerRow: options.headerRow
    };
  }

  /**
   * Prompt for column mapping
   */
  private async promptColumnMapping(): Promise<ColumnMapping> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'comment',
        message: 'Comment text column (e.g., L):',
        validate: (input) => /^[A-Z]+$/.test(input) || 'Enter a valid column letter'
      },
      {
        type: 'input',
        name: 'link',
        message: 'Comment link column (e.g., N):',
        validate: (input) => /^[A-Z]+$/.test(input) || 'Enter a valid column letter'
      },
      {
        type: 'input',
        name: 'screenshot',
        message: 'Screenshot URL column (optional, press Enter to skip):',
        default: ''
      },
      {
        type: 'input',
        name: 'linkResult',
        message: 'Link result output column (e.g., Q):',
        validate: (input) => /^[A-Z]+$/.test(input) || 'Enter a valid column letter'
      },
      {
        type: 'input',
        name: 'screenshotResult',
        message: 'Screenshot result output column (optional):',
        default: ''
      }
    ]);

    return answers as ColumnMapping;
  }

  /**
   * Initialize services with credentials
   */
  private async initializeServices(): Promise<void> {
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    if (!credentialsPath) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set');
    }

    logger.info('Initializing Google Sheets service...');
    await this.sheetService.initialize(credentialsPath);
    logger.success('Google Sheets service initialized');
  }

  /**
   * T030: Filter records based on row range
   */
  private filterRecords(records: CommentRecord[], options: VerifyOptions): CommentRecord[] {
    if (!options.rows) {
      return records;
    }

    const match = options.rows.match(/^(\d+)-(\d+)$/);
    if (!match) {
      return records;
    }

    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);

    return records.filter(r => r.rowNumber >= start && r.rowNumber <= end);
  }

  /**
   * Find screenshot URL for merged rows (look back at previous rows)
   */
  private findScreenshotUrlForMergedRow(
    records: CommentRecord[],
    currentIndex: number
  ): string | null {
    // Look back at previous rows to find a screenshot URL
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (records[i].screenshotUrl) {
        logger.debug(`Row ${records[currentIndex].rowNumber}: Using merged screenshot from row ${records[i].rowNumber}`);
        return records[i].screenshotUrl;
      }
    }
    return null;
  }

  /**
   * T026: Verify records using browser service
   * T027: Progress bar display
   * T029: Verbose mode
   * T031: Concurrency support
   */
  private async verifyRecords(
    records: CommentRecord[],
    config: any,
    options: VerifyOptions
  ): Promise<void> {
    const progressBar = new cliProgress.SingleBar(
      {
        format: 'Progress |' + chalk.cyan('{bar}') + '| {percentage}% | {value}/{total} records',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
      },
      cliProgress.Presets.shades_classic
    );

    if (!options.verbose) {
      progressBar.start(records.length, 0);
    }

    // T031: Concurrency support (for now, sequential - parallel can be added later)
    for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
      if (this.stopped) {
        logger.warn('Verification stopped by user.');
        break;
      }

      const record = records[recordIndex];
      try {
        // T026: Verify link - skip if not a valid URL
        let linkResult: VerificationResult | null = null;

        if (record.commentLink && this.isValidUrl(record.commentLink)) {
          linkResult = await this.verifyLink(record);

          // Write link result to sheet
          await this.sheetService.writeResult(
            config.sheetUrl,
            record.rowNumber,
            config.columnMapping.linkResult,
            linkResult
          );

          // Update record with result
          record.linkResult = linkResult;
        } else {
          // Skip verification if link is not a valid URL
          logger.debug(`Row ${record.rowNumber}: Skipping link verification - not a valid URL`);
        }

        // T038: Verify screenshot if available
        if (config.columnMapping.screenshotResult) {
          let screenshotUrl = record.screenshotUrl;

          // Handle merged rows - if screenshot URL is empty, look back at previous rows
          if (!screenshotUrl) {
            screenshotUrl = this.findScreenshotUrlForMergedRow(records, recordIndex);
          }

          // Only proceed if screenshot URL is provided
          if (screenshotUrl && screenshotUrl.trim()) {
            try {
              const screenshotResult = await this.verifyScreenshot(record, screenshotUrl);

              // Write screenshot result to sheet
              await this.sheetService.writeResult(
                config.sheetUrl,
                record.rowNumber,
                config.columnMapping.screenshotResult,
                screenshotResult
              );

              record.screenshotResult = screenshotResult;
            } catch (screenshotError) {
              // Handle screenshot verification errors gracefully
              logger.debug(`Screenshot verification error for row ${record.rowNumber}: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`);

              // Write ERROR to sheet
              await this.sheetService.writeResult(
                config.sheetUrl,
                record.rowNumber,
                config.columnMapping.screenshotResult,
                'ERROR'
              );

              record.screenshotResult = 'ERROR';
            }
          } else {
            // Skip screenshot verification if URL is not provided
            logger.debug(`Row ${record.rowNumber}: Skipping screenshot verification - no URL provided`);
          }
        }

        // T029: Verbose output
        if (options.verbose) {
          const linkStatus = linkResult === 1 ? chalk.green('PASS') : linkResult === 0 ? chalk.red('FAIL') : chalk.yellow('ERROR');
          let output = `Row ${record.rowNumber}: Link ${linkStatus}`;

          if (record.screenshotResult !== null) {
            const screenshotStatus = record.screenshotResult === 1 ? chalk.green('PASS') : record.screenshotResult === 0 ? chalk.red('FAIL') : chalk.yellow('ERROR');
            output += ` | Screenshot ${screenshotStatus}`;
          }

          output += ` - ${record.commentText.substring(0, 50)}...`;
          logger.log(output);
        }
      } catch (error) {
        logger.error(`Error verifying row ${record.rowNumber}:`, error instanceof Error ? error : new Error(String(error)));
        record.linkResult = 'ERROR';
      }

      if (!options.verbose) {
        progressBar.increment();
      }
    }

    if (!options.verbose) {
      progressBar.stop();
    }
  }

  /**
   * T026: Verify a single link
   */
  private async verifyLink(record: CommentRecord): Promise<VerificationResult> {
    try {
      const pageText = await this.browserService.getPageText(record.commentLink);

      // Use text matcher to check if comment text is present
      const found = textMatcher.contains(pageText, record.commentText);

      return found ? 1 : 0;
    } catch (error) {
      logger.debug(`Failed to verify link: ${error instanceof Error ? error.message : String(error)}`);
      return 'ERROR';
    }
  }

  /**
   * T038-T040: Verify screenshot with OCR primary and AI fallback
   * Implements caching for merged rows (same screenshot URL used by multiple rows)
   */
  private async verifyScreenshot(record: CommentRecord, screenshotUrl: string): Promise<VerificationResult> {
    if (!screenshotUrl) {
      return 'ERROR';
    }

    try {
      // Convert image hosting service URLs to direct image URLs
      const directImageUrl = convertToDirectImageUrl(screenshotUrl);

      // Check if we have a cached result for this screenshot URL
      let extractedText: string | undefined;

      if (this.screenshotCache && this.screenshotCache.url === directImageUrl) {
        // Verify cache has valid content
        if (this.screenshotCache.extractedText && this.screenshotCache.extractedText.length > 0) {
          logger.debug(`Row ${record.rowNumber}: Using cached screenshot text (${this.screenshotCache.extractedText.length} chars)`);
          logger.verbose(
            `Row ${record.rowNumber}: Cached OCR text:\n${this.screenshotCache.extractedText}`
          );
          extractedText = this.screenshotCache.extractedText;
        } else {
          logger.debug(`Row ${record.rowNumber}: Cache exists but text is empty, re-processing screenshot`);
          // Cache is invalid, need to re-process
          this.screenshotCache = null;
        }
      }

      if (!extractedText) {
        // T040: Download screenshot image
        logger.debug(`Downloading screenshot for row ${record.rowNumber}...`);
        const imageBuffer = await downloadImage(directImageUrl);

        // Validate image buffer
        if (!imageBuffer || imageBuffer.length === 0) {
          logger.debug('Downloaded image is empty');
          return 'ERROR';
        }

        // Check if buffer looks like an image (basic validation)
        const isImage = this.validateImageBuffer(imageBuffer);
        if (!isImage) {
          logger.debug('Downloaded content does not appear to be a valid image');
          return 'ERROR';
        }

        // T038: Try OCR first
        logger.debug('Attempting OCR extraction...');
        let ocrResult;
        try {
          ocrResult = await this.ocrService.extractText(imageBuffer);
        } catch (ocrError) {
          logger.debug(`OCR failed: ${ocrError instanceof Error ? ocrError.message : String(ocrError)}`);

          // Try AI fallback if OCR fails completely
          if (this.aiService.isConfigured() || process.env.GEMINI_API_KEY) {
            logger.debug('Falling back to AI due to OCR error');
            if (!this.aiService.isConfigured()) {
              this.aiService.initialize(process.env.GEMINI_API_KEY!);
            }
            const found = await this.aiService.verifyImageContainsText(imageBuffer, record.commentText);

            // DON'T cache when using AI fallback from OCR error
            // (AI only returns true/false, not extracted text)
            // This means merged rows will re-download and re-process, but will work correctly
            logger.debug(`Row ${record.rowNumber}: AI used for verification, result not cached (merged rows will re-process)`);

            return found ? 1 : 0;
          }

          return 'ERROR';
        }

        logger.verbose(
          `Row ${record.rowNumber}: OCR text (${ocrResult.confidence.toFixed(1)}%):\n${ocrResult.text}`
        );

        // T039: Check if OCR confidence is above threshold (80%)
        if (ocrResult.confidence >= 80) {
          logger.debug(`OCR confidence ${ocrResult.confidence.toFixed(1)}% - using OCR result`);
          extractedText = ocrResult.text;
        } else {
          // T038: Fallback to AI if OCR confidence is low
          logger.debug(`OCR confidence ${ocrResult.confidence.toFixed(1)}% below threshold - falling back to AI`);

          // Initialize AI service if not already done
          if (!this.aiService.isConfigured()) {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
              logger.debug('GEMINI_API_KEY not set - cannot use AI fallback');
              // Use OCR result anyway if no AI available
              extractedText = ocrResult.text;
            } else {
              this.aiService.initialize(apiKey);
              const found = await this.aiService.verifyImageContainsText(imageBuffer, record.commentText);

              // Cache the AI result
              this.screenshotCache = {
                url: directImageUrl,
                extractedText: ocrResult.text, // Store OCR text even if we used AI
                timestamp: Date.now()
              };

              return found ? 1 : 0;
            }
          } else {
            const found = await this.aiService.verifyImageContainsText(imageBuffer, record.commentText);

            // Cache the AI result
            this.screenshotCache = {
              url: directImageUrl,
              extractedText: ocrResult.text, // Store OCR text even if we used AI
              timestamp: Date.now()
            };

            return found ? 1 : 0;
          }
        }

        // Cache the extracted text
        this.screenshotCache = {
          url: directImageUrl,
          extractedText: extractedText,
          timestamp: Date.now()
        };
      }

      // Use extracted text (either from cache or freshly extracted) to verify
      if (!extractedText) {
        logger.debug(`Row ${record.rowNumber}: No extracted text available for verification`);
        return 'ERROR';
      }

      logger.debug(`Row ${record.rowNumber}: Checking if comment text is in screenshot (${extractedText.length} chars)`);
      const found = textMatcher.contains(extractedText, record.commentText);
      logger.debug(`Row ${record.rowNumber}: Screenshot verification result = ${found ? 'PASS' : 'FAIL'}`);
      return found ? 1 : 0;
    } catch (error) {
      // T040: Handle download/processing errors
      logger.debug(`Failed to verify screenshot: ${error instanceof Error ? error.message : String(error)}`);
      return 'ERROR';
    }
  }

  /**
   * Check if string is a valid URL
   */
  private isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate if buffer contains a valid image by checking magic bytes
   */
  private validateImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 8) {
      return false;
    }

    // Check for common image format magic bytes
    const magicBytes = buffer.slice(0, 8);

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (magicBytes[0] === 0x89 && magicBytes[1] === 0x50 && magicBytes[2] === 0x4E && magicBytes[3] === 0x47) {
      return true;
    }

    // JPEG: FF D8 FF
    if (magicBytes[0] === 0xFF && magicBytes[1] === 0xD8 && magicBytes[2] === 0xFF) {
      return true;
    }

    // GIF: 47 49 46 38
    if (magicBytes[0] === 0x47 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x38) {
      return true;
    }

    // WebP: 52 49 46 46 ... 57 45 42 50
    if (magicBytes[0] === 0x52 && magicBytes[1] === 0x49 && magicBytes[2] === 0x46 && magicBytes[3] === 0x46) {
      if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return true;
      }
    }

    // BMP: 42 4D
    if (magicBytes[0] === 0x42 && magicBytes[1] === 0x4D) {
      return true;
    }

    return false;
  }

  /**
   * Run single verification pass
   */
  private async runSingleVerification(config: any, options: VerifyOptions): Promise<void> {
    // Read records from sheet
    logger.info('Reading records from Google Sheet...');
    const records = await this.sheetService.readRecords(
      config.sheetUrl,
      config.columnMapping,
      config.rowRange,
      undefined,
      options.headerRow
    );

    logger.info(`Found ${records.length} records to verify`);

    // T030: Filter records based on --rows flag
    const filteredRecords = this.filterRecords(records, options);

    // T045: Filter out already verified records (unless --overwrite is set)
    const recordsToVerify = options.overwrite
      ? filteredRecords
      : filteredRecords.filter(r => r.linkResult === null);

    const skippedCount = filteredRecords.length - recordsToVerify.length;
    if (skippedCount > 0) {
      logger.info(`Skipping ${skippedCount} already verified records (use --overwrite to reprocess)`);
    }

    if (recordsToVerify.length === 0) {
      logger.success('No records to verify');
      return;
    }

    // T026: Implement link verification logic
    // T027: Progress bar display
    // T029: Verbose mode with per-row status
    await this.verifyRecords(recordsToVerify, config, options);

    // T028: Summary output
    this.displaySummary(recordsToVerify);

    // T058: Generate HTML report if requested
    if (options.report) {
      logger.blank();
      logger.info('Generating HTML report...');
      const reportPath = await generateHtmlReport(recordsToVerify, {
        sheetUrl: config.sheetUrl,
        startTime: new Date(),
        endTime: new Date(),
        totalRows: records.length,
        processedRows: recordsToVerify.length,
        skippedRows: records.length - recordsToVerify.length,
        linkResults: {
          passed: recordsToVerify.filter(r => r.linkResult === 1).length,
          failed: recordsToVerify.filter(r => r.linkResult === 0).length,
          errors: recordsToVerify.filter(r => r.linkResult === 'ERROR').length
        },
        screenshotResults: {
          passed: recordsToVerify.filter(r => r.screenshotResult === 1).length,
          failed: recordsToVerify.filter(r => r.screenshotResult === 0).length,
          errors: recordsToVerify.filter(r => r.screenshotResult === 'ERROR').length
        }
      });
      logger.success(`Report generated: ${reportPath}`);
    }
  }

  /**
   * T047-T049: Run watch mode with polling
   */
  private async runWatchMode(config: any, options: VerifyOptions): Promise<void> {
    const interval = (options.interval || 5) * 60 * 1000; // Convert minutes to milliseconds
    let running = true;

    // T049: Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      logger.warn('\nReceived Ctrl+C, finishing current verification...');
      running = false;
    });

    logger.info(`Watch mode enabled - checking for new rows every ${options.interval || 5} minutes`);
    logger.info('Press Ctrl+C to stop');
    logger.blank();

    let iteration = 0;
    while (running) {
      iteration++;
      logger.info(`Watch iteration ${iteration} at ${new Date().toLocaleTimeString()}`);

      try {
        await this.runSingleVerification(config, options);
      } catch (error) {
        logger.error('Error during verification:', error instanceof Error ? error : new Error(String(error)));
      }

      if (running) {
        logger.info(`Waiting ${options.interval || 5} minutes until next check...`);
        logger.blank();

        // Wait for next interval
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    logger.info('Watch mode stopped');
  }

  /**
   * T028: Display summary statistics
   */
  private displaySummary(records: CommentRecord[]): void {
    const linkPassed = records.filter(r => r.linkResult === 1).length;
    const linkFailed = records.filter(r => r.linkResult === 0).length;
    const linkErrors = records.filter(r => r.linkResult === 'ERROR').length;

    const screenshotRecords = records.filter(r => r.screenshotResult !== null);
    const screenshotPassed = screenshotRecords.filter(r => r.screenshotResult === 1).length;
    const screenshotFailed = screenshotRecords.filter(r => r.screenshotResult === 0).length;
    const screenshotErrors = screenshotRecords.filter(r => r.screenshotResult === 'ERROR').length;

    logger.blank();
    logger.separator();
    logger.log(chalk.bold('Verification Summary:'));
    logger.log(chalk.bold('\nLink Verification:'));
    logger.log(`  ${chalk.green('✓ Passed')}: ${linkPassed}`);
    logger.log(`  ${chalk.red('✗ Failed')}: ${linkFailed}`);
    logger.log(`  ${chalk.yellow('⚠ Errors')}: ${linkErrors}`);
    logger.log(`  Total: ${records.length}`);

    if (screenshotRecords.length > 0) {
      logger.log(chalk.bold('\nScreenshot Verification:'));
      logger.log(`  ${chalk.green('✓ Passed')}: ${screenshotPassed}`);
      logger.log(`  ${chalk.red('✗ Failed')}: ${screenshotFailed}`);
      logger.log(`  ${chalk.yellow('⚠ Errors')}: ${screenshotErrors}`);
      logger.log(`  Total: ${screenshotRecords.length}`);
    }

    logger.separator();
  }

  /**
   * Prompt to save configuration
   */
  private async promptSaveConfig(): Promise<boolean> {
    const { save } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Save configuration for next time?',
        default: true
      }
    ]);

    return save;
  }

  /**
   * Run dry-run mode (preview without changes)
   */
  private async runDryRun(config: any): Promise<void> {
    logger.info('Running in dry-run mode (no changes will be made)');
    logger.blank();
    logger.log(chalk.bold('Configuration:'));
    logger.log(`  Sheet URL: ${config.sheetUrl}`);
    logger.log(`  Column Mapping:`);
    logger.log(`    Comment: ${config.columnMapping.comment}`);
    logger.log(`    Link: ${config.columnMapping.link}`);
    logger.log(`    Link Result: ${config.columnMapping.linkResult}`);
    if (config.rowRange) {
      logger.log(`  Row Range: ${config.rowRange.start}-${config.rowRange.end}`);
    }
    logger.blank();
    logger.success('Dry-run complete (no records processed)');
  }
}
