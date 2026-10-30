const TAU = Math.PI * 2;
const seed = index => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value); };

// Sample identity and random geometry never change during scrolling. Prepare
// them once; each frame only rotates/scales the field, without allocating a
// target array or recalculating seeded geometry for every particle.
export function createParticleField(kind, count) {
  const points = Array.from({ length: count }, (_, index) => {
    const t = Math.floor(index / 3) / Math.ceil(count / 3);
    const ringCount = Math.floor(count * .18);
    const vertical = 1 - (index - ringCount + .5) / (count - ringCount) * 2;
    const angle = (index - ringCount + .5) * 2.3999632297;
    const broadcast = Math.floor(index / 7) / Math.ceil(count / 7) * TAU + index % 7 * .3;
    return {
      t, strand: index % 3, cos: Math.cos(t * Math.PI * 7), sin: Math.sin(t * Math.PI * 7),
      qcos: Math.cos(Math.round(t * 22) / 22 * Math.PI * 7), qsin: Math.sin(Math.round(t * 22) / 22 * Math.PI * 7), noise: seed(index + 4) * 2 - 1,
      y: vertical, radial: Math.sqrt(Math.max(0, 1 - vertical * vertical)), cosOrbit: Math.cos(angle), sinOrbit: Math.sin(angle),
      cosRing: Math.cos(index / Math.max(1, ringCount) * TAU), sinRing: Math.sin(index / Math.max(1, ringCount) * TAU),
      cosBroadcast: Math.cos(broadcast), sinBroadcast: Math.sin(broadcast),
      networkT: Math.floor(index / 9) / Math.ceil(count / 9),
      level: Math.floor(index / 48) / Math.max(1, Math.ceil(count / 48) - 1),
    };
  });
  const tops = Array.from({ length: 12 }, (_, index) => .28 + seed(index + 98) * .58);
  const nodeX = new Float64Array(9), nodeY = new Float64Array(9), towers = new Float64Array(12);
  const ages = new Float64Array(7);
  let width, height, radius, cx, cy, rotationCos, rotationSin, ringCos, ringSin, pulseTime;
  return {
    begin(time, w, h) {
      width = w; height = h; cx = w / 2; cy = h / 2; radius = Math.min(w * .30, h * .39);
      const speed = kind === 'helix' ? 1.45 : kind === 'network' ? .24 : .42;
      rotationCos = Math.cos(time * speed); rotationSin = Math.sin(time * speed); pulseTime = time * 3;
      if (kind === 'network') for (let i = 0; i < 9; i++) { const angle = i / 9 * TAU + time * .24; nodeX[i] = Math.cos(angle); nodeY[i] = Math.sin(angle); }
      if (kind === 'towers') for (let i = 0; i < 12; i++) towers[i] = tops[i] * .86 * (.94 + .06 * Math.sin(time * 1.8 + i));
      if (kind === 'broadcast') for (let i = 0; i < 7; i++) ages[i] = (time * .15 + i / 7) % 1;
      if (kind === 'orbit') { ringCos = Math.cos(time * .45); ringSin = Math.sin(time * .45); }
    },
    sample(index, out) {
      const p = points[index];
      let x, y, opacity, size, accent;
      if (kind === 'helix') {
        const cos = p.cos * rotationCos - p.sin * rotationSin, sin = p.sin * rotationCos + p.cos * rotationSin;
        const depth = p.strand === 1 ? -sin : sin;
        x = p.strand === 2 ? (p.qcos * rotationCos - p.qsin * rotationSin) * p.noise : p.strand === 1 ? -cos : cos;
        x = cx + x * radius * .85; y = height * (.09 + p.t * .82);
        opacity = p.strand === 2 ? .45 : .55 + .4 * (depth + 1) / 2; size = 1.4 + Math.max(0, depth) * .8; accent = p.strand === 1;
      } else if (kind === 'towers') {
        const column = index % 12, col = column % 4, row = Math.floor(column / 4), side = Math.floor(index / 12) % 4;
        x = width * (.13 + col * .23 + row * .015) + (side < 2 ? -1 : 1) * width * .045;
        y = height * (.91 - row * .05 - p.level * towers[column]) + (side % 2 ? -height * .025 : 0);
        opacity = .45 + row * .15 + p.level * .12; accent = p.level > .9; size = accent ? 2.1 : 1.5;
      } else if (kind === 'broadcast') {
        const ring = index % 7, age = ages[ring], r = 8 + age * Math.max(width, height) * .66;
        x = cx + p.cosBroadcast * r; y = cy + p.sinBroadcast * r * .65;
        opacity = .9 * (1 - age); size = 1.5 + (1 - age) * .9; accent = ring % 2 === 0;
      } else if (kind === 'network') {
        const edge = index % 9, other = (edge + 4) % 9, t = p.networkT;
        const pulse = .75 + .25 * Math.sin(t * TAU * 3 - pulseTime);
        x = cx + (nodeX[edge] * (1 - t) + nodeX[other] * t) * radius;
        y = cy + (nodeY[edge] * (1 - t) + nodeY[other] * t) * radius;
        opacity = .35 + .55 * pulse; size = 1.3 + pulse * .7; accent = edge % 3 === 0;
      } else if (index < Math.floor(count * .18)) {
        // The orbital ring has a slightly different rotation speed.
        const cos = p.cosRing * ringCos - p.sinRing * ringSin, sin = p.sinRing * ringCos + p.cosRing * ringSin;
        const rx = cos * radius * 1.5, ry = sin * radius * .28;
        x = cx + rx * .95 + ry * .31; y = cy - rx * .31 + ry * .95; opacity = .95; size = 1.7; accent = true;
      } else {
        const horizontal = p.radial * (p.cosOrbit * rotationCos - p.sinOrbit * rotationSin);
        const depth = p.radial * (p.sinOrbit * rotationCos + p.cosOrbit * rotationSin), projection = 1 / (1.25 - depth * .25);
        x = cx + horizontal * radius * projection; y = cy + p.y * radius * projection;
        opacity = .28 + .65 * (depth + 1) / 2; size = 1.2 + (depth + 1) * .4; accent = false;
      }
      out[0] = x; out[1] = y; out[2] = opacity; out[3] = size; out[4] = accent;
      return out;
    },
  };
}
