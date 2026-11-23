import { clamp, smooth } from './effect-drawing.js';
import { groundPoundImpact } from './ground-pound.js';
import { mix } from './reference-painter.js';
import { keyframes } from './timeline.js';

export const groundPoundStage = { width: 304, height: 204, x: 152, y: 168, actorX: 0, actorY: 0 };

export function drawGroundPoundBackdrop(surface) {
  const { width, height } = surface;
  const floor = groundPoundStage.y;
  for (let y = 0; y < height; y++) {
    const color = y < floor
      ? mix(0x10121f, 0x212137, clamp((y - 25) / (floor - 25)))
      : mix(0x353044, 0x191925, clamp((y - floor) / 31));
    surface.span(y, 0, width - 1, color);
  }
  surface.polygon([[0, 133], [31, 108], [86, 139], [124, 122], [169, 145], [240, 105], [303, 129], [304, 166], [0, 166]], 0x191a2c);
  surface.polygon([[0, 151], [39, 138], [92, 152], [109, 151], [139, 164], [168, 151], [195, 155], [225, 140], [282, 149], [304, 141], [304, 167], [0, 167]], 0x1d1e30);
  surface.span(floor - 1, 0, width - 1, 0x3c394b);
  surface.span(floor + 4, 0, width - 1, 0x252338);
  for (let y = floor + 5; y < height; y += 8) {
    surface.span(y + 6, 0, width - 1, 0x1c1c2a, 0.55);
    for (let x = (y % 16) * 3 - 24; x < width; x += 47) {
      surface.line(x, y, x - 3, y + 5, 0x1a1928, 0.6);
      surface.span(y + 1, x + 5, x + 21, 0x474050, 0.38);
    }
  }
}

const easeOut = u => 1 - (1 - u) ** 3;
const jump = keyframes([[0, 0], [0.03, -10], [0.26, -60, easeOut], [0.42, -62],
  [0.615, -4, u => u * u], [groundPoundImpact, 0]]);
const crouch = keyframes([[0, 7], [0.03, 0], [0.42, 1], [0.615, 2],
  [groundPoundImpact, 8], [1.42, 6], [1.92, 5], [2.42, 0]]);
const arms = keyframes([[0, 3], [0.03, -12], [0.26, 1], [0.42, 1], [0.615, -10],
  [groundPoundImpact, 12], [1.42, 10], [1.92, 7], [2.42, 2]]);
const targetPush = keyframes([[0.76, 0], [0.91, 14, easeOut], [1.06, 15], [1.22, 9, easeOut], [1.43, 10]]);

function hop(time, start, duration, height) {
  const t = clamp((time - start) / duration);
  return height * 4 * t * (1 - t);
}

function drawFighter(surface, x, y, airborne, bend, arm, lean, opacity = 1) {
  const armor = 0x566783, plate = 0x8da6b9, dark = 0x252c43, edge = 0x111525;
  const hip = y - 15 + bend, headY = hip - 25, headX = x + lean;
  const frontFoot = x + 7 + bend * 0.45, backFoot = x - 6 - bend * 0.45;
  surface.polygon([[x - 6, hip - 5], [x + 5, hip - 4], [backFoot + 1, y - 2], [backFoot - 4, y - 2]], dark, opacity);
  surface.polygon([[x - 2, hip - 3], [x + 7, hip - 3], [frontFoot + 3, y - 3 - airborne], [frontFoot - 4, y - 3 - airborne]], armor, opacity);
  surface.span(y - 1, backFoot - 5, backFoot + 2, edge, opacity);
  surface.span(y - 1 - airborne, frontFoot - 3, frontFoot + 5, edge, opacity);
  surface.polygon([[headX - 5, headY + 10], [headX + 7, headY + 11], [x + 8, hip], [x - 8, hip]], armor, opacity);
  surface.span(headY + 12, headX - 4, headX + 5, plate, opacity);
  surface.span(hip - 1, x - 7, x + 7, 0x8b513c, opacity);
  surface.polygon([[headX - 7, headY + 3], [headX - 4, headY], [headX + 4, headY], [headX + 8, headY + 4],
    [headX + 6, headY + 11], [headX - 7, headY + 10]], dark, opacity);
  surface.span(headY + 2, headX - 4, headX + 4, plate, opacity);
  surface.span(headY + 5, headX, headX + 6, 0xd4eef4, opacity);
  const fx = x + 10 + lean, fy = headY + 16 + arm;
  surface.line(headX + 5, headY + 13, fx, fy, plate, opacity);
  surface.line(headX + 5, headY + 14, fx, fy + 1, armor, opacity);
  surface.span(fy, fx - 1, fx + 2, 0xc29a79, opacity);
  const bx = x - 9, by = headY + 14 + arm * 0.6;
  surface.line(headX - 4, headY + 14, bx, by, dark, opacity);
  surface.span(by, bx - 1, bx + 1, 0x9c735e, opacity);
}

function drawTarget(surface, x, y, lift, lean) {
  const px = x + lean, py = y - lift;
  surface.ellipse(x, y + 1, 9, 2, 0x121421, 0.8 - Math.min(0.5, lift * 0.04));
  surface.line(x - 2, py - 2, px, py - 27, 0x705247);
  surface.span(py - 2, x - 6, x + 4, 0x6b5044);
  surface.polygon([[px - 7, py - 28], [px + 7, py - 28], [px + 5, py - 15], [px - 6, py - 15]], 0x936746);
  surface.span(py - 26, px - 9, px + 10, 0x745343);
  surface.span(py - 22, px - 6, px + 6, 0xb48a58);
  surface.ellipse(px, py - 32, 5, 5, 0xad8059);
  surface.span(py - 33, px - 3, px + 2, 0xd3a470);
  surface.span(py - 31, px - 4, px + 4, 0x60473f);
}

export function drawGroundPoundActors(surface, x, y, time) {
  const lift = jump(time), bend = crouch(time), arm = arms(time);
  const tilt = 4 * (1 - smooth(1.4, 2.42, time));
  surface.ellipse(x, y + 1, 12, 2, 0x141622, 0.8 + lift * 0.008);
  if (time >= 0.03 && time < 0.28) {
    const u = (time - 0.03) / 0.25;
    for (let i = 0; i < 8; i++) {
      const drift = (3 + i * 2.4) * u, height = (2 + i % 4 * 2) * u;
      surface.ellipse(x + drift * (i % 2 ? 1 : -1), y - height, 2 + u, 1 + u, 0x77728b, (1 - u) * 0.33);
    }
  }
  if ((time >= 0.03 && time < 0.14) || (time >= 0.53 && time < groundPoundImpact)) {
    const trailing = jump(Math.max(0, time - 0.035));
    drawFighter(surface, x, y + trailing, 3, bend, arm, tilt, 0.17);
  }
  drawFighter(surface, x, y + lift, Math.min(4, -lift * 0.2), bend, arm, tilt);
  drawTarget(surface, x + 80 + targetPush(time), y, hop(time, 0.76, 0.25, 8) + hop(time, 1.06, 0.18, 5),
    7 * hop(time, 0.76, 0.3, 1) - 5 * hop(time, 1.06, 0.3, 1));
}
