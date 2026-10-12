export const learningLabs = [
  { id: 'fractions', title: 'Fraction studio', description: 'Build equivalent fractions with a visual model.', courseId: 'numbers', lessonIndex: 1, colour: 'lavender' },
  { id: 'budget', title: 'Budget challenge', description: 'Make trade-offs and protect a savings goal.', courseId: 'finance', lessonIndex: 0, colour: 'yellow' },
  { id: 'algorithms', title: 'Algorithm tracer', description: 'Predict a result, then follow every update.', courseId: 'computing', lessonIndex: 2, colour: 'blue' },
];

export function simplifyFraction(numerator, denominator) {
  let a = numerator, b = denominator;
  while (b) [a, b] = [b, a % b];
  const divisor = a || denominator;
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

export function budgetResult(expenses) {
  const spent = Object.values(expenses).reduce((total, value) => total + value, 0);
  const remaining = 300 - spent;
  const issues = [];
  if (expenses.food < 60) issues.push('Keep at least $60 for food.');
  if (expenses.transport < 30) issues.push('Keep at least $30 for transport.');
  if (expenses.study < 30) issues.push('Keep at least $30 for study materials.');
  if (remaining < 60) issues.push(`Reduce spending by $${60 - remaining} to protect $60 in savings.`);
  return { spent, remaining, issues, complete: issues.length === 0 };
}

export function parseNumberList(text) {
  const parts = text.split(',').map(part => part.trim());
  if (parts.length < 2 || parts.length > 8 || parts.some(part => !/^\d{1,3}$/.test(part) || Number(part) > 100)) throw new Error('Enter 2–8 whole numbers from 0 to 100, separated by commas.');
  return parts.map(Number);
}

export function traceAlgorithm(values, operation) {
  let result = operation === 'sum' ? 0 : values[0];
  return values.map((value, index) => {
    const previous = result;
    result = operation === 'sum' ? result + value : Math.max(result, value);
    return { step: index + 1, value, previous, result };
  });
}
