# Task 0: Backend/Frontend Feature & Fix Discovery Audit

## Description
Scan the reference directories (`FFMS_BACKEND` and `FFMS_FRONTEND` under `/home/rahul-kumar/Desktop/Git_Pull/Eazzio-Payroll`) and identify any backend/frontend additions or changes that have no corresponding mobile implementation.

## Scope
Mobile-only (Discovery / Read-only scan of reference directories)

## Pre-check Findings
- The billing and subscription guard feature (introduced in commits `8149f26`, `f6d5a9a`) is web-only and has no mobile equivalent (nor is mobile billing expected).
- Backend PR #17 (`fix/backend-attendance-security`) enforces a mandatory checkout selfie and location check. Mobile manual checkout supports this, but background `AutoPunchOutService` does not. This is a critical gap.
- Backend fix `7d6f1a6` introduces pro-rated working days and IST timezone calculations to salary generation. Mobile needs to display these values correctly.

## Plan
1. Scan `FFMS_BACKEND` and `FFMS_FRONTEND` for any changes.
2. Cross-reference changes with `ffms_mobile`.
3. Create new tasks for any mobile-side gaps.
4. Finalize audit results and present to user.

## Evidence Log
- Completed scan of git logs and files.
- Identified gap in auto-punch-out selfie/location validation.
- Identified gap in salary calculation updates (Task 4).

## Status
✅ Completed
