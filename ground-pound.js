// Ground slam choreography adapted from pixelfx and Sprite Fusion (MIT). See THIRD-PARTY-NOTICES.md.
import { clamp, smooth } from './effect-drawing.js';
import { createReferencePainter, ReferenceRandom as Rng, mix, hex, white as WHITE } from './reference-painter.js';
import { stone, star, makeCracks, drawCracks, frontCrescent, rock, rockShape, SOOT, band } from './ground-pound-geometry.js';
import { GroundParticles as Particles, GroundRocks as Bits, SlamLights as Lights, P } from './ground-pound-particles.js';
import { createSimulation } from './simulation.js';
import { LightBuffer } from './lighting.js';

const TAU = 2 * Math.PI;
const easeOut = u => 1 - (1 - u) ** 3;
const SLAM_DURATION = 3.2;
const STEP = 1 / 120;
export const groundPoundImpact = 0.62;
const impactTick = Math.ceil(groundPoundImpact / STEP);
const defaultPalette = [0x2a1712, 0x5e2c1c, 0xa4502a, 0xe8893a, 0xffc764, 0xfff0b4, 0xffffff];

export const groundPound = {
  title: '大地重砸',
  english: 'Ground pound',
  duration: groundPoundImpact + SLAM_DURATION,
  loop: false,
  previewTime: 0.87,
  events: [
    { at: 0.03, name: 'launch' },
    { at: groundPoundImpact, name: 'impact', data: { hitStop: 0.2, shakeDuration: 0.5, shakeAmplitude: 4 } },
    { at: 0.76, name: 'targetHit', data: { targetX: 80, hitStop: 0.04, push: 3, lift: -8 } },
    { at: 1.06, name: 'aftershock', data: { targetX: 80, push: -1.6, lift: -8 } },
    { at: 2.42, name: 'recover' },
  ],
  createRandom(seed) {
    const random = new Rng(seed);
    return Object.assign(random.next.bind(random), { seed: random.state });
  },
  build(random, { palette = defaultPalette, stone = 0x4a3f69, reach = 104, light = 1 } = {}) {
    if (!Array.isArray(palette) || palette.length === 0) throw new RangeError('ground pound palette');
    if (!Number.isFinite(reach) || reach < 7 || !Number.isFinite(light) || light < 0) {
      throw new RangeError('ground pound reach or light');
    }
    const slam = createGroundSlam({ seed: random.seed ?? random() * 4294967296, palette, stone, reach });
    const simulation = createSimulation({
      initial: slam.snapshot(),
      step: STEP,
      duration: SLAM_DURATION,
      advance(state, dt) {
        slam.restore(state);
        slam.update(dt);
        return slam.snapshot();
      },
    });
    let scratchLight;
    return (surface, time, context) => {
      if (time < groundPoundImpact) return;
      const tick = Math.max(0, Math.floor(time / STEP + 1e-9) - impactTick);
      const state = simulation.at(tick * STEP);
      slam.restore(state);
      let buffer = light > 0 ? surface.light : null;
      const flat = light > 0 && !buffer;
      if (flat) {
        if (scratchLight?.width !== surface.width || scratchLight.height !== surface.height) {
          scratchLight = new LightBuffer(surface.width, surface.height);
        }
        buffer = scratchLight;
        buffer.clear();
      }
      slam.drawBack(createReferencePainter(context?.back ?? surface, buffer, light));
      slam.draw(createReferencePainter(surface, buffer, light));
      if (flat) buffer.forEach((x, y, color) => surface.addLight(x - surface.x, y - surface.y, color));
      context?.countParticles(state.particles.filter(p => p.delay <= 0).length + state.rocks.length);
    };
  },
};

function fit(colors, count) {
  const ramp = colors.map(hex);
  return Array.from({ length: count }, (_, i) => ramp[Math.round(i * (ramp.length - 1) / (count - 1))]);
}

const WAVE = 0.6; // seconds for the shock fronts to run out

// the dent: the floor's edge caves into a shallow dish, its bottom glowing while hot, lips thrown up either side
function crater(p, st, hot, C, k) {
  for (let x = -12; x <= 11; x++) {
    const q = Math.abs(x + 0.5) / 12, dep = Math.round(2.6 * (1 - q * q));
    if (q < 0.84) {
      for (let y = 0; y < dep; y++) p.dot(x, y, SOOT, k);
      p.dot(x, dep, hot > 0.5 ? C[5] : hot > 0.2 ? C[4] : st.lip, k);
    } else {
      p.dot(x, -1, q > 0.93 ? st.light : st.lip, k);
      if (q < 0.9) p.dot(x, -2, st.light, k * 0.8);
    }
  }
}

function createGroundSlam(o) {
  const C = fit(o.palette, 7), st = stone(o.stone), REACH = o.reach, R = new Rng(o.seed), D = SLAM_DURATION;
  const ps = new Particles({ rng: R, sparks: [C[6], C[5], C[4], C[3]] });
  const bits = new Bits(), lights = new Lights(), HOT = [WHITE, C[5], C[4], C[3]];
  const dustLit = mix(st.dust, WHITE, 0.2), cracks = makeCracks(R, 10, { len: [22, 58], dive: 0.55, maxY: 22, forks: 0.7, x0: [2, 9] });
  const front = (t) => 7 + (REACH - 7) * easeOut(clamp((t - 0.015) / WAVE));
  const heat = (t) => Math.pow(clamp(1 - t / 0.8), 1.4);
  const crest = (u) => [6 + 28 * Math.pow(1 - u, 0.75), 1.5 + 5 * Math.pow(1 - u, 0.9)]; // a front's height and thickness
  // the flash: a flat half-star hugging the floor, long rays along it, short ones up
  const burst = [
    { a: -0.07, len: R.range(34, 40), w: 1.9 }, { a: Math.PI + 0.07, len: R.range(34, 40), w: 1.9 },
    { a: -0.42 + R.range(-0.08, 0.08), len: R.range(15, 20), w: 1.5 }, { a: -Math.PI + 0.42 + R.range(-0.08, 0.08), len: R.range(15, 20), w: 1.5 },
    { a: -Math.PI / 2 + R.range(-0.15, 0.15), len: R.range(18, 24), w: 1.7 },
    { a: -1.05 + R.range(-0.1, 0.1), len: R.range(10, 14), w: 1.2 }, { a: -Math.PI + 1.05 + R.range(-0.1, 0.1), len: R.range(10, 14), w: 1.2 },
  ];
  // embers caught in the cracks, flickering as they cool
  const embers = [];
  for (const c of cracks)
    for (const [x, y, d] of c.pts) if (d > 3 && d < 32 && R.chance(0.25)) embers.push({ x, y, d, life: R.range(0.8, 2.2), ph: R.range(0, TAU) });

  // contact: light floods out, sparks fly off the stone and skitter along the floor
  lights.add(0, -12, 96, C[4], 0.6, 0.6);
  lights.add(0, -4, 50, WHITE, 0.9, 0.14);
  for (let i = 0; i < 56; i++) {
    const low = i < 14, s = R.sign(), a = low ? (s > 0 ? -R.range(0.04, 0.6) : Math.PI + R.range(0.04, 0.6)) : -Math.PI / 2 + R.range(-1.15, 1.15);
    const sp = low ? R.range(150, 380) : R.range(200, 500);
    ps.spawn(P.SPARK, R.range(-4, 4), -1, Math.cos(a) * sp, Math.sin(a) * sp, low ? R.range(0.2, 0.5) : R.range(0.25, 0.65), WHITE, 1, low ? 0 : R.range(0, 0.05));
  }
  // rocks erupt from the dent: three heavy ones that barely clear it, the rest thrown high
  for (let i = 0; i < 20; i++) {
    const s = i < 3 ? 4 : R.int(1, 3), a = -Math.PI / 2 + R.range(-0.5, 0.5), sp = s > 3 ? R.range(110, 190) : R.range(170, 380) * (s > 2 ? 0.8 : 1);
    bits.add({ x: R.range(-7, 7), y: -2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 1, drag: 0.4, bounce: 0.38, life: R.range(1.9, 2.7), a: R.range(0, TAU), va: R.range(-14, 14), s, pts: rockShape(R), pvy: 0 });
  }
  // grit: a fan of floor bits that bounce once and settle
  for (let i = 0; i < 110; i++) {
    const u = R.range(-1, 1), a = -Math.PI / 2 + u * 0.65, sp = R.range(110, 380) * (1 - 0.35 * Math.abs(u));
    ps.spawn(P.GRIT, u * 6, -1, Math.cos(a) * sp, Math.sin(a) * sp, R.range(1, 2.2), R.pick([st.light, st.body, st.body, st.shade, st.shade, st.lip]), R.chance(0.35) ? 2 : 1);
  }
  // the dust cloud: a column that shoots up and spreads at the top, lit on top, and a heavy bank at its foot
  for (let i = 0; i < 28; i++) {
    const core = i < 14, s = R.sign();
    ps.spawn(P.SMOKE, core ? R.range(-5, 5) : s * R.range(4, 12), -R.range(2, 10), core ? R.range(-12, 12) : s * R.range(14, 38), -R.range(50, 130) * (core ? 1 : R.range(0.3, 0.6)), R.range(1.9, 2.7), R.chance(0.35) ? dustLit : st.dust, core ? R.range(4.5, 9) : R.range(4, 7.5), R.range(0.02, 0.22));
  }
  for (let i = 0; i < 10; i++) {
    const s = R.sign();
    ps.spawn(P.SMOKE, s * R.range(2, 14), -R.range(2, 6), s * R.range(20, 70), -R.range(4, 20), R.range(1.4, 2.3), st.dust, R.range(6, 9), R.range(0, 0.08));
  }
  // fine dust settling out of the cloud while it hangs
  for (let i = 0; i < 26; i++)
    ps.spawn(P.FLAKE, R.range(-22, 22), -R.range(14, 80), R.range(-12, 12), R.range(-10, 4), R.range(1.2, 2), R.chance(0.5) ? st.lip : dustLit, R.range(0.5, 1.2), R.range(0.25, 1));

  let t = 0;
  let acc = [R.next(), R.next()];
  const ring = (p, back) => {
    const u = clamp((t - 0.015) / (WAVE + 0.1));
    if (t < 0.015 || u >= 0.9) return;
    band(p, 0, 0.5, front(t) + 1, 0.16, Math.max(1, 4 * Math.pow(1 - u, 0.8)), u < 0.55 ? 1.1 : (0.9 - u) / 0.35,
      u < 0.35 ? [C[3], C[4], C[5], C[6]] : [st.body, st.light, C[4], C[5]], (g) => (Math.sin(g) < 0) === back, t < 0.09);
  };
  const fronts = (p) => {
    const u = clamp((t - 0.03) / (WAVE + 0.16));
    if (t < 0.03 || u >= 1) return;
    const fr = front(t), [h, w] = crest(u), k = u < 0.7 ? 1 : (1 - u) / 0.3;
    const cols = u < 0.14 ? [WHITE, C[6], C[5]] : u < 0.34 ? [C[6], C[5], C[4]] : u < 0.55 ? [C[5], C[4], st.lip] : [st.lip, st.light, st.dust];
    for (const s of [-1, 1]) {
      frontCrescent(p, s * fr, s, h, w, cols, k);
      p.glow(s * fr, -h * 0.3, 8 + h * 0.7, C[4], 0.5 * (1 - u) * k);
    }
  };

  return {
    snapshot() {
      return { t, acc, seed: R.state, particles: ps.list, particleTime: ps.t, rocks: bits.list, lights: lights.list };
    },
    restore(state) {
      ({ t, acc } = state);
      R.state = state.seed;
      ps.list = state.particles;
      ps.t = state.particleTime;
      bits.list = state.rocks;
      lights.list = state.lights;
    },
    update(dt) {
      t += dt;
      // dust kicked up behind the racing fronts, and spray off their crests
      const u = clamp((t - 0.015) / WAVE);
      if (u > 0 && u < 1) {
        const fr = front(t), [h] = crest(u);
        for (let k = 0; k < 2; k++) {
          const s = k ? 1 : -1;
          for (acc[k] += dt * 120 * (1 - u * 0.7); acc[k] > 1; acc[k]--) {
            ps.spawn(P.SMOKE, s * (fr - R.range(1, 7)), -R.range(0.5, 3), s * R.range(15, 70) * (1 - u), -R.range(2, 12), R.range(1, 2.1), R.chance(0.3) ? dustLit : st.dust, R.range(2.5, 6.5) * (1 - 0.4 * u), 0);
            if (R.chance(0.5)) ps.spawn(P.DUST, s * (fr - R.range(0, 3)), -R.range(0.3, 0.9) * h, s * R.range(-15, 25), -R.range(8, 35), R.range(0.3, 0.6), R.chance(0.5) ? dustLit : st.dust, R.range(1.2, 2.4));
            if (R.chance(0.4)) ps.spawn(P.GRIT, s * fr, -1, s * R.range(10, 60), -R.range(40, 140) * (1 - u), R.range(0.5, 1), R.pick([st.light, st.body, st.lip]), 1);
            if (u < 0.45 && R.chance(0.2)) ps.spawn(P.SPARK, s * fr, -1, s * R.range(60, 200), -R.range(30, 160), R.range(0.12, 0.3));
          }
        }
      }
      for (const b of bits.list) b.pvy = b.vy;
      bits.update(dt);
      // rocks that land hard kick up dust
      for (const b of bits.list)
        if (b.pvy > 70 && b.vy <= 0) {
          const n = b.pvy > 200 ? 3 : 2;
          for (let i = 0; i < n; i++) ps.spawn(P.DUST, b.x + R.range(-1.5, 1.5), -0.5, R.sign() * R.range(8, 35), -R.range(2, 16), R.range(0.3, 0.65), st.dust, R.range(1.3, 2.4) * (0.7 + b.s * 0.25));
          b.pvy = 0;
        }
      ps.update(dt);
      lights.update(dt);
    },
    drawBack(p) {
      const fade = 1 - smooth(D - 0.9, D - 0.15, t), H = heat(t);
      if (t > 0.02) crater(p, st, H, C, fade);
      drawCracks(p, cracks, (c) => c.len * easeOut(clamp((t - c.t0) / 0.1)), (d) => H * clamp(1.2 - d / 40), HOT, SOOT, st.light, fade);
      for (const e of embers) {
        const k = 1 - (t - 0.1) / e.life;
        if (t < 0.1 || k <= 0) continue;
        const f = 0.6 + 0.4 * Math.sin(t * 23 + e.ph);
        p.px(e.x, e.y, k * f > 0.55 ? C[5] : k * f > 0.25 ? C[4] : C[3]);
        p.glow(e.x, e.y, 4, C[4], 0.35 * k * f);
      }
      ring(p, true);
      ps.draw(p, "back");
    },
    draw(p) {
      ring(p, false);
      fronts(p);
      for (const b of bits.list) rock(p, b, st);
      ps.draw(p, "front");
      if (t < 0.035) {
        p.ellipse(0, 0, 30, 4.5, (d) => (d > 0.8 ? C[4] : d > 0.5 ? C[6] : WHITE));
        star(p, 0, -1, burst, 1, 1, [C[4], C[6], WHITE, WHITE]);
      } else if (t < 0.07) star(p, 0, -1, burst, 1.25, 0.5, [C[3], C[5], C[6], WHITE]);
      // the floor flashes along its length, then the dent glows while the cracks are hot
      if (t < 0.14) p.glowLine(-80, 0, 80, 0, 10, C[5], 0.55 * (1 - t / 0.14));
      const H = heat(t);
      if (H > 0) p.glow(0, 1, 46, C[4], 0.35 * H);
      lights.draw(p);
    },
  };
}
