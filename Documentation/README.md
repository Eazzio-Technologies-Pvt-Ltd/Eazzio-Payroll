# 🚀 Eazzio Payroll - Enterprise Field Force Management System

A comprehensive, enterprise-grade platform for managing distributed mobile workforce with real-time tracking, attendance logging, geofencing, task management, and advanced analytics.

![Version](https://img.shields.io/badge/Version-2.0.0-blue.svg?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Documentation Index](#documentation-index)
- [Support & Contact](#support--contact)

---

## 📖 Project Overview

**Eazzio Payroll** is a state-of-the-art solution designed for enterprises to seamlessly manage their distributed mobile workforce. It provides a unified command center for tracking field agents, managing attendance, assigning tasks, monitoring budgets, and generating actionable insights—all in real-time.

### Key Statistics

- **3 Platform Layers:** Mobile (Flutter), Web (Next.js), Backend (Node.js)
- **15+ Major Features:** From GPS tracking to expense management
- **Role-Based Access:** Admin, Manager, Field Staff (with isolated data views)
- **Real-Time Architecture:** Socket.io-powered live updates
- **Production Infrastructure:** Hosted on Render (backend), Neon (database), Cloudinary (storage)

---

## ✨ Key Features

### 📍 Real-Time Tracking & Monitoring
- Live GPS tracking of field agents on interactive maps
- Battery level monitoring and speed metrics
- Historical location playback with timestamp filters
- Geofence breach notifications

### 👥 Employee Management
- Complete employee directory with organizational hierarchy
- Role-based permission system (Admin, Manager, Field Staff)
- User status management (Active, Inactive, Suspended)
- Bulk employee import/export capabilities

### ⏱️ Attendance & Time Management
- Automated check-in/check-out with location verification
- Mandatory selfie verification for attendance
- Shift configuration and management
- Holiday and leave policy configuration
- Attendance analytics and reporting

### 📝 Task Management
- Dynamic task assignment with priority levels
- Real-time status tracking (Pending, In Progress, Completed)
- Intelligent task routing and sequencing
- Task completion with photo documentation
- Task performance analytics

### 🛡️ Geofencing & Territory Management
- Custom polygon-based geofence creation
- Real-time breach detection and alerts
- Territory assignment and management
- Zone-based access controls

### 💰 Expense & Payroll Management
- Employee expense tracking and reimbursement
- Travel expense documentation
- Advance salary request and approval workflow
- Expense analytics and approval chains
- Payroll integration capabilities

### 📊 Analytics & Reporting
- Real-time dashboard with KPIs
- Attendance analytics with trend analysis
- Productivity reports per employee/team
- Expense audit trails
- Compliance and audit reports
- Data export to Excel/PDF

### 🔔 Notifications & Alerts
- Real-time socket-driven notifications
- Task assignment alerts
- Geofence breach alerts
- Leave request status notifications
- Expense approval updates
- Email and push notification support

### 🗺️ Map-Based Features
- Interactive live map with agent positions
- Heat maps for coverage analysis
- Route optimization display
- Zone visualization and management
- Satellite and street view options

### 🔐 Security Features
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Data encryption for sensitive information
- Rate limiting and DDoS protection
- Audit logging for compliance
- Secure file uploads via Cloudinary

---

## 🛠️ Technology Stack

### Frontend (Web Command Center)

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 16 (React 19) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 4 |
| **State Management** | Redux Toolkit |
| **Maps** | React-Leaflet, Mappls SDK |
| **Real-Time** | Socket.io Client |
| **Charts** | Recharts |
| **Icons** | Lucide React |

**Deployed on:** Vercel

### Mobile App (Field Agent Companion)

| Component | Technology |
|-----------|-----------|
| **Framework** | Flutter 3.11+ |
| **State Management** | Provider, Riverpod |
| **HTTP Client** | Dio |
| **Location Services** | Geolocator |
| **Permissions** | Permission Handler |
| **Storage** | Shared Preferences, Secure Storage |
| **Real-Time** | Socket.io Client |
| **Push Notifications** | Flutter Local Notifications |
| **Maps** | Flutter Map |

**Target Platforms:** Android 8.0+, iOS 12.0+

### Backend (API & Services)

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4 |
| **Database ORM** | Prisma 5.5+ |
| **Database** | PostgreSQL 14+ (Neon) |
| **Caching** | Redis 7+ |
| **Job Queue** | BullMQ 5.78+ |
| **Real-Time** | Socket.io 4.7+ |
| **Authentication** | JWT, bcryptjs |
| **File Upload** | Cloudinary, Multer |
| **Validation** | Joi, Zod |
| **Logging** | Winston |
| **Security** | Helmet, Express Rate Limit |
| **Documentation** | Swagger/OpenAPI |

**Deployed on:** Render

---

## 📁 Project Structure

```
Eazzio-Payroll-main/
├── FFMS_BACKEND/                    # Backend API
│   ├── backend/
│   │   ├── src/
│   │   │   ├── controllers/         # Request handlers (auth, user, attendance, etc.)
│   │   │   ├── services/            # Business logic
│   │   │   ├── routes/              # API endpoints (v1)
│   │   │   ├── middleware/          # Auth, validation, error handling
│   │   │   ├── utils/               # Helper functions
│   │   │   ├── jobs/                # Background jobs (BullMQ)
│   │   │   ├── validations/         # Schema validation
│   │   │   └── config/              # Configuration files
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/          # Database migrations
│   │   ├── package.json
│   │   └── .env                     # Environment variables
│   └── README.md
│
├── FFMS_FRONTEND/                   # Web Dashboard
│   ├── frontend/
│   │   ├── app/
│   │   │   ├── (admin)/             # Admin dashboard pages
│   │   │   ├── (dashboard)/         # Manager/Staff dashboard
│   │   │   └── (auth)/              # Login/register pages
│   │   ├── components/              # Reusable UI components
│   │   ├── lib/                     # Utility functions
│   │   ├── store/                   # Redux state management
│   │   ├── public/                  # Static assets
│   │   ├── package.json
│   │   └── .env.local               # Environment variables
│   └── README.md
│
├── ffms_mobile/                     # Mobile App (Flutter)
│   ├── lib/
│   │   ├── screens/                 # App screens/pages
│   │   ├── providers/               # State management
│   │   ├── services/                # API & location services
│   │   ├── models/                  # Data models
│   │   ├── widgets/                 # Custom widgets
│   │   ├── utils/                   # Helper utilities
│   │   └── main.dart                # Entry point
│   ├── android/                     # Android native code
│   ├── ios/                         # iOS native code
│   ├── pubspec.yaml                 # Dependencies
│   └── README.md
│
└── docs/                            # Documentation
    ├── README.md                    # This file
    ├── ARCHITECTURE.md              # System design
    ├── API_DOCUMENTATION.md         # API endpoints
    ├── DATABASE.md                  # Schema & relations
    ├── SETUP_GUIDE.md               # Development setup
    ├── DEPLOYMENT.md                # Production deployment
    ├── SECURITY.md                  # Security practices
    ├── FEATURES.md                  # Detailed features
    └── CONTRIBUTING.md              # Contribution guidelines
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required software versions
- Node.js >= 18.x
- npm >= 9.x or yarn >= 3.x
- Flutter SDK >= 3.11.0
- PostgreSQL >= 14 (or Neon account)
- Redis >= 7.0 (for local development)
```

### 1️⃣ Backend Setup

```bash
# Navigate to backend directory
cd FFMS_BACKEND/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure your .env with:
# - DATABASE_URL (Neon PostgreSQL)
# - REDIS_URL (Redis instance)
# - JWT_SECRET (secure key)
# - CLOUDINARY_URL (file uploads)

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
# Backend runs on http://localhost:5000
```

### 2️⃣ Frontend Setup

```bash
# Navigate to frontend directory
cd FFMS_FRONTEND/frontend

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Configure your .env.local with:
# - NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
# - NEXT_PUBLIC_MAPPLS_TOKEN=your_token

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

### 3️⃣ Mobile App Setup

```bash
# Navigate to mobile directory
cd ffms_mobile

# Get Flutter packages
flutter pub get

# Run on emulator/device
flutter run

# For Android APK
flutter build apk --release

# For iOS IPA
flutter build ios --release
```

---

## 📚 Documentation Index

| Document | Purpose |
|----------|---------|
| [**ARCHITECTURE.md**](./ARCHITECTURE.md) | System design, data flow, and component interactions |
| [**API_DOCUMENTATION.md**](./API_DOCUMENTATION.md) | Complete API endpoint reference with request/response examples |
| [**DATABASE.md**](./DATABASE.md) | Database schema, relationships, and design decisions |
| [**SETUP_GUIDE.md**](./SETUP_GUIDE.md) | Detailed setup instructions for all environments |
| [**DEPLOYMENT.md**](./DEPLOYMENT.md) | Production deployment guides for backend, frontend, and mobile |
| [**SECURITY.md**](./SECURITY.md) | Security best practices, authentication, and compliance |
| [**FEATURES.md**](./FEATURES.md) | Detailed documentation of each major feature |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Development guidelines and contribution process |

---

## 🌐 Live Deployment

### Current Deployment Status

| Component | Status | URL |
|-----------|--------|-----|
| **Backend API** | ✅ Active | https://eazzio-backend.onrender.com/api/v1 |
| **Web Dashboard** | ✅ Active | https://eazzio.vercel.app |
| **Database** | ✅ Active | Neon PostgreSQL |
| **Mobile App** | 📱 Play Store | Eazzio Payroll |

---

## 🔐 Security & Compliance

- ✅ **JWT Authentication:** Secure token-based authentication
- ✅ **RBAC:** Role-based access control with data isolation
- ✅ **Encryption:** Sensitive data encrypted in transit and at rest
- ✅ **Rate Limiting:** DDoS protection and API throttling
- ✅ **Audit Logging:** Complete audit trail for compliance
- ✅ **GDPR Compliant:** Data privacy and consent management
- ✅ **Data Retention:** Configurable retention policies
- ✅ **Secure File Upload:** Cloudinary with signed URLs

See [SECURITY.md](./SECURITY.md) for detailed information.

---

## 📞 Support & Contact

### Getting Help

- 📧 **Email:** support@eazzio.com
- 🐛 **Bug Reports:** Issues in GitHub
- 💬 **Slack Channel:** #eazzio-support
- 📖 **Knowledge Base:** docs.eazzio.com

### Development Team

- **Project Lead:** Development Team @ Eazzio
- **Architecture:** Enterprise Solutions Team
- **Maintenance:** Ongoing Support Team

---

## 📄 License & Terms

This project is proprietary software belonging to **Eazzio Technology**. 

- ✋ **No unauthorized copying** - Strict IP protection
- 🔒 **Confidential Information** - Keep your deployment secrets secure
- 📋 **Terms of Service** - See LICENSE.md for full legal terms

---

## 🎯 Roadmap

### Upcoming Features (Q2-Q3 2026)

- [ ] AI-powered route optimization
- [ ] Advanced predictive analytics
- [ ] Multi-language support
- [ ] Native Android/iOS app improvements
- [ ] Blockchain-based verification
- [ ] Integration with payroll systems
- [ ] Mobile-first redesign
- [ ] Offline-first synchronization

### Completed Milestones

- ✅ Core platform launch (v1.0)
- ✅ Real-time tracking system
- ✅ Geofencing engine
- ✅ Mobile app (Flutter)
- ✅ Web dashboard
- ✅ Analytics suite
- ✅ Production deployment

---

## 🤝 Contributing

We welcome contributions from the community. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development environment setup
- Code style and standards
- Pull request process
- Testing requirements
- Documentation guidelines

---

## 📊 Project Statistics

```
Total Lines of Code:        ~50,000+
Backend Endpoints:          30+
Database Tables:            25+
Mobile Screens:             20+
Web Pages:                  40+
Test Coverage:              75%+
Documentation Pages:        10+
Active Contributors:        5+
```

---

<div align="center">

### Made with ❤️ by the Eazzio Technology Team

**Last Updated:** June 12, 2026  
**Version:** 2.0.0  
**Status:** Production Ready ✅

[⬆ Back to Top](#-eazzio-payroll---enterprise-field-force-management-system)

</div>
