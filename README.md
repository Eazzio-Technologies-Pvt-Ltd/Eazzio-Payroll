<div align="center">

<img src="logo.jpeg" alt="Eazzio Technology Logo" width="250"/>

<h1>🚀 Eazzio Technology</h1>

<p>
<b>
A state-of-the-art enterprise solution for tracking, managing, and optimizing on-field employee operations.
</b>
</p>

<p>
<img src="https://img.shields.io/badge/Organization-Eazzio--Technology-blue?style=for-the-badge" />
<img src="https://img.shields.io/badge/Stack-Next.js%20|%20Node.js%20|%20Flutter-success?style=for-the-badge" />
<img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" />
</p>

</div>

---

## 📖 About The Project

The **Eazzio Technology** is an end-to-end platform designed for organizations to seamlessly manage their distributed mobile workforce. It offers powerful real-time tracking, attendance logging, dynamic geofencing, robust task management, and deep analytical insights, all wrapped in a premium, role-based user interface.

Whether you're managing a small local team or a massive regional sales force, FFMS acts as your central command center, bridging the gap between field agents and administrative managers.

---

## ✨ Key Features

- 📍 **Real-Time Live Tracking:** Monitor field staff on a live map with dynamic GPS polling, battery indicators, and speed metrics.
- 🛡️ **Geofencing & Territories:** Create custom polygon boundaries and receive automated breach/safety alerts when agents enter or leave designated zones.
- ⏱️ **Attendance & Selfies:** Automated shift logging (check-in/check-out) featuring real-time location capture and mandatory photo verifications.
- 📝 **Task & Route Management:** Assign daily tasks and intelligent routes to specific agents and track real-time completion statuses.
- 🔔 **Real-Time Live Feed & Notifications:** Socket-driven notifications system keeping managers instantly updated on activities and anomalies.
- 📊 **Advanced Analytics Dashboard:** Detailed performance graphs, attendance rates, project monitoring, and custom data scopes per management level.
- 🔐 **Role-Based Access Control (RBAC):** Distinct dashboards and isolated data environments for **Admins**, **Managers**, and **Field Staff**.

---

## 🛠️ Technology Stack

We've built FFMS using a robust, modern, and highly scalable tech stack:

### **Frontend (Web Command Center)**

- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS & Custom CSS (Glassmorphism, Dark Modes)
- **State Management:** Redux Toolkit
- **Maps Integration:** React-Leaflet / Mappls SDK
- **Real-Time:** Socket.io-client

### **Backend (API & Services)**

- **Runtime & Framework:** Node.js, Express.js
- **Database ORM:** Prisma
- **Database:** PostgreSQL (Neon DB)
- **Caching & Queues:** Redis & BullMQ (for asynchronous batch operations)
- **Real-Time Event Engine:** Socket.io
- **Security & Auth:** JWT, bcrypt, Helmet, Rate Limiting

### **Mobile App (Field Agent Companion)**

- **Framework:** Flutter (Dart)
- **Capabilities:** Background Geolocation, Camera, Local Storage

---

## ⚙️ Getting Started

Follow these instructions to set up the project locally for development and testing.

### Prerequisites

Before you begin, ensure you have the following installed on your local machine:

- **Node.js** (v18.x or higher)
- **npm** or **yarn**
- **PostgreSQL** (Local or Cloud instance like Neon)
- **Redis** Server (Running locally on port 6379 or remote)
- **Flutter SDK** (for the mobile application)

### Installation & Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/Eazzio technology/Field_Force_Mnt_Sys.git
   cd Field_Force_Mnt_Sys
   ```

2. **Backend Setup (`FFMS_BACKEND`):**

   ```bash
   cd FFMS_BACKEND/backend
   npm install

   # Set up your .env file based on .env.example
   # Required: DATABASE_URL, REDIS_URL, JWT_SECRET, PORT=5000

   # Run Database Migrations
   npm run db:migrate

   # Start the Backend Server (Dev Mode)
   npm run dev
   ```

3. **Frontend Setup (`FFMS_FRONTEND`):**

   ```bash
   cd ../../FFMS_FRONTEND/frontend
   npm install

   # Set up your .env.local file
   # Required: NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1

   # Start the Frontend Server
   npm run dev
   ```

4. **Mobile App Setup (`ffms_mobile`):**

   ```bash
   cd ../../ffms_mobile
   flutter pub get

   # Run on an emulator or connected device
   flutter run
   ```

---

## 🔒 Environment Variables

To properly run the application, you need to configure your environment variables.

### Backend (`.env`)

```env
PORT=5000
DATABASE_URL="postgresql://user:password@localhost:5432/ffms?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
JWT_SECRET="your_super_secret_jwt_key"
JWT_EXPIRES_IN="1d"
REFRESH_TOKEN_SECRET="your_refresh_token_secret"
CLOUDINARY_URL="cloudinary://api_key:api_secret@cloud_name"
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:5000/api/v1"
NEXT_PUBLIC_MAPPLS_TOKEN="your_mappls_api_token_here"
```

---

## 🏗️ System Architecture

1. **Client Layer:**
   - Web application consumed by Admins and Managers for monitoring and configurations.
   - Flutter application consumed by field agents to submit real-time logs, statuses, and geodata.
2. **Gateway / API Layer:** Node.js Express server handling authentication, validation, and RESTful routing.
3. **Event Engine:** Real-time WebSockets powered by Socket.io pushing live coordinates and alerts from agents to dashboards.
4. **Data Layer:** PostgreSQL (via Prisma) ensuring ACID compliance and Redis holding ephemeral coordinates, acting as an event broker for BullMQ.
5. **Background Processors:** BullMQ queues process heavy workloads like batch coordinate writes, email notifications, and report generation without blocking the main event loop.

---

## 👥 Organization & Mentions

**Organization:** [Eazzio technology](https://github.com/Eazzio technology)  
**Project Owner / Architect:** Core Development Team at Eazzio technology

A massive thank you to all the contributors, QA testers, and developers who have helped shape FFMS into a robust, enterprise-grade solution.

---

## 📄 License

This project is proprietary software belonging to **Eazzio technology**. Unauthorized copying of this repository, via any medium, is strictly prohibited without explicit permission.

---

<p align="center">⚙️ Developed with precision by the Eazzio Technology Team</p>

