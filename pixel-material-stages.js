import { clamp, smooth } from './effect-drawing.js';
import { inkVeilPose } from './ink-veil.js';
import { jadeDeck } from './jade-bridge.js';

const dimensions={width:320,height:180};

function banded(surface, from, to, colors){
  for(let y=from;y<to;y++){
    const level=Math.floor((y-from)/(to-from)*colors.length);
    surface.span(y,0,surface.width-1,colors[level]);
  }
}

function floor(surface,y,base,seam,grain){
  for(let row=y;row<surface.height;row++)surface.span(row,0,surface.width-1,base);
  for(const row of [y+1,y+8,y+19,y+34]){
    surface.span(row,0,surface.width-1,seam);
    surface.span(row+1,0,surface.width-1,grain,0.56);
  }
  for(let x=-64;x<391;x+=51)surface.line(160+(x-160)*0.61,y,x,surface.height-1,seam);
  for(let i=0;i<38;i++){
    const x=(19+i*79)%surface.width,row=y+3+i*13%(surface.height-y-3);
    surface.span(row,x,x+i%5,grain,0.43);
  }
}

function ranger(surface,x,y,time,opacity=1){
  const shadow=0x1d2433,body=0x3d485b,coat=0x698092,accent=0xcab294;
  const stride=1.4*Math.sin(time*20);
  surface.ellipse(x,y+1,10,1.6,shadow,0.80*opacity);
  surface.polygon([[x-5,y-18],[x+4,y-17],[x+5+stride,y],[x+1+stride,y],[x-1,y-7],[x-7-stride,y],[x-9-stride,y]],
    shadow,opacity);
  surface.polygon([[x-6,y-27],[x+4,y-27],[x+8,y-15],[x+2,y-12],[x-8,y-15]],body,opacity);
  surface.polygon([[x-6,y-27],[x-2,y-27],[x+1,y-17],[x-7,y-15]],coat,opacity);
  surface.polygon([[x-6,y-30],[x-5,y-35],[x,y-38],[x+6,y-34],[x+5,y-28],[x-4,y-27]],shadow,opacity);
  surface.span(y-35,x-5,x+2,coat,opacity);
  surface.span(y-32,x+1,x+5,accent,opacity);
  surface.line(x-4,y-25,x+6,y-20,coat,opacity);
  surface.line(x+3,y-20,x+9,y-17,accent,opacity);
}

function dusk(surface){
  banded(surface,0,136,[0x292738,0x353145,0x42384c,0x4d4151,0x554752]);
  surface.polygon([[0,114],[44,101],[85,117],[106,106],[139,113],[175,107],[200,113],[239,93],[276,111],
    [319,104],[319,136],[0,136]],0x3c3546);
  surface.polygon([[16,136],[20,84],[35,79],[55,89],[60,136]],0x292735);
  surface.polygon([[252,136],[258,81],[271,70],[293,79],[300,136]],0x302d3c);
  surface.span(91,21,55,0x564753,0.49);
  surface.span(87,258,292,0x66525c,0.41);
  floor(surface,136,0x3e3945,0x292839,0x605264);
}

function iceHall(surface){
  banded(surface,0,144,[0x152236,0x1a293e,0x233447,0x293b4b,0x354454]);
  for(const [x,top] of [[30,45],[90,78],[229,78],[290,40]]){
    surface.polygon([[x-12,143],[x-10,top+9],[x,top],[x+11,top+9],[x+13,143]],0x263749);
    surface.polygon([[x-9,143],[x-7,top+10],[x,top+4],[x+1,143]],0x37495a);
    surface.line(x-7,top+10,x-9,139,0x5d7181,0.43);
  }
  surface.polygon([[102,85],[160,51],[217,83],[218,87],[160,59],[104,91]],0x394c5d);
  floor(surface,144,0x354650,0x243443,0x526777);
}

function canyon(surface){
  banded(surface,0,180,[0x191f32,0x22283a,0x292e3e,0x383748,0x3c3948,0x282a3a]);
  surface.polygon([[0,107],[47,83],[92,101],[126,83],[172,106],[196,87],[231,98],
    [273,75],[320,93],[320,180],[0,180]],0x2a2e40);
  surface.polygon([[69,123],[101,143],[128,146],[152,154],[183,145],[228,127],[262,117],
    [278,180],[42,180]],0x1d2133);
  surface.polygon([[0,116],[36,112],[60,115],[69,121],[71,135],[63,147],[66,180],[0,180]],0x353942);
  surface.polygon([[0,116],[36,112],[60,115],[69,121],[0,122]],0x697158);
  surface.line(69,122,66,148,0x746951,0.69);
  surface.polygon([[251,121],[262,113],[301,113],[320,108],[320,180],[251,180],[256,153],[247,140]],0x373b43);
  surface.polygon([[251,121],[262,113],[301,113],[320,108],[320,120]],0x6b735c);
  surface.line(251,122,248,141,0x857459,0.62);
  for(const [x,y] of [[14,136],[38,143],[24,157],[55,169],[265,143],[295,128],[276,157],[290,170]]){
    surface.span(y,x,x+16,0x5c5860,0.58);
  }
}

export const inkVeilStage={...dimensions,x:160,y:136,drawBackdrop:dusk,
  drawActors(surface,x,y,time){
    const {step,faint}=inkVeilPose(time);
    ranger(surface,x-12+step,y,time,faint);
  },
  markerLabels:{release:'释烟',conceal:'隐踪',recover:'烟幕散去'},
};

export const frostLoomStage={...dimensions,x:160,y:104,drawBackdrop:iceHall,
  drawActors(surface,x,y,time){ranger(surface,x-7,y+40,time,0.88);},
  markerLabels:{guardReady:'晶甲锁定',deflect:'格挡',recover:'晶甲解体'},
};

export const jadeBridgeStage={...dimensions,x:160,y:121,drawBackdrop:canyon,
  drawActors(surface,x,y,time){
    const crossing=smooth(1.31,2.30,time),route=clamp(crossing)*6;
    const a=jadeDeck(Math.floor(route)),b=jadeDeck(Math.min(6,Math.ceil(route)));
    const yTile=a[1]+(b[1]-a[1])*(route%1);
    ranger(surface,x-106+212*crossing,y+yTile-6,time);
  },
  markerLabels:{release:'起桥',bridgeReady:'桥面锁定',recover:'桥面解体'},
};
