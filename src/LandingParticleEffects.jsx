import React, { useEffect, useRef } from 'react';
import { createParticleField } from './particleFields.js';
import './landing-particles.css';

// The browser scrolls each surface with its own illustration. One scheduler
// serves visible fields; painting never needs viewport coordinates or layout.
export default function LandingParticleEffects({ root, paused }) {
  const status = useRef(null), renderer = useRef(null);
  useEffect(() => {
    const page = root.current, monitor = status.current, obstructionHost = page.parentElement;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const scenes = new Map();
    let frame = null, layoutFrame = null, last = 0, paints = 0, stopped = paused, destroyed = false, tap = null, hovered = null;
    let viewportWidth = innerWidth, resolution = Math.min(devicePixelRatio || 1, 2);
    const obscured = () => obstructionHost.hasAttribute('inert');
    const still = () => preference.matches || !intersection;
    const active = () => [...scenes.values()].filter(scene => scene.visible && scene.field && !scene.unsupported);
    const running = () => !stopped && !still() && !document.hidden && !obscured() && active().length > 0;
    const report = () => {
      const visible = active();
      monitor.dataset.motion = still() ? 'reduced' : stopped ? 'paused' : obscured() ? 'obscured' : document.hidden || !visible.length ? 'idle' : 'active';
      monitor.dataset.activeScenes = visible.map(scene => scene.kind).join(' ');
      monitor.dataset.paintCount = String(paints);
    };
    const paint = (scene, elapsed = 0) => {
      const { context, surface, width, height, field, pointer, waves } = scene;
      if (!field) return;
      scene.time += elapsed / 1000;
      pointer.strength += (pointer.target - pointer.strength) * Math.min(1, elapsed / 80);
      for (const wave of waves) wave.radius += elapsed * .65;
      while (waves.length && waves[0].radius > Math.max(width, height) * 1.3) waves.shift();
      context.clearRect(0, 0, width, height);
      field.begin(still() ? 0 : scene.time, width, height);
      const out = scene.target;
      for (let index = 0; index < scene.count; index++) {
        field.sample(index, out);
        let x = out[0], y = out[1], energy = 0;
        if (pointer.strength > .01) {
          const dx = x - pointer.x, dy = y - pointer.y, squared = dx * dx + dy * dy;
          if (squared > .01 && squared < 14400) {
            const distance = Math.sqrt(squared), force = 20 * (1 - distance / 120) ** 2 * pointer.strength;
            x += dx / distance * force; y += dy / distance * force; energy = force / 20;
          }
        }
        for (const wave of waves) {
          const dx = x - wave.x, dy = y - wave.y, distance = Math.hypot(dx, dy);
          const edge = Math.abs(distance - wave.radius) / 30;
          if (distance > .01 && edge < 1) {
            const force = (1 + Math.cos(edge * Math.PI)) * 6 * Math.max(0, 1 - wave.radius / Math.max(width, height));
            x += dx / distance * force; y += dy / distance * force; energy = Math.max(energy, force / 12);
          }
        }
        if (scene.masks.some(mask => x > mask.left - 10 && x < mask.right + 10 && y > mask.top - 10 && y < mask.bottom + 10)) continue;
        context.globalAlpha = Math.min(1, out[2] + energy * .2);
        context.fillStyle = out[4] || energy > .35 ? scene.accent : scene.ink;
        const size = out[3] * (viewportWidth < 700 ? .9 : 1.1) + energy;
        context.fillRect(x - size / 2, y - size / 2, size, size);
      }
      context.globalAlpha = 1;
      scene.node.dataset.particleReady = 'true';
      surface.dataset.paintCount = String(++scene.paints);
    };
    const tick = stamp => {
      frame = null;
      if (!running()) { report(); return; }
      const elapsed = Math.max(0, Math.min(stamp - last, 50)); last = stamp;
      for (const scene of active()) paint(scene, elapsed);
      paints++; report(); frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (running()) { if (frame === null) { last = performance.now(); frame = requestAnimationFrame(tick); } }
      else { cancelAnimationFrame(frame); frame = null; }
      report();
    };
    const measure = scene => {
      if (scene.unsupported || !scene.visible) return;
      const width = scene.node.clientWidth, height = scene.node.clientHeight;
      if (!width || !height) return;
      const sizeChanged = scene.width !== width || scene.height !== height;
      if (sizeChanged || scene.ratio !== resolution) {
        scene.width = width; scene.height = height; scene.ratio = resolution;
        scene.surface.width = Math.round(width * resolution); scene.surface.height = Math.round(height * resolution);
        scene.context.setTransform(resolution, 0, 0, resolution, 0, 0);
      }
      if (!scene.field || sizeChanged) {
        // Stable per-field identities avoid reshuffling dots when another
        // card enters the viewport. The area cap bounds mobile paint work.
        scene.count = Math.round(Math.max(320, Math.min(viewportWidth < 700 ? 1000 : 1400, width * height / 100)));
        scene.field = createParticleField(scene.kind, scene.count);
        scene.surface.dataset.particleCount = String(scene.count);
      }
      const box = scene.node.getBoundingClientRect(), style = getComputedStyle(scene.node);
      scene.ink = style.getPropertyValue('--particle-ink').trim() || style.color;
      scene.accent = style.getPropertyValue('--particle-accent').trim() || style.color;
      scene.masks = [...scene.node.querySelectorAll('[data-particle-label],h2,p,button,.landing-kicker')].map(node => {
        const r = node.getBoundingClientRect();
        return { left: r.left - box.left, right: r.right - box.left, top: r.top - box.top, bottom: r.bottom - box.top };
      });
      scene.dirty = false; paint(scene);
    };
    const layout = () => {
      layoutFrame = null;
      if (destroyed || obscured() || document.hidden) return;
      for (const scene of scenes.values()) if (scene.dirty) measure(scene);
      schedule();
    };
    const queueLayout = () => { if (layoutFrame === null && !destroyed) layoutFrame = requestAnimationFrame(layout); };
    const intersection = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      for (const entry of entries) {
        const scene = scenes.get(entry.target);
        if (!scene) continue;
        scene.visible = entry.isIntersecting;
        if (!scene.visible) { scene.pointer.target = scene.pointer.strength = 0; scene.waves.length = 0; }
        else scene.dirty = true;
      }
      queueLayout(); schedule();
    }) : null;
    const sizes = 'ResizeObserver' in window ? new ResizeObserver(entries => {
      for (const entry of entries) { const scene = scenes.get(entry.target); if (scene) scene.dirty = true; }
      queueLayout();
    }) : null;
    const scan = () => {
      const nodes = new Set(page.querySelectorAll('[data-particle-effect]'));
      for (const [node, scene] of scenes) if (!nodes.has(node)) {
        intersection?.unobserve(node); sizes?.unobserve(node); scene.surface?.remove(); delete node.dataset.particleReady; scenes.delete(node);
      }
      for (const node of nodes) {
        const existing = scenes.get(node);
        if (existing) { if (existing.surface && !node.contains(existing.surface)) { node.append(existing.surface); existing.dirty = true; queueLayout(); } continue; }
        const surface = document.createElement('canvas'); surface.className = 'landing-scene-canvas'; surface.setAttribute('aria-hidden', 'true'); surface.width = surface.height = 0;
        let context;
        try { context = surface.getContext('2d'); } catch { /* Keep the original artwork when Canvas is unavailable. */ }
        const scene = { node, surface: context ? surface : null, context, unsupported: !context, kind: node.dataset.particleEffect, visible: !intersection, dirty: true, time: 0, paints: 0, target: new Array(5), masks: [], waves: [], pointer: { x: 0, y: 0, strength: 0, target: 0 } };
        scenes.set(node, scene);
        if (context) node.append(surface);
        intersection?.observe(node); sizes?.observe(node);
      }
      queueLayout();
    };
    const clearInput = () => { tap = null; hovered = null; for (const scene of scenes.values()) { scene.pointer.target = scene.pointer.strength = 0; scene.waves.length = 0; } };
    const sceneFor = event => event.target instanceof Element ? scenes.get(event.target.closest('[data-particle-effect]')) : null;
    const control = event => event.target.closest('button,a,input,textarea,select');
    const move = event => {
      if (event.pointerType === 'touch') return;
      const hit = sceneFor(event), button = control(event);
      const scene = hit && (!button || !hit.node.contains(button)) ? hit : null;
      if (hovered && hovered !== scene) hovered.pointer.target = 0;
      hovered = scene;
      if (scene && running()) { const box = scene.node.getBoundingClientRect(); scene.pointer.x = event.clientX - box.left; scene.pointer.y = event.clientY - box.top; scene.pointer.target = 1; }
    };
    const leave = () => { if (hovered) hovered.pointer.target = 0; hovered = null; };
    const down = event => {
      const scene = !control(event) && sceneFor(event);
      tap = running() && scene ? { scene, x: event.clientX, y: event.clientY, id: event.pointerId, stamp: performance.now() } : null;
    };
    const up = event => {
      const start = tap; tap = null;
      if (!start || !running() || start.id !== event.pointerId || start.scene !== sceneFor(event) || performance.now() - start.stamp > 600 || Math.hypot(start.x - event.clientX, start.y - event.clientY) >= 12) return;
      const box = start.scene.node.getBoundingClientRect();
      start.scene.waves.push({ x: event.clientX - box.left, y: event.clientY - box.top, radius: 0 });
      if (start.scene.waves.length > 3) start.scene.waves.shift();
    };
    const cancel = () => { tap = null; };
    const refresh = () => { for (const scene of scenes.values()) scene.dirty = true; queueLayout(); };
    const resize = () => {
      const ratio = Math.min(devicePixelRatio || 1, 2);
      if (innerWidth === viewportWidth && ratio === resolution) return;
      viewportWidth = innerWidth; resolution = ratio; refresh();
    };
    const appearance = new MutationObserver(refresh); appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const content = new MutationObserver(records => {
      let fieldsChanged = false, labelsChanged = false;
      for (const record of records) {
        const host = record.target instanceof Element ? record.target.closest('[data-particle-effect]') : null;
        const scene = scenes.get(host);
        if (scene) { scene.dirty = true; labelsChanged = true; if (scene.surface && !host.contains(scene.surface)) fieldsChanged = true; }
        for (const node of [...record.addedNodes, ...record.removedNodes]) {
          if (node instanceof Element && (node.matches('[data-particle-effect]') || node.querySelector('[data-particle-effect]'))) fieldsChanged = true;
        }
      }
      if (fieldsChanged) scan();
      if (labelsChanged) queueLayout();
    });
    content.observe(page, { childList: true, subtree: true });
    const obstruction = new MutationObserver(() => { clearInput(); queueLayout(); schedule(); }); obstruction.observe(obstructionHost, { attributes: true, attributeFilter: ['inert'] });
    const visibility = () => { clearInput(); if (!document.hidden) queueLayout(); schedule(); };
    const preferenceChanged = () => { clearInput(); refresh(); schedule(); };
    scan();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', visibility); preference.addEventListener('change', preferenceChanged);
    page.addEventListener('pointermove', move, { passive: true }); page.addEventListener('pointerleave', leave);
    page.addEventListener('pointerdown', down, { passive: true }); page.addEventListener('pointerup', up, { passive: true }); page.addEventListener('pointercancel', cancel);
    document.fonts?.ready.then(() => { if (!destroyed) refresh(); });
    renderer.current = value => { stopped = value; clearInput(); schedule(); };
    return () => {
      destroyed = true; renderer.current = null; cancelAnimationFrame(frame); cancelAnimationFrame(layoutFrame);
      intersection?.disconnect(); sizes?.disconnect(); content.disconnect(); appearance.disconnect(); obstruction.disconnect();
      window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); preference.removeEventListener('change', preferenceChanged);
      page.removeEventListener('pointermove', move); page.removeEventListener('pointerleave', leave); page.removeEventListener('pointerdown', down); page.removeEventListener('pointerup', up); page.removeEventListener('pointercancel', cancel);
      for (const scene of scenes.values()) { scene.surface?.remove(); delete scene.node.dataset.particleReady; }
    };
  }, [root]);
  useEffect(() => { renderer.current?.(paused); }, [paused]);
  return <div className="landing-particle-effects" ref={status} aria-hidden="true" />;
}
