import { drawRibbon } from './components.js';
import { clamp, glint, smooth, trace } from './effect-drawing.js';
import { astralLanding, astralPose, astralTarget, astralTiming, drawAstralFigure } from './astral-dive-flight.js';
import { drawPixelSmoke } from './pixel-smoke.js';

const {launch,impact,aftershock,targetHit,recover}=astralTiming;
const duration=4.80,tau=Math.PI*2;
const ink=0x202c55, purple=0x856bc3, blue=0x629fea, cyan=0x83deed;
const silver=0xc1eaff, white=0xf5fbff, gold=0xffd17e, amber=0xed8e57, pearl=0xffecc0;
const coolMist=[0x263a54, 0x487092, 0x85bdd2], violetMist=[0x302d56, 0x615d9a, 0x8996c8];

function orbit(a,r,flat,tilt,x,y){
  const h=Math.cos(a)*r,v=Math.sin(a)*r*flat,c=Math.cos(tilt),s=Math.sin(tilt);
  return [x+h*c-v*s,y+h*s+v*c];
}

function starDust(back,time,stars){
  const fade=smooth(0.025,0.44,time)*(1-smooth(2.93,duration,time));
  if(fade<=0.004)return;
  for(const p of stars){
    const k=fade*p.k*(0.46+0.54*Math.sin(time*p.speed+p.phase)**2);
    back.dot(p.x+Math.sin(time*0.73+p.phase)*3,p.y+Math.sin(time+p.phase)*3,p.color,k);
    if(p.size>1)back.dot(p.x-1,p.y,p.color,k*0.45);
  }
}

function wings(back,front,time,pose,light){
  const alpha=pose.wing*pose.opacity;
  if(alpha<=0.005)return;
  const second=smooth(1.65,2.10,time)*(1-smooth(2.40,2.56,time));
  const ringCount=second>0.07?5:3;
  for(let i=0;i<ringCount;i++){
    const weight=i<3?alpha:alpha*second, r=17+i*6.7,tilt=i%2 ? 0.44 : -0.39;
    const turn=time*(0.75+i*0.30)+i*1.6;
    for(let j=0;j<48;j++){
      if((j+i*4)%17>13)continue;
      const a=turn+j/48*tau,b=a+tau/48;
      const p=orbit(a,r,0.43,tilt,pose.x,pose.y-i*1.4),q=orbit(b,r,0.43,tilt,pose.x,pose.y-i*1.4);
      const flicker=(0.62+0.38*Math.sin(j*0.78+time*10)**2)*weight;
      back.line(...p,...q,i%3===1?gold:blue,flicker*0.80);
      if(i%2===0&&j%6===0)back.dot(...p,silver,flicker);
    }
  }
  back.halo(pose.x,pose.y-2,38,27,ink,alpha*0.82);
  for(const side of [-1,1]){
    const flip=pose.angle+0.17, tilt=side*0.57+0.21*Math.sin(flip);
    const cx=pose.x+side*20*alpha,cy=pose.y-8+Math.sin(time*17+side)*2;
    const r=24*(0.60+0.40*alpha);
    for(let wing=0;wing<2;wing++){
      const rim=u=>{
        const a=-0.43+u*Math.PI*1.68+side*0.28+wing*0.20;
        return orbit(a,r-wing*5,0.57+0.07*wing,tilt,cx,cy+wing*4);
      };
      drawRibbon(front,{point:rim,width:u=>0.48+Math.sin(Math.PI*u)**0.83*(wing===0?3.8:1.8),segments:24,
        color:wing===0?blue:cyan,edge:wing===0?gold:silver,opacity:alpha*(wing===0?0.88:0.60)});
      for(let j=0;j<7;j++){
        const u=(j/7+time*0.58+side*1.18)%1, [x,y]=rim((u+1)%1);
        front.dot(x,y,wing===0?silver:gold,alpha*(0.63+0.27*Math.sin(j*3.81+time*11)**2));
      }
    }
    front.glow(cx,cy,18,blue,light*alpha*(0.41+second*0.16));
  }
  glint(front,pose.x,pose.y-3,3.5,white,alpha*0.8);
}

function destination(back,time,light){
  const spans=[[0.08,0.46,0.92,impact,astralLanding],[1.77,2.12,2.45,targetHit,astralTarget]];
  for(const [start,peak,off,end,[x,y]] of spans){
    const f=smooth(start,peak,time)*(1-smooth(off,end,time));
    if(f<=0.004)continue;
    const wobble=0.78+0.22*Math.sin(time*20)**2;
    back.halo(x,y,29,8,blue,f*0.62);
    for(let ring=0;ring<2;ring++){
      const r=18+ring*10;
      for(let i=0;i<46;i++){
        if(ring===0&&(i+Math.floor(time*19))%12>8)continue;
        const a=i/46*tau,b=a+tau/46;
        back.line(...orbit(a,r,0.26,-0.07,x,y),...orbit(b,r,0.26,-0.07,x,y),ring?blue:gold,f*wobble*0.72);
      }
    }
    const diamond=[[x-11,y],[x,y-4],[x+11,y],[x,y+4],[x-11,y]];
    trace(back,diamond,pearl,f*0.73);
    back.dot(x,y,Math.sin(time*24)>0.1?white:gold,f*0.85);
    back.glow(x,y,15,gold,light*f*wobble*0.46);
  }
}

function meteor(back,front,time,light,low){
  const windows=[[launch,impact+0.08,impact+0.25,0.27],[2.40,2.95,3.14,0.24],[2.90,3.48,3.76,0.39]];
  for(const [begin,hold,end,span] of windows){
    const f=smooth(begin,begin+0.072,time)*(1-smooth(hold,end,time));
    const head=Math.min(time,hold),tail=Math.max(begin,head-span);
    if(f<=0.004||head<=tail+0.002)continue;
    const at=(u,offset=0)=>{
      const p=astralPose(tail+(head-tail)*u);
      return [p.x+offset,p.y-offset*0.56];
    };
    if(begin===recover&&time>=3.34){
      for(let i=0;i<11;i++){
        const u=i/11, v=u+0.040+(i%2)*0.012;
        const fade=f*(0.60+0.40*Math.sin(time*20+i*2.7)**2);
        front.line(...at(u,i%2?2:-4),...at(v,i%2?2:-4),i%3?cyan:gold,fade*0.82);
        if(i%3===0)front.glow(...at(v),8,blue,light*fade*0.25);
      }
      continue;
    }
    const width=u=>(1.2+14*Math.sin(Math.PI*u)**0.80+6*u)*f;
    const n=low?15:29;
    drawRibbon(back,{point:u=>at(u,4),width:u=>width(u)*1.18,segments:n,color:ink,edge:purple,opacity:f*0.68});
    drawRibbon(front,{point:u=>at(u,-3),width:u=>width(u)*0.72,segments:n,color:blue,edge:cyan,opacity:f*0.75});
    drawRibbon(front,{point:u=>at(u,2.6),width:u=>width(u)*0.52,segments:n,color:purple,edge:amber,opacity:f*0.81});
    drawRibbon(front,{point:u=>at(u,1),width:u=>width(u)*0.33,segments:n,color:gold,edge:pearl,opacity:f*0.87});
    for(const u of [0.44,0.72,0.94]){
      const [x,y]=at(u);
      front.glow(x,y,15,u>0.72?gold:blue,light*f*(u>0.72?0.56:0.37));
    }
    const ghosts=low?2:4;
    for(let i=ghosts;i>=1;i--){
      const sample=head-i*0.041;
      if(sample<begin)continue;
      const p=astralPose(sample);
      drawAstralFigure(front,p.x,p.y,p,f*(0.42-i*0.065),true);
    }
  }
}

function scars(back,time,cracks,light){
  const f=smooth(impact-0.02,impact+0.12,time)*(1-smooth(2.70,duration,time));
  if(f<=0.004)return;
  const [x,y]=astralLanding,hot=1-smooth(1.28,3.91,time),reach=smooth(impact-0.016,impact+0.23,time);
  back.halo(x,y,58,12,blue,f*0.55);
  for(const p of cracks){
    const max=reach*(p.length-1);
    for(let i=0;i<max;i++){
      const a=p[i],[b,c]=p[i+1],u=Math.min(1,max-i),bx=a[0]+(b-a[0])*u,by=a[1]+(c-a[1])*u;
      back.line(a[0],a[1]+1,bx,by+1,ink,f*0.94);
      back.line(...a,bx,by,i%3?blue:gold,f*(0.31+0.59*hot));
      if(i%3===0)back.dot(...a,pearl,f*hot*0.85);
    }
  }
  back.glow(x,y,29,blue,light*f*hot*0.58);
}

function blast(back,front,time,light){
  if(time<impact)return;
  const t=time-impact,[x,y]=astralLanding;
  if(t<0.24){
    const flash=1-smooth(0,0.24,t),f=1-smooth(0,0.084,t);
    back.halo(x,y-11,120,72,white,f*0.52);
    front.glow(x,y-8,88,pearl,light*f*0.79);
    front.glow(x,y-4,40,white,light*flash*1.04);
    const l=23+35*flash,w=2+5*flash;
    front.polygon([[x-l,y],[x-5,y-w],[x,y-l*0.74],[x+w,y-4],[x+l,y-1],
      [x+6,y+w],[x,y+l*0.47],[x-w,y+4]],gold,flash*0.85);
    front.line(x-l,y,x+l,y,white,flash*0.93);
    front.line(x,y-l*0.77,x,y+l*0.47,white,flash*0.93);
    glint(front,x,y,l*0.65,pearl,flash*0.87);
  }
  const beats=[[impact,astralLanding,109,0.61,1],[impact+0.045,astralLanding,92,0.61,0.68],
    [aftershock,astralLanding,123,0.49,0.48],[targetHit,astralTarget,79,0.52,0.58]];
  for(const [at,[cx,cy],reach,life,strength] of beats){
    if(time<at||time>=at+life)continue;
    const u=(time-at)/life,r=12+reach*(1-(1-u)**3.1),f=(1-smooth(0.11,1,u))*strength;
    const path=v=>orbit(v*tau,r+Math.sin(v*tau*10+u*17)*u*2.4,0.25,-0.025,cx,cy+2);
    drawRibbon(front,{point:path,width:2.3+f*2.4,segments:51,color:blue,edge:gold,opacity:f*0.89});
    drawRibbon(front,{point:path,width:0.6+f*1.12,segments:51,color:u<0.62?pearl:cyan,opacity:f*0.96});
    for(let i=0;i<7;i++)front.glow(...path(i/7),8+f*6,i%2?cyan:gold,light*f*0.47);
  }
}

function crescent(front,time,light){
  const u=(time-aftershock)/0.70;
  if(u<0||u>=1)return;
  const opacity=(0.62+0.38*smooth(0,0.14,u))*(1-smooth(0.41,1,u));
  const [x,y]=astralLanding, x0=x+12+132*(1-(1-u)**1.49),y0=y-24-15*Math.sin(Math.PI*u);
  const point=s=>{
    const a=-1.30+s*2.60;
    return [x0+Math.cos(a)*(16+9*u),y0+Math.sin(a)*(30+4*u)];
  };
  drawRibbon(front,{point,width:s=>Math.sin(Math.PI*s)**0.78*(10-3*u),segments:30,color:blue,edge:gold,opacity:opacity*0.90});
  drawRibbon(front,{point,width:s=>Math.sin(Math.PI*s)**0.80*(3.5-1.3*u),segments:29,color:pearl,opacity:opacity*0.95});
  const [tx,ty]=point(0.49);
  front.glow(tx,ty,20,cyan,light*opacity*0.61);
}

function astralDragon(front,time,light,low){
  const age=time-targetHit,life=0.49;
  if(age<0||age>=life)return;
  const u=age/life,alpha=1-smooth(0.32,1,u), headX=astralTarget[0]+5+125*u,headY=77-19*u;
  const curve=s=>[headX-77*(1-s),headY-9*(1-s)+Math.sin(s*11.5-age*19)*(1-s)*21];
  drawRibbon(front,{point:curve,width:s=>1+(8+7*s)*Math.sin(Math.PI*s)**0.63,segments:low?18:34,
    color:ink,edge:blue,opacity:alpha*0.86});
  drawRibbon(front,{point:curve,width:s=>0.8+9*Math.sin(Math.PI*s)**0.69,segments:low?18:34,
    color:cyan,edge:gold,opacity:alpha*0.90});
  drawRibbon(front,{point:s=>{const [x,y]=curve(s);return [x,y-1.8];},
    width:s=>0.54+3.1*Math.sin(Math.PI*s),segments:25,color:silver,opacity:alpha*0.83});
  for(let i=1;i<11;i++){
    const s=i/11,[x,y]=curve(s),f=0.54+0.46*Math.sin(age*27+i)**2;
    front.polygon([[x-5,y+1],[x-8,y-6-i*0.28],[x+3,y-2]],i%3===1?gold:blue,alpha*f*0.84);
    if(i%2)front.glow(x,y,10,cyan,light*alpha*f*0.58);
  }
  const [x,y]=curve(1),at=(u,v)=>[x+u,y+v];
  const poly=(points,color,f=1)=>front.polygon(points.map(([a,b])=>at(a,b)),color,alpha*f);
  poly([[-16,-5],[-12,-12],[-18,-22],[-8,-15],[-1,-9],[5,-7],[10,-2],[18,0],[14,5],
    [6,3],[7,9],[-4,9],[-12,6]],blue);
  poly([[-13,-4],[-8,-10],[-4,-15],[1,-8],[6,-6],[12,-1],[17,0],[12,2],[6,0],[0,3],[-8,4]],cyan);
  poly([[-9,-9],[-16,-19],[-10,-17],[-2,-9],[-1,-6]],gold);
  poly([[0,-5],[5,-4],[3,-2],[-1,-3]],white);
  poly([[3,4],[12,5],[16,4],[11,8],[1,7]],silver);
  trace(front,[at(4,-1),at(12,-8),at(23,-10)],pearl,alpha*0.87);
  trace(front,[at(6,3),at(15,9),at(21,8)],gold,alpha*0.84);
  front.glow(x,y,23,cyan,light*alpha*0.72);
  front.glow(x+5,y,13,gold,light*alpha*0.79);
  const f=1-smooth(0.038,0.28,age),[dx,dy]=astralTarget,cy=dy-23;
  if(f>0.004){
    front.line(dx-30,cy+16,dx+30,cy-17,blue,f*0.92);
    front.line(dx-28,cy-16,dx+30,cy+12,gold,f*0.97);
    front.line(dx-21,cy+12,dx+21,cy-11,white,f*0.89);
    front.line(dx-19,cy-11,dx+21,cy+8,pearl,f*0.90);
    glint(front,dx,cy,10+8*f,pearl,f*0.72);
    front.glow(dx,cy,29,gold,light*f*0.89);
  }
}

function drifting(back,front,time,particles,mist,light){
  let count=0;
  for(const [i,p] of mist.entries()){
    const u=(time-p.start)/p.life;
    if(u<=0||u>=1)continue;
    const x=p.x+p.dx*u,y=p.y+p.dy*u,size=p.size*(0.64+1.03*u),a=Math.sin(Math.PI*u)**1.2;
    drawPixelSmoke(back,x,y,{rx:size,ry:size*0.48,colors:p.color===cyan?coolMist:violetMist,
      opacity:a*0.23,age:u,variant:i,shear:p.dx*0.19});
    count++;
  }
  for(const p of particles){
    const u=(time-p.start)/p.life;
    if(u<=0||u>=1)continue;
    const curve=1-(1-u)**1.76,x=p.x+p.dx*curve,y=p.y+p.dy*curve+u*u*p.drop;
    const a=Math.sin(Math.PI*u)**0.73;
    const surface=p.rear?back:front;
    if(p.size>1.7){
      surface.line(x-p.dx*0.055,y-p.dy*0.055,x,y,p.color,a*0.84);
      surface.dot(x,y,white,a*0.91);
      surface.glow(x,y,4+p.size,p.color,light*a*0.34);
    }else surface.dot(x,y,p.color,a*0.83);
    count++;
  }
  return count;
}

export const astralDive={
  title:'星界俯冲・流光天袭',
  english:'Astral Dive',
  duration,
  loop:false,
  previewTime:1.20,
  events:[
    {at:launch,name:'launch',data:{from:[0,0],to:astralLanding}},
    {at:impact,name:'impact',data:{x:astralLanding[0],y:astralLanding[1]}},
    {at:aftershock,name:'aftershock',data:{x:astralLanding[0],y:astralLanding[1],direction:[1,0]}},
    {at:targetHit,name:'targetHit',data:{x:astralTarget[0],y:astralTarget[1]}},
    {at:recover,name:'recover'},
  ],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const palette=[blue,cyan,purple,white,gold,amber],sample=()=>palette[Math.floor(random()*palette.length)];
    const stars=Array.from({length:low?44:79},()=>({x:-42+random()*282,y:-35+random()*121,
      k:0.24+random()*0.49,phase:random()*tau,speed:1.3+random()*3,size:random()>0.95?2:1,color:sample()}));
    const [lx,ly]=astralLanding;
    const cracks=Array.from({length:low?9:15},(_,i)=>{
      const angle=i/(low?9:15)*tau+random()*0.22,max=17+random()*38;
      return Array.from({length:7},(_,j)=>{
        const f=j/6,a=angle+(random()-0.5)*0.56*f;
        return [lx+Math.cos(a)*max*f,ly+Math.sin(a)*max*f*0.36];
      });
    });
    const particles=Array.from({length:low?83:177},(_,i)=>{
      const kind=i%5, begin=kind===0?0.18+random()*0.27:kind===1?impact+random()*0.26:
        kind===2?1.69+random()*0.78:kind===3?targetHit+random()*0.27:2.95+random()*0.61;
      const pose=astralPose(begin),x=kind===1?lx:pose.x,y=kind===1?ly:pose.y;
      const a=random()*tau, speed=10+random()*(kind===1?92:kind===3?77:42);
      const life=0.27+random()*Math.min(1.65,duration-begin-0.27);
      return {start:begin,life,x:x+(random()-0.5)*38,y:y+(random()-0.5)*27,
        dx:Math.cos(a)*speed,dy:Math.sin(a)*speed*(kind===1?0.61:0.39)-(kind===1?14:0),
        drop:kind===3?4+random()*31:11+random()*33,size:random()>0.75?2+random()*3.1:1,color:sample(),rear:i%4===1};
    });
    const mist=Array.from({length:low?15:34},(_,i)=>{
      const start=i%5===0?impact+random()*0.52:2.86+random()*0.79,p=astralPose(Math.min(3.19,start));
      return {start,life:0.49+random()*Math.min(1.80,duration-start-0.49),x:i%5===0?lx+(random()-0.5)*77:p.x+(random()-0.5)*41,
        y:i%5===0?ly:p.y+(random()-0.5)*29,dx:(random()-0.63)*53,dy:(random()-0.5)*39,size:7+random()*22,color:i%2?purple:cyan};
    });
    return (front,time,context)=>{
      const back=context?.back??front;
      starDust(back,time,stars);
      destination(back,time,glow);
      scars(back,time,cracks,glow);
      const particlesShown=drifting(back,front,time,particles,mist,glow);
      wings(back,front,time,astralPose(time),glow);
      meteor(back,front,time,glow,low);
      blast(back,front,time,glow);
      crescent(front,time,glow);
      astralDragon(front,time,glow,low);
      context?.countParticles(particlesShown);
    };
  },
};
