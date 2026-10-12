import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetResult, parseNumberList, simplifyFraction, traceAlgorithm } from '../src/labs.js';
import { completeLab, emptyProgress, mergeProgress, readProgress } from '../src/progress.js';
import { learningRewards } from '../src/learning.js';

test('fraction models preserve the amount and correctly simplify empty and equivalent selections', () => {
  assert.deepEqual(simplifyFraction(6, 8), { numerator: 3, denominator: 4 });
  assert.deepEqual(simplifyFraction(9, 12), { numerator: 3, denominator: 4 });
  assert.deepEqual(simplifyFraction(0, 8), { numerator: 0, denominator: 1 });
});

test('a budget must protect essential needs as well as the savings target', () => {
  assert.equal(budgetResult({ food: 120, transport: 45, study: 60, leisure: 75 }).complete, false);
  assert.equal(budgetResult({ food: 120, transport: 45, study: 60, leisure: 15 }).complete, true);
  assert.equal(budgetResult({ food: 0, transport: 0, study: 0, leisure: 0 }).complete, false);
  assert.equal(budgetResult({ food: 300, transport: 300, study: 300, leisure: 300 }).remaining, -900);
});

test('algorithm inputs are bounded and traces keep the previous result instead of resetting it', () => {
  assert.deepEqual(parseNumberList('2, 4, 6'), [2, 4, 6]);
  for (const value of ['', '2,,6', '2,-4,6', '2,101', '1,2,3,4,5,6,7,8,9', '2,hello,6']) assert.throws(() => parseNumberList(value));
  assert.deepEqual(traceAlgorithm([2, 4, 6], 'sum').map(row => row.result), [2, 6, 12]);
  assert.deepEqual(traceAlgorithm([7, 2, 9, 4], 'max').map(row => row.result), [7, 7, 9, 9]);
});

test('lab completion earns coins once and independently completed labs merge without losing daily activity', () => {
  const first = completeLab(emptyProgress(), 'fractions', '2026-10-12');
  assert.equal(completeLab(first, 'fractions', '2026-10-13'), first);
  assert.equal(learningRewards(first).coins, 30);
  const second = completeLab(emptyProgress(), 'budget', '2026-10-12');
  const merged = mergeProgress(first, second);
  assert.equal(learningRewards(merged).coins, 60);
  assert.equal(merged.activity['2026-10-12'], 2);
  assert.deepEqual(readProgress({ getItem: () => JSON.stringify(merged) }), merged);
  assert.equal(completeLab(first, 'unknown-lab'), first);
});
