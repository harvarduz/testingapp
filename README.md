# Curio

An English learning platform with 20 original introductory courses, 121 lessons, 278 additional practice questions, seven study paths, three interactive Learning Lab activities, and 18 subject areas. Students can learn as guests or use an account, save courses for later, and keep private lesson notes; creators can write, import, preview, and publish courses. Course publishing is **free for a limited time**, with no card or payment simulation.

## Try the complete platform

Install **Node.js 24**, open a terminal in the project folder, and run:

```sh
npm ci
npm run dev
```

The frontend and backend start together on port 5173. No API keys or separate database service are required. Open that port in your local browser. The homepage is the default route; `#overview`, `#explore`, `#learning`, `#practice`, `#paths`, `#lab`, `#achievements`, and `#creators` open the app screens.

To test publishing: choose **Create your first course**, register, download a template, and upload it. Edit the lesson, preview, save a draft, and publish for free. Use another browser or private window to find the published course and complete a lesson. Sign in with a student account on a different browser to check saved progress.

To try the study tools: save a course using its bookmark button, then open **My learning → Saved**. Start a lesson and expand **Your notes**; notes save automatically. **Copy course link** opens that course directly in another browser. In **Practice & review**, reopen completed lessons without adding duplicate progress. Catalog filters combine subject, level, duration, search, and sort. On small phones the search has its own full-width row, subject shortcuts scroll horizontally, and filter values wrap instead of disappearing behind an ellipsis.

```sh
npm test
npm run build
npm start
```

`npm start` serves the production build and API on port 3000; `npm run preview` uses port 4173. `PORT` overrides the default. This platform requires its Node backend. Deploying only `dist/` to GitHub Pages will not provide accounts, uploads, or shared publishing.

## Learning, practice, and Curio coins

Open **Study paths** to choose a sequence with a practical outcome. Your plan remembers its progress and opens the next unfinished lesson. The order is recommended; courses are not locked.

All 121 starter lessons include learning goals, a stepped worked example, a common mistake, and at least two additional questions. Every course has six or more lessons, including three application lessons. Use Previous/Next step to work through an example, then answer the in-lesson exercises and read the reasoning after checking. Wrong answers allow another try. Opening a lesson, its check, or the idea again returns the dialog to its top and focuses it, so a long lesson starts with its heading. The separate lesson check records completion; inline exercises record practice history without awarding premature completion or session coins. New lessons are appended, so earlier completion indices keep their meaning. Creators can add the same fields in the lesson editor or JSON upload: up to five goals, eight worked steps, and five extra questions per lesson. Older course files remain supported.

The homepage’s **Make the idea work** section offers three practice models: shade a target fraction, find a discount and compare editable pack prices. Calculations update as you interact; checking gives a specific explanation, and each model opens its related lesson. Blank or invalid prices/quantities get field-level recovery instructions. Unit prices are compared exactly before the displayed amounts are rounded. These local previews award no completion or coins. Catalog gauges show their actual inventory totals throughout scrolling, with **Show all totals** for immediate access.

The homepage opens with a viewport-scale navy particle hero inspired by the requested [SI.gov motion reference](https://www.si.gov/). Large white serif **Curio** lettering transforms into **Stay curious.** on pointer entry or a short touch tap. Moving the pointer displaces the dots; clicking or tapping sends a pulse through them. Scrolling carries the same canvas into **Small ideas. A bigger picture.**, where the lettering becomes an orbital sphere. Real headings and course actions remain readable throughout the transition, and the interactive lesson preview follows the scene.

**Curio**, **Connections**, and the keyboard-accessible **Transform lettering** control select a shape. Connections is centered above the first-screen heading and moves right as the second text panel comes into view; **Follow scroll** restores the automatic sequence. **Pause animation** freezes the drawing, and **Play animation** resumes it. The caption explains the current mode. Rendering follows the browser’s display cadence with frame-time-normalized spring physics, 1,800 points at widths of 900 px and above or 1,200 below, and pixel density capped at 2. Settled lettering stops requesting frames; offscreen scenes and hidden tabs suspend animation. Reduced motion and missing observer support retain static selectable shapes, and missing Canvas keeps the brand visible. The geometry and animation are original code; no reference assets, animation library, or remote animation dependency are included.

The supplied [SI-site mockup](https://azizbeksafarov.github.io/design/si-site/) also guides motion after the hero. A shared transparent canvas animates a helix beside the lesson preview, a helix/network/towers across the method cards, subject-specific course-cover shapes, and expanding broadcast rings in publishing and the final invitation. The renderer follows each region during scrolling and card reveals, clips ink to its artwork and excludes real labels and actions. Existing illustrations remain available without Canvas. Pause/Play is shared with the hero; reduced motion keeps static shapes. Only visible regions animate, sharing a 1,800-point desktop/1,200-point narrow-screen budget with DPR capped at 2.

**Targeted practice** draws up to five questions from completed lessons. It prioritizes missed questions, then unattempted questions, and finally older correct answers. Results explain each answer and link back to the ideas behind mistakes. Courses without extra questions use their existing quiz. Recent-answer statistics retain the latest 500 practice records; study choices and answers sync with the account.

**Learning Lab** makes ideas observable: shade equivalent fractions, adjust a student budget while protecting essential needs and savings, or lock an algorithm prediction before tracing each update. Labs link to their related lessons. Completing each lab earns 30 coins once and contributes one activity to the daily learning goal.

**Curio coins** reward learning: 25 for each newly completed lesson, 15 for each daily challenge, and 20 for the first successful practice session each day. A session must include a correct answer. Repeating a lesson or same-day session adds no extra coins. Each completed lab also earns 30 coins once. The balance is derived from saved learning records. Coins are motivational points with no cash value, purchases, or withdrawal facility.

Internal actions show named loading states for sign-in, saving, publishing, deleting and logout. Creator list operations serialize while pending and restore focus after refresh; deleting a draft defaults focus to **Keep**, and controls scroll clear of the mobile bottom navigation. Clipboard copying preserves focus, rejects duplicate requests and selects a usable fallback link if permission fails. Dialogs close on an intentional backdrop tap or click; dragging a selection outside the dialog keeps it open. Native disabled fieldsets and controls removed during a press release Material feedback. Course-title and delete controls provide 44 px targets, and editor Save/Publish actions stack on phones.

The closed mobile drawer is excluded from keyboard navigation. Page navigation focuses the destination heading; searching and clearing a query retain the input cursor. Temporary account-loading failures can be retried without reloading; a delayed retry cannot replace a newer authenticated session.

The desktop sidebar can collapse to an icon rail and remembers that browser preference. It scrolls independently on short screens. Mobile uses a full drawer and bottom navigation. Colour, feedback, coin celebrations, and hover effects respect reduced-motion settings.

## Material Expressive appearance

The platform adapts the supplied [Bloom Material Expressive reference](https://azizbeksafarov.github.io/design/material-expressive/dist/index.html). Google Sans Flex headings, Roboto body text, a 96 px navigation rail, tonal surfaces, rounded containers, outlined course cards, and pill buttons carry through the homepage, student workspace, lessons, labs, account forms, and creator editor.

Blue is the default, with Google's `#0b57d0` filled-button accent and a readable dark-mode counterpart. Use the palette icon on desktop or **Appearance** in either mobile menu to choose Blue, Purple, Green, or Terracotta and light/dark mode. Material Color Utilities generates the reference's Tonal Spot foundation, including primary containers; Google's brand colours apply to the blue primary/on-primary pair. Each palette option previews its own tones, with an outline and check identifying the selection. Appearance is remembered on the current browser; blocked storage keeps the controls usable and displays the persistence limitation. The initial release's saved purple default migrates once to blue; new explicit choices keep their colour across reloads. Existing expanded-navigation preferences are retained. The appearance dialog traps keyboard focus and returns it to a visible opener.

Bloom's surface hierarchy separates an accented feature panel from neutral information panels and bordered course cards. Filled actions identify the next learning step; secondary actions are outlined or text buttons. Course covers and SVG artwork use paired Material colour roles in every palette and display mode. Cover hover/focus labels and mobile labels identify the action; the homepage's cards also show an explicit Explore course link. Fraction pieces use outlined unselected controls and filled selected controls, while the result stays on a neutral panel.

Native buttons share Material state layers, bounded ripples, 48 px primary actions, a visible keyboard focus ring, and a brief pressed-shape transition. Pointer, keyboard, and touch retain their normal activation behaviour. Dragging away or beginning a scroll cancels feedback; disabled actions produce no ripples. Reduced motion keeps immediate state feedback without ripple animation. The ripple replaces the hover layer while active so the two layers do not reduce filled-button text contrast.

Catalog, learner-goal, creator, and algorithm dropdowns use the same Material menu instead of the browser's native picker. Menus show the current choice, support arrow keys, Home/End and typeahead, and stay within mobile and desktop viewports. Escape closes an open menu before its enclosing dialog. Creator selections retain their underlying subject, illustration, and numeric answer values.

Hover uses a consistent state layer; selected chips, quiz choices, course titles, and cover artwork keep their colour and position. Fraction and budget sliders share the current palette while retaining native keyboard controls. Learning updates close on outside clicks, Escape, or navigation. Leaving unsaved course edits opens a themed confirmation: cancel preserves the editor, and discard continues the requested navigation or search.

## Landing motion

Curio keeps the Bloom appearance and uses [SAT Stars](https://satstars.uz/) as a reference for **scroll reactions**. The reference was inspected from TLS-verified assets in Chromium: at a fixed scroll position its score/gauge stop, and returning to an earlier position restores the same frame.

The existing catalog statistics now use that behavior. Native scrolling directly sets the course, lesson and subject numbers, circular fills and pointer positions. Scrolling back reverses them; stopping freezes them. Final totals come from the actual catalog. Screen readers always receive those complete totals, and the number widths stay reserved. The section pins briefly while scrolling and has a normal link to continue to How it works.

The new knowledge block connects fractions, percentages and unit prices through accurate examples. Scroll draws each connection, updates the illustrated idea count and highlights the related explanation. Keyboard/touch buttons can also select a skill. Each action opens the corresponding real lesson in Thinking in numbers. The map is an example learning path; scrolling does not complete lessons or award coins.

Both scenes use native scroll, small SVGs and event-scheduled animation frames without an animation library or remote motion assets. Only visible scenes animate; a scene leaving view settles to its endpoint. There is no idle JavaScript animation loop. Reduced motion, very short screens and missing IntersectionObserver show finished statistics and connections without a pinned spacer. Compact knowledge maps retain manual skill selection and real lesson entry. Preferences can change while the page is open. Existing entrances preserve layout and reveal immediately on keyboard focus. The separate particle hero rotates its sphere only while visible and unpaused.

## Data and account behavior

- The same account avatar is available on the homepage and in the student workspace. Open it for Sign in/Create account, My learning, Learning profile, Creator workspace, and Sign out. Identity comes from the real session; account and save status appear here rather than in repeated page banners. Failed saving offers retry, and failed sign-out retains the session with an explanation. Signing out protects unfinished creator edits and clears the private editor after success.
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

`npm test` runs 34 backend/content/progress checks, including exact currency comparisons, appended lesson compatibility, automatic Railway domains, startup before domain generation, ownership, private drafts, publication, input/file validation, cross-origin requests, concurrent progress merges, and server restart persistence.

Browser suites require Python Playwright and Chromium. Start the application for these suites:

```sh
python tests/browser_smoke.py
python tests/landing_smoke.py
python tests/accessibility_smoke.py
python tests/button_smoke.py
python tests/action_ux_smoke.py
python tests/skill_playground_smoke.py
python tests/particle_story_smoke.py
python tests/landing_particles_smoke.py
python tests/landing_ux_smoke.py
python tests/interface_audit_smoke.py
```

Set `CURIO_TEST_URL` to use another application server. Accessibility checks use the npm-installed axe-core on desktop/mobile pages, dialogs, and the editor. Automated checks supplement manual keyboard and visual review; they do not certify complete WCAG compliance.

After building, these suites each start an isolated server and remove their temporary database after testing:

```sh
python tests/marketplace_smoke.py
python tests/study_tools_smoke.py
python tests/learning_smoke.py
python tests/labs_smoke.py
python tests/material_smoke.py
python tests/select_smoke.py
python tests/hover_smoke.py
python tests/navigation_smoke.py
python tests/platform_ux_smoke.py
python tests/landing_motion_smoke.py
python tests/account_creator_ux_smoke.py
python tests/learning_ux_smoke.py
```

The marketplace suite tests imports, drafts, previews without progress credit, publication, account progress, and creator layouts. The study-tools suite checks bookmarks, private notes, deletion after stale-device updates, clipboard fallback, direct links to newly published courses, combined filters, review without duplicate credit, password visibility, and mobile keyboard navigation. The learning suite covers collapsible navigation, worked lessons, path continuation, new practice questions, mistake recommendations, Curio coin limits, editor-created practice, and cross-device persistence. The lab suite checks equivalent fractions, savings constraints, locked predictions, both algorithm modes, one-time rewards, related lessons, and cross-device progress. Layout checks cover 320/390/768/1366 px widths and short desktop/mobile heights.

The Material suite checks reference colours/fonts, all four palettes in both display modes, persistence, mobile appearance dialogs, reduced motion, blocked/corrupt storage, layout, and 80 additional axe states. Run the full accessibility suite again with `CURIO_TEST_THEME=dark` to audit dark lessons, feedback, private notes, and authenticated course editors. Only run these writing browser suites against a development/test database.

The button suite checks one-time legacy appearance migration, pointer/ripple geometry and cleanup, native Enter/Space activation, disabled controls, cancelled touch gestures, real mobile touchscreen activation, reduced motion, and Escape followed immediately by the search shortcut.

The selection suite exercises all shared menus through keyboard and actual touchscreen input, combined catalog filters, nested profile dialogs, numeric form values, and creator saves. Its 28 additional axe states include opened desktop/mobile menus and readable profile text. The hover suite guards against old colours, moving artwork, lost selected states, active controls, and slider presentation. The navigation suite checks notification dismissal, readable light/dark preferences, unsaved-edit cancellation/discard, deferred search, hash navigation, mobile focus restoration, and the absence of native confirmation dialogs. These suites use isolated accounts and drafts.

The platform UX suite checks real account identity, direct login/register entry, keyboard focus, light/dark mobile menus, save/logout recovery, unfinished-edit protection, and delayed sign-in responses. It exercises the first and two most recently appended lessons in every starter course: 60 flows with stepped examples and explained exercises, plus mobile completion of all 20 deeper application lessons. Wrong-answer retries and double activation are checked without premature completion or duplicate rewards. The playground suite adds fraction/discount/price checks, exact rounded-price edge cases, keyboard and real touch input, links to the correct lessons, and 24 light/dark accessibility states at 320/390/1366 px.

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
| Pending action feedback and native press handling | `src/ActionPending.jsx`, `src/action-pending.css`, `src/MaterialButtons.jsx` |
| Particle hero, lettering/sphere geometry and motion controls | `src/ParticleStory.jsx`, `src/particleGeometry.js`, `src/particle-story.css` |
| Page-wide particle effects and shared frame-time physics | `src/LandingParticleEffects.jsx`, `src/particleMotion.js`, `src/landing-particles.css` |
| Reversible catalog gauges, entrances and the knowledge map | `src/LandingMotion.jsx`, `src/landing-motion.css` |
| Homepage practice models and exact pack comparisons | `src/SkillPlayground.jsx`, `src/skill-playground.css`, `src/skillModels.js` |
| Material tokens, typography, responsive presentation | `src/material.css` |
| Palette generation, display modes, appearance controls | `src/Appearance.jsx`, `src/appearance-settings.css` |
| Native pointer, keyboard, and touch button feedback | `src/MaterialButtons.jsx` |
| Shared selection menus and responsive popup presentation | `src/SelectField.jsx`, `src/select.css` |
| Consistent hover states, slider styling, and selected controls | `src/material-interactions.css` |
| Unsaved-edit confirmation | `src/NavigationConfirm.jsx`, `src/navigation-confirm.css` |
| Earlier layout and learning-control foundations | `src/editorial.css` |
| Learning and marketing layout foundations | `src/styles.css`, `src/landing.css` |
| Courses and original subject lessons | `src/data.js`, `src/catalog.js` |
| Student navigation, lessons, progress | `src/App.jsx`, `src/progress.js` |
| Private notes, course sharing, completed-lesson review | `src/StudyTools.jsx` |
| Study paths, targeted practice, and Curio coins | `src/LearningExperience.jsx`, `src/learning.js` |
| Interactive fraction, budget, and algorithm labs | `src/LearningLab.jsx`, `src/labs.js` |
| Worked lesson content and additional questions | `src/lessonEnrichment.js`, `src/curriculum.js`, `src/applicationLessons.js` |
| Stepped examples and inline exercises | `src/LearningExperience.jsx`, `src/lesson-workshop.css` |
| Creator learning goals and practice editor | `src/LessonExtensionEditor.jsx` |
| Creator editor and JSON import | `src/Creator.jsx`, `src/marketplace.css` |
| Shared account controls, forms and API client | `src/AccountMenu.jsx`, `src/account-menu.css`, `src/Account.jsx`, `src/api.js` |
| Course validation and publication rules | `shared/course.js` |
| Accounts, sessions, SQLite, ownership | `server/app.js` |
| Server and persistent-volume startup | `server/index.js`, `server/bootstrap.js` |
| Original brand and subject artwork, Material artwork tones | `src/Art.jsx`, `src/course-art.css` |

Quiz answers use zero-based indices in `options`. Add course content with each new category so the subject has a useful destination. See `docs/competition-demo.md` for presentation and Ustoz evidence.

Conceptual inspiration: Brilliant and Khan Academy. Visual reference: Bloom Material Expressive, linked above. All course content and subject SVG illustrations are original. Icons: Lucide (ISC). Material Color Utilities: Apache 2.0. Shared selection behavior: Radix Select 2.2.6 (MIT), bundled with the application. Bundled fonts: Google Sans Flex, Roboto, DM Sans, and Manrope (SIL Open Font License, files in `public/fonts/`). No third-party course materials or brand artwork were copied.
