# Field Force Management System (FFMS) - Mobile Client

A production-grade Flutter application designed for real-time field staff coordination, live location telemetry, task completion auditing, and operational compliance. Built for resilience under real-world network and device conditions.

---

## 📱 Feature Overview

### 🔒 Authentication & Permissions
* **Secure Session Management:** Login with encrypted JWT token storage using `flutter_secure_storage`.
* **Runtime Permission Wizard:** Step-by-step UI checklist verifying Geolocator permissions (Always / While In Use), background services, notifications, and physical sensors before check-in.

### 📍 Live Location Telemetry & Geofencing
* **Foreground Service Tracking:** Persistent tracking using `flutter_foreground_task` to prevent the OS from killing the app in background/doze states.
* **Geofenced Check-In/Out:** Validates the user's GPS coordinates against configured office/territory boundaries before allowing shifts to start.
* **Travel Meter & Odometer:** Real-time distance calculation with hardware sensor inputs (`sensors_plus`) to calculate travel logs, with batch queuing to minimize DB write load.

### 📋 Task Management
* **Assigned Workflows:** Detailed task status pipelines (`Pending`, `In Progress`, `Completed`).
* **Proof-of-Work Audits:** Submit field reports with image attachments captured via device cameras.

### 💰 Expenses, Leaves, & Advances
* **Rebursements Logging:** Category-wise expense logging with receipt uploads.
* **Leave Requests:** Apply for leave, check real-time approval status, and view company leave policies.
* **Advance Requests:** Submit and track cash advance requests directly.

---

## 🛠 Tech Stack

* **Core:** Flutter (Dart SDK `^3.11.0`)
* **State Management:** Riverpod (`^2.5.0`) & Provider (`^6.1.2`)
* **Database & Storage:** SQLite (local caching), `shared_preferences`, `flutter_secure_storage`
* **Realtime Network:** HTTP/Dio REST API & Socket.io for duplex telemetry pings
* **Mapping:** `flutter_map` with OpenStreetMap / Custom Tiles

---

## 📂 Project Structure

```text
lib/
├── core/         # Global app constants, themes, and configuration
├── models/       # Data serialization schemas (User, Task, Shift, etc.)
├── providers/    # Riverpod / Provider state management controllers
├── screens/      # View layers (Home, Attendance, Tasks, Travel Meter, etc.)
├── services/     # API, JWT Auth, Background Location, and Socket services
├── utils/        # Formatters, mathematical validators, and toast triggers
└── widgets/      # Reusable premium UI components (Cards, TextFields, Modals)
```

---

## 🚀 Recent Engineering Updates & Optimizations

### 1. NDK 28 Compatibility & Build Stabilization
* **Issue:** Gradle task `:app:stripDebugDebugSymbols` was throwing compiler errors with the new Android NDK version `28.2.13676358` due to compatibility conflicts with Flutter's precompiled native binaries (`libflutter.so`).
* **Fix:** Configured the AGP `packaging` rules to bypass binary stripping for native `.so` files under the debug and release packaging phases.
```kotlin
// android/app/build.gradle.kts
packaging {
    jniLibs {
        keepDebugSymbols.add("**/*.so")
    }
}
```

### 2. Premium Enterprise Card-Based UI/UX
* Redesigned authentication, form elements, and dashboards using a modern card-based schema.
* Integrated custom overlay notification system (`AppToast`) to deprecate standard, high-contrast default snackbars.
* Rebranded assets and launcher configurations for clean production scaling.

---

## 🛠 Build & Setup Guide

### Prerequisites
* Flutter SDK (`^3.11.0`)
* Android SDK & NDK (`28.2.13676358` or matching stable toolchain)

### Environment Setup
Create a `.env` file in the root directory:
```env
API_URL=https://api.yourdomain.com/api/v1
SOCKET_URL=https://api.yourdomain.com
```

### Run Commands

#### Clean and Restore Caches
```bash
flutter clean
flutter pub get
```

#### Run in Debug Mode
To run on a connected device over ADB:
```bash
adb connect <device-ip>:<port>
flutter run -d <device-ip>:<port>
```

#### Build Release APK
```bash
flutter build apk --release
```
The output APK will be generated under:
`build/app/outputs/flutter-apk/app-release.apk`