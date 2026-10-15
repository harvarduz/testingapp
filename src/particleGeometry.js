const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

// A repeatable ordering makes resize and reduced-motion renders stable while
// distributing each part of a word across the entire next shape.
function shuffle(points, seed) {
  let state = seed >>> 0;
  for (let index = points.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const other = (state >>> 0) % (index + 1);
    [points[index], points[other]] = [points[other], points[index]];
  }
  return points;
}

export function createParticleGeometry(width, height, count) {
  const w = Math.max(1, Math.round(Number(width) || 1));
  const h = Math.max(1, Math.round(Number(height) || 1));
  const mobile = w < 900;
  const total = Math.max(1, Math.round(Number(count) || (mobile ? 1200 : 1800)));
  const mask = document.createElement('canvas');
  mask.width = w;
  mask.height = h;
  const ink = mask.getContext('2d', { willReadFrequently: true });
  if (!ink) throw new Error('Particle lettering needs a 2D canvas context.');

  const textArea = {
    top: Math.max(80, h * (mobile ? .035 : .045)),
    bottom: Math.max(170, h * (mobile ? .40 : .62)),
    width: w * (mobile ? .86 : .80),
  };

  const lettering = (lines, seed) => {
    ink.clearRect(0, 0, w, h);
    ink.textAlign = 'left';
    ink.textBaseline = 'alphabetic';
    ink.font = '400 100px Georgia, "Times New Roman", serif';
    const measured = lines.map(line => ink.measureText(line));
    const widest = Math.max(...measured.map(metric => Math.max(metric.width, metric.actualBoundingBoxLeft + metric.actualBoundingBoxRight)));
    const ascent = Math.max(...measured.map(metric => metric.actualBoundingBoxAscent || 75)) / 100;
    const descent = Math.max(...measured.map(metric => metric.actualBoundingBoxDescent || 20)) / 100;
    const lineHeight = .96;
    const inkHeight = ascent + descent + lineHeight * (lines.length - 1);
    const fontSize = Math.min(textArea.width / (widest / 100), (textArea.bottom - textArea.top) / inkHeight);
    const baseline = textArea.top + ((textArea.bottom - textArea.top) - inkHeight * fontSize) / 2 + ascent * fontSize;
    ink.font = `400 ${fontSize}px Georgia, "Times New Roman", serif`;
    ink.fillStyle = '#000';
    lines.forEach((line, index) => {
      const metric = ink.measureText(line);
      // Center the visible glyphs, including the serif overhangs.
      const left = metric.actualBoundingBoxLeft || 0;
      const right = metric.actualBoundingBoxRight || metric.width;
      ink.fillText(line, w / 2 + (left - right) / 2, baseline + index * fontSize * lineHeight);
    });

    const pixels = ink.getImageData(0, 0, w, h).data;
    let area = 0, left = w, right = 0, top = h, bottom = 0;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (pixels[(y * w + x) * 4 + 3] <= 128) continue;
        area += 1;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (!area) {
      const center = [w / 2, (textArea.top + textArea.bottom) / 2, 1];
      return { points: Array.from({ length: total }, () => [...center]), bounds: { left: center[0], right: center[0], top: center[1], bottom: center[1] } };
    }

    // Sample a spatial grid instead of taking every nth raster pixel: thin
    // stems and curves then retain the same spacing as the broader strokes.
    let step = Math.sqrt(area / (total * 1.06));
    let samples = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      samples = [];
      for (let y = top + step / 2; y <= bottom; y += step) {
        for (let x = left + step / 2; x <= right; x += step) {
          if (pixels[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 128) samples.push([x, y, 1]);
        }
      }
      if (samples.length >= total) break;
      step *= Math.sqrt(Math.max(1, samples.length) / (total * 1.06));
    }
    shuffle(samples, seed);
    const points = Array.from({ length: total }, (_, index) => {
      const point = samples[index % samples.length];
      return point ? [...point] : [w / 2, (top + bottom) / 2, 1];
    });
    return { points, bounds: { left, top, right: right + 1, bottom: bottom + 1 } };
  };

  const word = lettering(['Curio'], 31627);
  const phrase = lettering(['Stay', 'curious.'], 73943);
  const ringCount = Math.max(1, Math.floor(total * .2));
  const sphereCount = Math.max(1, total - ringCount);
  const centerX = w * (mobile ? .5 : .735);
  const centerY = h * (mobile ? .29 : .46);
  const radius = Math.min(w * (mobile ? .36 : .20), h * (mobile ? .21 : .30));
  const ringTilt = -.32;

  // Time is in seconds; pointer coordinates are normalized to [-1, 1].
  const orbit = (index, time = 0, pointer = {}) => {
    const nx = clamp(Number(pointer?.nx) || 0, -1, 1);
    const ny = clamp(Number(pointer?.ny) || 0, -1, 1);
    if (index < ringCount) {
      const angle = index / ringCount * TAU + time * .20;
      const x = Math.cos(angle) * radius * 1.38;
      const y = Math.sin(angle) * radius * .30;
      return [centerX + x * Math.cos(ringTilt) - y * Math.sin(ringTilt), centerY + x * Math.sin(ringTilt) + y * Math.cos(ringTilt), .95, 1.85, true];
    }
    const offset = index - ringCount + .5;
    const vertical = 1 - 2 * offset / sphereCount;
    const horizontal = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const longitude = offset * GOLDEN_ANGLE + time * .18 + nx * .35;
    const x = horizontal * Math.cos(longitude);
    const z = horizontal * Math.sin(longitude);
    const tilt = .24 + ny * .24;
    const y = vertical * Math.cos(tilt) - z * Math.sin(tilt);
    const depth = vertical * Math.sin(tilt) + z * Math.cos(tilt);
    const perspective = 1 / (1.25 - depth * .25);
    return [centerX + x * radius * perspective, centerY + y * radius * perspective, .28 + .68 * (depth + 1) / 2, 1.25 + .65 * (depth + 1) / 2, false];
  };

  return { word: word.points, phrase: phrase.points, wordBounds: word.bounds, phraseBounds: phrase.bounds, orbit };
}
