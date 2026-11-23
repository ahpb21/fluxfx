import { infernoDummyOffset, infernoScorch, infernoTarget } from './infernal-lotus.js';

const floor = 140;
const air = [0x170f22, 0x1d1226, 0x24152a, 0x2b192f, 0x311c30, 0x381e32, 0x3b2131];
const basalt = [0x3b2836, 0x342534, 0x302332, 0x292131, 0x241f2e, 0x221c2b];

function column(surface, x, top, w, shade) {
  surface.polygon([[x-w, floor], [x-w*0.81, top+11], [x-w*0.52, top], [x+w*0.56, top+2],
    [x+w*0.82, top+8], [x+w, floor]], shade);
  surface.polygon([[x-w*0.71, floor], [x-w*0.67,top+13], [x-w*0.42,top+7],
    [x+w*0.03,top+9], [x+w*0.10,floor]], 0x382535);
  surface.line(x-w*0.67,top+13,x-w*0.71,floor,0x4b2b3b,0.47);
  for(let y=top+24;y<floor;y+=20)surface.span(y,x-w*0.78,x+w*0.78,0x211a2a,0.59);
}

function drawBackdrop(surface) {
  const { width,height }=surface;
  for(let y=0;y<floor;y++)surface.span(y,0,width-1,air[Math.min(air.length-1,Math.floor(y/20))]);
  surface.ellipse(152,88,145,51,0x46243b,0.39);
  surface.polygon([[0,94],[35,83],[63,96],[92,79],[110,91],[147,96],[183,83],[209,70],
    [228,83],[252,82],[279,69],[304,76],[304,141],[0,141]],0x271b2d);
  surface.polygon([[0,116],[35,105],[56,116],[86,107],[117,114],[149,107],[188,114],[214,107],
    [241,118],[269,101],[304,111],[304,141],[0,141]],0x2c2031);
  column(surface,23,44,17,0x271b2d);
  column(surface,278,30,21,0x231a2b);
  column(surface,61,90,8,0x2b1d2f);
  column(surface,248,81,10,0x2a1c2f);
  for(let y=floor;y<height;y++){
    surface.span(y,0,width-1,basalt[Math.min(basalt.length-1,Math.floor((y-floor)/11))]);
  }
  for(const y of [floor,149,162,179,200]){
    surface.span(y,0,width-1,0x201824);
    surface.span(y+1,0,width-1,0x60404a,0.52);
  }
  for(let x=-64;x<376;x+=55)surface.line(152+(x-152)*0.66,floor+1,x,height-1,0x1f1927,0.77);
  for(let i=0;i<57;i++){
    const x=(45+i*89)%width,y=floor+2+i*23%61;
    surface.span(y,x,x+i%5,0x6e4a50,0.36);
  }
  for(let i=0;i<25;i++){
    const x=(38+i*79)%width,y=14+i*39%115;
    surface.dot(x,y,0x6d3b4b,i%5?0.40:0.67);
  }
}

function drawActors(surface,x,y,time){
  const base=x+infernoTarget,offset=infernoDummyOffset(time),cx=base+offset, scorch=infernoScorch(time);
  const rim=scorch>0.63?0x3d2b33:0x694b45, wood=scorch>0.50?0x624149:0x976a52,
    light=scorch>0.71?0x88605a:0xc09873;
  surface.ellipse(base,y+1,12,2,0x221826,0.84);
  surface.span(y,base-8,base+9,rim);
  surface.span(y-1,base-7,base+7,wood);
  surface.line(base-1,y-1,cx-1,y-35,rim);
  surface.line(base+1,y-3,cx+2,y-32,wood);
  surface.polygon([[cx-9,y-33],[cx+8,y-34],[cx+9,y-21],[cx+4,y-13],[cx-6,y-14],[cx-10,y-21]],wood);
  surface.span(y-29,cx-13,cx+13,rim);
  surface.span(y-28,cx-10,cx+11,light);
  surface.span(y-21,cx-6,cx+7,rim);
  surface.span(y-19,cx-5,cx+6,light);
  surface.ellipse(cx,y-39,6,6,wood);
  surface.span(y-41,cx-3,cx+4,light);
  surface.span(y-37,cx-5,cx+4,rim);
  if(scorch>0.24){
    surface.polygon([[cx-5,y-29],[cx,y-30],[cx-1,y-24],[cx-6,y-23]],0x2f212b,scorch);
    surface.polygon([[cx+1,y-22],[cx+7,y-24],[cx+4,y-18],[cx-1,y-19]],0x33232e,scorch);
    surface.dot(cx+2,y-39,0x33232e,scorch);
    surface.dot(cx-2,y-28,0xec784d,scorch*(0.54+0.20*Math.sin(time*18))*(1-Math.min(1,Math.max(0,(time-2.6)/1.7))));
  }
}

export const infernalLotusStage={
  width:304,height:204,x:152,y:floor,drawBackdrop,drawActors,
  markerLabels:{launch:'法阵激活',impact:'业火冲天',targetHit:'火暴卷入',aftershock:'余烬再燃',recover:'红莲收焰'},
};
