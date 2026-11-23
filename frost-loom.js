import { clamp, glint, smooth, trace } from './effect-drawing.js';

const lock=0.53,hit=1.06,recover=1.91,duration=2.80;
const ink=0x203653,cut=0x376f9d,ice=0x67a9c8,bright=0xa9e3e9,white=0xe7fbeb,warm=0xead2a3;
const crown=[[-44,-26],[-22,-45],[19,-46],[44,-29],[39,4],[19,25],[0,39],[-23,23],[-40,3]];
const anchors=[[0,-8],[-5,-12],[4,-9],[3,2],[0,-2],[3,5],[0,4],[-2,4],[-6,-3]];

function chip(front,x,y,scale,lean,alpha,color){
  const at=(a,b)=>[x+(a+b*lean)*scale,y+b*scale];
  front.polygon([at(-4,0),at(-1,-6),at(3,-3),at(4,2),at(1,5),at(-3,3)],ink,alpha);
  front.polygon([at(-4,0),at(-1,-6),at(3,-3),at(1,2)],color,alpha);
  front.line(...at(-1,-6),...at(3,-3),white,alpha*0.86);
}

export const frostLoom={
  title:'霜梭织甲',english:'Frost Loom',duration,loop:false,previewTime:1.16,
  events:[{at:lock,name:'guardReady'},{at:hit,name:'deflect'},{at:recover,name:'recover'}],
  build(random,{quality='full',light=1}={}){
    const low=quality==='low',glow=clamp(light);
    const shards=Array.from({length:low?22:53},(_,i)=>{
      const breakUp=i%4===1,at=breakUp?recover+random()*0.43:hit+random()*0.20;
      const a=random()*Math.PI*2, speed=17+random()*111;
      return {at,life:0.24+random()*0.58,x:breakUp?(random()-0.5)*74:33+random()*16,
        y:breakUp?-30+random()*57:-13+(random()-0.5)*21,vx:Math.cos(a)*speed*(breakUp?0.53:1),
        vy:Math.sin(a)*speed*0.73+9,phase:random()*6.28,size:0.43+random()*0.97,color:i%4===0?warm:bright};
    });
    return (front,time,ctx)=>{
      const back=ctx?.back??front;
      const life=smooth(0.02,0.37,time)*(1-smooth(2.16,duration,time));
      const pulse=time>=hit?1-smooth(hit,1.36,time):0;
      if(life>0.004){
        back.polygon(crown,ink,life*0.54);
        back.polygon([[-59,-8],[-48,-31],[-39,-18],[-51,15]],cut,life*0.55);
        back.polygon([[60,-10],[48,-33],[41,-21],[52,17]],cut,life*0.55);
        back.span(43,-27,27,cut,life*0.64);
      }
      for(let i=0;i<crown.length;i++){
        const delay=0.10+i*0.024,arrive=smooth(delay,lock,time),fade=1-smooth(recover+(i%4)*0.09,2.54+(i%4)*0.047,time);
        const alpha=arrive*fade;
        if(alpha<0.007)continue;
        const a=crown[i],b=crown[(i+1)%crown.length],h=anchors[i];
        const mx=(a[0]+b[0])*0.5,my=(a[1]+b[1])*0.5;
        const offset=1-arrive, breakUp=1-fade, shove=pulse*(mx>6?-3:0.5);
        const at=([x,y])=>[x+mx*offset*0.72+mx*breakUp*0.30+shove,y+my*offset*0.65-my*breakUp*0.15];
        const A=at(a),B=at(b),H=at(h),M=at([mx*0.79,my*0.78]);
        front.polygon([A,B,H],cut,alpha*0.72);
        front.polygon([A,M,H],i%3?ice:bright,alpha*0.76);
        front.polygon([M,B,H],ink,alpha*0.48);
        front.line(...A,...B,i%3===1?warm:bright,alpha*0.94);
        front.line(...A,...H,ice,alpha*0.7);
      }
      if(time>0.33&&time<2.31){
        const alpha=life*(1-smooth(1.87,2.31,time));
        front.polygon([[0,-20],[11,-10],[10,7],[0,16],[-9,7],[-10,-8]],ink,alpha*0.87);
        trace(front,[[0,-20],[11,-10],[10,7],[0,16],[-9,7],[-10,-8],[0,-20]],bright,alpha*0.91);
        front.polygon([[0,-12],[5,-5],[0,9],[-5,-3]],warm,alpha*0.94);
        front.glow(0,-4,15,bright,alpha*glow*0.24);
      }
      const shot=smooth(0.87,hit,time);
      if(time>=0.87&&time<hit)front.line(92-shot*45,-9,113-shot*54,-18,warm,0.91);
      if(pulse>0.006){
        trace(front,[[38,-13],[28,-11],[19,2],[11,-1]],white,pulse*0.86);
        trace(front,[[38,-13],[30,-22],[25,-24]],bright,pulse*0.82);
        glint(front,39,-13,9+4*pulse,white,pulse*0.90);
        front.glow(39,-13,21,bright,glow*pulse*0.70);
      }
      let count=0;
      for(const p of shards){
        const u=(time-p.at)/p.life;
        if(u<=0||u>=1)continue;
        const t=(1-(1-u)**2)*p.life,x=p.x+p.vx*t,y=p.y+p.vy*t+16*u*u;
        chip(front,x,y,p.size*(0.85+0.15*Math.sin(p.phase+u*12)),Math.sin(p.phase+u*9)*0.7,1-smooth(0.34,1,u),p.color);
        count++;
      }
      ctx?.countParticles(count);
    };
  },
};
