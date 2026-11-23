import { createParticleEmitter, drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

export const infernoTarget = 81;
export const infernoTiming = { launch: 0.55, impact: 0.85, targetHit: 1.00, aftershock: 1.28, recover: 1.50 };
const { launch, impact, targetHit, aftershock, recover } = infernoTiming;
const duration = 4.60, tau = Math.PI * 2;
const soot = 0x23111e, ash = 0x410f24, maroon = 0x71142c, red = 0xc6273d, vermilion = 0xf64a42;
const ember = 0xff793c, gold = 0xffbd63, white = 0xffe1a2;
const ashRamp = [0x20131f, 0x351c2a, 0x54273a];

export const infernoScorch = time => smooth(targetHit, 1.72, time);
export function infernoDummyOffset(time) {
  if (time < targetHit) return 0;
  const age = time - targetHit;
  const lean = 9*smooth(0,0.18,age)-5*smooth(0.22,0.84,age);
  const jitter = Math.sin(age*75)*3.2*(1-smooth(0.08,0.52,age));
  return Math.round(lean+jitter);
}

function floorPoint(angle, radius, y = 0) {
  return [Math.cos(angle)*radius, y+Math.sin(angle)*radius*0.29];
}

function sigil(back, time, cracks, light) {
  const fade = 1 - smooth(2.21,duration,time), build = smooth(0.018, launch, time);
  if (build <= 0 || fade <= 0.003) return;
  const heat = build*fade, blaze = time >= impact ? 1 - smooth(impact,1.24,time) : 0;
  back.ellipse(0,3,92*build,23*build,soot,heat*0.73);
  back.halo(0,1,100,26,maroon,heat*(0.47+0.47*blaze));
  back.glow(0,-1,58,red,light*heat*(0.23+blaze*0.40));
  for (const [i,radius] of [24,44,69,87,91].entries()) {
    for(let j=0;j<104;j++) {
      const a=j/104*tau, b=(j+1)/104*tau;
      const reveal=smooth(0.018+i*0.057+j%13*0.009,0.21+i*0.060+j%13*0.009,time);
      if (reveal<=0 || ((i===1 || i===3) && j%13>8)) continue;
      back.line(...floorPoint(a,radius),...floorPoint(b,radius),i===2 || i===4 ? red : maroon,reveal*fade*(0.58+blaze*0.26));
    }
  }
  for(let i=0;i<12;i++) {
    const a=i/12*tau, p=smooth(0.11+i*0.014,0.31+i*0.018,time)*fade;
    if (p<=0) continue;
    const near=floorPoint(a,38), tip=floorPoint(a,74), left=floorPoint(a-0.126,55), right=floorPoint(a+0.126,55);
    back.polygon([near,left,tip,right],maroon,p*0.31);
    trace(back,[near,left,tip,right,near],red,p*0.73);
    trace(back,[floorPoint(a-0.032,79),floorPoint(a,83),floorPoint(a+0.032,79)],vermilion,p*(0.54+blaze*0.32));
    const [x,y]=tip;
    back.dot(x,y,ember,p*0.68);
  }
  for(let i=0;i<6;i++){
    const a = i/6*tau + 0.17, p = smooth(0.12+i*0.027,0.33+i*0.027,time)*fade;
    back.line(...floorPoint(a,23),...floorPoint(a+tau/3,23),red,p*0.89);
    back.line(...floorPoint(a,12),...floorPoint(a,22),ember,p*0.54);
  }
  for(const c of cracks){
    const growth=smooth(c.start,c.start+0.29,time), pulse=0.68+0.32*Math.sin(c.phase+time*20);
    const end=(c.points.length-1)*growth;
    for(let i=0;i<end;i++){
      const [x,y]=c.points[i], [bx,by]=c.points[i+1], f=Math.min(1,end-i), tx=x+(bx-x)*f, ty=y+(by-y)*f;
      const opacity=fade*(0.66+i/(c.points.length*5));
      back.line(x,y+1,tx,ty+1,soot,opacity);
      back.line(x,y,tx,ty,i<3 ? red : maroon,opacity);
      if(i%3===1)back.dot(x,y,ember,fade*pulse*(0.39+blaze*0.31));
    }
  }
}

function groundWave(front, time, light) {
  const a=time-impact, b=time-aftershock;
  for(const [age,strength,reach,life] of [[a,1,96,0.56],[b,0.40,81,0.48]]) {
    if (age<0 || age>=life) continue;
    const u=age/life, radius=12+reach*(1-(1-u)**3.2), opacity=strength*(1-smooth(0.035,1,u));
    const rim=v=>{
      const angle=v*tau, r=radius+4*Math.sin(angle*11-age*14)*Math.sin(Math.PI*u)*opacity;
      return floorPoint(angle,r,2);
    };
    drawRibbon(front,{point:rim,width:2+9*(1-u)*strength,segments:52,color:ash,edge:red,opacity:opacity*0.84});
    drawRibbon(front,{point:rim,width:1+4.8*(1-u)*strength,segments:52,color:vermilion,opacity:opacity*0.84});
    for(let i=0;i<12;i++){
      const [x,y]=rim(i/12);
      if(i%3!==0) front.line(x,y,x+Math.cos(i)*4,y-3-(1-u)*5,ember,opacity*0.73);
      if(i%3===0) front.glow(x,y,12,red,light*opacity*0.49);
    }
  }
}

function column(front, time, power, height, light, low) {
  if (power <= 0.004) return;
  const t=time-impact, flash=1-smooth(0,0.25,t), shrink=1-smooth(recover,3.16,time)**0.68*0.74;
  const center=u=>Math.sin(u*8.9-t*9)*5.6*Math.sin(Math.PI*u)+Math.sin(t*13)*5*u;
  const at=(u,dx=0)=>[center(u)+dx,-height*u];
  const width=u=>(1-u*0.46)*(39+12*Math.sin(Math.PI*u))*shrink;
  drawRibbon(front,{point:u=>at(u),width:u=>width(u)+13,segments:34,color:soot,edge:ash,opacity:power*0.88});
  drawRibbon(front,{point:u=>at(u,2*Math.sin(t*15+u*13)),width,segments:34,color:maroon,edge:red,opacity:power});
  const streams=low ? 4 : 7;
  for(let i=0;i<streams;i++){
    const v=i/(streams-1)-0.5, phase=i*3.41-t*(13+i*0.75);
    const point=u=>at(u,v*width(u)*0.84+Math.sin(phase+u*(10+i%3*3))*7.1*(0.28+u*0.69));
    const heat=0.68+0.32*Math.sin(t*24+i*2);
    drawRibbon(front,{point,width:u=>(5+6*Math.sin(Math.PI*u))*(0.52+0.48*heat)*shrink,segments:low?15:26,
      color:i%3===1 ? ember : red,edge:i%3===1 ? gold : vermilion,opacity:power*(0.64+heat*0.32)});
  }
  for(let i=0;i<5;i++){
    const f=(t*(1.5+i%2*0.63)+i*0.217)%1, [x,y]=at(f,Math.sin(f*26+i)*10*shrink);
    const hot=Math.sin(Math.PI*f)*power;
    front.ellipse(x,y,3.5+6.4*hot,2.3+5.2*hot,ember,hot*0.78);
    front.line(x-1,y+3,x+4,y-4,white,hot*0.88);
    front.glow(x,y,16+9*hot,ember,light*hot*(0.36+flash*0.24));
  }
  front.glow(0,-4,51,ember,light*power*(0.47+flash*0.72));
  front.glow(0,-height*0.53,47,red,light*power*0.41);
  glint(front,0,-2,15+flash*13,white,power*flash*0.85);
}

const petalDesign = [
  { x: 0, y: -48, w: 19, bend: -7, start: 0.042 },
  { x: -34, y: -50, w: 17, bend: 7, start: 0.060 }, { x: 36, y: -48, w: 17, bend: -8, start: 0.070 },
  { x: -63, y: -32, w: 18, bend: 13, start: 0.099 }, { x: 64, y: -35, w: 18, bend: -13, start: 0.092 },
  { x: -77, y: -14, w: 13, bend: 16, start: 0.126 }, { x: 79, y: -11, w: 13, bend: -16, start: 0.132 },
  { x: -44, y: -28, w: 14, bend: 2, start: 0.158 }, { x: 44, y: -27, w: 14, bend: -2, start: 0.152 },
  { x: 1, y: -29, w: 14, bend: 8, start: 0.182 },
];

function petal(front, cx, cy, x, y, breadth, bent, opacity, light, heat) {
  const len=Math.hypot(x,y)||1, nx=-y/len, ny=x/len;
  const point=(u,side,width)=>{
    const curve=Math.sin(Math.PI*u), wav=Math.sin(u*19)*u*(1-u);
    const offset=curve*bent+side*(curve**0.78+wav*0.24)*breadth*width;
    return [cx+x*u+nx*offset,cy+y*u+ny*offset];
  };
  const silhouette=scale=>{
    const near=Array.from({length:13},(_,i)=>point(i/12,-1,scale));
    const far=Array.from({length:11},(_,i)=>point(1-(i+1)/12,1,scale));
    return [...near,...far];
  };
  front.polygon(silhouette(1),ash,opacity);
  front.polygon(silhouette(0.76),maroon,opacity);
  front.polygon(silhouette(0.52),red,opacity*0.91);
  const traceSide=Array.from({length:10},(_,i)=>point(0.11+i*0.086,-1,0.66));
  trace(front,traceSide,vermilion,opacity*(0.59+0.40*heat));
  const flame=Array.from({length:9},(_,i)=>point(0.07+i*0.071,1,0.19));
  trace(front,flame,heat>0.50 ? gold : ember,opacity*(0.42+0.47*heat));
  const [px,py]=point(0.43,0,0);
  front.glow(px,py,18,vermilion,light*opacity*(0.32+0.36*heat));
}

function lotus(front, time, petals, height, light) {
  const t=time-impact, burst=time>=aftershock ? 1-smooth(aftershock,1.62,time):0;
  for(const p of petals){
    const growth=smooth(p.start,p.start+0.10,t);
    const cool=smooth(p.extinguish,p.extinguish+0.50,time);
    const opacity=growth*(1-cool);
    if(opacity<=0.006)continue;
    const curl=Math.sin(t*17+p.phase), scale=(0.41+growth*0.59)*(1-cool*0.38);
    const x=p.x*scale+curl*4.8, y=p.y*scale+Math.sin(t*23+p.phase)*4;
    const heightClamp=Math.max(-136, -height+y) + height;
    petal(front,curl*4,-height+2,x,heightClamp,p.w*scale,p.bend*scale,opacity,light,0.72-cool*0.57+burst*0.23);
  }
  const strength=smooth(0.04,0.20,t)*(1-smooth(1.59,2.83,time));
  if(strength<=0)return;
  front.ellipse(0,-height+2,12+burst*4,4,ember,strength*0.84);
  front.ellipse(0,-height+2,6.6,2,white,strength*0.78);
  front.glow(0,-height+1,33,gold,light*strength*(0.39+burst*0.29));
}

function whirl(front, time, wind, light, low) {
  const begin=wind.start, up=smooth(begin,begin+0.16,time), down=1-smooth(wind.end,wind.end+0.83,time);
  const alpha=up*down;
  if(alpha<=0.004)return;
  const height=wind.height*(0.58+up*0.42), shift=Math.sin(time*5+wind.phase)*7;
  for(let band=0;band<3;band++){
    const point=u=>{
      const a=u*tau*1.79+wind.phase+band*2.1-time*wind.speed;
      const r=(8+18*u)*(0.76+alpha*0.24);
      return [wind.x+shift*u+Math.cos(a)*r+u*wind.lean,-height*u+Math.sin(a)*r*0.28];
    };
    drawRibbon(front,{point,width:u=>4+8*Math.sin(Math.PI*u),segments:low?16:31,
      color:band===1 ? soot : ash,edge:maroon,opacity:alpha*0.94});
    drawRibbon(front,{point,width:u=>1+3*Math.sin(Math.PI*u),segments:low?14:26,
      color:band===1 ? maroon : red,edge:band===1 ? red : vermilion,opacity:alpha*(band===1?0.63:0.77)});
    const [x,y]=point(0.32+band*0.17);
    front.glow(x,y,13,red,light*alpha*0.39);
  }
}

function burn(front, time, light) {
  const intensity=smooth(targetHit-0.012,targetHit+0.08,time)*(1-smooth(2.06,3.52,time));
  if(intensity<=0.004)return;
  const x=infernoTarget+infernoDummyOffset(time);
  for(let i=0;i<9;i++){
    const phase=time*(15+i)+i*2.37, f=0.60+0.40*Math.sin(phase), px=x+(i-4)*3.35, y=-3-(i%5)*6;
    const h=(10+f*20)*(0.53+intensity*0.47), lean=Math.sin(phase*0.76)*8+i*0.39;
    front.polygon([[px-5,y],[px-3,y-h*0.43],[px+lean,y-h],[px+4+lean*0.54,y-h*0.42],[px+5,y]],ash,intensity*0.91);
    front.polygon([[px-2,y],[px-1,y-h*0.36],[px+lean,y-h*0.82],[px+3,y-h*0.31],[px+3,y]],red,intensity*0.89);
    front.line(px-1,y,px+lean*0.61,y-h*0.53,ember,intensity*f*0.80);
  }
  front.glow(x,-19,29,red,light*intensity*0.52);
}

function weather(back, time, rain, haze) {
  let count=0;
  for(const p of haze){
    const u=(time-p.start)/p.life;
    if(u<=0||u>=1)continue;
    const w=p.size*(0.70+1.10*u), x=p.x+p.drift*u+Math.sin(p.phase+u*5)*7, y=-p.lift*u-p.y;
    const opacity=Math.sin(Math.PI*u)*p.opacity;
    drawPixelSmoke(back,x,y,{rx:w,ry:w*0.58,colors:ashRamp,opacity:opacity*1.29,
      age:u,variant:p.phase*5,shear:p.drift*0.26});
    count++;
  }
  for(const p of rain){
    const u=(time-p.start)/p.life;
    if(u<=0||u>=1)continue;
    const f=Math.sin(Math.PI*u)**0.64;
    const x=p.x+p.drift*u, y=p.y*(1-u*u);
    back.line(x-p.drift*0.10,y-p.length,x,y,p.hot ? red : maroon,f*0.78);
    back.dot(x,y,p.hot?gold:vermilion,f*0.72);
    count++;
  }
  return count;
}

function stones(random, low, light) {
  return createParticleEmitter(random,{
    count:low?46:93,
    spawn(r,i){
      const fall=i%4===0, scorch=i%7===2, opening=i<8;
      const at=opening ? impact : scorch ? targetHit+r()*0.26 : impact+r()*0.81;
      return { at,lifetime:0.60+r()*1.77,x:fall?(r()-0.5)*209:scorch?infernoTarget+(r()-0.5)*17:(r()-0.5)*49,
        y:fall?-64-r()*63:scorch?-11-r()*20:opening?-4-r()*29:-4-r()*14,
        vx:(r()-0.5)*(fall?48:155),vy:fall?25+r()*70:-22-r()*(scorch?74:153),floor:0,gravity:280,
        restitution:0.27,friction:0.63,trail:0.024,data:{size:r()<0.36?2+r()*2.4:1,slant:r()-0.5} };
    },
    draw(surface,p){
      const f=1-smooth(0.36,1,p.progress),x=p.x,y=p.y,s=p.data.size;
      if(!p.rest)surface.line(p.previousX,p.previousY,x,y,vermilion,f*0.77);
      if(s>1){
        const spin=p.data.slant*s+Math.sin(p.age*18)*1.4;
        const outline=[[x-s,y-0.5],[x+spin,y-s],[x+s,y-1],[x+s*0.60,y+s],[x-s*0.74,y+s*0.59]];
        surface.polygon(outline,ash,f*0.95);
        surface.line(...outline[0],...outline[1],p.progress<0.43?gold:ember,f);
        surface.dot(x+spin,y-s+1,white,f*0.83);
        surface.glow(x,y,5+2*s,red,light*f*0.30);
      }else surface.dot(x,y,p.progress<0.32?gold:ember,f*0.86);
    },
  });
}

export const infernalLotus={
  title:'永狱・红莲业火',
  english:'Infernal Lotus',
  duration,
  loop:false,
  previewTime:1.12,
  events:[
    {at:launch,name:'launch',data:{x:0,y:0}},
    {at:impact,name:'impact',data:{x:0,y:0}},
    {at:targetHit,name:'targetHit',data:{x:infernoTarget,y:0}},
    {at:aftershock,name:'aftershock',data:{x:0,y:0}},
    {at:recover,name:'recover'},
  ],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const crackCount=low?12:19;
    const cracks=Array.from({length:crackCount},(_,i)=>{
      const c=i/crackCount*tau+random()*0.23, length=31+random()*78;
      const points=Array.from({length:8},(_,j)=>{
        const u=j/7, a=c+(random()-0.5)*0.40*u;
        return floorPoint(a,length*u, (random()-0.48)*8*u);
      });
      return {points,start:random()*0.25,phase:random()*tau};
    });
    const petals=petalDesign.map((p,i)=>({...p,phase:random()*tau,extinguish:1.55+(i%5)*0.133+random()*0.13}));
    const winds=[
      {x:-68,height:56,lean:-15,phase:0.8,speed:14,start:0.91,end:1.61},
      {x:61,height:67,lean:11,phase:2.7,speed:17,start:0.97,end:1.78},
    ];
    const haze=Array.from({length:low?18:33},(_,i)=>{
      const start=i%5===0 ? 0.32+random()*0.46 : 0.76+random()*1.64;
      return {start,life:1.07+random()*(duration-start-1.07),x:(random()-0.5)*213,
        y:random()*31,lift:34+random()*60,size:7+random()*22,drift:(random()-0.5)*40,phase:random()*tau,
        opacity:0.18+random()*0.28};
    });
    const rain=Array.from({length:low?44:91},(_,i)=>({
      start:0.87+random()*1.14+(i%5===3?0.38:0),life:0.30+random()*0.72,x:(random()-0.5)*254,
      y:-61-random()*75,drift:(random()-0.5)*43,length:4+random()*22,hot:random()>0.49,
    }));
    const magma=Array.from({length:low?15:30},()=>({
      angle:random()*tau,radius:8+random()*79,phase:random(),speed:0.56+random()*1.37,length:3+random()*8,
    }));
    const debris=stones(random,low,glow);
    return (front,time,context)=>{
      const back=context?.back??front;
      sigil(back,time,cracks,glow);
      const weatherCount=weather(back,time,rain,haze);
      const fade=smooth(0.05,0.44,time)*(1-smooth(1.49,duration,time));
      if(fade>0.004){
        for(const [i,p] of magma.entries()){
          const u=(p.phase+p.speed*time)%1, [x,y]=floorPoint(p.angle,p.radius), f=Math.sin(Math.PI*u)*fade;
          back.line(x,y-p.length*u,x+1,y-p.length*(u+0.18),red,f*0.78);
          back.dot(x,y-p.length*u,ember,f*0.63);
          if(i%4===1 && time<impact){
            const lift=p.length*(0.7+1.43*u)*f, shift=Math.sin(time*9+p.angle)*3;
            back.polygon([[x-2.8,y],[x-2,y-lift*0.38],[x+shift,y-lift],[x+2+shift*0.61,y-lift*0.46],[x+3,y]],
              ash,f*0.95);
            back.line(x,y-1,x+shift,y-lift*0.83,red,f*0.74);
          }
        }
      }
      groundWave(front,time,glow);
      if(time>=impact){
        const t=time-impact,power=1-smooth(recover,3.25,time)**0.79;
        const height=(76+14*smooth(0.035,0.18,t))*(1-smooth(recover,3.24,time)**0.75*0.79);
        column(front,time,power,height,glow,low);
        lotus(front,time,petals,height,glow);
      }
      for(const wind of winds)whirl(front,time,wind,glow,low);
      burn(front,time,glow);
      debris(front,time,context);
      context?.countParticles(weatherCount);
    };
  },
};
