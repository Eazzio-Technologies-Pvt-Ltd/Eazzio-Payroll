# Task 1: Punch In/Out Alarm Notifications

## Description
At scheduled punch-in and punch-out times, trigger a continuous alarm-clock style full-screen alert that rings unbroken until the action succeeds.

## Scope
Mobile-only

## Pre-check Findings
- Alarm triggers are tied to shift start and end times.
- Background services are handled using Android Foreground Services for continuous media looping.
- Integration points are in `AttendanceProvider` on successful check-in/out.

## Plan
1. [x] Implement Android `AlarmManager` for exact alarm schedules based on user's shift.
2. [x] Build Android Foreground Service to play looping alert sound continuously.
3. [x] Build Full-Screen / Lock-Screen intent UI for the active alarm.
4. [x] Integrate Stop condition directly with API check-in/out success callback.
5. [x] Create DND bypass settings flow prompting user for DND exception permission.
6. [x] Handle battery optimization settings exemption dialog.
7. [x] Build iOS fallback using repeated local notifications with critical sounds.
8. [x] Create Settings screen in mobile app with custom tone and audio file picker.

## Evidence Log
- Created Kotlin Native files: `AlarmReceiver.kt`, `AlarmService.kt`.
- Updated `MainActivity.kt` with exact alarm scheduling, DND checking, battery settings, and custom file copy logic.
- Updated `AndroidManifest.xml` with permissions and services.
- Created `alarm_service.dart` interface wrapper.
- Linked alarm stop trigger on successful checkout/checkin in `attendance_provider.dart`.
- Hooked alarm synchronization on successful login, auto-login, and cancellation on logout in `auth_provider.dart`.
- Built custom `alarm_settings_screen.dart` allowing user to toggle alarms, modify times, pick audio, and manage OS permissions.
- Added route mapping in `main.dart` and navigation link in `profile_screen.dart`.
- Passed code verification with zero compilation errors in `flutter analyze`.

## Status
✅ Completed
