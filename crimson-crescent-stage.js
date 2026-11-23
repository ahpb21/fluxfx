import { crimsonCast, crimsonFlashEnd, crimsonHit, crimsonTarget, crimsonWeaponOffset } from './crimson-crescent.js';
import { smooth } from './effect-drawing.js';

const height=192,horizon=154,stageY=128;
const sky=[0x252536,0x2b2b3e,0x333147,0x3b354b,0x473c50,0x4c4053];
const stone=[0x3f3946,0x3a3543,0x36313f,0x2d2b38];

function drawBackdrop(surface){
  const width=surface.width;
  for(let y=0;y<horizon;y++)surface.span(y,0,width-1,sky[Math.min(sky.length-1,Math.floor(y/26))]);
  surface.polygon([[0,123],[24,112],[54,115],[82,99],[107,109],[128,104],[154,118],[176,104],
    [201,112],[233,93],[256,111],[256,horizon],[0,horizon]],0x393647);
  surface.polygon([[0,138],[24,127],[55,135],[81,122],[110,134],[140,129],[172,138],[209,123],[256,128],
    [256,horizon],[0,horizon]],0x343342);
  for(const [x,top] of [[16,83],[232,76]]){
    surface.polygon([[x-7,horizon],[x-6,top+7],[x-1,top],[x+6,top+5],[x+8,horizon]],0x303040);
    surface.polygon([[x-5,horizon],[x-4,top+7],[x,top+4],[x+2,horizon]],0x474353);
    surface.span(horizon-3,x-9,x+9,0x534b58,0.64);
  }
  for(let y=horizon;y<height;y++)surface.span(y,0,width-1,stone[Math.min(stone.length-1,Math.floor((y-horizon)/10))]);
  for(const y of [154,159,169,183]){
    surface.span(y,0,width-1,0x282734);
    surface.span(y+1,0,width-1,0x594c58,0.57);
  }
  for(let x=-40;x<310;x+=50)surface.line(128+(x-128)*0.64,horizon,x,height-1,0x262633,0.84);
  for(let i=0;i<33;i++){
    const x=(22+i*83)%width,y=horizon+3+i*11%33;
    surface.span(y,x,x+i%4,0x665561,0.36);
  }
}

function hero(surface,x,y,t){
  const weight=smooth(0.015,0.17,t)*(1-smooth(0.18,crimsonCast,t));
  const follow=smooth(crimsonCast,0.39,t)*(1-smooth(0.54,0.82,t));
  const body=x-24+9*follow, head=body-2*weight+3*follow, foot=y+27,brow=y-13;
  const ink=0x242735, steel=0x495771, cloth=0x748197, edge=0xbac1c7, skin=0xc4a286;
  surface.ellipse(body+1,foot+1,13,2,0x252532,0.82);
  surface.polygon([[body-6,y+10],[body+3,y+11],[body-5-4*follow,foot],[body-13-3*follow,foot]],ink);
  surface.polygon([[body-3,y+11],[body+5,y+10],[body+10+7*follow,foot],[body+2+7*follow,foot]],steel);
  surface.span(foot-1,body-12-3*follow,body-4-3*follow,steel);
  surface.span(foot,body+3+7*follow,body+12+7*follow,ink);
  surface.polygon([[head-6,brow+8],[head+6,brow+8],[body+7,y+11],[body-7,y+15],[body-10,y+5]],steel);
  surface.polygon([[head-6,brow+8],[head+2,brow+9],[body+2,y+9],[body-7,y+11]],cloth);
  surface.span(y+8,body-6,body+6,0x934948);
  surface.polygon([[head-6,brow+8],[head-14-7*follow,brow+12],[head-19-5*follow,brow+15],
    [head-5,brow+12]],0x9b4c50);
  surface.polygon([[head-7,brow+4],[head-4,brow],[head+4,brow],[head+7,brow+4],[head+6,brow+9],[head-5,brow+9]],ink);
  surface.span(brow+2,head-4,head+4,cloth);
  surface.span(brow+5,head+1,head+6,edge);
  surface.span(brow+7,head+3,head+5,skin);
  const offset=crimsonWeaponOffset(t),tx=x+offset.x+29*follow,ty=y+offset.y-7*follow;
  const gripX=tx-14,gripY=ty+8-7*follow;
  surface.line(head+3,brow+11,gripX-2,gripY+1,cloth);
  surface.span(gripY,gripX-2,gripX,skin);
  surface.line(gripX,gripY,tx,ty,edge);
  surface.line(gripX+1,gripY+1,tx,ty+1,cloth);
  surface.line(gripX-2,gripY-2,gripX+2,gripY+2,0xb79063);
}

function opponent(surface,x,ground,t){
  const hit=t>=crimsonHit,flash=hit&&t<crimsonFlashEnd;
  const shift=hit?2:0, cx=x+shift,b=ground-52;
  const dark=flash?0xdcd7d0:0x302b3b,armor=flash?0xeee4d2:0x554659;
  const trim=flash?0xf3ead6:0x886775,metal=flash?0xe2dbcc:0xa3928b;
  surface.ellipse(cx,ground+1,13,2,0x252532,0.88);
  surface.polygon([[cx-6,b+17],[cx+4,b+18],[cx+11,ground],[cx+3,ground],[cx-1,b+26],[cx-6,ground],[cx-13,ground]],dark);
  surface.polygon([[cx-7,b+3],[cx+7,b+3],[cx+8,b+14],[cx+2,b+22],[cx-9,b+16]],armor);
  surface.span(b+7,cx-8,cx+8,trim);
  surface.span(b+18,cx-6,cx+6,metal);
  surface.polygon([[cx-7,b+2],[cx-7,b-9],[cx-4,b-13],[cx+3,b-13],[cx+7,b-8],[cx+5,b+2]],dark);
  surface.span(b-11,cx-4,cx+2,trim);
  surface.span(b-7,cx-6,cx+2,metal);
  surface.line(cx-5,b+9,cx-13,b+16,armor);
  surface.span(b+16,cx-14,cx-10,metal);
}

export const crimsonCrescentStage={
  width:256,height,x:72,y:stageY,seed:1101,fps:12,drawBackdrop,
  drawActors(surface,x,y,t){
    hero(surface,x,y,t);
    opponent(surface,x+crimsonTarget[0],y+crimsonTarget[1]+43,t);
  },
  markerLabels:{cast:'出手',hit:'命中'},
};
