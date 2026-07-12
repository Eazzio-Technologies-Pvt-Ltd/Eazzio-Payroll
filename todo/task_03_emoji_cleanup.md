# Task 3: Remove All Emojis → Replace with Icon Library

## Description
Remove all emoji characters from Flutter widgets, buttons, screens, and dialogs. Replace with a unified vector icon library (e.g. `lucide_icons_flutter`).

## Scope
Mobile-only

## Pre-check Findings
- Located emojis in welcome titles of `login_screen.dart`, greeting text of `home_screen.dart`, header of `role_selection_screen.dart`, and titles of `auto_punch_out_service.dart`.
- The screens already include robust Material Icons (Icons.groups_rounded, Icons.business_center_rounded, Icons.directions_walk_rounded, etc.) so emojis were simply redundant decorations within string literals.

## Plan
1. [x] Audit mobile source code for emoji strings in text labels and notification content.
2. [x] Remove redudant emojis since Material Icons are already fully utilized on these layouts.
3. [x] Verify using emoji scanner script that 100% of emojis are eliminated from the source code.

## Evidence Log
- Removed emojis from:
  - [login_screen.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/screens/login_screen.dart#L388-L406)
  - [role_selection_screen.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/screens/role_selection_screen.dart#L77)
  - [home_screen.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/screens/home_screen.dart#L682)
  - [auto_punch_out_service.dart](file:///home/rahul-kumar/Desktop/Eazzio-Payroll-New/ffms_mobile/lib/services/auto_punch_out_service.dart#L82-L120)
- Ran emoji scanner python script to confirm 0 matches.

## Status
✅ Completed
