import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Pause, Play, RefreshCw, WandSparkles } from 'lucide-react';
import { createParticleGeometry } from './particleGeometry.js';
import { advanceParticle } from './particleMotion.js';
import './particle-story.css';

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => value * value * (3 - 2 * value);
const views = [{ id: 'curio', label: 'Curio' }, { id: 'orbit', label: 'Connections' }];

export default function ParticleStory({ onExplore, paused = false, onPauseChange }) {
  const root = useRef(null), stage = useRef(null), canvas = useRef(null), engine = useRef(null);
  const [view, setView] = useState('curio');
  const setPaused = onPauseChange;
  const [following, setFollowing] = useState(true);
  const [supported, setSupported] = useState(true);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const section = root.current, host = stage.current, surface = canvas.current;
    let context;
    try { context = surface.getContext('2d'); } catch { setSupported(false); return; }
    if (!context) { setSupported(false); return; }
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const canObserve = 'IntersectionObserver' in window;
    let visible = !canObserve, stopped = false, destroyed = false, manual = null, hovered = false;
    let frame = null, resizeFrame = null, lastPaint = 0, time = 0, width = 1, height = 1, blend = 0, progress = 0;
    let current = 'curio', geometry, dots = [], waves = [], clearance = [], touchStart = null;
    const pointer = { x: -1000, y: -1000, nx: 0, ny: 0 };
    const staticMode = () => preference.matches || !canObserve;
    const animated = () => !staticMode() && !stopped && visible && !document.hidden;
    const updateView = next => { if (next !== current) { current = next; setView(next); } };
    const target = index => {
      const letter = (current === 'phrase' ? geometry.phrase : geometry.word)[index];
      const size = width < 900 ? 1.4 : 2.1;
      if (!blend) return [...letter, size, index % 23 === 0];
      const orbit = geometry.orbit(index, time, pointer);
      return [letter[0] + (orbit[0] - letter[0]) * blend, letter[1] + (orbit[1] - letter[1]) * blend, 1 + (orbit[2] - 1) * blend, size + (orbit[3] - size) * blend, orbit[4]];
    };
    const paint = (snap = false, step = 1) => {
      if (!geometry) return false;
      context.clearRect(0, 0, width, height);
      let settling = false;
      const moving = animated() && !snap;
      dots.forEach((dot, index) => {
        const [x, y, opacity, baseSize, accent] = target(index);
        if (!moving) { dot.x = x; dot.y = y; dot.vx = dot.vy = 0; }
        else {
          advanceParticle(dot, x, y, pointer, waves, step);
          settling ||= Math.abs(x - dot.x) + Math.abs(y - dot.y) > .2 || Math.abs(dot.vx) + Math.abs(dot.vy) > .06;
        }
        const speed = Math.hypot(dot.vx, dot.vy);
        // Keep decorative ink clear of real text during every intermediate
        // scroll frame, including manual shapes and narrow viewports.
        let visibility = 1;
        for (const rect of clearance) {
          const distance = Math.max(rect.left - dot.x, dot.x - rect.right, rect.top - dot.y, dot.y - rect.bottom);
          visibility = Math.min(visibility, smooth(clamp(distance / 24)));
        }
        context.globalAlpha = opacity * visibility;
        context.fillStyle = speed > 2 || accent ? '#8fb4ff' : '#f5f6fa';
        const size = baseSize + Math.min(speed / 7, 1) * 2;
        context.fillRect(dot.x - size / 2, dot.y - size / 2, size, size);
      });
      context.globalAlpha = 1;
      return settling;
    };
    const tick = stamp => {
      frame = null;
      if (!animated()) return;
      const elapsed = Math.min(stamp - lastPaint, 50);
      lastPaint = stamp; time += elapsed / 1000;
      waves = waves.filter(wave => (wave.radius += elapsed * .96) < Math.max(width, height) * 1.2);
      if (!paint(false, elapsed / 16.6667) && blend === 0 && !waves.length) return;
      frame = requestAnimationFrame(tick);
    };
    const schedule = () => {
      host.dataset.particleMotion = staticMode() ? 'reduced' : stopped ? 'paused' : visible && !document.hidden ? 'active' : 'offscreen';
      if (animated()) {
        if (frame === null) { lastPaint = performance.now(); frame = requestAnimationFrame(tick); }
      } else { cancelAnimationFrame(frame); frame = null; }
    };
    const select = () => {
      blend = manual ? (manual === 'orbit' ? 1 : 0) : staticMode() ? 0 : smooth(clamp((progress - .10) / .62));
      updateView(manual || (blend > .36 ? 'orbit' : hovered ? 'phrase' : 'curio'));
      if (!animated() && !stopped) paint(true);
      schedule();
    };
    const scroll = () => {
      const bounds = section.getBoundingClientRect();
      const stageBounds = host.getBoundingClientRect();
      clearance = [...section.querySelectorAll('[data-particle-clearance]')].map(node => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left - stageBounds.left - 8, right: rect.right - stageBounds.left + 8, top: rect.top - stageBounds.top - 8, bottom: rect.bottom - stageBounds.top + 8 };
      });
      const header = document.querySelector('.landing-header')?.getBoundingClientRect().bottom || 0;
      progress = clamp((header - bounds.top) / Math.max(1, section.offsetHeight - host.offsetHeight));
      section.dataset.scrollProgress = progress.toFixed(4);
      if (!stopped) select();
    };
    const measure = () => {
      if (destroyed) return;
      resizeFrame = null;
      width = host.clientWidth; height = host.clientHeight;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      try { geometry = createParticleGeometry(width, height, width < 900 ? 1200 : 1800); }
      catch { setSupported(false); return; }
      dots = geometry.word.map(([x, y]) => ({ x, y, vx: 0, vy: 0 }));
      host.dataset.canvasReady = 'true'; host.dataset.particleCount = String(dots.length);
      scroll(); paint(true); schedule();
    };
    const resize = () => { if (resizeFrame === null) resizeFrame = requestAnimationFrame(measure); };
    const isControl = event => event.target.closest('button, a, input');
    const position = event => {
      const bounds = host.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const insideLettering = ({ x, y }) => {
      const a = geometry.wordBounds, b = geometry.phraseBounds;
      return x >= Math.min(a.left, b.left) - 20 && x <= Math.max(a.right, b.right) + 20 && y >= Math.min(a.top, b.top) - 20 && y <= Math.max(a.bottom, b.bottom) + 20;
    };
    const move = event => {
      if (event.pointerType === 'touch' || !animated() || !geometry) return;
      const point = position(event);
      const inArt = !isControl(event) && point.y >= 0 && point.y < height;
      pointer.x = inArt ? point.x : -1000; pointer.y = inArt ? point.y : -1000;
      pointer.nx = inArt ? point.x / width * 2 - 1 : 0; pointer.ny = inArt ? point.y / height * 2 - 1 : 0;
      const next = inArt && insideLettering(point);
      if (hovered !== next) { hovered = next; select(); }
      schedule();
    };
    const leave = () => { pointer.x = pointer.y = -1000; pointer.nx = pointer.ny = 0; hovered = false; if (!stopped) select(); };
    const down = event => { if (!isControl(event)) touchStart = { ...position(event), stamp: performance.now(), id: event.pointerId }; };
    const up = event => {
      if (!touchStart || touchStart.id !== event.pointerId || isControl(event) || !geometry) return;
      const point = position(event), tap = performance.now() - touchStart.stamp < 600 && Math.hypot(point.x - touchStart.x, point.y - touchStart.y) < 12;
      touchStart = null;
      if (!tap || !animated()) return;
      if (event.pointerType === 'touch' && blend === 0 && insideLettering(point)) { hovered = !hovered; select(); }
      waves.push({ ...point, radius: 0 }); waves = waves.slice(-3); schedule();
    };
    const changedPreference = () => { setReduced(staticMode()); hovered = false; waves = []; select(); paint(true); };
    const observer = canObserve ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) { pointer.x = pointer.y = -1000; hovered = false; }
      scroll(); schedule();
    }) : null;
    setReduced(staticMode()); measure(); observer?.observe(host);
    document.fonts?.ready.then(() => { if (!destroyed) scroll(); });
    section.addEventListener('pointermove', move, { passive: true }); section.addEventListener('pointerleave', leave);
    section.addEventListener('pointerdown', down, { passive: true }); section.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', schedule); preference.addEventListener('change', changedPreference);
    engine.current = {
      refresh: scroll,
      choose(next) { manual = next; hovered = false; setFollowing(false); select(); if (stopped) paint(true); },
      transform() { this.choose(current === 'phrase' ? 'curio' : 'phrase'); },
      follow() { manual = null; hovered = false; setFollowing(true); scroll(); },
      pause(value) { stopped = value; pointer.x = pointer.y = -1000; waves = []; if (!value) scroll(); schedule(); },
    };
    return () => {
      destroyed = true; cancelAnimationFrame(frame); cancelAnimationFrame(resizeFrame); observer?.disconnect();
      section.removeEventListener('pointermove', move); section.removeEventListener('pointerleave', leave);
      section.removeEventListener('pointerdown', down); section.removeEventListener('pointerup', up);
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', schedule); preference.removeEventListener('change', changedPreference);
      engine.current = null;
    };
  }, []);

  useEffect(() => { engine.current?.refresh(); }, [view, following, reduced]);
  useEffect(() => { engine.current?.pause(paused); }, [paused]);

  return <section className="landing-particle-story" data-particle-supported={supported} ref={root} aria-labelledby="landing-title">
    <figure className="particle-story-figure particle-story-stage" ref={stage} data-view={view}>
      <span className="particle-story-fallback" aria-hidden="true">Curio</span>
      <canvas ref={canvas} aria-hidden="true" />
      {supported && <div className="particle-story-controls" data-particle-clearance>
        <div role="group" aria-label="Particle views">{views.map(({ id, label }) => <button key={id} aria-pressed={view === id} onClick={() => engine.current?.choose(id)}>{label}</button>)}</div>
        <button className="particle-icon-control" aria-label="Transform lettering" title="Transform lettering" aria-pressed={view === 'phrase'} onClick={() => engine.current?.transform()}><WandSparkles size={18} /></button>
        {reduced ? <span className="particle-motion-note">Motion reduced</span> : <button className="particle-icon-control" aria-label={paused ? 'Play animation' : 'Pause animation'} title={paused ? 'Play animation' : 'Pause animation'} onClick={() => { setPaused(!paused); engine.current?.pause(!paused); }}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>}
        {!following && <button className="particle-follow-control" aria-label="Follow scroll" title="Follow scroll" onClick={() => { setPaused(false); engine.current?.pause(false); engine.current?.follow(); }}><RefreshCw size={15} /><span>Follow scroll</span></button>}
      </div>}
      <figcaption>{!supported ? 'A little curiosity can open a bigger picture.' : reduced ? 'Choose a view to explore the shapes. Motion is reduced.' : paused ? 'Animation paused. You can still choose a view.' : following ? 'Move over the lettering. On touch screens, tap it. Scroll to connect the dots.' : 'Your selected view stays in place. Follow scroll to see the story again.'}</figcaption>
    </figure>
    <div className="particle-story-panel landing-hero landing-container">
      <div className="landing-hero-copy" data-particle-clearance>
        <h1 id="landing-title">Learn it.<br /><span>Make it yours.</span></h1>
        <p>Math, science, language, and life. Short, hands-on lessons that turn a good question into real understanding.</p>
        <div className="landing-hero-actions">
          <button className="landing-button landing-button-dark" onClick={onExplore}>Find your first course<ArrowRight size={18} /></button>
          <a className="landing-try-link" href="#try-a-lesson">Try a little lesson<ArrowUpRight size={17} /></a>
        </div>
        <span className="landing-hero-note">Free to explore. No account required.</span>
      </div>
      <span className="particle-scroll-cue" aria-hidden="true" data-particle-clearance><ArrowDown size={16} />KEEP YOUR CURIOSITY MOVING</span>
    </div>
    <div className="particle-story-panel particle-connections-panel landing-container">
      <div className="particle-story-copy" data-particle-clearance>
        <span className="landing-kicker">ONE IDEA LEADS TO ANOTHER</span>
        <h2 id="particle-story-title">Small ideas.<br />A bigger picture.</h2>
        <p>A fraction becomes a percentage. A percentage helps you compare a price. Build the connections that make knowledge useful.</p>
        <button className="landing-button landing-button-dark" onClick={onExplore}>Explore a subject<ArrowRight size={18} /></button>
      </div>
    </div>
  </section>;
}
