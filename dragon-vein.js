import { createParticleEmitter, drawRibbon } from './components.js';
import { clamp, glint, smooth } from './effect-drawing.js';
import { drawVeinDragon } from './dragon-vein-body.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const veinTiming = { launch: 0.90, impact: 0.98, targetHit: 1.56, aftershock: 2.44, recover: 3.20 };
const { launch, impact, targetHit, aftershock, recover } = veinTiming;
const duration = 5.20, tau = Math.PI*2;
export const veinStart = [-112,15], veinEnd = [108,25], veinTarget = [81,18];
const crackPath = [veinStart,[-93,10],[-73,16],[-55,7],[-38,9],[-18,2],[0,0],[18,7],[35,5],[51,14],[67,11],veinTarget,[95,20],veinEnd];
const dark = 0x231c28, stone = 0x51414e, warmRock = 0x695451, ash = 0x3a2e3a, maroon = 0x8e382e;
const magma = 0xe96a35, gold = 0xffb660, white = 0xffe3a4;
const dustRamp = [0x3b2d38, 0x594b59, 0x81717b];

const pulses = [
  {at:impact,x:0,y:0,amplitude:5,life:0.46,radius:105},
  {at:targetHit,x:veinTarget[0],y:veinTarget[1],amplitude:5.9,life:0.41,radius:82},
  {at:2.21,x:-47,y:9,amplitude:1.2,life:0.38,radius:46},
  {at:aftershock,x:27,y:7,amplitude:2,life:0.47,radius:68},
  {at:2.73,x:-26,y:7,amplitude:1.3,life:0.36,radius:52},
  {at:3.04,x:61,y:15,amplitude:1.1,life:0.34,radius:47},
];

export function veinCameraOffset(time) {
  const pre = time<launch?smooth(0.04,0.28,time)*(1-smooth(0.60,launch,time)):0;
  let x=Math.sin(time*17)*pre*1.3,y=Math.sin(time*20+1)*pre*1.02;
  for(const p of pulses){
    const age=time-p.at;
    if(age<0||age>=p.life)continue;
    const amplitude=p.amplitude*(1-age/p.life)**1.7;
    x+=Math.sin(age*73+0.5)*amplitude;
    y+=Math.cos(age*59+0.4)*amplitude*0.65;
  }
  return [Math.round(x),Math.round(y)];
}

export function veinDummyPose(time) {
  const age=time-targetHit;
  if(age<0)return {x:0,y:0,tilt:0};
  const u=clamp(age/0.47), kick=1-smooth(0.28,0.76,age);
  const hop=16.5*4*u*(1-u);
  const tremor=Math.sin(age*64)*2.2*kick;
  const land=age>=0.47?Math.sin(Math.PI*clamp((age-0.47)/0.20))*3.1:0;
  return {x:18*smooth(0,0.24,age)-6*smooth(0.42,0.84,age)+tremor,
    y:-hop-land,tilt:11*smooth(0,0.11,age)*kick};
}

function channel(surface,a,b,width,color,alpha,shift=0){
  if(alpha<=0.004)return;
  if(width<=1.1){
    surface.line(a[0],a[1]+shift,b[0],b[1]+shift,color,alpha);
    return;
  }
  const w=width*0.5;
  surface.polygon([[a[0],a[1]+shift-w],[b[0],b[1]+shift-w],[b[0],b[1]+shift+w],[a[0],a[1]+shift+w]],color,alpha);
}

function fissure(back,time,branches,light){
  const forming=smooth(0.035,0.52,time), split=smooth(0.58,launch,time), fade=1-smooth(4.37,duration,time);
  if(forming<=0.002||fade<=0.003)return;
  const molten=(0.39+0.61*split)*(1-smooth(recover,4.94,time));
  const glow=light*fade*molten, age=time-impact;
  back.halo(0,5,78,17,maroon,fade*forming*(0.54+split*0.30));
  for(let i=0;i<crackPath.length-1;i++){
    const a=crackPath[i],b=crackPath[i+1],dist=Math.abs(i-6)/7;
    const read=smooth(0.065+(1-dist)*0.25,0.32+(1-dist)*0.24,time);
    const throb=0.54+0.46*Math.sin(time*(time<launch?14:19)+i*0.71)**2;
    const weight=fade*read*(0.55+0.45*split);
    const width=1.7+(4.2+3.4*(1-dist))*split;
    channel(back,a,b,width+3,warmRock,weight*0.58,1.9);
    channel(back,a,b,width,dark,weight*0.96);
    channel(back,a,b,0.9+width*0.29,maroon,fade*read*(0.56+0.38*molten));
    channel(back,a,b,0.9,molten>0.56?gold:magma,fade*read*throb*(0.28+0.63*molten),0.4);
    if(i%2===0)back.glow((a[0]+b[0])*0.5,(a[1]+b[1])*0.5,10+8*split,magma,glow*read*throb*0.53);
  }
  for(const branch of branches){
    const start=branch.early ? 0.19+branch.delay*0.26 : 0.91+branch.delay;
    const forward=smooth(start,start+(branch.early?0.37:0.35),time)*(branch.early?0.38+0.62*split:1);
    const activeSteps=(branch.points.length-1)*forward;
    for(let i=0;i<activeSteps;i++){
      const a=branch.points[i],[x,y]=branch.points[i+1],u=Math.min(1,activeSteps-i);
      const b=[a[0]+(x-a[0])*u,a[1]+(y-a[1])*u], width=1.3+(1-i/branch.points.length)*3.6*split;
      channel(back,a,b,width,dark,fade*(0.45+0.5*split));
      if(i%2===0 || age<0.64)channel(back,a,b,1,i===0&&molten>0.53?magma:maroon,fade*(0.3+molten*0.53));
    }
  }
}

function shock(front,time,light){
  for(const p of pulses){
    const age=time-p.at;
    if(age<0||age>=p.life)continue;
    const u=age/p.life,r=12+p.radius*(1-(1-u)**2.8),punch=Math.min(1,p.amplitude/3.7);
    const f=(1-smooth(0.07,1,u))*punch;
    const rim=v=>{
      const a=v*tau,d=r+Math.sin(a*9-u*15)*4*u;
      return [p.x+Math.cos(a)*d,p.y+Math.sin(a)*d*0.255];
    };
    drawRibbon(front,{point:rim,width:2+6*(1-u)*punch,segments:48,color:maroon,edge:magma,opacity:f*0.91});
    drawRibbon(front,{point:rim,width:0.75+2.2*(1-u)*punch,segments:48,color:u<0.39?white:gold,opacity:f*0.96});
    for(let j=0;j<8;j++){
      const [x,y]=rim(j/8);
      front.glow(x,y,9+6*f,magma,light*f*0.48);
    }
    if(u<0.18){
      const flash=(1-u/0.18)*punch;
      front.glow(p.x,p.y-6,31,white,light*flash*0.85);
      glint(front,p.x,p.y-3,9+flash*16,white,flash*0.90);
    }
  }
}

const vents=[
  {at:impact,x:0,y:0,height:59,bend:7,life:0.78,width:13},
  {at:2.14,x:-50,y:9,height:30,bend:-10,life:0.74,width:8.1},
  {at:2.39,x:29,y:7,height:51,bend:8,life:0.69,width:9.4},
  {at:2.62,x:-24,y:5,height:42,bend:-7,life:0.62,width:8.5},
  {at:2.85,x:60,y:15,height:28,bend:4,life:0.68,width:7.8},
];

function drawVents(back,front,time,light,low){
  for(const vent of vents){
    const age=time-vent.at;
    if(age<0||age>=vent.life)continue;
    const u=age/vent.life, early=vent.at===impact;
    const swell=smooth(0,0.19,u)*(1-smooth(0.43,1,u));
    const height=vent.height*(0.21+swell*0.79), strength=1-smooth(0.25,1,u);
    const {x,y,width:w}=vent;
    back.ellipse(x,y+2,w+6,3,dark,strength*0.90);
    front.ellipse(x,y,w+2,2.3,gold,strength*0.82);
    if(!early){
      const rim=[[x-w*0.74,y],[x-w*0.62,y-height*0.84],[x+vent.bend*0.54,y-height],
        [x+w*0.60+vent.bend*0.19,y-height*0.90],[x+w*0.72,y-1],[x+w*0.23,y+3]];
      front.polygon(rim,ash,strength);
      front.polygon([rim[0],rim[1],rim[2],[x-w*0.20,y-height*0.68],[x-w*0.17,y+2]],stone,strength*0.98);
      front.polygon([rim[2],rim[3],rim[4],[x+w*0.20,y-height*0.20],[x+w*0.14,y-height*0.77]],warmRock,strength*0.77);
      front.line(x-2,y-height*0.75,x-0.9,y-7,magma,strength*0.89);
      front.line(...rim[1],...rim[2],gold,strength*0.83);
    }
    const point=p=>[x+vent.bend*p+Math.sin(age*28+p*7)*p*4,y-height*p-(early?0:height*0.34*p)];
    drawRibbon(front,{point,width:p=>w*(1-p*0.84),segments:low?10:18,color:early?magma:maroon,edge:magma,opacity:strength*(early?0.98:0.58)});
    drawRibbon(front,{point,width:p=>w*(0.36-p*0.31),segments:low?9:17,color:gold,opacity:strength*(early?0.95:0.69)});
    front.glow(x,y-8,22,magma,light*strength*0.63);
    if(age<0.23)front.glow(...point(0.66),15,gold,light*strength*0.43);
  }
}

function haze(back,time,clouds){
  let count=0;
  for(const p of clouds){
    const age=(time-p.at)/p.life;
    if(age<=0||age>=1)continue;
    const x=p.x+p.wind*age+Math.sin(age*6+p.phase)*6,y=p.y-p.lift*(0.61*age+0.39*smooth(0,1,age));
    const s=p.size*(0.64+1.26*age), alpha=Math.sin(Math.PI*age)**1.36*p.opacity;
    drawPixelSmoke(back,x,y,{rx:s,ry:s*0.69,colors:dustRamp,opacity:alpha*1.31,
      age,variant:p.phase*5,shear:p.wind*0.30});
    count++;
  }
  return count;
}

function rubble(random,low,light){
  return createParticleEmitter(random,{
    count:low?70:151,
    spawn(r,i){
      const kind=i%7, p=pulses[kind%pulses.length];
      const branch=kind===6, index=Math.floor(r()*crackPath.length);
      const [x,y]=branch?crackPath[index]:[p.x,p.y];
      const at=branch?launch+r()*0.54:p.at+r()*(kind<2?0.31:0.25);
      const landing=y+4+r()*13, hot=r()>0.46, power=kind<2?1:0.72;
      return {at,lifetime:0.41+r()*1.55,x:x+(r()-0.5)*30,y:y-(kind<2?4:9)-r()*12,
        vx:(r()-0.5)*165*power,vy:-29-r()*158*power,floor:landing,gravity:278,restitution:0.30,friction:0.65,
        trail:0.023,data:{hot,size:r()>0.44?1.8+r()*3.5:1,shape:r()}};
    },
    draw(surface,p){
      const f=1-smooth(0.53,1,p.progress), x=p.x,y=p.y,r=p.data.size;
      if(!p.rest)surface.line(p.previousX,p.previousY,x,y,p.data.hot?magma:maroon,f*0.65);
      if(r<=1){surface.dot(x,y,p.data.hot?gold:stone,f*0.95);return;}
      const skew=Math.sin(p.age*19+p.data.shape*15)*r*0.5;
      const corners=[[x-r,y],[x-r*0.47+skew,y-r*0.68],[x+r*0.67+skew,y-r*0.52],
        [x+r,y+r*0.38],[x-r*0.52,y+r*0.69]];
      surface.polygon(corners,dark,f);
      surface.polygon([corners[0],corners[1],corners[2],[x+r*0.31,y+r*0.31]],stone,f*0.93);
      surface.line(...corners[1],...corners[2],p.data.hot?gold:warmRock,f*0.94);
      if(!p.rest&&p.data.hot)surface.glow(x,y,4+r,magma,light*f*0.31);
    },
  });
}

export const dragonVein={
  title:'龙脉地裂',
  english:'Dragon Vein Rupture',
  duration,
  loop:false,
  previewTime:1.28,
  events:[
    {at:launch,name:'launch',data:{x:0,y:0,from:veinStart,to:veinEnd}},
    {at:impact,name:'impact',data:{x:0,y:0,shakeAmplitude:5,shakeDuration:0.46}},
    {at:targetHit,name:'targetHit',data:{x:veinTarget[0],y:veinTarget[1],shakeAmplitude:5.9,shakeDuration:0.41}},
    {at:aftershock,name:'aftershock',data:{x:27,y:7}},
    {at:recover,name:'recover'},
  ],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const branches=Array.from({length:low?20:37},(_,i)=>{
      const j=Math.floor(random()*crackPath.length), [x,y]=crackPath[j], early=i%5===0;
      const a=(i%2?1:-1)*(0.32+random()*2.31), len=8+random()*(early?15:31);
      const points=Array.from({length:5},(_,k)=>{
        const u=k/4, angle=a+(random()-0.5)*0.82*u;
        return [x+Math.cos(angle)*len*u,y+Math.sin(angle)*len*u*0.77];
      });
      return {points,early,delay:random()*0.27};
    });
    const clouds=Array.from({length:low?37:78},(_,i)=>{
      const pre=i%9===0, late=i%4===2;
      const vent=vents[i%vents.length], event=pulses[i%pulses.length];
      const x=pre?(random()-0.5)*118:late?vent.x:event.x;
      const y=pre?4:late?vent.y:event.y;
      const at=pre?0.13+random()*0.61:late?vent.at+random()*0.65:event.at+random()*0.47;
      return {at,x:x+(random()-0.5)*(pre?22:46),y:y+random()*7,
        life:pre?0.33+random()*0.59:0.76+random()*Math.min(1.70,duration-at-0.76),
        size:pre?1.6+random()*5.5:5+random()*16,wind:(random()-0.5)*(pre?28:78),
        lift:pre?3+random()*9:late?18+random()*61:9+random()*31,phase:random()*tau,opacity:pre?0.34:0.26+random()*0.28};
    });
    const sparks=Array.from({length:low?16:35},()=>({
      index:Math.floor(random()*crackPath.length),phase:random(),speed:0.53+random()*1.3,x:(random()-0.5)*14,h:2+random()*13,
    }));
    const throwRocks=rubble(random,low,glow);
    return (front,time,context)=>{
      const back=context?.back??front;
      fissure(back,time,branches,glow);
      context?.countParticles(haze(back,time,clouds));
      shock(front,time,glow);
      drawVents(back,front,time,glow,low);
      drawVeinDragon(front,time,glow,low);
      throwRocks(front,time,context);
      const latent=smooth(0.37,1.10,time)*(1-smooth(3.85,duration,time));
      if(latent>0.004){
        for(const p of sparks){
          const u=(p.phase+time*p.speed)%1,[x,y]=crackPath[p.index],alpha=Math.sin(Math.PI*u)*latent;
          front.dot(x+p.x*u,y-u*p.h,alpha>0.62?gold:magma,alpha*0.89);
        }
      }
    };
  },
};
