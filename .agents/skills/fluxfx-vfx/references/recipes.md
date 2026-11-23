# FluxFX recipes

## Pick a matching implementation

| Brief | Start with | Design choice |
| --- | --- | --- |
| Slash, dash or weapon trail | `combat-effects.js`, `drawRibbon()` | Taper the ends, move the leading edge quickly, retain a brief trace, and split an orbit behind and in front of the actor. |
| Impact, explosion or icy burst | `cinderBurst`, `frostburst`, `createParticleEmitter()`, `createShockwave()` | Separate onset flash, expansion, and settling. Preview the impact on a ground anchor. Use ballistic trajectories for debris and save stateful simulation for interactions that need it. |
| Smoke, dust, mist | `fireburstShot`, `drawPixelSmoke()` in `pixel-smoke.js` | Form the plume from asymmetrical, shaded clusters. Vary their width, height, drift, and fringe breakup. Build the color layer with `Surface.span()` on the logical grid. |
| Aura, orbiting magic or status | `healingAura`, `lantern` | Derive movement from normalized phase and seeded offsets, and match the first and last phase for a loop. Keep the actor silhouette visible between back and front. |
| Beam, portal or heavy lighting | `prismArray`, `gravityCollapse`, `solarEruption` | Build a readable opaque or translucent core, then add localized light. Inspect additive light separately from the colored silhouette. Scale down light samples and fine particles for a low-quality tier. |
| Weather, ambient dust or continuous sparks | `dandelion` for lightweight trajectories | Stagger seeded lifetimes and wrap phase per particle. Use a fixed active budget and preserve the loop seam. |
| UI burst or screen transition | `sequence()`, `keyframes()` | Use screen coordinates, pace the shape by interaction timing, and keep the relevant text or icon readable. |
| Multi-stage attack | `comboStrike` in `showcase.js` | Combine reusable cues by time. Coordinate weapon position with the attack animation, and emit named markers for external game action. |

The source API and more integration examples are in `docs/development.md` at the FluxFX root. Use `index.d.ts` to check argument shapes when targeting an installed version.

## Local effects

Choose the actual anchor before drawing. Local objects may use actor feet, weapon tip, projectile center or impact point. An `anchor(time)` callback returns a world-space pose. With this callback, playback `x` and `y` are local offsets relative to the anchor. Keep authored `bounds` large enough for the shape, particles and light at their greatest extent when using rotation, mirroring or scaling. Bounds can be omitted when the extent is still being worked out.

`context.countParticles(n)` counts the particles reported by your effect. `createParticleEmitter()` reports its active particles when given `context`. Active counts can include off-screen particles.

Use an explicit palette with a dim body, intermediate color, and selective white or near-white accents. Sample trails and curves at predictable counts. When providing a low-quality setting, first reduce expensive broad glows, fine particles or mesh subdivisions while retaining the timing and main shape.

## Fullscreen ultimates

1. Agree on the game's logical viewport and how presentation scales it. `320 × 180` is a useful landscape starting point. The stock workbench uses `160 × 112`, so use a viewport-sized `PixelPlayer`, the game stage, or dimensioned exporter to judge framing. Set an explicit anchor, conventionally the screen center for a screen-space effect. Keep the screen-space overlay on an independent player or render it with zero camera offset.
2. Sketch the beats in seconds, for example buildup → release → recovery. Make the release readable as a still frame. Restore screen brightness and clear the last visible trace by the end of a one-shot. Put viewport dimming into the back layer if the actor should retain its original brightness. Use the front layer for intentional foreground wipes or silhouettes.
3. Use a separate world-space cast or synchronized `anchor(time)` for the character attachment. Listen for the ultimate's `impact`, `camera`, or `sound` marker in the host game if those cues are requested. Scrubbing the visual should remain side-effect free.
4. Preview the target background and actor staging, then check supported aspect ratios. Use the intended logical resolution for the CPU budget. Multiple overlapping lights and full-viewport filters have a different cost from local effects.

[Meteor Curtain](../assets/meteor-curtain.js) combines a viewport-sized dimmer, a sweeping beam, an additive flare, a composited impact ring and three markers. Its default framing is `320 × 180` with an anchor of `(160, 90)`. Its back-layer dimmer reads the actual viewport, so the template renders when checked on other sizes too.
