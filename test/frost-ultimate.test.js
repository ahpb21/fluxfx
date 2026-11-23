import assert from 'node:assert/strict';
import test from 'node:test';
import { PixelPlayer, Surface, frostUltimate } from '../index.js';
import { frostStage } from '../frost-stage.js';

const { width, height, x, y } = frostStage;

test('the fullscreen frost attack dims behind the actor, hits on cue, then reaches every screen edge', () => {
  const player = new PixelPlayer(width, height);
  const handle = player.play(frostUltimate, { x, y, seed: 23 });
  const actor = new Surface(width, height);
  actor.ellipse(98, 110, 4, 8, 0xf0e9d1);
  const pixel = (pixels, px, py) => [...pixels.subarray((py * width + px) * 4, (py * width + px) * 4 + 4)];

  player.update(0.49);
  let frame = player.renderLayers();
  let scene = frame.composite({ background: 0x405070, actors: actor.data, light: false });
  assert.ok(pixel(scene, 10, 10)[0] < 0x40);
  assert.deepEqual(pixel(scene, 98, 110), [0xf0, 0xe9, 0xd1, 255]);
  player.update(0.45);
  assert.deepEqual(handle.drainEvents().filter(event => ['release', 'impact'].includes(event.name))
    .map(event => [event.name, event.time]), [['release', 0.65], ['impact', 0.93]]);

  const edgePixels = [
    Array.from({ length: width }, (_, i) => [i, 0]), Array.from({ length: width }, (_, i) => [i, height - 1]),
    Array.from({ length: height }, (_, i) => [0, i]), Array.from({ length: height }, (_, i) => [width - 1, i])
  ];
  const countEdges = back => edgePixels.filter(edge => edge.some(([px, py]) => back[(py * width + px) * 4 + 2] > 105)).length;
  handle.seek(0.99);
  assert.equal(countEdges(player.renderLayers().back.data), 0);
  handle.seek(1.28);
  frame = player.renderLayers();
  assert.equal(countEdges(frame.back.data), 4);
  assert.ok(frame.front.data.some(Boolean));
  assert.ok(frame.light.data.some(Boolean));
  handle.seek(frostUltimate.duration);
  assert.ok(player.renderLayers().composite().every(value => value === 0));
});
