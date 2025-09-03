import { monitoringLogger } from './logger';

export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
  totalRequests: number;
  totalErrors: number;
}

export interface AlertThreshold {
  metric: keyof PerformanceMetrics;
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq';
  severity: 'warning' | 'critical';
}

/**
 * Performance monitoring and alerting system
 */
export class PerformanceMonitor {
  private requestTimes: number[] = [];
  private requestTimestamps: number[] = [];
  private errorCount = 0;
  private requestCount = 0;
  private startTime = Date.now();
  
  private alertThresholds: AlertThreshold[] = [
    { metric: 'averageResponseTime', threshold: 2000, comparison: 'gt', severity: 'warning' },
    { metric: 'averageResponseTime', threshold: 5000, comparison: 'gt', severity: 'critical' },
    { metric: 'errorRate', threshold: 5, comparison: 'gt', severity: 'warning' },
    { metric: 'errorRate', threshold: 15, comparison: 'gt', severity: 'critical' },
    { metric: 'requestsPerSecond', threshold: 100, comparison: 'gt', severity: 'warning' }
  ];
  
  private lastAlertTime = new Map<string, number>();
  private alertCooldown = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Record a request completion
   */
  recordRequest(duration: number, isError: boolean = false) {
    this.requestCount++;
    this.requestTimes.push(duration);
    this.requestTimestamps.push(Date.now());
    
    if (isError) {
      this.errorCount++;
    }
    
    // Keep only last 1000 requests for performance
    if (this.requestTimes.length > 1000) {
      this.requestTimes.shift();
      this.requestTimestamps.shift();
    }
    
    // Log slow requests
    if (duration > 1000) {
      monitoringLogger.warn('Slow request detected', {
        duration,
        threshold: 1000,
        performanceAlert: true
      });
    }
    
    // Check for alert conditions
    this.checkAlerts();
  }
  
  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    
    // Calculate requests per second over last minute
    const recentRequests = this.requestTimestamps.filter(timestamp => now - timestamp < windowMs);
    const requestsPerSecond = recentRequests.length / (windowMs / 1000);
    
    // Calculate average response time
    const averageResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((sum, time) => sum + time, 0) / this.requestTimes.length
      : 0;
    
    // Calculate error rate
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    
    return {
      requestsPerSecond,
      averageResponseTime,
      errorRate,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: now - this.startTime,
      totalRequests: this.requestCount,
      totalErrors: this.errorCount
    };
  }
  
  /**
   * Check if any metrics exceed alert thresholds
   */
  private checkAlerts() {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    for (const threshold of this.alertThresholds) {
      const metricValue = metrics[threshold.metric] as number;
      const alertKey = `${threshold.metric}_${threshold.severity}`;
      
      // Check if alert cooldown has passed
      const lastAlert = this.lastAlertTime.get(alertKey) || 0;
      if (now - lastAlert < this.alertCooldown) {
        continue;
      }
      
      let shouldAlert = false;
      switch (threshold.comparison) {
        case 'gt':
          shouldAlert = metricValue > threshold.threshold;
          break;
        case 'lt':
          shouldAlert = metricValue < threshold.threshold;
          break;
        case 'eq':
          shouldAlert = metricValue === threshold.threshold;
          break;
      }
      
      if (shouldAlert) {
        this.triggerAlert(threshold, metricValue, metrics);
        this.lastAlertTime.set(alertKey, now);
      }
    }
  }
  
  /**
   * Trigger an alert
   */
  private triggerAlert(threshold: AlertThreshold, currentValue: number, allMetrics: PerformanceMetrics) {
    const logMethod = threshold.severity === 'critical' ? 'error' : 'warn';
    
    monitoringLogger[logMethod](`Performance alert: ${threshold.metric} threshold exceeded`, {
      alert: true,
      severity: threshold.severity,
      metric: threshold.metric,
      currentValue,
      threshold: threshold.threshold,
      comparison: threshold.comparison,
      allMetrics,
      timestamp: new Date().toISOString()
    });
    
    // In production, this would integrate with alerting systems like:
    // - PagerDuty
    // - Slack webhooks
    // - Email notifications
    // - SMS alerts for critical issues
  }
  
  /**
   * Get performance summary for health checks
   */
  getHealthSummary() {
    const metrics = this.getMetrics();
    
    return {
      status: this.determineHealthStatus(metrics),
      metrics: {
        avgResponseTime: Math.round(metrics.averageResponseTime),
        errorRate: Math.round(metrics.errorRate * 100) / 100,
        requestsPerSecond: Math.round(metrics.requestsPerSecond * 100) / 100,
        memoryUsageMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        uptime: metrics.uptime
      }
    };
  }
  
  /**
   * Determine overall health status based on metrics
   */
  private determineHealthStatus(metrics: PerformanceMetrics): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.errorRate > 15 || metrics.averageResponseTime > 5000) {
      return 'unhealthy';
    }
    
    if (metrics.errorRate > 5 || metrics.averageResponseTime > 2000) {
      return 'degraded';
    }
    
    return 'healthy';
  }
  
  /**
   * Reset metrics (useful for testing or periodic resets)
   */
  reset() {
    this.requestTimes = [];
    this.requestTimestamps = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.startTime = Date.now();
    this.lastAlertTime.clear();
  }
  
  /**
   * Add custom alert threshold
   */
  addAlertThreshold(threshold: AlertThreshold) {
    this.alertThresholds.push(threshold);
  }
  
  /**
   * Get detailed performance report
   */
  getDetailedReport() {
    const metrics = this.getMetrics();
    const now = Date.now();
    
    // Calculate percentiles for response times
    const sortedTimes = [...this.requestTimes].sort((a, b) => a - b);
    const percentiles = {
      p50: this.getPercentile(sortedTimes, 0.5),
      p90: this.getPercentile(sortedTimes, 0.9),
      p95: this.getPercentile(sortedTimes, 0.95),
      p99: this.getPercentile(sortedTimes, 0.99)
    };
    
    return {
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      requests: {
        total: metrics.totalRequests,
        errors: metrics.totalErrors,
        errorRate: metrics.errorRate,
        rps: metrics.requestsPerSecond
      },
      responseTime: {
        average: metrics.averageResponseTime,
        percentiles
      },
      system: {
        memory: metrics.memoryUsage,
        cpu: metrics.cpuUsage
      }
    };
  }
  
  /**
   * Calculate percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();