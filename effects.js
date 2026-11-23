import { bouncingArc } from './motion.js';
import { dandelion } from './dandelion.js';
import { frostburst, thunderstrike, healingAura } from './spell-effects.js';
import { crescentSlash, crossSlash, cinderBurst } from './combat-effects.js';
import { referenceSlash } from './reference-slash.js';
import { comboStrike } from './showcase.js';
import { prismArray, gravityCollapse, solarEruption } from './lab-effects.js';
import { frostUltimate } from './frost-ultimate.js';
import { groundPound } from './ground-pound.js';
import { mirrorStep } from './mirror-step.js';
import { origamiFlock } from './origami-flock.js';
import { tideReversal } from './tide-reversal.js';
import { terrainEcho } from './terrain-echo.js';
import { thunderThrust } from './thunder-thrust.js';
import { fireburstShot } from './fireburst-shot.js';
import { verdantBind } from './verdant-bind.js';
import { timeSever } from './time-sever.js';
import { windswiftWings } from './windswift-wings.js';
import { infernalLotus } from './infernal-lotus.js';
import { dragonVein } from './dragon-vein.js';
import { startrailCollapse } from './startrail-collapse.js';
import { astralDive } from './astral-dive.js';
import { inkVeil } from './ink-veil.js';
import { frostLoom } from './frost-loom.js';
import { jadeBridge } from './jade-bridge.js';
import { crimsonCrescent } from './crimson-crescent.js';
import { lightningBlink } from './lightning-blink.js';
const tau=2*Math.PI;
const unit=x=>Math.max(0,Math.min(1,x));
function ease(t,a,b){const x=unit((t-a)/(b-a));return x*x*(3-2*x);}
const brass=[0x302038,0x654254,0x9c6053,0xcd885b,0xf9c780,0xffe7ab];
const glass=[0x122737,0x144657,0x177477,0x28a495,0x72d8ba,0xc9ffe2];
const clay=[0x271d2c,0x512e40,0x86444a,0xb25c4c,0xe28a5b,0xffbb68,0xffe9a3];
function star(s,x,y,n,c,a=1){
  if(n<0.65)return;
  s.line(x-n,y,x+n,y,c,a);s.line(x,y-n,x,y+n,c,a);
}

export const orrery={
  title:'星盘解封',english:'Orrery breach',duration:3.2,loop:false,
  build(rng){
    const spin=rng()*tau, flecks=Array.from({length:30},()=>({angle:rng()*tau,r:24+36*rng(),delay:rng()*0.2,drift:rng()*14}));
    return (s,t)=>{
      const enter=ease(t,0,0.22),open=ease(t,0.78,1.08),fade=1-ease(t,2.32,3.15),alpha=enter*fade;
      if(alpha<=0)return;
      const cy=-32-3*Math.sin(t*2.4),items=[];
      s.ellipse(0,6,24,3,0x161521,alpha*0.8);
      s.halo(0,cy,43,36,0x6ebbaa,alpha*0.5);
      // Graduated plates slide outward as the mechanism unlocks.
      for(let plate=0;plate<6;plate++){
        const bearing=spin+plate*tau/6+t*0.15;
        const radius=(32+7*open)*enter;
        const point=(a,r)=>[Math.cos(a)*r,cy+Math.sin(a)*r*0.79];
        for(let i=0;i<10;i++){
          const a=bearing+i*0.058, b=a+0.058;
          s.polygon([point(a,radius),point(b,radius),point(b,radius-2.5),point(a,radius-2.5)],brass[1],alpha);
          s.line(...point(a,radius),...point(b,radius),i<4?brass[4]:brass[2],alpha);
          if(i%3===0)s.line(...point(a,radius),...point(a,radius-3),brass[3],alpha);
        }
        s.dot(...point(bearing+0.04,radius-1),brass[5],alpha);
      }
      // Model each orbit as a circular brass strip in 3D. Sort its segments with the jewel faces.
      for(let ring=0;ring<3;ring++){
        const r=(30+ring*4+open*(ring+1)*2)*enter;
        const roll=ring*1.12+t*(ring===1?-0.34:0.28), tilt=0.25+0.22*Math.sin(t+ring*2.1);
        const project=(a,rad)=>{
          const u=rad*Math.cos(a),v=rad*Math.sin(a)*tilt;
          return [u*Math.cos(roll)-v*Math.sin(roll),cy+u*Math.sin(roll)+v*Math.cos(roll),rad*Math.sin(a)];
        };
        for(let i=0;i<64;i++){
          const a=(i/64)*tau+spin+t*0.22;
          if(open>0.5 && i%16<2)continue;
          const A=project(a,r),B=project(a+tau/64,r);
          const inner=project(a,r-(ring===2?2.4:1.6));
          const edge=project(a+tau/64,r-(ring===2?2.4:1.6));
          const c=i%16<3?brass[5]:A[2]>0?brass[3]:brass[2];
          items.push({z:(A[2]+B[2])/2,draw(){
            s.polygon([A,B,edge,inner],c,alpha);
            s.line(...A.slice(0,2),...B.slice(0,2),i%16<6?brass[4]:c,alpha);
            if(i%8===0){const tooth=project(a,r+3);s.line(A[0],A[1],tooth[0],tooth[1],brass[4],alpha);}
          }});
        }
      }
      // Two cut gemstones unlock along their shared seam.
      for(const side of [-1,1]){
        const split=side*(1+9*open), h=20*enter, w=9*enter;
        const A=[split,cy-h],B=[split+side*w,cy-2],C=[split,cy+h],D=[split+side*3,cy+2];
        items.push({z:0,draw(){
          s.polygon([A,B,D],side<0?0xaaf4dd:0x399ba5,alpha);
          s.polygon([D,B,C],side<0?0x428f96:0x215568,alpha);
          s.polygon([A,D,C],side<0?0x75cebe:0xe2ffe9,alpha);
          s.line(A[0],A[1],B[0],B[1],0xe5ffea,alpha);
        }});
      }
      items.sort((a,b)=>a.z-b.z);for(const part of items)part.draw();
      const flash=unit(1-Math.abs(t-0.94)/0.13);
      star(s,0,cy,flash*23,0xfff9dc);s.halo(0,cy,42,8,0x97ffde,flash);
      for(const f of flecks){
        const u=(t-0.94-f.delay)/1.45;if(u<=0||u>=1)continue;
        const d=10+f.r*(1-(1-u)**3),x=Math.cos(f.angle)*d,y=cy+Math.sin(f.angle)*d*0.61+f.drift*u*u;
        s.line(x,y,x-3*Math.cos(f.angle)*(1-u),y-3*Math.sin(f.angle)*(1-u),brass[5],1-u);
      }
    };
  }
};

export const lantern={
  title:'潮汐灯',english:'Tide lantern',duration:3.6,loop:true,
  build(rng){
    const bubbles=Array.from({length:10},()=>({phase:rng(),x:rng()*21-10}));
    return (s,t)=>{
      const a=t/3.6*tau,b=Math.round(1.7*Math.sin(a)),y=b-31;
      s.ellipse(0,9,16,2,0x121722,0.65);
      s.halo(0,y,40,42,0x46b1a0,0.44+0.08*Math.cos(a));
      // Continuous widths form the bevel of the glass. Paint each liquid row clipped to that wall.
      const profile=dy=>Math.max(0,Math.min(19,10+(dy+23)*0.82,10+(21-dy)*0.91));
      for(let dy=-23;dy<=21;dy++){
        const w=Math.floor(profile(dy));
        s.span(y+dy,-w,w,glass[0]);s.span(y+dy,-w+2,w-2,0x183f4c);
        for(let x=-w+2;x<=w-2;x++){
          const depth=dy-(-3+2.6*Math.sin(a+x*0.17));
          if(depth<0)continue;
          const shade=depth<1.25?glass[5]:Math.abs(x)>w-4?glass[2]:depth<5?glass[3]:depth<15?0x218787:glass[2];
          s.dot(x,y+dy,shade);
        }
        if(dy>-18 && dy<11)s.dot(-w+2,y+dy,dy<-8?glass[4]:glass[3]);
      }
      const x=8*Math.sin(a),fy=y+8+2*Math.sin(a*2),dir=Math.cos(a)>=0?1:-1;
      s.polygon([[x-dir*3,fy],[x-dir*9,fy-3],[x-dir*8,fy+3]],0xffbb65);
      s.ellipse(x,fy,5.3,3.2,0xffce7c);s.span(fy-1,x-2,x+1,0xffecc1);
      s.dot(x+dir*3,fy,glass[0]);
      for(const f of bubbles){
        const u=(t/3.6+f.phase)%1;
        s.dot(f.x+1.5*Math.sin(a+f.phase*5),y+16-u*18,glass[5],Math.sin(Math.PI*u));
      }
      s.line(-14,y-12,-10,y-17,glass[4]);s.line(-14,y-9,-12,y-11,glass[3]);
      for(let i=0;i<3;i++){
        const dx=3*Math.sin(a+i*1.8),row=y+13+i*2;
        s.line(-7+dx,row,-2+dx,row-1,glass[3],0.85);
      }
      // The arched bail, stamped lid and runners share a warm brass palette.
      for(let i=1;i<=18;i++){
        const ang=Math.PI+i*Math.PI/18,prev=ang-Math.PI/18;
        s.line(10*Math.cos(prev),y-25+14*Math.sin(prev),10*Math.cos(ang),y-25+14*Math.sin(ang),i<12?brass[4]:brass[2]);
      }
      s.polygon([[-17,y-21],[-12,y-26],[-4,y-29],[5,y-29],[15,y-24],[17,y-21]],brass[2]);
      s.line(-15,y-23,-5,y-28,brass[4]);s.span(y-22,-16,16,brass[4]);
      for(const k of [-7,-3,1,5])s.line(k,y-26,k+1,y-24,brass[0]);
      for(const side of [-1,1]){
        const path=[[11,-21],[19,-11],[19,10],[11,21]];
        for(let i=1;i<path.length;i++)s.line(side*path[i-1][0],y+path[i-1][1],side*path[i][0],y+path[i][1],side<0?brass[3]:brass[2]);
        s.dot(side*18,y+5,brass[5]);
      }
      s.polygon([[-14,y+20],[14,y+20],[10,y+25],[4,y+27],[-5,y+27],[-12,y+24]],brass[2]);
      s.span(y+20,-13,13,brass[4]);s.span(y+23,-9,-2,brass[3]);
      for(const dx of [-7,0,7])s.dot(dx,y+23,brass[4]);
      const tail=2*Math.sin(a);
      s.line(0,y+26,tail,y+30,brass[4]);
      s.polygon([[tail,y+29],[tail+3,y+33],[tail,y+38],[tail-3,y+33]],glass[3]);s.dot(tail-1,y+32,glass[5]);
      star(s,-14,y-14,1+1.3*(0.5+0.5*Math.sin(a)),glass[5]);
    };
  }
};

export const kiln={
  title:'陶火绽放',english:'Kiln bloom',duration:3.4,loop:false,
  build(rng){
    const chips=Array.from({length:27},(_,i)=>({
      flight:bouncingArc({x:rng()*10-5,y:-18,vx:rng()*120-60,vy:-45-rng()*93,gravity:200+rng()*45,floor:rng()*4}),
      angle:rng()*tau,spin:rng()*11-5,r:1.3+rng()*2.3,shade:2+i%4,lag:rng()*0.12
    }));
    const clouds=Array.from({length:14},()=>({x:rng()*18-9,drift:rng()*18-9,r:3+rng()*4,lag:rng()*0.6}));
    return (s,t)=>{
      const appear=ease(t,0,0.15),fade=appear*(1-ease(t,2.65,3.36));
      if(!fade)return;
      const open=ease(t,0.75,1.05),heat=ease(t,0.1,0.77)*(1-ease(t,1.5,2.7));
      s.ellipse(0,4,26,4,0x221e2c,fade*0.8);
      s.halo(0,-12,36,27,clay[4],fade*(0.12+0.5*heat));
      for(const c of clouds){
        const u=(t-0.81-c.lag)/1.72;
        if(u<=0||u>=1)continue;
        const x=c.x+c.drift*u+3*Math.sin(5*u+c.x),y=-19-45*u,r=c.r*(0.4+u);
        s.ellipse(x,y,r,r*0.8,0x775764,0.55*Math.sin(Math.PI*u));
        s.ellipse(x-r/4,y-r/3,r*0.8,r/2,0xa07673,0.3*Math.sin(Math.PI*u));
      }
      // The shutters open on short hinges while a volumetric plume rises through their center.
      for(let i=-3;i<=3;i++){
        const spread=i/3, base=i*3.7,tx=spread*(9+24*open),ty=-33+Math.abs(i)*2+open*(9+Math.abs(i)*4);
        const mx=(base+tx)/2,my=(ty-11)/2;
        s.polygon([[base,-10],[mx-4.2,my],[tx,ty],[mx+4.2,my]],clay[i>0?1:3],fade);
        s.polygon([[base,-10],[mx-4,my],[tx,ty]],clay[i%2?3:4],fade);
        s.line(mx-4,my,tx,ty,heat>0.4?clay[5]:clay[3],fade);
      }
      const jet=ease(t,0.76,0.88)*(1-ease(t,0.96,1.95));
      if(jet>0){
        // Folded flame sheets: the dark side breaks up the silhouette, the white part stays near the throat.
        for(let k=-2;k<=2;k++){
          const h=jet*(44-8*Math.abs(k))*(0.87+0.13*Math.sin(t*19+2*k));
          const mid=k*4+Math.sin(t*13+k)*3,tip=k*5+Math.sin(t*11+k*1.4)*7;
          s.polygon([[k*4-4,-15],[mid-4,-16-h*0.52],[tip-2,-16-h*0.8],[tip,-16-h],
                     [tip+2,-16-h*0.68],[mid+4,-16-h*0.42],[k*4+4,-15]],clay[Math.abs(k)>1?3:4]);
          s.polygon([[k*4-2,-15],[mid-1,-16-h*0.52],[tip,-16-h*0.79],[mid+2,-16-h*0.35],[k*4+3,-15]],clay[5]);
          if(k===0)s.polygon([[-3,-15],[mid,-16-h*0.47],[2,-16-h*0.26],[4,-15]],clay[6]);
        }
      }
      // Glazed terracotta body: thick lip, incised band, vents and two feet.
      s.polygon([[-18,-14],[18,-14],[16,-7],[11,1],[-11,1],[-16,-7]],clay[1],fade);
      s.polygon([[-16,-13],[-4,-13],[-7,-1],[-11,-1]],clay[3],fade);
      s.span(-14,-18,18,clay[4],fade);s.span(-13,-16,-6,clay[5],fade);
      s.span(-10,-15,15,clay[0],fade);s.span(-3,-12,12,clay[2],fade);
      for(const x of [-8,-3,3,8])s.line(x,-8,x-1,-5,heat>0.3?clay[5]:clay[0],fade);
      for(const x of [-10,9])s.span(1,x-2,x+2,clay[0],fade);
      const flash=unit(1-Math.abs(t-0.83)/0.09);
      if(flash)star(s,0,-21,17*flash,clay[6]);
      for(const f of chips){
        const age=t-0.79-f.lag;if(age<0)continue;
        const {x,y,rest}=f.flight(age),angle=rest?0:f.angle+age*f.spin;
        const dx=f.r*Math.cos(angle),dy=f.r*Math.sin(angle);
        s.polygon([[x-dx,y-dy],[x+dy*0.65,y-dx*0.65],[x+dx,y+dy],[x-dy*0.65,y+dx*0.65]],clay[f.shade],fade);
        s.dot(x+dy*0.65,y-dx*0.65,clay[Math.min(6,f.shade+1)],fade);
      }
    };
  }
};
export const effects={
  orrery,lantern,kiln,dandelion,frostburst,thunderstrike,healingAura,
  crescentSlash,crossSlash,cinderBurst,referenceSlash,comboStrike,prismArray,gravityCollapse,solarEruption,frostUltimate,groundPound,mirrorStep,
  origamiFlock,tideReversal,terrainEcho,thunderThrust,fireburstShot,verdantBind,timeSever,windswiftWings,infernalLotus,dragonVein,
  startrailCollapse,astralDive,inkVeil,frostLoom,jadeBridge,crimsonCrescent,lightningBlink
};
