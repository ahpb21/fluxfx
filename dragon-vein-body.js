import { drawRibbon } from './components.js';
import { clamp, smooth, trace } from './effect-drawing.js';
import { keyframes } from './timeline.js';

const obsidian = 0x211c28, basalt = 0x453740, slate = 0x6e5351;
const red = 0x9c352d, amber = 0xed8848, gold = 0xffc778, hot = 0xffe6ad;

const poses = [
  [0.90, [[-44,17],[-34,9],[-26,-7],[-18,-24],[-21,-39],[-8,-53]]],
  [0.94, [[-68,21],[-48,10],[-27,-8],[-2,-34],[10,-65],[-13,-62]]],
  [0.98, [[-85,21],[-59,5],[-32,-29],[-8,-56],[14,-36],[3,-12]]],
  [1.08, [[-103,17],[-76,-3],[-49,-42],[-15,-65],[14,-65],[22,-35]]],
  [1.28, [[-111,15],[-82,-19],[-52,-63],[-21,-92],[16,-86],[42,-58]]],
  [1.39, [[-108,16],[-79,-9],[-54,-63],[-20,-86],[-28,-76],[-56,-44]]],
  [1.47, [[-85,16],[-46,-23],[-4,-61],[30,-55],[58,-39],[82,-27]]],
  [1.56, [[81,18],[60,-4],[65,-40],[84,-64],[106,-53],[127,-30]]],
  [1.75, [[104,24],[75,1],[67,-36],[88,-64],[113,-48],[119,-22]]],
  [2.00, [[65,20],[48,0],[65,-32],[83,-40],[102,-27],[105,-11]]],
  [2.13, [[60,22],[52,9],[65,-11],[85,-19],[99,-11],[103,6]]],
  [2.26, [[76,25],[74,22],[78,18],[87,15],[96,17],[102,26]]],
];

const joints = poses[0][1].map((_,i)=>[0,1].map(k=>keyframes(poses.map(([at,points])=>[at,points[i][k]]))));

function spline(points,u) {
  const t=clamp(u)*(points.length-1), i=Math.min(points.length-2,Math.floor(t)), f=t-i;
  const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
  const blend=k=>0.5*(2*b[k]+(c[k]-a[k])*f+(2*a[k]-5*b[k]+4*c[k]-d[k])*f*f
    +(-a[k]+3*b[k]-3*c[k]+d[k])*f*f*f);
  return [blend(0),blend(1)];
}

function head(front, x, y, angle, size, time, opacity, light) {
  const c=Math.cos(angle),s=Math.sin(angle);
  const at=(u,v)=>[x+(u*c-v*s)*size,y+(u*s+v*c)*size];
  const shape=(coords,color,alpha=opacity)=>front.polygon(coords.map(([u,v])=>at(u,v)),color,alpha);
  const line=(points,color,alpha)=>trace(front,points.map(([u,v])=>at(u,v)),color,alpha);
  const breath=1-smooth(1.00,1.15,time);
  const gape=4+5*Math.max(0,Math.sin(time*26+0.4))*0.4+4*breath;
  shape([[-18,-4],[-11,-13],[-2,-15],[7,-12],[12,-7],[22,-5],[26,-1],[20,3],[9,4],[4,13],[-7,14],[-16,7]],obsidian);
  shape([[-17,-1],[-10,-10],[0,-13],[10,-7],[17,-6],[24,-2],[19,1],[6,1],[0,8],[-10,8]],basalt);
  shape([[-13,-5],[-8,-10],[1,-11],[10,-6],[16,-4],[7,-3],[1,0],[-6,-1]],slate);
  shape([[-14,5],[-5,7],[5,3],[18,5+gape],[23,5+gape],[18,9+gape],[7,9+gape],[-4,13],[-13,11]],obsidian);
  shape([[-12,7],[-4,8],[6,6],[17,6+gape],[20,6+gape],[17,8+gape],[7,8+gape],[-4,11]],basalt);
  line([[-11,7],[-3,9],[7,7+gape*0.5],[18,7+gape]],red,opacity*0.91);
  line([[4,1],[17,1],[23,-1]],gold,opacity*0.90);
  for(const u of [8,14,19])shape([[u,1],[u+2,2],[u+0.7,4+gape*0.25]],hot,opacity*0.90);
  shape([[-13,-8],[-18,-20],[-29,-26],[-19,-15],[-15,-10],[-10,-8]],obsidian);
  shape([[-13,-10],[-15,-15],[-20,-20],[-29,-26],[-17,-23],[-9,-14],[-7,-10]],slate);
  line([[-28,-25],[-20,-20],[-14,-14]],gold,opacity*0.84);
  shape([[-8,-11],[-10,-20],[-16,-26],[-7,-23],[-3,-17],[0,-13]],basalt);
  line([[-15,-25],[-8,-21],[-4,-15]],amber,opacity*0.92);
  shape([[-15,1],[-26,2],[-22,-5],[-12,-8]],basalt);
  shape([[-12,10],[-21,16],[-15,3]],red);
  shape([[-8,-6],[-1,-7],[6,-5],[2,-3],[-4,-3]],obsidian);
  shape([[-4,-5],[2,-6],[4,-5],[1,-4]],gold);
  front.dot(...at(1,-5),hot,opacity);
  front.dot(...at(20,-3),red,opacity);
  const ripple=3*Math.sin(time*29);
  line([[14,-4],[25,-11],[31,-12+ripple],[34,-16+ripple]],amber,opacity*0.65);
  line([[13,3],[25,3+gape*0.56],[31,1+gape*0.46+ripple],[32,-3+gape*0.43+ripple]],gold,opacity*0.56);
  if(light>0){
    front.glow(...at(1,-5),9,gold,light*opacity*0.61);
    front.glow(...at(16,gape*0.59),12,amber,light*opacity*(0.30+breath*0.53));
  }
}

export function drawVeinDragon(front,time,light,low) {
  if(time<0.90 || time>=2.28)return;
  const opacity=1-smooth(2.05,2.28,time);
  const swell=0.76+0.24*smooth(0.90,1.14,time)-0.26*smooth(2.03,2.27,time);
  const points=joints.map(([x,y])=>[x(time),y(time)]);
  const at=u=>spline(points,u);
  const width=u=>swell*(3.5+18*Math.sin(Math.PI*u*0.57)**0.83);
  drawRibbon(front,{point:at,width:u=>width(u)+3,segments:low?21:34,color:obsidian,edge:red,opacity});
  drawRibbon(front,{point:at,width:u=>width(u)*0.76,segments:low?20:34,color:basalt,edge:slate,opacity});
  const distance=points.reduce((total,[x,y],i)=>i?total+Math.hypot(x-points[i-1][0],y-points[i-1][1]):0,0);
  const scales=Math.max(7,Math.min(low?24:37,Math.round(distance/(low?8.0:5.8))));
  for(let i=1;i<scales;i++){
    const u=i/scales,[x,y]=at(u),[ax,ay]=at(u-0.013),[bx,by]=at(u+0.013);
    const len=Math.hypot(bx-ax,by-ay)||1,dx=(bx-ax)/len,dy=(by-ay)/len;
    const side=dx<0?-1:1,nx=dy*side,ny=-dx*side;
    const w=width(u)*0.52,h=(3.8+1.8*u)*swell;
    const atScale=(a,b)=>[x+dx*a+nx*b,y+dy*a+ny*b];
    const corners=[atScale(-h,-w*0.57),atScale(-h*0.61,w*0.64),atScale(h*0.20,w),atScale(h*0.84,w*0.41),
      atScale(h*0.61,-w*0.65),atScale(0,-w)];
    front.polygon(corners,i%3===0?obsidian:basalt,opacity);
    front.polygon([corners[1],corners[2],atScale(h*0.28,0),atScale(-h*0.36,-w*0.27)],slate,opacity*0.87);
    const pulse=0.56+0.44*Math.sin(time*24-u*17)**2;
    front.line(...corners[1],...corners[2],amber,opacity*pulse*0.78);
    front.line(...atScale(-h*0.69,-w*0.36),...atScale(h*0.41,-w*0.61),i%4===0?gold:red,opacity*pulse*0.93);
    if(i%3===0 && u>0.16){
      const r=4+u*7, tip=atScale(-h*1.25,w+r);
      front.polygon([atScale(-h*0.59,w*0.71),tip,atScale(h*0.58,w*0.77)],obsidian,opacity);
      front.line(...atScale(-h*0.59,w*0.76),...tip,red,opacity*0.84);
      front.dot(...tip,amber,opacity*pulse*0.78);
    }
    if(i%5===0)front.glow(...atScale(h*0.21,-w*0.10),9+u*6,red,light*opacity*pulse*0.44);
  }
  const [x,y]=at(1),[ax,ay]=at(0.945);
  head(front,x,y,Math.atan2(y-ay,x-ax),swell,time,opacity,light);
}
