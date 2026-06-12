# 🚀 Production Deployment Guide

Complete instructions for deploying Eazzio Payroll to production.

---

## Backend Deployment (Render)

### 1. Prepare Backend

```bash
# Ensure .env.production configured
cp .env .env.production

# Configure critical variables
DATABASE_URL=postgresql://neon_production_url
REDIS_URL=redis_cloud_url
JWT_SECRET=secure_random_key
NODE_ENV=production
```

### 2. Deploy to Render

```bash
# Create account: https://render.com

# Connect GitHub repo
# Go to Dashboard > New > Web Service
# Select GitHub repository
# Configure:
# - Name: eazzio-backend
# - Runtime: Node
# - Build Command: npm install
# - Start Command: npm start
# - Environment: Production

# Add environment variables in dashboard
```

### 3. Post-Deployment

```bash
# Run migrations
render exec 'npm run db:migrate'

# Verify API
curl https://eazzio-backend.onrender.com/api/v1/health

# Monitor logs
# Dashboard > Logs section
```

---

## Frontend Deployment (Vercel)

### 1. Prepare Frontend

```bash
# Build locally first
npm run build

# Test build
npm start
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### 3. Configure Vercel

```
Environment Variables:
- NEXT_PUBLIC_API_URL=https://eazzio-backend.onrender.com/api/v1
- NEXT_PUBLIC_MAPPLS_TOKEN=your_token

Domains:
- Primary: eazzio.com
- Alias: app.eazzio.com
```

### 4. Configure DNS

```
For your domain provider:
- CNAME: eazzio.com -> cname.vercel.com
- MX records for emails
```

---

## Mobile App Deployment

### Android Play Store

```bash
# 1. Generate keystore
keytool -genkey -v -keystore eazzio.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias eazzio

# 2. Configure signing
# android/app/build.gradle:
# signingConfigs {
#   release {
#     keyStore file('eazzio.jks')
#     keyStorePassword 'password'
#     keyAlias 'eazzio'
#     keyPassword 'password'
#   }
# }

# 3. Build release APK
flutter build apk --release

# 4. Build AAB for Play Store
flutter build appbundle --release

# 5. Upload to Play Store
# - Create account: https://play.google.com/console
# - Create app
# - Upload AAB file
# - Fill store listing
# - Submit for review
```

### iOS App Store

```bash
# 1. Create app identifier in Apple Developer

# 2. Generate certificates and provisioning profiles

# 3. Configure in Xcode:
# - Project > Build Settings
# - Team ID
# - Bundle Identifier
# - Code Signing Identity

# 4. Build release
flutter build ios --release

# 5. Archive and upload
# - Xcode > Product > Archive
# - Organizer > Validate
# - Distribute App

# 6. Submit to TestFlight
# - TestFlight > Internal Testers
# - After approval, submit to App Store
```

---

## Database Migration (Production)

### Pre-Migration Checklist

- [ ] Backup current database
- [ ] Notify users of maintenance window
- [ ] Test migrations on staging
- [ ] Prepare rollback script
- [ ] Have database team on standby

### Perform Migration

```bash
# Connect to production database
export DATABASE_URL=production_url

# Run migrations
npx prisma migrate deploy

# Verify
npx prisma studio

# Monitor performance
# Check slow queries and connections
```

### Rollback (if needed)

```bash
# List migrations
npx prisma migrate resolve --rolled-back migration_name

# Revert to previous state
npx prisma db push
```

---

## Infrastructure Setup

### Neon PostgreSQL

```
1. Create project
2. Copy connection string
3. Configure:
   - Backup frequency: daily
   - Retention: 7 days
   - High availability: enabled
   - Read replicas: 2
```

### Redis Cloud

```
1. Sign up: https://app.redislabs.com
2. Create database
3. Select:
   - Memory: 256 MB
   - Type: Redis
   - Region: closest to app
4. Copy connection URL
```

### Cloudinary CDN

```
1. Create account
2. Get API credentials
3. Configure:
   - Auto tagging
   - Moderation
   - Transformation presets
```

---

## SSL/TLS Certificates

### Automatic (Recommended)

```
Vercel: Automatic free SSL
Render: Automatic free SSL

Both renew automatically
```

### Manual (if needed)

```bash
# Using Let's Encrypt
certbot certonly --standalone -d eazzio.com

# Configure Nginx/Apache
# Point to certificate files
# Enable HSTS header
```

---

## Monitoring & Alerts

### Render Monitoring

```
Dashboard > Monitoring:
- CPU usage
- Memory usage
- Response time
- Error rate
- Disk usage
```

### Vercel Monitoring

```
Analytics section:
- Page views
- Unique visitors
- Bounce rate
- Web vitals
```

### Application Logging

```bash
# Winston logging configured
# Logs sent to:
# - Console (dev)
# - File (prod)
# - Cloud logging service

# Monitor in Render:
# Dashboard > Logs > View tail
```

---

## Performance Optimization

### Frontend

```bash
# Build optimization
npm run build

# Analyze bundle
npm run analyze-bundle

# Minification: automatic
# Compression: gzip enabled
```

### Backend

```bash
# Enable caching
# Redis configured for sessions
# Database connection pooling

# API optimization
# Response compression enabled
# Rate limiting configured
```

### Database

```bash
# Query optimization
# Connection pooling
# Indexing for common queries
# Read replicas for reports
```

---

## Backup & Disaster Recovery

### Database Backups

```
Neon: Automated daily backups (7-day retention)
Restore: https://console.neon.tech/backups

Manual backup:
pg_dump -h neon_host -U user -d dbname > backup.sql
```

### File Backups

```
Cloudinary: Included with service
Manual export available

Code: GitHub (version control)
```

### Recovery Procedure

```
1. Restore from backup
2. Verify data integrity
3. Update connection strings
4. Run migrations if needed
5. Test all endpoints
6. Monitor for errors
```

---

## Health Checks

### API Health Check

```bash
# Endpoint: GET /health
curl https://eazzio-backend.onrender.com/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-06-12T10:00:00Z",
  "uptime": 12345,
  "database": "connected",
  "redis": "connected",
  "version": "2.0.0"
}
```

### Automated Monitoring

```
Configure in Render:
Dashboard > Cron Jobs > Add
- Health check every 5 minutes
- Alert if fails

Or use external monitoring:
- Uptime Robot
- StatusCake
- PagerDuty
```

---

## Scaling Strategy

### Vertical Scaling

```
Increase dyno size:
Render: Change dyno type
Vercel: Automatic
```

### Horizontal Scaling

```
Load balancing:
- Render: Automatic with multiple dynos
- Vercel: Automatic CDN distribution
- Database: Read replicas
```

### Database Scaling

```
Connection pooling limit increase
Read replica for analytics
Archive old data
Consider sharding if needed
```

---

## Security Checklist

- [ ] HTTPS/TLS enabled
- [ ] Environment variables secured
- [ ] Database backups encrypted
- [ ] API rate limiting active
- [ ] CORS properly configured
- [ ] SQL injection prevention (Prisma)
- [ ] Authentication enabled
- [ ] Audit logging active
- [ ] Data encryption at rest
- [ ] Regular security updates

---

## Post-Deployment Verification

```bash
# 1. API Functionality
curl https://api.eazzio.com/api/v1/auth/login -X POST

# 2. Database Connection
# Check dashboard - should show connected

# 3. Real-Time Features
# Test WebSocket connection

# 4. File Upload
# Test Cloudinary integration

# 5. Email Sending
# Verify email service

# 6. Performance
# Check response times < 200ms

# 7. Mobile App
# Update API URL in app
# Rebuild and test
```

---

<div align="center">

**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>
