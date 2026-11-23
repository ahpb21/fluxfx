/** Precompute flight segments. A seek evaluates the same segment regardless of display frame rate. */
export function bouncingArc({x,y,vx,vy,gravity=220,floor=0,restitution=0.4,friction=0.65}) {
  if(![x,y,vx,vy,gravity,floor,restitution,friction].every(Number.isFinite) ||
     gravity<=0 || y>floor || restitution<0 || restitution>=1 || friction<0 || friction>1)throw new RangeError('flight');
  const segments=[];
  let start=0;
  for(let i=0;i<10;i++){
    const flight=(-vy+Math.sqrt(vy*vy+2*gravity*(floor-y)))/gravity;
    segments.push({start,end:start+flight,x,y,vx,vy});
    x+=vx*flight;y=floor;start+=flight;vy=-(vy+gravity*flight)*restitution;vx*=friction;
    // A rebound below a quarter of a logical pixel cannot produce a visible arc.
    if(vy*vy/(2*gravity)<0.25)break;
  }
  const restX=x,restAt=start;
  return t=>{
    if(!Number.isFinite(t))throw new RangeError('time');
    t=Math.max(0,t);
    if(t>=restAt)return {x:restX,y:floor,bounce:segments.length,rest:true};
    const n=segments.findIndex(s=>t<s.end),s=segments[n],dt=t-s.start;
    return {x:s.x+s.vx*dt,y:s.y+s.vy*dt+0.5*gravity*dt*dt,bounce:n,rest:false};
  };
}
