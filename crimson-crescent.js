import { clamp, smooth } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const crimsonCast=0.25, crimsonHit=0.33, crimsonTarget=[112,-16];
export const crimsonFlashEnd=crimsonHit+1/12;
const duration=0.90;
const dark=0x4a0f1f, red=0xa32b28, orange=0xe2461f, yellow=0xffd35a, hot=0xfff6d0;
const smoke=[0x341c2a,0x643645,0xa06062];

export function crimsonWeaponOffset(time){
  const draw=smooth(0,0.17,time)*(1-smooth(0.18,crimsonCast,time));
  return {x:-5*draw,y:6*draw};
}

function charge(back,front,time,offset,embers,light){
  const show=smooth(0.015,0.115,time);
  if(show<=0.003)return 0;
  const x=offset.x,y=offset.y,gather=smooth(0.06,crimsonCast,time);
  const point=u=>{
    const a=(0.99-u*(1.89+0.61*gather)),r=18-7*gather;
    return [x-3+Math.cos(a)*r,y+Math.sin(a)*(23-9*gather)];
  };
  const first=0.11+0.35*gather,last=0.37+0.63*show;
  for(let i=0;i<18;i++){
    const u=i/18,v=(i+1)/18;
    if(u<first||v>last)continue;
    const a=point(u),b=point(v);
    back.line(a[0]-1,a[1]+1,b[0]-1,b[1]+1,dark,show*0.92);
    front.line(...a,...b,i%5===0?orange:red,show*(0.60+0.34*gather));
  }
  for(const p of embers){
    const k=smooth(0,0.108,time),u=smooth(p.delay,crimsonCast,time);
    const px=x+p.x*(1-u),py=y+p.y*(1-u);
    front.dot(px,py,p.color,k*(1-0.32*u));
    if(u>0.32&&u<0.88)back.dot(px+p.x*0.11,py+p.y*0.11,red,k*0.59);
  }
  front.glow(x+5,y,7,orange,light*show*gather*0.16);
  return embers.length;
}

function crescent(front,time,teeth,light){
  if(time<crimsonCast||time>=0.735)return;
  const u=clamp((time-crimsonCast)/(crimsonHit-crimsonCast));
  const after=smooth(crimsonHit,0.60,time),f=1-smooth(0.36,0.735,time);
  const dx=crimsonTarget[0]*u+(time>crimsonHit?after*14:0);
  const dy=crimsonTarget[1]*u-after*4;
  const thickness=(6+8*u)*(1-smooth(0.53,0.735,time)*0.61);
  const hUp=14+31*u+after*3,hDown=12+21*u+after*2;
  const yellowTime=(0.59+0.41*u)*(1-smooth(0.395,0.57,time));
  const flash=time>=crimsonHit?1-smooth(crimsonHit,0.364,time):0;
  for(let row=Math.ceil(dy-hUp);row<=Math.floor(dy+hDown);row++){
    const z=(row-dy)/(row<dy?hUp:hDown),side=Math.abs(z);
    const bend=(z<0?55+u*11:40+u*8)*side**1.7*(0.33+u*0.67);
    const margin=thickness*(1-side)**0.72;
    if(margin<0.41)continue;
    const edge=dx-bend, step=teeth[(row+teeth.length*4)%teeth.length];
    const serration=side>0.17?(side>0.67?step+1:step)*u:0;
    const left=Math.round(edge-margin)+1,right=Math.round(edge+serration);
    if(left>right)continue;
    const body=left+Math.round(margin*0.27),band=left+Math.round(margin*0.56);
    const energy=f*(0.93+Math.sin(side*Math.PI)*0.07);
    front.span(row,left,right,dark,energy);
    front.span(row,body,right,red,energy);
    front.span(row,band,right,orange,energy*(1-0.40*after));
    if(yellowTime>0.012)front.span(row,Math.max(band,right-(side<0.78?2:1)),right,yellow,
      yellowTime*f*(0.91-side*0.52));
    if(flash>0.003&&side<0.25)front.span(row,right,right,hot,flash*(1-side*2.4)*0.83);
  }
  if(light>0&&yellowTime>0.02){
    for(const k of [-0.61,-0.25,0,0.31,0.60]){
      const r=Math.abs(k),bend=(k<0?55+u*11:40+u*8)*r**1.7*(0.33+u*0.67);
      front.glow(dx-bend,dy+k*(k<0?hUp:hDown),8+5*u,yellow,light*yellowTime*f*(0.12+0.24*(1-r)));
    }
  }
}

function sparksAt(time,law){
  const active=[];
  for(const p of law){
    const age=time-p.at,u=age/p.life;
    if(u<=0||u>=1)continue;
    const x=p.x+p.vx*age*(1-u*0.21),y=p.y+p.vy*age+10*age*age;
    active.push({x,y,p,alpha:(1-u)**0.82});
  }
  return active;
}

function smokePuffs(back,time,puffs,sparks){
  let count=0;
  for(const p of puffs){
    const age=time-p.at,u=age/p.life;
    if(u<=0||u>=1)continue;
    const x=p.x+(8.5+p.drift)*age+Math.sin(p.phase+u*3.8)*u*2.7,y=p.y-(10.5+p.rise)*age;
    const rx=p.size*(0.57+u*0.97),ry=rx*(0.59+p.width*0.14);
    const a=smooth(0,0.21,u)*(1-smooth(0.53,1,u))*(1-smooth(0.84,duration,time))*p.opacity;
    const gaps=[];
    for(const spark of sparks){
      const overlap=Math.hypot((x-spark.x)/rx,(y-spark.y)/ry);
      if(overlap<0.59||overlap>1.09||spark.alpha<0.19)continue;
      const px=Math.round(spark.x),py=Math.round(spark.y);
      gaps.push({left:px-3,right:px+2,top:py-2,bottom:py+1});
    }
    gaps.sort((a,b)=>a.left-b.left);
    drawPixelSmoke(back,x,y,{rx,ry,colors:smoke,opacity:a,age:u,variant:p.phase*5,shear:3.7,gaps});
    count++;
  }
  return count;
}

export const crimsonCrescent={
  title:'赤焰新月斩',english:'Crimson Crescent',duration,loop:false,previewTime:crimsonHit,
  events:[
    {at:crimsonCast,name:'cast',data:{x:0,y:0}},
    {at:crimsonHit,name:'hit',data:{x:crimsonTarget[0],y:crimsonTarget[1],pushX:2}},
  ],
  build(random,{quality='full',light=1,chargeOffset=crimsonWeaponOffset}={}){
    const low=quality==='low',glow=clamp(light),[hx,hy]=crimsonTarget;
    const teeth=Array.from({length:61},()=>random()<0.38?1+Math.floor(random()*2):0);
    const chargeEmbers=Array.from({length:4},(_,i)=>({
      x:8+random()*16,y:(i-1.5)*12+random()*6,delay:0.028+i*0.029,color:i%3?orange:yellow,
    }));
    const puffs=Array.from({length:low?9:15},(_,i)=>({
      at:crimsonHit+random()*0.126,life:0.23+random()*0.28,
      x:hx-5+random()*24+(i%3===0?5:0),y:hy+8+(i%5-2)*4+(random()-0.5)*6,
      drift:random()*2.7,rise:random()*4.7,size:4.7+random()*8.4,width:random(),
      phase:random()*6.28,opacity:0.37+random()*0.27,
    }));
    for(let i=0;i<3;i++){
      puffs.push({at:0.40+i*0.033,life:0.51,x:hx+7+i*6,y:hy+2-i*8,
        drift:1.4,rise:4.1,size:5.2+i*1.1,width:0.52,phase:1.91+i*1.33,opacity:0.61});
    }
    const sparks=Array.from({length:low?21:36},(_,i)=>{
      const u=(random()-0.5)*2,bend=Math.abs(u)**1.55,near=i%3!==0,through=i%4===0;
      return {at:crimsonHit+random()*0.065,life:0.12+random()*0.245,
        x:through?hx-6+random()*20:hx-bend*28+random()*7,
        y:through?hy+(random()-0.42)*21:hy+u*32,
        vx:near?27+random()*18:17+random()*13,vy:(u<0?-1:1)*(10+bend*23)-5,
        near,color:i%4===0?yellow:orange,width:i%4===3?2:1};
    });
    const residue=Array.from({length:6},(_,i)=>({
      x:hx-8+i*4.2+random()*5,y:hy-14+random()*27,rate:4+random()*7,
    }));
    return (front,time,ctx)=>{
      const back=ctx?.back??front;
      if(time<crimsonCast){
        const count=charge(back,front,time,chargeOffset(time),chargeEmbers,glow);
        ctx?.countParticles(count);
        return;
      }
      const active=sparksAt(time,sparks);
      const smokeCount=smokePuffs(back,time,puffs,active);
      crescent(front,time,teeth,glow);
      for(const {x,y,p,alpha} of active){
        const surface=p.near?front:back;
        surface.line(x-p.vx*0.068,y-p.vy*0.068,x,y,p.near?red:dark,alpha*0.87);
        surface.span(y,Math.round(x),Math.round(x)+p.width-1,p.color,alpha*(p.near?0.97:0.68));
      }
      if(time>=crimsonHit&&time<0.364){
        front.span(hy-1,hx-1,hx,hot);
        front.span(hy,hx-1,hx,hot);
        front.glow(hx,hy,14,yellow,glow*(1-smooth(crimsonHit,0.364,time))*0.92);
      }
      const embers=smooth(0.59,0.68,time)*(1-smooth(0.81,duration,time));
      if(embers>0.005){
        for(const p of residue)front.dot(p.x+(time-0.59)*p.rate,p.y-(time-0.59)*p.rate,red,embers*0.88);
      }
      ctx?.countParticles(smokeCount+active.length+(embers>0.005?residue.length:0));
    };
  },
};
