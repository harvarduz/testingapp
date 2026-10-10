# Verified release

Validated on 10 October 2026 with Node.js 24, Chromium, and the compiled production frontend. This release updates the landing page and learning workspace, adds study tools, and retains the Railway deployment configuration.

| Suite | Passed | What it verifies |
|---|---:|---|
| `npm test` | 19 | Content, progress merges, bookmarks and note deletion, account isolation, drafts, publication, invalid uploads, origin protection, persistence, and Railway domain configuration |
| `tests/browser_smoke.py` | 14 | Lessons, retries, saved progress, daily practice, keyboard navigation, and responsive app screens |
| `tests/landing_smoke.py` | 11 | Homepage navigation, interactive lesson, course entry points, mobile menu, and responsive layout |
| `tests/marketplace_smoke.py` | 11 | Registration, uploads, private drafts, previews, publication, independent student browsers, account progress, and creator layouts |
| `tests/study_tools_smoke.py` | 11 | Bookmarks, private notes, cross-device deletion, clipboard fallback, shared links including newly published courses, combined filters, review without duplicate credit, and mobile navigation |
| `tests/accessibility_smoke.py` | 35 | Automated axe-core WCAG A/AA checks on desktop/mobile screens, filters, saved courses, notes, navigation dialogs, lessons, accounts, and creator editor |
| `tests/docker_smoke.py` | 8 | Startup before domain generation, automatic Railway domain, unprivileged process, security headers/cookies, publication, persistent notes/bookmarks/accounts/courses, and origin protection |
| **Total** | **109** | **All checks passed for this release** |

`npm run build` passed. Layout checks cover 320, 390, 768, and 1366 px widths. Desktop and mobile screenshots were visually reviewed. Keyboard focus, mobile menu trapping and dismissal, bottom navigation, password visibility, and course dialogs were exercised. Automated accessibility checks reported zero violations across the 35 tested states; they supplement manual review and do not certify complete WCAG compliance.

Notes and bookmarks were checked in independent browser contexts and through stale API updates. Clearing a note and removing a bookmark retain timestamped deletion records, so older data does not restore them. Notes remain private to their account. Guest progress and earlier account records remain compatible. Review does not add duplicate lesson totals.

The container test publishes a course and saves notes/bookmarks, replaces the container while retaining its volume, then verifies account, session, course, and study data persistence. It cleans up only its own containers and test volume. The backend and progress model were tested in the production container; the final visual refinements were checked against the compiled frontend.

The user-deployed service at https://bup.up.railway.app/ returned HTTP 200 for its homepage, an `ok` health response with the free-publishing offer, and an anonymous session response before this release was pushed. Public verification uses read-only HTTP requests with TLS verification enabled. Browser tests, registrations, and course publication use local servers. This cloud's Chromium does not trust the managed proxy certificate; its persistent trust-store modification was rejected by automatic review, so public browser verification remains unavailable. The latest GitHub commit still needs to finish Railway deployment before the updated public interface is available.

Production can serve the website and health endpoint before Railway assigns a public domain; writes require a configured HTTPS origin. `RAILWAY_PUBLIC_DOMAIN` works automatically after redeployment, and `PUBLIC_URL` overrides it for a custom origin. Managed-cloud container builds used temporary CA mounts with TLS verification; the deployed Dockerfile requires no secret mount.

The built-in catalog has 20 courses, 61 lessons, and 18 subject areas. Creator publishing is free for a limited time. Email verification, password recovery, moderation, and live checkout remain outside the implemented scope. No competition score is guaranteed.
