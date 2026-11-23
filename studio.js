import { createSpriteSheet, effects, PixelPlayer, Surface } from './index.js';
import { drawPreviewActor, previewActorPose } from './showcase.js';
import { pixelsToPng, spriteSheetZip } from './studio-export.js';
import { drawFrostBackdrop, frostStage } from './frost-stage.js';
import { drawGroundPoundActors, drawGroundPoundBackdrop, groundPoundStage } from './ground-pound-stage.js';
import { drawMirrorStepActors, drawMirrorStepBackdrop, mirrorStepStage } from './mirror-step-stage.js';
import { origamiFlockStage, tideReversalStage, terrainEchoStage } from './creative-stages.js';
import { thunderThrustStage } from './thunder-thrust-stage.js';
import { fireburstShotStage } from './fireburst-shot-stage.js';
import { verdantBindStage } from './verdant-bind-stage.js';
import { timeSeverStage } from './time-sever-stage.js';
import { windswiftWingsStage } from './windswift-wings-stage.js';
import { infernalLotusStage } from './infernal-lotus-stage.js';
import { dragonVeinStage } from './dragon-vein-stage.js';
import { startrailCollapseStage } from './startrail-collapse-stage.js';
import { astralDiveStage } from './astral-dive-stage.js';
import { frostLoomStage, inkVeilStage, jadeBridgeStage } from './pixel-material-stages.js';
import { crimsonCrescentStage } from './crimson-crescent-stage.js';
import { lightningBlinkStage } from './lightning-blink-stage.js';

const get=id=>document.getElementById(id);
const view=get('view'),ctx=view.getContext('2d'),catalog=get('catalog');
const localStage={width:view.width,height:view.height,x:80,y:87,actorX:0,actorY:0};
const effectStages={
  frostUltimate:{...frostStage,drawBackdrop:drawFrostBackdrop},
  groundPound:{...groundPoundStage,drawBackdrop:drawGroundPoundBackdrop,drawActors:drawGroundPoundActors},
  mirrorStep:{...mirrorStepStage,drawBackdrop:drawMirrorStepBackdrop,drawActors:drawMirrorStepActors},
  origamiFlock:origamiFlockStage,tideReversal:tideReversalStage,terrainEcho:terrainEchoStage,
  thunderThrust:thunderThrustStage,fireburstShot:fireburstShotStage,verdantBind:verdantBindStage,timeSever:timeSeverStage,
  windswiftWings:windswiftWingsStage,infernalLotus:infernalLotusStage,dragonVein:dragonVeinStage,
  startrailCollapse:startrailCollapseStage,astralDive:astralDiveStage,
  inkVeil:inkVeilStage,frostLoom:frostLoomStage,jadeBridge:jadeBridgeStage,crimsonCrescent:crimsonCrescentStage,
  lightningBlink:lightningBlinkStage
};
let stage,player,actor,actorPixels,image,stageBackdrop;
const origin={};
const backgrounds={ink:0x181c29,paper:0xd3d1c8,check:null};
const markerLabel={windup:'蓄力',swing:'挥斩',release:'释放',launch:'跃起',impact:'命中',
  targetHit:'目标震飞',aftershock:'余震',open:'开镜',depart:'离镜',transit:'迁跃',arrive:'重组',recover:'收招',
  fold:'折纸',gather:'聚水',rise:'上涌',crown:'凝珠',probe:'扫描',mapped:'测绘完成'};
let selected='orrery',handle,time=0,playing=true,hold=0,hitStop=0,previous,actorPreference;

function layers() {
  return {back:get('back').checked,front:get('front').checked,light:get('light').checked};
}

function playback(state) {
  playing=state;
  get('play').textContent=state?'暂停':'播放';
}

function configureStage(next) {
  if (stage===next) return;
  stage=next;
  const {width,height,x,y}=next;
  view.width=width;view.height=height;
  player=new PixelPlayer(width,height);
  actor=new Surface(width,height);
  actorPixels=new Uint32Array(actor.data.buffer);
  image=new ImageData(width,height);
  Object.assign(origin,{x,y});
  get('resolution').textContent=width+' × '+height+' px';
  stageBackdrop=null;
  if (stage.drawBackdrop) {
    const backdrop=new Surface(width,height);
    stage.drawBackdrop(backdrop);
    stageBackdrop=backdrop.data;
  }
  layout();
}

function drawAnchor(x,y,color) {
  x=Math.round(x);y=Math.round(y);
  ctx.fillStyle='#111419';ctx.fillRect(x-5,y,11,1);ctx.fillRect(x,y-5,1,11);
  ctx.fillStyle=color;
  ctx.fillRect(x-4,y,3,1);ctx.fillRect(x+2,y,3,1);
  ctx.fillRect(x,y-4,1,3);ctx.fillRect(x,y+2,1,3);
}

function paintActor(mirror) {
  actor.clear();
  actor.x=mirror?view.width-2*origin.x:0;
  if (stage.drawActors) stage.drawActors(actor,origin.x,origin.y,time);
  else drawPreviewActor(actor,origin.x+stage.actorX,origin.y+stage.actorY,time,selected==='comboStrike');
  actor.x=0;
  if (!mirror) return;
  for (let y=0;y<view.height;y++) {
    const row=y*view.width;
    for (let x=0;x<Math.floor(view.width/2);x++) {
      const a=row+x,b=row+view.width-1-x,color=actorPixels[a];
      actorPixels[a]=actorPixels[b];actorPixels[b]=color;
    }
  }
}

function paint() {
  const start=performance.now();
  handle.seek(time);
  const frame=player.renderLayers(),withActor=get('actor').checked,mirror=get('mirror').checked;
  if (withActor) paintActor(mirror);
  const backdrop=get('bg').value;
  const background=backdrop==='ink'&&stageBackdrop?stageBackdrop:backgrounds[backdrop];
  frame.composite({...layers(),background,actors:withActor?actor.data:null,out:image.data});
  const elapsed=performance.now()-start;
  const impact=selected==='groundPound' && effects.groundPound.events.find(marker=>marker.name==='impact');
  const shakeTime=impact && time-impact.at;
  let [shiftX,shiftY]=playing?(stage.cameraOffset?.(time)??[0,0]):[0,0];
  if (playing && impact && shakeTime>=0 && shakeTime<impact.data.shakeDuration) {
    const amplitude=impact.data.shakeAmplitude*(1-shakeTime/impact.data.shakeDuration);
    const phase=performance.now()/20;
    shiftX=Math.round(Math.sin(phase*2.3)*amplitude);
    shiftY=Math.round(Math.sin(phase*3.1)*amplitude*0.6);
  }
  if (shiftX || shiftY) {
    ctx.clearRect(0,0,view.width,view.height);
    ctx.putImageData(image,shiftX,shiftY);
  } else ctx.putImageData(image,0,0);
  if (get('anchors').checked) {
    drawAnchor(origin.x,origin.y,'#ffd096');
    if (withActor && !stage.drawActors) {
      const pose=previewActorPose(origin.x+stage.actorX,origin.y+stage.actorY,time,selected==='comboStrike');
      const bladeX=mirror?2*origin.x-1-pose.bladeX:pose.bladeX;
      drawAnchor(bladeX,pose.bladeY,'#9ce3ff');
    }
  }
  get('scrub').value=time;
  get('clock').value=time.toFixed(2)+' / '+effects[selected].duration.toFixed(2);
  get('performance').textContent=elapsed.toFixed(2)+' ms 绘制与合成 · '+frame.stats.particles+' 粒子';
}

function settings() {
  const quality=get('quality').value;
  return {seed:Number(get('seed').value)>>>0,transform:{flipX:get('mirror').checked},
    quality,light:quality==='low'?0.48:1};
}

function seek(timeInSeconds) {
  time=timeInSeconds;hold=hitStop=0;
  playback(false);
  paint();
}

function updateMarkers(effect) {
  const list=get('markers');
  list.replaceChildren();
  for (const marker of effect.events??[]) {
    const button=document.createElement('button');
    button.type='button';
    button.textContent=(stage.markerLabels?.[marker.name]??markerLabel[marker.name]??marker.name)+' '+marker.at.toFixed(2)+' s';
    button.onclick=()=>seek(marker.at);
    list.append(button);
  }
  list.hidden=list.childElementCount===0;
}

function choose(id,initial=0) {
  if (selected!==id && effectStages[id]?.seed!==undefined) get('seed').value=effectStages[id].seed;
  handle?.stop();selected=id;
  const effect=effects[id];
  configureStage(effectStages[id]??localStage);
  handle=player.play(effect,{...origin,...settings()});
  get('title').textContent=effect.title;
  get('english').textContent=effect.english;
  get('scrub').max=effect.duration;
  get('actor').checked=actorPreference??stage.showActor??(id==='comboStrike'||Object.hasOwn(effectStages,id));
  for (const button of catalog.children) {
    const active=button.dataset.id===id;
    button.setAttribute('aria-pressed',active);
    if (active) {
      const box=button.getBoundingClientRect(),list=catalog.getBoundingClientRect();
      if (box.top<list.top) catalog.scrollTop+=box.top-list.top;
      else if (box.bottom>list.bottom) catalog.scrollTop+=box.bottom-list.bottom;
    }
  }
  updateMarkers(effect);
  time=initial;hold=hitStop=0;
  paint();
}

for (const [id,effect] of Object.entries(effects)) {
  const button=document.createElement('button'),thumb=document.createElement('canvas');
  const previewStage=effectStages[id];
  thumb.width=previewStage?.width??112;thumb.height=previewStage?.height??94;
  const preview=new PixelPlayer(thumb.width,thumb.height);
  const previewTime=effect.previewTime??(id==='kiln'?0.91:0.60);
  preview.play(effect,{x:previewStage?.x??56,y:previewStage?.y??78,seed:previewStage?.seed??23}).seek(previewTime);
  thumb.getContext('2d').putImageData(new ImageData(preview.render(),thumb.width,thumb.height),0,0);
  const label=document.createElement('span'),sub=document.createElement('small');
  label.textContent=effect.title;sub.textContent=effect.english;label.append(sub);
  button.append(thumb,label);button.dataset.id=id;
  button.onclick=()=>{choose(id);playback(true);};
  catalog.append(button);
}

function moveAnchor(x,y) {
  origin.x=Math.min(view.width-1,Math.max(0,Math.floor(x)));
  origin.y=Math.min(view.height-1,Math.max(0,Math.floor(y)));
  handle.moveTo(origin.x,origin.y);
  paint();
}

get('play').onclick=()=>{
  if (time>=effects[selected].duration) {time=0;hold=hitStop=0;}
  playback(!playing);paint();
};
get('replay').onclick=()=>{choose(selected);playback(true);};
get('scrub').oninput=()=>seek(Number(get('scrub').value));
for (const id of ['seed','quality','mirror']) get(id).onchange=()=>choose(selected,time);
for (const id of ['anchors','back','front','light']) get(id).onchange=paint;
get('actor').onchange=()=>{actorPreference=get('actor').checked;paint();};
get('bg').onchange=()=>{get('panel').className='panel '+get('bg').value;paint();};
get('reset-anchor').onclick=()=>moveAnchor(stage.x,stage.y);
view.onclick=event=>{
  const box=view.getBoundingClientRect();
  moveAnchor((event.clientX-box.left)*view.width/box.width,(event.clientY-box.top)*view.height/box.height);
};
const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
view.onkeydown=event=>{
  if (!Object.hasOwn(offsets,event.key)) return;
  const [x,y]=offsets[event.key];
  event.preventDefault();
  moveAnchor(origin.x+x,origin.y+y);
};

function download(blob,name) {
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function exporting(button,prepare) {
  const status=get('export-status');
  status.hidden=false;status.textContent='正在导出…';button.disabled=true;
  try {
    const [blob,name]=await prepare();
    download(blob,name);
    status.textContent='已生成 '+name;
  } catch (error) {
    status.textContent='导出失败 · '+error.message;
  } finally {button.disabled=false;}
}

const save=get('save'),sheet=get('sheet');
save.onclick=()=>exporting(save,async()=>{
  const name=selected+'-'+Math.round(time*1000)+'ms.png';
  const data=player.renderLayers().composite(layers());
  return [await pixelsToPng(data,view.width,view.height),name];
});
sheet.onclick=()=>exporting(sheet,async()=>{
  const name=selected,{seed,transform,...effectSettings}=settings(),{x:originX,y:originY}=origin;
  const {width,height}=view;
  const fps=stage.fps??30;
  await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
  const atlas=createSpriteSheet(effects[name],{name,seed,transform,settings:effectSettings,
    width,height,originX,originY,fps,layers:true});
  return [await spriteSheetZip(atlas,name),name+'.zip'];
});

function layout() {
  const bounds=get('panel').getBoundingClientRect();
  const fit=Math.min(bounds.width/view.width,bounds.height/view.height);
  const scale=fit>=1?Math.floor(fit):fit;
  view.style.width=view.width*scale+'px';view.style.height=view.height*scale+'px';
}

function tick(now) {
  const dt=previous===undefined?0:Math.min((now-previous)/1000,0.1)*Number(get('speed').value);
  previous=now;
  if (playing) {
    const effect=effects[selected],end=effect.duration;
    const paused=Math.min(dt,hitStop);
    hitStop-=paused;
    const next=time+dt-paused;
    const stop=selected==='groundPound' && effect.events.find(marker=>marker.data?.hitStop && marker.at>time && marker.at<=next);
    if (stop) {
      hitStop=Math.max(0,stop.data.hitStop-(next-stop.at));
      time=stop.at;
    } else time=next;
    if (time>=end) {
      if (!get('repeat').checked) {time=end;playback(false);}
      else if (effect.loop) time%=end;
      else {hold+=dt;time=end;if (hold>=0.23) {time=0;hold=0;}}
    }
    paint();
  }
  requestAnimationFrame(tick);
}

new ResizeObserver(layout).observe(get('panel'));
const requested=new URLSearchParams(location.search).get('effect');
const initial=Object.hasOwn(effects,requested)?requested:selected;
choose(initial,effects[initial].previewTime??0.6);
layout();requestAnimationFrame(tick);
