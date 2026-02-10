/**
 * Structured logging utility
 * In production, this should integrate with a service like Sentry, DataDog, or LogRocket
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
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
    this.sendToService('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, context));
    }
    this.sendToService('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
    };

    if (this.isDevelopment) {
      console.error(this.formatMessage('error', message, errorContext));
      if (error) console.error(error);
    }

    this.sendToService('error', message, errorContext, error);
  }

  /**
   * API request logging
   */
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
    });
  }

  /**
   * API response logging (errors only in production)
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
