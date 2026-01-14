/**
 * Text normalization and matching utilities
 * Handles Vietnamese text with diacritics, case-insensitive comparison
 */

import { ITextMatcher } from '../types/index.js';

class TextMatcher implements ITextMatcher {
  private readonly approxThreshold = 0.9;

  /**
   * Normalize text for comparison
   * - Lowercase
   * - Remove Vietnamese diacritics
   * - Normalize whitespace (including newlines)
   * - Remove punctuation
   */
  normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD') // Decompose combined characters
      .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
      .replace(/[đĐ]/g, 'd') // Handle special Vietnamese character
      .replace(/[\r\n]+/g, ' ') // Replace newlines with spaces
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if target text contains search text (normalized comparison)
   */
  contains(target: string, search: string): boolean {
    const normalizedTarget = this.normalize(target);
    const normalizedSearch = this.normalize(search);
    if (!normalizedSearch || !normalizedTarget) {
      return false;
    }

    if (normalizedTarget.includes(normalizedSearch)) {
      return true;
    }

    return this.approxContains(normalizedTarget, normalizedSearch);
  }

  private approxContains(target: string, search: string): boolean {
    const targetLen = target.length;
    const searchLen = search.length;

    if (searchLen === 0 || targetLen === 0) {
      return false;
    }

    // If the target is shorter, compare directly with similarity
    if (targetLen <= searchLen) {
      return this.isApproxMatch(target, search);
    }

    const maxDistance = Math.floor(searchLen * (1 - this.approxThreshold));
    const minLen = Math.max(1, searchLen - maxDistance);
    const maxLen = Math.min(targetLen, searchLen + maxDistance);

    for (let windowLen = minLen; windowLen <= maxLen; windowLen++) {
      const maxStart = targetLen - windowLen;
      for (let i = 0; i <= maxStart; i++) {
        const chunk = target.slice(i, i + windowLen);
        if (this.isApproxMatch(chunk, search)) {
          return true;
        }
      }
    }

    return false;
  }

  private isApproxMatch(a: string, b: string): boolean {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) {
      return true;
    }
    const maxDistance = Math.floor(maxLen * (1 - this.approxThreshold));
    if (maxDistance === 0) {
      return a === b;
    }
    return this.levenshteinDistanceBounded(a, b, maxDistance) <= maxDistance;
  }

  private levenshteinDistanceBounded(a: string, b: string, maxDistance: number): number {
    if (a === b) {
      return 0;
    }

    const aLen = a.length;
    const bLen = b.length;

    if (aLen === 0) {
      return bLen;
    }
    if (bLen === 0) {
      return aLen;
    }
    if (Math.abs(aLen - bLen) > maxDistance) {
      return maxDistance + 1;
    }

    let prev = new Array<number>(bLen + 1);
    let curr = new Array<number>(bLen + 1);

    for (let j = 0; j <= bLen; j++) {
      prev[j] = j;
    }

    for (let i = 1; i <= aLen; i++) {
      curr[0] = i;
      let rowMin = curr[0];
      const aChar = a.charCodeAt(i - 1);
      for (let j = 1; j <= bLen; j++) {
        const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1;
        const val = Math.min(
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost
        );
        curr[j] = val;
        if (val < rowMin) {
          rowMin = val;
        }
      }
      if (rowMin > maxDistance) {
        return maxDistance + 1;
      }
      [prev, curr] = [curr, prev];
    }

    return prev[bLen];
  }
}

// Export singleton instance
export const textMatcher = new TextMatcher();
