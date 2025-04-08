/**
 * Centralized structured logger with timestamp and consistent format
 */

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR';

export interface LogData {
  [key: string]: unknown;
}

/**
 * Logger utility for structured logging across the application
 */
export const logger = {
  /**
   * Log an informational message
   */
  info: (context: string, message: string, data?: LogData): void => {
    _log('INFO', context, message, undefined, data);
  },

  /**
   * Log a warning message
   */
  warning: (context: string, message: string, data?: LogData): void => {
    _log('WARNING', context, message, undefined, data);
  },

  /**
   * Log an error message with optional error object
   */
  error: (context: string, message: string, error?: unknown, data?: LogData): void => {
    _log('ERROR', context, message, error, data);
  }
};

/**
 * Internal log function that handles formatting and output
 */
function _log(
  level: LogLevel,
  context: string,
  message: string,
  error?: unknown,
  data?: LogData
): void {
  const timestamp = new Date().toISOString();
  
  const logEntry: Record<string, unknown> = {
    timestamp,
    level,
    context,
    message,
  };

  // Add error details if available
  if (error !== undefined) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logEntry.error = errorMessage;
    
    if (error instanceof Error && error.stack) {
      logEntry.stack = error.stack;
    }
  }
  
  // Add any additional data if provided
  if (data && Object.keys(data).length > 0) {
    logEntry.data = data;
  }

  // Output based on level
  const logString = JSON.stringify(logEntry);
  switch (level) {
    case 'INFO':
      console.log(logString);
      break;
    case 'WARNING':
      console.warn(logString);
      break;
    case 'ERROR':
      console.error(logString);
      break;
  }
} 