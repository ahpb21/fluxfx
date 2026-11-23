import { crescentSlash } from './combat-effects.js';
import { createParticleEmitter, createShockwave, drawRibbon } from './components.js';
import { clamp, glint, smooth } from './effect-drawing.js';
import { sequence } from './engine.js';
import { createSimulation } from './simulation.js';
import { keyframes } from './timeline.js';

const swingAt=0.43,impactAt=0.64;
const stepForward=keyframes([[0,0],[0.29,-4],[swingAt,-3],[impactAt,7],[0.89,5],[1.24,0]]);
const swordTilt=keyframes([[0,-0.2],[swingAt,-0.11],[impactAt,0.08],[0.9,0.05]]);

const charge={
  duration:0.54,loop:false,
  build() {
    return (surface,time,context)=>{
      const intensity=smooth(0.04,0.3,time)*(1-smooth(0.35,0.53,time));
      const lunge=context.parameters.lunge??0;
      const arc=1.5+3.7*smooth(0,0.43,time);
      const point=u=>[
        lunge+6+Math.cos(-2.7+u*arc)*(16+u*8),
        -23+Math.sin(-2.7+u*arc)*(11+u*8)
      ];
      drawRibbon(context.back,{point,width:u=>1+Math.sin(Math.PI*u)*3,segments:24,color:0x3865a8,edge:0x85d9f6,opacity:intensity});
      const pose=previewActorPose(0,0,time,true);
      surface.glow(pose.bladeX,pose.bladeY,21,0x50bfff,0.65*intensity);
      glint(surface,pose.bladeX,pose.bladeY,1+4*intensity,0xd6faff,intensity);
    };
  }
};

const impact={
  duration:0.96,loop:false,
  build(random) {
    const sparks=createParticleEmitter(random,{
      count:24,
      spawn(r,i) {
        return {at:r()*0.1,lifetime:0.24+r()*0.5,y:-6-r()*8,
          vx:(r()-0.31)*96,vy:-26-r()*71,gravity:230,floor:0,restitution:0.29,trail:0.029,
          data:i%3===0?0xc3f6ff:0xffba63};
      },
      draw(surface,p) {
        const opacity=(1-p.progress)**1.3;
        surface.line(p.previousX,p.previousY,p.x,p.y,p.data,opacity);
        surface.dot(p.x,p.y,0xfff4db,opacity);
      }
    });

    const dust=createSimulation({
      initial:{chips:Array.from({length:7},()=>({x:0,y:-8-random()*10,vx:(random()-0.4)*64,vy:-8-random()*43,hit:null}))},
      duration:0.96,step:1/60,checkpointEvery:12,
      advance({chips},dt,time) {
        for (const chip of chips) {
          if (chip.hit!==null) continue;
          chip.vy+=260*dt;
          chip.x+=chip.vx*dt;
          chip.y+=chip.vy*dt;
          if (chip.y>=0) {chip.y=0;chip.hit=time;}
        }
      }
    });

    return (surface,time,context)=>{
      const flash=(1-clamp(time/0.15))**2;
      surface.glow(0,-9,38,0xffae5b,1.15*flash);
      glint(surface,0,-9,14*flash,0xffedc7,flash);
      const {chips}=dust.at(time);
      let visible=0;
      for (const chip of chips) {
        if (chip.hit===null) {
          surface.span(chip.y,chip.x-1,chip.x+1,0x674c54);
          surface.dot(chip.x,chip.y-1,0xe59f71);
          visible++;
          continue;
        }
        const age=(time-chip.hit)/0.42;
        if (age>=1) continue;
        const radius=1+age*8,x=chip.x+chip.vx*age*0.16;
        context.back.ellipse(x,-age*8,radius,radius*0.64,0x826d7d,Math.sin(Math.PI*age)*0.43);
        visible++;
      }
      context.countParticles(visible);
      sparks(surface,time,context);
    };
  }
};

export const comboStrike={
  ...sequence([
    {effect:charge},
    {effect:crescentSlash,at:swingAt,x:(t,p)=>p.lunge,transform:(t,p)=>({rotation:p.tilt})},
    {effect:createShockwave({radius:33,color:0xffca83,light:0.28}),at:impactAt,x:29,y:0},
    {effect:impact,at:impactAt,x:29,y:0}
  ],{
    tracks:{lunge:stepForward,tilt:swordTilt},
    events:[{at:0,name:'windup'},{at:swingAt,name:'swing'},{at:impactAt,name:'impact',data:{x:29,y:-9}},{at:1.03,name:'recover'}]
  }),
  title:'裂地连斩',english:'Faultline strike',previewTime:0.72
};

export function previewActorPose(x,y,time,animated) {
  const lunge=animated?Math.round(stepForward(time)):0;
  const extension=animated?smooth(swingAt,impactAt,time)*(1-smooth(0.84,1.14,time)):0;
  const dx=x+lunge,bodyY=y-17-Math.round(2*extension);
  const handX=dx+9+extension*7,handY=bodyY-6+extension*3;
  const bladeX=handX+5+extension*12,bladeY=handY-14+extension*9;
  return {extension,dx,bodyY,handX,handY,bladeX,bladeY};
}

/** A stage actor for checking anchor placement and what lands on either side of the body. */
export function drawPreviewActor(surface,x,y,time,animated) {
  const {extension,dx,bodyY,handX,handY,bladeX,bladeY}=previewActorPose(x,y,time,animated);
  const metal=0x6c7f9d,shade=0x303b58;
  surface.ellipse(dx,y+1,13,2,0x171923,0.64);
  surface.polygon([[dx-7,bodyY],[dx+5,bodyY],[dx+8,y-3],[dx-5,y-3]],shade);
  surface.span(y-1,dx-10-Math.round(3*extension),dx-4,0x20293a);
  surface.span(y-1,dx+2,dx+9+Math.round(extension*6),0x20293a);
  surface.polygon([[dx-8,bodyY-9],[dx+5,bodyY-10],[dx+9,bodyY-3],[dx+4,bodyY+1],[dx-7,bodyY]],metal);
  surface.span(bodyY-7,dx-7,dx+4,0x8da8c0);
  surface.polygon([[dx-7,bodyY-21],[dx+2,bodyY-22],[dx+7,bodyY-17],[dx+5,bodyY-10],[dx-7,bodyY-11]],shade);
  surface.span(bodyY-19,dx-6,dx+4,metal);
  surface.span(bodyY-16,dx-1,dx+6,0xd2eff7);
  surface.line(dx+4,bodyY-7,handX,handY,0xa3b4c5);
  surface.line(handX-2,handY+2,handX+2,handY-2,0xd99263);
  surface.line(handX,handY,bladeX,bladeY,0xbad4e2);
  surface.line(handX+1,handY+1,bladeX+1,bladeY+1,0x6a93b0);
}
