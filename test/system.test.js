import assert from 'node:assert/strict';
import test from 'node:test';
import { Surface, PixelPlayer, effects, sequence, bouncingArc } from '../index.js';

test('single RGBA surface clips spans and composites source over transparent or opaque pixels',()=>{
  const s=new Surface(2,2);
  s.span(0,-4,0,0xff0000);
  s.span(0,0,10,0x0000ff,0.5);
  assert.deepEqual([...s.data],[128,0,128,255,0,0,255,128,0,0,0,0,0,0,0,0]);
});

test('additive light preserves transparent pixels and brightens opaque pixels',()=>{
  const surface=new Surface(2,1);
  surface.dot(1,0,0xa06820);
  surface.addLight(0,0,0x102040);
  surface.addLight(1,0,0x802040);
  surface.addLight(2,0,0xffffff);
  assert.deepEqual([...surface.data],[64,128,255,64,255,136,96,255]);
});

test('all catalog effects render and seek backward to identical bytes',()=>{
  for(const effect of Object.values(effects)){
    const p=new PixelPlayer(160,112), h=p.play(effect,{x:80,y:87,seed:23});
    const sample=effect.previewTime ?? 0.9;
    h.seek(sample);
    const expected=p.render().slice();
    assert.ok(expected.some((n,i)=>i%4===3 && n>0),effect.title);
    h.seek(effect.duration+0.1);p.render();h.seek(sample);
    assert.deepEqual(p.render(),expected);
    h.seek(effect.duration);
    if(!effect.loop)assert.ok(p.render().every(n=>n===0));
  }
});

test('loop phase, camera translation, seed and instance ordering are independent',()=>{
  const p=new PixelPlayer(160,112),h=p.play(effects.lantern,{x:80,y:87,seed:8});
  h.seek(0.5);const first=p.render().slice();
  h.seek(effects.lantern.duration+0.5);
  assert.deepEqual(p.render(),first);
  h.moveTo(90,88);
  assert.deepEqual(p.render({cameraX:10,cameraY:1}),first);
  h.stop();assert.equal(p.instances.size,0);
  p.play(effects.lantern,{x:80,y:87,seed:89}).seek(0.5);
  assert.notDeepEqual(p.render(),first);
});

test('absolute time and elapsed-time playback agree at different update rates',()=>{
  const at=rate=>{
    const p=new PixelPlayer(160,112);p.play(effects.kiln,{x:80,y:87,seed:8});
    for(let i=0;i<rate;i++)p.update(1/rate);
    return p.render();
  };
  assert.deepEqual(at(30),at(144));
});

test('rear and front slash passes compose to the full effect',()=>{
  for(const effect of [effects.crescentSlash,effects.crossSlash]){
    const render=(passes)=>{
      const player=new PixelPlayer(160,112);
      for(const [pass,depth] of passes){
        player.play(effect,{x:80,y:87,seed:23,pass,depth}).seek(effect.previewTime);
      }
      return player.render();
    };
    const full=render([['both',0]]);
    const rear=render([['rear',-1]]);
    const front=render([['front',1]]);
    assert.notDeepEqual(rear,front);
    assert.notDeepEqual(rear,full);
    assert.notDeepEqual(front,full);
    assert.deepEqual(render([['front',1],['rear',-1]]),full);
  }
});

test('nested cue offsets and depth order render relative to the camera',()=>{
  const pixel=color=>({duration:1,loop:false,build:()=>s=>s.dot(0,0,color)});
  const cut=sequence([{effect:pixel(0xff0000),at:0.5,x:2}]);
  const p=new PixelPlayer(4,1);
  p.play(cut,{x:1,depth:4});
  p.play(pixel(0x00ff00),{x:3,depth:-1});
  p.update(0.75);
  assert.deepEqual([...p.render({cameraX:1}).slice(8,12)],[255,0,0,255]);
  p.update(1);assert.equal(p.instances.size,0);
});

test('flight segments stop at the floor, are seekable, and lose energy after impact',()=>{
  const flight=bouncingArc({x:0,y:0,vx:4,vy:-10,gravity:10,restitution:0.5});
  assert.ok(flight(1).y<0);assert.equal(flight(2).y,0);assert.ok(flight(2.1).y<0);
  assert.deepEqual(flight(20),flight(21));assert.equal(flight(21).rest,true);
  assert.equal(flight(1).y,-5);
});
