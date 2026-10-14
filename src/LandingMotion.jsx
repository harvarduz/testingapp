import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Sigma } from 'lucide-react';
import './landing-motion.css';

const clamp = value => Math.max(0, Math.min(1, value));

export function useLandingMotion(root) {
  useEffect(() => {
    const element = root.current;
    const readingTrack = element.querySelector('.landing-reading-progress');
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    let frame;
    const updateProgress = () => {
      frame = null;
      const distance = document.documentElement.scrollHeight - innerHeight;
      readingTrack.style.transform = `scaleX(${distance > 0 ? clamp(scrollY / distance) : 0})`;
    };
    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(updateProgress);
    };
    const reveal = target => { target.dataset.revealed = 'true'; observer?.unobserve(target); };
    const configure = () => {
      observer?.disconnect();
      const enabled = !preference.matches && 'IntersectionObserver' in window;
      element.dataset.motion = enabled ? 'enabled' : 'reduced';
      if (!enabled) {
        element.querySelectorAll('[data-reveal]').forEach(reveal);
        return;
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
      }, { threshold: .12, rootMargin: '0px 0px -20px 0px' });
      element.querySelectorAll('[data-reveal]:not([data-revealed])').forEach(target => observer.observe(target));
    };
    const focus = event => {
      const target = event.target.closest('[data-reveal]');
      if (target) reveal(target);
    };
    configure();
    updateProgress();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    element.addEventListener('focusin', focus);
    preference.addEventListener('change', configure);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
      element.removeEventListener('focusin', focus);
      preference.removeEventListener('change', configure);
    };
  }, [root]);
}

// A scroll position is the animation clock. No elapsed-time counter or
// transition can keep a number moving after the reader stops scrolling.
const ease = progress => progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
const compactQuery = '(max-height: 460px), (max-width: 800px) and (max-height: 640px)';
const needsStaticScene = (query = compactQuery) => matchMedia('(prefers-reduced-motion: reduce)').matches
  || matchMedia(query).matches || !('IntersectionObserver' in window);

function useScrollScene(scene, stage, render, query = compactQuery) {
  const [still, setStill] = useState(() => needsStaticScene(query));
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia(query);
    const changed = () => setStill(needsStaticScene(query));
    preference.addEventListener('change', changed);
    compact.addEventListener('change', changed);
    return () => { preference.removeEventListener('change', changed); compact.removeEventListener('change', changed); };
  }, [query]);
  useEffect(() => {
    if (still) { render(1); return; }
    let frame;
    let active = false;
    let previous = -1;
    const update = () => {
      frame = null;
      if (document.hidden) return;
      const bounds = scene.current.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(stage.current).top) || 0;
      const distance = Math.max(1, bounds.height - stage.current.offsetHeight);
      const progress = clamp((top - bounds.top) / distance);
      if (Math.abs(progress - previous) < .0001) return;
      previous = progress;
      render(progress);
    };
    const schedule = () => { if (active && !frame && !document.hidden) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => {
      active = entries[0].isIntersecting;
      if (active) schedule();
      else {
        cancelAnimationFrame(frame); frame = null;
        // Settle a scene left by a fast scroll or an anchor jump.
        update();
      }
    }, { rootMargin: '10% 0px 10% 0px' });
    update(); observer.observe(scene.current);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [scene, stage, render, still]);
  return still;
}

export function ScrollCatalog({ courseCount, lessonCount, subjectCount }) {
  const scene = useRef(null);
  const stage = useRef(null);
  const metrics = useRef([]);
  const totals = useMemo(() => [courseCount, lessonCount, subjectCount], [courseCount, lessonCount, subjectCount]);
  const render = useCallback(progress => {
    metrics.current.forEach((metric, index) => {
      if (!metric) return;
      const local = ease(clamp((progress - index * .06) / (1 - index * .06)));
      const value = String(Math.round(totals[index] * local));
      if (metric.number.textContent !== value) metric.number.textContent = value;
      metric.fill.style.strokeDashoffset = String(1 - local);
      const angle = local * Math.PI * 2 - Math.PI / 2;
      metric.knob.setAttribute('cx', String(60 + 52 * Math.cos(angle)));
      metric.knob.setAttribute('cy', String(60 + 52 * Math.sin(angle)));
    });
  }, [totals]);
  const still = useScrollScene(scene, stage, render);
  const showTotals = () => {
    if (still) return;
    const bounds = scene.current.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage.current).top) || 0;
    window.scrollTo({ top: scrollY + bounds.top - top + bounds.height - stage.current.offsetHeight, behavior: 'instant' });
    render(1);
  };
  return <section className={`landing-catalog-scene ${still ? 'is-static' : ''}`} ref={scene} aria-label="The Curio course library">
    <div className="landing-facts-wrap landing-catalog-stage" ref={stage}>
      <div className="landing-container landing-facts">
        <p>Big subjects.<br /><strong>A manageable place to start.</strong><span className="landing-catalog-cue"><ArrowDown size={16} />{still ? 'Explore at your own pace' : 'Scroll to explore the numbers'}</span></p>
        {totals.map((total, index) => <div className="landing-catalog-metric" key={index} ref={element => {
          metrics.current[index] = element ? {
            number: element.querySelector('[data-scroll-value]'),
            fill: element.querySelector('.landing-catalog-fill'),
            knob: element.querySelector('.landing-catalog-knob'),
          } : null;
        }}>
          <div className="landing-catalog-dial">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className="landing-catalog-track" cx="60" cy="60" r="52" />
              <circle className="landing-catalog-fill" cx="60" cy="60" r="52" pathLength="1" strokeDasharray="1" />
              <circle className="landing-catalog-knob" cx="60" cy="8" r="4" />
            </svg>
            <div className="landing-catalog-counter"><strong className="landing-scroll-number"><span data-scroll-value aria-hidden="true">{total}</span><span className="sr-only">{total}</span></strong><span className="landing-catalog-total" aria-hidden="true">of {total}</span></div>
          </div>
          <span>{['courses to explore', 'hands-on lessons', 'subjects to discover'][index]}</span>
        </div>)}
      </div>
      <div className="landing-catalog-actions">{!still && <button className="landing-catalog-continue" onClick={showTotals}>Show all totals<ArrowDown size={16} /></button>}<a className="landing-catalog-continue" href="#how-it-works">Continue to how it works<ArrowRight size={16} /></a></div>
    </div>
  </section>;
}

const skills = [
  { title: 'Fractions', value: '4/8 = 1/2', description: 'Identify equal parts and describe how much of a whole you have.', example: 'Four shaded pieces out of eight represent one half.', lesson: 1, button: 'Try the fractions lesson' },
  { title: 'Percentages', value: '1/2 = 50%', description: 'Write the same proportion out of 100 and use it to calculate a discount.', example: 'One half of a quantity is the same as 50% of it.', lesson: 2, button: 'Try the percentages lesson' },
  { title: 'Unit prices', value: '$8 ÷ 5 = $1.60', description: 'Use a shared unit to compare different quantities and make a practical choice.', example: 'A pack of five apples for $8 costs $1.60 per apple.', lesson: 4, button: 'Try the unit-price lesson' },
];

export function ScrollSkills({ onOpenLesson }) {
  const scene = useRef(null);
  const stage = useRef(null);
  const map = useRef(null);
  const [active, setActive] = useState(0);
  const lastActive = useRef(-1);
  const render = useCallback(progress => {
    const element = map.current;
    if (!element) return;
    const nodes = element.querySelectorAll('.landing-skill-node');
    let connected = 0;
    element.querySelectorAll('.landing-skill-connection').forEach((connection, index) => {
      const local = ease(clamp(progress * 3 - index));
      connection.style.strokeDashoffset = String(1 - local);
      nodes[index].dataset.connected = String(local >= .98);
      if (local >= .98) connected++;
    });
    const number = element.querySelector('[data-skill-count]');
    if (number.textContent !== String(connected)) number.textContent = String(connected);
    const next = Math.min(2, Math.floor(progress * 3));
    if (next !== lastActive.current) { lastActive.current = next; setActive(next); }
  }, []);
  const still = useScrollScene(scene, stage, render, '(max-height: 700px), (max-width: 800px) and (max-height: 820px), (max-width: 350px) and (max-height: 920px)');
  const choose = index => {
    lastActive.current = index; setActive(index);
    if (still) return;
    const bounds = scene.current.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage.current).top) || 0;
    const distance = bounds.height - stage.current.offsetHeight;
    window.scrollTo({ top: scrollY + bounds.top - top + distance * [.30, .63, 1][index], behavior: 'instant' });
  };
  const current = skills[active];
  return <section className={`landing-section landing-container landing-skills-scene ${still ? 'is-static' : ''}`} ref={scene} aria-labelledby="landing-skills-title">
    <div className="landing-skills-stage" ref={stage}>
      <div className="landing-skills-copy">
        <span className="landing-kicker">BUILD KNOWLEDGE. MAKE CONNECTIONS.</span>
        <h2 id="landing-skills-title">One idea.<br /> More ways to use it.</h2>
        <p>Knowledge becomes useful when you connect it to a new problem. Follow three related skills, then put one to work in a lesson.</p>
        <div className="landing-skills-choices" role="group" aria-label="Explore connected skills">{skills.map((skill, index) => <button key={skill.title} aria-pressed={active === index} aria-controls="landing-skill-explanation" onClick={() => choose(index)}>{skill.title}</button>)}</div>
        <div id="landing-skill-explanation" className="landing-skill-explanation"><h3>{current.title}</h3><p>{current.description}</p></div>
        <button className="landing-button landing-button-dark" onClick={() => onOpenLesson(current.lesson)}>{current.button}<ArrowRight size={17} /></button>
      </div>
      <figure className="landing-skill-map" ref={map} aria-labelledby="landing-skill-map-caption">
        <svg viewBox="0 0 560 400" preserveAspectRatio="none" aria-hidden="true">
          {['M 166 200 C 224 200 207 67 274 67', 'M 166 200 L 274 200', 'M 166 200 C 224 200 207 333 274 333'].map(path => <React.Fragment key={path}><path className="landing-skill-route" d={path} /><path className="landing-skill-connection" d={path} pathLength="1" strokeDasharray="1" /></React.Fragment>)}
        </svg>
        <div className="landing-skill-core" aria-hidden="true"><Sigma size={22} /><strong data-skill-count>3</strong><span>ideas connected</span></div>
        <span className="sr-only">Three connected ideas</span>
        {skills.map(skill => <section className="landing-skill-node" key={skill.title}><h3>{skill.title}</h3><strong>{skill.value}</strong><p>{skill.example}</p></section>)}
        <figcaption id="landing-skill-map-caption">An example learning path · {still ? 'Choose a skill above' : 'Scroll to connect the ideas'}</figcaption>
      </figure>
    </div>
  </section>;
}
