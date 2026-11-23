// Disjoint fringe cells and stepped shading give each puff a readable silhouette at 1×.
const glyphs = [
  [
    '........+11',
    '.....+++12221',
    '....112222221',
    '..+11222111111+',
    '.11122211111111',
    '1122211111000011',
    '.11111110000001',
    '.+111100000001',
    '...110000001.+',
    '.....+00..+',
  ],
  [
    '...+111.+',
    '..1122211.+',
    '.122222211111+',
    '112211111122211',
    '111111111222111',
    '.11100111111101',
    '..1100001100010+',
    '...+0000000010',
    '.......++010',
  ],
  [
    '..........+11',
    '.......+112221',
    '.....+122222211.+',
    '....1122211111111',
    '..+1111111110001',
    '.111221111000001',
    '112211110000000+',
    '.11111000001',
    '...+1000000',
    '......++',
  ],
  [
    '......+11...+',
    '.....112211221+',
    '...+11222222211',
    '..1122111111111',
    '.122221111100001',
    '1111111110000001',
    '.11100111000000+',
    '..+00000000+0',
    '...+...+',
  ],
];

const stencils = glyphs.map(rows => {
  const width = Math.max(...rows.map(row => row.length));
  const spans = rows.map(row => {
    const out = [];
    for (let x = 0; x < row.length;) {
      const symbol = row[x], left = x++;
      while (x < row.length && row[x] === symbol) x++;
      if (symbol !== '.') out.push({ left, right: x, shade: symbol === '+' ? 3 : Number(symbol) });
    }
    return out;
  });
  return { width, spans };
});
const shadeOpacity = [0.86, 1, 0.84, 0.42];

/** Draw a shaded smoke or dust cluster from a three-color ramp, ordered dark to light. */
export function drawPixelSmoke(surface, x, y, { rx, ry, colors, opacity, age, variant = 0, shear = 0, gaps = [] }) {
  if (opacity <= 0.006 || rx <= 0 || ry <= 0) return;
  const selection = Math.abs(Math.floor(variant));
  const { width, spans } = stencils[selection % stencils.length];
  const flip = (Math.floor(selection / stencils.length) & 1) !== 0;
  const w = Math.max(1, Math.round(rx * 2)), h = Math.max(1, Math.round(ry * 2));
  const left = Math.round(x - w * 0.5), top = Math.round(y - h * 0.5);
  const rowCount = spans.length;
  for (const [row, runs] of spans.entries()) {
    const y0 = top + Math.round(row * h / rowCount), y1 = top + Math.round((row + 1) * h / rowCount);
    const slant = Math.round(shear * (0.5 - row / rowCount));
    for (const run of runs) {
      const { shade } = run;
      const fringe = shade === 3;
      if (fringe && age > 0.56 + ((row * 7 + run.left * 3 + selection) % 9) * 0.036) continue;
      const start = flip ? width - run.right : run.left, end = flip ? width - run.left : run.right;
      const x0 = left + slant + Math.round(start * w / width);
      const x1 = left + slant + Math.round(end * w / width) - 1;
      if (x1 < x0) continue;
      const color = colors[fringe ? 0 : shade], alpha = opacity * shadeOpacity[shade];
      for (let py = y0; py < y1; py++) {
        let start = x0;
        for (const hole of gaps) {
          if (py < hole.top || py > hole.bottom || hole.right < start || hole.left > x1) continue;
          surface.span(py, start, hole.left - 1, color, alpha);
          start = hole.right + 1;
        }
        if (start <= x1) surface.span(py, start, x1, color, alpha);
      }
    }
  }
}
