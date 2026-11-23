import { clamp, glint, groundArc, smooth, trace } from './effect-drawing.js';

const tau = 2 * Math.PI;

const ice = {
  shadow: 0x1c3263, dark: 0x285995, blue: 0x459bd5,
  cyan: 0x7be0f7, pale: 0xc7f5ff, white: 0xf1fcff
};

function drawCrystal(surface, shard, growth, opacity) {
  const { x, y, lean, height, width } = shard;
  const rise = height * growth;
  const w = width * Math.sqrt(growth);
  const tip = [x + lean * growth, y - rise];
  const left = [x - w + lean * growth * 0.34, y - rise * 0.57];
  const right = [x + w + lean * growth * 0.54, y - rise * 0.44];
  const ridge = [x + lean * growth * 0.43, y - rise * 0.42];
  const footLeft = [x - w * 0.54, y - 2 * growth];
  const footRight = [x + w * 0.65, y];
  const footRidge = [x - w * 0.03, y + growth];

  surface.polygon([tip, right, footRight, footRidge, ridge], ice.dark, opacity);
  surface.polygon([tip, left, footLeft, footRidge, ridge], ice.blue, opacity);
  surface.polygon([tip, left, ridge], ice.pale, opacity);
  surface.polygon([left, footLeft, footRidge, ridge], ice.cyan, opacity);
  surface.polygon([tip, right, ridge], ice.blue, opacity);
  trace(surface, [footLeft, left, tip, ridge, footRidge], ice.white, opacity * 0.86);
  surface.line(...tip, ...right, ice.cyan, opacity);
  surface.line(...right, ...footRight, ice.shadow, opacity);
  surface.line(left[0] + w * 0.25, left[1] + rise * 0.12,
    ridge[0] - w * 0.15, ridge[1] + rise * 0.24, ice.white, opacity * 0.46);
}

export const frostburst = {
  title: '霜晶爆发',
  english: 'Frostburst',
  duration: 1.7,
  loop: false,
  previewTime: 0.52,

  build(random) {
    // Draw from the far side of the impact to the near edge.
    const crystals = [
      [-9, -6, -9, 31, 5], [10, -6, 15, 34, 6],
      [-16, -2, -20, 23, 6], [17, 0, 21, 22, 6],
      [0, 1, 4, 48, 9], [-10, 5, -13, 30, 7], [10, 8, 11, 24, 6]
    ].map(([x, y, lean, height, width], index) => ({
      x, y, lean: lean + (random() - 0.5) * 8,
      height: height * (0.9 + random() * 0.2), width, delay: 0.23 + index * 0.024
    }));
    const fragments = Array.from({ length: 33 }, () => ({
      delay: 0.28 + random() * 0.24, lifetime: 0.45 + random() * 0.69,
      x: (random() - 0.5) * 20, dx: (random() - 0.5) * 90,
      lift: 18 + random() * 48, size: 0.8 + random() * 2.5, spin: random() * tau
    }));

    return (surface, time) => {
      const charge = smooth(0, 0.23, time);
      const fade = 1 - smooth(0.98, 1.68, time);
      const wave = smooth(0.22, 0.81, time);
      const spray = smooth(0.22, 0.31, time) * (1 - smooth(0.38, 0.85, time));
      surface.halo(0, -11, 43, 24, ice.blue, charge * fade * (0.45 + 0.65 * spray));
      surface.ellipse(0, 0, 15 + 16 * wave, 3 + 4 * wave, ice.dark, charge * fade * 0.28);

      const radius = 9 + wave * 43;
      const ripple = charge * (1 - smooth(0.43, 0.92, time));
      groundArc(surface, radius, Math.PI, Math.PI, ice.blue, ripple * 0.75);
      groundArc(surface, radius * 0.8, Math.PI * 1.16, Math.PI * 0.64, ice.cyan, ripple * 0.5);
      for (const direction of [-1, 1]) {
        const reach = 5 + wave * 33;
        trace(surface, [[0, 1], [direction * reach * 0.39, 3],
          [direction * reach * 0.58, 1], [direction * reach, 6]], ice.cyan, ripple);
      }

      for (const shard of crystals) {
        const growth = 1 - (1 - clamp((time - shard.delay) / 0.24)) ** 3;
        if (growth > 0) drawCrystal(surface, shard, growth, fade);
      }

      groundArc(surface, radius, 0.03, 1.14, ice.pale, ripple);
      groundArc(surface, radius, 1.56, 1.45, ice.cyan, ripple);
      glint(surface, -3, -15, 1 + 10 * spray, ice.white, spray * 0.8);

      for (const fleck of fragments) {
        const phase = (time - fleck.delay) / fleck.lifetime;
        if (phase < 0 || phase >= 1) continue;
        const x = fleck.x + fleck.dx * phase;
        const y = -5 - fleck.lift * phase * (1.55 - phase);
        const alpha = Math.sin(Math.PI * phase) * fade;
        const size = fleck.size * (1 - 0.62 * phase);
        const bearing = fleck.spin + phase * 4;
        surface.line(x, y, x + Math.cos(bearing) * size, y + Math.sin(bearing) * size, ice.cyan, alpha);
        surface.dot(x, y, ice.white, alpha);
      }
    };
  }
};

const storm = {
  blue: 0x5153c6, violet: 0x8d86f2, sky: 0x9edeff,
  white: 0xf4ffff, ember: 0xffcf86
};

function buildBolt(random, startX, startY, endX, endY, steps, spread) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const phase = index / steps;
    const jag = index === 0 || index === steps ? 0 : (random() - 0.5) * spread;
    return [startX + (endX - startX) * phase + jag, startY + (endY - startY) * phase];
  });
}

export const thunderstrike = {
  title: '分叉雷击',
  english: 'Thunderstrike',
  duration: 1.25,
  loop: false,
  previewTime: 0.35,

  build(random) {
    const bolt = buildBolt(random, -14 + random() * 28, -72, 0, 0, 9, 26);
    const echo = buildBolt(random, 10 + random() * 26, -68, 0, 0, 8, 27);
    const branches = [
      [2, -33, -44], [4, 34, -26], [6, -24, -10], [7, 21, -6]
    ].map(([node, x, y]) => buildBolt(random, ...bolt[node], x + (random() - 0.5) * 13, y, 4, 13));
    const sparks = Array.from({ length: 29 }, (_, index) => ({
      delay: random() * 0.11, dx: (random() - 0.5) * 109,
      lift: 11 + random() * 30, life: 0.24 + random() * 0.48,
      color: index % 4 === 0 ? storm.ember : storm.sky
    }));

    return (surface, time) => {
      const lead = smooth(0, 0.22, time) * (1 - smooth(0.25, 0.32, time));
      const impact = smooth(0.27, 0.32, time) * (1 - smooth(0.36, 0.50, time));
      const aftershock = smooth(0.48, 0.52, time) * (1 - smooth(0.55, 0.65, time));
      const groundGlow = smooth(0.23, 0.34, time) * (1 - smooth(0.46, 1.16, time));
      const wave = smooth(0.31, 0.93, time);
      surface.halo(0, -5, 45, 14, storm.violet, groundGlow * 1.3);
      surface.halo(0, -36, 31, 35, storm.blue, impact * 0.86 + aftershock * 0.46);
      groundArc(surface, 7 + 45 * wave, Math.PI, Math.PI, storm.violet, groundGlow * 0.65);
      groundArc(surface, 9 + 39 * wave, 0.12, 2.9, storm.sky, groundGlow * 0.8);

      glint(surface, 0, -2 - lead * 7, 1 + lead * 3, storm.sky, lead);
      if (impact > 0) {
        for (const branch of branches) {
          trace(surface, branch, storm.blue, impact * 0.83, 1);
          trace(surface, branch, storm.sky, impact * 0.79);
        }
        trace(surface, bolt, storm.blue, impact * 0.7, -2);
        trace(surface, bolt, storm.violet, impact, -1);
        trace(surface, bolt, storm.sky, impact, 1);
        trace(surface, bolt, storm.white, impact);
      }
      if (aftershock > 0) {
        trace(surface, echo, storm.violet, aftershock * 0.56, 1);
        trace(surface, echo, storm.sky, aftershock * 0.86);
      }
      const flash = impact + aftershock * 0.45;
      surface.ellipse(0, 0, 17 * flash, 2.5 * flash, storm.sky, flash * 0.86);
      glint(surface, 0, -1, 14 * flash, storm.white, flash);

      for (const spark of sparks) {
        const phase = (time - 0.31 - spark.delay) / spark.life;
        if (phase < 0 || phase >= 1) continue;
        const x = spark.dx * phase;
        const y = -spark.lift * phase * (1.45 - phase) + 5 * phase;
        const alpha = (1 - phase) ** 1.4;
        surface.line(x - spark.dx * 0.08 * (1 - phase), y + 2, x, y, spark.color, alpha);
        surface.dot(x, y, storm.white, alpha * 0.76);
      }
    };
  }
};

const mend = { jade: 0x32ae88, mint: 0x88e9b6, pale: 0xdbffe3, gold: 0xffdfa0 };

function drawRibbon(surface, angle, rise, opacity, front) {
  const steps = 42;
  const point = phase => {
    const bearing = angle - phase * Math.PI * 1.48;
    const radius = 29 - phase * 10;
    return [Math.cos(bearing) * radius, -phase * rise + Math.sin(bearing) * radius * 0.24, Math.sin(bearing)];
  };
  let start = point(0);
  for (let i = 1; i <= steps; i++) {
    const phase = i / steps;
    const end = point(phase);
    if ((start[2] + end[2] >= 0) === front) {
      const alpha = opacity * (0.22 + 0.78 * Math.sin(Math.PI * phase));
      surface.line(start[0], start[1] + 1, end[0], end[1] + 1, mend.jade, alpha * 0.74);
      surface.line(...start.slice(0, 2), ...end.slice(0, 2), front ? mend.mint : mend.jade, alpha);
      if (front && i % 8 < 3) surface.dot(end[0], end[1], mend.pale, alpha);
    }
    start = end;
  }
}

export const healingAura = {
  title: '回春光环',
  english: 'Healing aura',
  duration: 2.2,
  loop: false,
  previewTime: 0.93,

  build(random) {
    const phase = random() * tau;
    const motes = Array.from({ length: 23 }, (_, index) => ({
      delay: 0.18 + random() * 0.87, life: 0.68 + random() * 0.48,
      height: 25 + random() * 38, angle: random() * tau,
      radius: 10 + random() * 26, cross: index % 5 === 0
    }));

    return (surface, time) => {
      const rise = smooth(0.1, 0.85, time);
      const alpha = smooth(0, 0.34, time) * (1 - smooth(1.30, 2.14, time));
      const angle = phase + time * 3.5;
      const radius = 13 + 25 * smooth(0, 0.55, time);
      const height = 15 + rise * 43;
      surface.halo(0, -15 - rise * 8, 34, 28 + rise * 5, mend.jade, alpha * 0.66);
      groundArc(surface, radius, Math.PI, Math.PI, mend.jade, alpha * 0.78);
      groundArc(surface, radius - 4, Math.PI * 1.18, Math.PI * 0.62, mend.mint, alpha * 0.38);
      drawRibbon(surface, angle, height, alpha * 0.56, false);
      drawRibbon(surface, angle + Math.PI, height * 0.75, alpha * 0.45, false);

      const sealY = -20 - 14 * rise - 2 * Math.sin(4 * time);
      const seal = smooth(0.29, 0.65, time) * alpha;
      surface.halo(0, sealY, 15, 15, mend.mint, seal * 0.75);
      trace(surface, [[0, sealY - 13], [12, sealY], [0, sealY + 13],
        [-12, sealY], [0, sealY - 13]], mend.gold, seal * 0.66);
      surface.polygon([[-2, sealY - 8], [2, sealY - 8], [2, sealY - 2],
        [8, sealY - 2], [8, sealY + 2], [2, sealY + 2], [2, sealY + 8],
        [-2, sealY + 8], [-2, sealY + 2], [-8, sealY + 2], [-8, sealY - 2],
        [-2, sealY - 2]], mend.mint, seal);
      glint(surface, 0, sealY - 1, 5, mend.pale, seal);

      for (const mote of motes) {
        const age = (time - mote.delay) / mote.life;
        if (age < 0 || age >= 1) continue;
        const bearing = mote.angle + age * 1.9;
        const x = Math.cos(bearing) * mote.radius;
        const y = Math.sin(bearing) * 5 - age * mote.height;
        const strength = Math.sin(Math.PI * age) * alpha;
        if (mote.cross) {
          glint(surface, x, y, 1 + 2 * strength, mend.gold, strength);
        } else {
          surface.line(x, y, x + Math.sin(bearing) * 2, y + 2, mend.jade, strength * 0.6);
          surface.dot(x, y, mend.pale, strength);
        }
      }

      drawRibbon(surface, angle + Math.PI, height * 0.75, alpha * 0.68, true);
      drawRibbon(surface, angle, height, alpha, true);
      groundArc(surface, radius, 0.05, 1.12, mend.mint, alpha * 0.9);
      groundArc(surface, radius, 1.32, 1.69, mend.mint, alpha * 0.9);
      groundArc(surface, radius - 4, 0.56, 1.86, mend.jade, alpha * 0.58, 1);
    };
  }
};
