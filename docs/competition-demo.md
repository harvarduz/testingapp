# Curio: Ustoz preparation and evidence

Context: https://azizbeksafarov.github.io/ustoz/, reviewed 10 October 2026. The six areas are functionality 30, relevance/content 20, UX/UI 10, presentation 10, technology 20, and creativity 10. The detailed 21 subcriteria are a proposed workplan. The actual ticket and final regulations determine requirements; this project does not guarantee a score.

## Problem and result

Students need a clear starting point, ideas they can apply, and useful feedback. Curio offers 20 original courses across 18 subjects, 61 lessons, an interactive pattern activity, quizzes with retries, and saved learning progress. Creators write or import courses, keep drafts private, and publish to a shared catalog. Publishing is free for a limited time, as requested.

## Demonstration

1. Show the public page on desktop and mobile. Try a wrong preview answer and recover. The preview awards no progress.
2. Open Thinking in numbers. Adjust the sequence, read the example, answer 14, finish, refresh My learning, and continue.
3. Search for an absent course, clear filters, and browse a non-STEM subject such as Languages or Design.
4. Register in the creator workspace, download/upload a template, edit, preview, save a private draft, then publish free.
5. Use a separate browser to find the published course and author. Finish a lesson, create a student account, and resume its progress on another device.
6. Show passing tests, explain Node/SQLite and the persistent deployment volume, and make a small source edit.

## Criteria and evidence

| Area | Implementation | Acceptance evidence |
|---|---|---|
| Functionality, 30 | Search/filter/recovery, lessons/quizzes, actual progress, accounts, imports, drafts, publishing | Student and marketplace browser suites; API ownership/persistence tests |
| Content, 20 | 20 courses, 61 explanations/examples/quizzes, 18 subjects, accurate counts and author attribution | Content integrity test; published course in another browser |
| UX/UI, 10 | Large readable editorial type, consistent controls, clear navigation, keyboard focus, responsive creator/student pages | 320/390/768/1366 px tests, axe-core checks, screenshot review |
| Presentation, 10 | Clear problem, complete student and creator stories, editable source, honest technical explanation | Demonstration above and README editing map |
| Technology, 20 | React/Vite, Node 24, SQLite, salted scrypt, expiring HttpOnly sessions, same-origin writes, Docker deployment | Backend tests and production container replacement/volume test |
| Creativity, 10 | Original subject art, adjustable pattern activity, live homepage lesson, creator lessons connected to actual student learning | Interactive preview and creator-to-student demonstration |

## Validation and boundaries

Run the README commands before presenting and report actual results. Browser suites save current screenshots; axe-core writes `test-results/accessibility.json`. Container tests replace the container and verify volume-backed account/session/course persistence.

The upload format is JSON text lessons and quizzes; video uploads are not implemented. Publishing is currently free, so there is no checkout. Accounts lack email verification and forgotten-password recovery. Unpublishing retains course data and completion records. SQLite uses one replica; a larger launch needs moderation, edge rate limiting, backups, and possibly a managed database. Automated accessibility checks supplement manual assessment.

## Manual-edit practice

Change a headline in `src/Landing.jsx`, the accent in `src/editorial.css`, a lesson in `src/catalog.js`, or a validation rule in `shared/course.js`. Run affected checks and rebuild. Disclose AI assistance according to the final competition rules and explain your own choices and modifications. Demonstrate only behavior you can reproduce.
