# Cloudflare WAF Configuration

This document describes the recommended Web Application Firewall (WAF) configuration for ClubeeShopMkt.

## Overview

Cloudflare WAF provides protection against common web attacks including SQL injection, XSS, and other OWASP Top 10 vulnerabilities.

## Recommended WAF Rules

### 1. Managed Rulesets (Enable in Cloudflare Dashboard)

Navigate to **Security > WAF > Managed rules** and enable:

- **Cloudflare Managed Ruleset** - Core protection against common attacks
- **Cloudflare OWASP Core Ruleset** - OWASP ModSecurity rules
- **Cloudflare Exposed Credentials Check** - Detect compromised credentials

### 2. Custom Rules

Create these custom rules in **Security > WAF > Custom rules**:

#### Rule 1: Block SQL Injection Patterns

```
Expression: (http.request.uri.query contains "UNION" and http.request.uri.query contains "SELECT") or
            (http.request.uri.query contains "DROP" and http.request.uri.query contains "TABLE") or
            (http.request.uri.query contains "INSERT" and http.request.uri.query contains "INTO") or
            http.request.uri.query contains "1=1" or
            http.request.uri.query contains "' OR '" or
            http.request.uri.query contains "'; --"
Action: Block
```

#### Rule 2: Block XSS Patterns

```
Expression: http.request.uri.query contains "<script" or
            http.request.uri.query contains "javascript:" or
            http.request.uri.query contains "onerror=" or
            http.request.uri.query contains "onload=" or
            http.request.body.raw contains "<script"
Action: Block
```

#### Rule 3: Rate Limit API Endpoints

```
Expression: http.request.uri.path matches "^/api/.*"
Action: Rate Limit
Rate: 100 requests per minute per IP
```

#### Rule 4: Block Suspicious User Agents

```
Expression: http.user_agent contains "sqlmap" or
            http.user_agent contains "nikto" or
            http.user_agent contains "nmap" or
            http.user_agent contains "masscan" or
            http.user_agent eq ""
Action: Challenge (CAPTCHA)
```

#### Rule 5: Protect Authentication Endpoints

```
Expression: http.request.uri.path matches "^/api/auth/.*"
Action: Rate Limit
Rate: 10 requests per minute per IP
```

### 3. Bot Management

In **Security > Bots**:

- Enable **Bot Fight Mode** (free tier)
- Or configure **Super Bot Fight Mode** (Pro+)
- Allow verified bots (Googlebot, Bingbot, etc.)

### 4. DDoS Protection

In **Security > DDoS**:

- Enable **HTTP DDoS attack protection** (automatic)
- Set sensitivity to **High** for API endpoints
- Configure **Rate limiting** rules as backup

## Security Headers

These headers are set in `entry.server.tsx`:

```typescript
responseHeaders.set("X-Content-Type-Options", "nosniff");
responseHeaders.set("X-Frame-Options", "SAMEORIGIN");
responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
```

Additional headers to consider adding via Cloudflare Transform Rules:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

## IP Access Rules

In **Security > WAF > Tools > IP Access Rules**:

- Block known malicious IP ranges
- Allow office/VPN IPs for admin access
- Consider geo-blocking if not serving globally

## Firewall Events Monitoring

Monitor attacks in **Security > Events**:

- Set up email alerts for blocked requests
- Review logs weekly for patterns
- Adjust rules based on false positives

## Implementation Checklist

- [ ] Enable Cloudflare Managed Ruleset
- [ ] Enable OWASP Core Ruleset
- [ ] Create SQL injection blocking rule
- [ ] Create XSS blocking rule
- [ ] Configure API rate limiting
- [ ] Enable Bot Fight Mode
- [ ] Set up security headers via Transform Rules
- [ ] Configure alerting for security events
- [ ] Test rules don't block legitimate traffic

## Testing

After enabling WAF rules:

1. Test normal application flows work correctly
2. Verify API endpoints respond normally
3. Check that legitimate bots can access the site
4. Monitor for false positives in first 24-48 hours
5. Adjust rule sensitivity if needed
