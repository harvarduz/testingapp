# Verified release

Guided learning was validated on 10 October 2026; the Learning Lab extension was validated on 12 October 2026 with Node.js 24, Chromium, and the compiled production frontend. This release adds collapsible navigation, study paths, worked lessons, targeted practice, and Curio coins, with richer colours and short feedback animations. The extension adds interactive fraction models, a budget challenge, and an algorithm tracer.

| Suite | Passed | What it verifies |
|---|---:|---|
| `npm test` | 28 | Content, course imports, progress merges, study paths, practice priority, Curio coin limits, accounts, private drafts, publication, origin protection, and persistence |
| `tests/browser_smoke.py` | 14 | Lessons, retries, saved progress, daily practice, keyboard navigation, responsive screens, and unavailable browser storage |
| `tests/landing_smoke.py` | 11 | Homepage navigation, interactive preview, real course entry points, FAQ, mobile menu, responsive layout, and asset requests |
| `tests/marketplace_smoke.py` | 11 | Registration, uploads, private drafts, preview without progress, publication, independent student browsers, account progress, and creator layouts |
| `tests/study_tools_smoke.py` | 11 | Bookmarks, notes, cross-device deletion, clipboard fallback, shared course links, combined filters, and completed-lesson review |
| `tests/learning_smoke.py` | 8 | Collapsible and scrollable navigation, worked lessons, study-path continuation, transfer questions, mistake recommendations, coin limits, cross-device practice, and editor-authored practice |
| `tests/labs_smoke.py` | 6 | Equivalent fractions, budget constraints, locked algorithm predictions, one-time lab coins, related lessons, mobile layouts, and separate-device persistence |
| `tests/accessibility_smoke.py` | 64 | Automated axe-core WCAG A/AA checks on desktop/mobile pages, active paths, collapsed navigation, coin dialogs, worked lessons, practice feedback/results, lab controls/traces, and course editors |
| `tests/docker_smoke.py` | 10 | Domain configuration, unprivileged startup, security headers/cookies, publication, replacement-container persistence for accounts/courses/notes/bookmarks/paths/practice/labs, and origin protection |
| **Total** | **163** | **All checks passed across the guided-learning release and lab extension** |

`npm run build` passed. Layout checks cover 320, 390, 768, and 1366 px widths, including short mobile and desktop heights. The sidebar was reproduced at a 600 px viewport with 812 px of content and no scrolling. It now scrolls independently, collapses to an 84 px icon rail, remembers its browser preference, and expands into a full mobile drawer. Mobile focus trapping, Escape, restored focus, and navigation were tested.

The catalog has 20 introductory courses and 61 lessons across 18 subjects. Sixteen lessons in mathematics, computer science, statistics, physics, and English now include learning goals, a worked example with explicit steps, a common mistake, and three transfer questions each: 48 additional questions. Seven study paths cover the catalog with suggested course order and practical outcomes. They recommend rather than lock courses.

Learning Lab requires meaningful interaction: the fraction challenge accepts equivalent models using at least eight pieces; the budget protects minimum spending on essential needs as well as savings; and the algorithm locks a prediction before the student traces each value. Wrong predictions do not earn lab coins. Both summation and maximum traces work on bounded whole-number inputs. Completed labs persist across devices and contribute once to daily activity. Repeated completion does not award coins again.

Practice chooses missed questions before unattempted questions and older correct answers. Sessions explain answers and recommend the lessons behind mistakes. The latest 500 attempt records support recent-answer statistics; course completion records remain separate. A real editor-created course with goals, worked steps, and practice was published and used by another student browser.

Curio coins are derived from saved learning records: 25 per newly completed lesson, 15 per daily challenge, and 20 for the first successful practice session per day, and 30 for each completed lab once. At least one answer must be correct to earn a practice reward. Tests repeat sessions, merge two devices, and revisit lessons to verify that rewards and course completions are not duplicated. Coins have no cash value or purchase/withdrawal system. They are learning motivation, not an accredited assessment or financial balance.

Paths, attempts, lab completions, reward-earning days, notes, and bookmarks were verified across independent browser contexts and production container replacement. Existing course JSON without extension fields and earlier progress records remain compatible. No SQLite schema migration is required for this release; retained data uses the existing account progress store.

Visual screenshots were reviewed. Colour distinguishes learning goals, worked steps, correct answers, useful mistakes, and rewards. Hover effects and celebrations are brief. Reduced-motion CSS disables decorative effects; programmatic navigation also uses immediate scrolling when reduced motion is requested. Automated checks found zero accessibility violations in the 64 tested states; these checks supplement manual review and do not certify complete WCAG compliance.

The public service is https://bup.up.railway.app/. Public verification uses read-only HTTP requests with TLS verification enabled, checking the deployed frontend bundles, catalog, health, and anonymous session. Browser interaction, test registrations, and publishing use local or isolated test databases. The guided-learning commit `72eb560` was verified live on 12 October: its public JS/CSS matched the local production build, the catalog included all 48 extra practice questions, and health returned `ok`. The lab extension is delivered through a subsequent GitHub `main` commit; Railway auto-deploy must finish before its new assets appear.

The deployed Dockerfile remains compatible with Railway Metal. Its runtime stage includes the new lesson-content module required by the server. Local managed-cloud builds use temporary CA mounts with TLS verification; those mounts are not part of the deployed Dockerfile or runtime image.

The platform provides introductory lessons and learner-authored courses. Publishing remains free for a limited time. Video hosting, email verification, password recovery, moderation, live checkout, and accredited certification are outside the implemented scope. No competition score is guaranteed.
