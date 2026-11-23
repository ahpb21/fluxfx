import assert from 'node:assert/strict';
import test from 'node:test';
import { createParticleEmitter, createSimulation, createSpriteSheet, effects, keyframes, PixelPlayer, sequence, Surface } from '../index.js';

const pixel=(bytes,width,x,y)=>[...bytes.subarray((x+y*width)*4,(x+y*width+1)*4)];
const point={duration:1,bounds:{x:1,y:0,width:1,height:1},build:()=>s=>s.dot(1,0,0xffffff)};

test('a layered frame composites behind and in front of actors, then lights the scene',()=>{
  const paint={duration:1,build:()=> (front,time,{back})=>{
    back.dot(0,0,0x777777);back.dot(1,0,0xff0000);
    front.dot(2,0,0x0000ff);front.addLight(1,0,0x140000);
  }};
  const player=new PixelPlayer(3,1),actor=new Surface(3,1);
  actor.span(0,1,2,0x008000);
  const handle=player.play(paint),frame=player.renderLayers();
  assert.deepEqual([...frame.composite({actors:actor.data})],[119,119,119,255,20,128,0,255,0,0,255,255]);
  assert.deepEqual(pixel(frame.composite({background:0xffffff,actors:actor.data,back:false,light:false}),3,0,0),[255,255,255,255]);
  handle.stop();
  assert.equal(player.renderLayers(),frame);
  assert.ok(frame.composite().every(value=>value===0));
});

test('anchors follow deterministic time and transform local offsets and pixels',()=>{
  const player=new PixelPlayer(12,12);
  const handle=player.play(point,{x:2,anchor:time=>({x:6+time*2,y:4,rotation:Math.PI/2})});
  handle.seek(0.5);
  assert.deepEqual(pixel(player.render(),12,6,7),[255,255,255,255]);
  handle.setAnchor(()=>null);
  assert.ok(player.render().every(value=>value===0));
  handle.setAnchor();handle.moveTo(6,5);handle.setTransform({flipX:true,scale:2});
  for (const x of [2,3]) for (const y of [5,6]) assert.equal(pixel(player.render(),12,x,y)[3],255);
  assert.equal(pixel(player.render(),12,4,5)[3],0);
  assert.deepEqual(pixel(player.render({cameraX:1,cameraY:2}),12,1,3),[255,255,255,255]);
});

test('sequence tracks drive placement and nested markers fire once per forward crossing',()=>{
  const bright={...point,events:[{at:0,name:'appear'},{at:0.25,name:'spark'}]};
  const effect=sequence([{effect:bright,at:0.25,span:0.75,x:(t,p)=>p.lunge}],{
    loop:true,tracks:{lunge:keyframes([[0,0],[1,8]])},events:[{at:0,name:'start'},{at:1,name:'end'}]
  });
  const player=new PixelPlayer(16,3),handle=player.play(effect,{x:1,y:1});
  player.update(0.5);
  assert.deepEqual(handle.drainEvents().map(event=>event.name),['start','appear','spark']);
  assert.equal(pixel(player.render(),16,6,1)[3],255);
  player.update(0.5);
  assert.deepEqual(handle.drainEvents().map(event=>[event.name,event.time,event.cycle]),[['end',1,0],['start',1,1]]);
  handle.seek(0.49);player.render();
  assert.deepEqual(handle.drainEvents(),[]);
  player.update(0.01);
  assert.deepEqual(handle.drainEvents().map(event=>event.name),['spark']);
});

test('checkpoint seeking is independent of caller mutation and supports historical input changes',()=>{
  let boost=1;
  const sim=createSimulation({initial:{x:0},duration:2,step:0.25,checkpointEvery:2,
    advance(state,dt,time){state.x+=dt*(time<1?1:boost);}});
  const last=sim.at(2);
  assert.equal(last.x,2);
  last.x=999;
  assert.equal(sim.at(0.75).x,0.75);
  assert.equal(sim.at(2).x,2);
  boost=2;sim.invalidateAfter(1);
  assert.equal(sim.at(2).x,3.25);
  assert.equal(sim.at(0.75).x,0.75);
});

test('particle trajectories are seekable and layered exports retain image and timing metadata',()=>{
  const build=random=>createParticleEmitter(random,{count:1,spawn:()=>({lifetime:1,y:-2,vx:4,floor:0}),
    draw(surface,p){surface.dot(p.x,p.y,0xffffff);surface.addLight(p.x,p.y,0x404080);}});
  const effect={duration:0.27,events:[{at:0.1,name:'hit'}],build};
  const sheet=createSpriteSheet(effect,{width:8,height:8,originX:2,originY:5,fps:10,columns:2,layers:true,name:'hit'});
  assert.deepEqual([sheet.width,sheet.height,sheet.metadata.frames.length],[16,16,3]);
  assert.deepEqual(sheet.metadata.frames.map(f=>f.duration),[100,100,70]);
  assert.deepEqual(sheet.metadata.meta.fluxfx.events,[{at:0.1,name:'hit'}]);
  assert.equal(pixel(sheet.layers.front,sheet.width,2,3)[3],255);
  assert.deepEqual(pixel(sheet.layers.light,sheet.width,2,3),[64,64,128,255]);
  assert.ok(sheet.layers.back.every(value=>value===0));
  assert.ok(effects.comboStrike.events.some(event=>event.name==='impact'));
});
