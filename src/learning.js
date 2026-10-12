import { courseCompleted, localDate } from './progress.js';

export const studyPaths = [
  { id: 'math-foundations', title: 'Mathematics foundations', description: 'Work with fractions and percentages, then apply shapes, data, and problem-solving strategies.', outcome: 'Estimate a cost, compare quantities, and explain your reasoning.', courseIds: ['numbers', 'geometry', 'data', 'logic'], color: 'lavender' },
  { id: 'programming-foundations', title: 'Think like a programmer', description: 'Trace algorithms, check decisions, and learn how to test a solution.', outcome: 'Follow a program step by step and check whether its result makes sense.', courseIds: ['computing', 'logic', 'engineering'], color: 'blue' },
  { id: 'science-foundations', title: 'Understand the natural world', description: 'Start with everyday forces, then connect matter, living things, Earth, and space.', outcome: 'Use scientific ideas to explain observations around you.', courseIds: ['physics', 'chemistry', 'biology', 'earth', 'astronomy'], color: 'sage' },
  { id: 'communication', title: 'Read, write, and evaluate evidence', description: 'Write clearer sentences, weigh historical sources, and interpret information about places.', outcome: 'Make a clear claim and choose evidence that supports it.', courseIds: ['english', 'history', 'geography'], color: 'peach' },
  { id: 'money-decisions', title: 'Make better money decisions', description: 'Build a budget, understand trade-offs, and test whether a business idea meets a need.', outcome: 'Compare costs and choices before making a financial decision.', courseIds: ['finance', 'economics', 'business'], color: 'yellow' },
  { id: 'creative-problem-solving', title: 'Design and build useful things', description: 'Explore design, creative choices, and the process of testing and improving an idea.', outcome: 'Describe who a design serves and how you would test it.', courseIds: ['design', 'arts', 'engineering'], color: 'pink' },
  { id: 'healthy-world', title: 'Health and the environment', description: 'Connect everyday health choices with living systems and a changing planet.', outcome: 'Explain a health or environmental claim using relevant evidence.', courseIds: ['health', 'biology', 'earth'], color: 'sage' },
];

export function pathProgress(path, courses, progress) {
  const ordered = path.courseIds.map(id => courses.find(course => course.id === id)).filter(Boolean);
  const total = ordered.reduce((count, course) => count + course.lessons.length, 0);
  const completed = ordered.reduce((count, course) => count + courseCompleted(progress, course), 0);
  const nextCourse = ordered.find(course => courseCompleted(progress, course) < course.lessons.length);
  const nextIndex = nextCourse?.lessons.findIndex((_, index) => !progress.completed[nextCourse.id]?.includes(index));
  return { courses: ordered, total, completed, percent: total ? Math.round(completed / total * 100) : 0, nextCourse, nextIndex };
}

export function practiceQuestions(courses, progress, courseId, lessonIndex) {
  const questions = courses.flatMap(course => course.lessons.flatMap((lesson, index) => {
    if (courseId ? course.id !== courseId || (lessonIndex !== undefined && index !== lessonIndex) : !progress.completed[course.id]?.includes(index)) return [];
    const items = lesson.practice?.length ? lesson.practice : [lesson];
    return items.map((question, questionIndex) => ({ ...question, course, lesson, lessonIndex: index, questionIndex: lesson.practice?.length ? questionIndex : -1, key: `${course.id}:${index}:${lesson.practice?.length ? questionIndex : -1}` }));
  }));
  const attempts = Object.values(progress.practiceAttempts || {});
  return questions.map(question => {
    const history = attempts.filter(attempt => `${attempt.courseId}:${attempt.lessonIndex}:${attempt.questionIndex}` === question.key).sort((a, b) => b.answeredAt - a.answeredAt);
    return { ...question, lastAttempt: history[0] };
  }).sort((a, b) => {
    const priority = item => item.lastAttempt ? item.lastAttempt.correct ? 2 : 0 : 1;
    return priority(a) - priority(b) || (a.lastAttempt?.answeredAt || 0) - (b.lastAttempt?.answeredAt || 0) || a.key.localeCompare(b.key);
  });
}

export function learningRewards(progress) {
  const lessons = Object.values(progress.completed).reduce((total, indexes) => total + indexes.length, 0);
  const coins = lessons * 25 + progress.dailyChallenges.length * 15 + (progress.practiceDays || []).length * 20;
  return { coins };
}

export function dailyQuests(progress, date = localDate()) {
  const lessons = Object.values(progress.completionDates).filter(value => value === date).length;
  const answers = Object.values(progress.practiceAttempts || {}).filter(attempt => localDate(new Date(attempt.answeredAt)) === date).length;
  return [
    { title: 'Finish one lesson', count: Math.min(lessons, 1), target: 1 },
    { title: 'Try three practice questions', count: Math.min(answers, 3), target: 3 },
    { title: 'Solve the daily challenge', count: progress.dailyChallenges.includes(date) ? 1 : 0, target: 1 },
  ];
}
