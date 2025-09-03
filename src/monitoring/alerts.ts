/**
 * Alerting and notification configuration for production monitoring
 */

export interface AlertConfig {
  name: string;
  description: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMs: number;
  channels: Array<'slack' | 'email' | 'pagerduty' | 'webhook'>;
}

export interface AlertNotification {
  alertName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  value: number;
  threshold: number;
  runbook: string;
  context: Record<string, any>;
}

/**
 * Production alert configurations for the Apollo.io MCP Server
 */
export const PRODUCTION_ALERTS: AlertConfig[] = [
  {
    name: 'high-error-rate',
    description: 'Error rate exceeds acceptable threshold',
    condition: 'error_rate > 5%',
    severity: 'high',
    enabled: true,
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    channels: ['slack', 'email']
  },
  {
    name: 'critical-error-rate',
    description: 'Critical error rate indicates service degradation',
    condition: 'error_rate > 15%',
    severity: 'critical',
    enabled: true,
    cooldownMs: 2 * 60 * 1000, // 2 minutes
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'slow-response-time',
    description: 'Average response time is too slow',
    condition: 'avg_response_time > 2000ms',
    severity: 'medium',
    enabled: true,
    cooldownMs: 10 * 60 * 1000, // 10 minutes
    channels: ['slack']
  },
  {
    name: 'very-slow-response-time',
    description: 'Response times indicate serious performance issues',
    condition: 'avg_response_time > 5000ms',
    severity: 'critical',
    enabled: true,
    cooldownMs: 2 * 60 * 1000, // 2 minutes
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'high-memory-usage',
    description: 'Memory usage is approaching limits',
    condition: 'memory_usage > 80%',
    severity: 'medium',
    enabled: true,
    cooldownMs: 15 * 60 * 1000, // 15 minutes
    channels: ['slack']
  },
  {
    name: 'critical-memory-usage',
    description: 'Memory usage is dangerously high',
    condition: 'memory_usage > 90%',
    severity: 'critical',
    enabled: true,
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'apollo-api-disconnected',
    description: 'Apollo.io API connectivity lost',
    condition: 'apollo_api_status = disconnected',
    severity: 'high',
    enabled: true,
    cooldownMs: 10 * 60 * 1000, // 10 minutes
    channels: ['slack', 'email']
  },
  {
    name: 'health-check-failure',
    description: 'Health check endpoint failing',
    condition: 'health_status = unhealthy',
    severity: 'critical',
    enabled: true,
    cooldownMs: 2 * 60 * 1000, // 2 minutes
    channels: ['slack', 'email', 'pagerduty']
  },
  {
    name: 'high-request-rate',
    description: 'Unusual spike in request volume',
    condition: 'requests_per_second > 100',
    severity: 'medium',
    enabled: true,
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    channels: ['slack']
  },
  {
    name: 'process-crash',
    description: 'Application process crashed',
    condition: 'uncaught_exception OR unhandled_rejection',
    severity: 'critical',
    enabled: true,
    cooldownMs: 0, // Immediate alert
    channels: ['slack', 'email', 'pagerduty']
  }
];

/**
 * Runbook URLs for each alert type
 */
export const ALERT_RUNBOOKS: Record<string, string> = {
  'high-error-rate': 'https://docs.company.com/runbooks/apollo-mcp/error-rate',
  'critical-error-rate': 'https://docs.company.com/runbooks/apollo-mcp/critical-errors',
  'slow-response-time': 'https://docs.company.com/runbooks/apollo-mcp/performance',
  'very-slow-response-time': 'https://docs.company.com/runbooks/apollo-mcp/critical-performance',
  'high-memory-usage': 'https://docs.company.com/runbooks/apollo-mcp/memory-usage',
  'critical-memory-usage': 'https://docs.company.com/runbooks/apollo-mcp/critical-memory',
  'apollo-api-disconnected': 'https://docs.company.com/runbooks/apollo-mcp/api-connectivity',
  'health-check-failure': 'https://docs.company.com/runbooks/apollo-mcp/health-check',
  'high-request-rate': 'https://docs.company.com/runbooks/apollo-mcp/traffic-spike',
  'process-crash': 'https://docs.company.com/runbooks/apollo-mcp/process-crash'
};

/**
 * Dashboard configuration for monitoring tools
 */
export const DASHBOARD_CONFIG = {
  grafana: {
    dashboardId: 'apollo-mcp-server',
    panels: [
      {
        id: 1,
        title: 'Request Volume',
        type: 'graph',
        targets: [
          { expr: 'apollo_mcp_requests_total', legendFormat: 'Total Requests' },
          { expr: 'rate(apollo_mcp_requests_total[5m])', legendFormat: 'RPS' }
        ]
      },
      {
        id: 2,
        title: 'Response Times',
        type: 'graph',
        targets: [
          { expr: 'apollo_mcp_response_time_avg', legendFormat: 'Average' },
          { expr: 'apollo_mcp_response_time_p95', legendFormat: '95th Percentile' },
          { expr: 'apollo_mcp_response_time_p99', legendFormat: '99th Percentile' }
        ]
      },
      {
        id: 3,
        title: 'Error Rate',
        type: 'stat',
        targets: [
          { expr: 'apollo_mcp_error_rate', legendFormat: 'Error Rate %' }
        ],
        thresholds: [
          { color: 'green', value: 0 },
          { color: 'yellow', value: 5 },
          { color: 'red', value: 15 }
        ]
      },
      {
        id: 4,
        title: 'Memory Usage',
        type: 'graph',
        targets: [
          { expr: 'apollo_mcp_memory_heap_used', legendFormat: 'Heap Used' },
          { expr: 'apollo_mcp_memory_heap_total', legendFormat: 'Heap Total' }
        ]
      },
      {
        id: 5,
        title: 'Apollo API Status',
        type: 'stat',
        targets: [
          { expr: 'apollo_mcp_apollo_api_connected', legendFormat: 'API Status' }
        ]
      },
      {
        id: 6,
        title: 'Recent Errors',
        type: 'table',
        targets: [
          { expr: 'apollo_mcp_recent_errors', legendFormat: 'Error Details' }
        ]
      }
    ],
    alerts: PRODUCTION_ALERTS.map(alert => ({
      name: alert.name,
      condition: alert.condition,
      frequency: '60s',
      notifications: alert.channels
    }))
  }
};

/**
 * Slack alert message formatters
 */
export const SLACK_FORMATTERS = {
  'high-error-rate': (notification: AlertNotification) => ({
    channel: '#apollo-mcp-alerts',
    username: 'Apollo MCP Monitor',
    icon_emoji: ':warning:',
    attachments: [{
      color: 'warning',
      title: `🚨 High Error Rate Alert`,
      fields: [
        { title: 'Current Rate', value: `${notification.value.toFixed(2)}%`, short: true },
        { title: 'Threshold', value: `${notification.threshold}%`, short: true },
        { title: 'Runbook', value: `<${notification.runbook}|View Runbook>`, short: false }
      ],
      ts: Math.floor(Date.parse(notification.timestamp) / 1000)
    }]
  }),
  
  'critical-error-rate': (notification: AlertNotification) => ({
    channel: '#apollo-mcp-critical',
    username: 'Apollo MCP Monitor',
    icon_emoji: ':rotating_light:',
    text: '<!channel>',
    attachments: [{
      color: 'danger',
      title: `🆘 CRITICAL: High Error Rate`,
      fields: [
        { title: 'Current Rate', value: `${notification.value.toFixed(2)}%`, short: true },
        { title: 'Threshold', value: `${notification.threshold}%`, short: true },
        { title: 'Runbook', value: `<${notification.runbook}|IMMEDIATE ACTION REQUIRED>`, short: false }
      ],
      ts: Math.floor(Date.parse(notification.timestamp) / 1000)
    }]
  }),

  'process-crash': (notification: AlertNotification) => ({
    channel: '#apollo-mcp-critical',
    username: 'Apollo MCP Monitor',
    icon_emoji: ':skull:',
    text: '<!channel> PROCESS CRASH DETECTED',
    attachments: [{
      color: 'danger',
      title: `💀 CRITICAL: Process Crash`,
      fields: [
        { title: 'Error', value: notification.message, short: false },
        { title: 'Context', value: JSON.stringify(notification.context, null, 2), short: false },
        { title: 'Runbook', value: `<${notification.runbook}|EMERGENCY RESPONSE>`, short: false }
      ],
      ts: Math.floor(Date.parse(notification.timestamp) / 1000)
    }]
  })
};

/**
 * Email alert templates
 */
export const EMAIL_TEMPLATES = {
  subject: (alertName: string, severity: string) => 
    `[${severity.toUpperCase()}] Apollo MCP Server: ${alertName}`,
    
  body: (notification: AlertNotification) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .alert-header { background: ${notification.severity === 'critical' ? '#dc3545' : '#ffc107'}; 
                    color: white; padding: 20px; }
    .alert-content { padding: 20px; }
    .metric { background: #f8f9fa; padding: 10px; margin: 10px 0; }
    .runbook { background: #007bff; color: white; padding: 15px; margin: 20px 0; }
    .runbook a { color: white; }
  </style>
</head>
<body>
  <div class="alert-header">
    <h1>${notification.severity === 'critical' ? '🆘 CRITICAL ALERT' : '⚠️ ALERT'}</h1>
    <h2>Apollo MCP Server: ${notification.alertName}</h2>
  </div>
  
  <div class="alert-content">
    <p><strong>Time:</strong> ${notification.timestamp}</p>
    <p><strong>Severity:</strong> ${notification.severity.toUpperCase()}</p>
    
    <div class="metric">
      <p><strong>Message:</strong> ${notification.message}</p>
      <p><strong>Current Value:</strong> ${notification.value}</p>
      <p><strong>Threshold:</strong> ${notification.threshold}</p>
    </div>
    
    <div class="runbook">
      <p><strong>📚 Next Steps:</strong></p>
      <a href="${notification.runbook}">View Runbook for ${notification.alertName}</a>
    </div>
    
    <div class="metric">
      <p><strong>Context:</strong></p>
      <pre>${JSON.stringify(notification.context, null, 2)}</pre>
    </div>
  </div>
</body>
</html>
`
};

/**
 * PagerDuty integration configuration
 */
export const PAGERDUTY_CONFIG = {
  integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY || '',
  createIncident: (notification: AlertNotification) => ({
    routing_key: PAGERDUTY_CONFIG.integrationKey,
    event_action: 'trigger',
    payload: {
      summary: `Apollo MCP Server: ${notification.alertName}`,
      source: 'apollo-mcp-server',
      severity: notification.severity === 'critical' ? 'critical' : 'error',
      component: 'apollo-mcp-server',
      group: 'infrastructure',
      class: 'monitoring',
      custom_details: {
        message: notification.message,
        value: notification.value,
        threshold: notification.threshold,
        runbook: notification.runbook,
        context: notification.context
      }
    }
  })
};

/**
 * Webhook configurations for custom integrations
 */
export const WEBHOOK_CONFIG = {
  teams: {
    url: process.env.TEAMS_WEBHOOK_URL || '',
    format: (notification: AlertNotification) => ({
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Apollo MCP Alert: ${notification.alertName}`,
      themeColor: notification.severity === 'critical' ? 'FF0000' : 'FFA500',
      sections: [{
        activityTitle: `${notification.severity === 'critical' ? '🆘 CRITICAL' : '⚠️'} ${notification.alertName}`,
        activitySubtitle: notification.message,
        facts: [
          { name: 'Time', value: notification.timestamp },
          { name: 'Severity', value: notification.severity.toUpperCase() },
          { name: 'Current Value', value: notification.value.toString() },
          { name: 'Threshold', value: notification.threshold.toString() }
        ]
      }],
      potentialAction: [{
        '@type': 'OpenUri',
        name: 'View Runbook',
        targets: [{ os: 'default', uri: notification.runbook }]
      }]
    })
  }
};

export default {
  PRODUCTION_ALERTS,
  ALERT_RUNBOOKS,
  DASHBOARD_CONFIG,
  SLACK_FORMATTERS,
  EMAIL_TEMPLATES,
  PAGERDUTY_CONFIG,
  WEBHOOK_CONFIG
};