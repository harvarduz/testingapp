import test from 'node:test';
import assert from 'node:assert/strict';
import katex from 'katex';
import { courses } from '../src/data.js';
import { getLessonStudy, lessonStudies, experimentDefinitions, reasoningCases } from '../src/lessonStudies.js';
import { calculateExperiment, initialExperimentValues, parseObservations, parseCheckpointAnswer } from '../src/experimentModels.js';

const model = (kind, overrides = {}, list, step) => calculateExperiment(kind, { ...initialExperimentValues(kind), ...overrides }, list, step);

test('curated supplements reach real lessons in every course and never leak to creator previews', () => {
  assert.equal(lessonStudies.length, 34);
  assert.equal(new Set(lessonStudies.map(item => `${item.courseId}:${item.lessonTitle}`)).size, lessonStudies.length);
  for (const study of lessonStudies) {
    const course = courses.find(item => item.id === study.courseId);
    const index = course.lessons.findIndex(item => item.title === study.lessonTitle);
    assert.ok(index >= 0, study.lessonTitle);
    assert.equal(getLessonStudy(course, index), study);
    if (study.experiment) assert.ok(experimentDefinitions[study.experiment]);
  }
  for (const course of courses) {
    const study = getLessonStudy(course, course.lessons.length - 1);
    assert.ok(study.sections.length >= 2, course.id);
    assert.ok(study.sections.every(section => section.text.length > 200), course.id);
    assert.ok(study.url.startsWith('https://'));
    assert.equal(getLessonStudy({ ...course, author: 'Creator' }, 0), null);
    assert.equal(getLessonStudy({ ...course, preview: true }, course.lessons.length - 1), null);
    if (!study.experiment) {
      const task = reasoningCases[course.id];
      assert.equal(task.feedback.length, task.options.length);
      assert.ok(task.answer >= 0 && task.answer < task.options.length);
    }
  }
});

test('every authored formula renders as untrusted KaTeX with accessible MathML', () => {
  for (const definition of Object.values(experimentDefinitions)) {
    const html = katex.renderToString(definition.formula, { throwOnError: true, trust: false, strict: 'error' });
    assert.ok(html.includes('<math'));
    assert.ok(definition.formulaText.length > 30);
  }
});

test('sequential percentages use the updated base, including a complete discount', () => {
  assert.ok(Math.abs(model('percentage', { initial: 200, rise: 10, discount: 10 }).rows.at(-1)[1] - 198) < 1e-10);
  assert.equal(model('percentage', { discount: 100 }).rows.at(-1)[1], 0);
  assert.equal(model('percentage', { initial: 100, rise: 0, discount: 0 }).rows.at(-1)[1], 100);
});

test('loop traces stop at the selected input and preserve negative and empty-list states', () => {
  const trace = model('accumulator', {}, [5, -2, 4], 2);
  assert.deepEqual(trace.rows, [[0, '—', 0], [1, 5, 5], [2, -2, 3]]);
  assert.equal(trace.chart.series[0].points.at(-1).y, 3);
  assert.deepEqual(trace.chart.yDomain, model('accumulator', {}, [5, -2, 4], 0).chart.yDomain);
  assert.deepEqual(model('accumulator', {}, [], 100).rows, [[0, '—', 0]]);
});

test('mean and median distinguish outlier effects and do not fabricate an empty-set summary', () => {
  const values = [2, 3, 4, 5, 100];
  const result = model('statistics', {}, values);
  assert.equal(result.metrics[0].value, '22.8');
  assert.equal(result.metrics[1].value, '4');
  assert.equal(model('statistics', {}, [4, 2]).metrics[1].value, '3');
  assert.equal(model('statistics', {}, []).metrics[0].value, 'No observations');
  assert.deepEqual(result.chart.yDomain, [-100, 100]);
  assert.deepEqual(values, [2, 3, 4, 5, 100]);
});

test('physical models preserve units, inverse scaling, and conserved solute mass', () => {
  assert.equal(model('motion', { velocity: 0, acceleration: 2, time: 3 }).rows.at(-1)[1], 9);
  const pressure = model('pressure', { force: 90, area: 0.03 });
  assert.equal(pressure.chart.marker.y, 3000);
  assert.equal(model('pressure', { force: 90, area: 0.06 }).chart.marker.y, 1500);
  assert.equal(model('volume', { length: 4, width: 6, height: 8 }).metrics[1].value, '192');
  assert.equal(model('concentration', { solute: 20, solvent: 180 }).chart.marker.y, 10);
  assert.ok(Math.abs(model('light', { distance: 1 }).chart.marker.y - 8.316746397269274) < 1e-10);
});

test('financial models expose no finite break-even and distinguish simple from compound growth', () => {
  const result = model('breakEven', { fixed: 45, price: 8, variable: 5 });
  assert.ok(result.rows.some(row => row[0] === 15 && row[3] === 0));
  assert.equal(model('breakEven', { price: 3, variable: 3 }).metrics[1].value, 'No finite quantity');
  assert.equal(model('breakEven', { price: 2, variable: 3 }).metrics[1].value, 'No finite quantity');
  assert.equal(model('breakEven', { fixed: 40, price: 8, variable: 5 }).metrics[1].value, '14');
  const growth = model('growth', { principal: 100, rate: 10, years: 2 });
  assert.ok(Math.abs(growth.rows.at(-1)[1] - 121) < 1e-10);
  assert.equal(growth.rows.at(-1)[2], 120);
  assert.deepEqual(model('growth', { rate: 0 }).chart.series[0].points, model('growth', { rate: 0 }).chart.series[1].points);
});

test('relative risk is undefined at zero baseline and negative reductions remain explicit', () => {
  assert.equal(model('risk', { baseline: 80, comparison: 60 }).metrics[0].value, '2');
  assert.equal(model('risk', { baseline: 80, comparison: 60 }).metrics[1].value, '25');
  assert.equal(model('risk', { baseline: 0, comparison: 10 }).metrics[1].value, 'Undefined (zero baseline)');
  assert.equal(model('risk', { baseline: 10, comparison: 20 }).metrics[1].value, '-100');
});

test('learner inputs reject expressions and malformed lists while accepting signed decimal numbers', () => {
  assert.deepEqual(parseObservations(''), { values: [], error: null });
  assert.deepEqual(parseObservations('2, -3.5, 0').values, [2, -3.5, 0]);
  for (const bad of ['2,,3', '1e2', 'Infinity', '101', '1+2', '<script>', Array(13).fill('1').join(',')]) assert.ok(parseObservations(bad).error, bad);
  for (const bad of ['', '0x10', 'Infinity', '1+2', '<img>', '1,2,3']) assert.equal(parseCheckpointAnswer(bad), null, bad);
  assert.equal(parseCheckpointAnswer('18,8'), 18.8);
  assert.equal(parseCheckpointAnswer(' -3.5 '), -3.5);
});

test('reaction accounting conserves each element and treats scaled coefficients as balanced', () => {
  assert.equal(model('reaction').metrics[0].value, 'Keep adjusting');
  assert.deepEqual(model('reaction', { hydrogen: 2, oxygen: 1, water: 2 }).rows, [['Hydrogen', 4, 4], ['Oxygen', 2, 2]]);
  assert.equal(model('reaction', { hydrogen: 4, oxygen: 2, water: 4 }).metrics[0].value, 'Balanced');
  assert.equal(model('reaction', { hydrogen: 2, oxygen: 2, water: 2 }).metrics[0].value, 'Keep adjusting');
});

test('payment timing exposes a cash gap while equivalent offers can cross at a later term', () => {
  const early = model('cashflow', { paymentMonth: 1 });
  const late = model('cashflow', { paymentMonth: 3 });
  assert.equal(early.metrics[0].value, late.metrics[0].value);
  assert.equal(early.metrics[2].value, '0');
  assert.equal(late.metrics[2].value, '20');
  assert.equal(late.rows[3][3], -20);
  assert.equal(model('offers', { months: 12 }).metrics[2].value, 'A by $14');
  assert.equal(model('offers', { months: 24 }).metrics[2].value, 'B by $22');
  assert.equal(model('offers', { aMonthly: 17, aFee: 50 }).metrics[2].value, 'Equal totals');
});
