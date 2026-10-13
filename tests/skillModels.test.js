import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePacks } from '../src/skillModels.js';

test('pack comparisons use a shared unit rather than the smallest pack price', () => {
  const result = comparePacks({ price: '6.00', quantity: '4' }, { price: '8.00', quantity: '6' });
  assert.equal(result.winner, 'b');
  assert.equal(result.packs[0].unitPrice, 1.5);
  assert.equal(comparePacks({ price: '6', quantity: '4' }, { price: '9', quantity: '6' }).winner, 'equal');
});

test('comparison distinguishes exact equality from amounts that only round to the same cent', () => {
  const result = comparePacks({ price: '4.00', quantity: '3' }, { price: '9.33', quantity: '7' });
  assert.equal(result.packs[0].unitPrice.toFixed(2), result.packs[1].unitPrice.toFixed(2));
  assert.equal(result.winner, 'b');
  assert.equal(comparePacks({ price: '0.30', quantity: '3' }, { price: '0.70', quantity: '7' }).winner, 'equal');
});

test('invalid prices and quantities never produce a usable comparison', () => {
  const valid = { price: '4.00', quantity: '3' };
  for (const price of ['', '0', '-1', '100.01', '1.001', '1e2', 'NaN']) {
    const result = comparePacks({ ...valid, price }, valid);
    assert.equal(result.valid, false, price);
    assert.equal(result.packs[0].validPrice, false, price);
    assert.equal(result.winner, undefined);
  }
  for (const quantity of ['', '0', '-1', '1.5', '13', 'Infinity']) {
    const result = comparePacks(valid, { ...valid, quantity });
    assert.equal(result.valid, false, quantity);
    assert.equal(result.packs[1].validQuantity, false, quantity);
  }
  assert.equal(comparePacks({ price: '0.01', quantity: '1' }, { price: '100', quantity: '12' }).valid, true);
});
