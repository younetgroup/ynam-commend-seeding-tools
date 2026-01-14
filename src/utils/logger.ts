/**
 * Logging utilities with verbose mode support
 */

import chalk from 'chalk';

class Logger {
  private verboseMode: boolean = false;

  setVerbose(enabled: boolean): void {
    this.verboseMode = enabled;
  }

  isVerbose(): boolean {
    return this.verboseMode;
  }

  /**
   * Log info message (always shown)
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * Log success message (always shown)
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  /**
   * Log warning message (always shown)
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * Log error message (always shown)
   */
  error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error && this.verboseMode) {
      console.error(chalk.gray(error.stack || error.message));
    }
  }

  /**
   * Log debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.verboseMode) {
      console.log(chalk.gray('→'), chalk.gray(message));
    }
  }

  /**
   * Log verbose message (only in verbose mode)
   */
  verbose(message: string): void {
    if (this.verboseMode) {
      console.log(chalk.gray(message));
    }
  }

  /**
   * Log plain message without formatting
   */
  log(message: string): void {
    console.log(message);
  }

  /**
   * Print a blank line
   */
  blank(): void {
    console.log();
  }

  /**
   * Print a separator line
   */
  separator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

// Export singleton instance
export const logger = new Logger();
