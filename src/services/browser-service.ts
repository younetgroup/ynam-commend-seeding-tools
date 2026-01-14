/**
 * Browser Service
 * Handles Chrome CDP connection via Playwright
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { IBrowserService } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class BrowserService implements IBrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Connect to Chrome via CDP on specified port (T022)
   */
  async connect(port: number = 9222): Promise<boolean> {
    try {
      logger.debug(`Attempting to connect to Chrome on port ${port}...`);

      // Try to connect with a timeout
      this.browser = await chromium.connectOverCDP(`http://localhost:${port}`, {
        timeout: 5000
      });

      const contexts = this.browser.contexts();

      if (contexts.length > 0) {
        this.context = contexts[0];
        const pages = this.context.pages();

        if (pages.length > 0) {
          this.page = pages[0];
        } else {
          this.page = await this.context.newPage();
        }
      } else {
        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
      }

      logger.debug('Successfully connected to Chrome');
      return true;
    } catch (error) {
      logger.debug(`Failed to connect to Chrome: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * Check if currently connected to Chrome (T023)
   */
  isConnected(): boolean {
    return this.browser !== null && this.page !== null;
  }

  /**
   * Navigate to URL and extract page text content (T024)
   */
  async getPageText(url: string): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not connected. Call connect() first.');
    }

    try {
      logger.debug(`Navigating to: ${url}`);

      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      // Wait a bit for dynamic content to load
      await this.page.waitForTimeout(2000);

      // Extract all visible text content
      const text = await this.page.evaluate(() => {
        // @ts-ignore - document is available in browser context
        return document.body.innerText || '';
      });

      logger.debug(`Extracted ${text.length} characters from page`);
      return text;
    } catch (error) {
      throw new Error(
        `Failed to get page text from ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Close connection and cleanup resources (T023)
   */
  async disconnect(): Promise<void> {
    try {
      if (this.page && !this.page.isClosed()) {
        // Note: Don't close pages from CDP connection as they belong to the user's browser
        this.page = null;
      }

      if (this.context) {
        this.context = null;
      }

      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }

      logger.debug('Disconnected from Chrome');
    } catch (error) {
      logger.debug(`Error during disconnect: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get instructions for starting Chrome with debugging
   */
  getSetupInstructions(): string {
    const platform = process.platform;

    let instructions = `
Chrome is not running with debugging enabled. To fix this:
`;

    if (platform === 'darwin') {
      instructions += `
EASY WAY (Recommended):
  Run the helper script:
    ./start-chrome-debug.sh

MANUAL WAY:
  1. Close ALL Chrome windows completely (Check Activity Monitor if needed)
  2. Run this command in a new terminal window:
     /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
       --remote-debugging-port=9222 \\
       --user-data-dir="$HOME/.chrome-debug-profile"
  3. Log into Facebook in the Chrome window that opens
     (This is a separate profile - you'll need to login again)
  4. Run this command again

VERIFY IT'S WORKING:
  In a new terminal, run: curl http://localhost:9222/json/version
  You should see Chrome version info.

Note: Chrome requires a separate profile for debugging. You MUST use the Chrome window
      started with debugging enabled and log into Facebook there.
`;
    } else if (platform === 'win32') {
      instructions += `
1. Close ALL Chrome windows
2. Start Chrome with debugging:
   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" ^
     --remote-debugging-port=9222 ^
     --user-data-dir="%USERPROFILE%\\.chrome-debug-profile"
3. Log into Facebook in the Chrome window (you'll need to login again)
4. Run this command again
`;
    } else {
      instructions += `
1. Close ALL Chrome windows
2. Start Chrome with debugging:
   google-chrome --remote-debugging-port=9222 \\
     --user-data-dir="$HOME/.chrome-debug-profile"
3. Log into Facebook in the Chrome window (you'll need to login again)
4. Run this command again
`;
    }

    return instructions.trim();
  }
}
