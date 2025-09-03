# Security Configuration Guide

## API Key Management

### For Express Server (Development)

1. **Create `.env` file** (never commit to version control):
```bash
cp .env.example .env
```

2. **Set your API key**:
```bash
APOLLO_API_KEY=your_actual_apollo_api_key_here
PORT=8123
NODE_ENV=development
LOG_LEVEL=debug
```

3. **Verify `.env` is in `.gitignore`**:
```bash
echo ".env" >> .gitignore
```

### For Cloudflare Workers (Production)

1. **Set secrets using Wrangler CLI**:
```bash
# Production environment
echo "your_actual_apollo_api_key_here" | npx wrangler secret put APOLLO_API_KEY --env production

# Staging environment  
echo "your_staging_api_key_here" | npx wrangler secret put APOLLO_API_KEY --env staging
```

2. **Verify secrets are set**:
```bash
npx wrangler secret list --env production
npx wrangler secret list --env staging
```

3. **Update secrets** (when rotating keys):
```bash
echo "new_api_key_here" | npx wrangler secret put APOLLO_API_KEY --env production
```

## Environment Separation

### Development Environment
- Uses Express server with `.env` file
- API key loaded from `process.env.APOLLO_API_KEY`
- Fallback to mock mode if no key provided
- Enhanced logging for debugging

### Staging Environment  
- Cloudflare Workers deployment
- API key stored as Wrangler secret
- Custom domain: `apollo-mcp-staging.designthru.ai`
- Debug logging enabled

### Production Environment
- Cloudflare Workers deployment  
- API key stored as Wrangler secret
- Custom domain: `apollo-mcp.designthru.ai`
- Minimal logging for performance
- Security headers enforced

## Security Headers

The following security headers are implemented:

```javascript
// Security headers for all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
};
```

## Authentication

### MCP Client Authentication

Clients must provide the Apollo.io API key to access MCP endpoints:

**Option 1: Authorization Header**
```bash
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "Authorization: Bearer YOUR_APOLLO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'
```

**Option 2: X-API-Key Header**
```bash
curl -X POST https://apollo-mcp.designthru.ai/mcp \
  -H "X-API-Key: YOUR_APOLLO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "initialize", "id": 1}'
```

### Authentication Validation

The server validates the API key against the stored secret:
- Extracts key from `Authorization: Bearer <key>` or `X-API-Key: <key>` 
- Compares against `env.APOLLO_API_KEY`
- Returns 401 Unauthorized if invalid or missing
- Grants access to all MCP tools if valid

## Rate Limiting

### Current Implementation
- Per-tool rate limiting in memory
- 60 requests/minute for standard tools
- 30 requests/minute for bulk operations
- Resets on server restart

### Recommended Enhancements
For production, implement persistent rate limiting:

```bash
# Add Redis/KV-based rate limiting
npx wrangler kv:namespace create "RATE_LIMITS" --env production
```

## Monitoring & Logging

### Security Events Logged
- Authentication failures (401 responses)
- Rate limit violations  
- Invalid API requests
- Tool execution errors

### Log Format
```json
{
  "timestamp": "2025-01-03T10:30:00Z",
  "level": "SECURITY",
  "event": "auth_failure", 
  "client_ip": "192.168.1.1",
  "user_agent": "n8n/1.0",
  "endpoint": "/mcp/tools/call"
}
```

## Incident Response

### If API Key is Compromised

1. **Immediate Actions** (within 1 hour):
   - Revoke the compromised key in Apollo.io dashboard
   - Generate new API key with minimum required permissions
   - Update Cloudflare Workers secrets
   - Monitor Apollo.io usage logs for unauthorized activity

2. **Update Deployments**:
```bash
# Update production secret
echo "new_secure_api_key" | npx wrangler secret put APOLLO_API_KEY --env production

# Deploy updated workers
npm run deploy:production

# Verify deployment
curl https://apollo-mcp.designthru.ai/health
```

3. **Audit & Documentation**:
   - Review access logs for timeframe of exposure
   - Document lessons learned
   - Update security procedures if needed

### Security Checklist

Before deploying to production:

- [ ] API keys stored as secrets (not in code)
- [ ] All environment variables properly configured
- [ ] Security headers implemented
- [ ] Authentication working correctly
- [ ] Rate limiting functional
- [ ] Logging and monitoring active
- [ ] `.env` files in `.gitignore`
- [ ] No hardcoded secrets in repository
- [ ] Incident response procedures documented

## Contact

For security issues or questions:
- Create a private GitHub issue
- Email: security@yourcompany.com
- Slack: #security-alerts

**Never post API keys or security issues in public channels.**