import { clamp, glint, smooth, trace } from './effect-drawing.js';

const release=0.23,ready=1.27,recover=2.33,duration=3.42;
const deep=0x133431,jade=0x286458,moss=0x438879,light=0x79b8a0,gold=0xddb974,white=0xf3dfae;
const tiles=7;
export function jadeDeck(i){
  return [-88+i*29, -15*Math.sin(Math.PI*i/(tiles-1))];
}

function slab(surface,x,y,opacity,power){
  const a=[x-23,y+1],b=[x-14,y-7],c=[x+15,y-7],d=[x+23,y-1],e=[x+15,y+6],f=[x-16,y+6];
  surface.polygon([a,f,e,d,[x+22,y+6],[x+15,y+13],[x-16,y+13],[x-23,y+7]],deep,opacity);
  surface.polygon([f,e,[x+15,y+12],[x-16,y+12]],jade,opacity);
  surface.polygon([a,b,c,d,e,f],moss,opacity);
  surface.polygon([[x-18,y+1],[x-12,y-5],[x+11,y-5],[x+18,y],[x+10,y+3],[x-13,y+3]],light,opacity*0.73);
  trace(surface,[a,b,c,d],gold,opacity);
  trace(surface,[a,f,e,d],jade,opacity*0.87);
  trace(surface,[[x-12,y+8],[x-5,y+8],[x-3,y+10],[x+2,y+10],[x+5,y+8],[x+13,y+8]],gold,opacity*0.78);
  trace(surface,[[x-6,y],[x,y-4],[x+6,y],[x,y+3],[x-6,y]],white,opacity*(0.44+0.45*power));
  surface.dot(x,y-1,gold,opacity*0.88);
}

export const jadeBridge={
  title:'琉璃浮桥',english:'Jade Span',duration,loop:false,previewTime:1.32,
  events:[{at:release,name:'release'},{at:ready,name:'bridgeReady'},{at:recover,name:'recover'}],
  build(random,{quality='full',light:lightPower=1}={}){
    const low=quality==='low',glow=clamp(lightPower);
    const rubble=Array.from({length:low?35:72},(_,i)=>{
      const n=i%tiles,[x,y]=jadeDeck(n), at=recover+(tiles-1-n)*0.060+random()*0.23;
      return {at,life:0.24+random()*0.41,x:x+(random()-0.5)*36,y:y+(random()-0.4)*13,
        dx:(random()-0.53)*31,lift:4+random()*41,size:random()>0.84?3:random()>0.48?2:1,
        color:i%4===0?gold:i%3===1?jade:light};
    });
    return (front,time,ctx)=>{
      const back=ctx?.back??front;
      const f=smooth(0.05,0.43,time)*(1-smooth(2.56,3.30,time));
      if(f>0.006){
        for(let i=0;i<tiles-1;i++){
          const [x,y]=jadeDeck(i),[tx,ty]=jadeDeck(i+1);
          trace(back,[[x,y+8],[x+9,y+16],[tx-7,ty+15],[tx,ty+8]],jade,f*0.75);
          if(i%2===0)back.line(x+7,y+18,tx-5,ty+14,gold,f*0.4);
        }
      }
      for(let i=0;i<tiles;i++){
        const [x,y]=jadeDeck(i),spawn=release+i*0.119,end=spawn+0.28;
        const lift=smooth(spawn,end,time),loss=smooth(recover+(tiles-1-i)*0.060,2.96+(tiles-1-i)*0.06,time);
        const alpha=lift*(1-loss);
        if(alpha<0.005)continue;
        const arrive=1-smooth(end,end+0.21,time),pulse=Math.max(arrive*lift,Math.max(0,1-Math.abs(time-ready)/0.18)*0.74);
        const yy=y+((1-lift)*33+loss*30);
        slab(front,x,yy,alpha,pulse);
        if(pulse>0.04){
          glint(front,x,yy-4,3+pulse*3,white,alpha*pulse*0.90);
          front.glow(x,yy,12,gold,glow*alpha*pulse*0.39);
        }
      }
      let count=0;
      for(const p of rubble){
        const u=(time-p.at)/p.life;
        if(u<=0||u>=1)continue;
        const x=Math.round(p.x+p.dx*u),y=p.y+p.lift*u*u+9*u,alpha=(1-smooth(0.23,1,u))*0.91;
        front.span(y,x,x+p.size-1,p.color,alpha);
        if(p.size>1)front.span(y+1,x,x+p.size-1,deep,alpha);
        count++;
      }
      ctx?.countParticles(count);
    };
  },
};
