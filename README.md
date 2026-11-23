# FluxFX Original

独立的网页游戏像素特效系统。支持确定性播放、分层合成、角色锚点、时间轴编排和精灵图导出。运行时无需第三方依赖，公共入口提供 TypeScript 类型声明。

在此目录运行 `npm start`，打开 http://127.0.0.1:4180 。`npm test` 运行 Node 的内建测试。也可以用普通静态服务器托管整个目录。

- [开发者指南](docs/development.md) 包含浏览器与 npm 接入、分层绘制、锚点、模拟和导出示例。
- [AI 特效创作技能](docs/ai-skill.md) 提供 Codex、Claude Code 的使用说明，以及局部特效、全屏演出模板和验收脚本。
- 工作台选择「裂地连斩」可查看角色、前后层、光照和时间轴标记。点击视口或聚焦后按方向键可移动锚点。

## 内置特效

| 标识 | 特效 | 时长 |
| --- | --- | --- |
| `orrery` | 星盘解封 | 3.2 秒 |
| `lantern` | 潮汐灯 | 3.6 秒循环 |
| `kiln` | 陶火绽放 | 3.4 秒 |
| `dandelion` | 蒲公英散开 | 1.8 秒 |
| `frostburst` | 霜晶爆发 | 1.7 秒 |
| `thunderstrike` | 分叉雷击 | 1.25 秒 |
| `healingAura` | 回春光环 | 2.2 秒 |
| `crescentSlash` | 月弧斩 | 0.8 秒 |
| `crossSlash` | 绯刃十字 | 0.96 秒 |
| `cinderBurst` | 熔核爆炸 | 1.45 秒 |
| `referenceSlash` | 蓝白刀光（复刻） | 0.75 秒 |
| `comboStrike` | 裂地连斩 | 1.6 秒 |
| `prismArray` | 棱镜折射阵列 | 2.8 秒 |
| `gravityCollapse` | 引力坍缩 | 3.15 秒 |
| `solarEruption` | 日冕爆发 | 2.82 秒 |
| `frostUltimate` | 永霜裂界 | 2.4 秒，320 × 180 全屏演出 |
| `groundPound` | 大地重砸（复刻） | 3.82 秒，304 × 204 演示构图 |
| `mirrorStep` | 镜隙迁跃 | 2.7 秒，320 × 180 双门传送 |
| `origamiFlock` | 赤纸鹤阵 | 2.35 秒，折纸飞行群 |
| `tideReversal` | 逆汐珍珠 | 3.1 秒，逆流水幕 |
| `terrainEcho` | 地脉显影 | 3 秒，等高线扫描 |
| `thunderThrust` | 雷霆突刺 | 2.95 秒，304 × 204，起点 (60, 120)，终点 (240, 120) |
| `fireburstShot` | 炎火爆裂弹 | 3.45 秒，304 × 204，起点 (70, 100)，落点 (210, 135) |
| `verdantBind` | 灵藤锁缚 | 4.60 秒，304 × 204，萌发点 (152, 170) |
| `timeSever` | 时痕断斩 | 3.68 秒，304 × 204，从 (40, 160) 斩至 (260, 80) |
| `windswiftWings` | 风息迅翼 | 3.90 秒，304 × 204，双对风翼加速增益 |
| `infernalLotus` | 永狱・红莲业火 | 4.60 秒，304 × 204，法阵中心 (152, 140) |
| `dragonVein` | 龙脉地裂 | 5.20 秒，304 × 204，核心 (152, 145) |
| `startrailCollapse` | 时空崩裂・星轨坍缩 | 4.80 秒，304 × 204，星轨中心 (152, 120) |
| `astralDive` | 星界俯冲・流光天袭 | 4.80 秒，304 × 204，从 (50, 40) 俯冲至 (180, 150) |
| `inkVeil` | 墨幕隐踪 | 3.40 秒，320 × 180，像素簇烟幕 |
| `frostLoom` | 霜梭织甲 | 2.80 秒，320 × 180，冰晶护甲 |
| `jadeBridge` | 琉璃浮桥 | 3.42 秒，320 × 180，琉璃桥板 |
| `crimsonCrescent` | 赤焰新月斩 | 0.90 秒，256 × 192，锚点 (72, 128)，落点 (184, 112) |
| `lightningBlink` | 雷闪折跃 | 0.80 秒，320 × 160，从 (48, 112) 折跃至 (256, 112) |

## 接入游戏

`crimsonCrescent` 的实例坐标为出手时的世界锚点。可传入 `chargeOffset(time)`，返回武器挂点相对于出手锚点的偏移，供蓄力弧和火星跟随。偏移在 0.25 秒的 `cast` 标记后停止采样。0.33 秒的 `hit` 提供相对落点与 2 像素的水平击退量。工作台演示的导出预设为 12 FPS、种子 1101。

`lightningBlink` 在固定世界锚点播放。宿主在 `blink_out`（0.18 秒）隐藏角色，在 `blink_in`（0.30 秒）按事件的相对偏移 (208, 0) 放置并显示角色。工作台沿用同一时序，导出预设为 15 FPS、种子 3319。

```js
import { PixelPlayer, effects } from './index.js';

// canvas 是覆盖在场景上方的透明画布，CSS 可按整数倍放大。
canvas.width = 320;
canvas.height = 180;
canvas.style.imageRendering = 'pixelated';
const ctx = canvas.getContext('2d');
const player = new PixelPlayer(320, 180);
const image = new ImageData(player.surface.data, 320, 180);
const spell = player.play(effects.orrery, { x: 160, y: 110, seed: 23 });

function renderTick(dt) {
  player.update(dt); // 秒
  player.render({ cameraX: 0, cameraY: 0 });
  ctx.putImageData(image, 0, 0);
}
// spell.moveTo(x, y) 跟随角色；spell.seek(seconds) 定位；spell.stop() 移除。
```

每个实例有自己的时钟和随机序列。`depth` 较低的实例先画。`render()` 复用一个透明 RGBA 像素缓冲区，保存历史帧时需要复制。用 `renderLayers()` 可以在效果的前后层之间插入角色，并让加法光照作用于整个场景。

### 刀光朝向与遮挡

`crescentSlash` 和 `crossSlash` 支持 `direction: -1` 水平镜像，以及 `quality: 'low'` 减少曲带采样和火花数量。使用 `renderLayers()` 时，同一实例会输出前后两层。接入普通 `render()` 的项目仍可使用 `pass` 手动指定层次。

```js
const slash = { x: 160, y: 110, seed: 23, direction: -1 };
player.play(effects.crescentSlash, { ...slash, pass: 'rear', depth: -1 });
// 角色在 depth 0 绘制。使用独立图层时，角色位于两层刀光之间。
player.play(effects.crescentSlash, { ...slash, pass: 'front', depth: 1 });
```

`referenceSlash` 移植自 pixelfx 的 Sword slash。工作台可直接打开 `/?effect=referenceSlash`。在 0.10 秒查看亮刃和火花，在 0.30 秒查看点状残影。可设置 `direction: -1` 镜像，或用 `light: 0` 关闭辉光。来源和许可见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

### 大地重砸

`groundPound` 移植自 pixelfx 的 Ground pound。工作台地址为 `/?effect=groundPound`。用标记跳到 0.62 秒查看落地闪光，再拖到 0.87 秒查看双向冲击波与腾空碎石。工作台提供角色动作、受击木桩和屏幕震动演示。

```js
import { groundPound, PixelPlayer } from './index.js';

const player = new PixelPlayer(304, 204);
const move = player.play(groundPound, { x: 152, y: 168, seed: 1 });
player.update(0.62);
const events = move.drainEvents(); // launch, impact
const frame = player.renderLayers();
```

前景、后景与加法光照可独立合成。游戏中通过 `impact`、`targetHit` 和 `aftershock` 事件驱动角色、停顿、震屏和击退。可用 `palette`、`stone`、`reach` 和 `light` 调整效果。来源和许可见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)。

## 编写自定义效果

```js
const seedLight = {
  duration: 0.6,
  loop: false,
  build(random, { color = 0xffda88 } = {}) {
    const angle = random() * Math.PI * 2;
    return (surface, time) => {
      const u = time / 0.6;
      const x = Math.cos(angle) * 16 * u;
      const y = -10 - 24 * u;
      surface.ellipse(x, y, 3 - 2 * u, 3 - 2 * u, color, 1 - u);
    };
  }
};
player.play(seedLight, { x: 40, y: 60, seed: 8, color: 0xa2eab5 });
```

build 在播放时调用一次，用于生成几何、材质参数或运动轨迹。返回的绘制函数接收局部时间。把随机生成放在 build 内，绘制时就能在任意时间正向或反向定位。Surface 提供 dot、span、line、polygon、ellipse 和 halo。颜色采用 0xRRGGBB，覆盖率为 0 到 1。

## 编排与运动

```js
import { sequence } from './index.js';

const ceremony = sequence([
  { effect: effects.lantern, at: 0, span: 3.2, x: -34 },
  { effect: effects.orrery, at: 0.7, x: 18 },
  { effect: effects.kiln, at: 1.8, x: 48 }
]);
player.play(ceremony, { x: 140, y: 120, seed: 7 });
```

sequence 将模块编成可以继续嵌套的效果。bouncingArc 根据初始速度、重力、地面、恢复系数和摩擦预计算各段飞行时间，按指定时刻返回位置、弹跳次数和静止状态。陶片使用这套轨迹，快进或倒放都无需重跑中间帧。

普通光晕按透明度逐层混入 RGBA 缓冲。蓝白刀光使用 `Surface.addLight` 在该缓冲中累加 RGB 光。工作台可调整速度、种子和预览背景，并导出当前逻辑分辨率的透明 PNG。

## 导出精灵图

工作台的「导出精灵图 ZIP」包含合成 PNG、前后层、加法光照层和 Aseprite 风格 JSON。自动化也可以调用命令行。

```sh
npm run export -- --list
npm run export -- comboStrike --fps 30 --seed 23 --layers --out exports
```

## 高光效压测

棱镜折射阵列、引力坍缩和日冕爆发都支持 `quality: 'full' | 'low'` 与 `light: 0…1`。工作台的质量选项会同时调整图形采样、粒子数量和光照强度。

```sh
npm run bench
npm run --silent bench -- --samples 120 --json
```

压测使用固定种子及代表性高负载时刻，测量 `320 × 180` 逻辑画布上分层渲染与场景合成的 CPU 耗时。混合负载逐级增加到 60 FPS 的帧预算首次被超过，或达到 48 个实例。数据含 P50、P95、活跃粒子数和被加法光照覆盖的像素数。浏览器画布上传与游戏本身的开销需要在实际接入场景里另测。
