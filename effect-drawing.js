export function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

export function smooth(start, end, time) {
  const phase = clamp((time - start) / (end - start));
  return phase * phase * (3 - 2 * phase);
}

export function trace(surface, points, color, opacity, offsetX = 0, offsetY = 0) {
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    surface.line(x0 + offsetX, y0 + offsetY, x1 + offsetX, y1 + offsetY, color, opacity);
  }
}

export function groundArc(surface, radius, angle, sweep, color, opacity, y = 0) {
  if (opacity <= 0) return;
  const steps = Math.ceil(radius * sweep / 3);
  let x0 = Math.cos(angle) * radius;
  let y0 = y + Math.sin(angle) * radius * 0.23;
  for (let i = 1; i <= steps; i++) {
    const bearing = angle + sweep * i / steps;
    const x = Math.cos(bearing) * radius;
    const nextY = y + Math.sin(bearing) * radius * 0.23;
    surface.line(x0, y0, x, nextY, color, opacity);
    x0 = x;
    y0 = nextY;
  }
}

export function glint(surface, x, y, size, color, opacity) {
  if (opacity <= 0) return;
  surface.line(x - size, y, x + size, y, color, opacity * 0.7);
  surface.line(x, y - size, x, y + size, color, opacity);
}
