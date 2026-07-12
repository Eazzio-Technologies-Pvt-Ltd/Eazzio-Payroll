# Task 6: Integrate Backend PR #17 Geofence and Checkout Selfie Enforcement

## Description
The mobile app must correctly support the new validation rules introduced in Backend PR #17: mandatory checkout selfie and location verification. Specifically, the background Auto-Punch-Out service must bypass these checks since there is no user present to take a selfie.

## Scope
Mobile-only (integration with Backend PR #17)

## Pre-check Findings
1. **Backend PR #17 Behavior**: 
   - Backend PR #17 does not currently implement any `triggerType: 'AUTO'` logic on the server side. If we implement it, it will require a backend change (by Sagar/Nandini/Adit) to recognize `triggerType: 'AUTO'`. The server-side behavior for automatic checkouts would skip the geofence and selfie checks entirely but should ideally flag the attendance record (e.g. mark it as `isVerified: false` or `verificationStatus: 'FLAGGED'`) so admins know it was checked out automatically by the system.
2. **Current Mobile Behavior on Failure**:
   - The mobile app's `AutoPunchOutService` currently makes the API call with `selfieBase64: null`.
   - If the API call fails, the mobile app handles it by logging the error locally, showing a local notification to the user stating "Auto punch-out API failed (Network sync pending)", and clearing local punch-in state anyway so the user does not get permanently stuck in a punched-in state locally.
3. **Tradeoff Analysis**:
   - Allowing `triggerType: 'AUTO'` creates a security tradeoff: automatic checkouts will succeed even though the employee's physical location and identity (selfie) were not verified at that moment. However, refusing it means background checkouts will always fail if a user is out of zone or doesn't have the app open to capture a selfie, causing data inconsistency between client and server.

## Plan
1. [x] Update `punchOut` inside `lib/providers/attendance_provider.dart` to accept and send `triggerType` ('MANUAL' or 'AUTO') in the request body.
2. [x] Update the offline punch synchronization queue inside `attendance_provider.dart` to persist and sync `triggerType` for checkout events.
3. [x] Update `_executePunchOut` inside `lib/services/auto_punch_out_service.dart` to pass `triggerType: 'AUTO'` and `selfieBase64: null`.
4. [x] Verify compilation using `flutter analyze`.

## Evidence Log
- Transitioned Task 6 from "Awaiting product decision" to active execution.
- Added `triggerType` parameter to manual and offline `punchOut` API check-out calls in `attendance_provider.dart`.
- Updated `OfflinePunchCache.savePendingPunchOut` in `offline_punch_cache.dart` to support storing `selfieBase64` and `triggerType`.
- Configured `_executePunchOut` in `auto_punch_out_service.dart` to call `punchOut` passing `triggerType: 'AUTO'`.
- Verified clean build verification using `flutter analyze`.

## Status
✅ Completed
