/**
 * Cloudflare Workers specific monitoring configuration
 * This module provides optimized monitoring for the Workers environment
 */

export interface WorkerMetrics {
  timestamp: string;
  invocations: number;
  errors: number;
  duration: number;
  cpuTime: number;
  memoryUsage?: number;
}

export interface WorkerHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  worker: {
    invocations: number;
    errors: number;
    avgDuration: number;
    cpuTime: number;
  };
  apollo_api: string;
}

/**
 * Lightweight monitoring for Cloudflare Workers environment
 * Optimized for minimal CPU and memory overhead
 */
export class WorkerMonitor {
  private invocations = 0;
  private errors = 0;
  private totalDuration = 0;
  private totalCpuTime = 0;
  private startTime = Date.now();
  
  /**
   * Record worker invocation
   */
  recordInvocation(duration: number, cpuTime: number = 0, isError = false) {
    this.invocations++;
    this.totalDuration += duration;
    this.totalCpuTime += cpuTime;
    
    if (isError) {
      this.errors++;
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): WorkerMetrics {
    return {
      timestamp: new Date().toISOString(),
      invocations: this.invocations,
      errors: this.errors,
      duration: this.invocations > 0 ? this.totalDuration / this.invocations : 0,
      cpuTime: this.totalCpuTime
    };
  }
  
  /**
   * Generate health check response
   */
  getHealthCheck(): WorkerHealthCheck {
    const errorRate = this.invocations > 0 ? (this.errors / this.invocations) * 100 : 0;
    const avgDuration = this.invocations > 0 ? this.totalDuration / this.invocations : 0;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (errorRate > 15 || avgDuration > 5000) {
      status = 'unhealthy';
    } else if (errorRate > 5 || avgDuration > 2000) {
      status = 'degraded';
    }
    
    return {
      status,
      timestamp: new Date().toISOString(),
      version: '1.0.0', // This would come from environment variables
      environment: 'worker',
      worker: {
        invocations: this.invocations,
        errors: this.errors,
        avgDuration,
        cpuTime: this.totalCpuTime
      },
      apollo_api: 'connected' // This would be determined by API key presence
    };
  }
  
  /**
   * Log structured data in Workers environment
   */
  logEvent(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: 'apollo-io-mcp-worker',
      ...data
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.invocations = 0;
    this.errors = 0;
    this.totalDuration = 0;
    this.totalCpuTime = 0;
    this.startTime = Date.now();
  }
}

/**
 * Worker request wrapper with automatic monitoring
 */
export function withMonitoring<T extends Request, U>(
  monitor: WorkerMonitor,
  handler: (request: T) => Promise<Response>
) {
  return async (request: T): Promise<Response> => {
    const startTime = Date.now();
    const startCpu = Date.now(); // In Workers, we'd use performance.now()
    
    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      const cpuTime = Date.now() - startCpu; // Simplified CPU time calculation
      
      monitor.recordInvocation(duration, cpuTime, response.status >= 400);
      
      // Log request details
      monitor.logEvent('info', 'Request processed', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        cpuTime
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      const cpuTime = Date.now() - startCpu;
      
      monitor.recordInvocation(duration, cpuTime, true);
      
      // Log error details
      monitor.logEvent('error', 'Request failed', {
        method: request.method,
        url: request.url,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name,
          stack: error.stack
        } : String(error),
        duration,
        cpuTime
      });
      
      // Return error response
      return new Response(JSON.stringify({
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Create monitoring middleware for Workers router
 */
export function createMonitoringMiddleware(monitor: WorkerMonitor) {
  return {
    beforeRequest: (request: Request) => {
      monitor.logEvent('info', 'Request started', {
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
      });
    },
    
    afterRequest: (request: Request, response: Response, duration: number) => {
      monitor.recordInvocation(duration, 0, response.status >= 400);
      
      monitor.logEvent(response.status >= 400 ? 'error' : 'info', 'Request completed', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Export singleton instance for Workers
export const workerMonitor = new WorkerMonitor();

/**
 * Enhanced health endpoint for Workers
 */
export function createHealthEndpoint(monitor: WorkerMonitor) {
  return (request: Request): Response => {
    try {
      const healthCheck = monitor.getHealthCheck();
      const statusCode = healthCheck.status === 'healthy' ? 200 : 
                        healthCheck.status === 'degraded' ? 200 : 503;
      
      return new Response(JSON.stringify(healthCheck), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      monitor.logEvent('error', 'Health check failed', { error });
      
      return new Response(JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

/**
 * Enhanced metrics endpoint for Workers
 */
export function createMetricsEndpoint(monitor: WorkerMonitor) {
  return (request: Request): Response => {
    try {
      const metrics = monitor.getMetrics();
      
      return new Response(JSON.stringify({
        timestamp: new Date().toISOString(),
        metrics,
        environment: 'cloudflare-workers',
        version: '1.0.0'
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (error) {
      monitor.logEvent('error', 'Metrics endpoint failed', { error });
      
      return new Response(JSON.stringify({
        error: 'Failed to retrieve metrics',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}