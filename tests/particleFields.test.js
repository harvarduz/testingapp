import test from 'node:test';
import assert from 'node:assert/strict';
import { createParticleField } from '../src/particleFields.js';
import { effectTarget } from '../src/particleMotion.js';

test('prepared fields retain all five original forms and their animation speeds', () => {
  for (const kind of ['helix', 'network', 'towers', 'broadcast', 'orbit']) {
    for (const count of [320, 733, 1400]) {
      const field = createParticleField(kind, count), out = new Array(5);
      for (const [time, width, height] of [[0, 126, 190], [1.5, 342, 180], [100, 900, 380]]) {
        field.begin(time, width, height);
        for (let index = 0; index < count; index++) {
          const expected = effectTarget(kind, index, count, time, width, height);
          assert.equal(field.sample(index, out), out, 'Reuse the caller-owned sample buffer');
          for (let coordinate = 0; coordinate < 4; coordinate++) {
            assert.ok(Number.isFinite(out[coordinate]));
            assert.ok(Math.abs(out[coordinate] - expected[coordinate]) < 1e-7, `${kind} sample ${index}, component ${coordinate}`);
          }
          assert.equal(out[4], expected[4]);
        }
      }
    }
  }
});

test('sampling a field does not change another field or its saved phase', () => {
  const first = createParticleField('orbit', 600), second = createParticleField('helix', 320), out = new Array(5);
  first.begin(3, 390, 240); first.sample(200, out); const before = [...out];
  second.begin(40, 126, 190); second.sample(10, out);
  first.sample(200, out); assert.deepEqual(out, before);
});
