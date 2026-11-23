# FluxFX verification and output

Run project commands from the FluxFX source root. Resolve the skill's script relative to its `SKILL.md` if you installed it elsewhere.

## Check runtime behavior and generate a review sheet

```sh
npm test
node .agents/skills/fluxfx-vfx/scripts/check-effect.mjs comboStrike --preview ./fx-review.png
node .agents/skills/fluxfx-vfx/scripts/check-effect.mjs --module ./meteor-curtain.js --export meteorCurtain --width 320 --height 180 --x 160 --y 90 --preview ./ultimate-review.png
```

The checker accepts a catalog ID or an ESM module path. With `--module`, omitting `--export` selects its default export. Use `--root` when outside the FluxFX source root. `--width`, `--height`, `--x`, `--y`, `--seed`, `--settings` (JSON object), and `--times` (comma-separated seconds) override defaults. It samples normal layered playback, looks for visible output, compares color, light and composite data after forward and backward seeks, and checks the one-shot boundary or loop wrap. If `--preview` is supplied, the PNG lays the sample frames left to right, then top to bottom. The output lists the times in that order. Use a temporary or user-requested destination for review images.

Inspect the image or actual animation at its intended size. Look for readability at the key beat, accidental clipping, excessive white, lingering pixels, layer order and intended falloff. A deterministic loop can still have a visible seam, so compare frames on both sides of the wrap. Check `light: 0` or the workbench light toggle when investigating a silhouette. Try the light and dark backgrounds for effects intended to be laid over a scene.

For pixel-art review, inspect a peak and a fade frame at 1× and nearest-neighbor 2× or 3×. Turn off additive light and solo the relevant color layer to check stepped silhouettes and grouped shades. For smoke, dust, and mist, select a frame after the main action when the plume is exposed. Look for irregular silhouettes and gaps opening at the fringe. Repeated round puffs and concentric shading require a redraw. The checker verifies runtime and pixels across seeks. The rendered image is the style check.

## Preview and export

- `npm start` serves the catalog at `http://127.0.0.1:4180/`. Select a catalog ID with `?effect=<id>`. If adding a new entry to a running server, refresh the browser to reload the modules.
- `npm run export -- <id> --fps 30 --seed 23 --layers --out <directory>` produces a composite PNG, back/front/light sheets and Aseprite-style JSON. Add `--width 320 --height 180 --origin-x 160 --origin-y 90` for the example fullscreen anchor. Choose foreground and light compositing to suit the destination engine.
- For an effect that belongs only to the consuming game, call `createSpriteSheet(effect, options)` directly. The CLI lists and exports the source project's catalog IDs.

## Measure the workload the user cares about

`npm run bench` profiles the project's established high-light scenes. For a new effect, measure the intended resolution, representative peak frame and relevant concurrent counts with `player.renderLayers().composite(...)`. Run a warmup, collect a sample distribution, and report P95 with resolution, count, quality and timed stages. A CPU render test can be compared with a 16.67 ms frame budget at 60 FPS. The game loop, browser upload and host scene need their own budget. Only extrapolate to tested conditions.
