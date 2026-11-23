import { addPixelLight, dimensions, LightBuffer } from './lighting.js';

// Logical pixels in a single straight-alpha RGBA surface. No DOM is needed for rendering.
export class Surface {
  constructor(width, height, light = null) {
    dimensions(width,height);
    this.light=light;
    this.width=width;
    this.height=height;
    this.data=new Uint8ClampedArray(width*height*4);
    this.x=0;
    this.y=0;
  }
  clear() { this.data.fill(0); }
  span(y, left, right, color, opacity=1) {
    y=Math.round(y)+this.y;
    if (y<0 || y>=this.height || opacity<=0) return;
    const start=Math.max(0,Math.ceil(left)+this.x);
    const end=Math.min(this.width-1,Math.floor(right)+this.x);
    const r=color>>16&255,g=color>>8&255,b=color&255, a=Math.min(1,opacity);
    for(let x=start,i=(start+y*this.width)*4;x<=end;x++,i+=4) {
      if (a===1) {
        this.data[i]=r;this.data[i+1]=g;this.data[i+2]=b;this.data[i+3]=255;
      } else {
        const under=this.data[i+3]/255*(1-a), total=a+under;
        this.data[i]=(r*a+this.data[i]*under)/total;
        this.data[i+1]=(g*a+this.data[i+1]*under)/total;
        this.data[i+2]=(b*a+this.data[i+2]*under)/total;
        this.data[i+3]=255*total;
      }
    }
  }
  dot(x,y,color,a=1) { x=Math.round(x);this.span(y,x,x,color,a); }
  line(x0,y0,x1,y1,color,a=1) {
    const dx=x1-x0,dy=y1-y0,n=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
    let lastX,lastY;
    for(let i=0;i<=n;i++) {
      const x=Math.round(x0+i/n*dx),y=Math.round(y0+i/n*dy);
      if(x!==lastX || y!==lastY)this.dot(x,y,color,a);
      lastX=x;lastY=y;
    }
  }
  ellipse(x,y,rx,ry,color,a=1) {
    if(rx<=0 || ry<=0)return;
    const top=Math.max(Math.ceil(y-ry),-this.y),bottom=Math.min(Math.floor(y+ry),this.height-1-this.y);
    for(let row=top;row<=bottom;row++) {
      const half=rx*Math.sqrt(Math.max(0,1-((row-y)/ry)**2));
      this.span(row,x-half,x+half,color,a);
    }
  }
  polygon(points,color,a=1) {
    if(points.length<3)return;
    const ys=points.map(p=>p[1]);
    const top=Math.max(-this.y,Math.ceil(Math.min(...ys))),bottom=Math.min(this.height-this.y,Math.ceil(Math.max(...ys)));
    for(let y=top;y<bottom;y++) {
      const cuts=[];
      for(let i=0,j=points.length-1;i<points.length;j=i++) {
        const [ax,ay]=points[j],[bx,by]=points[i];
        if((ay>y)!==(by>y))cuts.push(ax+(y-ay)/(by-ay)*(bx-ax));
      }
      cuts.sort((a,b)=>a-b);
      for(let i=0;i+1<cuts.length;i+=2)this.span(y,cuts[i],cuts[i+1],color,a);
    }
  }
  // Small nested translucent ellipses on the same surface as opaque ink.
  halo(x,y,rx,ry,color,power) {
    if(power<=0)return;
    for(let i=8;i>0;i--)this.ellipse(x,y,rx*i/8,ry*i/8,color,power*(9-i)/70);
  }
  // Add RGB light to this pixel in premultiplied space, then store straight RGBA.
  addLight(x, y, color) {
    x = Math.round(x) + this.x;
    y = Math.round(y) + this.y;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || !color) return;
    if (this.light) this.light.add(x,y,color);
    else addPixelLight(this.data,(x+y*this.width)*4,color);
  }
  /** Radial light on a layered frame, or a local additive glow on a plain Surface. */
  glow(x,y,radius,color,strength=1) {
    if (!(radius>=1) || !(strength>0.004)) return;
    if (this.light) {
      this.light.glow(x+this.x,y+this.y,radius,color,strength);
      return;
    }
    this.glowBuffer ??= new LightBuffer(this.width,this.height);
    const buffer=this.glowBuffer;
    buffer.clear();
    buffer.glow(x+this.x,y+this.y,radius,color,strength);
    buffer.forEach((px,py,rgb,i)=>addPixelLight(this.data,i*4,rgb));
  }
}

