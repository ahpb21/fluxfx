import { PixelPlayer } from './engine.js';

function copyCell(destination,width,source,frameWidth,frameHeight,x,y) {
  for (let row=0;row<frameHeight;row++) {
    const from=row*frameWidth*4;
    destination.set(source.subarray(from,from+frameWidth*4),((y+row)*width+x)*4);
  }
}

/** Render a sprite sheet and Aseprite-style JSON with frame durations, anchor and event markers. */
export function createSpriteSheet(effect,{
  width=160,height=112,originX=Math.floor(width/2),originY=Math.round(height*0.78),
  fps=30,columns,seed=1,name='effect',layers=false,transform,settings
}={}) {
  if (![width,height].every(n=>Number.isSafeInteger(n)&&n>0) || ![originX,originY].every(Number.isFinite)) throw new RangeError('frame dimensions');
  if (!Number.isFinite(fps) || fps<=0 || fps>1000 || !Number.isFinite(effect.duration) || effect.duration<=0) throw new RangeError('sprite sheet timing');
  const count=Math.max(1,Math.ceil(effect.duration*fps-1e-9));
  columns??=Math.ceil(Math.sqrt(count));
  if (!Number.isSafeInteger(columns) || columns<1) throw new RangeError('sprite sheet columns');
  const across=Math.min(columns,count),rows=Math.ceil(count/across);
  const sheetWidth=width*across,sheetHeight=height*rows,total=sheetWidth*sheetHeight;
  if (!Number.isSafeInteger(total) || total>16_777_216) throw new RangeError('sprite sheet exceeds 16 million pixels');
  const data=new Uint8ClampedArray(total*4);
  const layerData=layers?Object.fromEntries(['back','front','light'].map(layer=>[layer,new Uint8ClampedArray(total*4)])):undefined;
  const lightPixels=layers?new Uint8ClampedArray(width*height*4):undefined;
  const player=new PixelPlayer(width,height);
  const handle=player.play(effect,{...settings,x:originX,y:originY,seed,transform});
  const frames=[];
  for (let i=0;i<count;i++) {
    const time=i/fps,x=i%across*width,y=Math.floor(i/across)*height;
    handle.seek(time);
    if (layerData) {
      const frame=player.renderLayers();
      copyCell(data,sheetWidth,frame.composite(),width,height,x,y);
      copyCell(layerData.back,sheetWidth,frame.back.data,width,height,x,y);
      copyCell(layerData.front,sheetWidth,frame.front.data,width,height,x,y);
      lightPixels.fill(0);
      frame.light.forEach((px,py,color,index)=>{
        const offset=index*4;
        lightPixels[offset]=color>>>16&255;
        lightPixels[offset+1]=color>>>8&255;
        lightPixels[offset+2]=color&255;
        lightPixels[offset+3]=255;
      });
      copyCell(layerData.light,sheetWidth,lightPixels,width,height,x,y);
    } else copyCell(data,sheetWidth,player.render(),width,height,x,y);
    const duration=Math.max(1,Math.round(Math.min(effect.duration,(i+1)/fps)*1000)-Math.round(time*1000));
    frames.push({filename:name+'-'+String(i).padStart(3,'0')+'.png',frame:{x,y,w:width,h:height},
      rotated:false,trimmed:false,spriteSourceSize:{x:0,y:0,w:width,h:height},sourceSize:{w:width,h:height},duration});
  }
  const meta={app:'FluxFX Original',image:name+'.png',format:'RGBA8888',size:{w:sheetWidth,h:sheetHeight},scale:'1',
    frameTags:[{name,from:0,to:count-1,direction:'forward'}],fluxfx:{fps,loop:!!effect.loop,origin:{x:originX,y:originY},seed,
      events:effect.events??[],...(layers?{layers:{back:name+'-back.png',front:name+'-front.png',light:name+'-light.png'}}:{})}};
  return {data,width:sheetWidth,height:sheetHeight,metadata:{frames,meta},layers:layerData};
}
