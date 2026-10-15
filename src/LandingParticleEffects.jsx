import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { advanceParticle, effectTarget } from './particleMotion.js';
import './landing-particles.css';

// One transparent surface serves the learning preview, method, course covers,
// publishing section and final invitation. No individual card owns a loop.
export default function LandingParticleEffects({ root, paused, onPauseChange }) {
  const canvas = useRef(null), renderer = useRef(null);
  const [compact, setCompact] = useState(() => matchMedia('(max-width: 899px), (max-height: 540px)').matches);
  const [active, setActive] = useState(false);
  const [control, setControl] = useState(null);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const surface = canvas.current, page = root.current;
    let context;
    try { context = surface.getContext('2d'); } catch { return; }
    if (!context) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let scenes = [], frame = null, layoutFrame = null, destroyed = false, stopped = paused;
    let time = 0, last = 0, width = 1, height = 1, paintCount = 0;
    const pointer = { x: -1000, y: -1000 }, waves = [];
    const obstructionHost = page.parentElement;
    const obscured = () => obstructionHost.hasAttribute('inert');
    let tapStart = null;
    const still = () => preference.matches || !('IntersectionObserver' in window);
    const running = () => !stopped && !still() && !document.hidden && !obscured() && scenes.some(scene => scene.visible);
    const paint = (dt = 0) => {
      context.clearRect(0, 0, width, height);
      const visible = scenes.filter(scene => scene.visible);
      const budget = width < 700 ? 1200 : 1800;
      const count = Math.floor(budget / Math.max(1, visible.length));
      for (const scene of visible) {
        const { node } = scene;
        // Reveal/hover transforms can move a card between scroll events.
        // Follow its actual box so the transparent overlay never drifts.
        const measured = node.getBoundingClientRect();
        const dx = measured.left - scene.box.left, dy = measured.top - scene.box.top;
        if (dx || dy) scene.masks = scene.masks.map(mask => ({ left: mask.left + dx, right: mask.right + dx, top: mask.top + dy, bottom: mask.bottom + dy }));
        const box = scene.box = measured;
        if (scene.dots.length !== count) {
          scene.dots = Array.from({ length: count }, (_, index) => {
            const point = effectTarget(scene.kind, index, count, time, box.width, box.height);
            return { x: point[0], y: point[1], vx: 0, vy: 0 };
          });
        }
        context.save();
        const radius = scene.radius;
        context.beginPath();
        if (context.roundRect) context.roundRect(box.left, box.top, box.width, box.height, radius);
        else context.rect(box.left, box.top, box.width, box.height);
        context.clip();
        // Clear spaces for course level labels and the final call to action.
        const masks = scene.masks;
        const localPointer = { x: pointer.x - box.left, y: pointer.y - box.top };
        const localWaves = waves.map(wave => ({ x: wave.x - box.left, y: wave.y - box.top, radius: wave.radius }));
        for (let index = 0; index < count; index += 1) {
          const target = effectTarget(scene.kind, index, count, still() ? 0 : time, box.width, box.height), dot = scene.dots[index];
          if (dt) advanceParticle(dot, target[0], target[1], localPointer, localWaves, dt);
          else if (still()) { dot.x = target[0]; dot.y = target[1]; dot.vx = dot.vy = 0; }
          const x = box.left + dot.x, y = box.top + dot.y;
          if (masks.some(mask => x > mask.left - 10 && x < mask.right + 10 && y > mask.top - 10 && y < mask.bottom + 10)) continue;
          const speed = Math.min(Math.hypot(dot.vx, dot.vy) / 7, 1);
          context.globalAlpha = Math.min(1, target[2] + speed * .3);
          context.fillStyle = target[4] || speed > .35 ? scene.accent : scene.ink;
          const size = target[3] * (width < 700 ? .9 : 1.1) + speed * 1.8;
          context.fillRect(x - size / 2, y - size / 2, size, size);
        }
        context.restore(); node.dataset.particleReady = 'true';
      }
      context.globalAlpha = 1;
      surface.dataset.paintCount = String(++paintCount);
      surface.dataset.activeScenes = visible.map(scene => scene.kind).join(' ');
      surface.dataset.motion = still() ? 'reduced' : stopped ? 'paused' : obscured() ? 'obscured' : document.hidden || !visible.length ? 'idle' : 'active';
    };
    const tick = stamp => {
      frame = null;
      if (!running()) return;
      const dt = Math.min((stamp - last) / 16.6667, 3); last = stamp; time += dt / 60;
      for (const wave of waves) wave.radius += 16 * dt;
      while (waves.length && waves[0].radius > Math.max(width, height) * 1.2) waves.shift();
      paint(dt); frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (running()) { if (frame === null) { last = performance.now(); frame = requestAnimationFrame(tick); } }
      else { cancelAnimationFrame(frame); frame = null; }
    };
    const layout = () => {
      layoutFrame = null;
      if (destroyed) return;
      const header = page.querySelector('.landing-header')?.getBoundingClientRect().bottom || 0;
      let visible = false;
      for (const scene of scenes) {
        scene.box = scene.node.getBoundingClientRect();
        scene.visible = scene.box.bottom > header + 12 && scene.box.top < height - 12 && scene.box.width > 0;
        if (!scene.visible) continue;
        visible = true;
        const style = getComputedStyle(scene.node);
        scene.radius = parseFloat(style.borderTopLeftRadius) || 0;
        scene.ink = style.getPropertyValue('--particle-ink').trim() || style.color;
        scene.accent = style.getPropertyValue('--particle-accent').trim() || style.color;
        scene.masks = [...scene.node.querySelectorAll('[data-particle-label],h2,p,button,.landing-kicker')].map(node => node.getBoundingClientRect());
      }
      const anchor = scenes.find(scene => scene.visible && scene.box.top >= header && scene.box.height >= 64)
        || scenes.find(scene => scene.visible && scene.box.bottom > header + 64);
      const placement = anchor ? { left: Math.max(12, Math.min(width - 56, anchor.box.right - 52)), top: Math.max(header + 8, Math.min(height - 56, anchor.box.top + 8)) } : null;
      setControl(previous => previous?.left === placement?.left && previous?.top === placement?.top ? previous : placement);
      setReduced(still()); setActive(visible); paint(); schedule();
    };
    const queueLayout = () => { if (layoutFrame === null) layoutFrame = requestAnimationFrame(layout); };
    const scan = () => {
      const nodes = [...page.querySelectorAll('[data-particle-effect]')];
      if (nodes.length === scenes.length && nodes.every((node, index) => node === scenes[index].node)) return;
      const previous = new Map(scenes.map(scene => [scene.node, scene]));
      scenes = nodes.map(node => previous.get(node) || { node, kind: node.dataset.particleEffect, dots: [], visible: false, masks: [] });
      queueLayout();
    };
    const resize = () => {
      setCompact(matchMedia('(max-width: 899px), (max-height: 540px)').matches);
      const widthChanged = width !== innerWidth;
      if (!widthChanged && height === innerHeight) { queueLayout(); return; }
      width = innerWidth; height = innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (widthChanged) for (const scene of scenes) scene.dots = [];
      queueLayout();
    };
    const move = event => { if (event.pointerType !== 'touch' && running()) { pointer.x = event.clientX; pointer.y = event.clientY; } };
    const leave = () => { pointer.x = pointer.y = -1000; };
    const down = event => {
      tapStart = running() && !event.target.closest('button,a,input') && event.target.closest('[data-particle-effect]')
        ? { x: event.clientX, y: event.clientY, id: event.pointerId, stamp: performance.now() } : null;
    };
    const cancelTap = () => { tapStart = null; };
    const pulse = event => {
      const start = tapStart; tapStart = null;
      if (!start || start.id !== event.pointerId || !running() || performance.now() - start.stamp > 600 || Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 12) return;
      waves.push({ x: event.clientX, y: event.clientY, radius: 0 }); if (waves.length > 3) waves.shift();
    };
    const obstruction = new MutationObserver(() => { cancelTap(); leave(); schedule(); surface.dataset.motion = obscured() ? 'obscured' : stopped ? 'paused' : still() ? 'reduced' : 'idle'; });
    obstruction.observe(obstructionHost, { attributes: true, attributeFilter: ['inert'] });
    const preferenceChanged = () => { setReduced(still()); waves.length = 0; leave(); layout(); };
    const visibilityChanged = () => { leave(); if (!document.hidden) queueLayout(); schedule(); };
    const appearance = new MutationObserver(queueLayout);
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const content = new MutationObserver(scan); content.observe(page, { childList: true, subtree: true });
    scan(); resize(); setReduced(still());
    window.addEventListener('scroll', queueLayout, { passive: true }); window.addEventListener('resize', resize);
    page.addEventListener('pointermove', move, { passive: true }); page.addEventListener('pointerleave', leave); page.addEventListener('pointerdown', down, { passive: true }); page.addEventListener('pointerup', pulse, { passive: true }); page.addEventListener('pointercancel', cancelTap);
    document.addEventListener('visibilitychange', visibilityChanged); preference.addEventListener('change', preferenceChanged);
    document.fonts?.ready.then(() => { if (!destroyed) queueLayout(); });
    renderer.current = value => { stopped = value; waves.length = 0; leave(); if (!stopped) schedule(); else { schedule(); surface.dataset.motion = still() ? 'reduced' : 'paused'; } };
    return () => {
      destroyed = true; cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame); appearance.disconnect(); content.disconnect(); obstruction.disconnect();
      for (const scene of scenes) delete scene.node.dataset.particleReady;
      window.removeEventListener('scroll', queueLayout); window.removeEventListener('resize', resize);
      page.removeEventListener('pointermove', move); page.removeEventListener('pointerleave', leave); page.removeEventListener('pointerdown', down); page.removeEventListener('pointerup', pulse); page.removeEventListener('pointercancel', cancelTap);
      document.removeEventListener('visibilitychange', visibilityChanged); preference.removeEventListener('change', preferenceChanged);
      renderer.current = null;
    };
  }, [root]);
  useEffect(() => { renderer.current?.(paused); }, [paused]);
  return <div className="landing-particle-effects">
    <canvas className="landing-effects-canvas" ref={canvas} aria-hidden="true" />
    {active && control && !reduced && !compact && <button className="landing-effects-pause" style={{ left: control.left, top: control.top }} aria-label={paused ? 'Play page animations' : 'Pause page animations'} title={paused ? 'Play page animations' : 'Pause page animations'} onClick={() => onPauseChange(!paused)}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
  </div>;
}
