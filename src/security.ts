import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'apollo-mcp-security' }
});

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === 'production' && req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // CSP - restrictive but functional for MCP server
  res.setHeader(
    'Content-Security-Policy', 
    "default-src 'self'; script-src 'none'; style-src 'none'; img-src 'none'; connect-src 'self'; font-src 'none'; object-src 'none'; media-src 'none'; frame-src 'none';"
  );

  // CORS headers for MCP protocol
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-API-Key, mcp-session-id, x-correlation-id');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  next();
}

/**
 * API Key authentication middleware for MCP endpoints
 * Validates Apollo.io API key from Authorization header or X-API-Key header
 */
export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const correlationId = req.headers['x-correlation-id'] as string;
  
  // Skip authentication for health and metrics endpoints
  if (req.path === '/health' || req.path === '/metrics') {
    return next();
  }

  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  const expectedApiKey = process.env.APOLLO_API_KEY;
  
  // If no API key is configured, run in mock mode
  if (!expectedApiKey) {
    logger.warn('Running in mock mode - no APOLLO_API_KEY configured', { 
      correlationId,
      path: req.path,
      method: req.method 
    });
    return next();
  }

  // Extract API key from headers
  let clientApiKey: string | null = null;
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      clientApiKey = authHeader.substring(7);
    } else if (authHeader.startsWith('ApiKey ')) {
      clientApiKey = authHeader.substring(7);
    } else {
      clientApiKey = authHeader;
    }
  } else if (apiKeyHeader) {
    clientApiKey = apiKeyHeader;
  }

  // Validate API key
  if (!clientApiKey || clientApiKey !== expectedApiKey) {
    logger.warn('Authentication failed - invalid or missing API key', {
      correlationId,
      clientIP: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      hasAuthHeader: !!authHeader,
      hasApiKeyHeader: !!apiKeyHeader,
      keyLength: clientApiKey?.length || 0
    });

    return res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Authentication required. Please provide valid Apollo.io API key.',
        data: {
          correlationId,
          timestamp: new Date().toISOString(),
          documentation: 'See SECURITY.md for authentication details'
        }
      },
      id: null
    });
  }

  logger.debug('Authentication successful', {
    correlationId,
    clientIP: req.ip || req.connection.remoteAddress,
    path: req.path,
    method: req.method
  });

  next();
}

/**
 * Rate limiting middleware with in-memory storage
 * Tracks requests per IP address with configurable limits
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validRequests = timestamps.filter(time => time > cutoff);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const correlationId = req.headers['x-correlation-id'] as string;
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Get current requests for this IP
      const requests = this.requests.get(clientIP) || [];
      const recentRequests = requests.filter(time => time > windowStart);

      // Check rate limit
      if (recentRequests.length >= this.maxRequests) {
        logger.warn('Rate limit exceeded', {
          correlationId,
          clientIP,
          requestCount: recentRequests.length,
          maxRequests: this.maxRequests,
          windowMs: this.windowMs,
          path: req.path,
          method: req.method
        });

        return res.status(429).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: `Rate limit exceeded. Maximum ${this.maxRequests} requests per ${this.windowMs/1000} seconds.`,
            data: {
              correlationId,
              timestamp: new Date().toISOString(),
              retryAfter: Math.ceil(this.windowMs / 1000),
              requestsRemaining: 0
            }
          },
          id: null
        });
      }

      // Add current request
      recentRequests.push(now);
      this.requests.set(clientIP, recentRequests);

      // Add rate limit headers
      const remaining = this.maxRequests - recentRequests.length;
      const resetTime = Math.ceil((windowStart + this.windowMs) / 1000);
      
      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      next();
    };
  }
}

// Create rate limiter instance
export const rateLimiter = new RateLimiter(
  60000, // 1 minute window
  process.env.NODE_ENV === 'production' ? 60 : 100 // Lower limit in production
);

/**
 * Input validation middleware
 * Validates request body size and content
 */
export function validateInput(req: Request, res: Response, next: NextFunction): void {
  const correlationId = req.headers['x-correlation-id'] as string;

  // Check content length
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB max

  if (contentLength > maxSize) {
    logger.warn('Request too large', {
      correlationId,
      contentLength,
      maxSize,
      clientIP: req.ip || req.connection.remoteAddress,
      path: req.path
    });

    return res.status(413).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Request entity too large',
        data: {
          correlationId,
          maxSize: maxSize,
          receivedSize: contentLength
        }
      },
      id: null
    });
  }

  // Check content type for POST requests
  if (req.method === 'POST' && !req.is('application/json')) {
    logger.warn('Invalid content type', {
      correlationId,
      contentType: req.get('content-type'),
      clientIP: req.ip || req.connection.remoteAddress,
      path: req.path
    });

    return res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Invalid content type. Expected application/json',
        data: {
          correlationId,
          received: req.get('content-type') || 'none'
        }
      },
      id: null
    });
  }

  next();
}

/**
 * Security audit logging
 * Logs security-relevant events
 */
export function securityAudit(event: string, details: any, req?: Request) {
  const correlationId = req?.headers['x-correlation-id'] as string;
  
  logger.warn('Security audit event', {
    event,
    correlationId,
    timestamp: new Date().toISOString(),
    clientIP: req?.ip || req?.connection.remoteAddress,
    userAgent: req?.get('user-agent'),
    path: req?.path,
    method: req?.method,
    ...details
  });
}