---
name: FieldTrack Mobile
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006e2d'
  on-secondary: '#ffffff'
  secondary-container: '#7cf994'
  on-secondary-container: '#007230'
  tertiary: '#8e3c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#b54e00'
  on-tertiary-container: '#ffece5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#7ffc97'
  secondary-fixed-dim: '#62df7d'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005320'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb690'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#783200'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin: 16px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
  touch-target-min: 44px
---

## Brand & Style

The design system is engineered for the frontline workforce, prioritizing utility, clarity, and physical ease of use in diverse environments. The brand personality is dependable, efficient, and action-oriented, ensuring that employees can execute tasks with minimal cognitive load.

The visual style follows a **Corporate / Modern** approach with a strong focus on high-readability and tactile affordance. It utilizes a clean, systematic interface that leverages ample white space and structured hierarchies to reduce visual noise. The aesthetic is professional and functional, moving away from decorative elements to favor high-contrast interaction points that remain legible under varying lighting conditions.

## Colors

The color palette is rooted in a high-visibility functional logic. 
- **Primary (#2563EB):** Reserved for primary actions, active navigation states, and branding.
- **Success (#16A34A):** Used for completed tasks, "On Duty" statuses, and positive confirmations.
- **Warning (#F97316):** Applied to pending items, low-priority alerts, and scheduled but not started tasks.
- **Danger (#EF4444):** Dedicated to critical errors, missed deadlines, and "Off Duty" or "Late" indicators.
- **Background (#F8FAFC):** Provides a cool, neutral canvas that reduces glare and helps foreground elements pop.

Surface colors for cards and modals should use pure white (#FFFFFF) to create a distinct separation from the off-white background.

## Typography

This design system utilizes **Plus Jakarta Sans** for its approachable yet professional character. The typography scale is optimized for mobile legibility, featuring generous line heights and slightly increased font weights for critical labels.

- **Headlines:** Use Bold weights to create a strong vertical rhythm and clear page entry points.
- **Labels:** Use Semi-Bold weights to ensure that metadata (time, location, status) is easily scannable at a glance.
- **Mobile Optimization:** Sizes are capped to ensure no headline exceeds two lines on a standard 390px width screen.

## Layout & Spacing

The layout is optimized for a **390x844px** viewport using a fluid 4-column grid for mobile. 

- **Safe Zones:** A mandatory 16px horizontal margin is applied to all screens to ensure content does not hug the bezel.
- **Vertical Rhythm:** Elements are stacked using 8px increments. 16px is the standard gap between related items, while 24px separates distinct sections.
- **Tap Targets:** Every interactive element must maintain a minimum height of 44px to accommodate "fat-finger" interactions in high-movement environments.
- **Navigation Layout:** The bottom navigation bar is fixed, containing 5 equally spaced slots (20% width each) with icons and 11px labels for maximum clarity.

## Elevation & Depth

The design system uses **Tonal Layers** supplemented by very soft, functional shadows to indicate interactable surfaces.

- **Level 0 (Background):** #F8FAFC. No shadow.
- **Level 1 (Cards/Inputs):** White (#FFFFFF) with a 1px border (#E2E8F0) and a subtle 4px blur, 2% opacity black shadow.
- **Level 2 (Modals/Floating Actions):** White (#FFFFFF) with an 8px blur, 5% opacity black shadow to create clear separation for temporary UI.

Shadows should never be "heavy" or "dirty"; they serve only to lift the white cards off the light grey background.

## Shapes

The shape language is defined by a **16px (1rem)** standard corner radius. This high level of roundedness evokes a modern, friendly feel while softening the "industrial" nature of a tracking app.

- **Large Components (Cards, Modals):** 16px radius.
- **Standard Components (Buttons, Input Fields):** 16px radius.
- **Small Components (Chips, Badges):** Full pill (999px) for status indicators to distinguish them from actionable buttons.

## Components

### Buttons & Inputs
- **Primary Button:** 48px minimum height, 16px radius, #2563EB background with white text. Full-width on mobile.
- **Input Fields:** 48px height, 1px border (#E2E8F0), 16px radius. Labels should be persistently visible above the field.

### Navigation
- **Bottom Bar:** 56px height + bottom safe area. Active state uses the Primary color for both icon and label; inactive uses #64748B.
- **Header:** Simple left-aligned title with an optional right-side action (e.g., Notifications or Settings).

### Cards & Feedback
- **Task Cards:** 16px padding inside. Must include a clear status badge in the top right.
- **Status Badges:** Small text, Semi-Bold, uppercase, with 8px horizontal padding and 2px vertical padding. Background colors should be low-opacity versions of the status color (e.g., Success green at 10% opacity) with high-contrast text.
- **Data Visualizations:** Use simplified progress bars (8px height, 4px radius) instead of complex charts for quick status updates on employee performance or task completion.