import { createParticleEmitter, drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const bindDistance = 74;
export const bindTiming = { launch: 0.45, impact: 0.75, targetHit: 0.92, aftershock: 1.22, recover: 1.45 };
const { launch, impact, targetHit, aftershock, recover } = bindTiming;
const duration = 4.60;
const tau = Math.PI * 2;
const ink = 0x183a32, stem = 0x2f6550, jade = 0x4f9b61, leafGreen = 0x85cd6d;
const rootGreen = 0x71b989, lime = 0xc1ee85, mint = 0x94f5cd;
const dustRamp = [0x45453d, 0x615f4d, 0x85816a];

export function boundDummyOffset(time) {
  if (time < targetHit) return 0;
  const age = time - targetHit, kick = 1 - smooth(0.04, 0.43, age);
  const echo = time >= aftershock ? (1 - smooth(aftershock, 1.57, time)) * 1.2 : 0;
  return Math.round(Math.sin(age * 65 + 0.45) * (3.8 * kick + echo));
}

const growthPaths = [
  { start: 0, span: 0.16, w: 8.3, points: [[-3, 0], [-1, -24], [22, -36], [49, -26], [64, -15], [77, -20]] },
  { start: 0.025, span: 0.16, w: 7.1, points: [[3, 0], [13, -11], [42, -13], [59, -6], [73, -12], [82, -25]] },
  { start: 0.042, span: 0.22, w: 6.6, points: [[2, 0], [0, -24], [19, -48], [45, -53], [63, -44], [77, -44]] },
  { start: 0.07, span: 0.44, w: 5.8, points: [[-4, 0], [-21, -12], [-46, -13], [-62, -27], [-56, -44], [-43, -43]] },
  { start: 0.10, span: 0.37, w: 4.6, points: [[0, -2], [-15, -19], [-24, -45], [-12, -61], [7, -64], [17, -55]] },
  { start: 0.15, span: 0.46, w: 4.3, points: [[24, -9], [40, 2], [67, 6], [97, -2], [110, -20], [103, -34]] },
  { start: 0.13, span: 0.42, w: 4.8, points: [[-1, -2], [-18, -8], [-34, 3], [-59, 7], [-87, -2], [-94, -15]] },
  { start: 0.19, span: 0.42, w: 4.5, points: [[39, -43], [46, -54], [55, -62], [73, -62], [88, -54]] },
];

// Smooth centerlines keep branches rounded even at the low sampling budget.
function curve(points, u) {
  const step = clamp(u) * (points.length - 1), i = Math.min(points.length - 2, Math.floor(step));
  const t = step - i;
  const a = points[Math.max(0, i - 1)], b = points[i], c = points[i + 1], d = points[Math.min(points.length - 1, i + 2)];
  const blend = k => (2*b[k] + (c[k]-a[k])*t + (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t + (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)*0.5;
  return [blend(0), blend(1)];
}

function leaf(surface, x, y, angle, length, opacity, fresh) {
  if (opacity <= 0.008 || length < 1) return;
  const alongX = Math.cos(angle), alongY = Math.sin(angle);
  const p = (u, v) => [x + (alongX*u - alongY*v)*length, y + (alongY*u + alongX*v)*length];
  const base = [x, y], left = p(0.36, -0.25), right = p(0.43, 0.27), tip = p(1, 0), spine = p(0.50, 0.025);
  surface.polygon([base, left, p(0.71, -0.20), tip, p(0.73, 0.19), right], ink, opacity);
  surface.polygon([base, left, p(0.71, -0.20), tip, spine], fresh ? mint : leafGreen, opacity);
  surface.polygon([base, spine, tip, right], jade, opacity);
  surface.line(...base, ...tip, fresh ? lime : rootGreen, opacity * 0.81);
}

function ground(back, front, time, cracks, stones, light) {
  const accumulate = smooth(0.025, 0.42, time);
  const rupture = time >= impact ? 1 - smooth(impact, 1.12, time) : 0;
  const remains = 0.78 * (1 - smooth(1.32, 4.32, time));
  const mound = accumulate * (1 - smooth(0.45, 0.74, time)) + rupture * 0.76;
  const blink = 0.71 + 0.29 * Math.sin(time * 23);
  const force = accumulate * (time < impact ? 0.34 + blink * 0.48 : remains);
  if (force < 0.004 && mound < 0.004) return;
  back.ellipse(1, 3, 32, 7, 0x222a2b, mound * 0.76 + remains * 0.22);
  front.glow(0, -1, 25, jade, light * (force * 0.60 + rupture * 0.81));
  for (const rock of stones) {
    const x = rock.x * (1 + rupture * 0.49), y = rock.y - mound * rock.height;
    front.polygon([[x-rock.width, y], [x-rock.width*0.58, y-rock.height*0.52],
      [x+rock.width*0.34, y-rock.height*0.63], [x+rock.width, y], [x+rock.width*0.60, y+2]], 0x54483b, mound * 0.93);
    front.span(y-1, x-rock.width*0.45, x+rock.width*0.5, 0x807057, mound * 0.77);
  }
  for (const crack of cracks) {
    trace(back, crack.map(([x, y]) => [x, y+1]), 0x1b2929, force);
    trace(front, crack, rootGreen, force * 0.57);
  }
  if (time < impact) {
    front.ellipse(0, 0, 1.5 + accumulate * 1.7, 1, lime, accumulate * blink);
    front.glow(0, 1, 14, lime, light * accumulate * blink * 0.54);
  } else if (rupture > 0.08) {
    front.ellipse(0, -2, 3 + rupture*3, 1.4+rupture*2, mint, rupture * 0.87);
    glint(front, 0, -3, 4+rupture*6, lime, rupture*0.62);
  }
}

function rootPath(surface, points, fraction, opacity, color) {
  if (fraction <= 0 || opacity <= 0.004) return;
  const length = points.length - 1, end = clamp(fraction) * length;
  for (let i = 0; i < end; i++) {
    const [x, y] = points[i], [tx, ty] = points[i + 1], f = Math.min(1, end - i);
    surface.line(x, y, x+(tx-x)*f, y+(ty-y)*f, color, opacity * (1 - i / points.length * 0.48));
  }
}

function drawRoots(back, time, roots, pulse, light) {
  const fade = 1 - smooth(2.02, duration, time);
  if (time < impact || fade <= 0.004) return;
  for (const root of roots) {
    const progress = smooth(impact + root.delay, 1.51 + root.delay*0.34, time);
    const f = progress * (1 - smooth(3.31, duration, time));
    rootPath(back, root.points, f, fade * (0.41 + pulse*0.21), rootGreen);
    rootPath(back, root.fork, clamp(f*2 - 0.88), fade * (0.29 + pulse*0.10), jade);
  }
  back.glow(0, 2, 36, jade, light * fade * pulse * 0.38);
  back.glow(bindDistance, 0, 25, rootGreen, light * fade * pulse * 0.23);
}

function drawVine(front, time, vine, pulse, light, segments) {
  const start = impact + vine.start;
  if (time < start) return 0;
  const drop = smooth(vine.recede, 4.58 + vine.fold, time);
  const power = 1 - smooth(recover, 4.39 + vine.fold*0.3, time);
  const growth = 0.12 + 0.88 * smooth(start, start+vine.span, time);
  const length = growth * (1-drop);
  if (length < 0.006 || power <= 0.006) return 0;
  const grip = vine.primary ? boundDummyOffset(time) : 0;
  const at = u => {
    const [x, y] = curve(vine.points, u);
    return [x + grip * smooth(0.62, 1, u),
      y + 2.1 * Math.sin(time*6.7 + u*8 + vine.phase) * Math.sin(Math.PI*u) * (0.36 + pulse*0.64)];
  };
  const width = s => vine.w * (1-0.69*s) * (0.39 + 0.61*power);
  drawRibbon(front, { point: s => at(s*length), width: s => width(s) + 2.4*power, segments, color: ink, opacity: power });
  drawRibbon(front, { point: s => at(s*length), width, segments, color: stem, edge: jade, opacity: power * 0.97 });
  drawRibbon(front, { point: s => {
    const [x, y] = at(s*length);
    return [x, y-width(s)*0.16];
  }, width: s => width(s)*0.23, segments, color: jade, opacity: power * 0.71 });
  const travelling = (time - start) * (0.92 + vine.seed * 0.21);
  for (let i = 0; i < 3; i++) {
    const u = (travelling + i*0.33) % 1;
    if (u > length || u < 0.045) continue;
    const [x, y] = at(u), [lx, ly] = at(Math.max(0, u-0.055));
    front.line(lx, ly, x, y, mint, power * (0.44 + pulse*0.49));
    front.glow(x, y, 6 + pulse*4, mint, power * light * (0.17 + pulse*0.33));
  }
  let count = 0;
  for (const bud of vine.buds) {
    if (bud.u > length) continue;
    const [x, y] = at(bud.u), [tx, ty] = at(bud.u + 0.04);
    const angle = Math.atan2(ty-y, tx-x) + bud.angle;
    const open = smooth(bud.u-0.03, bud.u+0.14, growth);
    const alpha = open * power * (1 - smooth(1.77 + bud.fade, 3.46 + bud.fade, time));
    leaf(front, x, y, angle, bud.size * (0.4 + 0.6*open), alpha, bud.fresh);
    if (alpha > 0.10) {
      front.dot(x, y, lime, alpha * 0.62);
      count++;
    }
  }
  const [tipX, tipY] = at(length);
  const tipPower = power * (0.52 + 0.48*pulse);
  front.dot(tipX, tipY, lime, tipPower);
  leaf(front, tipX, tipY, -0.82 + Math.sin(vine.phase + time*6)*0.55, vine.w*0.86+2, power*0.74, true);
  front.glow(tipX, tipY, 9, leafGreen, light * tipPower * 0.61);
  return count;
}

function drawCoils(back, front, time, pulse, light, samples) {
  const tight = smooth(0.82, targetHit, time);
  const out = smooth(2.03, 4.19, time), fade = (1-out) * (1 - smooth(1.46, 3.92, time));
  if (tight <= 0 || fade <= 0.004) return;
  const rootX = bindDistance + boundDummyOffset(time);
  for (let strand = 0; strand < 2; strand++) {
    const height = (48 - strand*7) * tight * (1-out);
    const angle = (u) => u * (tau*(strand ? 1.77 : 2.36)) * tight - 1.42 + strand*2.1;
    const along = (u) => {
      const a = angle(u);
      const w = 12.4 + 6.7*(1-tight) - 2*u;
      return [rootX + Math.cos(a)*w, -7 - height*u + Math.sin(a)*3.2*tight];
    };
    for (let i = 0; i < samples; i++) {
      const u = i / samples, a = along(u), b = along((i+1) / samples);
      const near = Math.sin(angle((i+0.5)/samples)) >= 0, target = near ? front : back;
      const grip = Math.sin(u*17 - time*14) > 0.28;
      const wide = 3.1 - u*0.72;
      target.polygon([[a[0],a[1]-wide], [b[0],b[1]-wide], [b[0],b[1]+wide], [a[0],a[1]+wide]], ink, fade*tight*0.92);
      target.line(a[0], a[1], b[0], b[1], near ? jade : stem, fade*tight);
      target.line(a[0], a[1]-1.1, b[0], b[1]-1.1, grip ? mint : leafGreen, fade*tight*(0.34 + 0.62*pulse));
    }
    const [x,y] = along(1);
    leaf(front, x, y, strand ? -2.6 : -0.74, 10, fade*tight, true);
  }
  front.glow(rootX, -25, 23, mint, light * fade * tight * (0.16 + pulse * 0.72));
}

function scatter(back, front, time, spores, puffs, light) {
  let count = 0;
  for (const [i, p] of puffs.entries()) {
    const u = (time-p.start)/p.life;
    if (u <= 0 || u >= 1) continue;
    const x = p.x + p.sway*u, y = 2-p.lift*u, size = p.size*(0.6+u*0.83);
    const opacity = Math.sin(Math.PI*u)*0.27;
    drawPixelSmoke(back, x, y, { rx: size, ry: size * 0.55, colors: dustRamp,
      opacity: opacity * 1.22, age: u, variant: i, shear: p.sway * 0.19 });
    count++;
  }
  for (const p of spores) {
    const u = (time-p.start)/p.life;
    if (u <= 0 || u >= 1) continue;
    const x = p.x + p.dx*u + Math.sin(p.phase + u*6.3)*5;
    const y = p.y - Math.sin(Math.PI*u*0.88)*p.lift + u*u*14;
    const opacity = Math.sin(Math.PI*u)**0.72;
    if (p.size > 2) leaf(front, x, y, p.phase+u*5, p.size*(0.69+opacity*0.31), opacity*0.73, true);
    else front.dot(x, y, p.color, opacity*0.81);
    if (p.size > 3.3) front.glow(x, y, 5, leafGreen, light * opacity * 0.27);
    count++;
  }
  return count;
}

function createRoots(random, count) {
  return Array.from({ length: count }, (_, i) => {
    const atTarget = i % 4 === 3, side = i % 2 ? 1 : -1, center = atTarget ? bindDistance : 0;
    const reach = (atTarget ? 12 : 22) + random() * (atTarget ? 32 : 76);
    const down = (random() - 0.19) * 30, sign = random() > 0.5 ? 1 : -1;
    const points = Array.from({ length: 6 }, (_, j) => {
      const u = j / 5;
      return [center + side*reach*u, 2 + down*u + (random()-0.5)*10*u];
    });
    const [x,y] = points[2];
    const fork = [[x,y], [x+side*9,y+5*sign], [x+side*15,y+4*sign], [x+side*23,y+11*sign]];
    return { points, fork, delay: random()*0.21 };
  });
}

export const verdantBind = {
  title: '灵藤锁缚',
  english: 'Verdant Bind',
  duration,
  loop: false,
  previewTime: 1.04,
  events: [
    { at: launch, name: 'launch', data: { x: 0, y: 0 } },
    { at: impact, name: 'impact', data: { x: 0, y: 0 } },
    { at: targetHit, name: 'targetHit', data: { x: bindDistance, y: 0 } },
    { at: aftershock, name: 'aftershock', data: { x: bindDistance, y: 0 } },
    { at: recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const vines = growthPaths.map((vine, i) => ({
      ...vine, phase: random()*tau, seed: random(), recede: 1.89 + random()*0.78, fold: random()*0.23, primary: i < 3,
      buds: Array.from({ length: low ? 4 : 8 }, (_, j) => ({
        u: 0.18 + j*(low ? 0.19 : 0.096) + random()*0.029,
        angle: (j % 2 ? 1 : -1)*(0.66+random()*0.76), size: 4.6 + random()*8,
        fresh: random() > 0.48, fade: random()*0.51,
      })),
    }));
    const roots = createRoots(random, low ? 13 : 23);
    const cracks = Array.from({ length: 6 }, (_, i) => {
      const sx = i % 2 ? 1 : -1, y = (i - 2.5) * 2.1;
      return [[0, 0], [5*sx, y*0.42], [11*sx, y*0.55+2], [18*sx, y+1], [(23 + random()*8)*sx, y]];
    });
    const stones = Array.from({ length: 9 }, (_, i) => ({
      x: (i-4)*5, y: (random()-0.24)*6, width: 2.1+random()*4.6, height: 2.5+random()*5.2,
    }));
    const spores = Array.from({ length: low ? 29 : 62 }, (_, i) => {
      const near = i % 3 === 0, x = near ? bindDistance : (random()-0.56)*148;
      const early = i % 4 === 0;
      return { x: x+(random()-0.5)*23, y: -13-random()*38, dx: (random()-0.5)*56, lift: 7 + random()*23,
        start: early ? 0.94+random()*0.24 : 1.13+random()*1.41,
        life: 0.44+random()*0.96, phase: random()*tau, size: random()>0.63 ? 3+random()*3.4 : 1,
        color: random()>0.52 ? mint : lime };
    });
    const puffs = Array.from({ length: low ? 8 : 15 }, (_, i) => ({
      x: (i % 4 === 0 ? bindDistance*0.88 : 0)+(random()-0.5)*48,
      start: impact + random()*0.41, life: 0.53 + random()*0.79, sway: (random()-0.5)*46,
      lift: 2 + random()*16, size: 3 + random()*10,
    }));
    const dirt = createParticleEmitter(random, {
      count: low ? 14 : 31,
      spawn(r, i) {
        const first = i < 7;
        return { at: impact + (first ? 0 : r()*0.22), lifetime: 0.58 + r()*0.52, x: (r()-0.5)*27,
          y: first ? -2-r()*10 : 0,
          vx: (r()-0.5)*110, vy: -42-r()*81, floor: 2, gravity: 318, restitution: 0.24, friction: 0.64,
          data: { size: r()>0.64 ? 2 : 1, warm: r()>0.5 } };
      },
      draw(surface, p) {
        const opacity = 1-smooth(0.55, 1, p.progress), x = Math.round(p.x);
        surface.span(p.y, x, x+p.data.size-1, p.data.warm ? 0x847456 : 0x54483c, opacity);
      },
    });
    return (front, time, context) => {
      const back = context?.back ?? front;
      const lock = time >= targetHit ? 1-smooth(targetHit, 1.22, time) : 0;
      const echo = time >= aftershock ? (1-smooth(aftershock, 1.63, time))*0.52 : 0;
      const pulse = Math.max(lock, echo);
      drawRoots(back, time, roots, pulse, glow);
      ground(back, front, time, cracks, stones, glow);
      drawCoils(back, front, time, pulse, glow, low ? 29 : 45);
      let count = 0;
      for (const vine of vines) count += drawVine(front, time, vine, pulse, glow, low ? 19 : 29);
      count += scatter(back, front, time, spores, puffs, glow);
      dirt(front, time, context);
      context?.countParticles(count);
    };
  },
};
