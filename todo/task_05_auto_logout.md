# Task 5: Auto-Logout After Shift Ends

## Description
Automatically log out employee and employer accounts locally once their shift time is over (clearing local storage and routing back to login).

## Scope
Mobile-only (local UX session invalidation only; does not revoke server tokens)

## Pre-check Findings
- Auto logout needs to clear the authenticated state locally and navigate the user back to the login/role selection screens.
- This needs to execute automatically at the end of the shift time for the current user.
- **Limitation**: The auto-logout timer is implemented using a Dart `Timer` which runs in the main UI isolate. It will only fire if the app is actively in the foreground (or temporarily suspended in the background before the OS suspends the isolate). If the app is killed by the OS or manually by the user, the timer is cleared; however, the session will be validated next time the app launches during `checkAuthStatus()` and instantly log out if the current time has passed the end of the shift.

## Plan
1. [x] Implement timer scheduling in `AuthProvider` matching the shift's `endTime`.
2. [x] Clear local state and cancel all alarms when the timer is fired.
3. [x] Configure routing observer in `MainNavigation` to redirect to `/role_selection` on `AuthState.unauthenticated`.

## Evidence Log
- Created `_autoLogoutTimer` and scheduling logic inside [auth_provider.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/providers/auth_provider.dart#L25-L60).
- Registered the schedule call inside login and authentication check status flows.
- Ensured timer cancellation upon manual logout.
- Added reactive unauthenticated check and redirect in [main_navigation.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/screens/main_navigation.dart#L67-L80).
- Validated compile status using `flutter analyze`.

## Status
  ✅ Completed
