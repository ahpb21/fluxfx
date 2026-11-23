# FluxFX 开发者指南

## 安装和入口

源码可直接由浏览器 ES 模块加载。项目工具要求 Node.js 20 或更高版本。核心由 `index.js` 导出，运行时无需第三方依赖。构建本地 npm 包后，其他项目可用包名导入。

```sh
npm test
npm pack
npm install --save /path/to/fluxfx-original-0.2.0.tgz
```

```js
import { PixelPlayer, effects } from 'fluxfx-original';
```

包为 ESM，随包交付类型声明、工作台、CLI 和第三方许可声明。本地打包与安装都可以在私有包状态下验证。正式发布由维护者确认包名、根项目许可和发布目标后处理。

## 将特效接入游戏循环

下面的例子以角色脚底为局部原点。在已有的游戏循环里，先更新特效，再按相机位置绘制。`actorPixels` 是相同逻辑分辨率的屏幕坐标 RGBA 数据，`scenePixels` 可以是 RGBA 数据、`0xRRGGBB` 背景色或 `null`。

```js
import { PixelPlayer, effects } from 'fluxfx-original';

const player = new PixelPlayer(320, 180);
const image = new ImageData(320, 180);
const strike = player.play(effects.comboStrike, { x: 130, y: 144, seed: 23 });

function drawFrame(dt, context, cameraX, cameraY, scenePixels, actorPixels) {
  player.update(dt);
  const frame = player.renderLayers({ cameraX, cameraY });
  frame.composite({ background: scenePixels, actors: actorPixels, out: image.data });
  context.putImageData(image, 0, 0);
  return strike.drainEvents();
}
```

合成顺序为背景、后层、角色、前层、加法光照。`frame.back.data` 和 `frame.front.data` 是直通 RGBA，`frame.light.data` 每像素存一个 `0xRRGGBB`。读取后进行自定义合成时，用加法混合应用光照。`frame.stats` 提供注册实例数和通过 `countParticles()` 报告的活跃粒子数。

播放器反复使用渲染缓冲和帧统计。需要保存结果时复制数组。常规透明叠加可以继续用 `render()`，它保留原有的逐实例合成顺序。`renderLayers()` 则按每层集中处理 `depth`，适合需要角色遮挡与场景受光的接入。

## 坐标、变换和武器锚点

坐标以逻辑像素计，x 向右、y 向下。单纯平移沿用原来的整像素定位。旋转用弧度，缩放和镜像按最近邻采样，适合像素画。实例可以通过 `setTransform()` 替换变换。设置 `transform` 的 `scaleX` 或 `scaleY` 可覆盖相应轴的 `scale`。

```js
const trail = player.play(effects.referenceSlash, {
  x: 4,
  seed: 9,
  anchor: () => ({ x: hero.weaponTipX, y: hero.weaponTipY, rotation: hero.weaponAngle }),
  transform: { scale: 0.75 }
});
```

使用锚点时，`x`、`y` 是锚点局部偏移。回调收到实例累计时间，返回世界坐标及可选变换。暂时隐藏实例时可返回 `null`，也可用 `setAnchor()` 改回独立定位。实现录像或倒放时，请从同一份角色动作记录按时间采样锚点。自定义效果可提供 `bounds: { x, y, width, height }`，包住所有颜色与光照，以缩小变换所需的中间缓冲。

## 编写、编排与复用

`build(random, settings)` 每次播放只执行一次。第三个绘制参数 `context` 提供 `back`、`front`、`parameters` 和 `countParticles(count)`。第二个绘制参数是当前效果的局部时间。将随机参数放进 `build` 可以让相同种子和时刻得到相同结果。

```js
import { createShockwave, effects, keyframes, sequence } from 'fluxfx-original';

const lunge = keyframes([[0, 0], [0.35, -3], [0.57, 8], [0.9, 0]]);
const move = sequence([
  { effect: effects.crescentSlash, at: 0.35, x: (localTime, params) => params.lunge },
  { effect: createShockwave({ radius: 40, color: 0xffbd75, light: 0.3 }), at: 0.57, x: 31 }
], {
  tracks: { lunge },
  events: [{ at: 0.57, name: 'impact', data: { x: 31 } }]
});
```

序列级轨道使用序列时间，剪辑级轨道使用剪辑局部时间，剪辑级同名参数优先。`x`、`y` 和 `transform` 都可用回调随时间变化。`drainEvents()` 返回正向 `update()` 跨过的事件，`seek()` 清空待取事件；游戏可自行决定如何对接音效、镜头和战斗判定。预览工作台可直接点击事件标记定位。

`createParticleEmitter()` 为一次性发射提供可直接定位的轨迹，可加重力、地面反弹和拖尾。`drawRibbon()` 从曲线生成有宽度的像素带。`createShockwave()` 可作为普通效果直接播放或加入序列。`showcase.js` 里的「裂地连斩」把这些组件和拖尾、辉光、落地烟尘放进同一套时间轴。

## 固定步长和检查点

用 `createSimulation()` 处理需要按状态演进的片段。`advance(state, dt, time)` 可以更新状态或返回新状态。`at(time)` 返回最近完整模拟步的独立快照。检查点和最近的模拟结果会复用，采样可以跳过之前的画面。

```js
const debris = createSimulation({
  initial: { y: -12, velocity: 0 },
  duration: 0.8,
  step: 1 / 120,
  advance(state, dt) {
    state.velocity += 240 * dt;
    state.y = Math.min(0, state.y + state.velocity * dt);
  }
});
```

模拟步内若依赖外部状态，按模拟时间读取那份状态。修改历史输入后可用 `invalidateAfter(time)` 丢弃该时刻及以后的缓存。这类状态需要支持 `structuredClone`，特殊类型可以传入自己的 `clone`。

## 资产导出和发布包检查

工作台可以导出当前透明帧或完整 ZIP。渲染诊断中的角色、锚点和背景属于预览。CLI 适合脚本自动导出。

```sh
npx --no-install fluxfx --list
npx --no-install fluxfx comboStrike --out assets/fx --fps 30 --seed 23 --layers
```

源目录也可使用 `npm run export -- comboStrike --layers`。参数有 `--width`、`--height`、`--origin-x`、`--origin-y`、`--fps`、`--columns`、`--seed` 和 `--out`。默认每帧为 160 × 112，帧率 30。输出包含合成 PNG 和 Aseprite 风格 JSON。`--layers` 追加前后层和加法光照 PNG。JSON 的 `meta.fluxfx` 包含锚点、事件、循环、种子及图层文件名。自定义效果可直接传给 `createSpriteSheet()`。

发布前运行 `npm test`、`npm pack --dry-run`，再把 tarball 安装到独立项目试跑包入口和 CLI。[第三方许可](../THIRD-PARTY-NOTICES.md)随包分发。
