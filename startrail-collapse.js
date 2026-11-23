import { drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';

export const startrailTiming={launch:0.90,impact:1.00,targetHit:1.10,aftershock:1.40,recover:1.60};
export const startrailTarget=[79,17];
const {launch,impact,targetHit,aftershock,recover}=startrailTiming;
const duration=4.80,tau=Math.PI*2;
const gateY=-73;
const ink=0x14162e, slate=0x302b58, indigo=0x5653a9, blue=0x588de1;
const cyan=0x7bdfec, violet=0xab82ee, silver=0xc2d7fa, white=0xeffbff, gold=0xffd988, pale=0xfff3c4;

export function startrailTargetPose(time){
  const age=time-targetHit;
  if(age<0)return {x:0,y:0,tilt:0,ghost:0};
  const fast=smooth(0,0.13,age),snap=Math.sin(age*56)*(1-smooth(0.07,0.39,age));
  const pull=15*fast-10*smooth(0.20,0.96,age),echo=Math.sin(Math.PI*clamp((time-aftershock)/0.26));
  return {x:-pull+snap*2.5-echo*2.3,y:-3.4*Math.sin(Math.PI*clamp(age/0.36)),
    tilt:-7*fast*(1-smooth(0.23,0.89,age)),ghost:smooth(0,0.046,age)*(1-smooth(0.13,0.54,age))};
}

function ellipsePoint(angle,radius,flat,tilt,x=0,y=0){
  const h=Math.cos(angle)*radius,v=Math.sin(angle)*radius*flat,c=Math.cos(tilt),s=Math.sin(tilt);
  return [x+h*c-v*s,y+h*s+v*c];
}

function bentField(back,time,stars){
  const strength=smooth(0.015,0.39,time)*(1-smooth(2.42,duration,time));
  if(strength<=0.003)return;
  const focusY=gateY*(1-smooth(0.88,1.16,time)),force=smooth(0.16,0.57,time)*(1-smooth(1.26,3.55,time));
  for(const p of stars){
    const d=Math.hypot(p.x,p.y-focusY),twist=force*0.39*(1-smooth(19,136,d));
    const x=p.x*Math.cos(twist)-(p.y-focusY)*Math.sin(twist),y=focusY+p.x*Math.sin(twist)+(p.y-focusY)*Math.cos(twist);
    const k=strength*(0.45+0.55*Math.sin(p.phase+time*p.speed)**2)*p.opacity;
    back.dot(x,y,p.color,k);
    if(p.pin){
      back.dot(x-1,y,p.color,k*0.45);
      back.dot(x,y+1,p.color,k*0.42);
    }
  }
  for(let i=0;i<4;i++){
    const spin=i*tau/4+time*0.43, points=[];
    for(let j=0;j<18;j++){
      const r=52+j*4.1,a=spin+j*0.036*(0.8+force);
      points.push([Math.cos(a)*r,focusY+Math.sin(a)*r*0.44]);
    }
    trace(back,points,indigo,strength*force*0.24);
  }
}

function gate(back,time,orbits,light,low){
  const open=smooth(0.025,0.64,time),close=smooth(recover,3.77,time)**0.72;
  const alpha=open*(1-close);
  if(alpha<=0.004)return;
  const size=(0.23+open*0.77)*(1-0.67*close),spill=1-smooth(launch,1.21,time);
  back.ellipse(0,gateY,61*size,21*size,ink,alpha*0.84);
  back.halo(0,gateY,76*size,32*size,indigo,alpha*0.81);
  const bands=[[79,0.28,-0.145,indigo],[71,0.31,-0.08,blue],[58,0.31,0.16,violet],[46,0.34,0.26,indigo]];
  const segments=low?46:72;
  for(const [i,[radius,flat,tilt,color]] of bands.entries()){
    const offset=time*(0.64+i*0.23)+i*0.74;
    for(let j=0;j<segments;j++){
      const part=j/segments,page=Math.ceil(part*13);
      if(part>open+0.04||((j+i*5)%13>9&&i%2===0)) continue;
      const a=offset+part*tau,b=a+tau/segments,opacity=alpha*(0.47+0.53*Math.sin(j*0.39+time*5+i)**2);
      const cur=ellipsePoint(a,radius*size,flat,tilt,0,gateY),next=ellipsePoint(b,radius*size,flat,tilt,0,gateY);
      const phase=part>0.56?0.64:1;
      back.line(...cur,...next,color,opacity*phase);
      if(i===1&&j%3!==1){
        back.line(cur[0],cur[1]+1,next[0],next[1]+1,cyan,opacity*(0.52+spill*0.27));
        if(page%3!==1)back.dot(...cur,silver,opacity*0.79);
      }
    }
  }
  for(const p of orbits){
    const fade=1-smooth(p.out,p.out+0.54,time);
    if(fade<=0.004)continue;
    const a=p.a+time*p.speed, [x,y]=ellipsePoint(a,p.r*size,p.flat,p.tilt,0,gateY+p.lift);
    back.span(y,Math.round(x),Math.round(x)+p.size-1,p.color,alpha*fade*0.87);
    if(p.size>1){
      back.dot(x,y-1,white,alpha*fade*0.78);
      back.glow(x,y,6,p.color,alpha*fade*light*0.36);
    }
  }
  for(const a of [0.44,1.58,3.50,4.77]){
    const [x,y]=ellipsePoint(a+time*0.38,68*size,0.31,-0.08,0,gateY);
    glint(back,x,y,2.5,white,alpha*0.67);
    back.glow(x,y,11,blue,light*alpha*(0.24+spill*0.17));
  }
}

function core(front,time,light){
  if(time<launch||time>=impact+0.29)return;
  const descent=clamp((time-launch)/(impact-launch)),landed=time>=impact;
  const y=gateY*(1-descent**1.75),sway=5.6*Math.sin(Math.PI*descent);
  const age=Math.max(0,time-impact),flash=1-smooth(0,0.26,age);
  const strength=landed?flash:1, r=landed?3+flash*13:7.6+descent*3.6;
  if(!landed){
    const tail=19+17*descent;
    front.polygon([[sway-6,y],[sway-1,y-tail],[sway+3,y-tail+6],[sway+7,y+1]],indigo,0.80);
    front.polygon([[sway-2,y+3],[sway+1,y-tail+3],[sway+4,y+2]],gold,0.89);
    front.line(sway,y-2,sway+1,y-tail*0.74,white,0.91);
  }
  const at=(x,v)=>[sway+x*r,y+v*r];
  front.polygon([at(-1.28,0),at(-0.43,-0.40),at(0,-1.34),at(0.53,-0.28),at(1.25,0.03),
    at(0.44,0.52),at(0.05,1.10),at(-0.48,0.43)],gold,strength*0.89);
  front.polygon([at(-0.52,0),at(0,-0.82),at(0.44,0),at(0.02,0.68)],pale,strength*0.96);
  front.span(y,Math.round(sway-r*0.48),Math.round(sway+r*0.42),white,strength);
  glint(front,sway,y,r*(landed?2.02:1.51),pale,strength*0.81);
  front.glow(sway,y,landed?53:27,gold,light*strength*(landed?1.14:0.88));
  front.glow(sway,y,landed?29:15,white,light*strength*0.74);
}

function collapse(back,time,light,low){
  const fade=1-smooth(recover,3.11,time),enable=smooth(launch-0.04,1.08,time);
  if(enable<=0.004||fade<=0.004)return;
  const pull=smooth(impact,1.58,time),shrink=smooth(1.63,3.09,time)**0.72,alpha=enable*fade;
  back.ellipse(0,-5,41*(0.70+0.30*pull)*(1-0.59*shrink),12*(1-0.54*shrink),ink,alpha*0.88);
  back.halo(0,-1,104*(1-shrink*0.65),42*(1-shrink*0.62),indigo,alpha*0.84);
  const rings=[[117,0.34,-0.26,blue],[104,0.31,0.27,indigo],[90,0.27,-0.08,silver],[68,0.32,0.33,violet]];
  const segments=low?50:80;
  for(const [i,[r,flat,tilt,color]] of rings.entries()){
    const radius=r*(1-0.27*pull)*(1-0.70*shrink),phase=time*(1.78+i*0.67)+i*1.9;
    const point=(a,offset=0)=>ellipsePoint(a,radius+offset,flat,tilt,0,-6+i*2);
    for(let n=0;n<segments;n++){
      const part=n/segments,a=phase+part*tau,b=a+tau/segments;
      const short=(n+i*3+Math.floor(time*9))%17>13;
      if(short&&i!==2)continue;
      const near=Math.sin(a)>0, strength=(0.50+0.50*Math.sin(n*0.46+i*time*2)**2)*alpha;
      back.line(...point(a),...point(b),color,strength*(near?0.89:0.68));
      if(i%2===0&&n%3!==1)back.line(...point(a,3),...point(b,3),near?silver:blue,strength*0.55);
      if(i===2&&n%9===0)back.glow(...point(a),11,blue,light*strength*0.58);
    }
  }
}

function shock(front,time,light){
  const waves=[[impact,16,124,0.54,1],[impact+0.037,12,101,0.59,0.64],
    [impact+0.12,9,82,0.46,0.40],[aftershock,16,104,0.58,0.47]];
  for(const [at,radius,reach,life,power] of waves){
    if(time<at||time>=at+life)continue;
    const u=(time-at)/life,r=radius+reach*(1-(1-u)**4.1),f=(1-smooth(0.18,1,u))*power;
    const path=v=>{
      const a=v*tau,d=r+Math.sin(a*13+u*16)*2.7*u;
      return ellipsePoint(a,d,0.235,-0.06,0,5);
    };
    drawRibbon(front,{point:path,width:1.6+4.0*(1-u)*power,segments:55,color:indigo,edge:blue,opacity:f*0.86});
    drawRibbon(front,{point:path,width:0.85+1.6*(1-u),segments:55,color:u<0.39?white:silver,opacity:f*0.86});
    for(let k=0;k<12;k++){
      const [x,y]=path(k/12);
      if(k%3===1)front.glow(x,y,10,cyan,light*f*0.44);
      else front.dot(x,y-1,white,f*0.75);
    }
  }
}

function diamond(front,x,y,size,color,alpha,rock){
  front.polygon([[x-size,y-size*0.15],[x-size*0.18,y-size],[x+size*0.82,y-size*0.53],
    [x+size,y+size*0.43],[x+size*0.02,y+size*0.82],[x-size*0.66,y+size*0.44]],rock?ink:indigo,alpha);
  front.polygon([[x-size,y-size*0.15],[x-size*0.18,y-size],[x+size*0.82,y-size*0.53],[x,y+size*0.27]],
    rock?slate:color,alpha*0.97);
  front.line(x-size*0.22,y-size,x+size*0.68,y-size*0.55,color,alpha*0.93);
  front.dot(x+size*0.21,y-size*0.52,white,alpha*0.84);
}

function shards(front,time,fragments,rays,light){
  let count=0;
  const collect=1-0.86*smooth(recover,3.82,time)**0.83;
  const dim=1-0.79*smooth(1.71,4.75,time)**0.67;
  for(const p of fragments){
    const u=(time-p.at)/p.life;
    if(u<=0||u>=1)continue;
    const alpha=Math.sin(Math.PI*u)**0.66*dim,r=(p.radius*(1-u**1.82)+1.7)*collect;
    const a=p.a+p.speed*(u+0.88*u*u),y0=p.y*(1-u)*collect;
    const [x,y]=ellipsePoint(a,r,p.flat,p.tilt,0,y0);
    const [tx,ty]=ellipsePoint(a-0.19,r*(1+u*0.08),p.flat,p.tilt,0,y0);
    front.line(tx,ty,x,y,p.color,alpha*(p.rock?0.52:0.78));
    if(p.size>1.8){
      diamond(front,x,y,p.size*(0.58+0.42*(1-u)),p.color,alpha,p.rock);
      front.glow(x,y,5+p.size,p.color,light*alpha*0.39);
    }else front.dot(x,y,p.color,alpha);
    count++;
  }
  for(const p of rays){
    const u=(time-p.at)/p.life;
    if(u<=0||u>=1)continue;
    const r=5+p.radius*(1-(1-u)**1.78),alpha=Math.sin(Math.PI*u)**0.66*(1-u*0.27);
    const [x,y]=ellipsePoint(p.a,r,p.flat,p.tilt,0,-6);
    const [ax,ay]=ellipsePoint(p.a,r-p.cut,p.flat,p.tilt,0,-6);
    front.line(ax,ay,x,y,p.color,alpha*0.79);
    front.dot(x,y,p.color===gold?pale:cyan,alpha*0.88);
    count++;
  }
  return count;
}

function bindTarget(front,time,light){
  if(time<targetHit||time>2.38)return;
  const age=time-targetHit,{x:dx,y:dy,ghost}=startrailTargetPose(time);
  const x=startrailTarget[0]+dx,y=startrailTarget[1]-19+dy;
  const flash=1-smooth(0.11,1.28,age);
  for(let i=0;i<4;i++){
    const r=16+i*2,turn=age*12+i*1.36;
    let a=ellipsePoint(turn,r,0.32,-0.23,x,y-i*5);
    for(let j=1;j<=9;j++){
      const b=ellipsePoint(turn+j*0.24,r,0.32,-0.23,x,y-i*5);
      front.line(...a,...b,i%2?cyan:violet,flash*(0.55+0.43*Math.sin(j/9*Math.PI)));
      a=b;
    }
  }
  for(let i=0;i<6;i++){
    const yy=y-14+i*5, dr=Math.sin(age*33+i*4)*5;
    front.span(yy,Math.floor(x-11+dr),Math.ceil(x-5+dr),silver,ghost*0.80);
    front.dot(x-20+dr,yy,cyan,ghost*0.71);
  }
  front.glow(x,y,22,cyan,light*flash*(0.25+ghost*0.38));
}

export const startrailCollapse={
  title:'时空崩裂・星轨坍缩',
  english:'Startrail Collapse',
  duration,
  loop:false,
  previewTime:1.18,
  events:[
    {at:launch,name:'launch',data:{from:[0,gateY],to:[0,0]}},
    {at:impact,name:'impact',data:{x:0,y:0}},
    {at:targetHit,name:'targetHit',data:{x:startrailTarget[0],y:startrailTarget[1],pullX:-15}},
    {at:aftershock,name:'aftershock',data:{x:0,y:0}},
    {at:recover,name:'recover'},
  ],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const colors=[blue,cyan,violet,silver,white,gold],sample=()=>colors[Math.floor(random()*colors.length)];
    const stars=Array.from({length:low?63:133},()=>({x:(random()-0.5)*296,y:-111+random()*164,
      phase:random()*tau,speed:1.1+random()*2.1,opacity:0.38+random()*0.49,pin:random()>0.92,color:random()>0.43?silver:indigo}));
    const orbits=Array.from({length:low?36:75},()=>({a:random()*tau,r:35+random()*46,flat:0.25+random()*0.17,
      tilt:(random()-0.5)*0.54,lift:(random()-0.5)*10,speed:0.72+random()*1.83,color:sample(),
      size:random()>0.74?2:1,out:1.80+random()*1.83}));
    const fragments=Array.from({length:low?62:131},(_,i)=>{
      const at=impact+random()*(i%7===0?1.08:0.40);
      return {at,life:0.62+random()*(duration-at-0.62),radius:27+random()*109,a:random()*tau,
        flat:0.25+random()*0.31,tilt:(random()-0.5)*0.72,y:-17-random()*25,speed:2.9+random()*7.5,
        color:sample(),size:random()>0.68?2+random()*4.7:1,rock:i%4===2};
    });
    const rays=Array.from({length:low?31:71},(_,i)=>({at:(i%5===0?aftershock:impact)+random()*0.17,
      life:0.15+random()*0.53,a:random()*tau,flat:0.40+random()*0.53,tilt:(random()-0.5)*0.43,radius:21+random()*99,
      cut:4+random()*15,color:sample()}));
    return (front,time,context)=>{
      const back=context?.back??front;
      bentField(back,time,stars);
      gate(back,time,orbits,glow,low);
      collapse(back,time,glow,low);
      shock(front,time,glow);
      bindTarget(front,time,glow);
      const count=shards(front,time,fragments,rays,glow);
      core(front,time,glow);
      context?.countParticles(count);
    };
  },
};
