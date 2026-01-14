/**
 * Retry utility with exponential backoff and jitter
 * Used for handling transient API failures (rate limits, timeouts)
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute function with exponential backoff retry
 * @param fn Function to execute
 * @param options Retry configuration
 * @returns Result of function execution
 * @throws Last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 5,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Add jitter (±10% random variation)
      const jitter = exponentialDelay * 0.1 * (Math.random() * 2 - 1);
      const delay = exponentialDelay + jitter;

      await sleep(delay);
    }
  }

  // TypeScript needs this, but it's unreachable
  throw lastError!;
}

/**
 * Check if error is retryable (rate limit, timeout, network error)
 */
export function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const retryablePatterns = [
    'rate limit',
    'timeout',
    'econnreset',
    'enotfound',
    'etimedout',
    '429',
    '503',
    '504'
  ];

  return retryablePatterns.some(pattern => message.includes(pattern));
}
