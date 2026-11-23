import assert from 'node:assert/strict';
import test from 'node:test';
import { effects, PixelPlayer } from '../index.js';

const cases = [[effects.prismArray, 1.18], [effects.gravityCollapse, 1.49], [effects.solarEruption, 1.39]];

test('lab effects emit independently compositable layers and support the reduced quality budget', () => {
  for (const [effect, time] of cases) {
    const capture = (quality, light) => {
      const player = new PixelPlayer(160, 112);
      const handle = player.play(effect, { x: 80, y: 87, seed: 23, quality, light });
      handle.seek(time);
      const frame = player.renderLayers();
      assert.ok(frame.back.data.some(Boolean), effect.title + ' back');
      assert.ok(frame.front.data.some(Boolean), effect.title + ' front');
      assert.equal(frame.light.data.some(Boolean), light > 0, effect.title + ' light');
      const pixels = frame.composite({ background: 0x181c29 }).slice();
      const particles = frame.stats.particles;
      handle.seek(effect.duration - 0.01);
      player.renderLayers();
      handle.seek(time);
      assert.deepEqual(player.renderLayers().composite({ background: 0x181c29 }), pixels, effect.title);
      return particles;
    };
    assert.ok(capture('full', 1) > capture('low', 0.48), effect.title);
    capture('full', 0);
  }
});
