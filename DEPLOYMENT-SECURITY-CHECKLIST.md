# Deployment Security Checklist

## Pre-Deployment Security Verification

### 1. API Key Management ✅
- [ ] **CRITICAL**: No API keys hardcoded in source code
- [ ] **CRITICAL**: No API keys in `.env.example` files
- [ ] **CRITICAL**: All placeholder values use `YOUR_API_KEY_HERE` format
- [ ] **CRITICAL**: Real API keys stored only in environment variables/secrets
- [ ] **CRITICAL**: `.env` files added to `.gitignore`

### 2. Secrets Management ✅
- [ ] **Express Server**: API key loaded from `process.env.APOLLO_API_KEY`
- [ ] **Cloudflare Workers**: API key stored as Wrangler secret
- [ ] **Staging Environment**: Separate API key configured
- [ ] **Production Environment**: Production API key configured
- [ ] **Key Rotation**: Documented procedure for key rotation

### 3. Authentication & Authorization ✅
- [ ] **API Key Validation**: Client must provide valid Apollo.io API key
- [ ] **Header Support**: Accepts `Authorization: Bearer <key>` and `X-API-Key: <key>`
- [ ] **Mock Mode**: Graceful fallback when no API key configured
- [ ] **Error Handling**: Proper 401 responses for invalid keys
- [ ] **Audit Logging**: Authentication failures logged

### 4. Security Headers ✅
- [ ] **X-Content-Type-Options**: `nosniff`
- [ ] **X-Frame-Options**: `DENY`
- [ ] **X-XSS-Protection**: `1; mode=block`
- [ ] **Referrer-Policy**: `strict-origin-when-cross-origin`
- [ ] **Permissions-Policy**: Restrictive permissions
- [ ] **HSTS**: Enabled for HTTPS in production
- [ ] **CSP**: Content Security Policy implemented

### 5. Rate Limiting ✅
- [ ] **Per-IP Limiting**: 60 requests/minute in production
- [ ] **Rate Headers**: X-RateLimit-* headers included
- [ ] **429 Responses**: Proper rate limit exceeded responses
- [ ] **Cleanup Process**: Memory cleanup for expired entries
- [ ] **Burst Protection**: Prevents rapid-fire attacks

### 6. Input Validation ✅
- [ ] **Request Size**: 10MB maximum request size
- [ ] **Content Type**: JSON validation for POST requests
- [ ] **Correlation IDs**: Request tracking implemented
- [ ] **Error Responses**: Structured JSON-RPC error format
- [ ] **Input Sanitization**: Zod validation in tools layer

### 7. Logging & Monitoring ✅
- [ ] **Security Events**: Authentication failures logged
- [ ] **Rate Limiting**: Rate limit violations logged
- [ ] **Error Tracking**: All errors logged with correlation IDs
- [ ] **Performance Metrics**: Request duration and counts tracked
- [ ] **Log Format**: Structured JSON logging
- [ ] **Log Levels**: Appropriate levels for each environment

## Environment-Specific Deployment

### Development Environment
```bash
# Create .env file (never commit)
cp .env.example .env

# Set real API key
APOLLO_API_KEY=your_real_apollo_key_here
PORT=8123
NODE_ENV=development
LOG_LEVEL=debug

# Start server
npm run dev
```

### Staging Environment (Cloudflare Workers)
```bash
# Set staging secret
echo "your_staging_api_key" | npx wrangler secret put APOLLO_API_KEY --env staging

# Deploy to staging
npm run deploy:staging

# Verify deployment
curl https://apollo-mcp-staging.designthru.ai/health
```

### Production Environment (Cloudflare Workers)
```bash
# Set production secret
echo "your_production_api_key" | npx wrangler secret put APOLLO_API_KEY --env production

# Deploy to production
npm run deploy:production

# Verify deployment
curl https://apollo-mcp.designthru.ai/health
```

## Security Testing

### Authentication Testing
```bash
# Test without API key (should return 401)
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'

# Test with invalid API key (should return 401)
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'

# Test with valid API key (should return 200)
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Authorization: Bearer YOUR_REAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'
```

### Rate Limiting Testing
```bash
# Test rate limiting (run multiple times quickly)
for i in {1..70}; do
  curl -X POST https://apollo-mcp.designthru.ai/mcp \
    -H "Authorization: Bearer YOUR_REAL_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc": "2.0", "method": "tools/list", "id": '$i'}'
done
```

### Security Headers Testing
```bash
# Check security headers
curl -I https://apollo-mcp.designthru.ai/health

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
```

## Incident Response Procedures

### If API Key is Compromised

**Immediate Actions (< 1 hour):**
1. Revoke compromised key in Apollo.io dashboard
2. Generate new API key with minimum permissions
3. Update secrets in all environments
4. Force redeploy all services
5. Monitor access logs for unauthorized usage

**Recovery Steps:**
```bash
# 1. Update staging environment
echo "new_secure_api_key" | npx wrangler secret put APOLLO_API_KEY --env staging
npm run deploy:staging

# 2. Test staging environment
npm run test:integration

# 3. Update production environment
echo "new_secure_api_key" | npx wrangler secret put APOLLO_API_KEY --env production  
npm run deploy:production

# 4. Verify production deployment
curl https://apollo-mcp.designthru.ai/health
```

**Post-Incident:**
- Review logs for timeframe of exposure
- Document lessons learned
- Update security procedures
- Consider additional monitoring

### Security Alert Procedures

**For authentication failures exceeding normal rates:**
1. Check logs for source IPs and patterns
2. Consider blocking malicious IPs at infrastructure level
3. Monitor for credential stuffing attempts
4. Review and potentially rotate API keys

**For rate limiting violations:**
1. Analyze traffic patterns in logs
2. Distinguish between legitimate bursts and attacks
3. Consider adjusting rate limits if needed
4. Block persistent violators

## Production Deployment Verification

After each production deployment, verify:

```bash
# 1. Health check passes
curl https://apollo-mcp.designthru.ai/health | jq '.status'
# Expected: "healthy"

# 2. Authentication works
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}' | jq '.result'

# 3. Rate limiting active
curl -I https://apollo-mcp.designthru.ai/mcp | grep -i ratelimit

# 4. Security headers present
curl -I https://apollo-mcp.designthru.ai/health | grep -E "(X-Frame-Options|X-Content-Type-Options)"
```

## Monitoring & Alerting

### Key Metrics to Monitor
- Authentication failure rate (>5% may indicate attack)
- Rate limiting trigger rate (>1% may indicate abuse)
- Error rate (>2% may indicate issues)
- Response times (>500ms may indicate performance issues)
- Memory usage (>80% may indicate memory leaks)

### Alert Thresholds
- **Critical**: Authentication failure rate >20% over 5 minutes
- **Warning**: Rate limiting >10% over 10 minutes  
- **Info**: Error rate >5% over 15 minutes

### Log Analysis Queries

For Cloudflare Workers logs:
```sql
-- Authentication failures
SELECT timestamp, cf.clientIP, cf.userAgent, message 
FROM logs 
WHERE message LIKE '%Authentication failed%' 
AND timestamp > datetime('now', '-1 hour')
ORDER BY timestamp DESC;

-- Rate limit violations
SELECT timestamp, cf.clientIP, count(*) as violations
FROM logs 
WHERE message LIKE '%Rate limit exceeded%' 
AND timestamp > datetime('now', '-1 hour')
GROUP BY cf.clientIP
ORDER BY violations DESC;
```

## Security Compliance

### Data Protection
- No PII stored in logs or memory
- API responses filtered to remove sensitive data
- Correlation IDs used instead of user identifiers
- Request bodies not logged (may contain sensitive data)

### Access Controls
- Principle of least privilege for API keys
- Environment separation (dev/staging/prod)
- No shared credentials across environments
- Regular access reviews and key rotation

### Audit Trail
- All authentication events logged
- Security events tracked with correlation IDs
- Log retention policy implemented
- Audit logs protected from tampering

---

**Deployment Approved By:** _____________________ **Date:** _____/_____/_____

**Security Review Completed By:** _____________________ **Date:** _____/_____/_____