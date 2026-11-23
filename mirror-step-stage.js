import { arrival, departure, mirrorStepDistance } from './mirror-step.js';
import { clamp, smooth } from './effect-drawing.js';

export const mirrorStepStage = { width: 320, height: 180, x: 160, y: 143, actorX: 0, actorY: 0 };

const sky = [0x101528, 0x11182c, 0x141c32, 0x19233b, 0x1c2a43, 0x203149, 0x23384e, 0x293c51];
const floor = [0x303c52, 0x2b364c, 0x273146, 0x222c42, 0x1b2438, 0x172135];

function distantArch(surface, x, top, width) {
  const w = width / 2, rise = w * 0.75, end = 143;
  surface.polygon([[x-w, end], [x-w, top+rise], [x, top], [x+w, top+rise], [x+w, end]], 0x233247);
  surface.polygon([[x-w+5, end], [x-w+5, top+rise+2], [x, top+6], [x+w-5, top+rise+2], [x+w-5, end]], 0x192738);
  surface.line(x-w, top+rise, x, top, 0x37465c);
  surface.line(x, top, x+w, top+rise, 0x2b394e);
  surface.line(x-w, top+rise, x-w, end, 0x303e55);
}

export function drawMirrorStepBackdrop(surface) {
  const { width, height } = surface;
  const horizon = mirrorStepStage.y;
  for (let y = 0; y < horizon; y++) surface.span(y, 0, width - 1, sky[Math.min(7, Math.floor(y / 19))]);
  for (let i = 0; i < 34; i++) {
    const x = (37 + i * 91) % width, y = 10 + (i * 43) % 102;
    surface.dot(x, y, i % 9 === 0 ? 0x6f819d : 0x3a4c67, 0.47);
    if (i % 13 === 0) surface.dot(x + 1, y, 0x4d607d, 0.5);
  }
  surface.polygon([[0, 117], [43, 103], [83, 115], [116, 98], [149, 113], [184, 104], [215, 112],
    [273, 97], [320, 120], [320, 143], [0, 143]], 0x26374c);
  distantArch(surface, 159, 89, 67);
  distantArch(surface, 30, 109, 35);
  distantArch(surface, 291, 103, 39);
  for (let y = horizon; y < height; y++) {
    const level = Math.min(floor.length - 1, Math.floor((y - horizon) / 6));
    surface.span(y, 0, width - 1, floor[level]);
  }
  for (const y of [horizon, horizon + 6, horizon + 15, horizon + 30]) {
    surface.span(y, 0, width - 1, y === horizon ? 0x49586d : 0x33425a);
  }
  for (let x = -100; x <= width + 100; x += 44) {
    surface.line(x * 0.63 + 59, horizon, x, height - 1, 0x162236, 0.76);
  }
  for (let i = 0; i < 27; i++) {
    const x = (43 + i * 73) % width, y = horizon + 2 + (i * 19) % 34;
    surface.span(y, x, x + i % 5, 0x465268, 0.46);
  }
}

// Original hooded traveler, shaded with a small fixed palette.
const sprite = [
  '.......####......',
  '......#bbbb##....',
  '.....#bbccbb#....',
  '....#bcccbabb#...',
  '....#bccbaabb#...',
  '....#bceeeaab#...',
  '....#bbeefaab#...',
  '....#baaaaaa#....',
  '.....#aaaab#.....',
  '.....#dggd##.....',
  '....#dbddddd#....',
  '...#cbdbddddb#...',
  '...#cbdbbddbbb#..',
  '..#cbbdbbbdba#...',
  '..#cbbbbeddaa#...',
  '..#bbbbdeddah#...',
  '.#bbbbdeddahh#...',
  '.#bbbbdddda#.....',
  '.#bbbddddab#.....',
  '.#bbbdddaba#.....',
  '.#bbdddabbaa#....',
  '#bbddda#baba#....',
  '#bdda##..#aa#....',
  '#da##...#aaa#....',
  '###.....#####....',
];
const colors = { '#': 0x172039, a: 0x334160, b: 0x45678a, c: 0x78a8bd, d: 0x5e4f85,
  e: 0xa0d7dd, f: 0xe1f9ed, g: 0xbab1ec, h: 0xc3a78d };

function traveler(surface, x, y, time, reveal, forming, color) {
  if (reveal <= 0) return;
  const bob = Math.round((1 + Math.sin(time * 6)) * 0.7);
  const edge = 1 - reveal;
  const floorX = Math.round(x);
  surface.ellipse(floorX, y + 1, 10, 2, 0x101c2c, 0.72 * reveal);
  for (let row = 0; row < sprite.length; row++) {
    for (let col = 0; col < sprite[row].length; col++) {
      const source = colors[sprite[row][col]];
      if (!source) continue;
      const seam = row / sprite.length * 0.76 + ((col * 19 + row * 31) % 13) / 13 * 0.24;
      if (reveal < 1 && (forming ? seam > reveal : seam < edge)) continue;
      const shimmer = reveal < 1 && Math.abs(seam - (forming ? reveal : edge)) < 0.14;
      surface.dot(floorX + col - 8, y + row - sprite.length - 1 - bob, shimmer ? color : source);
    }
  }
}

export function drawMirrorStepActors(surface, x, y, time) {
  const lean = smooth(0, 0.52, time), emerge = arrival(time);
  const left = x - mirrorStepDistance, right = x + mirrorStepDistance;
  traveler(surface, left - 10 + lean * 10, y, time, clamp(1 - departure(time)), false, 0xd8beff);
  traveler(surface, right + 11 * smooth(1.56, 2.13, time), y, time, emerge, true, 0xa5f9ea);
}
