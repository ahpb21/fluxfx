import { addPixelLight, LightBuffer } from './lighting.js';
import { Surface } from './surface.js';

function assertPixels(data,length,label) {
  if (!(data instanceof Uint8ClampedArray) || data.length!==length) throw new RangeError(label);
}

function over(out,source) {
  for (let i=0;i<out.length;i+=4) {
    const a=source[i+3];
    if (!a) continue;
    if (a===255 || out[i+3]===0) {
      out[i]=source[i];out[i+1]=source[i+1];out[i+2]=source[i+2];out[i+3]=a;
      continue;
    }
    const under=out[i+3]*(1-a/255),alpha=a+under;
    out[i]=(source[i]*a+out[i]*under)/alpha;
    out[i+1]=(source[i+1]*a+out[i+1]*under)/alpha;
    out[i+2]=(source[i+2]*a+out[i+2]*under)/alpha;
    out[i+3]=alpha;
  }
}

/** Color behind and in front of the scene's actors, plus packed RGB light. */
export class LayeredFrame {
  constructor(width,height) {
    this.width=width;
    this.height=height;
    this.light=new LightBuffer(width,height);
    this.back=new Surface(width,height,this.light);
    this.front=new Surface(width,height,this.light);
    this.output=new Uint8ClampedArray(width*height*4);
    this.stats={instances:0,particles:0};
  }

  clear() {
    this.back.clear();
    this.front.clear();
    this.light.clear();
    this.stats.instances=0;
    this.stats.particles=0;
  }

  composite({background=null,actors=null,out=this.output,back=true,front=true,light=true}={}) {
    const length=this.output.length;
    assertPixels(out,length,'output RGBA size');
    if (actors!==null) assertPixels(actors,length,'actor RGBA size');
    if (out===this.back.data || out===this.front.data || out===actors) throw new RangeError('output aliases a layer');
    if (background===null) out.fill(0);
    else if (Number.isInteger(background) && background>=0 && background<=0xffffff) {
      const r=background>>>16&255,g=background>>>8&255,b=background&255;
      for (let i=0;i<length;i+=4) {out[i]=r;out[i+1]=g;out[i+2]=b;out[i+3]=255;}
    } else {
      assertPixels(background,length,'background RGBA size');
      out.set(background);
    }
    if (back) over(out,this.back.data);
    if (actors) over(out,actors);
    if (front) over(out,this.front.data);
    if (light) this.light.forEach((x,y,color,i)=>addPixelLight(out,i*4,color));
    return out;
  }
}
