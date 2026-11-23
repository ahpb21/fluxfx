import { smooth } from './effect-drawing.js';
import { windswiftLean, windswiftTiming } from './windswift-wings.js';

const baseY = 120, floorY = 158;
const sky = [0x10252f, 0x142d38, 0x193944, 0x20414d, 0x234b55, 0x29545c, 0x315c64];
const earth = [0x414a47, 0x3d4645, 0x36403f, 0x30393b, 0x293336, 0x273134];

function drawBackdrop(surface) {
  const { width, height } = surface;
  for (let y=0; y<floorY; y++) surface.span(y, 0, width-1, sky[Math.min(sky.length-1, Math.floor(y/23))]);
  surface.polygon([[0,76], [44,76], [73,68], [115,70], [151,59], [186,58], [180,63], [151,67], [135,77], [74,80], [59,83], [0,87]],
    0x315660, 0.41);
  surface.polygon([[158,41], [194,36], [224,37], [245,28], [304,27], [304,35], [256,38], [231,43], [196,42], [169,46]],
    0x385b67, 0.52);
  surface.polygon([[0,133],[18,120],[46,112],[74,91],[97,109],[112,108],[153,131],[183,116],[213,91],[232,102],[270,83],[304,100],
    [304,155],[0,155]],0x294650);
  surface.polygon([[0,140],[25,130],[59,133],[84,124],[100,134],[142,140],[176,128],[213,133],[240,120],[279,117],[304,122],
    [304,158],[0,158]],0x263c43);
  for(let y=floorY; y<height; y++) {
    surface.span(y,0,width-1,earth[Math.min(earth.length-1,Math.floor((y-floorY)/9))]);
  }
  surface.span(floorY-1,0,width-1,0x57716a);
  surface.span(floorY+1,0,width-1,0x30423d);
  for(const y of [floorY+9,floorY+20,floorY+36]){
    surface.span(y,0,width-1,0x273932);
    surface.span(y+1,0,width-1,0x52655b,0.36);
  }
  for(let i=0;i<44;i++){
    const x=(61+i*91)%width,y=floorY+3+i*21%40;
    surface.span(y,x,x+i%6,0x667469,0.39);
  }
  for(let i=0;i<22;i++){
    const side=i%2?-1:1,x=side===1 ? (37+i*13)%73 : 304-(i*19)%71;
    const y=161+i*3%26,h=4+i*7%14;
    surface.line(x,y,x+3*side,y-h,0x4b6259,0.72);
  }
}

function drawActors(surface, x, y, time) {
  const lean = windswiftLean(time), foot = y+(floorY-baseY), chest = x+lean, head=chest+lean*0.36;
  const charge = smooth(windswiftTiming.targetHit,1.05,time)*(1-smooth(1.94,3.78,time));
  const wood = 0x997a63, straw = 0xc4a37e, rim = 0x64575a, shade = 0x75665c;
  surface.ellipse(x+2, foot+1, 13, 2, 0x243636, 0.84);
  surface.span(foot, x-8, x+9, rim);
  surface.span(foot-1, x-6, x+7, wood);
  surface.line(x-1,foot-2,chest-1,y-16,rim);
  surface.line(x+1,foot-2,chest+1,y-13,wood);
  surface.polygon([[chest-9,y-12],[chest+7,y-13],[chest+9,y-2],[chest+5,y+13],[chest-5,y+13],[chest-9,y+4]],wood);
  surface.polygon([[chest-7,y-11],[chest+3,y-11],[chest+2,y+10],[chest-6,y+9]],shade);
  surface.span(y-6,chest-13,chest+13,rim);
  surface.span(y-7,chest-11,chest+12,straw);
  surface.span(y+6,chest-7,chest+7,rim);
  surface.span(y+7,chest-6,chest+6,straw);
  surface.ellipse(head,y-19,6,6,wood);
  surface.span(y-21,head-4,head+3,straw);
  surface.span(y-18,head-5,head+5,rim);
  const wind = Math.sin(time*25)*charge;
  surface.polygon([[head-1,y-14],[head-15-12*charge,y-11-3*wind],[head-10-8*charge,y-7-5*wind],[chest+4,y-11]],0x9a7d73);
}

export const windswiftWingsStage = {
  width: 304, height: 204, x: 152, y: baseY, drawBackdrop, drawActors,
  markerLabels: { launch: '风场聚拢', impact: '风翼展开', targetHit: '迅捷灌注', aftershock: '疾风脉动', recover: '风翼渐隐' },
};
