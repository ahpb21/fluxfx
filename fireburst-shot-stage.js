import { fireburstFloor, fireburstTarget, fireburstTargetPose, fireburstTiming, palmHeight } from './fireburst-shot.js';
import { smooth } from './effect-drawing.js';

const { launch, targetHit } = fireburstTiming;
const anchorY = 100, horizon = anchorY + fireburstFloor;
const sky = [0x201923, 0x251d29, 0x2d222d, 0x362732, 0x3d2c35, 0x442f36];
const paving = [0x43333a, 0x3e3037, 0x352a32, 0x31262f, 0x2b232d, 0x231e29];

function drawBackdrop(surface) {
  const { width, height } = surface;
  for (let y = 0; y < horizon; y++) surface.span(y, 0, width - 1, sky[Math.min(sky.length - 1, Math.floor(y / 22))]);
  surface.polygon([[0, 117], [27, 103], [55, 108], [80, 87], [108, 91], [131, 107],
    [148, 100], [174, 112], [208, 86], [235, 73], [268, 86], [304, 101], [304, 134], [0, 134]], 0x352832);
  surface.polygon([[0, 122], [44, 114], [67, 122], [98, 111], [144, 119], [174, 116], [197, 123], [228, 112],
    [265, 123], [304, 107], [304, 135], [0, 135]], 0x30252e);
  for (const [x, top] of [[25, 78], [278, 83]]) {
    surface.polygon([[x-9, horizon], [x-10, top+6], [x-6, top], [x+7, top+2], [x+10, horizon]], 0x261f29);
    surface.polygon([[x-7, horizon], [x-8, top+8], [x-1, top+5], [x+1, horizon]], 0x473039);
    surface.line(x-7, top+8, x-6, horizon, 0x6b4747, 0.46);
    for (let y = top + 13; y < horizon; y += 13) surface.span(y, x-7, x+8, 0x523941, 0.60);
  }
  for (let y = horizon; y < height; y++) surface.span(y, 0, width - 1, paving[Math.min(paving.length - 1, Math.floor((y-horizon) / 11))]);
  for (const y of [horizon, 144, 158, 177, 199]) {
    surface.span(y, 0, width - 1, 0x291f29);
    surface.span(y+1, 0, width - 1, 0x6b4a4a, 0.62);
  }
  for (let x = -96; x < 396; x += 53) {
    surface.line(152+(x-152)*0.64, horizon+2, x, height-1, 0x261e28);
    surface.line(153+(x-152)*0.64, horizon+2, x+1, height-1, 0x51403f, 0.46);
  }
  for (let i = 0; i < 39; i++) {
    const x = (i*73 + 29) % width, y = horizon + 3 + i*31 % 62;
    surface.span(y, x, x+i%5, 0x634749, 0.52);
  }
}

function drawCaster(surface, x, y, time) {
  const shift = 9 * smooth(launch, launch+0.12, time) * (1 - smooth(0.63, 1.30, time));
  const body = x-25+shift, feet = y+fireburstFloor;
  const faceX = body+5+shift*0.18, headY = y-14+shift*0.17;
  const handX = x - 2.3 * smooth(launch+0.05, launch+0.18, time) - 7 * smooth(0.58, 1.08, time);
  const handY = y + palmHeight(time) + 13 * smooth(0.62, 1.07, time);
  const edge = 0x272436, shadow = 0x433755, cloth = 0x635373, trim = 0xa493a3, skin = 0xd4aa7f;
  surface.ellipse(body+1, feet+1, 14, 2, 0x201a25, 0.84);
  surface.polygon([[body-7, y+9], [body+6, y+10], [body+2, y+19], [body-7-shift*0.5, feet-1], [body-13-shift*0.5, feet-1]], shadow);
  surface.polygon([[body-5, y+12], [body+6, y+11], [body+11+shift*0.43, feet-2], [body+5+shift*0.43, feet-2]], edge);
  surface.span(feet, body-15-shift*0.5, body-6-shift*0.5, edge);
  surface.span(feet, body+4+shift*0.43, body+13+shift*0.43, cloth);
  surface.polygon([[faceX-8, headY+8], [faceX+5, headY+10], [body+8, y+10], [body+1, y+23], [body-9, y+20]], cloth);
  surface.polygon([[faceX-8, headY+9], [faceX-3, headY+10], [body-5, y+13], [body-2-shift*1.2, y+20],
    [body-12-shift*0.84, y+25]], shadow);
  surface.line(faceX-1, headY+12, body-2, y+14, trim);
  surface.span(y+11, body-7, body+5, 0x876355);
  surface.polygon([[faceX-7, headY+4], [faceX-4, headY], [faceX+4, headY-1], [faceX+10, headY+4],
    [faceX+4, headY+12], [faceX-5, headY+11]], edge);
  surface.line(faceX-4, headY+2, faceX+6, headY+2, trim);
  surface.span(headY+6, faceX+2, faceX+8, skin);
  surface.dot(faceX+6, headY+5, 0xeee3c1);
  const elbowX = faceX + (handX-faceX)*0.54, elbowY = y+7-shift*0.6;
  surface.line(faceX+4, headY+12, elbowX, elbowY, cloth);
  surface.line(faceX+4, headY+11, elbowX, elbowY-1, trim);
  surface.line(elbowX, elbowY, handX-2, handY+1, cloth);
  surface.line(elbowX, elbowY-1, handX-2, handY, trim);
  surface.span(handY, handX-2, handX, skin);
}

function drawDummy(surface, x, floor, time) {
  const pose = fireburstTargetPose(time), cx = x+pose.x, y = floor+pose.y, top = cx+pose.tilt;
  const scorch = smooth(targetHit, 1.23, time), dark = scorch > 0.63 ? 0x513630 : 0x755347;
  surface.ellipse(cx, floor+1, 10, 2, 0x271c24, 0.80);
  surface.span(y-1, cx-6, cx+7, dark);
  surface.line(cx-1, y, top, y-30, dark);
  surface.line(cx+1, y-3, top+1, y-31, 0x9a6e52);
  surface.polygon([[top-8, y-33], [top+7, y-33], [cx+6, y-13], [cx-5, y-12]], 0x9e7559);
  surface.span(y-29, top-10, top+9, dark);
  surface.span(y-28, top-10, top+9, 0xbd926e);
  surface.span(y-23, top-6, top+6, 0x714639);
  surface.line(top-5, y-21, cx-3, y-14, 0xd3a67a);
  surface.ellipse(top, y-38, 5, 5, 0xa68063);
  surface.span(y-39, top-3, top+3, 0xd7ad84);
  surface.span(y-36, top-5, top+4, dark);
}

function drawActors(surface, x, y, time) {
  drawCaster(surface, x, y, time);
  drawDummy(surface, x+fireburstTarget, y+fireburstFloor, time);
}

export const fireburstShotStage = {
  width: 304, height: 204, x: 70, y: anchorY, drawBackdrop, drawActors,
  markerLabels: { launch: '发射', impact: '落地爆裂', targetHit: '木桩燃烧', aftershock: '热浪余涌', recover: '收焰' },
};
