/**
 * Configuration persistence utilities
 * Manages .ynam-tools.json in current working directory
 */

import fs from 'fs';
import path from 'path';
import { Configuration, IConfigService } from '../types/index.js';

const CONFIG_FILE = '.ynam-tools.json';

class ConfigService implements IConfigService {
  private configPath: string;

  constructor() {
    this.configPath = path.join(process.cwd(), CONFIG_FILE);
  }

  /**
   * Load configuration from .ynam-tools.json
   * Returns null if file doesn't exist
   */
  load(): Configuration | null {
    try {
      if (!this.exists()) {
        return null;
      }

      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data) as Configuration;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save configuration to .ynam-tools.json
   */
  save(config: Configuration): void {
    const data = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, data, 'utf-8');
  }

  /**
   * Check if configuration file exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Get default configuration
   */
  getDefault(): Configuration {
    return {
      lastSheet: null,
      columnMapping: null,
      concurrency: 1,
      port: 9222
    };
  }

  /**
   * Update partial configuration (merge with existing)
   */
  update(partial: Partial<Configuration>): void {
    const current = this.load() || this.getDefault();
    const updated = { ...current, ...partial };
    this.save(updated);
  }
}

// Export singleton instance
export const configService = new ConfigService();
