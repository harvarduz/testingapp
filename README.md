# Curio

An English learning platform with 20 original introductory courses, 61 lessons, 48 additional practice questions, seven study paths, three interactive Learning Lab activities, and 18 subject areas. Students can learn as guests or use an account, save courses for later, and keep private lesson notes; creators can write, import, preview, and publish courses. Course publishing is **free for a limited time**, with no card or payment simulation.

## Try the complete platform

Install **Node.js 24**, open a terminal in the project folder, and run:

```sh
npm ci
npm run dev
```

The frontend and backend start together on port 5173. No API keys or separate database service are required. Open that port in your local browser. The homepage is the default route; `#overview`, `#explore`, `#learning`, `#practice`, `#paths`, `#lab`, `#achievements`, and `#creators` open the app screens.

To test publishing: choose **Create your first course**, register, download a template, and upload it. Edit the lesson, preview, save a draft, and publish for free. Use another browser or private window to find the published course and complete a lesson. Sign in with a student account on a different browser to check saved progress.

To try the study tools: save a course using its bookmark button, then open **My learning → Saved**. Start a lesson and expand **Your notes**; notes save automatically. **Copy course link** opens that course directly in another browser. In **Practice & review**, reopen completed lessons without adding duplicate progress. Catalog filters combine subject, level, duration, search, and sort.

```sh
npm test
npm run build
npm start
```

`npm start` serves the production build and API on port 3000; `npm run preview` uses port 4173. `PORT` overrides the default. This platform requires its Node backend. Deploying only `dist/` to GitHub Pages will not provide accounts, uploads, or shared publishing.

## Learning, practice, and Curio coins

Open **Study paths** to choose a sequence with a practical outcome. Your plan remembers its progress and opens the next unfinished lesson. The order is recommended; courses are not locked.

Sixteen lessons in mathematics, computer science, data, physics, and English include learning goals, worked steps, a common mistake, and three extra questions each. Creators can add the same fields in the lesson editor or JSON upload: up to five goals, eight worked steps, and five extra questions per lesson. Older course files remain supported.

**Targeted practice** draws up to five questions from completed lessons. It prioritizes missed questions, then unattempted questions, and finally older correct answers. Results explain each answer and link back to the ideas behind mistakes. Courses without extra questions use their existing quiz. Recent-answer statistics retain the latest 500 practice records; study choices and answers sync with the account.

**Learning Lab** makes ideas observable: shade equivalent fractions, adjust a student budget while protecting essential needs and savings, or lock an algorithm prediction before tracing each update. Labs link to their related lessons. Completing each lab earns 30 coins once and contributes one activity to the daily learning goal.

**Curio coins** reward learning: 25 for each newly completed lesson, 15 for each daily challenge, and 20 for the first successful practice session each day. A session must include a correct answer. Repeating a lesson or same-day session adds no extra coins. Each completed lab also earns 30 coins once. The balance is derived from saved learning records. Coins are motivational points with no cash value, purchases, or withdrawal facility.

The desktop sidebar can collapse to an icon rail and remembers that browser preference. It scrolls independently on short screens. Mobile uses a full drawer and bottom navigation. Colour, feedback, coin celebrations, and hover effects respect reduced-motion settings.

## Data and account behavior

- Guest progress is stored in the browser. Signing in merges it into the account without awarding duplicate completion credit. Signing out clears local account progress.
- Bookmarks and private notes use timestamped records so removing a bookmark or clearing a note survives a stale-device sync. Notes are limited to 2,000 characters per lesson. Existing progress remains compatible.
- SQLite stores accounts, salted scrypt password hashes, expiring sessions, drafts, published courses, and account progress. The default file is `.data/curio.sqlite`; set `CURIO_DATA_DIR` to a persistent deployment directory.
- Session tokens are hashed in storage and sent in HttpOnly cookies. Production uses Secure cookies and rejects cross-origin writes.
- Drafts belong to their author. Publishing requires explanations, examples, four distinct answers, and correct-answer feedback. The upload format is course JSON, with a 1 MB file limit, 50 lessons per course, and 50 courses per creator.
- Previously published lessons cannot be deleted. Unpublishing removes a course from discovery while retaining content and completion records; it reappears in My learning if republished.
- Text is rendered safely as text; uploads cannot supply arbitrary HTML or SVG. Only upload content you own or have permission to share.

Email verification, forgotten-password recovery, and content moderation/reporting are not implemented. Before a larger public launch, add those services, edge rate limiting, and scheduled backups. No live checkout is needed under the current free offer.

## Railway deployment

The project includes a tested multi-stage `Dockerfile` and `railway.json`. The bootstrap handles a root-owned Railway volume, then runs Node as an unprivileged user.

1. Put these project files in your GitHub repository and create a Railway service from it. Railway detects the Dockerfile.
2. Add one persistent volume mounted at `/data`. Use **one replica** for this SQLite deployment.
3. Under **Settings → Networking → Public Networking**, generate a public domain and deploy the latest commit. The app automatically uses Railway's `RAILWAY_PUBLIC_DOMAIN`; no manual `PUBLIC_URL` is needed for that domain. For a custom domain, set `PUBLIC_URL` to its exact HTTPS origin, such as `https://learn.example.com`.
4. Keep `NODE_ENV=production` and `CURIO_DATA_DIR=/data`, supplied by the Docker image. Railway supplies `PORT`.
5. Deploy, verify `/api/health`, then exercise registration, uploading, publishing, and learning in separate browsers.
6. Configure volume backups and verify restoration before relying on important user data.

The user-managed deployment is at https://bup.up.railway.app/. Pushes to `main` deploy automatically when Railway auto-deploy is enabled; otherwise deploy the latest commit from the service dashboard. Keep the existing `/data` volume attached when updating. Hosting and persistent storage follow Railway's current plan.

The server can start and pass its health check before a domain is generated. In that state it serves the website and catalog but disables API writes. Registration, progress syncing, and publishing become available after an HTTPS origin is configured and the service is redeployed. Invalid explicit production origins still fail startup. Local development needs no `.env`; use `.env.example` for optional settings.

## Validation

`npm test` runs 28 backend/content/progress checks, including automatic Railway domains, startup before domain generation, ownership, private drafts, publication, input/file validation, cross-origin requests, concurrent progress merges, and server restart persistence.

Browser suites require Python Playwright and Chromium. Start the application for these suites:

```sh
python tests/browser_smoke.py
python tests/landing_smoke.py
python tests/accessibility_smoke.py
```

Set `CURIO_TEST_URL` to use another application server. Accessibility checks use the npm-installed axe-core on desktop/mobile pages, dialogs, and the editor. Automated checks supplement manual keyboard and visual review; they do not certify complete WCAG compliance.

After building, these suites each start an isolated server and remove their temporary database after testing:

```sh
python tests/marketplace_smoke.py
python tests/study_tools_smoke.py
python tests/learning_smoke.py
python tests/labs_smoke.py
```

The marketplace suite tests imports, drafts, previews without progress credit, publication, account progress, and creator layouts. The study-tools suite checks bookmarks, private notes, deletion after stale-device updates, clipboard fallback, direct links to newly published courses, combined filters, review without duplicate credit, password visibility, and mobile keyboard navigation. The learning suite covers collapsible navigation, worked lessons, path continuation, new practice questions, mistake recommendations, Curio coin limits, editor-created practice, and cross-device persistence. The lab suite checks equivalent fractions, savings constraints, locked predictions, both algorithm modes, one-time rewards, related lessons, and cross-device progress. Layout checks cover 320/390/768/1366 px widths and short desktop/mobile heights.

Production container and persistent-volume checks:

```sh
docker build -t curio-marketplace:test .
python tests/docker_smoke.py
```

This suite only removes its own containers and volume. The deployment Dockerfile uses standard build instructions compatible with Railway's Metal builder. Managed development networks may require a separate local build configuration for their public CA and proxy; preserve TLS verification.

Screenshots and current accessibility results are written to ignored `test-results/`.

## Editing map

| Change | File |
|---|---|
| Homepage, subject browsing, creator offer | `src/Landing.jsx` |
| Editorial palette and readable typography | `src/editorial.css` |
| Learning and marketing layout foundations | `src/styles.css`, `src/landing.css` |
| Courses and original subject lessons | `src/data.js`, `src/catalog.js` |
| Student navigation, lessons, progress | `src/App.jsx`, `src/progress.js` |
| Private notes, course sharing, completed-lesson review | `src/StudyTools.jsx` |
| Study paths, targeted practice, and Curio coins | `src/LearningExperience.jsx`, `src/learning.js` |
| Interactive fraction, budget, and algorithm labs | `src/LearningLab.jsx`, `src/labs.js` |
| Worked lesson content and additional questions | `src/lessonEnrichment.js` |
| Creator learning goals and practice editor | `src/LessonExtensionEditor.jsx` |
| Creator editor and JSON import | `src/Creator.jsx`, `src/marketplace.css` |
| Account forms and API client | `src/Account.jsx`, `src/api.js` |
| Course validation and publication rules | `shared/course.js` |
| Accounts, sessions, SQLite, ownership | `server/app.js` |
| Server and persistent-volume startup | `server/index.js`, `server/bootstrap.js` |
| Original brand and subject artwork | `src/Art.jsx` |

Quiz answers use zero-based indices in `options`. Add course content with each new category so the subject has a useful destination. See `docs/competition-demo.md` for presentation and Ustoz evidence.

Conceptual inspiration: Brilliant and Khan Academy. All course content and SVG illustrations are original. Icons: Lucide (ISC). Bundled fonts: DM Sans and Manrope (SIL Open Font License). No third-party course materials or brand artwork were copied.
