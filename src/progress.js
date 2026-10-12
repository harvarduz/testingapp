export const STORAGE_KEY = 'curio.student.v1';
export const emptyProgress = () => ({ name: 'Learner', completed: {}, completionDates: {}, enrolled: [], activity: {}, dailyChallenges: [], goal: 2, savedCourses: {}, notes: {}, activePath: null, practiceAttempts: {}, practiceDays: [], completedLabs: {} });

const recordKey = /^[a-z0-9-]{1,100}$/;
const noteKey = /^[a-z0-9-]{1,100}:\d{1,2}$/;
function readRecords(value, notes = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, record]) =>
    (notes ? noteKey.test(key) && Number(key.split(':')[1]) < 50 : recordKey.test(key)) && record && typeof record === 'object' &&
    Number.isSafeInteger(record.updatedAt) && record.updatedAt >= 0 &&
    (notes ? typeof record.text === 'string' : typeof record.saved === 'boolean')
  ).sort((a, b) => b[1].updatedAt - a[1].updatedAt).slice(0, 500).map(([key, record]) => [key, {
    ...(notes ? { text: record.text.slice(0, 2000) } : { saved: record.saved }),
    updatedAt: Math.min(record.updatedAt, Date.now() + 300000),
  }]));
}

export function toggleSavedCourse(progress, id, now = Date.now()) {
  if (!recordKey.test(id)) return progress;
  const previous = progress.savedCourses?.[id];
  return { ...progress, savedCourses: { ...progress.savedCourses, [id]: { saved: !previous?.saved, updatedAt: Math.max(now, (previous?.updatedAt || 0) + 1) } } };
}

export function writeLessonNote(progress, id, index, text, now = Date.now()) {
  const key = `${id}:${index}`;
  if (!noteKey.test(key) || index < 0 || index >= 50 || typeof text !== 'string') return progress;
  const previous = progress.notes?.[key];
  if (previous?.text === text.slice(0, 2000)) return progress;
  return { ...progress, notes: { ...progress.notes, [key]: { text: text.slice(0, 2000), updatedAt: Math.max(now, (previous?.updatedAt || 0) + 1) } } };
}

function mergeRecords(previous = {}, incoming = {}) {
  const result = { ...previous };
  for (const [key, record] of Object.entries(incoming)) {
    if (!result[key] || record.updatedAt >= result[key].updatedAt) result[key] = record;
  }
  return result;
}

function readPractice(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, item]) => recordKey.test(id) && item && recordKey.test(item.courseId) && Number.isInteger(item.lessonIndex) && item.lessonIndex >= 0 && item.lessonIndex < 50 && Number.isInteger(item.questionIndex) && item.questionIndex >= -1 && item.questionIndex < 5 && typeof item.correct === 'boolean' && Number.isSafeInteger(item.answeredAt) && item.answeredAt >= 0).sort((a, b) => b[1].answeredAt - a[1].answeredAt || a[0].localeCompare(b[0])).slice(0, 500).map(([id, item]) => [id, { courseId: item.courseId, lessonIndex: item.lessonIndex, questionIndex: item.questionIndex, correct: item.correct, answeredAt: Math.min(item.answeredAt, Date.now() + 300000) }]));
}

export function recordPracticeAttempt(progress, question, correct, id = crypto.randomUUID(), now = Date.now()) {
  if (progress.practiceAttempts?.[id]) return progress;
  const attempt = { courseId: question.course.id, lessonIndex: question.lessonIndex, questionIndex: question.questionIndex, correct, answeredAt: now };
  return { ...progress, practiceAttempts: readPractice({ ...progress.practiceAttempts, [id]: attempt }) };
}

export function completePractice(progress, date = localDate()) {
  return progress.practiceDays?.includes(date) ? progress : { ...progress, practiceDays: [...(progress.practiceDays || []), date] };
}

export function completeLab(progress, id, date = localDate()) {
  if (!['fractions', 'budget', 'algorithms'].includes(id) || progress.completedLabs?.[id]) return progress;
  return { ...progress, completedLabs: { ...progress.completedLabs, [id]: date }, activity: { ...progress.activity, [date]: (progress.activity[date] || 0) + 1 } };
}

export function chooseStudyPath(progress, id, now = Date.now()) {
  return { ...progress, activePath: { id, updatedAt: Math.max(now, (progress.activePath?.updatedAt || 0) + 1) } };
}

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function readProgress(storage) {
  try {
    const saved = JSON.parse(storage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return emptyProgress();
    return {
      ...emptyProgress(),
      name: typeof saved.name === 'string' && saved.name.trim() ? saved.name.slice(0, 32) : 'Learner',
      goal: [1, 2, 3].includes(saved.goal) ? saved.goal : 2,
      completed: saved.completed && typeof saved.completed === 'object' && !Array.isArray(saved.completed) ? Object.fromEntries(Object.entries(saved.completed).map(([id, values]) => [id, Array.isArray(values) ? [...new Set(values.filter(n => Number.isInteger(n) && n >= 0))] : []])) : {},
      completionDates: saved.completionDates && typeof saved.completionDates === 'object' && !Array.isArray(saved.completionDates) ? Object.fromEntries(Object.entries(saved.completionDates).filter(([key, date]) => /^[a-z0-9-]+:\d+$/.test(key) && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))) : {},
      enrolled: Array.isArray(saved.enrolled) ? saved.enrolled.filter(v => typeof v === 'string') : [],
      activity: saved.activity && typeof saved.activity === 'object' ? Object.fromEntries(Object.entries(saved.activity).filter(([date, count]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isInteger(count) && count >= 0)) : {},
      dailyChallenges: Array.isArray(saved.dailyChallenges) ? [...new Set(saved.dailyChallenges.filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)))] : [],
      savedCourses: readRecords(saved.savedCourses),
      notes: readRecords(saved.notes, true),
      activePath: saved.activePath && recordKey.test(saved.activePath.id) && Number.isSafeInteger(saved.activePath.updatedAt) && saved.activePath.updatedAt >= 0 ? { id: saved.activePath.id, updatedAt: Math.min(saved.activePath.updatedAt, Date.now() + 300000) } : null,
      practiceAttempts: readPractice(saved.practiceAttempts),
      practiceDays: Array.isArray(saved.practiceDays) ? [...new Set(saved.practiceDays.filter(value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)))] : [],
      completedLabs: saved.completedLabs && typeof saved.completedLabs === 'object' ? Object.fromEntries(Object.entries(saved.completedLabs).filter(([id, date]) => ['fractions', 'budget', 'algorithms'].includes(id) && typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))) : {},
    };
  } catch { return emptyProgress(); }
}

export function completeLesson(progress, courseId, lessonIndex, date = localDate()) {
  const previous = progress.completed[courseId] || [];
  if (previous.includes(lessonIndex)) return progress;
  return {
    ...progress,
    enrolled: [...new Set([...progress.enrolled, courseId])],
    completed: { ...progress.completed, [courseId]: [...previous, lessonIndex] },
    completionDates: { ...progress.completionDates, [`${courseId}:${lessonIndex}`]: date },
    activity: { ...progress.activity, [date]: (progress.activity[date] || 0) + 1 },
  };
}

export function completeChallenge(progress, date = localDate()) {
  if (progress.dailyChallenges.includes(date)) return progress;
  return { ...progress, dailyChallenges: [...progress.dailyChallenges, date], activity: { ...progress.activity, [date]: (progress.activity[date] || 0) + 1 } };
}

export function streakCount(activity, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!activity[localDate(date)]) date.setDate(date.getDate() - 1);
  let count = 0;
  while (activity[localDate(date)] > 0) {
    count++;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

export function courseCompleted(progress, course) {
  return course.lessons.filter((_, i) => progress.completed[course.id]?.includes(i)).length;
}

export function mergeProgress(previous, incoming) {
  const completed = {};
  for (const id of new Set([...Object.keys(previous.completed), ...Object.keys(incoming.completed)])) {
    completed[id] = [...new Set([...(previous.completed[id] || []), ...(incoming.completed[id] || [])])];
  }
  const activity = { ...previous.activity };
  for (const [date, count] of Object.entries(incoming.activity)) activity[date] = Math.max(activity[date] || 0, count);
  const completionDates = { ...incoming.completionDates, ...previous.completionDates };
  const dailyChallenges = [...new Set([...previous.dailyChallenges, ...incoming.dailyChallenges])];
  const completedLabs = { ...incoming.completedLabs, ...previous.completedLabs };
  const recorded = {};
  for (const date of [...Object.values(completionDates), ...dailyChallenges, ...Object.values(completedLabs)]) recorded[date] = (recorded[date] || 0) + 1;
  for (const [date, count] of Object.entries(recorded)) activity[date] = Math.max(activity[date] || 0, count);
  return { ...incoming, completed, completionDates, activity,
    enrolled: [...new Set([...previous.enrolled, ...incoming.enrolled])],
    dailyChallenges,
    savedCourses: mergeRecords(previous.savedCourses, incoming.savedCourses),
    notes: mergeRecords(previous.notes, incoming.notes),
    activePath: previous.activePath && (!incoming.activePath || previous.activePath.updatedAt > incoming.activePath.updatedAt) ? previous.activePath : incoming.activePath || null,
    practiceAttempts: readPractice({ ...incoming.practiceAttempts, ...previous.practiceAttempts }),
    practiceDays: [...new Set([...(previous.practiceDays || []), ...(incoming.practiceDays || [])])],
    completedLabs,
  };
}
