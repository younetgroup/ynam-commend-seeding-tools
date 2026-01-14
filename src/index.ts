#!/usr/bin/env node

/**
 * YNAM Comment Verification Tool - CLI Entry Point
 * T059: Comprehensive error messages with exit codes
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { logger } from './utils/logger.js';
import { VerifyCommand } from './commands/verify.js';

// Load environment variables
config();

// Exit codes
const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CONFIG_ERROR: 2,
  CONNECTION_ERROR: 3,
  VALIDATION_ERROR: 4,
  AUTHENTICATION_ERROR: 5
};

const program = new Command();

program
  .name('ynam-tools')
  .description('CLI tool for verifying Facebook comments via Google Sheets')
  .version('1.0.0');

// Verify command
program
  .command('verify')
  .description('Verify Facebook comments from Google Sheet')
  .option('--sheet <url>', 'Google Sheet URL')
  .option('--comment-col <column>', 'Column letter for comment text (e.g., L)')
  .option('--link-col <column>', 'Column letter for comment link (e.g., N)')
  .option('--screenshot-col <column>', 'Column letter for screenshot URL (e.g., O)')
  .option('--link-result-col <column>', 'Column letter for link verification result (e.g., Q)')
  .option('--screenshot-result-col <column>', 'Column letter for screenshot result (e.g., R)')
  .option('--rows <range>', 'Row range to process (e.g., 10-50)')
  .option('--concurrency <number>', 'Number of parallel verifications', '1')
  .option('--dry-run', 'Preview without making changes', false)
  .option('--verbose', 'Show detailed per-row status', false)
  .option('--overwrite', 'Overwrite existing results', false)
  .option('--watch', 'Watch mode: continuously process new rows', false)
  .option('--interval <minutes>', 'Watch mode polling interval in minutes', '5')
  .option('--report', 'Generate HTML report after completion', false)
  .option('--port <number>', 'Chrome debugging port', '9222')
  .action(async (options) => {
    try {
      // Set verbose mode for logger
      logger.setVerbose(options.verbose);

      // Parse numeric options
      const parsedOptions = {
        ...options,
        concurrency: parseInt(options.concurrency, 10),
        interval: parseInt(options.interval, 10),
        port: parseInt(options.port, 10)
      };

      // Execute verify command
      const verifyCommand = new VerifyCommand();
      await verifyCommand.run(parsedOptions);
      process.exit(EXIT_CODES.SUCCESS);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const message = err.message.toLowerCase();

      // Determine exit code based on error type
      let exitCode = EXIT_CODES.GENERAL_ERROR;

      if (message.includes('environment variable') || message.includes('api key') || message.includes('credentials')) {
        exitCode = EXIT_CODES.CONFIG_ERROR;
        logger.error('Configuration Error:', err);
        logger.info('Hint: Check your .env file and ensure GEMINI_API_KEY and GOOGLE_SERVICE_ACCOUNT_PATH are set correctly');
      } else if (message.includes('connect') || message.includes('chrome') || message.includes('browser')) {
        exitCode = EXIT_CODES.CONNECTION_ERROR;
        logger.error('Connection Error:', err);
        logger.info('Hint: Make sure Chrome is running with --remote-debugging-port=9222');
      } else if (message.includes('invalid') || message.includes('validation') || message.includes('format')) {
        exitCode = EXIT_CODES.VALIDATION_ERROR;
        logger.error('Validation Error:', err);
        logger.info('Hint: Check your input parameters and sheet configuration');
      } else if (message.includes('permission') || message.includes('unauthorized') || message.includes('authentication')) {
        exitCode = EXIT_CODES.AUTHENTICATION_ERROR;
        logger.error('Authentication Error:', err);
        logger.info('Hint: Verify your service account has access to the Google Sheet');
      } else {
        logger.error('Command failed:', err);
      }

      process.exit(exitCode);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
