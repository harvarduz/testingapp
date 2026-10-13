import test from 'node:test';
import assert from 'node:assert/strict';
import { courses } from '../src/data.js';
import { emptyProgress, completeLesson, completeChallenge, localDate, readProgress, streakCount, courseCompleted, toggleSavedCourse, writeLessonNote, mergeProgress } from '../src/progress.js';

test('reviewing the same lesson cannot inflate activity or earn a second completion', () => {
  const first = completeLesson(emptyProgress(), 'numbers', 0, '2026-10-10');
  const sameDay = completeLesson(first, 'numbers', 0, '2026-10-10');
  const nextDay = completeLesson(first, 'numbers', 0, '2026-10-11');
  assert.equal(sameDay, first);
  assert.equal(nextDay, first);
  assert.equal(first.activity['2026-10-10'], 1);
  assert.deepEqual(first.enrolled, ['numbers']);
});

test('completing a whole course updates its real lesson count without losing another course', () => {
  let progress = completeLesson(emptyProgress(), 'computing', 0, '2026-10-10');
  for (let i = 0; i < courses[0].lessons.length; i++) progress = completeLesson(progress, 'numbers', i, '2026-10-10');
  assert.equal(courseCompleted(progress, courses[0]), 7);
  assert.equal(courseCompleted(progress, courses[1]), 1);
  assert.equal(progress.activity['2026-10-10'], 8);
  assert.deepEqual(progress.enrolled, ['computing', 'numbers']);
});

test('daily challenges can be credited once per day, and do not count as course lessons', () => {
  const first = completeChallenge(emptyProgress(), '2026-10-10');
  assert.equal(completeChallenge(first, '2026-10-10'), first);
  const tomorrow = completeChallenge(first, '2026-10-11');
  assert.deepEqual(tomorrow.dailyChallenges, ['2026-10-10', '2026-10-11']);
  assert.equal(tomorrow.activity['2026-10-11'], 1);
  assert.equal(courseCompleted(tomorrow, courses[0]), 0);
});

test('streak survives an unfinished today and counts across a year boundary', () => {
  const activity = { '2025-12-30': 1, '2025-12-31': 2, '2026-01-01': 1 };
  assert.equal(streakCount(activity, new Date(2026, 0, 2, 10)), 3);
  assert.equal(streakCount(activity, new Date(2026, 0, 3, 10)), 0);
  assert.equal(streakCount({ ...activity, '2026-01-02': 1 }, new Date(2026, 0, 2, 10)), 4);
});

test('corrupt storage safely starts fresh and invalid saved progress is normalized', () => {
  assert.deepEqual(readProgress({ getItem: () => '{not-json' }), emptyProgress());
  assert.deepEqual(readProgress({ getItem: () => null }), emptyProgress());
  const restored = readProgress({ getItem: () => JSON.stringify({ name: '', goal: 0, completed: { numbers: [0, 0, -1, '2', null], computing: 'wrong' }, activity: { '2026-10-10': 2, bad: 5, '2026-10-11': '3' }, enrolled: ['numbers', 5] }) });
  assert.equal(restored.goal, 2);
  assert.equal(restored.name, 'Learner');
  assert.deepEqual(restored.completed, { numbers: [0], computing: [] });
  assert.deepEqual(restored.activity, { '2026-10-10': 2 });
  assert.deepEqual(restored.enrolled, ['numbers']);
});

test('saved progress survives serialization and dates use the student’s local calendar', () => {
  const progress = completeLesson(emptyProgress(), 'numbers', 1, '2026-10-10');
  assert.deepEqual(readProgress({ getItem: () => JSON.stringify(progress) }), progress);
  assert.equal(localDate(new Date(2026, 9, 10, 23, 59)), '2026-10-10');
});

test('every course has real lessons and each quiz has one valid answer and an explanation', () => {
  const ids = new Set();
  for (const course of courses) {
    assert.ok(!ids.has(course.id), 'Course ids must be unique');
    ids.add(course.id);
    assert.ok(course.lessons.length > 0);
    for (const lesson of course.lessons) {
      assert.ok(lesson.idea.length > 40 && lesson.example.length > 40);
      assert.ok(Number.isInteger(lesson.answer) && lesson.answer >= 0 && lesson.answer < lesson.options.length);
      assert.equal(new Set(lesson.options).size, lesson.options.length);
      assert.ok(lesson.explanation.length > 20);
    }
  }
});

test('saving a course does not enroll it and an unsave survives a stale-device merge', () => {
  const saved = toggleSavedCourse(emptyProgress(), 'numbers', 100);
  assert.equal(saved.savedCourses.numbers.saved, true);
  assert.deepEqual(saved.enrolled, []);
  const removed = toggleSavedCourse(saved, 'numbers', 200);
  assert.equal(mergeProgress(removed, saved).savedCourses.numbers.saved, false);
  assert.equal(mergeProgress(saved, removed).savedCourses.numbers.saved, false);
  assert.deepEqual(readProgress({ getItem: () => JSON.stringify(removed) }), removed);
});

test('notes merge by last edit, retain independent lessons, and do not resurrect deleted text', () => {
  const original = writeLessonNote(emptyProgress(), 'numbers', 0, 'Add the same amount each time.', 100);
  const revised = writeLessonNote(original, 'numbers', 0, 'A difference of three.', 200);
  const otherDevice = writeLessonNote(original, 'computing', 1, 'A loop repeats an instruction.', 150);
  const merged = mergeProgress(revised, otherDevice);
  assert.equal(merged.notes['numbers:0'].text, 'A difference of three.');
  assert.equal(merged.notes['computing:1'].text, 'A loop repeats an instruction.');
  const deleted = writeLessonNote(merged, 'numbers', 0, '', 300);
  assert.equal(mergeProgress(deleted, original).notes['numbers:0'].text, '');
  assert.deepEqual(merged.completed, {});
  assert.deepEqual(merged.activity, {});
});

test('legacy progress and malformed notes remain safe and note content is bounded', () => {
  const restored = readProgress({ getItem: () => JSON.stringify({ enrolled: ['numbers'], notes: { 'numbers:0': { text: 'x'.repeat(2500), updatedAt: 1 }, 'numbers:99': { text: 'bad', updatedAt: 1 }, 'numbers:1': { text: false, updatedAt: 1 } }, savedCourses: { numbers: { saved: true, updatedAt: 1 }, bad: { saved: 'yes', updatedAt: -1 } } }) });
  assert.equal(restored.notes['numbers:0'].text.length, 2000);
  assert.equal(Object.keys(restored.notes).length, 1);
  assert.equal(Object.keys(restored.savedCourses).length, 1);
  assert.deepEqual(restored.enrolled, ['numbers']);
  const old = readProgress({ getItem: () => JSON.stringify({ completed: { numbers: [0] } }) });
  assert.deepEqual(old.notes, {});
  assert.deepEqual(old.savedCourses, {});
  assert.deepEqual(old.completed.numbers, [0]);
});
