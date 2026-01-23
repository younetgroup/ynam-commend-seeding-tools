/**
 * Logging utilities with verbose mode support
 */

import chalk from 'chalk';

type LogType = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'verbose' | 'log';

interface LogMessage {
  type: LogType;
  message: string;
  data?: any;
}

type LogListener = (log: LogMessage) => void;

class Logger {
  private verboseMode: boolean = false;
  private listeners: LogListener[] = [];

  setVerbose(enabled: boolean): void {
    this.verboseMode = enabled;
  }

  isVerbose(): boolean {
    return this.verboseMode;
  }

  addListener(listener: LogListener): void {
    this.listeners.push(listener);
  }

  removeListener(listener: LogListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private stripAnsi(string: string): string {
    // eslint-disable-next-line no-control-regex
    return string.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
  }

  private emit(type: LogType, message: string, data?: any): void {
    const cleanMessage = this.stripAnsi(message);
    this.listeners.forEach(listener => listener({ type, message: cleanMessage, data }));
  }

  /**
   * Log info message (always shown)
   */
  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
    this.emit('info', message);
  }

  /**
   * Log success message (always shown)
   */
  success(message: string): void {
    console.log(chalk.green('✓'), message);
    this.emit('success', message);
  }

  /**
   * Log warning message (always shown)
   */
  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
    this.emit('warn', message);
  }

  /**
   * Log error message (always shown)
   */
  error(message: string, error?: Error): void {
    console.error(chalk.red('✗'), message);
    if (error && this.verboseMode) {
      console.error(chalk.gray(error.stack || error.message));
    }
    this.emit('error', message, error);
  }

  /**
   * Log debug message (only in verbose mode)
   */
  debug(message: string): void {
    if (this.verboseMode) {
      console.log(chalk.gray('→'), chalk.gray(message));
      this.emit('debug', message);
    }
  }

  /**
   * Log verbose message (only in verbose mode)
   */
  verbose(message: string): void {
    if (this.verboseMode) {
      console.log(chalk.gray(message));
      this.emit('verbose', message);
    }
  }

  /**
   * Log plain message without formatting
   */
  log(message: string): void {
    console.log(message);
    this.emit('log', message);
  }

  /**
   * Print a blank line
   */
  blank(): void {
    console.log();
    this.emit('log', ''); // Treat blank as empty log
  }

  /**
   * Print a separator line
   */
  separator(): void {
    const line = '─'.repeat(50);
    console.log(chalk.gray(line));
    this.emit('log', line);
  }
}

// Export singleton instance
export const logger = new Logger();
