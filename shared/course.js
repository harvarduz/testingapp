export const colors = ['lavender', 'blue', 'peach', 'sage', 'yellow', 'pink'];
export const artTypes = ['numbers', 'computing', 'logic', 'physics', 'data', 'geometry', 'biology', 'chemistry', 'astronomy', 'earth', 'language', 'history', 'business', 'design', 'engineering', 'health', 'arts'];
export const emptyLesson = () => ({ title: '', idea: '', example: '', question: '', options: ['', '', '', ''], answer: 0, explanation: '', objectives: [], steps: [], commonMistake: '', practice: [] });
export const emptyCourse = () => ({ title: '', category: 'Mathematics', description: '', level: 'Beginner', minutes: 10, color: 'lavender', art: 'numbers', lessons: [emptyLesson()] });

export function normalizeCourse(value, categories) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Upload a JSON object containing a course.');
  const text = (input, limit, label) => {
    if (input != null && typeof input !== 'string') throw new Error(`${label} must be text.`);
    if ((input || '').length > limit) throw new Error(`${label} must be ${limit} characters or fewer.`);
    return (input || '').trim();
  };
  const textList = (input, maximum, limit, label) => {
    if (input == null) return [];
    if (!Array.isArray(input) || input.length > maximum) throw new Error(`${label} needs at most ${maximum} items.`);
    return input.map(item => text(item, limit, label));
  };
  const quiz = (item, label) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${label} must be an object.`);
    if (!Array.isArray(item.options) || item.options.length !== 4) throw new Error(`${label} needs exactly four answer options.`);
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) throw new Error(`${label} needs a correct answer from 0 to 3.`);
    return { question: text(item.question, 500, 'Question'), options: item.options.map(option => text(option, 300, 'Answer option')), answer: item.answer, explanation: text(item.explanation, 3000, 'Answer explanation') };
  };
  if (!categories.includes(value.category)) throw new Error('Choose a supported subject.');
  if (!['Beginner', 'Intermediate', 'Advanced', 'All levels'].includes(value.level)) throw new Error('Choose a supported level.');
  if (!Number.isInteger(value.minutes) || value.minutes < 1 || value.minutes > 600) throw new Error('Estimated time must be a whole number from 1 to 600 minutes.');
  if (!Array.isArray(value.lessons) || value.lessons.length < 1 || value.lessons.length > 50) throw new Error('A course needs between 1 and 50 lessons.');
  return {
    title: text(value.title, 100, 'Course title'), category: value.category,
    description: text(value.description, 500, 'Description'), level: value.level, minutes: value.minutes,
    color: colors.includes(value.color) ? value.color : 'lavender',
    art: artTypes.includes(value.art) ? value.art : 'numbers', label: value.category.toUpperCase(),
    lessons: value.lessons.map((item, index) => {
      const primaryQuiz = quiz(item, `Lesson ${index + 1}`);
      if (item.practice != null && (!Array.isArray(item.practice) || item.practice.length > 5)) throw new Error(`Lesson ${index + 1} needs at most five practice questions.`);
      return {
        title: text(item.title, 100, 'Lesson title'), idea: text(item.idea, 5000, 'Explanation'),
        example: text(item.example, 5000, 'Example'), question: text(item.question, 500, 'Question'),
        ...primaryQuiz,
        objectives: textList(item.objectives, 5, 200, 'Learning goals'),
        steps: textList(item.steps, 8, 1500, 'Worked example steps'),
        commonMistake: text(item.commonMistake, 1500, 'Common mistake'),
        practice: (item.practice || []).map((question, number) => quiz(question, `Lesson ${index + 1} practice question ${number + 1}`)),
      };
    }),
  };
}

export function publicationIssues(course) {
  const issues = [];
  if (course.title.length < 5) issues.push('Give your course a title of at least 5 characters.');
  if (course.description.length < 20) issues.push('Add a course description of at least 20 characters.');
  course.lessons.forEach((lesson, i) => {
    const prefix = `Lesson ${i + 1}: `;
    if (!lesson.title) issues.push(prefix + 'add a title.');
    if (lesson.idea.length < 40) issues.push(prefix + 'explain the idea in at least 40 characters.');
    if (lesson.example.length < 40) issues.push(prefix + 'add a concrete example of at least 40 characters.');
    if (lesson.question.length < 10) issues.push(prefix + 'add a clear quiz question.');
    if (lesson.options.some(option => !option)) issues.push(prefix + 'fill all four answer options.');
    if (new Set(lesson.options).size !== 4) issues.push(prefix + 'answer options must be different.');
    if (lesson.explanation.length < 20) issues.push(prefix + 'explain the correct answer in at least 20 characters.');
    if (lesson.objectives?.some(goal => !goal)) issues.push(prefix + 'finish or remove blank learning goals.');
    if (lesson.steps?.some(step => !step)) issues.push(prefix + 'finish or remove blank worked example steps.');
    lesson.practice?.forEach((question, index) => {
      if (question.question.length < 10 || question.options.some(option => !option) || new Set(question.options).size !== 4 || question.explanation.length < 20) issues.push(prefix + `finish practice question ${index + 1}, with distinct answers and an explanation.`);
    });
  });
  return issues;
}
