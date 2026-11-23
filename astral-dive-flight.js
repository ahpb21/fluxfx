import { smooth, trace } from './effect-drawing.js';
import { keyframes } from './timeline.js';

export const astralTiming={launch:0.50,impact:1.10,aftershock:1.24,targetHit:2.72,recover:2.90};
export const astralLanding=[130,110];
export const astralTarget=[197,110];
const {launch,impact,targetHit,recover}=astralTiming;
const tau=Math.PI*2;
const travel=[
  [0,0,0],[0.25,1,-4],[launch,0,0],[0.62,23,13],[0.82,82,57],
  [0.96,111,85],[impact,130,110],[1.20,126,77],[1.34,110,39],[1.53,92,10],
  [1.69,83,1],[1.95,81,-4],[2.18,85,-5],[2.40,83,0],[2.50,103,12],
  [2.61,139,44],[targetHit,170,79],[2.82,192,74],[recover,211,48],
  [3.06,227,16],[3.25,256,-29],[3.47,279,-63],
];
const angle=keyframes([[0,-0.17],[0.45,-0.13],[0.72,0.83],[0.96,0.76],[impact,0.39],
  [1.16,0.72],[1.24,2.16],[1.34,3.96],[1.46,5.64],[1.59,tau-0.17],
  [2.40,tau-0.16],[2.58,tau+0.74],[targetHit,tau+0.87],[2.86,tau+0.20],[3.17,tau-0.59]]);
const trackX=keyframes(travel.map(([time,x])=>[time,x]));
const trackY=keyframes(travel.map(([time,,y])=>[time,y]));

export function astralPose(time){
  const hover=smooth(0.03,0.42,time)*(1-smooth(launch,0.66,time));
  const rebound=smooth(1.24,1.61,time)*(1-smooth(2.40,2.59,time));
  const climb=smooth(2.84,3.05,time)*(1-smooth(3.23,3.48,time))*0.64;
  return {x:trackX(time),y:trackY(time),angle:angle(time),wing:Math.max(hover,rebound,climb),
    opacity:1-smooth(3.21,3.45,time)};
}

export function astralTargetPose(time){
  const age=time-targetHit;
  if(age<0)return {x:0,y:0,tilt:0,echo:0};
  const hop=6.3*Math.sin(Math.PI*Math.min(1,age/0.39)), strike=smooth(0.01,0.14,age);
  const recoil=12*strike-6*smooth(0.24,0.65,age);
  const echo=smooth(0,0.045,age)*(1-smooth(0.10,0.46,age));
  return {x:recoil+Math.sin(age*67)*echo*2.6,y:-hop,tilt:8*strike*(1-smooth(0.19,0.58,age)),echo};
}

const solid=[0x243252,0x4f698b,0x839eb8,0xe2f2f6,0xd8aa86,0xb5935d];
const spectral=[0x24365f,0x4e79b5,0x84bcdf,0xc1fbfa,0xa0cde4,0x947fc7];

export function drawAstralFigure(surface,x,y,pose,opacity=1,ghost=false){
  const a=opacity*pose.opacity;
  if(a<=0.004)return;
  const [ink,metal,fabric,light,skin,gold]=ghost?spectral:solid;
  const c=Math.cos(pose.angle),s=Math.sin(pose.angle);
  const at=(u,v)=>[x+(u*c-v*s),y+(u*s+v*c)];
  const poly=(points,color,fade=1)=>surface.polygon(points.map(([u,v])=>at(u,v)),color,a*fade);
  const line=(pts,color,fade=1)=>trace(surface,pts.map(([u,v])=>at(u,v)),color,a*fade);
  poly([[-7,5],[1,6],[-2,14],[-10,21],[-14,19],[-8,11]],ink);
  poly([[0,4],[6,4],[7,13],[4,21],[-2,21],[1,13]],metal);
  poly([[-5,-9],[4,-9],[8,-3],[7,7],[2,12],[-8,8],[-9,-3]],metal);
  poly([[-5,-7],[4,-7],[6,-1],[4,5],[-6,7],[-7,-1]],fabric);
  line([[-6,4],[-1,5],[5,3]],gold,0.89);
  poly([[-8,-3],[-16,2],[-18,13],[-7,7],[-5,0]],ink,0.85);
  poly([[-6,-5],[-13,-3],[-21,3],[-24,7],[-13,3],[-5,0]],gold,0.86);
  poly([[-6,-16],[-4,-21],[2,-22],[7,-17],[6,-11],[-5,-10]],ink);
  poly([[-5,-16],[-3,-20],[2,-20],[6,-17],[2,-15],[-5,-14]],fabric);
  line([[0,-16],[6,-16]],light);
  line([[2,-14],[6,-14]],skin,0.89);
  poly([[4,-5],[10,-3],[15,2],[14,6],[11,5],[7,0],[3,0]],fabric);
  line([[7,-2],[12,0],[15,3]],light,0.82);
  line([[13,4],[16,4]],skin);
  surface.dot(...at(-1,0),light,a*0.78);
}
