/**
 * Structured logging utility
 * In production, only warnings and errors are logged
 * Debug and info logs are silenced in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  projectId?: string;
  taskId?: string;
  endpoint?: string;
  method?: string;
  [key: string]: string | number | boolean | undefined;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Send log to external service in production
   * TODO: Integrate with Sentry, DataDog, or similar
   */
  private sendToService(_level: LogLevel, _message: string, _context?: LogContext, _error?: Error) {
    if (!this.isProduction) return;

    // TODO: Implement actual service integration
    // Example with Sentry:
    // if (_level === 'error' && _error) {
    //   Sentry.captureException(_error, {
    //     level: 'error',
    //     extra: _context,
    //   });
    // }
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: LogContext) {
    // In production, suppress debug logs
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, context?: LogContext) {
    // In production, suppress info logs
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
    // Only send to external service in production if you need analytics
    // this.sendToService('info', message, context);
  }

  /**
   * Warning level logging (always logged)
   */
  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context));
    this.sendToService('warn', message, context);
  }

  /**
   * Error level logging (always logged)
   */
  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    };

    console.error(this.formatMessage('error', message, errorContext));
    if (error && this.isDevelopment) console.error(error);

    this.sendToService('error', message, errorContext, error);
  }

  /**
   * API request logging (development only)
   */
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
    });
  }

  /**
   * API response logging (errors always logged, success only in dev)
   */
  apiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    duration?: number,
    context?: LogContext
  ) {
    const responseContext = {
      ...context,
      method,
      endpoint,
      statusCode,
      duration,
    };

    if (statusCode >= 400) {
      this.warn(`API Error: ${method} ${endpoint} - ${statusCode}`, responseContext);
    } else if (this.isDevelopment) {
      this.debug(`API Success: ${method} ${endpoint} - ${statusCode}`, responseContext);
    }
  }
}

export const logger = new Logger();
