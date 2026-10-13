import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ShoppingBasket } from 'lucide-react';
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

export function ScrollNumber({ value }) {
  const number = useRef(null);
  useEffect(() => {
    const element = number.current;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let observer;
    let started = false;
    const finish = () => { cancelAnimationFrame(frame); element.textContent = value; };
    const start = () => {
      if (started) return;
      started = true;
      const begin = performance.now();
      const tick = time => {
        const progress = clamp((time - begin) / 950);
        element.textContent = Math.round(value * (1 - (1 - progress) ** 3));
        if (progress < 1 && !document.hidden) frame = requestAnimationFrame(tick);
        else finish();
      };
      frame = requestAnimationFrame(tick);
    };
    if (!preference.matches && 'IntersectionObserver' in window) {
      element.textContent = '0';
      observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) start();
        else if (started) { finish(); observer.disconnect(); }
      }, { threshold: .5 });
      observer.observe(element);
    } else finish();
    const preferenceChanged = () => { if (preference.matches) { finish(); observer?.disconnect(); } };
    preference.addEventListener('change', preferenceChanged);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); preference.removeEventListener('change', preferenceChanged); };
  }, [value]);
  return <strong className="landing-scroll-number"><span ref={number} aria-hidden="true" style={{ minWidth: `${String(value).length}ch` }}>{value}</span><span className="sr-only">{value}</span></strong>;
}

const chapters = [
  { label: 'Notice', title: 'A smaller price. A better deal?', text: 'Three apples cost $6. Five cost $8. The cheaper pack has the smaller total, but the packs contain different amounts.', unit: 'Pack price', values: ['$6', '$8'], ratios: [.75, 1], note: 'Total prices alone do not make a fair comparison.' },
  { label: 'Compare', title: 'Give both prices the same unit.', text: 'Divide each price by its apple count. $6 ÷ 3 is $2 per apple. $8 ÷ 5 is $1.60 per apple. Now the comparison means something.', unit: 'Price per apple', values: ['$2.00', '$1.60'], ratios: [1, .8], note: 'One shared unit makes different pack sizes comparable.' },
  { label: 'Apply', title: 'Make a decision you can explain.', text: 'The five-apple pack has a 20% lower price per apple. It is better value if you need the extra apples and can afford the $8 total.', unit: 'Price per apple', values: ['$2.00', '$1.60'], ratios: [1, .8], note: '($2.00 − $1.60) ÷ $2.00 × 100 = 20% lower unit price.' },
];

export function ScrollLearningStory({ onContinue }) {
  const story = useRef(null);
  const stage = useRef(null);
  const [chapter, setChapter] = useState(0);
  const [staticMode, setStaticMode] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(max-height: 700px), (max-width: 800px) and (max-height: 820px)').matches || !('IntersectionObserver' in window));
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-height: 700px), (max-width: 800px) and (max-height: 820px)');
    const changed = () => setStaticMode(preference.matches || compact.matches || !('IntersectionObserver' in window));
    preference.addEventListener('change', changed);
    compact.addEventListener('change', changed);
    return () => { preference.removeEventListener('change', changed); compact.removeEventListener('change', changed); };
  }, []);
  useEffect(() => {
    if (staticMode) return;
    let frame;
    let active = false;
    let lastChapter;
    const track = story.current.querySelector('.landing-story-track > span');
    const update = () => {
      frame = null;
      if (!active || document.hidden) return;
      const bounds = story.current.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(stage.current).top) || 0;
      const travel = Math.max(1, bounds.height - stage.current.offsetHeight);
      const progress = clamp((top - bounds.top) / travel);
      track.style.transform = `scaleX(${progress})`;
      const nextChapter = Math.min(2, Math.floor(progress * 3));
      if (nextChapter !== lastChapter) { lastChapter = nextChapter; setChapter(nextChapter); }
    };
    const schedule = () => { if (active && !frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver(entries => {
      active = entries[0].isIntersecting;
      if (active) schedule();
      else { cancelAnimationFrame(frame); frame = null; }
    });
    observer.observe(story.current);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      observer.disconnect(); cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [staticMode]);
  const choose = index => {
    setChapter(index);
    if (staticMode) return;
    const bounds = story.current.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage.current).top) || 0;
    const travel = Math.max(0, bounds.height - stage.current.offsetHeight);
    // Direct step selection is immediate; scrolling remains native and free.
    window.scrollTo({ top: scrollY + bounds.top - top + travel * [0, .5, 1][index], behavior: 'instant' });
  };
  const current = chapters[chapter];
  return <section className="landing-section landing-container landing-story-section" aria-labelledby="story-title">
    <div className="landing-section-heading" data-reveal><div><span className="landing-kicker">A LITTLE IDEA. A REAL DIFFERENCE.</span><h2 id="story-title">See the thinking<br />come together.</h2></div><p>One everyday question. Three useful steps. Scroll through the example, or choose a step.</p></div>
    <div className={`landing-scroll-story ${staticMode ? 'is-static' : ''}`} ref={story}>
      <div className="landing-story-stage" ref={stage} data-chapter={chapter}>
        <div className="landing-story-copy">
          <div className="landing-story-tabs" role="group" aria-label="Example steps">{chapters.map((item, index) => <button key={item.label} aria-pressed={chapter === index} aria-controls="landing-story-explanation" onClick={() => choose(index)}><span>{index + 1}</span>{item.label}</button>)}</div>
          <div className="landing-story-explanation" id="landing-story-explanation"><span className="landing-kicker">STEP {chapter + 1} OF 3</span><h3>{current.title}</h3><p>{current.text}</p></div>
          <button className="landing-text-button landing-story-continue" onClick={onContinue}>Try the unit-price lesson<ArrowRight size={17} /></button>
          <span className="landing-story-scroll-note"><ArrowDown size={15} />{staticMode ? 'Choose any step above' : 'Scroll to follow the reasoning'}</span>
        </div>
        <figure className="landing-story-chart" aria-labelledby="story-chart-title" aria-describedby="story-chart-note">
          <div className="landing-story-chart-heading"><span><ShoppingBasket size={19} />The apple comparison</span><span>{chapter === 2 ? <><Check size={14} />Decision</> : 'Worked example'}</span></div>
          <figcaption id="story-chart-title">{current.unit}</figcaption>
          <div className="landing-story-bars">{current.values.map((value, index) => <div className={`landing-story-column ${chapter === 2 && index === 1 ? 'is-choice' : ''}`} key={index}><strong>{value}</strong><div className="landing-story-bar-track" aria-hidden="true"><div className="landing-story-bar" style={{ '--bar-scale': current.ratios[index] }} /><span>{index === 0 ? 'A' : 'B'}</span></div><span>{index === 0 ? '3 apples' : '5 apples'}</span></div>)}</div>
          <p className="landing-story-chart-note" id="story-chart-note">{current.note}</p>
          <div className="landing-story-track" aria-hidden="true"><span /></div>
        </figure>
      </div>
    </div>
  </section>;
}
