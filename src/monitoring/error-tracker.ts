import { monitoringLogger } from './logger';

export interface ErrorReport {
  errorId: string;
  timestamp: string;
  message: string;
  stack?: string;
  name: string;
  context?: Record<string, any>;
  correlationId?: string;
  userId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByEndpoint: Record<string, number>;
  recentErrors: ErrorReport[];
  errorRate: number;
  commonErrors: Array<{ message: string; count: number; lastOccurred: string }>;
}

/**
 * Centralized error tracking and reporting system
 */
export class ErrorTracker {
  private errors: ErrorReport[] = [];
  private errorCounts = new Map<string, number>();
  private endpointErrors = new Map<string, number>();
  private maxStoredErrors = 1000; // Keep last 1000 errors in memory
  
  /**
   * Track an error with context
   */
  trackError(
    error: Error,
    context: {
      correlationId?: string;
      userId?: string;
      url?: string;
      method?: string;
      statusCode?: number;
      userAgent?: string;
      ip?: string;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      additionalContext?: Record<string, any>;
    } = {}
  ): string {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const severity = context.severity || this.determineSeverity(error, context.statusCode);
    
    const errorReport: ErrorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      correlationId: context.correlationId,
      userId: context.userId,
      url: context.url,
      method: context.method,
      statusCode: context.statusCode,
      userAgent: context.userAgent,
      ip: context.ip,
      severity,
      context: context.additionalContext
    };
    
    // Store error
    this.errors.unshift(errorReport);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors = this.errors.slice(0, this.maxStoredErrors);
    }
    
    // Update counters
    this.incrementErrorCount(error.message);
    if (context.url) {
      this.incrementEndpointErrorCount(context.url);
    }
    
    // Log error with appropriate level
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'error' : 'warn';
    monitoringLogger[logLevel]('Error tracked', {
      errorId,
      errorName: error.name,
      errorMessage: error.message,
      severity,
      ...context
    });
    
    // Trigger alerts for critical errors
    if (severity === 'critical') {
      this.triggerCriticalAlert(errorReport);
    }
    
    return errorId;
  }
  
  /**
   * Get error summary statistics
   */
  getErrorSummary(): ErrorSummary {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentErrors = this.errors.filter(err => 
      now - new Date(err.timestamp).getTime() < oneHour
    );
    
    // Count errors by type
    const errorsByType: Record<string, number> = {};
    this.errors.forEach(err => {
      errorsByType[err.name] = (errorsByType[err.name] || 0) + 1;
    });
    
    // Count errors by endpoint
    const errorsByEndpoint: Record<string, number> = {};
    this.errors.forEach(err => {
      if (err.url) {
        errorsByEndpoint[err.url] = (errorsByEndpoint[err.url] || 0) + 1;
      }
    });
    
    // Find common errors
    const errorFrequency = new Map<string, { count: number; lastOccurred: string }>();
    this.errors.forEach(err => {
      const existing = errorFrequency.get(err.message);
      if (existing) {
        existing.count++;
        if (new Date(err.timestamp) > new Date(existing.lastOccurred)) {
          existing.lastOccurred = err.timestamp;
        }
      } else {
        errorFrequency.set(err.message, { count: 1, lastOccurred: err.timestamp });
      }
    });
    
    const commonErrors = Array.from(errorFrequency.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalErrors: this.errors.length,
      errorsByType,
      errorsByEndpoint,
      recentErrors: recentErrors.slice(0, 20), // Last 20 recent errors
      errorRate: this.calculateErrorRate(),
      commonErrors
    };
  }
  
  /**
   * Get error by ID
   */
  getError(errorId: string): ErrorReport | undefined {
    return this.errors.find(err => err.errorId === errorId);
  }
  
  /**
   * Search errors by criteria
   */
  searchErrors(criteria: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    errorName?: string;
    url?: string;
    correlationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): ErrorReport[] {
    let filtered = [...this.errors];
    
    if (criteria.severity) {
      filtered = filtered.filter(err => err.severity === criteria.severity);
    }
    
    if (criteria.errorName) {
      filtered = filtered.filter(err => err.name === criteria.errorName);
    }
    
    if (criteria.url) {
      filtered = filtered.filter(err => err.url === criteria.url);
    }
    
    if (criteria.correlationId) {
      filtered = filtered.filter(err => err.correlationId === criteria.correlationId);
    }
    
    if (criteria.startDate) {
      filtered = filtered.filter(err => new Date(err.timestamp) >= criteria.startDate!);
    }
    
    if (criteria.endDate) {
      filtered = filtered.filter(err => new Date(err.timestamp) <= criteria.endDate!);
    }
    
    return filtered.slice(0, criteria.limit || 50);
  }
  
  /**
   * Check if error rate is concerning
   */
  isErrorRateHigh(): boolean {
    const errorRate = this.calculateErrorRate();
    return errorRate > 5; // More than 5% error rate is concerning
  }
  
  /**
   * Get health status based on error patterns
   */
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'unhealthy'; details: string } {
    const summary = this.getErrorSummary();
    const criticalErrors = this.errors.filter(err => err.severity === 'critical').length;
    const recentCriticalErrors = summary.recentErrors.filter(err => err.severity === 'critical').length;
    
    if (recentCriticalErrors > 0) {
      return { 
        status: 'unhealthy', 
        details: `${recentCriticalErrors} critical errors in the last hour` 
      };
    }
    
    if (summary.errorRate > 10) {
      return { 
        status: 'unhealthy', 
        details: `High error rate: ${summary.errorRate.toFixed(2)}%` 
      };
    }
    
    if (summary.errorRate > 5 || criticalErrors > 0) {
      return { 
        status: 'degraded', 
        details: `Elevated error rate: ${summary.errorRate.toFixed(2)}%` 
      };
    }
    
    return { status: 'healthy', details: 'Error rates within normal parameters' };
  }
  
  /**
   * Generate error report for external systems
   */
  generateErrorReport(timeRange: 'hour' | 'day' | 'week' = 'day'): Record<string, any> {
    const now = Date.now();
    let timeMs: number;
    
    switch (timeRange) {
      case 'hour':
        timeMs = 60 * 60 * 1000;
        break;
      case 'day':
        timeMs = 24 * 60 * 60 * 1000;
        break;
      case 'week':
        timeMs = 7 * 24 * 60 * 60 * 1000;
        break;
    }
    
    const periodErrors = this.errors.filter(err => 
      now - new Date(err.timestamp).getTime() < timeMs
    );
    
    const report = {
      period: timeRange,
      startTime: new Date(now - timeMs).toISOString(),
      endTime: new Date().toISOString(),
      totalErrors: periodErrors.length,
      severityBreakdown: {
        critical: periodErrors.filter(e => e.severity === 'critical').length,
        high: periodErrors.filter(e => e.severity === 'high').length,
        medium: periodErrors.filter(e => e.severity === 'medium').length,
        low: periodErrors.filter(e => e.severity === 'low').length
      },
      topErrors: this.getTopErrors(periodErrors),
      affectedEndpoints: this.getAffectedEndpoints(periodErrors),
      recommendations: this.generateRecommendations(periodErrors)
    };
    
    return report;
  }
  
  /**
   * Clear old errors to manage memory
   */
  clearOldErrors(olderThanDays: number = 7) {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const originalLength = this.errors.length;
    
    this.errors = this.errors.filter(err => 
      new Date(err.timestamp).getTime() > cutoffTime
    );
    
    const removed = originalLength - this.errors.length;
    if (removed > 0) {
      monitoringLogger.info('Cleared old errors from memory', { removed, retainedDays: olderThanDays });
    }
  }
  
  // Private helper methods
  
  private determineSeverity(error: Error, statusCode?: number): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: System-breaking errors
    if (error.name === 'SystemError' || statusCode === 500) return 'critical';
    
    // High: Major functionality issues
    if (error.name === 'ValidationError' || statusCode === 400) return 'high';
    
    // Medium: Moderate issues
    if (error.name === 'NotFoundError' || statusCode === 404) return 'medium';
    
    // Default to medium for unknown errors
    return 'medium';
  }
  
  private incrementErrorCount(message: string) {
    this.errorCounts.set(message, (this.errorCounts.get(message) || 0) + 1);
  }
  
  private incrementEndpointErrorCount(url: string) {
    this.endpointErrors.set(url, (this.endpointErrors.get(url) || 0) + 1);
  }
  
  private calculateErrorRate(): number {
    // This would integrate with request tracking in a real system
    // For now, return a simple calculation based on stored errors
    const recentErrors = this.errors.filter(err => 
      Date.now() - new Date(err.timestamp).getTime() < 60 * 60 * 1000
    );
    
    // Assuming ~100 requests per hour as baseline
    const estimatedRequests = 100;
    return recentErrors.length > 0 ? (recentErrors.length / estimatedRequests) * 100 : 0;
  }
  
  private triggerCriticalAlert(error: ErrorReport) {
    monitoringLogger.error('CRITICAL ERROR ALERT', {
      alert: true,
      severity: 'critical',
      errorId: error.errorId,
      errorName: error.name,
      errorMessage: error.message,
      context: error.context,
      timestamp: error.timestamp
    });
    
    // In production, this would trigger:
    // - PagerDuty incident
    // - Slack notification to on-call team
    // - SMS alerts
    // - Email to engineering team
  }
  
  private getTopErrors(errors: ErrorReport[]): Array<{ message: string; count: number }> {
    const frequency = new Map<string, number>();
    errors.forEach(err => {
      frequency.set(err.message, (frequency.get(err.message) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
  
  private getAffectedEndpoints(errors: ErrorReport[]): Array<{ endpoint: string; errorCount: number }> {
    const endpointCounts = new Map<string, number>();
    errors.forEach(err => {
      if (err.url) {
        endpointCounts.set(err.url, (endpointCounts.get(err.url) || 0) + 1);
      }
    });
    
    return Array.from(endpointCounts.entries())
      .map(([endpoint, errorCount]) => ({ endpoint, errorCount }))
      .sort((a, b) => b.errorCount - a.errorCount);
  }
  
  private generateRecommendations(errors: ErrorReport[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = errors.filter(e => e.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Immediate attention required: ${criticalCount} critical errors detected`);
    }
    
    const topErrors = this.getTopErrors(errors);
    if (topErrors.length > 0) {
      recommendations.push(`Focus on resolving: "${topErrors[0].message}" (${topErrors[0].count} occurrences)`);
    }
    
    const affectedEndpoints = this.getAffectedEndpoints(errors);
    if (affectedEndpoints.length > 0) {
      recommendations.push(`Review endpoint: ${affectedEndpoints[0].endpoint} (${affectedEndpoints[0].errorCount} errors)`);
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();