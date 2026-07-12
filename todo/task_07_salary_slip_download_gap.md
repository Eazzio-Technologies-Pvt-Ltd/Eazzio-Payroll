# Task 7: Salary Slip Download API Integration Gap

## Description
During audit and analysis of the salary slip features, it was discovered that the "download salary slip" action inside the `My Salary Slips` dialog is currently a purely simulated client-side UI action. It generates mock success snackbars and delays, but does not execute any actual API calls to fetch or download a real PDF document from the backend server.

## Scope
Backend + Mobile

## Pre-check Findings
- The UI list tile trigger is defined in `lib/screens/profile_screen.dart` under `_showSalarySlipsDialog`.
- Downloading triggers a local `SnackBar` with mock durations and success updates without hitting any HTTP client or network endpoints.

## Plan
1. [x] Clarify if backend provides a downloadable salary slip PDF endpoint.
2. [x] Integrate file downloader service (e.g. `dio` file downloads + permission handling) once backend endpoints are available.
3. [x] Save downloaded slips locally to the device's downloads directory.

## Evidence Log
- Transitioned Task 7 to active implementation following explicit product request.
- Imported `Dio`, `path_provider`, and `permission_handler` in `lib/screens/profile_screen.dart`.
- Replaced mock download logic in profile screen list dialog with active HTTP GET byte download hitting `/salary/slip/:userId`.
- Added support for storage permission checks on Android, path resolution using target public `Download` folders, and file output streams to persist PDF payslips.

## Status
✅ Completed
