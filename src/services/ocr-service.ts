/**
 * OCR Service
 * Handles text extraction from images using Tesseract.js
 */

import Tesseract from 'tesseract.js';
import { IOCRService, OCRResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class OCRService implements IOCRService {
  private worker: Tesseract.Worker | null = null;
  private ready: boolean = false;

  /**
   * Initialize OCR worker
   */
  private async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }

    try {
      logger.debug('Initializing Tesseract OCR worker...');
      this.worker = await Tesseract.createWorker('vie+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      this.ready = true;
      logger.debug('OCR worker initialized successfully');
    } catch (error) {
      throw new Error(
        `Failed to initialize OCR worker: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract text from image using Tesseract OCR (T032)
   */
  async extractText(imageBuffer: Buffer, languages: string = 'vie+eng'): Promise<OCRResult> {
    // Ensure worker is initialized
    if (!this.ready) {
      await this.initialize();
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized');
    }

    try {
      logger.debug('Extracting text from image with OCR...');

      const result = await this.worker.recognize(imageBuffer);

      const text = result.data.text || '';
      const confidence = result.data.confidence || 0;

      logger.debug(`OCR extracted ${text.length} characters with ${confidence.toFixed(1)}% confidence`);

      return {
        text,
        confidence
      };
    } catch (error) {
      throw new Error(
        `OCR text extraction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if OCR engine is initialized and ready (T033)
   */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * Terminate OCR worker and free resources (T033)
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
        this.worker = null;
        this.ready = false;
        logger.debug('OCR worker terminated');
      } catch (error) {
        logger.debug(`Error terminating OCR worker: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}
