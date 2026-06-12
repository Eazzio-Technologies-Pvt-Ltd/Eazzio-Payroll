# 🔧 Complete Setup Guide

Step-by-step instructions for setting up Eazzio Payroll development environment.

---

## Prerequisites

### System Requirements

**macOS/Linux:**
```bash
# Check Node.js version
node --version  # >= 18.0.0
npm --version   # >= 9.0.0

# Check Git
git --version
```

**Windows:**
- Use PowerShell or Git Bash
- Ensure admin privileges for installations

### External Services Required

1. **Neon PostgreSQL** (Free tier available)
   - Sign up: https://neon.tech
   - Create project and copy connection string

2. **Redis** (Local or Cloud)
   - Local: `brew install redis` (macOS) or Docker
   - Cloud: Redis Labs (https://redis.com)

3. **Cloudinary** (Free tier: 25 GB/month)
   - Sign up: https://cloudinary.com
   - Get API key and secret

4. **Mailgun** (Optional, for email)
   - Sign up: https://mailgun.com
   - Get SMTP credentials

---

## Backend Setup (Node.js/Express)

### 1. Clone Repository

```bash
git clone https://github.com/eazzio/payroll-system.git
cd Eazzio-Payroll-main/FFMS_BACKEND/backend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Create Environment File

```bash
cp .env.example .env
```

### 4. Configure .env

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@region.neon.tech:5432/dbname?sslmode=require"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your_super_secret_key_change_this"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_SECRET="your_refresh_secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Cloudinary
CLOUDINARY_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# Email (Mailgun)
MAILGUN_DOMAIN="your_domain.mailgun.org"
MAILGUN_API_KEY="your_api_key"
MAILGUN_FROM_EMAIL="noreply@eazzio.com"

# Logging
LOG_LEVEL="debug"
LOG_DIR="./logs"

# CORS
CORS_ORIGIN="http://localhost:3000"
```

### 5. Setup Database

```bash
# Run migrations
npm run db:migrate

# Optional: Seed sample data
npm run db:seed

# Prisma Studio (UI)
npm run db:studio
```

### 6. Start Development Server

```bash
npm run dev

# Expected output:
# ✓ Server running on http://localhost:5000
# ✓ WebSocket connected
# ✓ Database connected
# ✓ Redis connected
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on Redis | Ensure Redis running: `redis-cli ping` |
| Database connection error | Check DATABASE_URL and network access |
| Port 5000 in use | `lsof -i :5000` then kill process |
| Module not found | Delete `node_modules` and `npm install` |

---

## Frontend Setup (Next.js/React)

### 1. Navigate to Frontend

```bash
cd ../../FFMS_FRONTEND/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
cp .env.local.example .env.local
```

### 4. Configure .env.local

```env
# API Configuration
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_SOCKET_URL="http://localhost:5000"

# Maps (Mappls)
NEXT_PUBLIC_MAPPLS_TOKEN="your_mappls_token"

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=""
```

### 5. Start Development Server

```bash
npm run dev

# Expected output:
# ▲ Next.js 16.2.6
# - Local:        http://localhost:3000
```

### Build for Production

```bash
npm run build
npm start
```

---

## Mobile Setup (Flutter)

### 1. Install Flutter

```bash
# macOS/Linux
curl -fsSL https://fvm.app/install.sh | bash

# Or download: https://flutter.dev/docs/get-started/install

# Verify installation
flutter doctor

# All items should show checkmark ✓
```

### 2. Navigate to Mobile

```bash
cd ../../ffms_mobile
```

### 3. Get Packages

```bash
flutter pub get
```

### 4. Create Environment File

```bash
touch .env
```

### 5. Configure .env

```env
API_BASE_URL=http://localhost:5000/api/v1
SOCKET_URL=http://localhost:5000
LOG_LEVEL=debug
```

### 6. Run on Android

```bash
# Using Android emulator (ensure running)
flutter run

# Or on physical device
flutter run -d <device_id>
```

### 7. Run on iOS

```bash
# Install pod dependencies
cd ios
pod install
cd ..

# Run on simulator
flutter run -d 'iPhone 15'

# Or on device (requires provisioning profile)
flutter run -d <device_id>
```

### Build APK (Android)

```bash
flutter build apk --release

# Output: build/app/outputs/flutter-app.apk
```

### Build IPA (iOS)

```bash
flutter build ios --release

# Output: build/ios/iphoneos/Runner.app
```

---

## Docker Setup (Recommended)

### Docker Compose

```bash
# In project root
docker-compose up -d

# This starts:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - Backend (port 5000)
# - Frontend (port 3000)
```

### Individual Services

```bash
# PostgreSQL
docker run -d -p 5432:5432 \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=eazzio \
  postgres:15

# Redis
docker run -d -p 6379:6379 redis:7

# Backend
docker build -t eazzio-backend .
docker run -d -p 5000:5000 \
  --env-file .env \
  eazzio-backend

# Frontend
docker build -t eazzio-frontend .
docker run -d -p 3000:3000 \
  eazzio-frontend
```

---

## Development Workflow

### 1. Daily Startup

```bash
# Terminal 1: Backend
cd FFMS_BACKEND/backend
npm run dev

# Terminal 2: Frontend
cd FFMS_FRONTEND/frontend
npm run dev

# Terminal 3: Mobile (optional)
cd ffms_mobile
flutter run
```

### 2. Database Changes

```bash
# Create migration
npx prisma migrate dev --name add_field_name

# Reset database (dev only)
npx prisma migrate reset

# View data
npx prisma studio
```

### 3. Testing

```bash
# Backend tests
cd FFMS_BACKEND/backend
npm test

# Frontend tests
cd FFMS_FRONTEND/frontend
npm test

# Mobile tests
cd ffms_mobile
flutter test
```

---

## Common Development Tasks

### 1. Create API Endpoint

```bash
# Backend structure
src/
├── routes/v1/resource.routes.js
├── controllers/resource.controller.js
├── services/resource.service.js
├── validations/resource.validation.js
└── middleware/resource.middleware.js

# Steps:
1. Create validation schema (validation/*.js)
2. Create service (services/*.js)
3. Create controller (controllers/*.js)
4. Create routes (routes/v1/*.js)
5. Add to routes/v1/index.js
```

### 2. Connect Frontend to API

```typescript
// lib/api-client.ts
const response = await fetch('/api/v1/endpoint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### 3. Add Mobile Screen

```bash
# File structure
lib/screens/new_screen.dart
lib/providers/new_provider.dart
lib/models/new_model.dart
lib/widgets/new_widget.dart
```

---

## Environment Variables Reference

### Backend Essential Variables

```
REQUIRED:
- DATABASE_URL
- JWT_SECRET
- CLOUDINARY_API_KEY

OPTIONAL (with defaults):
- PORT (5000)
- LOG_LEVEL (info)
- NODE_ENV (development)
```

### Frontend Essential Variables

```
REQUIRED:
- NEXT_PUBLIC_API_URL

OPTIONAL:
- NEXT_PUBLIC_MAPPLS_TOKEN
- NEXT_PUBLIC_GA_ID
```

---

<div align="center">

**Last Updated:** June 12, 2026  

[Back to Documentation Index](./README.md)

</div>
