// Integrate in display-frame units, with bounded substeps after a slow frame.
// This keeps spring response consistent at 30/60/120 Hz and after tab changes.
export function advanceParticle(dot, x, y, pointer, waves, elapsed = 1) {
  const dt = Math.min(Math.max(elapsed, 0), 3);
  const steps = Math.max(1, Math.ceil(dt)), step = dt / steps;
  for (let index = 0; index < steps; index += 1) {
    let ax = (x - dot.x) * .045, ay = (y - dot.y) * .045;
    const dx = dot.x - pointer.x, dy = dot.y - pointer.y, distance = Math.hypot(dx, dy);
    if (distance > .01 && distance < 120) {
      const force = (1 - distance / 120) * 5;
      ax += dx / distance * force; ay += dy / distance * force;
    }
    for (const wave of waves) {
      const wx = dot.x - wave.x, wy = dot.y - wave.y, radius = Math.hypot(wx, wy);
      if (radius > .01 && Math.abs(radius - wave.radius) < 26) {
        ax += wx / radius * 10; ay += wy / radius * 10;
      }
    }
    const damping = Math.pow(.84, step);
    dot.vx = (dot.vx + ax * step) * damping; dot.vy = (dot.vy + ay * step) * damping;
    dot.x += dot.vx * step; dot.y += dot.vy * step;
  }
}

const TAU = Math.PI * 2;
const seed = index => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

export function effectTarget(kind, index, count, time, width, height) {
  const cx = width / 2, cy = height / 2, radius = Math.min(width * .30, height * .39);
  if (kind === 'helix') {
    const strand = index % 3, t = Math.floor(index / 3) / Math.ceil(count / 3);
    const angle = t * Math.PI * 7 + time * 1.45;
    const depth = Math.sin(angle + (strand === 1 ? Math.PI : 0));
    const x = strand === 2 ? Math.cos(Math.round(t * 22) / 22 * Math.PI * 7 + time * 1.45) * (seed(index + 4) * 2 - 1) : Math.cos(angle + strand * Math.PI);
    return [cx + x * radius * .85, height * (.09 + t * .82), strand === 2 ? .45 : .55 + .4 * (depth + 1) / 2, 1.4 + Math.max(0, depth) * .8, strand === 1];
  }
  if (kind === 'towers') {
    const column = index % 12, col = column % 4, row = Math.floor(column / 4);
    const side = Math.floor(index / 12) % 4;
    const level = Math.floor(index / 48) / Math.max(1, Math.ceil(count / 48) - 1);
    const top = .28 + seed(column + 98) * .58;
    const half = width * .045, roof = level > .9;
    const x = width * (.13 + col * .23 + row * .015) + (side < 2 ? -half : half);
    const y = height * (.91 - row * .05 - level * top * .86 * (.94 + .06 * Math.sin(time * 1.8 + column))) + (side % 2 ? -height * .025 : 0);
    return [x, y, .45 + row * .15 + level * .12, roof ? 2.1 : 1.5, roof];
  }
  if (kind === 'broadcast') {
    const ring = index % 7, age = (time * .15 + ring / 7) % 1;
    const angle = Math.floor(index / 7) / Math.ceil(count / 7) * TAU + ring * .3;
    const r = 8 + age * Math.max(width, height) * .66;
    return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * .65, .9 * (1 - age), 1.5 + (1 - age) * .9, ring % 2 === 0];
  }
  if (kind === 'network') {
    const nodes = 9, edge = index % nodes, t = Math.floor(index / nodes) / Math.ceil(count / nodes);
    const a = edge / nodes * TAU + time * .24, b = ((edge + 4) % nodes) / nodes * TAU + time * .24;
    const pulse = .75 + .25 * Math.sin(t * TAU * 3 - time * 3);
    return [cx + (Math.cos(a) * (1 - t) + Math.cos(b) * t) * radius, cy + (Math.sin(a) * (1 - t) + Math.sin(b) * t) * radius, .35 + .55 * pulse, 1.3 + pulse * .7, edge % 3 === 0];
  }
  // A projected sphere with a tilted orbital ring.
  const ringCount = Math.floor(count * .18);
  if (index < ringCount) {
    const angle = index / ringCount * TAU + time * .45, x = Math.cos(angle) * radius * 1.5, y = Math.sin(angle) * radius * .28;
    return [cx + x * .95 + y * .31, cy - x * .31 + y * .95, .95, 1.7, true];
  }
  const point = index - ringCount + .5, y = 1 - point / (count - ringCount) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y)), angle = point * 2.3999632297 + time * .42;
  const z = r * Math.sin(angle), projection = 1 / (1.25 - z * .25);
  return [cx + r * Math.cos(angle) * radius * projection, cy + y * radius * projection, .28 + .65 * (z + 1) / 2, 1.2 + (z + 1) * .4, false];
}
