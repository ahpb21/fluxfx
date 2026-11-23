import { createParticleEmitter } from './components.js';
import { clamp, smooth, trace } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const blinkOut=0.18,blinkIn=0.30,blinkDistance=208;
export const blinkFrameRate=15;
const duration=0.80;
const navy=0x1b2a6b,blue=0x3f8cff,pale=0xbfe4ff,white=0xffffff;
const cobalt=0x4263b3,spark=0x81bfff,burn=0x222637;
const dustRamp=[0x2d334a,0x50566f,0x8b91a8];
const segments=16,step=blinkDistance/segments;

export function blinkPose(time){
  if(time>=blinkOut&&time<blinkIn)return null;
  const arrived=time>=blinkIn;
  return {x:arrived?blinkDistance:0,crouch:arrived?2*(1-smooth(blinkIn,0.43,time)):2*smooth(0.015,0.16,time),
    flash:arrived&&time<blinkIn+1/blinkFrameRate};
}

function makeBolt(random){
  let lastY=0;
  return Array.from({length:segments+1},(_,i)=>{
    const spine=i===0||i===segments?0:(i%2?1:-1)*(2+Math.floor(random()*4))+Math.round(2*Math.sin(i*0.52));
    const y=Math.max(lastY-9,Math.min(lastY+9,spine));
    lastY=y;
    return {x:i*step,y,fork:(i%2?1:-1)*(1+Math.floor(random()*2)),side:i%2?1:-1};
  });
}

function charge(back,front,time,arcs,light){
  if(time>=blinkOut)return;
  const heat=smooth(0.006,0.078,time),close=smooth(0.023,blinkOut,time);
  for(const [i,p] of arcs.entries()){
    const f=heat*(0.71+0.29*Math.sin(time*52+i*2.3)**2),extent=1-0.77*close;
    const x=p.x*extent,y=p.y*extent+2*close,target=i%2?front:back;
    trace(target,[[x,y],[x*0.74+p.s*3,y*0.69-2],[x*0.42-p.s*3,y*0.40+2],[x*0.21,y*0.18-1],[0,1]],
      i%2?blue:spark,f*0.90);
    target.dot(x,y,pale,f*0.92);
  }
  const ring=[[-12,1],[-8,-1],[-2,-3],[5,-2],[12,1],[6,4],[0,5],[-8,3],[-12,1]];
  for(let i=0;i<ring.length-1;i++){
    if((i+Math.floor(time*35))%4===1)continue;
    const target=i<4?back:front;
    target.line(...ring[i],...ring[i+1],i%2?pale:blue,heat*(0.59+0.35*close));
  }
  front.glow(0,2,12,blue,light*heat*(0.30+0.25*close));
}

function scorch(back,time){
  if(time<blinkOut)return;
  const f=1-smooth(0.68,duration,time);
  back.polygon([[-9,1],[-5,-2],[0,0],[3,-2],[8,1],[4,3],[-3,4],[-8,3]],burn,f*0.88);
  trace(back,[[-8,1],[-4,0],[0,2],[3,1],[6,2]],navy,f*0.67);
  back.dot(-6,3,0x45485b,f*0.83);
  back.dot(5,3,0x414652,f*0.74);
}

function pillar(front,x,time,cue,incoming,light){
  const t=time-cue,life=incoming?0.24:0.20;
  if(t<0||t>=life)return;
  const f=1-smooth(0.018,life,t),flash=1-smooth(0.015,incoming?0.074:0.059,t);
  const height=(incoming?54:48)*(0.62+0.38*f),w=(incoming?4.7:3.2)*(0.70+0.30*flash);
  const wind=Math.sin(t*75+(incoming?1.31:0.32))*3;
  const shape=(scale,shift=0)=>[
    [x-w*2.2*scale+shift,3],[x-w*scale+shift,-4],[x-w*0.63*scale+shift,-height*0.50],
    [x+wind*scale+shift,-height],[x+w*0.71*scale+shift,-height*0.59],[x+w*0.49*scale+shift,-height*0.27],
    [x+w*1.45*scale+shift,-3],[x+w*2.10*scale+shift,2],[x+w*0.68*scale+shift,4],
  ];
  front.polygon(shape(1.68),navy,f*0.79);
  front.polygon(shape(1.03),blue,f*0.96);
  front.polygon(shape(0.55),pale,f*0.94);
  if(flash>0.006)front.polygon(shape(0.30),white,flash);
  const branches=incoming?[[-9,9],[-17,11],[-19,19],[9,-15],[15,-18]]:[[-8,5],[-14,10],[8,-9],[13,-15]];
  for(const [i,[dx,dy]] of branches.entries()){
    const start=-height*(0.15+i*0.073);
    trace(front,[[x,start],[x+dx*0.39,start+dy*0.33],[x+dx*0.77,start+dy*0.66],[x+dx,start+dy]],
      i%2?blue:pale,f*(0.74+flash*0.24));
  }
  front.span(1,Math.round(x-w*3.2),Math.round(x+w*3.2),pale,f*0.89);
  front.glow(x,-height*0.38,incoming?24:17,blue,light*f*(incoming?0.55:0.39));
  front.glow(x,-5,incoming?21:13,pale,light*flash*(incoming?0.92:0.55));
  if(incoming)front.glow(x,-height*0.74,15,pale,light*flash*0.53);
}

function conductor(back,front,time,bolt,light){
  if(time<blinkOut||time>=0.67)return;
  const reach=time>=blinkIn?16:time>=0.26?15:time>=0.22?11:5;
  for(let i=0;i<reach;i++){
    const a=bolt[i],b=bolt[i+1],u=i/(segments-1);
    const f=1-smooth(0.30+0.173*u,0.397+0.192*u,time);
    const after=1-smooth(0.39+0.11*u,0.53+0.13*u,time);
    if(after>0.005 && (i%3!==1 || time<0.37)){
      const trail=a.side*(2+i%3),strength=after*(0.38+0.29*Math.sin(time*43+i*2.9)**2);
      trace(back,[[a.x,a.y+trail],[a.x+5,(a.y+b.y)/2+trail*2],[b.x,b.y+trail*1.35]],cobalt,strength);
    }
    if(f<=0.003)continue;
    front.line(a.x,a.y-1,b.x,b.y-1,navy,f);
    front.line(a.x,a.y+1,b.x,b.y+1,blue,f*0.89);
    front.line(a.x,a.y,b.x,b.y,pale,f*(i%3===1?0.91:1));
    front.line(b.x,b.y,b.x+a.side,b.y+b.fork,blue,f*0.91);
    if(i%2===1)front.glow(b.x,b.y,9,blue,light*f*(i+1===reach?0.55:0.36));
  }
}

function dust(back,time,puffs){
  let count=0;
  for(const p of puffs){
    const age=time-p.at,u=age/p.life;
    if(u<=0||u>=1)continue;
    const travel=1-(1-u)**1.61,x=p.x+p.vx*travel,y=2-p.lift*(travel*0.77+u*0.23);
    const size=p.radius*(0.43+u*0.83),a=smooth(0,0.17,u)*(1-smooth(0.49,1,u))*(1-smooth(0.72,duration,time));
    drawPixelSmoke(back,x,y,{rx:size,ry:size*(0.37+u*0.13),colors:dustRamp,opacity:a*p.opacity,
      age:u,variant:p.variant,shear:p.vx*0.17});
    count++;
  }
  return count;
}

function hoppingSparks(random,low,light){
  return createParticleEmitter(random,{
    count:low?20:39,
    spawn(r,i){
      const dest=i%3!==0,side=i%2?1:-1,anchor=dest?blinkDistance:0;
      const at=(dest?blinkIn:blinkOut)+r()*0.15,lifetime=Math.min(0.13+r()*0.26,0.665-at);
      return {at,lifetime,x:anchor+side*(3+r()*8),y:-1-r()*2,
        vx:side*(53+r()*15),vy:-18-r()*32,gravity:247,floor:3,restitution:0.45,friction:0.73,
        trail:0.021,data:{color:i%5===0?pale:blue,long:i%4===0}};
    },
    draw(surface,p){
      const a=1-smooth(0.35,1,p.progress),x=Math.round(p.x);
      surface.line(p.previousX,p.previousY,x,p.y,blue,a*0.87);
      surface.span(p.y,x,x+(p.data.long?1:0),p.data.color,a*0.96);
      if(p.data.long)surface.glow(x,p.y,6,blue,light*a*0.42);
    },
  });
}

export const lightningBlink={
  title:'雷闪折跃',english:'Lightning Blink',duration,loop:false,previewTime:blinkIn,
  events:[
    {at:blinkOut,name:'blink_out',data:{x:0,y:0,visible:false}},
    {at:blinkIn,name:'blink_in',data:{x:blinkDistance,y:0,visible:true}},
  ],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light),bolt=makeBolt(random);
    const arcs=Array.from({length:4},(_,i)=>({x:(i%2?1:-1)*(14+i*5+random()*4),
      y:-6-i*6-random()*4,s:i%2?1:-1}));
    const puffs=Array.from({length:low?15:28},(_,i)=>{
      const dest=i%3!==0, side=i%2?1:-1;
      return {at:(dest?blinkIn:blinkOut)+random()*0.16,life:0.26+random()*0.29,
        x:(dest?blinkDistance:0)+side*(2+random()*9),vx:side*(11+random()*27),
        lift:3+random()*14,radius:3.7+random()*10.2,variant:i,opacity:0.31+random()*0.40};
    });
    const remaining=Array.from({length:4},(_,i)=>({x:(i%2?blinkDistance:0)+(i<2?-1:1)*(10+random()*20),
      y:-2+random()*4,phase:random()*4}));
    const drawSparks=hoppingSparks(random,low,glow);
    return (front,time,ctx)=>{
      const back=ctx?.back??front;
      charge(back,front,time,arcs,glow);
      scorch(back,time);
      const clouds=dust(back,time,puffs);
      conductor(back,front,time,bolt,glow);
      pillar(front,0,time,blinkOut,false,glow);
      pillar(front,blinkDistance,time,blinkIn,true,glow);
      drawSparks(front,time,ctx);
      const f=smooth(0.51,0.63,time)*(1-smooth(0.735,duration,time));
      if(f>0.004){
        for(const p of remaining){
          const y=p.y-Math.abs(Math.sin(time*39+p.phase))*2.7;
          front.dot(p.x,y,f>0.65?spark:cobalt,f*0.75);
        }
      }
      ctx?.countParticles(clouds+(f>0.004?remaining.length:0));
    };
  },
};
