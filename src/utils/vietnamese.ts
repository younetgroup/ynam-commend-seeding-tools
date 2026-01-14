/**
 * Vietnamese text utilities
 * Handles Vietnamese diacritics normalization
 */

/**
 * Remove Vietnamese diacritics from text
 * Converts: áàảãạ → a, éèẻẽẹ → e, etc.
 */
export function removeDiacritics(text: string): string {
  return text
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/[đĐ]/g, 'd'); // Handle special Vietnamese character
}

/**
 * Normalize Vietnamese text for comparison
 * - Lowercase
 * - Remove diacritics
 * - Normalize whitespace
 */
export function normalizeVietnamese(text: string): string {
  return removeDiacritics(text)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two Vietnamese texts are equivalent (ignoring diacritics and case)
 */
export function areEquivalent(text1: string, text2: string): boolean {
  return normalizeVietnamese(text1) === normalizeVietnamese(text2);
}
