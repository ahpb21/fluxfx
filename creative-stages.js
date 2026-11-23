import { clamp } from './effect-drawing.js';

function gradient(surface, from, to, low, high) {
  const channel = (a, b, t, shift) => Math.round((a >>> shift & 255) * (1 - t) + (b >>> shift & 255) * t);
  for (let y = from; y < to; y++) {
    const t = clamp((y - from) / (to - from - 1));
    const color = channel(low, high, t, 16) << 16 | channel(low, high, t, 8) << 8 | channel(low, high, t, 0);
    surface.span(y, 0, surface.width - 1, color);
  }
}

function redGarden(surface) {
  gradient(surface, 0, 141, 0x251d29, 0x503240);
  gradient(surface, 141, 180, 0x302332, 0x1c1924);
  surface.ellipse(260, 61, 19, 19, 0x855352);
  surface.span(66, 238, 282, 0x5b3946, 0.58);
  surface.span(69, 242, 279, 0x5b3946, 0.67);
  surface.polygon([[0, 118], [29, 99], [51, 102], [88, 121], [115, 114], [145, 91], [169, 107], [190, 119],
    [232, 105], [262, 112], [290, 96], [320, 102], [320, 143], [0, 143]], 0x372638);
  surface.polygon([[0, 127], [30, 106], [47, 113], [67, 130], [95, 136], [138, 131], [177, 139], [205, 129],
    [226, 133], [252, 125], [287, 127], [320, 117], [320, 143], [0, 143]], 0x2d2332);
  surface.span(143, 0, 319, 0x5b3b49);
  surface.span(148, 0, 319, 0x3d2939);
  for (let i = 0; i < 26; i++) {
    const x = (i * 91 + 15) % 320, y = 148 + i * 17 % 32;
    surface.span(y, x, x + 2 + i % 12, 0x69434d, 0.39);
  }
  for (let i = 0; i < 17; i++) {
    const side = i % 2 === 0, x = side ? (i * 89) % 39 : 320 - (i * 67) % 37;
    const h = 7 + i * 41 % 19;
    surface.line(x, 155, x + (side ? 4 : -4), 155 - h, 0x211d2a);
    surface.dot(x + (side ? 4 : -4), 154 - h, 0x6b4651);
  }
}

function tideCavern(surface) {
  gradient(surface, 0, 144, 0x0a192b, 0x173b51);
  gradient(surface, 144, 180, 0x225063, 0x0b2135);
  surface.polygon([[0, 0], [49, 0], [67, 14], [58, 39], [43, 58], [40, 97], [22, 131], [0, 149]], 0x102439);
  surface.polygon([[320, 0], [282, 0], [268, 22], [285, 50], [272, 71], [277, 114], [302, 134], [320, 145]], 0x102639);
  surface.polygon([[0, 138], [29, 130], [43, 130], [60, 138], [89, 142], [109, 139], [212, 141], [257, 134],
    [282, 120], [320, 130], [320, 145], [0, 145]], 0x1b3d4e);
  for (let i = 0; i < 30; i++) {
    const x = (25 + i * 71) % 320, y = 12 + i * 31 % 123;
    surface.dot(x, y, i % 8 ? 0x355b6c : 0x4a7883, 0.60);
  }
  for (let i = 0; i < 37; i++) {
    const x = (i * 71 + 13) % 320, y = 144 + (i * 17) % 34;
    surface.span(y, x, x + 3 + i * 9 % 25, i % 4 ? 0x345c70 : 0x548593, 0.34);
  }
}

function surveyChamber(surface) {
  gradient(surface, 0, 180, 0x171b1d, 0x2e2721);
  for (let y = 16; y < 176; y += 12) {
    for (let x = 16; x < 320; x += 12) {
      surface.dot(x, y, 0x736248, 0.24);
      if ((x + y) % 48 === 32) {
        surface.dot(x - 1, y, 0x736248, 0.24);
        surface.dot(x, y - 1, 0x736248, 0.24);
      }
    }
  }
  for (const x of [23, 296]) {
    surface.line(x, 38, x, 142, 0x735d44, 0.37);
    for (let y = 43; y < 142; y += 11) surface.span(y, x - 2, x + 2, 0x8b6a43, 0.68);
  }
  surface.span(29, 30, 77, 0x554637);
  surface.span(30, 30, 53, 0x796042);
  surface.span(149, 246, 288, 0x554637);
  surface.span(150, 266, 288, 0x796042);
}

export const origamiFlockStage = { width: 320, height: 180, x: 160, y: 94, drawBackdrop: redGarden, showActor: false };
export const tideReversalStage = { width: 320, height: 180, x: 160, y: 144, drawBackdrop: tideCavern, showActor: false };
export const terrainEchoStage = { width: 320, height: 180, x: 160, y: 103, drawBackdrop: surveyChamber, showActor: false };
