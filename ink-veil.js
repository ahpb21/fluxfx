import { clamp, glint, smooth } from './effect-drawing.js';
import { drawPixelSmoke } from './pixel-smoke.js';

const release=0.36,conceal=0.93,recover=2.08,duration=3.40;
const smoke=[0x1c1c2a,0x373645,0x6d6876], fringe=[0x242333,0x484351,0x817684];

export function inkVeilPose(time){
  return {step:-17*smooth(1.02,1.65,time),faint:1-0.84*smooth(0.62,conceal,time)*(1-smooth(2.18,2.96,time))};
}

export const inkVeil={
  title:'墨幕隐踪',english:'Ink Veil',duration,loop:false,previewTime:1.24,
  events:[{at:release,name:'release'},{at:conceal,name:'conceal'},{at:recover,name:'recover'}],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const puffs=Array.from({length:low?26:49},(_,i)=>{
      const lowBank=i%4===0,near=i%3!==0;
      return {at:release+random()*(lowBank?0.38:0.93),life:1.05+random()*1.24,phase:random()*7+i,
        x:(random()-0.59)*(lowBank?91:39),side:10+random()*(lowBank?51:31),
        y:lowBank?1-random()*7:-random()*26, lift:lowBank?7+random()*12:27+random()*80,
        radius:lowBank?13+random()*14:12+random()*21,width:lowBank?1.26:0.76+random()*0.38,
        near, ramp:i%4===1?fringe:smoke,opacity:(near?0.57:0.45)+random()*0.2 };
    });
    const grit=Array.from({length:low?24:53},(_,i)=>({
      at:release+random()*0.48,x:(random()-0.5)*27,vx:(random()-0.5)*95,vy:11+random()*57,
      life:0.33+random()*0.52,color:i%5===0?0xc28a55:0x756c78,size:random()>0.82?2:1,
    }));
    return (front,time,ctx)=>{
      const back=ctx?.back??front;
      const ember=smooth(0.02,0.26,time)*(1-smooth(release,0.78,time)),pulse=0.73+0.27*Math.sin(time*31);
      if(ember>0.004){
        back.span(1,-18,18,0x25233a,ember*0.86);
        front.polygon([[-9,0],[-8,-7],[-4,-10],[5,-9],[9,-5],[9,0],[5,3],[-6,3]],0x303044,ember);
        front.span(-6,-7,6,0x806b6d,ember*0.85);
        front.span(-5,-5,5,0xbe8d58,ember*pulse*0.76);
        front.dot(1,-6,0xffc981,ember*pulse);
        front.glow(0,-5,16,0xd99167,ember*glow*pulse*0.46);
        glint(front,1,-6,2.8,0xf4d3ad,ember*pulse*0.55);
      }
      let count=0;
      for(const p of puffs){
        const u=(time-p.at)/p.life;
        if(u<=0||u>=1)continue;
        const rise=1-(1-u)**1.38, x=p.x+p.side*rise+Math.sin(p.phase+u*4.1)*6*u;
        const y=p.y-p.lift*rise, size=p.radius*(0.42+u*1.04);
        const a=smooth(0,0.20,u)*(1-smooth(0.49,1,u))*p.opacity;
        drawPixelSmoke(p.near?front:back,x,y,{rx:size*p.width,ry:size*(p.lift>20?0.79:0.36),
          colors:p.ramp,opacity:a,age:u,variant:p.phase*5,shear:p.side*0.29});
        count++;
      }
      for(const p of grit){
        const t=time-p.at,u=t/p.life;
        if(u<=0||u>=1)continue;
        const x=Math.round(p.x+p.vx*t*(1-u*0.45)),y=Math.min(2,4-t*p.vy+75*t*t);
        front.span(y,x,x+p.size-1,p.color,1-smooth(0.32,1,u));
        count++;
      }
      ctx?.countParticles(count);
    };
  },
};
