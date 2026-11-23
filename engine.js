import { Surface } from './surface.js';
import { LayeredFrame } from './frame.js';
import { combineTransform, renderContext, renderPlaced, transformMatrix } from './placement.js';
import { eventList, sampleTracks, trackEntries, visitEvents } from './timeline.js';

export { Surface } from './surface.js';

export function seeded(seed) {
  let state=(seed|0)||0x6a09e667;
  return ()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
}

/** Each definition builds immutable or precomputed geometry, then paints at absolute time. */
export class PixelPlayer {
  constructor(width,height) {
    this.surface=new Surface(width,height);
    this.instances=new Set();
    this.scratch=[];
  }
  play(definition, {x=0,y=0,depth=0,seed=1,transform,anchor=null,...settings}={}) {
    if(!Number.isFinite(definition.duration) || definition.duration<=0)throw new RangeError('duration');
    if(![x,y,depth,seed].every(Number.isFinite))throw new RangeError('placement or seed');
    if (anchor!==null && typeof anchor!=='function') throw new TypeError('effect anchor');
    const item={
      x,y,depth,time:0,definition,anchor,matrix:transformMatrix(transform),events:eventList(definition.events,definition.duration),
      pending:[],atStart:true,paint:definition.build((definition.createRandom ?? seeded)(seed),settings)
    };
    this.instances.add(item);
    return {
      get time(){return item.time;},
      moveTo(x,y){if(![x,y].every(Number.isFinite))throw new RangeError('placement');Object.assign(item,{x,y});},
      setTransform(transform){item.matrix=transformMatrix(transform);},
      setAnchor(anchor=null) {
        if (anchor!==null && typeof anchor!=='function') throw new TypeError('effect anchor');
        item.anchor=anchor;
      },
      drainEvents(){return item.pending.splice(0);},
      seek:(t)=>{
        if(!Number.isFinite(t)||t<0)throw new RangeError('time');
        item.time=t;
        item.atStart=false;
        item.pending.length=0;
        if(definition.loop || t<definition.duration)this.instances.add(item);else this.instances.delete(item);
      },
      stop:()=>this.instances.delete(item)
    };
  }
  update(seconds) {
    if(!Number.isFinite(seconds)||seconds<0)throw new RangeError('seconds');
    if (seconds===0) return;
    for(const item of this.instances){
      const {duration,loop}=item.definition,from=item.time;
      item.time=from+seconds;
      visitEvents(item.events,duration,loop,from,item.time,item.atStart,(event,time,cycle)=>{
        item.pending.push({...event,time,cycle});
      });
      item.atStart=false;
      if(!loop && item.time+1e-10>=duration)this.instances.delete(item);
    }
  }
  draw(context,{cameraX=0,cameraY=0}={}) {
    if(![cameraX,cameraY].every(Number.isFinite))throw new RangeError('camera');
    context.stats.instances=this.instances.size;
    for(const item of [...this.instances].sort((a,b)=>a.depth-b.depth)){
      const {loop,duration,bounds}=item.definition;
      const time=loop?item.time%duration:item.time;
      let {x,y,matrix}=item;
      if (item.anchor) {
        const pose=item.anchor(item.time);
        if (pose==null) continue;
        if (![pose.x,pose.y].every(Number.isFinite)) throw new RangeError('anchor position');
        const parent=transformMatrix(pose);
        x=pose.x+parent.a*item.x+parent.c*item.y;
        y=pose.y+parent.b*item.x+parent.d*item.y;
        matrix=combineTransform(parent,matrix);
      }
      renderPlaced(context,x-cameraX,y-cameraY,matrix,bounds,time,item.paint);
    }
  }
  render(camera) {
    const surface=this.surface;
    surface.clear();surface.x=surface.y=0;
    this.draw(renderContext(surface,surface,undefined,this.scratch),camera);
    return surface.data;
  }
  renderLayers(camera) {
    const {width,height}=this.surface;
    const frame=this.frame??=new LayeredFrame(width,height);
    frame.clear();
    this.draw(renderContext(frame.front,frame.back,frame.stats,this.scratch),camera);
    return frame;
  }
}

/** A reusable effect assembled from timed child clips in local coordinates. */
export function sequence(clips,{loop=false,tracks:tracksByName,events=[]}={}) {
  if(!Array.isArray(clips)||!clips.length)throw new RangeError('empty sequence');
  const tracks=trackEntries(tracksByName);
  const children=clips.map(({effect,at=0,span=effect.duration,x=0,y=0,transform,tracks,settings={}})=>{
    if(![at,span,effect.duration].every(Number.isFinite)||at<0||span<=0||effect.duration<=0)throw new RangeError('clip');
    if (![x,y].every(value=>typeof value==='function'||Number.isFinite(value))) throw new RangeError('clip placement');
    const matrix=typeof transform==='function'?undefined:transformMatrix(transform);
    return {effect,at,span:effect.loop?span:Math.min(span,effect.duration),x,y,settings,transform,matrix,tracks:trackEntries(tracks)};
  });
  const duration=Math.max(...children.map(c=>c.at+c.span));
  const markers=eventList(events,duration);
  for (const child of children) {
    const {effect,at,span}=child;
    const childEvents=eventList(effect.events,effect.duration);
    visitEvents(childEvents,effect.duration,effect.loop,0,span,true,(event,time)=>{
      if (event.at===0 && time>=span) return;
      markers.push({...event,at:at+Math.min(time,span)});
    });
  }
  const sample=(value,time,params)=>typeof value==='function'?value(time,params):value;
  return {
    duration,loop,events:markers.sort((a,b)=>a.at-b.at),
    build(random,options) {
      const clips=children.map(c=>({...c,paint:c.effect.build((c.effect.createRandom ?? seeded)(random()*4294967296),{...options,...c.settings})}));
      return (surface,time,context=renderContext(surface))=>{
        const values=sampleTracks(tracks,time,context.parameters);
        for(const c of clips) {
          const local=time-c.at;
          if(local<0 || local>=c.span)continue;
          const phase=c.effect.loop?local%c.effect.duration:local;
          const parameters=sampleTracks(c.tracks,local,values);
          const x=sample(c.x,local,parameters),y=sample(c.y,local,parameters);
          if (![x,y].every(Number.isFinite)) throw new RangeError('clip placement');
          const matrix=c.matrix??transformMatrix(c.transform(local,parameters));
          renderPlaced({...context,parameters},x,y,matrix,c.effect.bounds,phase,c.paint);
        }
      };
    }
  };
}
