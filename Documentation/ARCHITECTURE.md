# 🏗️ System Architecture Documentation

A comprehensive guide to the Eazzio Payroll system design, data flow, and component interactions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Three-Tier Architecture](#three-tier-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Component Interactions](#component-interactions)
- [Database Architecture](#database-architecture)
- [Real-Time Communication](#real-time-communication)
- [Scalability & Performance](#scalability--performance)
- [Security Architecture](#security-architecture)

---

## Architecture Overview

Eazzio Payroll follows a **modern microservices-ready architecture** with three distinct tiers:

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                               │
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐               │
│  │  Web Dashboard   │      │  Mobile App      │               │
│  │  (Next.js React) │      │  (Flutter)       │               │
│  │  Admins/Managers │      │  Field Staff     │               │
│  └──────────┬───────┘      └────────┬─────────┘               │
└─────────────┼──────────────────────┼──────────────────────────┘
              │                      │
              ├──────────┬───────────┤
              │          │           │
              ▼          ▼           ▼
┌──────────────────────────────────────────────────────────────────┐
│              API GATEWAY & LOAD BALANCER                         │
│           (Express.js on Render + CDN)                          │
└─────────────────────────┬──────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐
│  REST API       │  │  Socket.io     │  │  WebSocket       │
│  Endpoints      │  │  Real-Time     │  │  Connection      │
│                 │  │  Events        │  │  Pool            │
└────────┬────────┘  └────────┬───────┘  └────────┬─────────┘
         │                    │                   │
         └────────────────────┼───────────────────┘
                              │
         ┌────────────────────┼────────────────┐
         │                    │                │
         ▼                    ▼                ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  PostgreSQL     │  │  Redis Cache     │  │  BullMQ Queues   │
│  (Neon)         │  │  & Sessions      │  │  Background Jobs │
│                 │  │                  │  │                  │
│  - Core Data    │  │  - Session Store │  │  - PDF Export    │
│  - Analytics    │  │  - Location Data │  │  - Email Alerts  │
│  - Audit Logs   │  │  - Real-time     │  │  - Batch Ops     │
└─────────────────┘  │    Cache         │  │                  │
                     └──────────────────┘  └──────────────────┘
                              │
         ┌────────────────────┼────────────────┐
         │                    │                │
         ▼                    ▼                ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Cloudinary     │  │  Email Service   │  │  Push Notif      │
│  File Storage   │  │  (SMTP/Mailgun)  │  │  (FCM)           │
└─────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Three-Tier Architecture

### 🖥️ Presentation Layer (Client)

**Web Dashboard (Next.js + React)**
- Built with **Next.js 16** for SSR and static generation
- **Redux Toolkit** for state management
- **Tailwind CSS 4** for responsive styling
- **React-Leaflet** for interactive maps
- **Socket.io Client** for real-time updates
- Separate routes for Admin and Manager dashboards

**Mobile App (Flutter)**
- Cross-platform (Android 8.0+, iOS 12.0+)
- **Provider & Riverpod** for state management
- **Geolocator** for GPS tracking
- **Dio** for HTTP requests
- **Socket.io Client** for real-time events
- Local caching with **Shared Preferences**
- Background location tracking

### 🌐 Application Layer (Backend)

**Node.js Express API**
- RESTful API with 30+ endpoints
- **Prisma ORM** for type-safe database queries
- **JWT** authentication with refresh tokens
- **Middleware Stack:**
  - Authentication middleware (JWT verification)
  - Authorization middleware (RBAC checks)
  - Validation middleware (Joi/Zod schemas)
  - Error handling middleware
  - Rate limiting middleware
  - Audit logging middleware
  - CORS middleware

**Real-Time Engine**
- **Socket.io Server** for WebSocket connections
- Namespaces for different event types:
  - `/live-tracking` - Live agent locations
  - `/notifications` - Real-time alerts
  - `/tasks` - Task updates
  - `/attendance` - Check-in/out events
  - `/geofence` - Boundary breach alerts

**Background Processing**
- **BullMQ** job queues for async operations:
  - `location-write` - Batch location data writes
  - `geofence-alert` - Boundary breach detection
  - `payroll-cron` - Monthly payroll processing
  - `email-queue` - Email notifications
  - `report-generation` - PDF/Excel exports

### 💾 Data Layer

**PostgreSQL Database (Neon)**
- Fully managed cloud database
- **25+ tables** with complex relationships
- ACID-compliant transactions
- Automated backups and disaster recovery
- Read replicas for analytics queries

**Redis Cache**
- Session storage for JWT tokens
- Real-time location data cache
- Socket connection mapping
- Rate limit counters
- Pub/Sub for cross-server events

**File Storage (Cloudinary)**
- Secure image/document uploads
- Automatic image optimization
- CDN integration for fast delivery
- Signed URLs for secure access

---

## Data Flow Diagrams

### 1️⃣ User Authentication Flow

```
Mobile/Web              Backend                  Database
    │                     │                          │
    │─ Login Request ─────>│                         │
    │                     │─ Query User ───────────>│
    │                     │<─ User Data ────────────│
    │                     │ (Password Hash Check)   │
    │                     │                         │
    │<─ JWT Token ────────│                         │
    │  Refresh Token      │ (Generate Tokens)      │
    │                     │                         │
    │─ Store Tokens ──────│ (LocalStorage/Keychain)
    │   Locally            │
```

### 2️⃣ Real-Time Location Tracking

```
Mobile App              WebSocket                Backend Database
    │                     │                           │
    │─ GPS Update ───────>│ Socket.io Server         │
    │  (Every 30 sec)     │────────────────────────>│ Write to Redis
    │                     │                        │ (Fast Cache)
    │                     │<──────────────────────│ Batch Write Job
    │                     │                       │ (Every 1 min)
    │                     │                       │ PostgreSQL
    │                     │
    │<── Live Update ─────│ Broadcast to:
    │    (For Web)        │ - All connected dashboards
    │                     │ - Geofence detection
    │                     │ - Manager notifications
```

### 3️⃣ Task Assignment Flow

```
Admin/Manager           API                    Database
    │                   │                         │
    │─ Create Task ────>│                         │
    │                   │─ Validate ──────────────│
    │                   │                         │
    │                   │─ Insert Task ──────────>│
    │                   │                         │
    │<─ Task Created ───│<──────────────────────│
    │                   │
    │─ Assign to Agent ─>│
    │                   │─ Update Task ─────────>│
    │                   │                         │
    │                   │─ Socket Event ────────>│ Agent Mobile
    │                   │  (Task Notification)  │
    │                   │                       │
    │<─ Confirmation ───│<─ Agent Accepts ───────│
```

### 4️⃣ Expense Approval Workflow

```
Field Agent        API            Database      Manager/Admin
    │              │                 │              │
    │─ Submit ────>│                 │              │
    │  Expense     │─ Validate ──────>│             │
    │              │                 │              │
    │              │─ Insert ────────>│             │
    │              │                 │              │
    │              │─ Notify ───────────────────────>│
    │              │                 │              │
    │              │                 │    <─ Check │
    │              │                 │    Approve/ │
    │              │<─ Update Status─│    Reject   │
    │<─ Notification ─ Approve/Reject  │        │
    │              │                 │              │
```

---

## Component Interactions

### Backend Controllers & Services

```
Route Handler (Controller)
        │
        ├─ Input Validation (Joi/Zod)
        │
        ├─ Business Logic (Service)
        │   ├─ Database Queries (Prisma)
        │   ├─ Cache Operations (Redis)
        │   ├─ External APIs (Email, Cloudinary)
        │   └─ Socket Events (Socket.io)
        │
        ├─ Error Handling
        │
        └─ Response (JSON)
```

### Database Schema Relationships

```
Organization
  ├─ hasMany User
  ├─ hasMany Territory
  ├─ hasMany Project
  ├─ hasMany Task
  └─ hasMany Shift

User (acts as employee & auth)
  ├─ belongsTo Organization
  ├─ belongsTo Shift
  ├─ belongsTo Territory
  ├─ hasMany Attendance
  ├─ hasMany TaskAssignment
  ├─ hasMany LocationLog
  ├─ hasMany Leave
  ├─ hasMany Expense
  ├─ hasMany Advance
  └─ hasMany TravelLog

Task
  ├─ belongsTo Organization
  ├─ belongsTo Project
  ├─ belongsTo Territory
  ├─ hasMany TaskAssignment
  └─ hasMany Comment

TaskAssignment
  ├─ belongsTo Task
  ├─ belongsTo User
  └─ hasMany VisitReport

Attendance
  └─ belongsTo User

LocationLog
  └─ belongsTo User

Territory (Geofences)
  ├─ belongsTo Organization
  ├─ hasMany User
  ├─ hasMany Task
  └─ hasMany GeofenceAlert

Project
  ├─ belongsTo Organization
  ├─ hasMany Task
  └─ hasMany UserProject

Expense / Advance / Leave
  └─ belongsTo User
```

---

## Real-Time Communication

### Socket.io Namespaces

```
Server: http://backend:5000

Namespaces:
├─ /live-tracking
│  ├─ emit: location-update (send new GPS)
│  ├─ on: location-update (receive other agents)
│  └─ on: geofence-alert (boundary breaches)
│
├─ /notifications
│  ├─ on: task-assigned
│  ├─ on: expense-approved
│  ├─ on: leave-status
│  └─ on: system-alert
│
├─ /dashboard
│  ├─ on: team-status-update
│  ├─ on: attendance-update
│  └─ on: metrics-refresh
│
└─ /admin
   ├─ on: user-activity
   ├─ on: system-health
   └─ on: error-alert
```

### Event Flow Example: Location Update

```
1. Mobile Emits: {
     namespace: '/live-tracking',
     event: 'location-update',
     data: {
       employeeId: 'emp_123',
       lat: 28.7041,
       lng: 77.1025,
       timestamp: 1718160000,
       speed: 45,
       accuracy: 10,
       battery: 85
     }
   }

2. Backend Receives:
   ├─ Validates data
   ├─ Stores to Redis (fast cache)
   ├─ Checks geofence boundaries
   ├─ Detects any alerts
   └─ Broadcasts to all connected managers

3. Web Dashboard Receives:
   ├─ Updates map marker
   ├─ Shows real-time speed
   ├─ Updates battery indicator
   └─ Triggers alert if needed
```

---

## Scalability & Performance

### Optimization Strategies

**1. Database Optimization**
- Connection pooling with Prisma
- Selective field queries
- Indexed queries on frequently searched fields
- Read replicas for analytics
- Materialized views for complex reports

**2. Caching Strategy**
- Redis for session storage (TTL: 24h)
- Location cache for real-time data (TTL: 5 min)
- User/Team cache (TTL: 1h)
- Cache invalidation on updates

**3. Queue System (BullMQ)**
- Async email sending
- Batch location writes
- PDF/Excel report generation
- Background calculations
- Scheduled jobs

**4. CDN & File Delivery**
- Cloudinary CDN for images
- Static asset caching
- Geographic distribution

**5. API Optimization**
- Response compression (gzip)
- Pagination for list endpoints
- Rate limiting to prevent abuse
- HTTP caching headers

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | <200ms | ~150ms |
| Live Update Latency | <500ms | ~300ms |
| Database Query | <100ms | ~80ms |
| Page Load Time | <2s | ~1.5s |
| Mobile App Load | <3s | ~2s |

---

## Security Architecture

### Authentication & Authorization

```
Request
  │
  ├─ JWT in Authorization header
  │
  ├─ Verify signature
  │
  ├─ Check expiration
  │
  ├─ Check token blacklist
  │
  ├─ Extract user/role
  │
  ├─ Check RBAC permissions
  │
  ├─ Check data ownership
  │
  └─ Allow/Deny request
```

### Data Security

- **Encryption in Transit:** HTTPS/TLS 1.3
- **Encryption at Rest:** Database encryption, encrypted columns for PII
- **Password Security:** bcryptjs (10 rounds)
- **Sensitive Data:** Never logged, masked in responses
- **API Keys:** Environment variables, never committed

### Access Control

```
Admin
  ├─ All endpoints
  ├─ All users
  ├─ All teams
  └─ System configuration

Manager
  ├─ Own team members
  ├─ Own projects
  ├─ Own reports
  └─ Limited system settings

Field Staff
  ├─ Own profile
  ├─ Own location
  ├─ Own attendance
  ├─ Own tasks
  └─ Own expenses
```

---

## Deployment Architecture

### Infrastructure Components

```
CDN (Cloudinary)
        │
        ▼
┌─────────────────┐
│  Web Frontend   │
│  (Vercel)       │
└────────┬────────┘
         │
┌────────┴─────────────┐
│  API Gateway         │
│  (Render, 2 dynos)   │
├──────────────────────┤
│ Load Balancer        │
│ (Automatic)          │
└────────┬─────────────┘
         │
    ┌────┴────┬──────────┬────────┐
    │          │          │        │
    ▼          ▼          ▼        ▼
  PostgreSQL Redis  Cloudinary Mailgun
  (Neon)    (Redis) (CDN)      (Email)
```

---

## Development vs Production

### Environment Differences

| Aspect | Development | Production |
|--------|-------------|-----------|
| **Database** | Local PostgreSQL | Neon Cloud |
| **Cache** | Local Redis | Redis Cloud |
| **File Upload** | Local Temp | Cloudinary CDN |
| **Email** | Console Log | SMTP (Mailgun) |
| **Logging** | Console | Winston (File/Cloud) |
| **Monitoring** | Manual | Automated Alerts |
| **Backups** | Manual | Automatic Daily |

---

<div align="center">

**Last Updated:** June 12, 2026  
**Architecture Version:** 2.0  

[Back to Documentation Index](./README.md)

</div>
