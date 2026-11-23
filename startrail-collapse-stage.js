import { startrailTarget, startrailTargetPose } from './startrail-collapse.js';

const originY=120,horizon=116;
const sky=[0x111629,0x131932,0x171d3a,0x1d2343,0x22274a,0x272a4f];
const planar=[0x282c46,0x252a43,0x24273e,0x21243a,0x1e2238,0x1b1f33,0x1b1e31];

function drawBackdrop(surface){
  const { width,height }=surface;
  for(let y=0;y<horizon;y++)surface.span(y,0,width-1,sky[Math.min(sky.length-1,Math.floor(y/20))]);
  surface.halo(145,73,146,49,0x3b3a67,0.57);
  surface.polygon([[0,96],[23,86],[42,87],[64,76],[88,84],[117,99],[147,89],[163,92],[194,73],
    [210,72],[236,88],[262,81],[304,94],[304,horizon],[0,horizon]],0x1c2440);
  surface.polygon([[0,108],[37,101],[59,108],[83,100],[117,105],[144,101],[181,108],
    [204,97],[226,101],[254,96],[279,103],[304,96],[304,horizon],[0,horizon]],0x232945);
  for(const [x,y] of [[17,70],[287,66]]){
    surface.polygon([[x-8,horizon],[x-6,y+9],[x+2,y],[x+8,y+6],[x+11,horizon]],0x242743);
    surface.line(x-5,y+10,x-7,horizon,0x3b3f63,0.69);
    surface.line(x-4,y+6,x+2,y,0x3c4269,0.59);
  }
  for(let y=horizon;y<height;y++)surface.span(y,0,width-1,planar[Math.min(planar.length-1,Math.floor((y-horizon)/13))]);
  for(const y of [116,125,137,152,172,198]){
    surface.span(y,0,width-1,0x171d33);
    surface.span(y+1,0,width-1,0x41465f,0.53);
  }
  for(let x=-78;x<=384;x+=57){
    const near=150+(x-150)*0.48;
    surface.line(near,horizon,x,height-1,0x161d33,0.86);
    surface.line(near+1,horizon,x+1,height-1,0x34405a,0.56);
  }
  for(let i=0;i<53;i++){
    const x=(67+i*89)%width,y=horizon+3+i*17%83;
    surface.span(y,x,x+i%4,0x626987,0.29);
  }
}

const wood=[0x695760,0x95766c,0xc0a183];
const echo=[0x465c9a,0x648abb,0xadcef0];

function dummy(surface,x,foot,lean,colors,opacity){
  const [rim,bark,light]=colors, c=x+lean;
  surface.span(foot,x-8,x+8,rim,opacity);
  surface.span(foot-1,x-7,x+7,bark,opacity);
  surface.line(x-2,foot-2,c-1,foot-31,rim,opacity);
  surface.line(x+1,foot-2,c+1,foot-31,bark,opacity);
  surface.polygon([[c-9,foot-32],[c+8,foot-32],[c+9,foot-25],[c+5,foot-14],[c-6,foot-14],[c-9,foot-24]],bark,opacity);
  surface.polygon([[c-8,foot-31],[c-1,foot-30],[c-1,foot-16],[c-7,foot-18]],rim,opacity*0.85);
  surface.span(foot-27,c-14,c+13,rim,opacity);
  surface.span(foot-28,c-12,c+11,light,opacity);
  surface.span(foot-19,c-6,c+7,rim,opacity);
  surface.span(foot-20,c-6,c+6,light,opacity);
  surface.ellipse(c,foot-39,6,6,bark,opacity);
  surface.span(foot-41,c-4,c+3,light,opacity);
  surface.span(foot-37,c-5,c+5,rim,opacity);
}

function drawActors(surface,x,y,time){
  const [tx,ty]=startrailTarget,baseX=x+tx,foot=y+ty,pose=startrailTargetPose(time);
  surface.ellipse(baseX+pose.x,foot+1,12,2,0x15192f,0.81);
  if(pose.ghost>0.008){
    dummy(surface,baseX+pose.x+8,foot+pose.y-0.6,pose.tilt*0.77,echo,pose.ghost*0.30);
    dummy(surface,baseX+pose.x-7,foot+pose.y-1.2,pose.tilt*1.18,echo,pose.ghost*0.37);
  }
  dummy(surface,baseX+pose.x,foot+pose.y,pose.tilt,wood,1);
}

export const startrailCollapseStage={
  width:304,height:204,x:152,y:originY,drawBackdrop,drawActors,
  markerLabels:{launch:'星核离门',impact:'星尘爆裂',targetHit:'引力拉扯',aftershock:'星轨余震',recover:'星门闭合'},
};
