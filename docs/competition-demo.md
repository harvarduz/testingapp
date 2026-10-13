# Curio: Ustoz preparation and evidence

Context: https://azizbeksafarov.github.io/ustoz/, reviewed 10 October 2026. The six areas are functionality 30, relevance/content 20, UX/UI 10, presentation 10, technology 20, and creativity 10. The detailed 21 subcriteria are a proposed workplan. The actual ticket and final regulations determine requirements; this project does not guarantee a score.

## Problem and result

Students need a clear starting point, ideas they can apply, and useful feedback. Curio offers 20 original courses across 18 subjects, 101 lessons, 218 additional transfer questions, seven study paths, an interactive pattern activity, quizzes with retries, saved learning progress, course bookmarks, and private lesson notes. Creators write or import courses, keep drafts private, and publish to a shared catalog. Publishing is free for a limited time, as requested.

## Demonstration

1. Show the public page on desktop and mobile. Try a wrong preview answer and recover. The preview awards no progress.
2. Open Thinking in numbers. Adjust the sequence, step through the worked example, answer an inline exercise incorrectly and retry with its explanation. Complete the separate lesson check, refresh My learning, and continue. Show one of the appended application lessons, such as unit prices.
3. Save a course for later, open My learning → Saved, write a private lesson note, and copy its course link. Reopen a completed lesson from Practice & review and show that totals do not increase.
4. Combine subject, level, and duration filters; search for an absent course, clear filters, and browse a non-STEM subject such as Languages or Design.
5. Register in the creator workspace, download/upload a template, edit, preview, save a private draft, then publish free.
6. Use a separate browser to find the published course and author. Finish a lesson, create a student account, and resume its progress on another device.
7. Collapse the desktop sidebar, follow a study path, inspect a worked example, and complete targeted practice. Show the mistake recommendations and Curio coin balance; repeat the session to demonstrate that coins are not duplicated.
8. Use Learning Lab to build an equivalent fraction, protect a savings goal, and lock an algorithm prediction before stepping through its trace. Show mistake feedback and one-time lab coins.
9. Show passing tests, explain Node/SQLite and the persistent deployment volume, and make a small source edit.
10. Open the account avatar on home and in the app; show the actual account name once and sign-in/register entry points.
11. Show the supplied Material reference beside Curio. Change a palette and display mode, refresh to demonstrate persistence, and open Appearance from the mobile menu.

## Criteria and evidence

| Area | Implementation | Acceptance evidence |
|---|---|---|
| Functionality, 30 | Interactive labs, study paths, worked lessons, targeted practice, Curio coins, combined filters, bookmarks, private notes, direct course links, lessons/review, actual progress, accounts, imports, drafts, publishing | Student, study-tools, and marketplace suites; API ownership/persistence tests |
| Content, 20 | 20 courses, 101 explanations/examples/quizzes and 218 extra practice questions, 18 subjects, accurate counts and author attribution | Content integrity test; published course in another browser |
| UX/UI, 10 | Material Expressive typography and tonal roles, four palettes, light/dark mode, consistent controls, keyboard focus, responsive creator/student pages, collapsible desktop navigation, mobile bottom navigation, and reduced-motion support | 320/390/768/1366 px tests, light/dark axe-core checks, palette persistence tests, screenshot review |
| Presentation, 10 | Clear problem, complete student and creator stories, editable source, honest technical explanation | Demonstration above and README editing map |
| Technology, 20 | React/Vite, Node 24, SQLite, salted scrypt, expiring HttpOnly sessions, same-origin writes, Docker deployment | Backend tests and production container replacement/volume test |
| Creativity, 10 | Original subject art, interactive fraction/budget/algorithm labs, live homepage lesson, creator lessons connected to actual student learning | Interactive preview and creator-to-student demonstration |

## Validation and boundaries

Run the README commands before presenting and report actual results. Browser suites save current screenshots; axe-core writes `test-results/accessibility.json`. Container tests replace the container and verify volume-backed account/session/course/note/bookmark persistence. See `docs/validation.md` for the current release checks and the limits of public verification.

The upload format is JSON text lessons and quizzes; video uploads are not implemented. Publishing is currently free, so there is no checkout. Accounts lack email verification and forgotten-password recovery. Unpublishing retains course data and completion records. SQLite uses one replica; a larger launch needs moderation, edge rate limiting, backups, and possibly a managed database. Automated accessibility checks supplement manual assessment.

## Manual-edit practice

Change a headline in `src/Landing.jsx`, a palette seed in `src/Appearance.jsx`, presentation in `src/material.css`, a lesson in `src/catalog.js`, or a validation rule in `shared/course.js`. Run affected checks and rebuild. Disclose AI assistance according to the final competition rules and explain your own choices and modifications. Demonstrate only behavior you can reproduce.
