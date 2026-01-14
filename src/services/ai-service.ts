/**
 * AI Service
 * Handles Gemini AI Vision API for image verification
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAIService } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';

export class AIService implements IAIService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  private lastCallTime: number = 0;
  private readonly minDelayBetweenCalls = 100; // 100ms rate limiting (T063)

  /**
   * Initialize service with Gemini API key (T034)
   */
  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      logger.debug('Gemini AI service initialized');
    } catch (error) {
      throw new Error(
        `Failed to initialize Gemini AI: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if API key is configured and valid (T035)
   */
  isConfigured(): boolean {
    return this.genAI !== null && this.model !== null;
  }

  /**
   * Verify if image contains specified text using Gemini Vision (T036)
   */
  async verifyImageContainsText(imageBuffer: Buffer, textToFind: string): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('AI service not initialized. Call initialize() first.');
    }

    // Rate limiting: ensure minimum delay between calls (T063)
    await this.enforceRateLimit();

    try {
      logger.debug('Verifying image with Gemini Vision API...');

      const result = await withRetry(
        async () => {
          const imagePart = {
            inlineData: {
              data: imageBuffer.toString('base64'),
              mimeType: 'image/jpeg'
            }
          };

          const prompt = `Does this image contain the following text (allowing for minor variations in formatting, spacing, or Vietnamese diacritics)?

Text to find: "${textToFind}"

Respond with ONLY "YES" if the text is present, or "NO" if it is not present. Do not include any explanation.`;

          const response = await this.model.generateContent([prompt, imagePart]);
          return response.response.text().trim().toUpperCase();
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          onRetry: (attempt, error) => {
            logger.debug(`Gemini API retry attempt ${attempt}: ${error.message}`);
          }
        }
      );

      const found = result.includes('YES');
      logger.debug(`Gemini Vision result: ${found ? 'FOUND' : 'NOT FOUND'}`);

      return found;
    } catch (error) {
      throw new Error(
        `Gemini Vision verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Enforce rate limiting between API calls (T063)
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;

    if (timeSinceLastCall < this.minDelayBetweenCalls) {
      const delay = this.minDelayBetweenCalls - timeSinceLastCall;
      logger.debug(`Rate limiting: waiting ${delay}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastCallTime = Date.now();
  }
}
