import { veinCameraOffset, veinDummyPose, veinTarget } from './dragon-vein.js';

const originY=145, horizon=140;
const sky=[0x131524,0x191a2a,0x1e2031,0x252538,0x29283b,0x302b41];
const slate=[0x413847,0x3b3445,0x362f41,0x302d3c,0x2a2737,0x252432];

function drawBackdrop(surface){
  const {width,height}=surface;
  for(let y=0;y<horizon;y++)surface.span(y,0,width-1,sky[Math.min(sky.length-1,Math.floor(y/24))]);
  surface.ellipse(147,107,162,52,0x3c3147,0.52);
  surface.polygon([[0,103],[29,101],[58,83],[74,68],[93,74],[116,104],[141,98],[163,101],
    [198,73],[218,80],[241,55],[263,63],[304,101],[304,horizon],[0,horizon]],0x2b293d);
  surface.polygon([[0,131],[34,119],[61,123],[89,106],[119,122],[145,125],[176,109],[200,116],[232,103],[270,112],
    [304,107],[304,horizon],[0,horizon]],0x323044);
  for(const [x,y,w] of [[19,49,19],[284,57,20]]){
    surface.polygon([[x-w,horizon],[x-w*0.53,y+12],[x-w*0.17,y],[x+w*0.33,y+4],[x+w*0.70,y+16],[x+w,horizon]],0x252436);
    surface.polygon([[x-w*0.8,horizon],[x-w*0.47,y+12],[x-w*0.12,y+4],[x+w*0.16,y+8],[x+w*0.04,horizon]],0x393245);
    surface.line(x-w*0.46,y+12,x-w*0.81,horizon,0x5c4a5b,0.49);
  }
  for(let y=horizon;y<height;y++)surface.span(y,0,width-1,slate[Math.min(slate.length-1,Math.floor((y-horizon)/11))]);
  for(const [y,a,b] of [[140,0,304],[148,4,302],[157,1,304],[171,0,304],[192,0,304]]){
    surface.span(y,a,b,0x262435);
    surface.span(y+1,a+1,b-1,0x52465b,0.49);
  }
  for(let x=-85;x<390;x+=55){
    surface.line(149+(x-149)*0.56,horizon,x,height-1,0x262435,0.76);
    surface.line(150+(x-149)*0.56,horizon,x+1,height-1,0x4c4154,0.46);
  }
  for(let i=0;i<58;i++){
    const x=(i*73+23)%width,y=horizon+3+i*31%58;
    surface.span(y,x,x+i%6,0x6a5769,0.36);
  }
}

function drawActors(surface,x,y,time){
  const [tx,ty]=veinTarget, base=x+tx, floor=y+ty, pose=veinDummyPose(time);
  const cx=base+pose.x, b=floor+pose.y, top=cx+pose.tilt;
  const wood=0x997259, highlight=0xc5a482, dark=0x634b46, side=0x8e6c57;
  surface.ellipse(cx,floor+1,12,2,0x221e2d,0.85-Math.min(0.49,Math.abs(pose.y)*0.022));
  surface.span(b,cx-8,cx+8,dark);
  surface.span(b-1,cx-7,cx+7,side);
  surface.line(cx-1,b,top,b-33,dark);
  surface.line(cx+1,b-2,top+2,b-31,wood);
  surface.polygon([[top-9,b-32],[top+8,b-33],[top+9,b-23],[cx+7,b-14],[cx-6,b-15],[top-10,b-24]],wood);
  surface.polygon([[top-7,b-30],[top+4,b-30],[cx+3,b-16],[cx-4,b-17]],side);
  surface.span(b-28,top-13,top+13,dark);
  surface.span(b-27,top-12,top+12,highlight);
  surface.span(b-21,cx-7,cx+7,dark);
  surface.span(b-20,cx-5,cx+6,highlight);
  surface.ellipse(top,b-38,6,6,wood);
  surface.span(b-40,top-3,top+3,highlight);
  surface.span(b-36,top-5,top+4,dark);
}

export const dragonVeinStage={
  width:304,height:204,x:152,y:originY,drawBackdrop,drawActors,cameraOffset:veinCameraOffset,
  markerLabels:{launch:'岩龙破土',impact:'龙首震地',targetHit:'龙尾横扫',aftershock:'岩柱余震',recover:'熔光消退'},
};
