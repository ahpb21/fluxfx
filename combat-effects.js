import { clamp, glint, groundArc, smooth } from './effect-drawing.js';
import { bouncingArc } from './motion.js';

const tau = Math.PI * 2;
const slashDetail = {
  full: { segments: 44, sparks: 18, glow: 4 },
  low: { segments: 22, sparks: 8, glow: 2 }
};

const moon = { rear: 0x435bab, body: 0x3979df, glow: 0x6653c6, light: 0x7be4ff, edge: 0xeffcff, ink: 0x213679 };
const crimson = { rear: 0x87336b, body: 0xc12c64, glow: 0x934470, light: 0xff7a91, edge: 0xffe3ba, ink: 0x661d50 };
const coral = { rear: 0xac3768, body: 0xe75153, glow: 0xae3863, light: 0xffa476, edge: 0xfff2d6, ink: 0x8c244b };

const moonStroke = {
  startAngle: -2.35, endAngle: 1.25, radius: 34, maxWidth: 15,
  perspectiveY: 0.73, roll: -0.54, centerX: 0, centerY: -31,
  delay: 0.03, sweepTime: 0.25, fadeTime: 0.47, palette: moon
};
const crossingStrokes = [
  {
    startAngle: -2.82, endAngle: 0.32, radius: 34, maxWidth: 11,
    perspectiveY: 0.51, roll: 0.68, centerX: -1, centerY: -26,
    delay: 0.03, sweepTime: 0.21, fadeTime: 0.57, palette: crimson
  },
  {
    startAngle: 0.38, endAngle: -2.97, radius: 35, maxWidth: 14,
    perspectiveY: 0.54, roll: -0.70, centerX: 2, centerY: -26,
    delay: 0.17, sweepTime: 0.22, fadeTime: 0.53, palette: coral
  }
];

function buildStroke(random, style, detail, direction) {
  const { startAngle, endAngle, radius, maxWidth, perspectiveY, roll, centerX, centerY } = style;
  const sweep = endAngle - startAngle;
  const cosRoll = Math.cos(roll), sinRoll = Math.sin(roll);
  const angleAt = progress => startAngle + sweep * progress;
  const pointAt = angle => {
    const x = Math.cos(angle), y = Math.sin(angle) * perspectiveY;
    const vx = (x * cosRoll - y * sinRoll) * direction;
    const vy = x * sinRoll + y * cosRoll;
    return distance => [centerX * direction + vx * distance, centerY + vy * distance];
  };

  const cuts = Array.from({ length: detail.segments + 1 }, (_, index) => index / detail.segments);
  // Split exactly at the depth plane so rear and front passes meet without a gap.
  for (let a = Math.ceil(Math.min(startAngle, endAngle) / Math.PI) * Math.PI;
       a < Math.max(startAngle, endAngle); a += Math.PI) {
    const progress = (a - startAngle) / sweep;
    if (progress > 0 && progress < 1 && !cuts.some(cut => Math.abs(cut - progress) < 1e-7)) cuts.push(progress);
  }
  cuts.sort((a, b) => a - b);
  const notches = cuts.map(() => random());
  const sparks = Array.from({ length: detail.sparks }, () => {
    const progress = 0.13 + random() * 0.84;
    const angle = angleAt(progress);
    const distance = radius + maxWidth * 0.45;
    const [x, y] = pointAt(angle)(distance);
    const [tipX, tipY] = pointAt(angle + Math.sign(sweep) * 0.08)(distance);
    const speed = 15 + random() * 25;
    const spread = (random() - 0.35) * 36;
    return {
      x, y, vx: (tipX - x) * speed / 3 + Math.cos(angle) * spread * direction,
      vy: (tipY - y) * speed / 3 + Math.sin(angle) * spread,
      born: style.delay + style.sweepTime * (1 - Math.sqrt(1 - progress)),
      life: 0.20 + random() * 0.32, size: 1 + random() * 3
    };
  });

  function sample(progress, head, shrink) {
    const u = progress / head;
    const bulge = Math.sin(Math.PI * u) ** 0.76;
    const width = maxWidth * bulge * (0.68 + 0.47 * u) * shrink;
    const inner = radius + 5 * (u - 0.5) - width * 0.22;
    const point = pointAt(angleAt(progress));
    const feather = detail.glow * bulge;
    return {
      glowInner: point(inner - feather), inner: point(inner), face: point(inner + width * 0.65),
      outer: point(inner + width), glowOuter: point(inner + width + feather * 0.7)
    };
  }

  return { style, angleAt, cuts, notches, sparks, sample };
}

function strokeSegments(stroke, time) {
  const { style, angleAt, cuts, sample } = stroke;
  const elapsed = time - style.delay;
  const phase = clamp(elapsed / style.sweepTime);
  const head = 1 - (1 - phase) ** 2;
  const fade = 1 - smooth(style.sweepTime * 0.78, style.sweepTime + style.fadeTime, elapsed);
  if (head <= 0 || fade <= 0) return [];

  const alpha = smooth(0, 0.065, elapsed) * fade;
  const shrink = (0.72 + 0.28 * head) * (0.42 + 0.58 * fade);
  const segments = [];
  let previous = sample(0, head, shrink);
  for (let i = 1; i < cuts.length && cuts[i - 1] < head; i++) {
    const progress = Math.min(head, cuts[i]);
    const next = sample(progress, head, shrink);
    const middle = (cuts[i - 1] + progress) * 0.5;
    const front = Math.sin(angleAt(middle)) >= 0;
    segments.push({ previous, next, front, alpha, u: middle / head, notch: stroke.notches[i] });
    previous = next;
  }
  return segments;
}

function drawStroke(surface, segments, palette, front) {
  const visible = segments.filter(segment => segment.front === front);
  for (const { previous: a, next: b, alpha } of visible) {
    surface.polygon([a.glowInner, a.glowOuter, b.glowOuter, b.glowInner], palette.glow, alpha * 0.28);
  }
  for (const { previous: a, next: b, alpha } of visible) {
    surface.polygon([a.inner, a.face, b.face, b.inner], front ? palette.body : palette.rear, alpha * 0.89);
    surface.polygon([a.face, a.outer, b.outer, b.face], palette.light, alpha * (front ? 0.93 : 0.71));
  }
  for (const { previous: a, next: b, alpha, u, notch } of visible) {
    if (notch > 0.69 && u > 0.22 && u < 0.85) {
      surface.line(...a.inner, ...b.face, palette.ink, alpha * 0.54);
      surface.dot(...a.face, palette.light, alpha * 0.75);
    }
    const edge = 0.42 + 0.58 * Math.sin(Math.PI * u) ** 0.52;
    surface.line(...a.outer, ...b.outer, palette.edge, alpha * edge * (front ? 1 : 0.86));
    if (notch > 0.83 && u > 0.28 && u < 0.8) {
      surface.line(...a.glowOuter, ...b.glowOuter, palette.light, alpha * 0.41);
    }
  }
}

function drawSparks(surface, stroke, time) {
  const { sparks, style: { palette } } = stroke;
  let count=0;
  for (const spark of sparks) {
    const age = time - spark.born;
    if (age < 0 || age >= spark.life) continue;
    count++;
    const fade = (1 - age / spark.life) ** 1.6;
    const x = spark.x + spark.vx * age;
    const y = spark.y + spark.vy * age + 28 * age * age;
    const trail = 0.022 * spark.size * fade;
    surface.line(x - spark.vx * trail, y - spark.vy * trail, x, y, palette.light, fade * 0.84);
    surface.dot(x, y, palette.edge, fade);
  }
  return count;
}

function buildSlash(random, { direction = 1, pass = 'both', quality = 'full' } = {}, styles) {
  const detail = quality === 'low' ? slashDetail.low : slashDetail.full;
  const strokes = styles.map(style => buildStroke(random, style, detail, direction < 0 ? -1 : 1));
  return (surface, time, context) => {
    const segments = strokes.map(stroke => strokeSegments(stroke, time));
    // A game may draw a sprite between separate rear and front instances at different depths.
    if (pass !== 'front') {
      strokes.forEach((stroke, i) => drawStroke(context?.back ?? surface, segments[i], stroke.style.palette, false));
    }
    if (pass !== 'rear') {
      strokes.forEach((stroke, i) => drawStroke(surface, segments[i], stroke.style.palette, true));
      for (const stroke of strokes) {
        const count=drawSparks(surface, stroke, time);
        context?.countParticles(count);
      }
    }
  };
}

export const crescentSlash = {
  title: '月弧斩', english: 'Crescent slash', duration: 0.8, loop: false, previewTime: 0.25,
  build(random, options) { return buildSlash(random, options, [moonStroke]); }
};

export const crossSlash = {
  title: '绯刃十字', english: 'Crimson cross', duration: 0.96, loop: false, previewTime: 0.37,
  build(random, options) { return buildSlash(random, options, crossingStrokes); }
};

const blast = {
  smoke: 0x453243, soot: 0x211b31, rim: 0x8c4955, red: 0xb83139,
  orange: 0xfa6c37, yellow: 0xffbe62, white: 0xfff0bf
};

function lobeShape(random) {
  const start = random() * tau;
  return Array.from({ length: 12 }, (_, index) => {
    const angle = start + index * tau / 12;
    const size = 0.75 + random() * 0.32;
    return [Math.cos(angle) * size, Math.sin(angle) * size];
  });
}

function drawLobe(surface, shape, x, y, rx, ry, color, alpha) {
  surface.polygon(shape.map(([dx, dy]) => [x + dx * rx, y + dy * ry]), color, alpha);
}

export const cinderBurst = {
  title: '熔核爆炸', english: 'Cinder burst', duration: 1.45, loop: false, previewTime: 0.19,

  build(random) {
    const lobes = Array.from({ length: 12 }, (_, index) => {
      const angle = (index + random() * 0.66) * tau / 12;
      return {
        dx: Math.cos(angle) * (10 + random() * 20), dy: Math.sin(angle) * (9 + random() * 13) - 6,
        size: 10 + random() * 11, delay: random() * 0.10, life: 0.82 + random() * 0.43,
        wind: (random() - 0.4) * 18, lift: 15 + random() * 16,
        shape: lobeShape(random)
      };
    }).sort((a, b) => a.dy - b.dy);
    const rays = Array.from({ length: 16 }, (_, index) => {
      const angle = (index + random() * 0.69) * tau / 16;
      return { x: Math.cos(angle), y: Math.sin(angle) * 0.70, length: 18 + random() * 31, width: 1.5 + random() * 3 };
    });
    const fragments = Array.from({ length: 33 }, (_, index) => ({
      delay: random() * 0.12, life: 0.35 + random() * 0.54, size: 0.8 + random() * 2.1,
      hot: index % 4 !== 0,
      flight: bouncingArc({ x: (random() - 0.5) * 12, y: -5 - random() * 12,
        vx: (random() - 0.5) * 170, vy: -18 - random() * 95, gravity: 220, restitution: 0.32 })
    }));

    return (surface, time) => {
      const heat = smooth(0, 0.075, time) * (1 - smooth(0.18, 0.53, time));
      const flash = smooth(0.015, 0.09, time) * (1 - smooth(0.095, 0.27, time));
      const wave = 1 - (1 - clamp(time / 0.68)) ** 3;
      const waveAlpha = smooth(0.02, 0.18, time) * (1 - smooth(0.19, 0.75, time));
      const radius = 5 + wave * 45;
      surface.halo(0, -14, 52, 36, blast.orange, heat * 1.23);
      groundArc(surface, radius, Math.PI, Math.PI, blast.red, waveAlpha * 0.8);
      groundArc(surface, radius - 3, 3.4, 2.62, blast.yellow, waveAlpha * 0.52);

      const streak = smooth(0.025, 0.15, time) * (1 - smooth(0.20, 0.38, time));
      if (streak > 0) {
        const push = smooth(0, 0.28, time);
        for (const ray of rays) {
          const length = ray.length * (0.50 + 0.50 * push);
          const base = length * (0.14 + 0.44 * push);
          const x = ray.x * base, y = -14 + ray.y * base;
          const endX = ray.x * length, endY = -14 + ray.y * length;
          const halfWidth = ray.width * streak;
          surface.polygon([[x - ray.y * halfWidth, y + ray.x * halfWidth], [endX, endY],
            [x + ray.y * halfWidth, y - ray.x * halfWidth]], blast.orange, streak);
          surface.line(x, y, endX, endY, blast.yellow, streak * 0.65);
        }
      }

      for (const lobe of lobes) {
        const age = time - lobe.delay;
        if (age <= 0 || age >= lobe.life) continue;
        const expansion = 1 - (1 - clamp(age / 0.57)) ** 2;
        const alpha = smooth(0, 0.14, age) * (1 - smooth(0.52, lobe.life, age));
        const flame = smooth(0, 0.11, age) * (1 - smooth(0.15, 0.40, age));
        const x = lobe.dx * expansion + lobe.wind * age * age;
        const y = -10 + lobe.dy * expansion - age * lobe.lift;
        const radius = lobe.size * (0.23 + 0.86 * expansion);
        drawLobe(surface, lobe.shape, x, y, radius, radius * 0.84, blast.soot, alpha * 0.74);
        drawLobe(surface, lobe.shape, x - 1, y - 2, radius * 0.91, radius * 0.76, blast.smoke, alpha * 0.8);
        drawLobe(surface, lobe.shape, x - 2, y - 4, radius * 0.70, radius * 0.54, blast.rim, alpha * 0.4);
        if (flame > 0) {
          drawLobe(surface, lobe.shape, x, y, radius * 0.92, radius * 0.8, blast.red, flame);
          drawLobe(surface, lobe.shape, x * 0.82 - 2, y - 3, radius * 0.79, radius * 0.66, blast.orange, flame);
          drawLobe(surface, lobe.shape, x * 0.73 - 2, y - 4, radius * 0.53, radius * 0.47, blast.yellow, flame * 0.94);
        }
      }

      surface.ellipse(0, -14, 16 * flash, 11 * flash, blast.yellow, flash * 0.86);
      surface.ellipse(-1, -15, 13 * flash, 7 * flash, blast.white, flash);
      glint(surface, 0, -14, 17 * flash, blast.white, flash * 0.91);
      groundArc(surface, radius, 0.07, 1.07, blast.yellow, waveAlpha);
      groundArc(surface, radius, 1.33, 1.73, blast.orange, waveAlpha);

      for (const fragment of fragments) {
        const age = time - fragment.delay;
        if (age < 0 || age >= fragment.life) continue;
        const { x, y, rest } = fragment.flight(age);
        const alpha = smooth(0, 0.045, age) * (1 - age / fragment.life) ** 1.35;
        if (fragment.hot && !rest) {
          const tail = fragment.flight(Math.max(0, age - fragment.size * 0.025));
          surface.line(tail.x, tail.y, x, y, blast.orange, alpha);
          surface.dot(x, y, blast.white, alpha);
        } else {
          surface.ellipse(x, y, fragment.size, fragment.size * 0.68, blast.soot, alpha);
          surface.dot(x, y - 1, blast.red, alpha);
        }
      }
    };
  }
};
