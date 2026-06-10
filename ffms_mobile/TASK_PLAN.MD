# 📋 Mobile App Update — Task List for Antigravity

> **Scope:** Flutter mobile app code ONLY — inside the `ffms_mobile` folder.
>
> **STRICT RULES — READ BEFORE STARTING:**
> - ✅ You may ONLY edit files inside `ffms_mobile/`
> - ❌ DO NOT edit any backend file (`.js`, `.ts`, routes, controllers, models, server files) — **BACKEND IS READ-ONLY**
> - ❌ DO NOT modify any file inside `FFMS_NANDINI/` or any folder outside `ffms_mobile/` — **READ-ONLY**
> - ❌ DO NOT hardcode any values — use constants, config files, or environment variables
> - ✅ Add clear comments to every function, widget, and logic block you write or modify
> - ✅ If a backend API endpoint is missing, note it as a comment `// TODO: Backend API needed` and mock it locally — do NOT create or edit backend code yourself
> - ✅ Use existing API base URL and auth token patterns already used in the app
> - ✅ If you are unsure about a backend endpoint, ask — do not guess and do not create it

---

## 🔐 Task 1 — First-Time Permission Setup Screen

* [ ] On the very first app launch, show a full-screen permission onboarding screen
* [ ] Request the following permissions one by one with explanation text for each:
  * [ ] Location (Always / When in Use) — "Needed for GPS tracking and distance calculation"
  * [ ] Camera — "Needed to upload odometer photos and task proof"
  * [ ] Photo Library / Storage — "Needed to select images from your gallery"
  * [ ] Bluetooth — "Needed to detect device connectivity status"
  * [ ] Notifications — "Needed to receive task alerts and updates"
* [ ] After all permissions are granted, save flag in local storage: `permissions_granted: true`
* [ ] On all future app launches, read this flag and skip permission screen directly to login/home
* [ ] Add comments explaining the flag check logic

---

## 🏠 Task 2 — Home Screen UI Changes

### 2a — Rename Check-In / Check-Out
* [ ] Search entire `ffms_mobile/` for `"Check In"`, `"Check Out"`, `"checkIn"`, `"checkOut"`
* [ ] Replace all with `"Punch In"`, `"Punch Out"`, `"punchIn"`, `"punchOut"`
* [ ] Add comment: `// Renamed from Check In/Out to Punch In/Out as per v2 spec`

---

### 2b — Punch In / Punch Out Card Layout
* [ ] Remove the existing single large check-in block
* [ ] Replace with three smaller cards:

**Block 1 — Punch In Time**
* [ ] Label: `Punch In Time`
* [ ] Show ⏲ timer (HH:MM:SS) that starts counting up from the moment user taps Punch In
* [ ] Before punch-in, display: `--:--:--`
* [ ] Store punch-in timestamp in local state and persist to SharedPreferences

**Block 2 — Punch Out Time**
* [ ] Label: `Punch Out Time`
* [ ] Show the **actual clock time** at which the employee tapped Punch Out (e.g. `05:45 PM`)
* [ ] Display format: 12-hour clock with AM/PM — e.g. `05:45 PM`
* [ ] Before punch-out, display: `--:--:--`
* [ ] Store punch-out timestamp in local state and persist to SharedPreferences
* [ ] Add comment: `// Shows actual punch-out clock time, not a running stopwatch`

**Block 3 — Hours Worked Today**
* [ ] Label: `Hours Worked Today`
* [ ] Show a linear progress bar: value = `hours worked ÷ 9 hours`
* [ ] Display text: e.g. `6h 20m / 9h 00m`
* [ ] While punched in: calculate live as `now − Punch In Time`, update every minute
* [ ] After punch out: freeze the progress bar at final value — do NOT reset or continue counting
* [ ] Add comment: `// Progress bar freezes at final value after punch out — live only during active shift`

---

### 2c — Distance Travel Block (Two-Column Layout)
* [ ] Remove existing simple distance block
* [ ] Build a two-column card widget

**Left Column — Travel Entry**
* [ ] Button: `Are You Travelling Today?`
* [ ] On tap: show a modal/bottom sheet with Yes / No buttons
* [ ] If No: dismiss modal, no further action
* [ ] If Yes: show a form inside modal with:
  * [ ] `Point A Odometer Reading` — TextFormField, numeric keyboard, no hardcoded value
  * [ ] `Point A Meter Photo` — ImagePicker button (camera + gallery option)
  * [ ] `Point B Odometer Reading` — TextFormField, numeric keyboard, no hardcoded value
  * [ ] `Point B Meter Photo` — ImagePicker button (camera + gallery option)
  * [ ] `Distance Travelled` — read-only auto-calculated field
    * Formula: `Point B Reading − Point A Reading = Distance (km)`
    * Update live as user types Point B value
    * **Validation:** If Point B ≤ Point A, show inline error: `"Point B must be greater than Point A"` and block submission
  * [ ] Submit button — saves entry via API call only if validation passes
  * [ ] Add comments on distance calculation and validation logic

**Right Column — Travel Status**
* [ ] Default: show today's travel entries
* [ ] Dropdown filter with options: `Today / 7 Days / 15 Days / 30 Days / Custom Range`
* [ ] Fetch data from backend API using selected date range (no hardcoded dates)
* [ ] Each list entry shows: `Date | Distance (km) | Amount (₹)`
* [ ] Amount formula (no hardcode — read rate from config or API):
  `Amount = Distance × rate_per_km`
  * [ ] Store `rate_per_km` in a constants file, not inline
* [ ] Show total amount at bottom of list
* [ ] If no records found for selected period: show message `"No travel records found for this period"`
* [ ] Add comment: `// Rate per km loaded from constants — do not hardcode`

---

### 2d — Salary Block on Home Dashboard
* [ ] Add a new card: `Salary Earned`
* [ ] Scrollable list: `Date | Hours Worked | Daily Salary`
* [ ] Total salary shown at the bottom
* [ ] Connect to the existing salary API endpoint already used in the app
* [ ] Do not calculate salary logic in the app — fetch from API
* [ ] If API fails or returns no data: show message `"Salary data unavailable. Please try again."`
* [ ] Add comment: `// Salary data fetched from API — no local salary calculation`

---

### 2e — Location Sharing (Always ON — No User Control)
* [ ] Remove any existing toggle UI for location sharing — employee must NOT see an on/off switch
* [ ] Location sharing is **always ON** by default — no user action required
* [ ] Location sharing is **controlled by the system**, not the employee:
  * [ ] Automatically starts when employee taps **Punch In**
  * [ ] Automatically stops when employee taps **Punch Out**
  * [ ] Employee cannot turn it off manually at any point during the shift
* [ ] If the employee has not punched in yet, GPS background service must NOT run
* [ ] If the employee has punched in and has not punched out, GPS background service MUST run continuously every 5 minutes (see Task 5)
* [ ] Save punch-in state in SharedPreferences so GPS service survives app background, kill, or device restart
* [ ] On every app launch: read SharedPreferences — if punch-in state is active and punch-out has not been recorded, auto-resume GPS background service immediately
* [ ] Add comment: `// Location sharing is system-controlled — starts on Punch In, stops on Punch Out — no manual toggle for employee`

---

## ✅ Task 3 — Task Section Fixes & Updates

### 3a — Fix "Complete Task" Flow
* [x] In the Complete Task modal, ADD:
  * [x] `Task Proof Photo` — ImagePicker button (camera + gallery)
  * [x] `Selfie Photo` — ImagePicker button (camera only preferred)
* [x] All images must be compressed before upload — max 1MB per image, format JPG or PNG only
* [x] Fix Submit button — validate before submitting:
  * [x] Completion notes must not be empty
  * [x] Task proof photo must be selected
  * [x] Selfie must be selected
  * [x] Both images must pass format and size validation
* [x] On submit:
  * [x] Upload both images using the shared image upload utility (Task 6)
  * [x] POST the full task completion payload (notes + image URLs returned from upload) to backend API
* [x] Add comments on each validation step

---

### 3b — Fix "Send" Button in Task Section
* [x] On tap: read text from the input field
* [x] POST to the correct task message API endpoint
* [x] Show SnackBar or toast: success or error message
* [x] Clear input field on success
* [x] Add comment: `// Send button wired to task message API`

---

### 3c — Task Card Layout & "Assigned By" Field
* [x] Add `Assigned By` field to task card — read from task data payload field (e.g. `assigned_by_name`)
* [x] Remove "Assigned to Me" and "Created by Me" tab buttons entirely
* [x] Show all tasks in one unified list (single column)
* [x] Each task card label logic:
  * [x] `is_personal == true` → show badge: `Personal Task`
  * [x] Assigned by manager/admin → show: `Assigned by [assigned_by_name]`
* [x] Add comment explaining label display logic

---

### 3d — Personal Task (Private To-Do)
* [x] Add `+ Personal Task` floating or section button
* [x] Form fields: Title | Notes | Due Date (optional date picker)
* [x] On submit: attempt to POST to backend with flag `is_personal: true`
* [x] If API call fails (no network): save task locally in SharedPreferences and sync to backend automatically when the app is next online
* [x] Add comment: `// is_personal flag tells backend to hide this from admin/manager`
* [x] Add comment: `// Personal tasks saved locally first, synced to backend when online`
* [x] In task list, label these with: `Personal Task`

---

## 💸 Task 4 — Expenses Screen Cleanup

* [x] Open Expenses & Travel Allowance Claims screen
* [x] Remove all travel-related input fields, sections, and buttons
* [x] Keep only non-travel expense claim fields
* [x] Add comment: `// Travel claims moved to Home screen Distance Travel block (Task 2c)`

---

## 📍 Task 5 — GPS Background Tracking (Every 5 Minutes)

* [x] Implement a background service that runs every 5 minutes
* [x] Use Flutter background service package (e.g. `flutter_background_service` or `workmanager`)
* [x] Only run when employee is in **Punched In** state (controlled by Task 2e logic)
* [x] Collect real device data at runtime — do NOT hardcode any values:
  * [x] GPS coordinates — from location plugin
  * [x] Battery level and charging status — from `battery_plus` plugin
  * [x] Phone model and brand — from `device_info_plus` plugin
  * [x] Location enabled status — from location service check
  * [x] WiFi enabled status — from `connectivity_plus` plugin
  * [x] Bluetooth status — from `flutter_bluetooth_serial` or `permission_handler`
  * [x] Timestamp — use `DateTime.now().toUtc().toIso8601String()`
  * [x] User ID — from logged-in user session/storage
* [x] POST payload to backend GPS endpoint (URL from config, not hardcoded)
* [x] **Failure handling:** If POST fails due to no network, store the failed payload in a local queue. Retry all queued payloads automatically on next successful network connection
* [x] Add comment on each data field explaining its source
* [x] Add comment: `// All values are real device data — nothing hardcoded`
* [x] Add comment: `// Failed payloads are queued locally and retried on reconnect`

---

## 🐛 Task 6 — Bug Fix: Shared Image Upload Utility

* [x] Create a single reusable image upload utility file:
  `ffms_mobile/lib/utils/image_upload_util.dart`
* [x] Utility function must:
  * [x] Request camera/gallery permission before opening picker
  * [x] Let user choose: Camera or Gallery
  * [x] **Compress and resize image** before upload — max 1MB, format JPG or PNG
  * [x] Convert image to `multipart/form-data` (match backend expectation)
  * [x] POST to backend image upload endpoint (URL from config, not hardcoded)
  * [x] Return the uploaded image URL on success
  * [x] Throw a descriptive error on failure and show SnackBar to user
* [x] Add comments on every step inside the utility
* [x] Replace all existing broken image upload code across the app with this utility:
  * [x] Profile photo screen
  * [x] Complete Task modal — proof photo
  * [x] Complete Task modal — selfie
  * [x] Travel modal — Point A odometer photo
  * [x] Travel modal — Point B odometer photo

---

## 🧪 Task 7 — Testing Checklist

**Happy Path Tests**
* [x] Fresh install — permission screen shows once only, never again on relaunch
* [x] Punch In timer starts and counts up correctly
* [x] Punch Out time shows correct actual clock time
* [x] Hours Worked progress bar calculates correctly and freezes after punch out
* [x] Distance auto-calculates: Point B − Point A
* [x] Travel status list loads correctly by each date range filter option
* [x] Salary block loads from API and shows total
* [x] GPS service starts automatically on Punch In — no toggle visible to employee
* [x] GPS service stops automatically on Punch Out
* [x] Complete Task submits successfully with notes + both images
* [x] Send button posts message and clears field
* [x] Personal Task is visible to employee, hidden from admin/manager view
* [x] All image uploads work: profile, proof, selfie, odometer photos
* [x] Expenses screen has no travel fields

**Edge Case & Failure Tests**
* [x] Point B ≤ Point A — confirm error message shown, submission blocked
* [x] No travel records for selected date range — confirm empty state message shown
* [x] Salary API fails — confirm error message shown
* [x] GPS POST fails (airplane mode) — confirm payload is queued and retried on reconnect
* [x] App killed mid-shift and reopened — confirm GPS service auto-resumes
* [x] Image upload with file over 1MB — confirm image is compressed before upload
* [x] Personal task saved offline — confirm it syncs to backend when app goes online

**Quality Checks**
* [x] No hardcoded values anywhere in modified files
* [x] All new and modified code has comments
* [x] No backend files modified — confirm with `git diff --name-only`

---

## 📦 Task 8 — Build APK & Push to GitHub

* [ ] Confirm all changes are inside `ffms_mobile/` only
* [ ] Confirm zero backend files were modified — run `git diff --name-only` and verify
* [ ] Bump version in `pubspec.yaml` — increment `version:` build number before building
* [ ] Run `flutter pub get`
* [ ] Run `flutter analyze` — fix all errors and warnings before proceeding
* [ ] Run `flutter build apk --release`
* [ ] Confirm APK builds without errors
* [ ] Git commit all changes with message:
  `feat: mobile app v2 — punch in/out, GPS tracking, task fixes, image upload fix`
* [ ] Push to GitHub branch: `temp`
* [ ] Do NOT merge to `main`
* [ ] Share APK file path or upload for QA

---

*Last updated: 2026-06-09 | Author: Antigravity Dev Team*
*Flutter project: `ffms_mobile/` | No backend changes permitted*