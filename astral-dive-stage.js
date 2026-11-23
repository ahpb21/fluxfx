import { astralPose, astralTarget, astralTargetPose, drawAstralFigure } from './astral-dive-flight.js';
import { smooth } from './effect-drawing.js';

const startY=40, horizon=143;
const air=[0x12182b,0x161d34,0x1b233e,0x202740,0x262d48,0x2c3250];
const land=[0x30364e,0x2d3249,0x262e42,0x242b40,0x20273b,0x1c2336];

function drawBackdrop(surface){
  const {width,height}=surface;
  for(let y=0;y<horizon;y++)surface.span(y,0,width-1,air[Math.min(air.length-1,Math.floor(y/24))]);
  surface.halo(168,76,140,53,0x4a4874,0.62);
  surface.polygon([[0,93],[21,85],[51,88],[79,72],[110,77],[122,86],[141,79],[172,93],[202,84],
    [231,63],[260,72],[280,78],[304,73],[304,horizon],[0,horizon]],0x252d45);
  surface.polygon([[0,120],[31,101],[52,103],[67,115],[98,106],[129,120],[156,109],
    [181,117],[216,97],[245,112],[279,96],[304,106],[304,horizon],[0,horizon]],0x29304a);
  for(const [x,p] of [[18,109],[280,91]]){
    surface.polygon([[x-10,horizon],[x-9,p+5],[x-2,p-4],[x+6,p+2],[x+9,horizon]],0x212940);
    surface.line(x-8,p+4,x-9,horizon,0x56617e,0.46);
    surface.span(horizon-2,x-10,x+10,0x394660,0.73);
  }
  for(let y=horizon;y<height;y++)surface.span(y,0,width-1,land[Math.min(land.length-1,Math.floor((y-horizon)/10))]);
  for(const y of [143,152,165,182,202]){
    surface.span(y,0,width-1,0x1b2437);
    surface.span(y+1,0,width-1,0x566078,0.52);
  }
  for(let x=-119;x<416;x+=61){
    surface.line(153+(x-153)*0.55,horizon,x,height-1,0x172337,0.77);
  }
  for(let i=0;i<47;i++){
    const x=(31+i*91)%width,y=horizon+3+i*23%57;
    surface.span(y,x,x+i%5,0x6e728a,0.32);
  }
}

function dummy(surface,x,y,lean,opacity=1,ghost=false){
  const dark=ghost?0x476594:0x6c5656, wood=ghost?0x8bb5da:0x9b7866, straw=ghost?0xb5deeb:0xcaab87;
  const body=x+lean;
  surface.span(y,x-8,x+8,dark,opacity);
  surface.span(y-1,x-7,x+6,wood,opacity);
  surface.line(x-2,y-1,body-1,y-33,dark,opacity);
  surface.line(x+1,y-3,body+1,y-30,wood,opacity);
  surface.polygon([[body-9,y-33],[body+9,y-32],[body+9,y-23],[body+5,y-15],[body-6,y-15],
    [body-10,y-22]],wood,opacity);
  surface.span(y-28,body-13,body+13,dark,opacity);
  surface.span(y-27,body-12,body+11,straw,opacity);
  surface.span(y-20,body-7,body+7,straw,opacity);
  surface.ellipse(body,y-38,6,6,wood,opacity);
  surface.span(y-40,body-3,body+3,straw,opacity);
  surface.span(y-36,body-5,body+4,dark,opacity);
}

function drawActors(surface,x,y,time){
  const [tx,ty]=astralTarget,p=astralTargetPose(time),body=x+tx+p.x,foot=y+ty+p.y;
  surface.ellipse(body,y+ty+1,11,1.8,0x1b2237,0.86);
  if(p.echo>0.01)dummy(surface,body-7,foot-2,p.tilt*0.71,p.echo*0.35,true);
  dummy(surface,body,foot,p.tilt);
  const figure=astralPose(time),px=x+figure.x,py=y+figure.y;
  const heights=1-smooth(22,115,horizon-py),alive=figure.opacity*(1-smooth(3.07,3.36,time));
  surface.ellipse(px,horizon+9,13+4*(1-heights),1.8,0x161f33,alive*(0.24+heights*0.38));
  drawAstralFigure(surface,px,py,figure);
}

export const astralDiveStage={
  width:304,height:204,x:50,y:startY,drawBackdrop,drawActors,
  markerLabels:{launch:'首次俯冲',impact:'十字落击',aftershock:'反弹月刃',targetHit:'龙气交斩',recover:'拉升离场'},
};
