import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { groundPound, PixelPlayer } from '../index.js';

// Seed 1 snapshots from pixelfx at 120 Hz, with origin (152, 168) on a 304 × 204 frame.
const reference = [
  [75, '18f1cea115dd7668cebbdf779704e483', '464acf70de81b5f96b6fdaac51d30332', '87a8f897bd0905d2e3b9e15482e9f20a'],
  [104, '2b6b9dda8b433fbc8e3e09b607c734e1', '6a8a1aef8b5a3034903abf06dabc7678', '8fa09955f5513ebabcb588d4ddf96d9a'],
  [188, '6d2948ae31ae1f43cfe257c33afecd7c', 'd1fe547f66885a741354d7031edc1b01', '665e1ebcd529ae8fd6556bbe131d62dd'],
  [282, 'fa3df635f1b2150f762dd41dce9c8e01', 'b9b87a98e39704076661255b727fc2bd', '27a4cac1da86825c53593d6d1b79ef20'],
];

const hash = data => createHash('sha256')
  .update(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)).digest('hex').slice(0, 32);

test('ground pound matches the original impact layers after both forward and reverse seeks', () => {
  const player = new PixelPlayer(304, 204);
  const move = player.play(groundPound, { x: 152, y: 168, seed: 1 });
  for (const [tick, back, front, light] of [...reference, ...reference.toReversed()]) {
    move.seek(tick / 120);
    const frame = player.renderLayers();
    assert.deepEqual([hash(frame.back.data), hash(frame.front.data), hash(frame.light.data)], [back, front, light]);
  }
});

test('ground pound delivers gameplay cues and clears after playback', () => {
  const player = new PixelPlayer(304, 204);
  const move = player.play(groundPound, { x: 152, y: 168, light: 0 });
  player.update(0.61);
  assert.ok(player.renderLayers().composite().every(value => value === 0));
  assert.deepEqual(move.drainEvents().map(event => [event.name, event.time]), [['launch', 0.03]]);
  player.update(0.49);
  const frame = player.renderLayers();
  assert.ok(frame.front.data.some(Boolean));
  assert.ok(frame.light.data.every(value => value === 0));
  const events = move.drainEvents();
  assert.deepEqual(events.map(event => [event.name, event.time]), [['impact', 0.62], ['targetHit', 0.76], ['aftershock', 1.06]]);
  assert.equal(events[0].data.hitStop, 0.2);
  player.update(3);
  assert.deepEqual(move.drainEvents().map(event => [event.name, event.time]), [['recover', 2.42]]);
  assert.ok(player.renderLayers().composite().every(value => value === 0));
});
