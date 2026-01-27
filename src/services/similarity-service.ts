/**
 * Similarity Service
 * Handles comment similarity detection using fuzzy text matching
 */

import { logger } from '../utils/logger.js';
import { textMatcher } from '../utils/text-matcher.js';

export interface CommentData {
  row: number;
  text: string;
}

export interface ClusterResult {
  clusterId: number;
  comments: CommentData[];
  avgSimilarity: number;
}

export class SimilarityService {
  /**
   * Initialize service (kept for API consistency)
   */
  async initialize(): Promise<void> {
    logger.debug('Similarity service initialized (using fuzzy matching)');
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return true; // Always configured since we use local matching
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize first row and column
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Compare two comments and return similarity score (0-100)
   * Uses Levenshtein distance with Vietnamese text normalization
   */
  async compareComments(comment1: string, comment2: string): Promise<number> {
    // Normalize both comments using the existing text matcher
    const normalized1 = textMatcher.normalize(comment1);
    const normalized2 = textMatcher.normalize(comment2);

    // If either is empty, return 0
    if (!normalized1 || !normalized2) {
      return 0;
    }

    // If identical after normalization, return 100
    if (normalized1 === normalized2) {
      return 100;
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    // Convert distance to similarity percentage
    // similarity = (1 - distance / maxLength) * 100
    const similarity = Math.max(0, Math.round((1 - distance / maxLength) * 100));

    return similarity;
  }

  /**
   * Cluster comments by similarity threshold
   * Returns a map of row number to cluster ID
   */
  async clusterComments(
    comments: CommentData[],
    threshold: number,
    options: {
      onProgress?: (currentRow: number, totalRows: number, rowNumber: number) => void;
      shouldStop?: () => boolean;
      logComparisons?: boolean;
      yieldEvery?: number;
    } = {}
  ): Promise<Map<number, number> | null> {
    const clusters = new Map<number, number>(); // row -> cluster ID
    let currentClusterId = 1;
    let comparisonsDone = 0;
    const totalComparisons = (comments.length * (comments.length - 1)) / 2;
    const yieldEvery = options.yieldEvery ?? 500;
    const shouldStop = options.shouldStop;

    logger.info(`Starting clustering with threshold ${threshold}% for ${comments.length} comments`);
    logger.info(`Total comparisons needed: ${totalComparisons}`);

    for (let i = 0; i < comments.length; i++) {
      if (shouldStop?.()) {
        return null;
      }

      if (options.onProgress) {
        options.onProgress(i + 1, comments.length, comments[i].row);
      }

      // Skip if already in a cluster
      if (clusters.has(comments[i].row)) {
        continue;
      }

      const cluster: number[] = [comments[i].row];

      // Compare with remaining comments
      for (let j = i + 1; j < comments.length; j++) {
        if (shouldStop?.()) {
          return null;
        }

        // Skip if already in a cluster
        if (clusters.has(comments[j].row)) {
          continue;
        }

        try {
          const similarity = await this.compareComments(
            comments[i].text,
            comments[j].text
          );

          comparisonsDone++;

          if (yieldEvery > 0 && comparisonsDone % yieldEvery === 0) {
            await new Promise(resolve => setImmediate(resolve));
            if (shouldStop?.()) {
              return null;
            }
          }

          if (options.logComparisons) {
            logger.debug(`Comparing row ${comments[i].row} with ${comments[j].row}: ${similarity}%`);
          }

          if (similarity >= threshold) {
            cluster.push(comments[j].row);
            if (options.logComparisons) {
              logger.debug(`Added row ${comments[j].row} to cluster ${currentClusterId} (similarity: ${similarity}%)`);
            }
          }
        } catch (error) {
          logger.error(`Failed to compare comments at rows ${comments[i].row} and ${comments[j].row}: ${error}`);
          // Continue with next comparison
        }
      }

      // Assign cluster ID to all members
      cluster.forEach(row => {
        clusters.set(row, currentClusterId);
      });

      logger.info(`Cluster ${currentClusterId}: ${cluster.length} comment(s) - rows: ${cluster.join(', ')}`);
      currentClusterId++;
    }

    logger.info(`Clustering complete: ${currentClusterId - 1} clusters found`);
    return clusters;
  }

  /**
   * Get detailed cluster results with statistics
   */
  getClusterResults(
    comments: CommentData[],
    clusters: Map<number, number>
  ): ClusterResult[] {
    const clusterMap = new Map<number, CommentData[]>();

    // Group comments by cluster ID
    comments.forEach(comment => {
      const clusterId = clusters.get(comment.row);
      if (clusterId) {
        if (!clusterMap.has(clusterId)) {
          clusterMap.set(clusterId, []);
        }
        clusterMap.get(clusterId)!.push(comment);
      }
    });

    // Convert to ClusterResult array
    const results: ClusterResult[] = [];
    clusterMap.forEach((clusterComments, clusterId) => {
      results.push({
        clusterId,
        comments: clusterComments,
        avgSimilarity: 0 // Would need to calculate from comparison matrix
      });
    });

    // Sort by cluster size (largest first)
    results.sort((a, b) => b.comments.length - a.comments.length);

    return results;
  }

  /**
   * Get clusters with duplicates only (more than 1 comment)
   */
  getDuplicateClusters(
    comments: CommentData[],
    clusters: Map<number, number>
  ): ClusterResult[] {
    const allResults = this.getClusterResults(comments, clusters);
    return allResults.filter(cluster => cluster.comments.length > 1);
  }
}
