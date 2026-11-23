import { Surface } from './surface.js';
import { smooth } from './effect-drawing.js';
import { severEnd, severNormal, severTarget, severTargetPose, severTiming } from './time-sever.js';

const { launch, impact, targetHit } = severTiming;
const sky = [0x101622, 0x121a28, 0x172031, 0x1b2537, 0x1d283c, 0x232d40];
const flagstones = [0x272f42, 0x242d41, 0x222a3c, 0x1f2638, 0x1c2133];

function drawBackdrop(surface) {
  const { width, height } = surface;
  for (let y = 0; y < 143; y++) surface.span(y, 0, width - 1, sky[Math.min(sky.length - 1, Math.floor(y / 24))]);
  surface.ellipse(253, 35, 25, 25, 0x344459, 0.68);
  for (const y of [29, 34, 38, 44]) surface.span(y, 228, 279, 0x1b2436, 0.45);
  surface.polygon([[0, 113], [24, 99], [45, 102], [70, 80], [101, 100], [121, 104], [146, 92],
    [170, 111], [198, 95], [225, 104], [254, 86], [280, 101], [304, 93], [304, 142], [0, 150]], 0x1c273a);
  surface.polygon([[0, 130], [34, 121], [63, 126], [98, 114], [124, 122], [150, 120], [176, 111],
    [199, 129], [228, 118], [254, 120], [280, 113], [304, 121], [304, 144], [0, 145]], 0x222e42);
  for (const [x, y, w] of [[32, 119, 29], [255, 113, 38]]) {
    surface.polygon([[x-w, y], [x-w*0.64, y-8], [x, y-19], [x+w*0.61, y-7], [x+w, y]], 0x172235);
    surface.line(x-w+2, y-1, x, y-19, 0x3a485f, 0.69);
    surface.line(x, y-19, x+w, y-1, 0x2d3e56, 0.62);
    surface.span(y+1, x-w+2, x+w-1, 0x2c394e);
    for (const pillar of [x-w*0.66,x+w*0.66]) {
      surface.polygon([[pillar-2, y+2], [pillar+3, y+2], [pillar+4, 145], [pillar-3, 145]], 0x192637);
      surface.line(pillar-2, y+4, pillar-2, 143, 0x435168, 0.45);
    }
  }
  for (let y = 143; y < height; y++) {
    surface.span(y, 0, width - 1, flagstones[Math.min(flagstones.length - 1, Math.floor((y-143) / 12))]);
  }
  for (const y of [144, 152, 164, 180, 201]) {
    surface.span(y, 0, width - 1, 0x171f32);
    surface.span(y+1, 0, width - 1, 0x434c62, 0.54);
  }
  for (let x = -98; x < 400; x += 54) surface.line(151+(x-151)*0.51, 143, x, height-1, 0x151d30, 0.84);
  for (let i=0; i<52; i++) {
    const x = (17 + i*93) % width, y = 146 + i*23 % 57;
    surface.span(y, x, x+i%5, 0x52647a, 0.36);
  }
}

const solid = [0x20283c, 0x48576e, 0x7889a3, 0xcbdaea, 0xbc9988, 0x765c7e];
const spectral = [0x263c59, 0x4f779b, 0x7eabc9, 0xb3dcef, 0x8bb7d5, 0x517eab];

function drawSwordsman(surface, x, y, t, opacity = 1, echo = false) {
  const [ink, metal, cloth, edge, skin, scarf] = echo ? spectral : solid;
  const dash = smooth(launch, impact, t);
  const settle = smooth(impact, 1.04, t);
  const footX = x - 12 + severEnd[0]*dash + 8*settle;
  const footY = y + 18 + severEnd[1]*dash + 62*settle;
  const bend = smooth(0.13, launch, t) * (1 - smooth(launch, impact, t));
  const airborne = smooth(launch, impact, t) * (1-smooth(impact,0.99,t));
  const hips = footY-15 + 4*bend, headY = hips-24 + 1*airborne, face = footX + 6*airborne;
  if (!echo) surface.ellipse(footX, Math.max(150, footY+1), 12, 1.7, 0x151c2d, 0.78*(1-0.56*airborne));
  const step = 5 + airborne*7, ankle = footY - airborne*5;
  surface.polygon([[footX-6, hips-4], [footX+3, hips-3], [footX-step+3, ankle-2], [footX-step-3, ankle-2]], ink, opacity);
  surface.polygon([[footX, hips-3], [footX+8, hips-5], [footX+step+5, footY-2], [footX+step-2, footY-2]], metal, opacity);
  surface.span(ankle-1, footX-step-4, footX-step+3, ink, opacity);
  surface.span(footY-1, footX+step-2, footX+step+6, cloth, opacity);
  surface.polygon([[face-7,headY+10], [face+5,headY+9], [footX+8,hips], [footX-8,hips]], metal, opacity);
  surface.polygon([[face-6,headY+11], [face+5,headY+10], [footX+5,hips-4], [footX-6,hips-2]], cloth, opacity);
  surface.span(hips-3, footX-7, footX+6, ink, opacity);
  surface.polygon([[face-6,headY+11], [face-9-airborne*14,headY+13-airborne*3],
    [face-22-airborne*6,headY+16], [face-6,headY+14]], scarf, opacity);
  surface.polygon([[face-7,headY+3], [face-3,headY], [face+4,headY], [face+8,headY+4],
    [face+5,headY+10], [face-6,headY+10]], ink, opacity);
  surface.span(headY+2, face-3, face+4, cloth, opacity);
  surface.span(headY+5, face+1, face+6, edge, opacity);
  surface.span(headY+7, face+3, face+6, skin, opacity);
  const handX = face + 9, handY = headY + 17 - airborne*6;
  surface.line(face+2,headY+13,handX,handY,cloth,opacity);
  surface.line(face+3,headY+14,handX,handY+1,metal,opacity);
  const tilt = 0.35 - 0.46*bend - 1.03*airborne;
  const tipX = handX+Math.cos(tilt)*23, tipY = handY+Math.sin(tilt)*23;
  surface.line(handX, handY+1, tipX, tipY+1, cloth, opacity);
  surface.line(handX, handY, tipX, tipY, edge, opacity);
  surface.line(handX-2,handY+3,handX+2,handY-3,skin,opacity);
}

// A diagonal mask uses the same normal as the rendered cut faces.
function buildDummy() {
  const sprite = new Surface(37, 58), x = 18, y = 18, foot = 55;
  sprite.line(x-2,foot,x-1,y-10,0x654c46);
  sprite.line(x,foot,x+1,y-10,0xa57f65);
  sprite.span(foot,x-9,x+8,0x654c46);
  sprite.span(foot-1,x-8,x+6,0x8d6c58);
  sprite.polygon([[x-10,y-9],[x+9,y-10],[x+11,y+2],[x+8,y+13],[x-8,y+14],[x-11,y+4]],0x9d785d);
  sprite.polygon([[x-8,y-8],[x+1,y-9],[x+2,y+12],[x-7,y+12]],0xb78f6d);
  sprite.span(y-4,x-13,x+13,0x604943);
  sprite.span(y-3,x-11,x+12,0xc19c7a);
  sprite.span(y+8,x-8,x+8,0x614c47);
  sprite.span(y+9,x-6,x+7,0xc2a487);
  sprite.ellipse(x,y-13,5,5,0xa9856b);
  sprite.span(y-15,x-3,x+3,0xcbad8a);
  sprite.span(y-12,x-4,x+4,0x684d45);
  const pixels = [];
  for (let row=0; row<sprite.height; row++) {
    for (let col=0; col<sprite.width; col++) {
      const i=(row*sprite.width+col)*4;
      if (sprite.data[i+3] === 0) continue;
      const u=col-x, v=row-y, [nx,ny]=severNormal;
      const color = sprite.data[i]<<16 | sprite.data[i+1]<<8 | sprite.data[i+2];
      pixels.push({ u, v, upper: u*nx+v*ny < 0, color });
    }
  }
  return pixels;
}

let dummy;
function drawDummy(surface, x, y, time) {
  dummy ??= buildDummy();
  const pose = severTargetPose(time);
  surface.ellipse(x, y+38, 13, 1.8, 0x141e30, 0.77);
  const echo = smooth(targetHit,0.78,time) * (1-smooth(0.86,1.22,time));
  if (echo > 0.01) {
    for (const p of dummy) {
      if (!(p.v%3)) surface.dot(x+p.u-6, y+p.v+2, 0x9db4ce, echo * 0.25);
    }
  }
  for (const p of dummy) {
    const [dx,dy] = p.upper ? pose.upper : pose.lower;
    surface.dot(x+p.u+dx, y+p.v+dy, p.color);
  }
}

function drawActors(surface, x, y, time) {
  drawDummy(surface, x+severTarget[0], y+severTarget[1], time);
  const ghost = smooth(launch,0.39,time) * (1-smooth(0.63,0.78,time));
  if (ghost > 0.008) {
    drawSwordsman(surface, x, y, Math.max(launch,time-0.09), ghost*0.18, true);
    drawSwordsman(surface, x, y, Math.max(launch,time-0.042), ghost*0.34, true);
  }
  drawSwordsman(surface, x, y, time);
}

export const timeSeverStage = {
  width: 304, height: 204, x: 40, y: 160, drawBackdrop, drawActors,
  markerLabels: { launch: '挥斩', impact: '斩痕闪现', targetHit: '切面错位', aftershock: '时间震荡', recover: '斩痕消退' },
};
