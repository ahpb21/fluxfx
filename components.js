import { clamp, groundArc, smooth } from './effect-drawing.js';
import { bouncingArc } from './motion.js';

/** Seeded trajectories can be sampled directly, including after a floor bounce. */
export function createParticleEmitter(random,{count,spawn,draw}) {
  if (!Number.isSafeInteger(count) || count<0) throw new RangeError('particle count');
  const particles=Array.from({length:count},(_,index)=>{
    const {at=0,lifetime,x=0,y=0,vx=0,vy=0,floor,gravity=floor===undefined?0:220,restitution,friction,trail=0.025,data}=spawn(random,index);
    if (![at,lifetime,x,y,vx,vy,gravity,trail].every(Number.isFinite) || at<0 || lifetime<=0 || trail<0) {
      throw new RangeError('particle trajectory');
    }
    const position=floor===undefined ? t=>({x:x+vx*t,y:y+vy*t+gravity*t*t/2}) :
      bouncingArc({x,y,vx,vy,gravity,floor,restitution,friction});
    return {at,lifetime,trail,data,position};
  });
  const sample={};
  return (surface,time,context)=>{
    let visible=0;
    for (const p of particles) {
      const age=time-p.at;
      if (age<0 || age>=p.lifetime) continue;
      const {x,y,rest=false}=p.position(age);
      const previous=p.position(Math.max(0,age-p.trail));
      Object.assign(sample,{x,y,previousX:previous.x,previousY:previous.y,rest,age,progress:age/p.lifetime,data:p.data});
      draw(surface,sample);
      visible++;
    }
    context?.countParticles(visible);
    return visible;
  };
}

/** Sample a filled ribbon along a curve in local pixels. Width is the full width of the ribbon. */
export function drawRibbon(surface,{point,width,segments=24,color,opacity=1,edge}) {
  if (!Number.isSafeInteger(segments) || segments<1) throw new RangeError('ribbon segments');
  if (opacity<=0) return;
  const points=Array.from({length:segments+1},(_,i)=>point(i/segments));
  let previous;
  for (let i=0;i<=segments;i++) {
    const [x,y]=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(segments,i+1)];
    const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1;
    const half=Math.max(0,typeof width==='function'?width(i/segments):width)/2;
    const nx=-dy*half/length,ny=dx*half/length;
    const current=[[x+nx,y+ny],[x-nx,y-ny]];
    if (previous) {
      surface.polygon([previous[0],previous[1],current[1],current[0]],color,opacity);
      if (edge!==undefined) surface.line(...previous[0],...current[0],edge,opacity);
    }
    previous=current;
  }
}

/** A ground-level elliptical ring, divided at the plane through its anchor. */
export function createShockwave({duration=0.5,startRadius=2,radius=32,color=0x89d9ff,light=0}={}) {
  if (![duration,startRadius,radius].every(Number.isFinite) || duration<=0 || startRadius<0 || radius<=startRadius) {
    throw new RangeError('shockwave dimensions');
  }
  return {
    duration,loop:false,
    bounds:{x:-radius-2,y:-radius-2,width:2*radius+4,height:2*radius+4},
    build(_random,{light:lightScale=1}={}) {
      return (surface,time,context)=>{
        const p=clamp(time/duration),r=startRadius+(radius-startRadius)*(1-(1-p)**3);
        const opacity=(1-smooth(0.15,1,p))*smooth(0,0.09,p);
        groundArc(context?.back??surface,r,Math.PI,Math.PI,color,opacity*0.62);
        groundArc(surface,r,0.04,3.05,color,opacity);
        if (light>0) surface.glow(0,0,Math.max(1,r),color,light*clamp(lightScale)*opacity);
      };
    }
  };
}
