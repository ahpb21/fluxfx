import { clamp, smooth } from './effect-drawing.js';
import { receiverCharge, receiverOffset, thrustDistance, thrustFloor, thrustHand, thrustTiming } from './thunder-thrust.js';
import { keyframes } from './timeline.js';

const stageY = 120;
const floorY = stageY + thrustFloor;
const stones = [0x2b344a, 0x283046, 0x252c42, 0x21283c, 0x1f2437, 0x181f30];
const sky = [0x111322, 0x151829, 0x191e32, 0x1c2239, 0x222941];
const easeOut = u => 1 - (1 - u) ** 3;
const move = keyframes([[0, -23], [0.24, -28], [thrustTiming.launch, -24],
  [0.54, 5, easeOut], [0.65, 3], [1.12, -9], [1.54, -22]]);
const lean = keyframes([[0, 1], [0.24, -3], [thrustTiming.launch, 0], [0.54, 8], [0.65, 6], [1.34, 1]]);

function pillar(surface, x, y, side) {
  surface.polygon([[x-12, y], [x-11, y-65], [x-7, y-69], [x+7, y-69], [x+12, y-65], [x+13, y]], 0x22273b);
  surface.polygon([[x-9, y-2], [x-9, y-64], [x+3, y-64], [x+3, y-2]], 0x292f45);
  surface.line(x+side*8, y-66, x+side*9, y, 0x38405a);
  for (const height of [6, 10, 54, 60]) surface.span(y-height, x-12, x+12, 0x323951);
  surface.span(y-1, x-15, x+15, 0x22283b);
}

function drawBackdrop(surface) {
  const { width, height } = surface;
  for (let y = 0; y < floorY; y++) surface.span(y, 0, width - 1, sky[Math.min(sky.length - 1, Math.floor(y / 28))]);
  surface.polygon([[0, 73], [31, 70], [65, 75], [105, 68], [130, 71], [154, 67],
    [192, 71], [231, 73], [267, 67], [304, 72], [304, 89], [0, 84]], 0x20253a);
  surface.polygon([[0, 128], [32, 108], [58, 116], [83, 97], [124, 110], [158, 91], [186, 100],
    [221, 116], [264, 107], [286, 91], [304, 113], [304, 147], [0, 147]], 0x1d2539);
  surface.polygon([[0, 136], [33, 125], [57, 131], [95, 123], [133, 129], [163, 120], [211, 133],
    [227, 125], [260, 121], [304, 130], [304, 148], [0, 148]], 0x252e44);
  pillar(surface, 20, 148, 1);
  pillar(surface, 285, 148, -1);
  surface.span(148, 0, width - 1, 0x42495f);
  surface.span(149, 0, width - 1, 0x171e30);
  for (let y = floorY; y < height; y++) {
    surface.span(y, 0, width - 1, stones[Math.min(stones.length - 1, Math.floor((y - floorY) / 8))]);
  }
  for (const y of [152, 160, 173, 190]) {
    surface.span(y, 0, width - 1, 0x141b2c);
    surface.span(y + 1, 0, width - 1, 0x3a4155, 0.61);
  }
  for (let x = -50; x < width + 50; x += 62) surface.line(152 + (x-152)*0.54, 149, x, height - 1, 0x1a2234);
  for (let i = 0; i < 50; i++) {
    const x = (47 + i * 101) % width, y = 153 + i * 29 % 49;
    surface.span(y, x, x + i % 4, 0x515367, 0.56);
  }
}

function drawLancer(surface, x, y, time) {
  const handX = x + thrustHand(time), body = x + move(time), tilt = lean(time);
  const dash = smooth(thrustTiming.launch, 0.54, time) * (1 - smooth(0.64, 1.2, time));
  const boots = y + thrustFloor, waist = y + 13 + Math.round(dash * 2), headX = body + tilt;
  const headY = y - 16 + Math.round(dash * 5);
  const dark = 0x222b44, shadow = 0x45546d, cloth = 0x697e98, trim = 0x9ab2c1, skin = 0xc0a486;
  const backFoot = body - 6 - 12 * dash, frontFoot = body + 8 + 8 * dash;
  surface.ellipse(body + 1, boots + 1, 14 + 4 * dash, 2, 0x12182a, 0.85);
  surface.polygon([[body-7, waist-5], [body+3, waist-4], [backFoot+2, boots-1], [backFoot-4, boots-1]], dark);
  surface.polygon([[body, waist-1], [body+8, waist-5], [frontFoot+4, boots-2], [frontFoot-3, boots-2]], shadow);
  surface.span(boots, backFoot-4, backFoot+3, dark);
  surface.span(boots, frontFoot-3, frontFoot+6, cloth);
  surface.polygon([[headX-7, headY+10], [headX+6, headY+9], [body+9, waist-3], [body+3, waist+2], [body-9, waist-1]], shadow);
  surface.polygon([[headX-7, headY+10], [headX+6, headY+9], [body+7, waist-5], [body-6, waist-4]], cloth);
  surface.line(headX-5, headY+12, body-4, waist-5, trim);
  surface.span(waist-3, body-7, body+7, 0x9d6558);
  const scarfX = body-7-15*dash, scarfY = headY+17-4*dash;
  surface.polygon([[headX-5, headY+10], [scarfX, scarfY], [scarfX-6, scarfY+2], [headX-5, headY+14]], 0x98596b);
  surface.polygon([[headX-7, headY+3], [headX-4, headY], [headX+4, headY-1], [headX+8, headY+4],
    [headX+6, headY+10], [headX-5, headY+11]], dark);
  surface.span(headY+2, headX-4, headX+5, cloth);
  surface.span(headY+5, headX+1, headX+7, trim);
  surface.span(headY+7, headX+4, headX+7, skin);
  const shoulderX = headX+5, shoulderY = headY+13;
  const elbowX = shoulderX + (handX-shoulderX)*0.54, elbowY = y + 6 - dash*6;
  surface.line(shoulderX, shoulderY, elbowX, elbowY, trim);
  surface.line(shoulderX, shoulderY+1, elbowX, elbowY+1, cloth);
  surface.line(elbowX, elbowY, handX-2, y, cloth);
  surface.line(elbowX, elbowY-1, handX-2, y-1, trim);
  surface.span(y, handX-2, handX, skin);
}

function drawDummy(surface, x, y, time) {
  const dx = receiverOffset(time), hit = receiverCharge(time);
  const base = y + thrustFloor, px = x + dx;
  const bark = hit > 0.55 ? 0x8f8593 : 0x99785f;
  surface.ellipse(x, base+1, 10, 2, 0x141a2b, 0.84);
  surface.span(base-1, x-6, x+7, 0x745d50);
  surface.line(x-2, base, px, y-15, 0x4d3f40);
  surface.line(x-1, base-3, px+1, y-11, 0x9b785d);
  surface.polygon([[px-7, y-11], [px+7, y-11], [px+6, y+9], [px-4, y+11], [px-8, y+4]], bark);
  surface.ellipse(px, y-17, 5, 5, bark);
  surface.span(y-18, px-3, px+3, 0xc4a184);
  surface.span(y-15, px-5, px+4, 0x564b54);
  surface.span(y-7, px-11, px+10, 0x775a50);
  surface.span(y-6, px-8, px+9, bark);
  surface.span(y-1, px-5, px+5, 0x705957);
  surface.span(y+6, px-4, px+5, 0xbe9674);
  surface.ellipse(px+1, y, 4, 4, 0x6f4a54);
  surface.dot(px+1, y, 0xdbc09a);
}

function drawActors(surface, x, y, time) {
  drawLancer(surface, x, y, time);
  drawDummy(surface, x + thrustDistance, y, time);
}

export const thunderThrustStage = {
  width: 304, height: 204, x: 60, y: stageY, drawBackdrop, drawActors,
  markerLabels: { launch: '突刺', targetHit: '木桩触电', aftershock: '余电', recover: '余烟' },
};
