/**
 * Base command interface for all CLI commands
 */

export abstract class BaseCommand<TOptions = unknown> {
  /**
   * Execute the command with given options
   */
  abstract execute(options: TOptions): Promise<void>;

  /**
   * Validate command options before execution
   * Override in subclass to add custom validation
   */
  protected async validate(options: TOptions): Promise<void> {
    // Default: no validation
  }

  /**
   * Run the command with validation
   */
  async run(options: TOptions): Promise<void> {
    await this.validate(options);
    await this.execute(options);
  }
}
