import { bindDistance, boundDummyOffset } from './verdant-bind.js';

const baseY = 170;
const sky = [0x111a26, 0x13222c, 0x182831, 0x1b2e34, 0x20373a, 0x243b3c];
const loam = [0x3a3b32, 0x363932, 0x30352e, 0x2a302b, 0x252b2a];

function tree(surface, x, base, h, tilt, shade) {
  const top = x + tilt;
  surface.polygon([[x-12, base], [x-6, base-14], [top-7, base-h], [top+5, base-h],
    [x+7, base-18], [x+12, base]], shade);
  surface.polygon([[x-3, base-42], [top-22, base-74], [top-26, base-98],
    [top-18, base-78], [x+4, base-49]], shade);
  surface.polygon([[x+4, base-71], [top+24, base-96], [top+28, base-118],
    [top+20, base-103], [x-2, base-77]], shade);
}

function drawBackdrop(surface) {
  const { width, height } = surface;
  for (let y = 0; y < baseY; y++) {
    surface.span(y, 0, width-1, sky[Math.min(sky.length-1, Math.floor(y/28))]);
  }
  surface.ellipse(143, 74, 99, 53, 0x20373c, 0.44);
  surface.polygon([[0, 141], [29, 133], [60, 139], [90, 123], [113, 136], [154, 128],
    [182, 136], [221, 122], [261, 140], [304, 125], [304, 168], [0, 168]], 0x233135);
  for (const [x,h,lean,c] of [[36,166,-11,0x192a31], [68,174,18,0x21343a], [115,159,-14,0x23363b],
    [206,177,11,0x25383e], [244,166,-17,0x1c3036], [277,160,6,0x1b2d34]]) {
    tree(surface, x, 169, h, lean, c);
  }
  tree(surface, 15, 171, 191, -12, 0x18252e);
  tree(surface, 292, 170, 183, 15, 0x17262e);
  surface.polygon([[0, 156], [37, 144], [68, 154], [90, 150], [123, 159], [166, 155], [192, 159], [245, 145],
    [269, 153], [304, 149], [304, 170], [0, 170]], 0x253430);
  for (let y = baseY; y < height; y++) {
    surface.span(y, 0, width-1, loam[Math.min(loam.length-1, Math.floor((y-baseY)/7))]);
  }
  surface.span(baseY-1, 0, width-1, 0x344237);
  surface.span(baseY+6, 0, width-1, 0x2a342e, 0.68);
  for (let i=0; i<65; i++) {
    const x = (47 + i*97) % width, y = baseY + i*13 % 33;
    surface.span(y, x, x+i%5, i%3 ? 0x545049 : 0x62604d, 0.48);
  }
  for (let i=0; i<29; i++) {
    const x = (23 + i*79) % width, y = 15 + i*31 % 131;
    surface.dot(x, y, 0x526b68, i%4 ? 0.33 : 0.52);
  }
}

function drawActors(surface, x, y, time) {
  const center = x + bindDistance, dx = boundDummyOffset(time), c = center + dx;
  const ink = 0x3d3232, wood = 0x8b634c, bark = 0xa37658, straw = 0xbf9b70;
  surface.ellipse(center, y+1, 12, 2, 0x18262a, 0.9);
  surface.span(y, center-6, center+7, ink);
  surface.span(y-1, center-7, center+8, wood);
  surface.line(center-2, y, c-1, y-38, ink);
  surface.line(center, y-3, c+1, y-36, bark);
  surface.polygon([[c-8, y-37], [c+7, y-37], [c+9, y-29], [c+6, y-17], [c-6, y-16], [c-9, y-25]], wood);
  surface.polygon([[c-7, y-35], [c+5, y-35], [c+5, y-22], [c-7, y-24]], bark);
  surface.span(y-30, c-14, c+13, ink);
  surface.span(y-29, c-12, c+12, wood);
  surface.span(y-28, c-10, c+11, straw);
  surface.span(y-20, c-5, c+6, ink);
  surface.span(y-19, c-5, c+6, straw);
  surface.ellipse(c, y-42, 6, 6, bark);
  surface.span(y-44, c-3, c+3, straw);
  surface.span(y-40, c-5, c+5, ink);
}

export const verdantBindStage = {
  width: 304, height: 204, x: 152, y: baseY, drawBackdrop, drawActors,
  markerLabels: { launch: '地脉蓄动', impact: '破土', targetHit: '藤蔓收紧', aftershock: '自然脉动', recover: '退藤' },
};
