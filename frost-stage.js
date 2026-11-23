export const frostStage = { width: 320, height: 180, x: 188, y: 117, actorX: -90, actorY: 11 };

/** Static stage used to judge the effect over a real background and separate character pixels. */
export function drawFrostBackdrop(surface) {
  for (let y = 0; y < 180; y++) {
    const horizon = y < 91 ? y / 91 : (180 - y) / 89;
    const r = Math.round(16 + 10 * horizon), g = Math.round(24 + 13 * horizon), b = Math.round(40 + 18 * horizon);
    surface.span(y, 0, 319, r << 16 | g << 8 | b);
  }

  surface.polygon([[0, 95], [0, 55], [30, 52], [53, 72], [77, 70], [108, 86], [130, 77],
    [169, 91], [209, 89], [254, 65], [282, 71], [319, 47], [319, 98]], 0x172334);
  surface.span(93, 0, 319, 0x2b4157);
  surface.span(95, 0, 319, 0x1a283c);

  for (const [x, width, top, hue] of [[13, 27, 14, 0x23364c], [67, 14, 33, 0x26384d],
    [252, 15, 29, 0x25384e], [301, 26, 8, 0x213349]]) {
    surface.polygon([[x - 4, 97], [x - 3, top + 9], [x + width * 0.55, top],
      [x + width, top + 8], [x + width, 95]], hue);
    surface.polygon([[x - 4, 97], [x - 3, top + 9], [x + width * 0.27, top + 5], [x + width * 0.26, 95]], 0x142135);
    surface.line(x + width - 1, top + 9, x + width - 1, 95, 0x324961);
    for (let y = top + 15; y < 92; y += 11) surface.span(y, x + 1, x + width - 1, 0x182940, 0.74);
    surface.span(96, x - 8, x + width + 4, 0x3a4d62);
    surface.span(98, x - 8, x + width + 4, 0x141f31);
  }

  for (const [start, stop] of [[32, 78], [255, 318]]) {
    const mid = (start + stop) * 0.5;
    surface.line(start, 35, mid, 9, 0x2a3d54, 0.68);
    surface.line(mid, 9, stop, 37, 0x2a3d54, 0.68);
    surface.line(start + 5, 37, mid, 15, 0x17273c, 0.72);
    surface.line(mid, 15, stop - 5, 39, 0x17273c, 0.72);
  }

  for (const y of [101, 110, 123, 140, 160, 179]) {
    surface.span(y, 0, 319, 0x162339, 0.88);
    surface.span(y + 1, 0, 319, 0x344960, 0.52);
  }
  for (const x of [-85, -28, 27, 92, 153, 216, 278, 335, 392]) {
    const near = 159 + (x - 159) * 0.37;
    surface.line(near, 97, x, 179, 0x18283c, 0.9);
    surface.line(near + 1, 97, x + 1, 179, 0x354a62, 0.37);
  }
  for (let i = 0; i < 97; i++) {
    const x = (i * 103 + i * i * 19) % 320, y = 105 + ((i * 47 + i * i * 7) % 74);
    surface.dot(x, y, i % 5 ? 0x26364c : 0x456177, 0.66);
  }
}
