/**
 * DupDetector command - Duplication detection workflow
 * Detects similar comments in Google Sheets using fuzzy text matching
 */

import inquirer from 'inquirer';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { BaseCommand } from './base-command.js';
import { DupDetectorOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { configService } from '../utils/config.js';
import { SheetService } from '../services/sheet-service.js';
import { SimilarityService, CommentData } from '../services/similarity-service.js';
import { EventEmitter } from '../utils/event-emitter.js';

export class DupDetectorCommand extends BaseCommand<DupDetectorOptions> {
  private sheetService: SheetService;
  private similarityService: SimilarityService;
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor() {
    super();
    this.sheetService = new SheetService();
    this.similarityService = new SimilarityService();
  }

  onProgress(callback: (progress: any) => void): void {
    this.eventEmitter.on('progress', callback);
  }

  private emitProgress(data: any): void {
    this.eventEmitter.emit('progress', data);
  }

  async execute(options: DupDetectorOptions): Promise<void> {
    try {
      // Initialize services
      await this.initializeServices();

      // Get configuration (interactive or from options)
      const config = await this.getConfiguration(options);

      // Read comments from sheet
      logger.info(`Reading comments from column ${config.commentCol}...`);
      const comments = await this.sheetService.readColumn(
        config.sheetUrl,
        config.commentCol,
        config.rowRange
      );

      if (comments.length === 0) {
        logger.warn('No comments found in the specified column');
        return;
      }

      logger.info(`Found ${comments.length} comments to analyze`);
      this.emitProgress({
        message: `Found ${comments.length} comments to analyze`,
        percentage: 10
      });

      // Dry run mode
      if (config.dryRun) {
        await this.runDryRun(comments, config);
        return;
      }

      // Perform clustering
      const clusters = await this.performClustering(comments, config.threshold);

      // Write results to sheet
      if (!config.dryRun) {
        logger.info(`Writing cluster IDs to column ${config.clusterCol}...`);
        this.emitProgress({
          message: 'Writing results to sheet...',
          percentage: 90
        });
        await this.sheetService.writeColumn(
          config.sheetUrl,
          config.clusterCol,
          clusters
        );
        logger.success('Cluster IDs written to sheet');
      }

      // Display summary
      const stats = this.displaySummary(comments, clusters, config.threshold);

      // Emit completion
      this.emitProgress({
        status: 'complete',
        percentage: 100,
        message: 'Detection complete',
        stats,
        clusters: this.similarityService.getDuplicateClusters(comments, clusters)
      });

      // Save configuration for next time
      if (await this.promptSaveConfig()) {
        const existingConfig = configService.load() || {
          lastSheet: null,
          columnMapping: null,
          concurrency: 1,
          port: 9222
        };

        configService.save({
          ...existingConfig,
          lastSheet: config.sheetUrl
        });

        logger.success('Configuration saved');
      }

    } catch (error) {
      logger.error(`Command failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async initializeServices(): Promise<void> {
    // Initialize sheet service
    const credentialsPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    if (!credentialsPath) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_PATH environment variable not set');
    }

    await this.sheetService.initialize(credentialsPath);

    // Initialize similarity service
    await this.similarityService.initialize();

    logger.debug('Services initialized');
  }

  private async getConfiguration(options: DupDetectorOptions): Promise<{
    sheetUrl: string;
    commentCol: string;
    clusterCol: string;
    threshold: number;
    rowRange?: { start: number; end: number };
    dryRun: boolean;
  }> {
    let sheetUrl = options.sheet;
    let commentCol = options.commentCol;
    let clusterCol = options.clusterCol;
    let threshold = options.threshold;

    // Load saved config
    const savedConfig = configService.load();

    // Interactive mode if no sheet URL provided
    if (!sheetUrl) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'sheetUrl',
          message: 'Google Sheet URL:',
          default: savedConfig?.lastSheet || undefined,
          validate: (input: string) => {
            if (!input) return 'Sheet URL is required';
            if (!input.includes('docs.google.com/spreadsheets')) {
              return 'Invalid Google Sheet URL';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'commentCol',
          message: 'Column containing comments (e.g., P):',
          default: 'P'
        },
        {
          type: 'input',
          name: 'clusterCol',
          message: 'Column to write cluster IDs (e.g., S):',
          default: 'S'
        },
        {
          type: 'input',
          name: 'threshold',
          message: 'Similarity threshold (0-100%):',
          default: '85',
          validate: (input: string) => {
            const num = parseInt(input, 10);
            if (isNaN(num) || num < 0 || num > 100) {
              return 'Please enter a number between 0 and 100';
            }
            return true;
          }
        }
      ]);

      sheetUrl = answers.sheetUrl;
      commentCol = answers.commentCol;
      clusterCol = answers.clusterCol;
      threshold = parseInt(answers.threshold, 10);
    }

    // Defaults for missing values
    commentCol = commentCol || 'P';
    clusterCol = clusterCol || 'S';
    threshold = threshold || 85;

    // Parse row range if provided
    let rowRange: { start: number; end: number } | undefined;
    if (options.rows) {
      const match = options.rows.match(/^(\d+)-(\d+)$/);
      if (match) {
        rowRange = {
          start: parseInt(match[1], 10),
          end: parseInt(match[2], 10)
        };
      }
    }

    return {
      sheetUrl: sheetUrl!,
      commentCol,
      clusterCol,
      threshold,
      rowRange,
      dryRun: options.dryRun || false
    };
  }

  private async performClustering(
    comments: CommentData[],
    threshold: number
  ): Promise<Map<number, number>> {
    logger.info(`Starting similarity clustering with ${threshold}% threshold...`);

    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: chalk.cyan('{bar}') + ' | {percentage}% | {value}/{total} comparisons',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    const totalComparisons = (comments.length * (comments.length - 1)) / 2;
    progressBar.start(totalComparisons, 0);

    // Perform clustering with progress updates
    const clusters = await this.similarityService.clusterComments(
      comments,
      threshold,
      (current, total) => {
        progressBar.update(current);
        // Emit progress for Electron
        const percentage = 10 + Math.round((current / total) * 80);
        this.emitProgress({
          message: `Comparing comments: ${current}/${total}`,
          percentage
        });
      }
    );

    progressBar.stop();
    logger.success('Clustering complete');

    return clusters;
  }

  private async runDryRun(
    comments: CommentData[],
    config: { threshold: number; commentCol: string; clusterCol: string }
  ): Promise<void> {
    logger.log(chalk.yellow('\n=== DRY RUN MODE ==='));
    logger.log('No changes will be made to the sheet\n');

    logger.info(`Total comments: ${comments.length}`);
    logger.info(`Comment column: ${config.commentCol}`);
    logger.info(`Cluster column: ${config.clusterCol}`);
    logger.info(`Similarity threshold: ${config.threshold}%`);

    logger.log('\nFirst 5 comments:');
    comments.slice(0, 5).forEach(comment => {
      logger.log(`  Row ${comment.row}: ${comment.text.substring(0, 60)}...`);
    });

    // Perform clustering
    const clusters = await this.performClustering(comments, config.threshold);

    // Display summary
    this.displaySummary(comments, clusters, config.threshold);
  }

  private displaySummary(
    comments: CommentData[],
    clusters: Map<number, number>,
    threshold: number
  ): any {
    // Calculate statistics
    const uniqueClusters = new Set(clusters.values());
    const clusterSizes = new Map<number, number>();

    clusters.forEach(clusterId => {
      clusterSizes.set(clusterId, (clusterSizes.get(clusterId) || 0) + 1);
    });

    const duplicateClusters = Array.from(clusterSizes.entries())
      .filter(([_, size]) => size > 1)
      .sort((a, b) => b[1] - a[1]);

    const largestClusterSize = duplicateClusters.length > 0 ? duplicateClusters[0][1] : 0;

    // Display summary
    logger.log('\n' + chalk.cyan('═'.repeat(70)));
    logger.log(chalk.cyan.bold('  DUPLICATION DETECTION COMPLETE'));
    logger.log(chalk.cyan('═'.repeat(70)));
    logger.log(`  Total comments:      ${comments.length}`);
    logger.log(`  Unique comments:     ${uniqueClusters.size}`);
    logger.log(`  Duplicate clusters:  ${duplicateClusters.length}`);
    logger.log(`  Largest cluster:     ${largestClusterSize} comments`);
    logger.log(`  Similarity threshold: ${threshold}%`);
    logger.log(chalk.cyan('═'.repeat(70)) + '\n');

    if (duplicateClusters.length > 0) {
      logger.log(chalk.yellow('  Duplicate Clusters:\n'));
      duplicateClusters.slice(0, 10).forEach(([clusterId, size]) => {
        const clusterComments = comments.filter(c => clusters.get(c.row) === clusterId);
        logger.log(chalk.yellow(`    Cluster ${clusterId}: ${size} comments`));
        clusterComments.forEach(comment => {
          logger.log(`      Row ${comment.row}: ${comment.text.substring(0, 50)}...`);
        });
        logger.log('');
      });

      if (duplicateClusters.length > 10) {
        logger.log(chalk.gray(`    ... and ${duplicateClusters.length - 10} more clusters\n`));
      }
    } else {
      logger.success('  No duplicate comments found!\n');
    }

    return {
      totalComments: comments.length,
      uniqueComments: uniqueClusters.size,
      duplicateClusters: duplicateClusters.length,
      largestClusterSize
    };
  }

  private async promptSaveConfig(): Promise<boolean> {
    const { save } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'save',
        message: 'Save this configuration for future use?',
        default: true
      }
    ]);

    return save;
  }
}
