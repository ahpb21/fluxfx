import { LightBuffer } from './lighting.js';
import { Surface } from './surface.js';

const maxRasterPixels=16_777_216;
export const identity={a:1,b:0,c:0,d:1};

export function transformMatrix({rotation=0,scale=1,scaleX=scale,scaleY=scale,flipX=false,flipY=false}={}) {
  if (![rotation,scaleX,scaleY].every(Number.isFinite) || scaleX<=0 || scaleY<=0) throw new RangeError('effect transform');
  if (rotation===0 && scaleX===1 && scaleY===1 && !flipX && !flipY) return identity;
  const x=flipX?-scaleX:scaleX,y=flipY?-scaleY:scaleY;
  const cos=Math.cos(rotation),sin=Math.sin(rotation);
  return {a:cos*x,b:sin*x,c:-sin*y,d:cos*y};
}

export function combineTransform(a,b) {
  if (a===identity) return b;
  if (b===identity) return a;
  return {a:a.a*b.a+a.c*b.b,b:a.b*b.a+a.d*b.b,c:a.a*b.c+a.c*b.d,d:a.b*b.c+a.d*b.d};
}

export function renderContext(front,back=front,stats={particles:0},pool=[],level=0,parameters={}) {
  return {
    front,back,stats,pool,level,parameters,layered:front!==back,
    countParticles(count) {stats.particles+=count;}
  };
}

function rectangle(width,height,map) {
  const corners=[map(0,0),map(width,0),map(0,height),map(width,height)];
  const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
  return [Math.floor(Math.min(...xs)),Math.floor(Math.min(...ys)),Math.ceil(Math.max(...xs)),Math.ceil(Math.max(...ys))];
}

function getScratch(context,width,height) {
  const key=context.level;
  let buffer=context.pool[key];
  if (!buffer || buffer.front.width!==width || buffer.front.height!==height || (buffer.front!==buffer.back)!==context.layered) {
    const light=new LightBuffer(width,height),front=new Surface(width,height,light);
    buffer={front,back:context.layered?new Surface(width,height,light):front,light};
    context.pool[key]=buffer;
  }
  buffer.front.clear();
  if (context.layered) buffer.back.clear();
  buffer.light.clear();
  return buffer;
}

function plot(target,data,i,x,y) {
  const alpha=data[i+3];
  if (alpha) target.span(y,x,x,data[i]<<16|data[i+1]<<8|data[i+2],alpha/255);
}

export function renderPlaced(context,x,y,matrix,bounds,time,paint) {
  const {front,back}=context;
  if (matrix===identity) {
    // Preserve integer translation and direct pixel composition for existing effects.
    const fx=front.x,fy=front.y,bx=back.x,by=back.y;
    front.x+=Math.round(x);front.y+=Math.round(y);
    if (back!==front) {back.x+=Math.round(x);back.y+=Math.round(y);}
    try {paint(front,time,context);}
    finally {front.x=fx;front.y=fy;back.x=bx;back.y=by;}
    return;
  }

  const {a,b,c,d}=matrix,det=a*d-b*c;
  const originX=front.x+x,originY=front.y+y;
  const inverse=(px,py)=>[(d*(px-originX)-c*(py-originY))/det,(-b*(px-originX)+a*(py-originY))/det];
  let [left,top,right,bottom]=rectangle(front.width,front.height,inverse);
  if (bounds) {
    left=Math.max(left,Math.floor(bounds.x));top=Math.max(top,Math.floor(bounds.y));
    right=Math.min(right,Math.ceil(bounds.x+bounds.width));bottom=Math.min(bottom,Math.ceil(bounds.y+bounds.height));
  }
  const width=right-left,height=bottom-top;
  if (width<=0 || height<=0) return;
  if (!Number.isSafeInteger(width*height) || width*height>maxRasterPixels) throw new RangeError('transform raster exceeds the pixel budget; specify effect bounds');
  const scratch=getScratch(context,width,height);
  scratch.front.x=scratch.back.x=-left;scratch.front.y=scratch.back.y=-top;
  const child=renderContext(scratch.front,scratch.back,context.stats,context.pool,context.level+1,context.parameters);
  paint(scratch.front,time,child);

  // Nearest-neighbor sampling keeps transformed pixels sharp, including hard masks and dither.
  const [x0,y0,x1,y1]=rectangle(width,height,(px,py)=>[originX+a*(px+left)+c*(py+top),originY+b*(px+left)+d*(py+top)]);
  const minX=Math.max(0,x0),maxX=Math.min(front.width,x1),minY=Math.max(0,y0),maxY=Math.min(front.height,y1);
  for (let dy=minY;dy<maxY;dy++) {
    const row=dy+0.5-originY;
    for (let dx=minX;dx<maxX;dx++) {
      const column=dx+0.5-originX;
      const sx=Math.floor((d*column-c*row)/det)-left,sy=Math.floor((-b*column+a*row)/det)-top;
      if (sx<0 || sy<0 || sx>=width || sy>=height) continue;
      const pixel=sx+sy*width,i=pixel*4;
      if (context.layered) plot(back,scratch.back.data,i,dx-back.x,dy-back.y);
      plot(front,scratch.front.data,i,dx-front.x,dy-front.y);
      if (scratch.light.data[pixel]) front.addLight(dx-front.x,dy-front.y,scratch.light.data[pixel]);
    }
  }
}
