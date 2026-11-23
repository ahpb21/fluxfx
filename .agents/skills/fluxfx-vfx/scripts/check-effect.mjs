import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const strings = ['root', 'module', 'export', 'width', 'height', 'x', 'y', 'seed', 'settings', 'times', 'preview'];
const options = Object.fromEntries(strings.map(key => [key, { type: 'string' }]));
options.help = { type: 'boolean', short: 'h' };
const usage = 'Usage: check-effect.mjs <id> | --module <file> [--export <name>]\n' +
  '       [--root <FluxFX root>] [--width <px>] [--height <px>] [--x <px>] [--y <px>]\n' +
  '       [--seed <number>] [--settings <JSON>] [--times <seconds,seconds>] [--preview <file.png>]';

const count = (pixels, stride = 1, offset = 0) => {
  let total = 0;
  for (let i = offset; i < pixels.length; i += stride) if (pixels[i]) total++;
  return total;
};

function sampleTimes(duration, previewTime, override) {
  const peak = previewTime ?? duration * 0.49;
  const times = override === undefined ? [0, peak * 0.5, peak, peak + (duration - peak) * 0.34, duration * 0.94] :
    override.split(',').map(s => s.trim() ? Number(s) : NaN);
  if (times.some(t => !Number.isFinite(t) || t < 0 || t > duration)) throw new RangeError('Sample times must be between 0 and duration');
  return [...new Set(times)].sort((a, b) => a - b);
}

async function preview(root, path, width, height, frames) {
  const { encodePng } = await import(pathToFileURL(resolve(root, 'tools/png.mjs')).href);
  const columns = Math.min(frames.length, 3), rows = Math.ceil(frames.length / columns), gap = 3;
  const outWidth = width * columns + gap * (columns - 1), outHeight = height * rows + gap * (rows - 1);
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  frames.forEach((pixels, i) => {
    const x = (i % columns) * (width + gap), y = Math.floor(i / columns) * (height + gap);
    for (let row = 0; row < height; row++) {
      out.set(pixels.subarray(row * width * 4, (row + 1) * width * 4), ((y + row) * outWidth + x) * 4);
    }
  });
  const file = resolve(path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, encodePng(outWidth, outHeight, out));
  console.log('Preview ' + file);
}

async function run() {
  const { values, positionals } = parseArgs({ options, allowPositionals: true });
  if (values.help) { console.log(usage); return; }
  const invalidSource = values.module ? positionals.length !== 0 : positionals.length !== 1 || values.export !== undefined;
  if (invalidSource) throw new Error(usage);
  const root = resolve(values.root ?? '.');
  const { effects, PixelPlayer } = await import(pathToFileURL(resolve(root, 'index.js')).href);
  const name = values.module ? values.export ?? 'default' : positionals[0];
  const catalog = values.module ? await import(pathToFileURL(resolve(root, values.module)).href) : effects;
  const effect = Object.hasOwn(catalog, name) ? catalog[name] : undefined;
  if (!effect || typeof effect.build !== 'function' || !Number.isFinite(effect.duration) || effect.duration <= 0) {
    throw new Error('Expected a FluxFX effect definition for ' + name);
  }
  const width = Number(values.width ?? 160), height = Number(values.height ?? 112);
  const settings = JSON.parse(values.settings ?? '{}');
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) throw new TypeError('--settings requires a JSON object');
  const player = new PixelPlayer(width, height);
  const handle = player.play(effect, { ...settings, x: Number(values.x ?? Math.floor(width / 2)),
    y: Number(values.y ?? Math.round(height * 0.78)), seed: Number(values.seed ?? 23) });
  const times = sampleTimes(effect.duration, effect.previewTime, values.times);
  const capture = time => {
    handle.seek(time);
    const frame = player.renderLayers();
    const data = [frame.back.data.slice(), frame.front.data.slice(), frame.light.data.slice(), frame.composite().slice()];
    return { data, frame };
  };
  const images = [], expected = [], rows = [];
  for (const time of times) {
    const { data, frame } = capture(time);
    expected.push(data);
    rows.push({ seconds: Number(time.toFixed(4)), back: count(data[0], 4, 3), front: count(data[1], 4, 3),
      lit: count(data[2]), visible: count(data[3], 4, 3), particles: frame.stats.particles });
    if (values.preview) images.push(frame.composite({ background: 0x181c29 }).slice());
  }
  assert.ok(rows.some(r => r.visible), 'No visible pixels at the requested samples; check viewport, anchor and times');
  for (let i = times.length - 1; i >= 0; i--) {
    assert.deepEqual(capture(times[i]).data, expected[i], 'Layer or composite changed when seeking back to ' + times[i]);
  }
  if (effect.loop) {
    const wrapped = effect.duration + times.find((_, i) => rows[i].visible);
    assert.deepEqual(capture(wrapped).data, capture(wrapped % effect.duration).data, 'Loop wrapping changed the rendered frame');
  } else {
    assert.ok(capture(effect.duration).data.every(data => !count(data)), 'A one-shot must be clear at its duration');
  }
  console.log(name + ' · ' + width + ' × ' + height + ' · ' + (effect.loop ? 'loop' : 'one-shot'));
  console.table(rows);
  if (values.preview) await preview(root, values.preview, width, height, images);
}

try { await run(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
