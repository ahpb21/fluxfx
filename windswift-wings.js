import { drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';

export const windswiftTiming = { launch: 0.40, impact: 0.65, targetHit: 0.85, aftershock: 1.10, recover: 1.30 };
const { launch, impact, targetHit, aftershock, recover } = windswiftTiming;
const duration = 3.90, tau = Math.PI * 2;
const dark = 0x2d7183, teal = 0x62b7ba, aqua = 0x9aeddf, sky = 0x8fd8f8, frost = 0xd9fff8;

const wings = [
  { side: -1, major: true }, { side: 1, major: true },
  { side: -1, major: false }, { side: 1, major: false },
];

export function windswiftLean(time) {
  return 5.2 * smooth(targetHit, 0.94, time) * (1 - smooth(2.12, 3.77, time))
    + 1.5 * Math.sin(Math.PI * clamp((time - aftershock) / 0.30));
}

function ridge(wing, u, spread, beat) {
  const t = 1 - u, { side, major } = wing;
  const a = t*t*t, b = 3*t*t*u, c = 3*t*u*u, d = u*u*u;
  const x = major ? 8*a + 20*b + 61*c + 109*d : 8*a + 22*b + 43*c + 76*d;
  const y = major ? 4*a - 30*b - 65*c - 59*d : 13*a + 32*b + 13*c - 10*d;
  return [side*x*spread, y*spread + beat*u*(major ? 3.2 : 2.1)];
}

function wingFace(front, time, wing, spread, opacity, pulse, glow, low) {
  const { side, major } = wing;
  const beat = Math.sin(time * (major ? 41 : 39) + side * 0.23 + (major ? 0 : 2.7));
  const flicker = opacity * (0.82 + beat * 0.18);
  const at = u => ridge(wing, u, spread, beat);
  const n = low ? 6 : major ? 11 : 8;
  const outline = Array.from({ length: 17 }, (_, i) => at(i/16));
  const lowerEdge = Array.from({ length: 14 }, (_, i) => {
    const u = 1 - i/13, [x,y] = at(u);
    return [x + side * Math.sin(Math.PI*u)*8, y + Math.sin(Math.PI*u) * (major ? 18 : 10)];
  });
  front.polygon([...outline, ...lowerEdge], major ? teal : dark, flicker*(major ? 0.26 : 0.30));
  for (let i=0; i<n; i++) {
    const u = 0.16 + 0.72 * i / (n-1), [x,y] = at(u);
    const end = at(Math.min(1, u + 0.13));
    const bend = (major ? 17 : 9) + (3.5 + 3.2 * Math.sin(i*2+time*28)) * (1-u);
    const tipX = end[0] + side*(major ? 11 : 8)*(0.7+0.3*u), tipY = end[1] + bend - u*3;
    const length = 0.6 + 0.4*Math.sin(Math.PI*u);
    const point = h => {
      const t = 1-h, mx = x+(tipX-x)*0.53+side*4, my = y+(tipY-y)*0.35-2;
      return [x*t*t+2*mx*t*h+tipX*h*h, y*t*t+2*my*t*h+tipY*h*h];
    };
    drawRibbon(front, { point, width: v => (0.8 + (major ? 8 : 5.8)*Math.sin(Math.PI*v)**0.70)*length,
      segments: low ? 6 : 10, color: i%2 ? aqua : sky, edge: i%3 ? aqua : frost,
      opacity: flicker*(major ? 0.45+0.23*pulse : 0.37+0.18*pulse)*(0.90+i%3*0.05) });
    const [px,py] = point(0.35), [ex,ey] = point(0.85);
    if (i%3 !== 1) front.line(px,py,ex,ey,frost,flicker*(0.41 + 0.23*pulse));
  }
  trace(front, outline, major ? aqua : sky, flicker*(major ? 0.9 : 0.66));
  trace(front, outline.slice(3,13), frost, flicker*(major ? 0.63 : 0.37));
  for (const u of [0.24,0.56,0.86]) {
    const [x,y] = at(u);
    front.glow(x,y,major ? 15 : 9,u < 0.41 ? aqua : sky,glow*flicker*(0.16 + pulse*0.32));
  }
  const [tx,ty] = at(1);
  glint(front, tx, ty, major ? 2 : 1, frost, flicker*(0.33+0.59*pulse));
}

function wash(back, front, time, light) {
  const ready = smooth(0.01, 0.38, time), fade = 1 - smooth(recover, duration, time);
  const wind = ready * fade;
  if (wind <= 0.004) return;
  const live = smooth(launch, impact, time);
  const flash = time >= impact ? 1-smooth(impact, 0.81, time) : 0;
  const echo = time >= aftershock ? 1-smooth(aftershock, 1.39, time) : 0;
  back.halo(0, 12, 63 + live*27, 28+live*16, dark, wind*(0.68+flash*0.32));
  back.halo(-38, -10, 54, 27, teal, wind*live*(0.35+0.38*flash));
  back.halo(47, -13, 53, 25, teal, wind*live*(0.30+0.33*flash));
  front.glow(0, 1, 36, aqua, wind*light*(0.21 + flash*0.88 + echo*0.28));
  if (flash > 0.04) {
    glint(front, -13, -15, 4 + flash*4, frost, wind*flash*0.69);
    glint(front, 13, -15, 4 + flash*4, frost, wind*flash*0.69);
  }
}

function vortex(back, front, time, light) {
  const fade = smooth(0.03, 0.36, time) * (1 - smooth(1.17, 3.81, time));
  if (fade <= 0.003) return;
  const boost = smooth(launch, impact, time);
  const travel = 2.9*time + 5.2*Math.max(0, time-launch) - 4.2*Math.max(0, time-1.48);
  const lean = windswiftLean(time);
  for (let ring=0; ring<3; ring++) {
    const radius = 17 + ring*7 + boost*8, vertical = 6 + ring*1.3;
    const originY = 17 - ring*14 + 1.5*Math.sin(time*6+ring), center = 5*lean/6;
    const a = j => j/30*tau + travel + ring*1.85;
    const at = u => [center + Math.cos(u)*radius, originY + Math.sin(u)*vertical - Math.cos(u)*radius*0.12];
    for (let j=0; j<30; j++) {
      const segment = (j+ring*7)%12;
      if (segment > 7) continue;
      const p = a(j), q = a(j+1), rear = Math.sin((p+q)*0.5)<0;
      const power = Math.sin(Math.PI*segment/8);
      const [x,y] = at(p), [nx,ny] = at(q);
      (rear ? back : front).line(x,y,nx,ny,ring%2 ? aqua : sky,fade*power*(rear ? 0.38 : 0.75));
      if (power > 0.94 && !rear) front.dot(x,y,frost,fade*(0.46+boost*0.32));
    }
  }
  const beat = time >= aftershock ? 1-smooth(aftershock,1.43,time) : 0;
  if (beat > 0.006) {
    const age = smooth(aftershock,1.43,time), r = 19 + 53*age;
    for (let i=0; i<30; i++) {
      const a = i/30*tau, b = (i+1)/30*tau;
      if (i%9 > 5) continue;
      const f = i >= 15 ? back : front;
      f.line(Math.cos(a)*r, 19+Math.sin(a)*r*0.17, Math.cos(b)*r, 19+Math.sin(b)*r*0.17, aqua, beat*fade*0.52);
    }
    front.glow(0, 11, 26, sky, light*beat*fade*0.31);
  }
}

function streams(back, front, time, jets, dust) {
  let count = 0;
  for (const s of jets) {
    const age = (time-s.start)/s.life;
    if (age <= 0 || age >= 1) continue;
    const speed = 1-(1-age)**1.78, fade = smooth(0,0.16,age)*(1-smooth(0.53,1,age));
    const x = s.x - speed*s.distance, y = s.y + speed*s.drift + 2.5*Math.sin(s.phase+age*6);
    const breakUp = smooth(0.50, 0.92, age);
    const length = s.length*(0.74+fade*0.26), alpha = fade*s.alpha;
    const surface = s.rear ? back : front;
    surface.line(x-length,y+2,x-length*(0.42+breakUp*0.25),y+0.8,s.rear ? dark : teal,alpha*0.68);
    surface.line(x-length*(0.42-breakUp*0.19),y+0.8,x,y,s.color,alpha);
    if (s.length > 20 && !s.rear) surface.line(x-length*0.27,y+1.5,x-2,y+1,frost,alpha*0.41);
    count++;
  }
  const gather = smooth(0.01,0.34,time)*(1-smooth(0.71,1.30,time));
  if (gather <= 0.004) return count;
  for (const p of dust) {
    const a = p.phase + time*p.speed, x = Math.cos(a)*p.radius, y = p.y + Math.sin(a)*p.radius*0.38;
    const show = gather*(0.31 + 0.69*Math.sin((p.phase+time*3)*0.93)**2);
    const surface = Math.sin(a)<0 ? back : front;
    surface.line(x-1-Math.floor(p.size),y,x,y,p.color,show*0.83);
    count++;
  }
  return count;
}

export const windswiftWings = {
  title: '风息迅翼',
  english: 'Windswift Wings',
  duration,
  loop: false,
  previewTime: 0.88,
  events: [
    { at: launch, name: 'launch', data: { x: 0, y: 0, direction: [1, 0] } },
    { at: impact, name: 'impact', data: { x: 0, y: 0 } },
    { at: targetHit, name: 'targetHit', data: { x: 0, y: 0, direction: [1, 0] } },
    { at: aftershock, name: 'aftershock', data: { x: 0, y: 0 } },
    { at: recover, name: 'recover' },
  ],
  build(random, { quality = 'full', light = 1 } = {}) {
    const low = quality === 'low', glow = clamp(light);
    const dust = Array.from({ length: low ? 16 : 30 }, () => ({
      phase: random()*tau, radius: 12+random()*29, speed: 1.4+random()*2.6,
      y: (random()-0.46)*39, size: random()*1.8, color: random()>0.45 ? aqua : frost,
    }));
    const jets = Array.from({ length: low ? 52 : 114 }, (_, i) => {
      const wing = wings[(i+Math.floor(i/4))%wings.length], along = 0.12+random()*0.82;
      const [x,y] = ridge(wing, along, 0.97, 0);
      const long = i%5===0, initial = i%4===0 || i%7===3;
      return { x: x+(random()-0.5)*22, y: y+7+(random()-0.5)*27, drift: (random()-0.43)*19,
        start: initial ? 0.59+random()*0.075 : 0.65+random()*2.58,
        life: 0.17+random()*0.47, distance: 38+random()*93, phase: random()*tau,
        rear: i%4===1, length: long ? 19+random()*34 : 2.6+random()*13,
        alpha: (long ? 0.49 : 0.59)+random()*0.34, color: random()>0.56 ? sky : aqua };
    });
    return (front, time, context) => {
      const back = context?.back ?? front;
      wash(back, front, time, glow);
      vortex(back, front, time, glow);
      if (time >= impact) {
        const opacity = 1-smooth(recover,3.66,time)**0.52;
        const spread = 0.89+0.11*smooth(impact,0.84,time)-0.14*smooth(2.03,3.66,time);
        const flash = 1-smooth(impact,0.83,time);
        const pulse = Math.max(flash, time >= aftershock ? (1-smooth(aftershock,1.36,time))*0.43 : 0);
        if (opacity > 0.004) {
          for (const wing of wings) wingFace(front,time,wing,spread,opacity*(wing.major ? 1 : 0.82),pulse,glow,low);
        }
      }
      context?.countParticles(streams(back,front,time,jets,dust));
    };
  },
};
