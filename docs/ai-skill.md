# FluxFX AI 特效创作技能

`fluxfx-vfx` 面向能读取和修改代码的 AI。它能指导 AI 在 FluxFX 中选用、改造、编排或制作特效，并通过工作台或命令行交付可复现的预览与精灵图。需要 FluxFX 0.2.x 源码或兼容版本，运行本地检查和导出需要 Node.js 20 或更高版本。

## 在 Codex 中使用

在包含 `package.json`、`index.js` 和 `.agents/skills/fluxfx-vfx/SKILL.md` 的内层 FluxFX 目录打开项目。技能已经在项目发现路径内。通过技能选择器选择 **fluxfx-vfx**，或者在 Codex CLI 或 IDE 扩展里输入 `$fluxfx-vfx`。使用技能 ZIP 时，把解压出来的整个 `fluxfx-vfx` 文件夹放进项目的 `.agents/skills/`。[Codex 技能文档](https://learn.chatgpt.com/docs/build-skills)

## 在 Claude Code 中使用

把整个 `fluxfx-vfx` 文件夹放进 FluxFX 项目的 `.claude/skills/`，在项目根目录启动 Claude Code，然后输入 `/fluxfx-vfx` 并附上任务。也可放进 `~/.claude/skills/` 供本机多个项目使用。[Claude Code 技能文档](https://code.claude.com/docs/en/skills)

在已有 FluxFX 源码项目里，PowerShell 可这样复制项目自带版本。

```powershell
New-Item -ItemType Directory -Force .claude/skills | Out-Null
Copy-Item -Recurse -LiteralPath .agents/skills/fluxfx-vfx -Destination .claude/skills/
```

## 在其他 AI 中使用

支持 Agent Skills 的工具可按该工具的安装方式导入整个文件夹。也可以直接给能读代码的 AI 提供 FluxFX 项目访问，并指明 `fluxfx-vfx/SKILL.md` 的位置，请它先读取入口，再按需读取引用文件。脚本、参考和模板通过相对路径引用，分享时保留目录结构。[Agent Skills 规范](https://agentskills.io/specification)

## 可直接使用的提示词

在 Codex CLI 中保留 `$fluxfx-vfx`。在 Claude Code 中将它替换成 `/fluxfx-vfx`。

制作新效果时，可以复制完整版模板，填入动作节拍、材质像素规则、分层和验收时点。全程像素风涵盖烟、尘、雾与最后的余效。[复制像素特效提示词模板](../.agents/skills/fluxfx-vfx/references/prompt-template.md)

```text
$fluxfx-vfx 用 FluxFX 做一招青色剑弧。锚点在武器尖端，持续 0.7 秒。
刀光要从角色后方扫到前方，结尾留下点状残影。新增独立版本并接入工作台，给出峰值和淡出帧。
```

```text
$fluxfx-vfx 制作 320×180、2.4 秒的全屏陨星大招。
蓄力时压暗场景，保留角色亮度。释放后有斜向耀斑、落点冲击波和余烬。
给出 release 和 impact 时间标记、三阶段预览、默认与精简画质。
```

```text
$fluxfx-vfx 把日冕爆发以 30 FPS、种子 23 导出成分层精灵图和 JSON。
每帧 320×180，锚点 (160, 125)，输出到 exports/solar。保留可直接叠加的光照层。
```

描述特效时，优先给出用途、锚点、持续时间、最重要的画面节拍和交付格式。全屏效果加上逻辑视口和角色如何与画面叠放。需要验证性能时，再给出目标设备、并发数量或帧预算。

## 如何验收 AI 的交付

- 在输出中找特效 ID、代表时间和测试结果。内置效果可启动 `npm start`，通过 `http://127.0.0.1:4180/?effect=<ID>` 直接查看。工作台的标准视口为 160 × 112，全屏效果要对照目标尺寸的预览。
- 核对蓄力、释放和收尾，再开关前层、后层与光照，检查剪辑、遮挡和辉光。在原尺寸与整数倍最近邻放大下复查峰值和收尾。爆炸余烟可单独关闭光照并查看后层，确认边缘的台阶、明暗块和缺口。
- 需要自己复测时，在项目根目录运行检查器。示例会导出一个按时间排列的预览拼图。

```sh
node .agents/skills/fluxfx-vfx/scripts/check-effect.mjs comboStrike --preview ./fx-review.png
npm test
```

技能内置 `Ember Wake` 局部冲击与 `Meteor Curtain` 全屏演出两套代码模板，可复制到 FluxFX 源码根目录修改。使用检查器的 `--module` 选项可直接验证模板或自定义模块。[技能入口](../.agents/skills/fluxfx-vfx/SKILL.md) · [验收说明](../.agents/skills/fluxfx-vfx/references/verification.md)
