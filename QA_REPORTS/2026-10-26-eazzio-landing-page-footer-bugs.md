# Eazzio Payroll — Landing Page Footer QA Report

## Report Information
- Project: Eazzio Payroll
- Report Type: Frontend QA
- Report Date: 26 October 2026
- Reported By: QA Testing
- Module: Landing Page Footer
- Status: Open / Pending Development

## Executive Summary

During quality assurance testing of the Eazzio Payroll landing page (https://payroll.eazzio.com/), several critical navigation issues were identified in the footer section. All navigation links across **About Eazzio**, **Support**, and **Features** columns are currently placeholder anchors pointing to `href="#"`, failing to direct users to any actual pages, documentation, or section anchors. Additionally, the **Contact Info** section uses a generic placeholder US phone number (`+1 (800) 123-4567`), a potentially inaccurate email address (`eazzioground@gmail.com`), and an unlinked physical address.

These defects degrade user trust and impact navigation, SEO, and contact accessibility. Individual GitHub issues have been created to track each item for the frontend development team.

## Bug Register

| Bug ID | Bug Title | Module | Severity | Priority | GitHub Issue | Status |
|--------|-----------|--------|----------|----------|--------------|--------|
| BUG-001 | [BUG-001] About Eazzio footer links are non-functional | Landing Page → Footer → About Eazzio | Medium | P3 | [#45](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/45) | Open / Confirmed |
| BUG-002 | [BUG-002] Support footer links are non-functional | Landing Page → Footer → Support | Medium | P3 | [#46](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/46) | Open / Confirmed |
| BUG-003 | [BUG-003] Footer contact section has navigation issues | Landing Page → Footer → Contact Info | Low | P4 | [#47](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/47) | Open / Confirmed |
| BUG-004 | [BUG-004] Features footer links redirect to placeholder # | Landing Page → Footer → Features | Medium | P3 | [#48](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/48) | Open / Confirmed |

## Individual Bug Details

---

### BUG-001: About Eazzio Footer Links Are Non-Functional

- **Bug ID:** BUG-001
- **Bug Title:** About Eazzio footer links are non-functional
- **Module:** Landing Page
- **Page / Section:** Landing Page Footer → About Eazzio
- **Environment:** Live Production (https://payroll.eazzio.com/) — Desktop Web (Chromium / Playwright)
- **Component File:** `FFMS_FRONTEND/frontend/components/landing/Footer.tsx` (Lines 10–17)
- **Severity:** Medium
- **Priority:** P3 (Normal)
- **QA Status:** Confirmed (Reproduced on Live Site)
- **GitHub Issue:** [#45](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/45)

#### Affected Items
- `Our Story` (`href="#"`)
- `Careers` (`href="#"`)
- `Blog` (`href="#"`)
- `Legal` (`href="#"`)

#### Steps to Reproduce
1. Navigate to https://payroll.eazzio.com/.
2. Scroll to the footer section at the bottom of the page.
3. Locate the **About Eazzio** column.
4. Click on any of the links: **Our Story**, **Careers**, **Blog**, or **Legal**.
5. Observe the browser URL and page state.

#### Actual Result
Every link contains `href="#"`. Clicking any link appends `#` to the browser URL without navigating to any page or informational section.

#### Expected Result
Each link should navigate to its corresponding landing/content page or external resource (e.g., company story, careers portal, blog page, legal & privacy terms).

#### Evidence
- Footer Overview Screenshot: `QA_REPORTS/screenshots/landing-page-footer-overview.png`
- Code inspection confirms hardcoded placeholder links:
  ```tsx
  {
    title: "About Eazzio",
    links: [
      { label: "Our Story", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Legal", href: "#" },
    ],
  }
  ```

---

### BUG-002: Support Footer Links Are Non-Functional

- **Bug ID:** BUG-002
- **Bug Title:** Support footer links are non-functional
- **Module:** Landing Page
- **Page / Section:** Landing Page Footer → Support
- **Environment:** Live Production (https://payroll.eazzio.com/) — Desktop Web (Chromium / Playwright)
- **Component File:** `FFMS_FRONTEND/frontend/components/landing/Footer.tsx` (Lines 19–25)
- **Severity:** Medium
- **Priority:** P3 (Normal)
- **QA Status:** Confirmed (Reproduced on Live Site)
- **GitHub Issue:** [#46](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/46)

#### Affected Items
- `Help Center` (`href="#"`)
- `Contact Us` (`href="#"`)
- `Developer API` (`href="#"`)

#### Steps to Reproduce
1. Navigate to https://payroll.eazzio.com/.
2. Scroll to the footer section at the bottom of the page.
3. Locate the **Support** column.
4. Click on any link: **Help Center**, **Contact Us**, or **Developer API**.
5. Observe the browser URL and page state.

#### Actual Result
Links are hardcoded to `href="#"`. Clicking does not load support documentation, open contact dialogs, or direct users to developer resources.

#### Expected Result
- **Help Center:** Should navigate to a documentation/FAQ portal or help desk.
- **Contact Us:** Should navigate to a dedicated contact form/page or scroll to a contact section.
- **Developer API:** Should navigate to API documentation or developer hub.

#### Evidence
- Footer Overview Screenshot: `QA_REPORTS/screenshots/landing-page-footer-overview.png`
- Code inspection confirms hardcoded placeholder links:
  ```tsx
  {
    title: "Support",
    links: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "Developer API", href: "#" },
    ],
  }
  ```

---

### BUG-003: Footer Contact Section Has Navigation Issues

- **Bug ID:** BUG-003
- **Bug Title:** Footer contact section has navigation issues
- **Module:** Landing Page
- **Page / Section:** Landing Page Footer → Contact Info
- **Environment:** Live Production (https://payroll.eazzio.com/) — Desktop Web (Chromium / Playwright)
- **Component File:** `FFMS_FRONTEND/frontend/components/landing/Footer.tsx` (Lines 39–54)
- **Severity:** Low
- **Priority:** P4 (Low)
- **QA Status:** Confirmed (Technical inspection distinguished protocol links vs. placeholder data)
- **GitHub Issue:** [#47](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/47)

#### Affected Items
- **Email:** `eazzioground@gmail.com` (`mailto:eazzioground@gmail.com`) — Needs validation against official domain email.
- **Phone:** `+1 (800) 123-4567` (`tel:+18001234567`) — Dummy placeholder US toll-free number.
- **Address:** `Jamshedpur, Jharkhand` — Displayed as plain text without map navigation.

#### Steps to Reproduce
1. Navigate to https://payroll.eazzio.com/.
2. Scroll to the footer section.
3. Observe the **Contact Info** column.
4. Verify phone number (`+1 (800) 123-4567`) and address (`Jamshedpur, Jharkhand`).
5. Click on the address item — notice no map navigation or link is attached.

#### Actual Result
While email and phone have protocol links (`mailto:` and `tel:`), the phone number is a fictitious placeholder (`+1 (800) 123-4567`) rather than an operational corporate line. The office address is static text lacking navigation or map links.

#### Expected Result
- Official corporate email should be verified and linked with `mailto:`.
- Official phone number should be provided with `tel:` protocol.
- Address should optionally link to Google Maps or provide full navigable company headquarters details.

#### Evidence
- Footer Overview Screenshot: `QA_REPORTS/screenshots/landing-page-footer-overview.png`
- Code inspection:
  ```tsx
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#3ca2fa]" />,
      text: "eazzioground@gmail.com",
      href: "mailto:eazzioground@gmail.com",
    },
    {
      icon: <Phone size={18} className="text-[#3ca2fa]" />,
      text: "+1 (800) 123-4567",
      href: "tel:+18001234567",
    },
    {
      icon: <MapPin size={18} className="text-[#3ca2fa]" />,
      text: "Jamshedpur, Jharkhand",
    },
  ];
  ```

---

### BUG-004: Features Footer Links Redirect to Placeholder #

- **Bug ID:** BUG-004
- **Bug Title:** Features footer links redirect to placeholder #
- **Module:** Landing Page
- **Page / Section:** Landing Page Footer → Features
- **Environment:** Live Production (https://payroll.eazzio.com/) — Desktop Web (Chromium / Playwright)
- **Component File:** `FFMS_FRONTEND/frontend/components/landing/Footer.tsx` (Lines 27–35)
- **Severity:** Medium
- **Priority:** P3 (Normal)
- **QA Status:** Confirmed (Reproduced on Live Site)
- **GitHub Issue:** [#48](https://github.com/Eazzio-Technologies-Pvt-Ltd/Eazzio-Payroll/issues/48)

#### Affected Items
- `GPS Tracking` (`href="#"`)
- `Task Management` (`href="#"`)
- `Attendance` (`href="#"`)
- `Route Planning` (`href="#"`)
- `Analytics` (`href="#"`)

#### Steps to Reproduce
1. Navigate to https://payroll.eazzio.com/.
2. Scroll to the footer section.
3. Locate the **Features** column.
4. Click on any feature link (e.g., **GPS Tracking**, **Task Management**, **Attendance**, **Route Planning**, **Analytics**).
5. Observe the browser URL and page state.

#### Actual Result
All feature links have `href="#"`. Clicking any item appends `#` to the URL without navigating or smooth-scrolling to the corresponding feature block on the landing page (e.g. `#features`).

#### Expected Result
Each link should navigate or smooth-scroll to the corresponding feature showcase section on the page (e.g. `/#features`), or route to dedicated product explanation pages.

#### Evidence
- Footer Overview Screenshot: `QA_REPORTS/screenshots/landing-page-footer-overview.png`
- Code inspection confirms hardcoded placeholder links:
  ```tsx
  {
    title: "Features",
    links: [
      { label: "GPS Tracking", href: "#" },
      { label: "Task Management", href: "#" },
      { label: "Attendance", href: "#" },
      { label: "Route Planning", href: "#" },
      { label: "Analytics", href: "#" },
    ],
  }
  ```

---

## Developer Action Required

The frontend team should:
- Investigate each reported issue.
- Implement the appropriate fixes.
- Verify navigation destinations.
- Test desktop and mobile layouts.
- Update the corresponding GitHub issues.
- Submit implementation PRs referencing the QA issues.

## QA Retesting

Leave the following checklist for QA:

- [ ] BUG-001 verified after fix.
- [ ] BUG-002 verified after fix.
- [ ] BUG-003 verified after fix.
- [ ] BUG-004 verified after fix.
- [ ] Desktop regression testing completed.
- [ ] Mobile regression testing completed.
