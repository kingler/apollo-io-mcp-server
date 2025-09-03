import * as winston from 'winston';

export interface LogContext {
  correlationId?: string;
  operationId?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

export interface OperationContext {
  operationId: string;
  correlationId?: string;
  startTime: number;
  operation: string;
  metadata?: Record<string, any>;
}

/**
 * Centralized logging configuration for production monitoring
 */
export class MonitoringLogger {
  private logger: winston.Logger;
  
  constructor() {
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Configure transports based on environment
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize({ all: isDevelopment }),
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}]: ${message}${metaStr}`;
          })
        )
      })
    ];
    
    // Add file logging in production
    if (!isDevelopment) {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: winston.format.json(),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: winston.format.json(),
          maxsize: 50 * 1024 * 1024, // 50MB
          maxFiles: 10
        })
      );
    }
    
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: 'apollo-io-mcp-server',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME,
        pid: process.pid
      },
      transports,
      // Handle logging exceptions
      exceptionHandlers: [
        new winston.transports.Console(),
        ...(isDevelopment ? [] : [new winston.transports.File({ filename: 'logs/exceptions.log' })])
      ],
      rejectionHandlers: [
        new winston.transports.Console(),
        ...(isDevelopment ? [] : [new winston.transports.File({ filename: 'logs/rejections.log' })])
      ],
      exitOnError: false
    });
  }
  
  /**
   * Create operation context for tracking multi-step operations
   */
  createOperationContext(operation: string, context?: Partial<LogContext>): OperationContext {
    return {
      operationId: `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      correlationId: context?.correlationId,
      startTime: Date.now(),
      operation,
      metadata: context
    };
  }
  
  /**
   * Log operation completion with duration
   */
  logOperationComplete(opContext: OperationContext, result?: any, error?: Error) {
    const duration = Date.now() - opContext.startTime;
    
    if (error) {
      this.logger.error(`Operation ${opContext.operation} failed`, {
        ...opContext,
        duration,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        result: result || null
      });
    } else {
      this.logger.info(`Operation ${opContext.operation} completed`, {
        ...opContext,
        duration,
        result: result || null
      });
    }
  }
  
  /**
   * Security event logging
   */
  logSecurityEvent(event: string, context: LogContext, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    this.logger.warn(`Security event: ${event}`, {
      ...context,
      securityEvent: true,
      severity,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Performance metric logging
   */
  logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext) {
    this.logger.info('Performance metric', {
      metric,
      value,
      unit,
      ...context,
      performanceMetric: true,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * API call logging with rate limiting awareness
   */
  logApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    rateLimitRemaining?: number,
    context?: LogContext
  ) {
    const level = statusCode >= 400 ? 'error' : 'info';
    
    this.logger.log(level, 'API call', {
      apiCall: true,
      endpoint,
      method,
      duration,
      statusCode,
      rateLimitRemaining,
      ...context,
      timestamp: new Date().toISOString()
    });
  }
  
  // Standard logging methods
  debug(message: string, context?: LogContext) {
    this.logger.debug(message, context);
  }
  
  info(message: string, context?: LogContext) {
    this.logger.info(message, context);
  }
  
  warn(message: string, context?: LogContext) {
    this.logger.warn(message, context);
  }
  
  error(message: string, context?: LogContext) {
    this.logger.error(message, context);
  }
  
  /**
   * Get the underlying Winston logger for advanced usage
   */
  getLogger(): winston.Logger {
    return this.logger;
  }
}

// Export singleton instance
export const monitoringLogger = new MonitoringLogger();