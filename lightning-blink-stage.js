import { blinkFrameRate, blinkPose } from './lightning-blink.js';

const width=320,height=160,horizon=110,anchorY=112;
const air=[0x111a2c,0x152038,0x1a2840,0x202d48,0x27354e];
const pavement=[0x30384d,0x2c3549,0x272f42,0x222a3e,0x1f2638];

function drawBackdrop(surface){
  for(let y=0;y<horizon;y++)surface.span(y,0,width-1,air[Math.min(air.length-1,Math.floor(y/23))]);
  surface.polygon([[0,95],[33,83],[67,91],[97,77],[128,90],[153,87],[183,93],[208,79],[241,93],[270,74],
    [320,92],[320,horizon],[0,horizon]],0x233047);
  surface.polygon([[0,103],[27,96],[57,101],[87,92],[113,102],[147,94],[179,101],[203,92],
    [244,103],[290,92],[320,96],[320,horizon],[0,horizon]],0x273449);
  for(const [x,top,w] of [[17,70,9],[103,79,9],[214,78,9],[300,65,11]]){
    surface.polygon([[x-w,horizon],[x-w+1,top+4],[x-3,top-1],[x+5,top+2],[x+w,horizon]],0x1d293e);
    surface.line(x-w+1,top+5,x-w,horizon,0x46556e,0.63);
    surface.span(top+5,x-w+1,x+5,0x394760,0.62);
  }
  for(let y=horizon;y<height;y++)surface.span(y,0,width-1,pavement[Math.min(pavement.length-1,Math.floor((y-horizon)/10))]);
  for(const y of [110,116,127,143,157]){
    surface.span(y,0,width-1,0x1e283d);
    surface.span(y+1,0,width-1,0x45536a,0.48);
  }
  for(let x=-63;x<386;x+=57)surface.line(160+(x-160)*0.60,horizon,x,height-1,0x1e283c,0.87);
  for(let i=0;i<38;i++){
    const x=(35+i*89)%width,y=horizon+2+i*23%47;
    surface.span(y,x,x+i%5,0x55637a,0.31);
  }
}

function drawActors(surface,x,y,time){
  const pose=blinkPose(time);
  if(!pose)return;
  const cx=x+pose.x,headY=y-37+Math.round(pose.crouch),hip=y-12;
  const dark=pose.flash?0xb8cbe5:0x232d49,shadow=pose.flash?0xd3e4f0:0x455b7b;
  const cloth=pose.flash?0xe1eff6:0x8197ad,trim=pose.flash?0xe9f4fa:0xb9cad9,warm=pose.flash?0xe5e0d6:0xc49273;
  surface.ellipse(cx,y+1,11,1.7,0x1b273b,0.81);
  surface.polygon([[cx-5,hip],[cx+5,hip],[cx+8,y-1],[cx+2,y-1],[cx-2,y-7],[cx-7,y-1],[cx-11,y-1]],dark);
  surface.span(y-1,cx-9,cx-5,shadow);
  surface.span(y,cx+1,cx+9,shadow);
  surface.polygon([[cx-6,headY+10],[cx+5,headY+10],[cx+8,hip],[cx+2,hip+3],[cx-7,hip+1]],shadow);
  surface.polygon([[cx-5,headY+11],[cx+5,headY+10],[cx+5,hip-1],[cx-6,hip-1]],cloth);
  surface.span(hip,cx-7,cx+6,0x7d6381);
  surface.polygon([[cx-6,headY+8],[cx-13,headY+11],[cx-17,headY+15],[cx-5,headY+13]],0x786991);
  surface.polygon([[cx-7,headY+3],[cx-4,headY],[cx+3,headY],[cx+7,headY+4],[cx+5,headY+9],
    [cx-5,headY+10]],dark);
  surface.span(headY+2,cx-4,cx+4,cloth);
  surface.span(headY+5,cx+1,cx+6,trim);
  surface.span(headY+7,cx+3,cx+5,warm);
  surface.line(cx+3,headY+12,cx+9,hip-4,trim);
  surface.span(hip-4,cx+8,cx+10,warm);
}

export const lightningBlinkStage={
  width,height,x:48,y:anchorY,seed:3319,fps:blinkFrameRate,drawBackdrop,drawActors,
  markerLabels:{blink_out:'起点消失',blink_in:'落点显形'},
};
