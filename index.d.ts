export type RGB = number;
export type Point = readonly [number, number];
export type Random = () => number;
export interface Bounds { x: number; y: number; width: number; height: number }

export class LightBuffer {
  constructor(width: number, height: number);
  readonly width: number;
  readonly height: number;
  readonly data: Uint32Array;
  clear(): void;
  add(x: number, y: number, color: RGB): void;
  glow(x: number, y: number, radius: number, color: RGB, strength?: number): void;
  forEach(visit: (x: number, y: number, color: RGB, pixelIndex: number) => void): void;
}

export class Surface {
  constructor(width: number, height: number, light?: LightBuffer | null);
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  x: number;
  y: number;
  clear(): void;
  dot(x: number, y: number, color: RGB, opacity?: number): void;
  span(y: number, left: number, right: number, color: RGB, opacity?: number): void;
  line(x0: number, y0: number, x1: number, y1: number, color: RGB, opacity?: number): void;
  polygon(points: readonly Point[], color: RGB, opacity?: number): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, color: RGB, opacity?: number): void;
  halo(x: number, y: number, radiusX: number, radiusY: number, color: RGB, strength: number): void;
  addLight(x: number, y: number, color: RGB): void;
  glow(x: number, y: number, radius: number, color: RGB, strength?: number): void;
}

export interface FrameStats { instances: number; particles: number }
export interface CompositeOptions {
  background?: RGB | Uint8ClampedArray | null;
  actors?: Uint8ClampedArray | null;
  out?: Uint8ClampedArray;
  back?: boolean;
  front?: boolean;
  light?: boolean;
}
export class LayeredFrame {
  constructor(width: number, height: number);
  readonly width: number;
  readonly height: number;
  readonly back: Surface;
  readonly front: Surface;
  readonly light: LightBuffer;
  readonly output: Uint8ClampedArray;
  readonly stats: Readonly<FrameStats>;
  clear(): void;
  composite(options?: CompositeOptions): Uint8ClampedArray;
}

export interface Transform { rotation?: number; scale?: number; scaleX?: number; scaleY?: number; flipX?: boolean; flipY?: boolean }
export interface AnchorPose extends Transform { x: number; y: number }
export type Anchor = (time: number) => AnchorPose | null | undefined;
export interface Camera { cameraX?: number; cameraY?: number }
export interface PlaybackOptions { x?: number; y?: number; depth?: number; seed?: number; transform?: Transform; anchor?: Anchor | null }
export interface EffectEvent<Data = unknown> { at: number; name: string; data?: Data }
export interface PlaybackEvent<Data = unknown> extends EffectEvent<Data> { time: number; cycle: number }
export interface EffectHandle {
  readonly time: number;
  seek(time: number): void;
  moveTo(x: number, y: number): void;
  setTransform(transform?: Transform): void;
  setAnchor(anchor?: Anchor | null): void;
  drainEvents(): PlaybackEvent[];
  stop(): void;
}

export interface EffectContext {
  readonly back: Surface;
  readonly front: Surface;
  readonly layered: boolean;
  readonly parameters: Readonly<Record<string, number>>;
  countParticles(count: number): void;
}
export type DrawEffect = (surface: Surface, time: number, context: EffectContext) => void;
export interface EffectDefinition<Settings extends object = object> {
  duration: number;
  loop?: boolean;
  title?: string;
  english?: string;
  previewTime?: number;
  bounds?: Bounds;
  events?: readonly EffectEvent[];
  createRandom?(seed: number): Random;
  build(random: Random, options: Settings): DrawEffect;
}
export class PixelPlayer {
  constructor(width: number, height: number);
  readonly surface: Surface;
  readonly instances: ReadonlySet<unknown>;
  play<Settings extends object>(definition: EffectDefinition<Settings>, options?: PlaybackOptions & Settings): EffectHandle;
  update(seconds: number): void;
  render(camera?: Camera): Uint8ClampedArray;
  renderLayers(camera?: Camera): LayeredFrame;
}

export function seeded(seed: number): Random;
export type Keyframe = readonly [time: number, value: number, ease?: (progress: number) => number];
export type Track = (time: number) => number;
export function keyframes(keys: readonly Keyframe[]): Track;
export type CueValue<T> = T | ((localTime: number, parameters: Readonly<Record<string, number>>) => T);
export interface SequenceClip<Settings extends object = Record<string, unknown>> {
  effect: EffectDefinition<Settings>;
  at?: number;
  span?: number;
  x?: CueValue<number>;
  y?: CueValue<number>;
  transform?: CueValue<Transform>;
  tracks?: Record<string, Track>;
  settings?: Settings;
}
export interface SequenceOptions { loop?: boolean; tracks?: Record<string, Track>; events?: readonly EffectEvent[] }
export function sequence(clips: readonly SequenceClip[], options?: SequenceOptions): EffectDefinition<Record<string, unknown>>;

export interface BallisticOptions { x: number; y: number; vx: number; vy: number; gravity?: number; floor?: number; restitution?: number; friction?: number }
export interface BallisticPosition { x: number; y: number; bounce: number; rest: boolean }
export function bouncingArc(options: BallisticOptions): (time: number) => BallisticPosition;
export interface Particle<Data = unknown> extends Partial<BallisticOptions> { at?: number; lifetime: number; trail?: number; data?: Data }
export interface ParticleSample<Data = unknown> {
  readonly x: number; readonly y: number; readonly previousX: number; readonly previousY: number;
  readonly rest: boolean; readonly age: number; readonly progress: number; readonly data?: Data;
}
export function createParticleEmitter<Data>(random: Random, options: {
  count: number;
  spawn(random: Random, index: number): Particle<Data>;
  draw(surface: Surface, sample: ParticleSample<Data>): void;
}): (surface: Surface, time: number, context?: EffectContext) => number;
export function drawRibbon(surface: Surface, options: {
  point(progress: number): Point; width: number | ((progress: number) => number); segments?: number;
  color: RGB; opacity?: number; edge?: RGB;
}): void;
export function createShockwave(options?: { duration?: number; startRadius?: number; radius?: number; color?: RGB; light?: number }): EffectDefinition;
export function createSimulation<State>(options: {
  initial: State; duration: number; step?: number; checkpointEvery?: number;
  advance(state: State, dt: number, time: number): State | void;
  clone?(state: State): State;
}): { at(time: number): State; invalidateAfter(time: number): void };

export interface SpriteSheetOptions<Settings extends object = object> {
  width?: number; height?: number; originX?: number; originY?: number; fps?: number; columns?: number;
  seed?: number; name?: string; layers?: boolean; transform?: Transform; settings?: Settings;
}
export interface AtlasRectangle { x: number; y: number; w: number; h: number }
export interface AtlasFrame {
  filename: string; frame: AtlasRectangle; rotated: false; trimmed: false;
  spriteSourceSize: AtlasRectangle; sourceSize: { w: number; h: number }; duration: number;
}
export interface SpriteSheet {
  data: Uint8ClampedArray; width: number; height: number;
  layers?: Record<'back' | 'front' | 'light', Uint8ClampedArray>;
  metadata: { frames: AtlasFrame[]; meta: {
    app: string; image: string; format: 'RGBA8888'; size: { w: number; h: number }; scale: '1';
    frameTags: Array<{ name: string; from: number; to: number; direction: 'forward' }>;
    fluxfx: { fps: number; loop: boolean; origin: { x: number; y: number }; seed: number;
      events: readonly EffectEvent[]; layers?: Record<'back' | 'front' | 'light', string> };
  }};
}
export function createSpriteSheet<Settings extends object>(effect: EffectDefinition<Settings>, options?: SpriteSheetOptions<Settings>): SpriteSheet;

export interface CatalogEffect<Settings extends object = object> extends EffectDefinition<Settings> { title: string; english: string }
export interface SlashSettings { direction?: number; pass?: 'both' | 'rear' | 'front'; quality?: 'full' | 'low' }
export interface ReferenceSlashSettings { direction?: number; light?: number }
export interface GroundPoundSettings { palette?: readonly (RGB | string)[]; stone?: RGB | string; reach?: number; light?: number }
export const orrery: CatalogEffect;
export const lantern: CatalogEffect;
export const kiln: CatalogEffect;
export const frostburst: CatalogEffect;
export const thunderstrike: CatalogEffect;
export const healingAura: CatalogEffect;
export const crescentSlash: CatalogEffect<SlashSettings>;
export const crossSlash: CatalogEffect<SlashSettings>;
export const cinderBurst: CatalogEffect;
export const referenceSlash: CatalogEffect<ReferenceSlashSettings>;
export const comboStrike: CatalogEffect;
export interface LabEffectSettings { quality?: 'full' | 'low'; light?: number }
export const prismArray: CatalogEffect<LabEffectSettings>;
export const gravityCollapse: CatalogEffect<LabEffectSettings>;
export const solarEruption: CatalogEffect<LabEffectSettings>;
export const frostUltimate: CatalogEffect<LabEffectSettings>;
export const groundPound: CatalogEffect<GroundPoundSettings>;
export const mirrorStep: CatalogEffect<LabEffectSettings>;
export const origamiFlock: CatalogEffect<LabEffectSettings>;
export const tideReversal: CatalogEffect<LabEffectSettings>;
export const terrainEcho: CatalogEffect<LabEffectSettings>;
export const thunderThrust: CatalogEffect<LabEffectSettings>;
export const fireburstShot: CatalogEffect<LabEffectSettings>;
export const verdantBind: CatalogEffect<LabEffectSettings>;
export const timeSever: CatalogEffect<LabEffectSettings>;
export const windswiftWings: CatalogEffect<LabEffectSettings>;
export const infernalLotus: CatalogEffect<LabEffectSettings>;
export const dragonVein: CatalogEffect<LabEffectSettings>;
export const startrailCollapse: CatalogEffect<LabEffectSettings>;
export const astralDive: CatalogEffect<LabEffectSettings>;
export const inkVeil: CatalogEffect<LabEffectSettings>;
export const frostLoom: CatalogEffect<LabEffectSettings>;
export const jadeBridge: CatalogEffect<LabEffectSettings>;
export interface CrimsonCrescentSettings extends LabEffectSettings { chargeOffset?: (time: number) => { x: number; y: number } }
export const crimsonCrescent: CatalogEffect<CrimsonCrescentSettings>;
export const lightningBlink: CatalogEffect<LabEffectSettings>;
export const effects: {
  orrery: typeof orrery; lantern: typeof lantern; kiln: typeof kiln; dandelion: CatalogEffect<{ wind?: number; color?: RGB }>;
  frostburst: typeof frostburst; thunderstrike: typeof thunderstrike; healingAura: typeof healingAura;
  crescentSlash: typeof crescentSlash; crossSlash: typeof crossSlash; cinderBurst: typeof cinderBurst;
  referenceSlash: typeof referenceSlash; comboStrike: typeof comboStrike;
  prismArray: typeof prismArray; gravityCollapse: typeof gravityCollapse; solarEruption: typeof solarEruption;
  frostUltimate: typeof frostUltimate; groundPound: typeof groundPound; mirrorStep: typeof mirrorStep;
  origamiFlock: typeof origamiFlock; tideReversal: typeof tideReversal; terrainEcho: typeof terrainEcho;
  thunderThrust: typeof thunderThrust;
  fireburstShot: typeof fireburstShot;
  verdantBind: typeof verdantBind;
  timeSever: typeof timeSever;
  windswiftWings: typeof windswiftWings;
  infernalLotus: typeof infernalLotus;
  dragonVein: typeof dragonVein;
  startrailCollapse: typeof startrailCollapse;
  astralDive: typeof astralDive;
  inkVeil: typeof inkVeil; frostLoom: typeof frostLoom; jadeBridge: typeof jadeBridge;
  crimsonCrescent: typeof crimsonCrescent;
  lightningBlink: typeof lightningBlink;
};
