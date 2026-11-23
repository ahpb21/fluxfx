export function dimensions(width,height) {
  if (![width,height].every(n=>Number.isSafeInteger(n) && n>0)) throw new RangeError('surface dimensions');
}

export function addPixelLight(data,i,color) {
  if (!color) return;
  const r=color>>>16&255,g=color>>>8&255,b=color&255;
  const under=data[i+3]/255;
  const alpha=Math.max(under,Math.max(r,g,b)/255);
  data[i]=(data[i]*under+r)/alpha;
  data[i+1]=(data[i+1]*under+g)/alpha;
  data[i+2]=(data[i+2]*under+b)/alpha;
  data[i+3]=alpha*255;
}

/** RGB light in scene pixels. Clear and composite touch only the area that received light. */
export class LightBuffer {
  constructor(width,height) {
    dimensions(width,height);
    this.width=width;
    this.height=height;
    this.data=new Uint32Array(width*height);
    this.resetBounds();
  }

  resetBounds() {
    this.left=this.width;
    this.top=this.height;
    this.right=-1;
    this.bottom=-1;
  }

  include(left,top,right,bottom) {
    this.left=Math.min(this.left,left);
    this.top=Math.min(this.top,top);
    this.right=Math.max(this.right,right);
    this.bottom=Math.max(this.bottom,bottom);
  }

  clear() {
    for (let y=this.top;y<=this.bottom;y++) {
      this.data.fill(0,y*this.width+this.left,y*this.width+this.right+1);
    }
    this.resetBounds();
  }

  add(x,y,color) {
    if (!color || x<0 || x>=this.width || y<0 || y>=this.height) return;
    this.include(x,y,x,y);
    const i=y*this.width+x, old=this.data[i];
    const r=Math.min(255,(old>>>16&255)+(color>>>16&255));
    const g=Math.min(255,(old>>>8&255)+(color>>>8&255));
    const b=Math.min(255,(old&255)+(color&255));
    this.data[i]=r<<16 | g<<8 | b;
  }

  glow(cx,cy,radius,color,strength=1) {
    if (radius<1 || strength<=0.004) return;
    const left=Math.max(0,Math.floor(cx-radius)),right=Math.min(this.width-1,Math.ceil(cx+radius));
    const top=Math.max(0,Math.floor(cy-radius)),bottom=Math.min(this.height-1,Math.ceil(cy+radius));
    if (left>right || top>bottom) return;
    this.include(left,top,right,bottom);
    const red=color>>>16&255,green=color>>>8&255,blue=color&255;
    for (let y=top;y<=bottom;y++) {
      const dy=(y+0.5-cy)/radius;
      for (let x=left,i=y*this.width+left;x<=right;x++,i++) {
        const dx=(x+0.5-cx)/radius,distance=dx*dx+dy*dy;
        if (distance>=1) continue;
        const falloff=1-Math.sqrt(distance),amount=falloff*falloff*strength;
        if (amount<=0.004) continue;
        const old=this.data[i];
        const r=Math.min(255,(old>>>16&255)+red*amount)|0;
        const g=Math.min(255,(old>>>8&255)+green*amount)|0;
        const b=Math.min(255,(old&255)+blue*amount)|0;
        this.data[i]=r<<16 | g<<8 | b;
      }
    }
  }

  forEach(visit) {
    for (let y=this.top;y<=this.bottom;y++) {
      for (let x=this.left,i=y*this.width+this.left;x<=this.right;x++,i++) {
        const color=this.data[i];
        if (color) visit(x,y,color,i);
      }
    }
  }
}
