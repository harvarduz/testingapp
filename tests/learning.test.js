import test from 'node:test';
import assert from 'node:assert/strict';
import { courses, categories } from '../src/data.js';
import { normalizeCourse, publicationIssues } from '../shared/course.js';
import { emptyProgress, completeLesson, completeChallenge, completePractice, recordPracticeAttempt, chooseStudyPath, mergeProgress, readProgress } from '../src/progress.js';
import { studyPaths, pathProgress, practiceQuestions, learningRewards, dailyQuests } from '../src/learning.js';

const restored = value => readProgress({ getItem: () => JSON.stringify(value) });

test('each course appends a deeper application without shifting earlier completion records', () => {
  const priorLastTitles = ['Scale a recipe fairly', 'Search without skipping a case', 'Necessary is not sufficient', 'Balance forces, not appearances', 'Compare rates fairly', 'Use a scale drawing', 'Plan a fair plant test', 'Separate using a property', 'Sort objects by their role', 'Reason about runoff risk', 'Build a focused paragraph', 'Build a cautious causal argument', 'Compare population density', 'Define a useful customer experiment', 'Read a price signal carefully', 'Make a form error recoverable', 'Read a measurement tolerance', 'Ask what a study can support', 'Turn feedback into a revision', 'Compare purchasing power'];
  for (const [position, course] of courses.entries()) {
    const priorCount = course.id === 'numbers' ? 6 : 5;
    assert.equal(course.lessons[priorCount - 1].title, priorLastTitles[position]);
    const lesson = course.lessons[priorCount];
    assert.equal(lesson.practice.length, 3, course.id);
    assert.equal(lesson.steps.length, 4, course.id);
    assert.equal(new Set([lesson.question, ...lesson.practice.map(item => item.question)]).size, 4);
    let progress = emptyProgress();
    for (let index = 0; index < priorCount; index++) progress = completeLesson(progress, course.id, index);
    const before = learningRewards(progress).coins;
    assert.deepEqual(progress.completed[course.id], Array.from({ length: priorCount }, (_, i) => i));
    progress = completeLesson(progress, course.id, priorCount);
    assert.equal(learningRewards(progress).coins, before + 25);
    assert.equal(learningRewards(completeLesson(progress, course.id, priorCount)).coins, before + 25);
  }
});

test('every subject course includes worked application lessons and explained transfer practice', () => {
  assert.equal(courses.length, 20);
  assert.equal(courses.reduce((n, course) => n + course.lessons.length, 0), 121);
  for (const course of courses) {
    assert.ok(course.lessons.length >= 6, course.id);
    assert.deepEqual(publicationIssues(normalizeCourse(course, categories.slice(1))), [], course.id);
    for (const lesson of course.lessons) {
      assert.ok(lesson.objectives.length >= 2, lesson.title);
      assert.ok(lesson.steps.length >= 3, lesson.title);
      assert.ok(lesson.commonMistake.length >= 30, lesson.title);
      assert.ok(lesson.practice.length >= 2, lesson.title);
    }
  }
});

test('the curriculum extension retains earlier completions and continues at the first appended lesson', () => {
  let progress = emptyProgress();
  for (let index = 0; index < 4; index++) progress = completeLesson(progress, 'numbers', index, '2026-10-10');
  const before = learningRewards(progress).coins;
  const path = studyPaths.find(item => item.courseIds[0] === 'numbers');
  const status = pathProgress(path, courses, progress);
  assert.equal(status.nextCourse.id, 'numbers');
  assert.equal(status.nextIndex, 4);
  assert.equal(status.nextCourse.lessons[4].title, 'Compare a unit price');
  assert.equal(courses[0].lessons[0].title, 'Find the pattern');
  assert.equal(courses[0].lessons[3].title, 'The power of estimation');
  assert.equal(before, 100);
  assert.equal(learningRewards(completeLesson(progress, 'numbers', 3)).coins, before);
  assert.equal(learningRewards(completeLesson(progress, 'numbers', 4)).coins, before + 25);
});

test('study paths cover the catalog and choose the first genuinely unfinished lesson', () => {
  assert.equal(new Set(studyPaths.flatMap(path => path.courseIds)).size, courses.length);
  for (const path of studyPaths) assert.ok(path.courseIds.every(id => courses.some(course => course.id === id)));
  let progress = completeLesson(emptyProgress(), 'numbers', 0);
  progress = chooseStudyPath(progress, studyPaths[0].id, 100);
  assert.equal(pathProgress(studyPaths[0], courses, progress).nextIndex, 1);
  const later = chooseStudyPath(progress, studyPaths[1].id, 200);
  assert.equal(mergeProgress(later, progress).activePath.id, studyPaths[1].id);
  assert.deepEqual(mergeProgress(later, progress).completed.numbers, [0]);
});

test('a missed transfer question comes before new and previously correct questions', () => {
  let progress = completeLesson(emptyProgress(), 'numbers', 0);
  const available = practiceQuestions(courses, progress);
  assert.equal(available.length, 3);
  assert.ok(available.every(question => question.question !== courses[0].lessons[0].question));
  progress = recordPracticeAttempt(progress, available[1], false, 'missed-answer', 100);
  progress = recordPracticeAttempt(progress, available[0], true, 'correct-answer', 200);
  const next = practiceQuestions(courses, progress);
  assert.equal(next[0].key, available[1].key);
  assert.equal(next[1].key, available[2].key);
  assert.equal(next[2].key, available[0].key);
  assert.deepEqual(progress.completed.numbers, [0]);
});

test('Curio coins cannot be multiplied by repeated lessons, duplicate answers, or same-day sessions', () => {
  let progress = completeLesson(emptyProgress(), 'numbers', 0, '2026-10-10');
  const question = practiceQuestions(courses, progress)[0];
  progress = recordPracticeAttempt(progress, question, true, 'one-answer', new Date(2026, 9, 10, 12).getTime());
  assert.equal(recordPracticeAttempt(progress, question, true, 'one-answer'), progress);
  progress = completePractice(completeChallenge(progress, '2026-10-10'), '2026-10-10');
  const repeated = completePractice(completeLesson(progress, 'numbers', 0, '2026-10-10'), '2026-10-10');
  assert.equal(learningRewards(repeated).coins, 60);
  assert.equal(learningRewards(mergeProgress(progress, repeated)).coins, 60);
  assert.deepEqual(dailyQuests(progress, '2026-10-10').map(quest => quest.count), [1, 1, 1]);
});

test('practice records from independent devices merge once, stay private, and normalize old data', () => {
  const base = completeLesson(emptyProgress(), 'numbers', 0);
  const question = practiceQuestions(courses, base)[0];
  const first = recordPracticeAttempt(base, question, false, 'device-a', 100);
  const second = recordPracticeAttempt(base, question, true, 'device-b', 200);
  const merged = mergeProgress(first, second);
  assert.equal(Object.keys(merged.practiceAttempts).length, 2);
  assert.deepEqual(restored(merged), merged);
  assert.deepEqual(restored({ completed: { numbers: [0] } }).practiceAttempts, {});
  const invalid = restored({ practiceAttempts: { bad: { courseId: 'numbers', lessonIndex: 99, questionIndex: 0, correct: true, answeredAt: 100 } } });
  assert.deepEqual(invalid.practiceAttempts, {});
});

test('worked lessons and transfer questions survive uploads; incomplete or malformed additions are rejected', () => {
  const normalized = normalizeCourse(courses[0], categories.slice(1));
  assert.deepEqual(normalized.lessons[0].practice, courses[0].lessons[0].practice);
  assert.deepEqual(normalized.lessons[0].steps, courses[0].lessons[0].steps);
  assert.deepEqual(publicationIssues(normalized), []);
  const malformed = structuredClone(courses[0]);
  malformed.lessons[0].practice[0].answer = 4;
  assert.throws(() => normalizeCourse(malformed, categories.slice(1)), /correct answer/);
  const unfinished = structuredClone(normalized);
  unfinished.lessons[0].practice[0].explanation = '';
  assert.ok(publicationIssues(unfinished).some(issue => issue.includes('practice question 1')));
  let addedQuestions = 0;
  for (const course of courses) for (const lesson of course.lessons) for (const question of lesson.practice || []) {
    addedQuestions++;
    assert.equal(new Set(question.options).size, 4);
    assert.ok(question.options[question.answer]);
    assert.ok(question.explanation.length >= 20);
  }
  assert.equal(addedQuestions, 278);
});
