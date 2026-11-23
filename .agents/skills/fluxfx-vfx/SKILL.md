---
name: fluxfx-vfx
description: Create, adapt, integrate, export, or validate code-drawn 2D pixel effects in FluxFX Original. Use for FluxFX requests involving slashes, impacts, particles, spell auras, beam or light effects, fullscreen ultimates, or layered sprite-sheet export. 像素特效、刀光、爆炸、全屏大招。
---

# FluxFX VFX

Turn an effect brief into a deterministic effect that plays through FluxFX, or deliver the narrower change or export the user asked for. Locate the FluxFX project by the `fluxfx-original` package and `index.js`. A workspace can contain an outer folder with the same name. For a consuming game, inspect its existing FluxFX integration and use the installed `fluxfx-original` public entry point.

Target FluxFX Original 0.2.x or a compatible runtime. Use Node.js 20+ for the source project's checks and file exports.

Use the [pixel VFX prompt template](references/prompt-template.md) when writing or refining a brief. For every generated effect, enforce the pixel-art checks below across the full timeline.

## Choose the path

- **Use or vary an effect.** Search `effects.js` and its relevant implementation first. Reuse settings or combine existing effects with `sequence()` when that meets the brief. Put game-specific variants in the game unless repository integration was requested.
- **Author a local effect.** Read [recipes](references/recipes.md) for the matching pattern and adapt [Ember Wake](assets/ember-wake.js) if useful. Copy templates into the FluxFX source root before using their relative imports, or change those imports to the installed package entry point.
- **Author a fullscreen or staged effect.** Read the fullscreen notes in [recipes](references/recipes.md), then adapt [Meteor Curtain](assets/meteor-curtain.js) if useful. Use `showcase.js` for a layered action with timeline events and `lab-effects.js` for dense light and quality tiers.
- **Export, review or optimize.** Read the relevant part of [verification](references/verification.md). Use the existing FluxFX workbench, CLI and CPU benchmark. The bundled checker also works on an unregistered effect module.

## Preserve the runtime contract

- Effects define `duration` in seconds, `loop`, and `build(random, settings)`. `build` returns a painter `(surface, time, context)`. Time is local; `(0, 0)` is the effect anchor, `x` points right, and `y` points down. Keep geometry in logical pixels.
- Generate seeded variation using the supplied `random` during `build`. Render from time plus that built data. Use `createSimulation()` for states that must evolve and `sequence()` or keyframes for staged timing. Drawing the same time twice must reproduce the same result, including after a backward seek.
- Use `context.back` for pixels behind actors and `surface` for foreground pixels. `addLight()` and `glow()` use the frame's additive light channel with `renderLayers()`. `halo()` does ordinary alpha compositing. A frame composites background, back, actor, front, then light. Diagnose glows over the intended background.
- Author distinct visual beats with one readable focal point per beat. Place the strongest light at the release or impact and let the silhouette read during buildup and fade. For dense effects, choose fixed particle and sample counts and provide a lower-quality setting when it serves the target scene.
- Use timeline events for game-side cues such as sound, shake and hit-stop. Verify events with forward `update()` and `drainEvents()`. Keep preview scrubbing and rendering free of game-side effects.

## Preserve the pixel-art style

- Work on the native logical grid and preview with nearest-neighbor integer scaling. Design material silhouettes from stepped edges, coherent pixel clusters, and a compact shade ramp. Apply the same baseline to ambient particles, smoke, and the last visible frames. Use circles or ellipses for intentional shapes such as rings, moon discs, and sigils, with pixel-grid contours.
- Smoke, dust, and mist need asymmetrical clusters, offset lobes, and irregular patches of shade. Fade clusters through fringe gaps, breakup, and opacity. Redraw stacks of smooth or concentric ellipse puffs using clusters. In the source project, `drawPixelSmoke` in `pixel-smoke.js` is an example.
- Establish the silhouette and material with the light layer disabled. Use additive glow locally around an energy source, a hot edge, or the brightest beat. Review both the peak and a late material-only frame at 1× and integer 2× or 3×. Fix the visible style before exporting.

## Integrate and verify

For a new built-in effect, make it reachable from `effects.js`. Include `title`, `english`, and a representative `previewTime` for the catalog. Update named exports in `index.js` and `index.d.ts` when adding that public API. Add a README entry when the project keeps a built-in catalog. Use the existing studio URL `/?effect=<id>`.

Run `npm test` in the source project, then check the effect at the intended viewport, including its peak and fade. Use [verification](references/verification.md) for checker, export, layer, loop and performance commands. Inspect rendered images or the workbench before making a claim about how the art looks. Report the effect ID, phase times and verification actually performed. Provide a preview or the requested export when that is part of the deliverable.
