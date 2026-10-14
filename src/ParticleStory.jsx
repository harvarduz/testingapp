import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Orbit, Pause, Play, Sparkles } from 'lucide-react';
import './particle-story.css';

const views = [{ id: 'curio', label: 'Curio', Icon: Sparkles }, { id: 'orbit', label: 'Connections', Icon: Orbit }, { id: 'book', label: 'Discovery', Icon: BookOpen }];
const clamp = value => Math.max(0, Math.min(1, value));

export default function ParticleStory({ onExplore }) {
  const stage = useRef(null);
  const canvas = useRef(null);
  const engine = useRef(null);
  const [view, setView] = useState('curio');
  const [paused, setPaused] = useState(false);
  const [following, setFollowing] = useState(true);
  const [supported, setSupported] = useState(true);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const host = stage.current;
    const surface = canvas.current;
    let context;
    try { context = surface.getContext('2d'); } catch { setSupported(false); return; }
    if (!context) { setSupported(false); return; }
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const canObserve = 'IntersectionObserver' in window;
    setReduced(preference.matches || !canObserve);
    let visible = false, stopped = false, destroyed = false, manual = false;
    let frame = null, resizeFrame = null, width = 1, height = 1, angle = 0, lastPaint = 0, current = 'curio';
    let dots = [], glyph = [], colours = [];
    const pointer = { x: -1000, y: -1000 };
    const staticMode = () => preference.matches || !canObserve;
    const animated = () => !staticMode() && !stopped && visible && !document.hidden;
    const target = (dot, index) => {
      if (current === 'curio') return glyph[index % glyph.length];
      const radius = Math.min(width * .37, height * .36);
      if (current === 'orbit') {
        if (index % 5 === 0) {
          const t = index / dots.length * Math.PI * 10 + angle * .35;
          const x = Math.cos(t) * radius * 1.4, y = Math.sin(t) * radius * .30;
          return [width / 2 + x * .94 - y * -.34, height / 2 + x * -.34 + y * .94, .9];
        }
        const latitude = Math.acos(1 - 2 * (index + .5) / dots.length);
        const longitude = index * 2.3999632297 + angle;
        const z = Math.sin(latitude) * Math.sin(longitude);
        return [width / 2 + Math.sin(latitude) * Math.cos(longitude) * radius, height / 2 + Math.cos(latitude) * radius * .94 + z * radius * .12, .35 + (z + 1) * .30];
      }
      // Six gently curved lines on each page make an open book from points.
      if (index % 5 === 0) {
        const edge = Math.floor(index / 5) % 4;
        const along = Math.floor(index / 20) / Math.max(1, Math.floor(dots.length / 20) - 1);
        return [width / 2 + [-.375, -.035, .035, .375][edge] * width, height * (.24 + along * .492), .95];
      }
      const line = index % 14, side = line < 7 ? -1 : 1;
      const row = line % 7, position = Math.floor(index / 14) / Math.max(1, Math.floor(dots.length / 14) - 1);
      const bend = Math.sin(position * Math.PI) * height * .05;
      return [width / 2 + side * (width * .035 + position * width * .34), height * (.24 + row * .082) - bend, .85];
    };
    const paint = (snap = false) => {
      context.clearRect(0, 0, width, height);
      const moving = animated() && !snap;
      let settling = false;
      dots.forEach((dot, index) => {
        const [x, y, opacity = 1] = target(dot, index);
        if (!moving) { dot.x = x; dot.y = y; dot.vx = dot.vy = 0; }
        else {
          dot.vx = (dot.vx + (x - dot.x) * .032) * .77;
          dot.vy = (dot.vy + (y - dot.y) * .032) * .77;
          const dx = dot.x - pointer.x, dy = dot.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 0 && distance < 75) {
            const force = (1 - distance / 75) * 3;
            dot.vx += dx / distance * force; dot.vy += dy / distance * force;
          }
          dot.x += dot.vx; dot.y += dot.vy;
          settling ||= Math.abs(x - dot.x) + Math.abs(y - dot.y) > .15 || Math.abs(dot.vx) + Math.abs(dot.vy) > .05;
        }
        context.globalAlpha = opacity;
        context.fillStyle = colours[index % 9 === 0 ? 1 : 0];
        const size = width < 400 ? 1.8 : 2.1;
        context.fillRect(dot.x - size / 2, dot.y - size / 2, size, size);
      });
      context.globalAlpha = 1;
      return settling;
    };
    const tick = stamp => {
      frame = null;
      if (!animated()) return;
      if (stamp - lastPaint >= 32) {
        angle += Math.min(stamp - lastPaint, 50) * .00012;
        lastPaint = stamp;
        const settling = paint();
        if (current !== 'orbit' && !settling) return;
      }
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      host.dataset.particleMotion = staticMode() ? 'reduced' : stopped ? 'paused' : visible && !document.hidden ? 'active' : 'offscreen';
      if (animated()) { if (frame === null) { lastPaint = performance.now(); frame = requestAnimationFrame(tick); } }
      else { cancelAnimationFrame(frame); frame = null; }
    };
    const measure = () => {
      if (destroyed) return;
      resizeFrame = null;
      width = host.clientWidth; height = host.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const style = getComputedStyle(host);
      colours = [style.getPropertyValue('--md-sys-color-on-primary-container').trim(), style.getPropertyValue('--md-sys-color-primary').trim()];
      const mask = document.createElement('canvas'); mask.width = Math.max(1, width); mask.height = Math.max(1, height);
      const ink = mask.getContext('2d');
      if (!ink) { setSupported(false); return; }
      ink.font = `600 ${width * .23}px ${style.getPropertyValue('--heading') || 'sans-serif'}`;
      ink.textAlign = 'center'; ink.textBaseline = 'middle'; ink.fillText('curio.', width / 2, height / 2);
      const pixels = ink.getImageData(0, 0, mask.width, mask.height).data;
      const samples = [];
      for (let y = 0; y < mask.height; y += 3) for (let x = 0; x < mask.width; x += 3) if (pixels[(y * mask.width + x) * 4 + 3] > 128) samples.push([x, y, 1]);
      if (!samples.length) return;
      const count = width < 450 ? 480 : 900;
      glyph = Array.from({ length: count }, (_, index) => samples[Math.floor(index * samples.length / count)]);
      dots = Array.from({ length: count }, (_, index) => dots[index] || { x: width * ((index * .6180339) % 1), y: height * ((index * .4142135) % 1), vx: 0, vy: 0 });
      host.dataset.canvasReady = 'true'; host.dataset.particleCount = String(count);
      paint(true); schedule();
    };
    const resize = () => { if (resizeFrame === null) resizeFrame = requestAnimationFrame(measure); };
    const choose = (next, explicit = false) => {
      manual ||= explicit;
      if (explicit) setFollowing(false);
      if (current === next) return;
      current = next; setView(next);
      if (!animated()) paint(true);
      schedule();
    };
    const scroll = () => {
      if (manual || staticMode() || stopped || !visible) return;
      const bounds = host.getBoundingClientRect();
      const headerBottom = document.querySelector('.landing-header')?.getBoundingClientRect().bottom || 0;
      // Morph while the whole drawing is visible, rather than waiting until
      // its upper half has disappeared beneath the sticky header.
      const travel = Math.max(1, innerHeight - headerBottom - bounds.height);
      const progress = clamp((innerHeight - bounds.bottom) / travel);
      choose(progress < .3 ? 'curio' : progress < .65 ? 'orbit' : 'book');
    };
    const move = event => {
      if (event.pointerType === 'touch' || !animated()) return;
      const bounds = host.getBoundingClientRect(); pointer.x = event.clientX - bounds.left; pointer.y = event.clientY - bounds.top;
      schedule();
    };
    const leave = () => { pointer.x = pointer.y = -1000; schedule(); };
    const preferenceChanged = () => { setReduced(staticMode()); leave(); if (staticMode()) paint(true); schedule(); };
    const appearance = new MutationObserver(resize);
    // Palette changes update CSS variables even when the display mode is unchanged.
    appearance.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style'] });
    const observer = canObserve ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; if (!visible) leave(); scroll(); schedule();
    }) : null;
    measure(); observer?.observe(host);
    document.fonts?.ready.then(() => { if (!destroyed) measure(); });
    host.addEventListener('pointermove', move, { passive: true }); host.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', schedule); preference.addEventListener('change', preferenceChanged);
    engine.current = {
      choose,
      follow() { manual = false; setFollowing(true); scroll(); schedule(); },
      pause(value) { stopped = value; leave(); if (!value) scroll(); schedule(); },
    };
    return () => {
      destroyed = true; cancelAnimationFrame(frame); cancelAnimationFrame(resizeFrame); observer?.disconnect(); appearance.disconnect();
      host.removeEventListener('pointermove', move); host.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', schedule); preference.removeEventListener('change', preferenceChanged);
      engine.current = null;
    };
  }, []);

  return <section className="landing-particle-story" aria-labelledby="particle-story-title">
    <div className="landing-container particle-story-layout">
      <div className="particle-story-copy"><span className="landing-kicker">FOLLOW YOUR CURIOSITY</span><h2 id="particle-story-title">Small ideas.<br />A bigger picture.</h2><p>Start with a question. Follow the connections. See what you can figure out.</p><button className="landing-button landing-button-dark" onClick={onExplore}>Explore a subject<ArrowRight size={17} /></button></div>
      <figure className="particle-story-figure"><div className="particle-story-stage" ref={stage} data-view={view}><span className="particle-story-fallback" aria-hidden="true">curio.</span><canvas ref={canvas} aria-hidden="true" /></div><figcaption>{!supported ? 'A little curiosity can open a bigger picture.' : reduced ? 'Choose a view to explore the shapes. Motion is reduced.' : paused ? 'Animation paused. You can still choose a view.' : following ? 'Scroll to reshape the dots, or choose a view. Move your pointer through them.' : 'Your selected view stays in place. Follow scroll to see the story again.'}</figcaption>{supported && <div className="particle-story-controls"><div role="group" aria-label="Particle views">{views.map(({ id, label, Icon }) => <button key={id} aria-pressed={view === id} onClick={() => engine.current?.choose(id, true)}><Icon size={17} />{label}</button>)}</div>{reduced ? <span className="particle-motion-note">Motion reduced</span> : <><button className="particle-motion-control" onClick={() => { setPaused(value => !value); engine.current?.pause(!paused); }}>{paused ? <Play size={17} /> : <Pause size={17} />}{paused ? 'Play animation' : 'Pause animation'}</button>{!following && <button className="particle-motion-control" onClick={() => { setPaused(false); engine.current?.pause(false); engine.current?.follow(); }}>Follow scroll</button>}</>}</div>}</figure>
    </div>
  </section>;
}
