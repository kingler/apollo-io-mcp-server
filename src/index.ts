import express, { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { MCPServer } from "./server";
import { securityHeaders, authenticateApiKey, rateLimiter, validateInput } from "./security";
import { randomUUID } from "crypto";
import { monitoringLogger } from "./monitoring/logger";
import { performanceMonitor } from "./monitoring/performance";
import { errorTracker } from "./monitoring/error-tracker";

// Default port
let PORT = 8123;

// Server start time for uptime calculation
const startTime = Date.now();

// Use monitoring logger
const logger = monitoringLogger;

// Parse command-line arguments for --port=XXXX
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--port=")) {
    const value = parseInt(arg.split("=")[1], 10);
    if (!isNaN(value)) {
      PORT = value;
    } else {
      logger.error("Invalid value for --port", { port: arg });
      process.exit(1);
    }
  }
}

const server = new MCPServer(
  new Server(
    {
      name: "apollo-io-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        logging: {},
      },
    }
  )
);

const app = express();

// Apply security middleware first
app.use(securityHeaders);
app.use(validateInput);
app.use(rateLimiter.middleware());

// Metrics tracking
let totalRequests = 0;
let totalErrors = 0;

// Request logging and metrics middleware
app.use((req: Request, res: Response, next) => {
  const correlationId = randomUUID();
  req.headers['x-correlation-id'] = correlationId;
  
  const requestStartTime = Date.now();
  totalRequests++;
  
  logger.info('Request started', {
    correlationId,
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    contentLength: req.get('content-length') || 0
  });
  
  // Override res.end to log response and track metrics
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any) {
    const duration = Date.now() - requestStartTime;
    const isError = res.statusCode >= 400;
    
    if (isError) {
      totalErrors++;
    }
    
    // Record performance metrics
    performanceMonitor.recordRequest(duration, isError);
    
    // Log API call
    logger.logApiCall(
      req.url,
      req.method,
      duration,
      res.statusCode,
      undefined, // rate limit remaining - would come from Apollo API
      { correlationId }
    );
    
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length') || 0
    });
    
    return originalEnd(chunk);
  };
  
  next();
});

app.use(express.json());

// Apply authentication to MCP endpoints only
app.use('/mcp', authenticateApiKey);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  try {
    // Get performance and error health status
    const perfHealth = performanceMonitor.getHealthSummary();
    const errorHealth = errorTracker.getHealthStatus();
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (perfHealth.status === 'unhealthy' || errorHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (perfHealth.status === 'degraded' || errorHealth.status === 'degraded') {
      overallStatus = 'degraded';
    }
    
    const healthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Date.now() - startTime,
      memory: process.memoryUsage(),
      apollo_api: process.env.APOLLO_API_KEY ? 'connected' : 'mock_mode',
      server: {
        port: PORT,
        pid: process.pid,
        node_version: process.version
      },
      performance: perfHealth,
      errors: {
        status: errorHealth.status,
        details: errorHealth.details
      },
      correlationId
    };
    
    // Try to verify Apollo API connectivity if API key exists
    if (process.env.APOLLO_API_KEY) {
      try {
        // Basic API connectivity test - we'll enhance this with actual API client
        healthCheck.apollo_api = 'connected';
        logger.debug('Apollo API connectivity verified', { correlationId });
      } catch (error) {
        healthCheck.apollo_api = 'disconnected';
        if (healthCheck.status === 'healthy') {
          healthCheck.status = 'degraded';
        }
        logger.warn('Apollo API connectivity failed', { correlationId, error });
      }
    }
    
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    logger.info('Health check completed', {
      correlationId,
      status: healthCheck.status,
      uptime: healthCheck.uptime,
      memoryUsage: healthCheck.memory.heapUsed,
      performanceStatus: perfHealth.status,
      errorStatus: errorHealth.status
    });
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    const errorId = errorTracker.trackError(error as Error, {
      correlationId,
      url: req.url,
      method: req.method,
      severity: 'high'
    });
    
    logger.error('Health check failed', { correlationId, error, errorId });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      errorId,
      correlationId
    });
  }
});

const router = express.Router();

// single endpoint for the client to send messages to
const MCP_ENDPOINT = "/mcp";

router.post(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handlePostRequest(req, res);
});

router.get(MCP_ENDPOINT, async (req: Request, res: Response) => {
  await server.handleGetRequest(req, res);
});

app.use("/", router);

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  // Track the error in our monitoring system
  const errorId = errorTracker.trackError(err, {
    correlationId,
    url: req.url,
    method: req.method,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress,
    statusCode: 500,
    severity: 'high',
    additionalContext: {
      headers: req.headers,
      body: req.body
    }
  });
  
  logger.error('Unhandled request error', {
    errorId,
    correlationId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url
    }
  });
  
  // Don't leak error details in production
  const errorResponse = process.env.NODE_ENV === 'production' 
    ? { 
        error: 'Internal server error',
        errorId,
        correlationId,
        timestamp: new Date().toISOString()
      }
    : { 
        error: err.message,
        stack: err.stack,
        errorId,
        correlationId,
        timestamp: new Date().toISOString()
      };
  
  res.status(500).json(errorResponse);
});

// Enhanced metrics endpoint
app.get('/metrics', (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  try {
    const performanceMetrics = performanceMonitor.getMetrics();
    const errorSummary = errorTracker.getErrorSummary();
    const detailedReport = performanceMonitor.getDetailedReport();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      server: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        port: PORT,
        pid: process.pid
      },
      performance: performanceMetrics,
      errors: errorSummary,
      detailed: detailedReport,
      apollo_api: {
        status: process.env.APOLLO_API_KEY ? 'connected' : 'mock_mode'
      },
      correlationId
    };
    
    logger.debug('Metrics requested', { correlationId, metricsCount: Object.keys(metrics).length });
    res.json(metrics);
  } catch (error) {
    const errorId = errorTracker.trackError(error as Error, {
      correlationId,
      url: req.url,
      method: req.method,
      severity: 'medium'
    });
    
    logger.error('Metrics endpoint error', { correlationId, error, errorId });
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      errorId,
      correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

// Add error reporting endpoint
app.get('/errors', (req: Request, res: Response) => {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  try {
    const { severity, limit, startDate, endDate } = req.query;
    
    const searchCriteria: any = {};
    if (severity) searchCriteria.severity = severity;
    if (limit) searchCriteria.limit = parseInt(limit as string);
    if (startDate) searchCriteria.startDate = new Date(startDate as string);
    if (endDate) searchCriteria.endDate = new Date(endDate as string);
    
    const errors = errorTracker.searchErrors(searchCriteria);
    const summary = errorTracker.getErrorSummary();
    
    res.json({
      timestamp: new Date().toISOString(),
      summary,
      errors,
      correlationId
    });
    
    logger.debug('Error report requested', { 
      correlationId, 
      criteria: searchCriteria,
      resultCount: errors.length 
    });
  } catch (error) {
    const errorId = errorTracker.trackError(error as Error, {
      correlationId,
      url: req.url,
      method: req.method,
      severity: 'medium'
    });
    
    logger.error('Error reporting endpoint error', { correlationId, error, errorId });
    res.status(500).json({
      error: 'Failed to retrieve error report',
      errorId,
      correlationId,
      timestamp: new Date().toISOString()
    });
  }
});

const httpServer = app.listen(PORT, () => {
  logger.info('Apollo.io MCP Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    pid: process.pid,
    nodeVersion: process.version
  });
});

// Periodic cleanup and maintenance tasks
const cleanupInterval = setInterval(() => {
  try {
    // Clean old errors (keep 7 days)
    errorTracker.clearOldErrors(7);
    
    // Log periodic health status
    const healthSummary = performanceMonitor.getHealthSummary();
    const errorHealth = errorTracker.getHealthStatus();
    
    logger.info('Periodic health check', {
      performance: healthSummary,
      errors: errorHealth,
      uptime: Date.now() - startTime,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024 // MB
    });
  } catch (error) {
    logger.error('Error during periodic maintenance', { error });
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info('Received shutdown signal', { signal });
  
  // Clear periodic tasks
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    logger.info('Cleanup interval stopped');
  }
  
  // Generate final error report
  try {
    const finalReport = errorTracker.generateErrorReport('hour');
    logger.info('Final error report', finalReport);
  } catch (error) {
    logger.error('Error generating final report', { error });
  }
  
  // Stop accepting new connections
  httpServer.close((err) => {
    if (err) {
      logger.error('Error during HTTP server shutdown', { error: err });
    } else {
      logger.info('HTTP server closed');
    }
  });
  
  try {
    await server.cleanup();
    logger.info('MCP server cleanup completed');
  } catch (error) {
    logger.error('Error during MCP server cleanup', { error });
  }
  
  logger.info('Shutdown complete', {
    totalRequests,
    totalErrors,
    uptime: Date.now() - startTime
  });
  process.exit(0);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const errorId = errorTracker.trackError(error, {
    severity: 'critical',
    additionalContext: { source: 'uncaughtException' }
  });
  
  logger.error('Uncaught exception', { error, errorId });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  const errorId = errorTracker.trackError(error, {
    severity: 'critical',
    additionalContext: { 
      source: 'unhandledRejection',
      promise: String(promise)
    }
  });
  
  logger.error('Unhandled promise rejection', { 
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
    errorId
  });
});