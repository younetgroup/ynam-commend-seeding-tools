/**
 * Image download utilities
 * Handles downloading images from URLs
 */

import https from 'https';
import http from 'http';
import { logger } from './logger.js';

/**
 * Download image from URL and return as Buffer (T037)
 */
export async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      logger.debug(`Downloading image from: ${url}`);

      const request = client.get(url, { timeout: 30000 }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            logger.debug(`Following redirect to: ${redirectUrl}`);
            downloadImage(redirectUrl).then(resolve).catch(reject);
            return;
          }
        }

        // Check for successful response
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: HTTP ${response.statusCode}`));
          return;
        }

        // Check content type
        const contentType = response.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
          logger.debug(`Warning: Content-Type is ${contentType}, expected image/*`);
        }

        // Collect data chunks
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          logger.debug(`Downloaded ${buffer.length} bytes`);
          resolve(buffer);
        });

        response.on('error', (error) => {
          reject(new Error(`Download error: ${error.message}`));
        });
      });

      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout after 30 seconds'));
      });

      request.on('error', (error) => {
        reject(new Error(`Request error: ${error.message}`));
      });
    } catch (error) {
      reject(new Error(`Invalid URL: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

/**
 * Validate if URL is likely an image
 */
export function isImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => path.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Convert common image hosting service URLs to direct image URLs
 */
export function convertToDirectImageUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // Gyazo: https://gyazo.com/ID -> https://i.gyazo.com/ID.png
    if (urlObj.hostname === 'gyazo.com') {
      const match = url.match(/gyazo\.com\/([a-f0-9]+)/);
      if (match) {
        const imageId = match[1];
        logger.debug(`Converting Gyazo URL to direct image: ${imageId}`);
        // Try .png first, will try .jpg as fallback if needed
        return `https://i.gyazo.com/${imageId}.png`;
      }
    }

    // Imgur: https://imgur.com/ID -> https://i.imgur.com/ID.jpg
    if (urlObj.hostname === 'imgur.com' && !urlObj.hostname.startsWith('i.')) {
      const match = url.match(/imgur\.com\/([a-zA-Z0-9]+)/);
      if (match) {
        const imageId = match[1];
        logger.debug(`Converting Imgur URL to direct image: ${imageId}`);
        return `https://i.imgur.com/${imageId}.jpg`;
      }
    }

    // Google Drive: Extract file ID and use direct download URL
    if (urlObj.hostname.includes('drive.google.com')) {
      const match = url.match(/\/file\/d\/([^\/]+)/);
      if (match) {
        const fileId = match[1];
        logger.debug(`Converting Google Drive URL to direct image: ${fileId}`);
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    // Dropbox: Add ?raw=1 or dl=1
    if (urlObj.hostname.includes('dropbox.com')) {
      logger.debug('Converting Dropbox URL to direct image');
      const newUrl = new URL(url);
      newUrl.searchParams.set('raw', '1');
      return newUrl.toString();
    }

    // Already a direct image URL or unknown service
    return url;
  } catch {
    // Invalid URL, return as-is
    return url;
  }
}
