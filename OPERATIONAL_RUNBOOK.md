# Apollo.io MCP Server - Operational Runbook

## 🚀 Quick Start

### Health Check Endpoints
```bash
# Basic health check
curl http://localhost:8123/health

# Detailed metrics
curl http://localhost:8123/metrics

# Error reports
curl http://localhost:8123/errors

# Filter errors by severity
curl "http://localhost:8123/errors?severity=critical&limit=10"
```

### Production URLs
- **Health:** `https://apollo-mcp.company.com/health`
- **Metrics:** `https://apollo-mcp.company.com/metrics`
- **Errors:** `https://apollo-mcp.company.com/errors`

---

## 📊 Monitoring Overview

### Key Metrics to Monitor

| Metric | Healthy | Degraded | Unhealthy |
|--------|---------|----------|-----------|
| Error Rate | < 5% | 5-15% | > 15% |
| Response Time (avg) | < 2000ms | 2000-5000ms | > 5000ms |
| Memory Usage | < 80% | 80-90% | > 90% |
| Apollo API Status | Connected | Partial | Disconnected |

### Monitoring Endpoints

#### Health Check Response
```json
{
  "status": "healthy|degraded|unhealthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400000,
  "memory": {
    "heapUsed": 45123456,
    "heapTotal": 67108864,
    "external": 1234567
  },
  "apollo_api": "connected|disconnected|mock_mode",
  "performance": {
    "status": "healthy",
    "metrics": {
      "avgResponseTime": 234,
      "errorRate": 2.1,
      "requestsPerSecond": 12.5
    }
  },
  "errors": {
    "status": "healthy",
    "details": "Error rates within normal parameters"
  }
}
```

---

## 🚨 Alert Response Procedures

### Critical Alerts (Immediate Response Required)

#### 1. Critical Error Rate (> 15%)
**Symptoms:** High number of 5xx responses, user complaints
**Steps:**
1. Check `/health` endpoint status
2. Review recent errors: `curl /errors?severity=critical&limit=20`
3. Check Apollo.io API status
4. Review logs for patterns: `docker logs apollo-mcp-server | grep ERROR`
5. If API issues, check rate limiting: `curl /metrics | jq '.apollo_api'`
6. Scale resources if needed
7. Roll back recent deployments if correlation found

#### 2. Process Crash
**Symptoms:** 503 responses, process restarts
**Steps:**
1. Check container/process status: `docker ps` or `systemctl status apollo-mcp`
2. Review crash logs: `docker logs apollo-mcp-server --tail=100`
3. Check system resources: `htop`, `df -h`
4. Restart service if needed: `docker restart apollo-mcp-server`
5. Monitor for repeated crashes
6. Analyze core dumps if available

#### 3. Very Slow Response Time (> 5000ms)
**Symptoms:** Timeouts, user complaints about slow performance
**Steps:**
1. Check current load: `curl /metrics | jq '.performance'`
2. Review slow requests in logs
3. Check Apollo.io API response times
4. Monitor database connections if applicable
5. Scale horizontally if needed
6. Implement request queuing if overwhelmed

### High Priority Alerts

#### 1. Apollo.io API Disconnected
**Steps:**
1. Verify API key: `echo $APOLLO_API_KEY | wc -c`
2. Test direct API call: `curl -H "X-Api-Key: $APOLLO_API_KEY" https://api.apollo.io/v1/auth/health`
3. Check rate limiting status
4. Review API documentation for changes
5. Switch to mock mode if needed for continuity
6. Contact Apollo.io support if API issues confirmed

#### 2. High Memory Usage (> 80%)
**Steps:**
1. Check memory breakdown: `curl /metrics | jq '.detailed.system.memory'`
2. Review for memory leaks in logs
3. Restart process if memory usage climbing
4. Scale vertically if consistently high
5. Profile application for memory issues

---

## 🔧 Troubleshooting Guide

### Common Issues

#### Service Won't Start
```bash
# Check port conflicts
sudo lsof -i :8123

# Check environment variables
env | grep -E "(APOLLO|NODE|PORT)"

# Check permissions
ls -la /app
docker logs apollo-mcp-server
```

#### High Error Rates
```bash
# Get error breakdown
curl /errors | jq '.summary.errorsByType'

# Recent critical errors
curl "/errors?severity=critical&limit=5"

# Check specific endpoints
curl /errors | jq '.summary.errorsByEndpoint'
```

#### Performance Issues
```bash
# Get detailed performance report
curl /metrics | jq '.detailed'

# Check response time percentiles
curl /metrics | jq '.detailed.responseTime.percentiles'

# Monitor real-time
watch -n 5 'curl -s /health | jq .performance'
```

### Log Analysis

#### Key Log Patterns
```bash
# Error tracking
grep "Error tracked" /var/log/apollo-mcp/combined.log

# Performance issues
grep "Slow request detected" /var/log/apollo-mcp/combined.log

# API connectivity
grep "Apollo API" /var/log/apollo-mcp/combined.log

# Security events
grep "Security event" /var/log/apollo-mcp/combined.log
```

#### Structured Log Query Examples
```bash
# Find all errors for correlation ID
grep "correlationId.*abc123" /var/log/apollo-mcp/combined.log

# Performance over time
grep "Request completed" /var/log/apollo-mcp/combined.log | \
  jq -r '[.timestamp, .duration] | @csv'

# Error frequency by endpoint
grep "Error tracked" /var/log/apollo-mcp/combined.log | \
  jq -r '.url' | sort | uniq -c | sort -nr
```

---

## 🚀 Deployment Procedures

### Pre-deployment Checklist
- [ ] Health check endpoint responds
- [ ] All environment variables set
- [ ] Apollo.io API key valid
- [ ] Log directories writable
- [ ] Port 8123 available
- [ ] Monitoring dashboards updated

### Deployment Steps
1. **Backup current version**
   ```bash
   docker tag apollo-mcp-server:latest apollo-mcp-server:backup-$(date +%Y%m%d)
   ```

2. **Deploy new version**
   ```bash
   docker build -t apollo-mcp-server:latest .
   docker-compose up -d apollo-mcp-server
   ```

3. **Health validation**
   ```bash
   # Wait for startup
   sleep 30
   
   # Check health
   curl -f http://localhost:8123/health || exit 1
   
   # Verify functionality
   curl -f http://localhost:8123/metrics || exit 1
   ```

4. **Monitor for issues**
   - Watch error rates for 15 minutes
   - Check performance metrics
   - Verify Apollo.io API connectivity

### Rollback Procedure
```bash
# Stop current version
docker stop apollo-mcp-server

# Restore backup
docker run -d --name apollo-mcp-server apollo-mcp-server:backup-$(date +%Y%m%d)

# Verify rollback
curl http://localhost:8123/health
```

---

## 📈 Performance Optimization

### Scaling Guidelines

#### Horizontal Scaling Triggers
- Request rate > 100 RPS consistently
- Response time > 1000ms average
- CPU usage > 70% for 10+ minutes

#### Vertical Scaling Triggers  
- Memory usage > 80% consistently
- Frequent garbage collection events
- Container restart due to OOM

### Configuration Tuning

#### Environment Variables
```bash
# Logging
LOG_LEVEL=info
NODE_ENV=production

# Performance
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16

# Monitoring
MONITORING_ENABLED=true
PERFORMANCE_MONITORING=true
ERROR_TRACKING=true
```

#### Resource Limits
```yaml
# Docker Compose
resources:
  limits:
    memory: 2G
    cpus: '1.0'
  reservations:
    memory: 512M
    cpus: '0.5'
```

---

## 🔐 Security Procedures

### Security Monitoring
- Monitor authentication failures
- Check for unusual request patterns
- Watch for rate limiting events
- Review access logs daily

### Incident Response
1. **Isolate** affected components
2. **Preserve** logs and evidence
3. **Assess** impact and scope
4. **Contain** the threat
5. **Remediate** vulnerabilities
6. **Document** lessons learned

---

## 🛠 Maintenance Tasks

### Daily
- [ ] Check dashboard for anomalies
- [ ] Review error reports
- [ ] Verify health check status
- [ ] Monitor Apollo.io API usage

### Weekly
- [ ] Analyze performance trends
- [ ] Review and clean old logs
- [ ] Update security patches
- [ ] Test backup procedures

### Monthly
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Update dependencies
- [ ] Review and update runbooks

---

## 📞 Escalation Matrix

| Severity | Response Time | Escalation Path |
|----------|---------------|----------------|
| Critical | 15 minutes | On-call Engineer → Engineering Manager → CTO |
| High | 1 hour | On-call Engineer → Engineering Manager |
| Medium | 4 hours | Assigned Engineer |
| Low | Next business day | Backlog |

### Contact Information
- **On-call Engineer:** [Insert phone/slack]
- **Engineering Manager:** [Insert contact]
- **Apollo.io Support:** https://support.apollo.io
- **Infrastructure Team:** [Insert contact]

---

## 📚 Additional Resources

### Documentation Links
- [Apollo.io API Documentation](https://apolloio.github.io/apollo-api-docs/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)
- [Production Monitoring Guide](https://docs.company.com/monitoring)
- [Security Policies](https://docs.company.com/security)

### Tools and Dashboards
- **Grafana:** https://grafana.company.com/d/apollo-mcp
- **Log Aggregation:** https://logs.company.com/apollo-mcp
- **Error Tracking:** https://errors.company.com/apollo-mcp
- **Uptime Monitoring:** https://status.company.com

### Emergency Procedures
- **War Room:** #apollo-mcp-incidents
- **Status Page:** https://status.company.com
- **Communication Plan:** docs.company.com/incident-response

---

*Last Updated: January 2024*
*Version: 1.0*
*Owner: Infrastructure Team*