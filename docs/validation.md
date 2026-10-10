# Verified release

Validated on 10 October 2026 with Node.js 24, Chromium, and the production frontend build. The latest Railway startup fix revalidated the unit and container suites. The student, landing, marketplace, and accessibility suites were run for the original UI release; frontend assets are unchanged by the deployment fixes.

| Suite | Passed | What it verifies |
|---|---:|---|
| `npm test` | 15 | Course content, progress merges, API ownership, drafts, publishing, invalid uploads, request limits, cross-origin protection, persistence, and Railway domain configuration |
| `tests/browser_smoke.py` | 14 | Student lessons, retries, saved progress, daily practice, keyboard navigation, and responsive app screens |
| `tests/landing_smoke.py` | 11 | Homepage navigation, interactive lesson, course entry points, mobile menu, and responsive layout |
| `tests/marketplace_smoke.py` | 11 | Registration, JSON uploads, drafts, previews, publication, another student's browser, account progress, and creator layouts |
| `tests/accessibility_smoke.py` | 26 | Automated axe-core WCAG A/AA checks across desktop/mobile screens, account dialogs, lessons, and creator editor |
| `tests/docker_smoke.py` | 7 | Startup without a domain, automatic Railway domain, unprivileged process, security headers/cookies, course publication, replacement-container persistence, and origin protection |
| **Total** | **84** | **All checks passed across the release and deployment fixes** |

`npm run build` also passed. Responsive checks cover 320, 390, 768, and 1366 px widths. Desktop and mobile screenshots were visually reviewed; keyboard focus, modal dismissal, and navigation were exercised in the browser. Automated accessibility checks reported zero violations in the 26 tested states. This is not a complete accessibility certification.

The container test creates a fresh root-owned volume, publishes a course, removes the container, and starts a replacement using that volume. Accounts, sessions, and courses survive replacement. The test removes only its own containers and volume afterward.

Production now serves the website and health endpoint before Railway assigns a public domain, while API writes remain disabled. Generating a Railway domain and redeploying enables the account and publishing flow automatically. An explicit `PUBLIC_URL` overrides the generated domain for custom HTTPS origins. Container builds in the managed cloud used a temporary, local-only public-CA configuration; the deployed Dockerfile requires no secret mount.

The built-in catalog contains 20 courses, 61 lessons, and 18 subject areas. Creator publishing is free for a limited time; there is no live checkout.

These checks establish local and container behavior. No public Railway service was deployed, and no competition score is guaranteed. Email verification, password recovery, and moderation remain future work; see the README for deployment and operational requirements.
