import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown,
  Clock3, Lightbulb, Menu, MoveUpRight, Sparkles, X,
  Atom, Binary, Brain, BriefcaseBusiness, ChartNoAxesCombined, Dna,
  Earth, FlaskConical, Heart, History, Landmark, Languages,
  Palette, PencilRuler, Rocket, Sigma, Wallet, Wrench,
} from 'lucide-react';
import { BrandMark, CourseArt } from './Art.jsx';
import { categories } from './data.js';
import { AppearanceControls } from './Appearance.jsx';
import AccountMenu from './AccountMenu.jsx';
import SkillPlayground from './SkillPlayground.jsx';
import ParticleStory from './ParticleStory.jsx';
import LandingParticleEffects from './LandingParticleEffects.jsx';
import './landing.css';
import { ScrollCatalog, ScrollSkills, useLandingMotion } from './LandingMotion.jsx';

const navigation = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#courses', label: 'Our courses' },
  { href: '#why-curio', label: 'Why Curio' },
  { href: '#teach', label: 'For creators' },
];

const subjectIcons = [Sigma, Binary, Atom, Brain, Dna, FlaskConical, Rocket, Earth, Languages, History, Earth, BriefcaseBusiness, Landmark, PencilRuler, Wrench, Heart, Palette, Wallet];

const learningSteps = [
  {
    title: 'Understand the idea.',
    description: 'Start with a clear explanation and a concrete learning goal. Know what you are working toward.',
    illustration: 'read',
  },
  {
    title: 'See it in action.',
    description: 'Follow a worked example one step at a time. See the reasoning behind the answer.',
    illustration: 'explore',
  },
  {
    title: 'Work it out.',
    description: 'Apply the idea to a new question. Get feedback, review a mistake, and try another example.',
    illustration: 'solve',
  },
];

const questions = [
  {
    question: 'Do I need an account?',
    answer: 'You can start learning right away without an account. Guest progress is saved in this browser. Create a free account to save progress across devices or publish your own courses.',
  },
  {
    question: 'Is Curio free?',
    answer: 'Yes. Every course, lesson, and daily challenge is free to learn. Course publishing is also free for a limited time, with no card required. We’ll announce any future publishing prices before they take effect.',
  },
  {
    question: 'Where should I start?',
    answer: 'Open Study paths in the learning space to follow a guided sequence in mathematics, programming, science, communication, money, design, or health. You can also choose an individual course by subject, level, and available time.',
  },
  {
    question: 'Can I stop and come back later?',
    answer: 'Yes. Guest progress is saved in this browser; clearing browser data removes it. When you sign in, your progress is saved to your account so you can continue on another device.',
  },
  {
    question: 'Can I upload my own course?',
    answer: 'Yes. Create an account and open the creator workspace. Write in the lesson editor or upload a course JSON file using our downloadable template. Save a private draft, preview the lessons, and publish when every explanation and quiz is ready. Only upload material you own or have permission to share.',
  },
];

function LandingHeader({ onEnter, hasProgress, accountMenuProps, onAppearance }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const header = useRef(null);
  const menuButton = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const dismiss = event => {
      if (event.type === 'keydown') {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        menuButton.current?.focus();
      } else if (header.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    const desktop = matchMedia('(min-width: 1001px)');
    const resize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', dismiss);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    desktop.addEventListener('change', resize);
    return () => {
      document.removeEventListener('keydown', dismiss);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      desktop.removeEventListener('change', resize);
    };
  }, [menuOpen]);

  const visitSection = event => {
    const destination = document.getElementById(event.currentTarget.hash.slice(1));
    setMenuOpen(false);
    // The clicked menu link is removed. Continue keyboard navigation at the
    // destination instead of dropping focus back to the document body.
    requestAnimationFrame(() => {
      const heading = destination?.querySelector('h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    });
  };

  return (
    <header className="landing-header" ref={header}>
      <div className="landing-container landing-header-inner">
        <a className="landing-brand" href="#home" aria-label="Curio home" onClick={() => setMenuOpen(false)}>
          <BrandMark />
          <span>curio<span className="landing-brand-dot">.</span></span>
        </a>

        <nav className="landing-desktop-nav" aria-label="Website navigation">
          {navigation.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}
        </nav>

        <div className="landing-header-actions"><AppearanceControls onOpen={onAppearance} />

          <button className="landing-enter" onClick={onEnter}>
            {hasProgress ? 'My learning' : 'Learning space'}
            <ArrowUpRight size={15} />
          </button>
          <AccountMenu {...accountMenuProps} onOpen={() => { setMenuOpen(false); accountMenuProps.onOpen?.(); }} />
          <button
            className="landing-menu-button"
            ref={menuButton}
            aria-label={menuOpen ? 'Close website navigation' : 'Open website navigation'}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMenuOpen(open => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="landing-mobile-nav" className="landing-mobile-nav" aria-label="Mobile website navigation">
          {navigation.map(link => (
            <a key={link.href} href={link.href} onClick={visitSection}>
              {link.label}<ArrowUpRight size={16} />
            </a>
          ))}
          <button onClick={() => { setMenuOpen(false); onAppearance(); }}>Appearance<ArrowRight size={16} /></button><button onClick={onEnter}>Go to your learning space<ArrowRight size={16} /></button>

        </nav>
      )}
    </header>
  );
}

function PreviewBackdrop() {
  return (
    <svg className="landing-preview-backdrop" viewBox="0 0 570 570" fill="none" aria-hidden="true">
      <circle cx="292" cy="277" r="224" fill="#e8eddc" />
      <ellipse cx="292" cy="277" rx="274" ry="177" transform="rotate(-32 292 277)" stroke="#b9c9a5" strokeWidth="1.2" />
      <circle cx="292" cy="277" r="245" stroke="#b9c9a5" strokeDasharray="3 8" />
      <path d="m473 101 8 18 19 3-14 14 3 19-16-9-17 9 4-19-14-14 19-3 8-18Z" fill="#d7ae83" />
      <path d="M76 354v28m-14-14h28" stroke="#80986c" strokeWidth="2" strokeLinecap="round" />
      <path d="m423 452 9 18 19-6-6 19 18 9-18 8 6 20-19-7-9 19-8-19-20 7 7-20-19-8 19-9-7-19 20 6 8-18Z" fill="#9eaf7d" />
      <circle cx="126" cy="118" r="8" fill="#b7c894" />
      <circle cx="507" cy="310" r="5" fill="#8c9f74" />
    </svg>
  );
}

function LessonPreview({ onContinue }) {
  const [answer, setAnswer] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && answer === 14;

  const selectAnswer = value => {
    setAnswer(value);
    setChecked(false);
  };

  return (
    <div className="landing-preview-scene" id="try-a-lesson">
      <PreviewBackdrop />
      <span className="landing-preview-note" aria-hidden="true">A little thinking.<br />A little lightbulb moment.<MoveUpRight size={25} /></span>

      <section className="landing-lesson-preview" aria-labelledby="preview-title">
        <div className="landing-preview-topline">
          <span><span className="landing-live-dot" />A LESSON, IN MINIATURE</span>
          <span><Clock3 size={12} />30 sec</span>
        </div>

        <div className="landing-preview-subject"><span><Sparkles size={16} /></span>Thinking in numbers</div>
        <h2 id="preview-title">Every pattern has a story.</h2>
        <p>Look at these numbers. What’s the rule?</p>

        <div className="landing-sequence" aria-label="Sequence: 2, 5, 8, 11, then an unknown number">
          {[2, 5, 8, 11].map((value, index) => (
            <React.Fragment key={value}>
              {index > 0 && <span className="landing-sequence-connector" aria-hidden="true" />}
              <span className="landing-sequence-value">{value}</span>
            </React.Fragment>
          ))}
          <span className="landing-sequence-connector" aria-hidden="true" />
          <span className={`landing-sequence-value unknown ${correct ? 'solved' : ''}`}>{correct ? 14 : '?'}</span>
        </div>

        <fieldset className="landing-preview-answers">
          <legend>What comes next?</legend>
          <div>
            {[12, 14, 16].map(value => (
              <button
                key={value}
                className={`${answer === value ? 'selected' : ''} ${correct && answer === value ? 'correct' : ''}`}
                aria-pressed={answer === value}
                disabled={correct}
                onClick={() => selectAnswer(value)}
              >
                {value}{correct && answer === value && <Check size={15} />}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={`landing-preview-feedback ${checked ? correct ? 'success' : 'retry' : ''}`} role="status" aria-live="polite">
          {checked ? (
            <><Lightbulb size={16} /><span>{correct ? 'Exactly. Add 3 each time: 11 + 3 = 14.' : 'Look at the gaps. Each number is 3 more than the last. Try again.'}</span></>
          ) : (
            <><Lightbulb size={15} /><span>A guess is a good place to begin.</span></>
          )}
        </div>

        <button
          className="landing-button landing-button-dark landing-preview-check"
          disabled={!correct && answer === null}
          onClick={correct ? onContinue : () => setChecked(true)}
        >
          {correct ? 'Keep learning' : 'Check my thinking'}<ArrowRight size={17} />
        </button>
        <span className="landing-preview-bottom"><BookOpen size={12} />A small taste of how we learn.</span>
      </section>
    </div>
  );
}

function StepIllustration({ type }) {
  return (
    <div className={`landing-step-art ${type}`} data-particle-effect={{ read: 'helix', explore: 'network', solve: 'towers' }[type]} aria-hidden="true">
      {type === 'read' && (
        <div className="landing-notebook">
          <span className="landing-notebook-label">THE IDEA</span>
          <div className="landing-notebook-line" />
          <div className="landing-notebook-line"><span /></div>
          <div className="landing-notebook-line short" />
          <span className="landing-notebook-spark">✦</span>
        </div>
      )}
      {type === 'explore' && (
        <div className="landing-fraction-example">
          <div className="landing-fraction-grid"><span /><span /><span /><span /></div>
          <span className="landing-fraction-equals">=</span>
          <span className="landing-fraction-number"><span>1</span><span>4</span></span>
          <span className="landing-fraction-caption">one part of a whole</span>
        </div>
      )}
      {type === 'solve' && (
        <div className="landing-solution">
          <span className="landing-solution-label">YOUR TURN</span>
          <span className="landing-solution-answer"><Check size={16} />That makes sense.</span>
          <span className="landing-solution-note"><Lightbulb size={14} />Here’s why it works…</span>
        </div>
      )}
    </div>
  );
}

function LandingCourse({ course, onOpen }) {
  return (
    <article className="landing-course" data-reveal>
      <button onClick={() => onOpen(course)} aria-label={`Explore ${course.title}`}>
        <span className={`landing-course-art ${course.color}`} data-particle-effect={{ numbers: 'helix', computing: 'towers', logic: 'network', physics: 'orbit' }[course.id] || 'orbit'}><CourseArt type={course.art} /><span data-particle-label>{course.level}</span></span>
        <span className="landing-course-content">
          <span className={`landing-course-category ${course.color}-text`}>{course.label}</span>
          <span className="landing-course-title">{course.title}</span>
          <span className="landing-course-description">{course.description}</span>
          <span className="landing-course-bottom"><span>{course.lessons.length} lessons · {course.minutes} min</span><span className="landing-course-open">Explore course<ArrowUpRight size={16} /></span></span>
        </span>
      </button>
    </article>
  );
}

export default function Landing({ courses, onExplore, onEnter, onOpenCourse, hasProgress, onCreate, accountMenuProps, serviceError, onRetry, onAppearance }) {
  const root = useRef(null);
  const [particlesPaused, setParticlesPaused] = useState(false);
  useLandingMotion(root);
  const subjectCount = new Set(courses.map(course => course.category)).size;
  const lessonCount = courses.reduce((count, course) => count + course.lessons.length, 0);

  return (
    <div className="landing" id="home" ref={root}>
      <div className="landing-reading-progress" aria-hidden="true" />
      <a className="skip-link" href="#landing-main">Skip to content</a>
      <LandingHeader onAppearance={onAppearance} onEnter={onEnter} hasProgress={hasProgress} accountMenuProps={accountMenuProps} />

      <main className="landing-main" id="landing-main">
        {serviceError && <div className="landing-container landing-service-message" role="alert">{serviceError}<button onClick={onRetry}>Try again</button></div>}
        <ParticleStory onExplore={() => onExplore()} paused={particlesPaused} onPauseChange={setParticlesPaused} />

        <section className="landing-lesson-section landing-container" aria-labelledby="lesson-preview-title">
          <div className="landing-lesson-intro">
            <span className="landing-kicker">A LITTLE LESS WATCHING. A LITTLE MORE DOING.</span>
            <h2 id="lesson-preview-title">Try an idea.<br />See it click.</h2>
            <p>Make a prediction, test it, and see why it works. Here’s a small taste of how you’ll learn on Curio.</p>
            <span className="landing-coin-note">Complete a full lesson. Earn 25 Curio coins.</span>
            <div className="landing-learning-particles" data-particle-effect="helix" aria-hidden="true"><span className="landing-particle-static">∞</span></div>
          </div>
          <LessonPreview onContinue={() => onOpenCourse(courses[0])} />
        </section>

        <ScrollCatalog courseCount={courses.length} lessonCount={lessonCount} subjectCount={subjectCount} />

        <section className="landing-section landing-container landing-method" id="how-it-works" aria-labelledby="method-title">
          <div className="landing-section-heading" data-reveal>
            <div><span className="landing-kicker">HOW IT WORKS</span><h2 id="method-title">Understand the idea.<br />Put it to work.</h2></div>
            <p>Start with one idea, see it in action, then test your understanding. A complete lesson in a few focused minutes.</p>
          </div>
          <div className="landing-steps">
            {learningSteps.map((step, index) => (
              <article className="landing-step" key={step.title} data-reveal style={{ '--reveal-delay': `${index * 70}ms` }}>
                <StepIllustration type={step.illustration} />
                <div className="landing-step-copy"><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></div>
              </article>
            ))}
          </div>
        </section>

        <ScrollSkills onOpenLesson={index => { const course = courses.find(item => item.id === 'numbers'); if (course) onOpenCourse(course, index); }} />

        <SkillPlayground onOpenLesson={index => { const course = courses.find(item => item.id === 'numbers'); if (course) onOpenCourse(course, index); }} />

        <section className="landing-course-section" id="courses" aria-labelledby="landing-courses-title">
          <div className="landing-container">
            <div className="landing-section-heading" data-reveal>
              <div><span className="landing-kicker">FOLLOW AN INTEREST</span><h2 id="landing-courses-title">Pick a place to start.</h2></div>
              <button className="landing-text-button" onClick={() => onExplore()}>Explore all {courses.length} courses<ArrowRight size={17} /></button>
            </div>
            <div className="landing-course-grid">
              {courses.slice(0, 4).map(course => <LandingCourse key={course.id} course={course} onOpen={onOpenCourse} />)}
            </div>
            <div className="landing-course-note"><span><Sparkles size={16} />A new interest doesn’t need a head start.</span><span>Beginner-friendly courses. Start with what you know.</span></div>
          </div>
        </section>

        <section className="landing-section landing-container landing-subjects" id="subjects" aria-labelledby="subjects-title">
          <div className="landing-section-heading" data-reveal><div><span className="landing-kicker">ROOM FOR EVERY INTEREST</span><h2 id="subjects-title">Where will curiosity take you?</h2></div><p>A new skill for school, a question about the world, or something just for you. Start with a subject.</p></div>
          <div className="landing-subject-grid">{categories.slice(1).map((subject, index) => {
            const Icon = subjectIcons[index] || BookOpen;
            const count = courses.filter(course => course.category === subject).length;
            return <button key={subject} data-reveal onClick={() => onExplore(subject)}><span className={`subject-icon subject-tint-${index % 6}`}><Icon size={21} strokeWidth={1.5} /></span><span><strong>{subject}</strong><small>{count} {count === 1 ? 'course' : 'courses'}</small></span><ArrowUpRight size={16} /></button>;
          })}</div>
        </section>

        <section className="landing-container landing-teach-section" id="teach" aria-labelledby="teach-title">
          <div className="landing-teach" data-reveal><div className="landing-teach-copy"><span className="landing-offer-tag"><span />LIMITED-TIME CREATOR OFFER</span><h2 id="teach-title">Someone is ready to learn<br />what you know.</h2><p>Turn your knowledge into a course. Write short lessons, add examples and quizzes, or upload a course you’ve already prepared. Your next student could start here.</p><button className="landing-button landing-button-dark" onClick={onCreate}>Create your first course<ArrowRight size={18} /></button><span className="landing-teach-note"><Check size={14} />Free to publish for a limited time. No card needed.</span><div className="landing-creator-particles" data-particle-effect="broadcast" aria-hidden="true"><span className="landing-particle-static">◎</span></div></div><div className="landing-teach-card"><span className="landing-kicker">A PLACE FOR YOUR IDEAS</span><span className="landing-creator-price">$0<span>course publishing fee</span></span><div><span><Check size={16} /></span><p>Write in the lesson editor</p></div><div><span><Check size={16} /></span><p>Import your own course file</p></div><div><span><Check size={16} /></span><p>Keep drafts private until ready</p></div><div><span><Check size={16} /></span><p>Publish to the shared catalog</p></div><small>Offer available now. Any future fees will be announced before they apply.</small></div></div>
        </section>

        <section className="landing-section landing-container" id="why-curio" aria-labelledby="why-title">
          <div className="landing-why">
            <div className="landing-why-copy">
              <span className="landing-kicker">LEARNING, ON YOUR TERMS</span>
              <h2 id="why-title">Make learning<br />part of your day.</h2>
              <p>A good learning habit has room for real life. Choose a small daily goal, save your place, and come back when you’re ready.</p>
              <button className="landing-text-button" onClick={onEnter}>See your learning space<ArrowUpRight size={18} /></button>
              <span className="landing-why-flower" aria-hidden="true">✳</span>
            </div>
            <div className="landing-benefits">
              <div><span>01</span><section><h3>A pace that fits your day.</h3><p>Choose one, two, or three activities for your daily goal. A lesson or a daily challenge counts.</p></section></div>
              <div><span>02</span><section><h3>Your notes, saved.</h3><p>Write private notes as you learn. Save courses for later, and sign in to keep your notes and progress across devices.</p></section></div>
              <div><span>03</span><section><h3>Small wins you can see.</h3><p>Earn Curio coins for lessons, daily challenges, and practice. Each reward comes from your own learning.</p></section></div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-container landing-faq" id="questions" aria-labelledby="questions-title">
          <div className="landing-faq-heading"><span className="landing-kicker">A FEW THINGS TO KNOW</span><h2 id="questions-title">Before you<br />dive in.</h2><p>A simple start to a new interest.</p></div>
          <div className="landing-questions">
            {questions.map(item => (
              <details key={item.question}>
                <summary>{item.question}<ChevronDown size={18} /></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-container landing-final-section" aria-labelledby="final-title">
          <div className="landing-final" data-particle-effect="broadcast" data-reveal>
            <span className="landing-final-spark" aria-hidden="true">✦</span>
            <span className="landing-kicker">START LEARNING</span>
            <h2 id="final-title">Choose your<br />first course.</h2>
            <button className="landing-button landing-button-dark" onClick={() => onExplore()}>Find something to learn<ArrowRight size={18} /></button>
            <p>Start anywhere. Go at your own pace.</p>
            <svg className="landing-final-orbit" viewBox="0 0 340 260" fill="none" aria-hidden="true"><circle cx="180" cy="140" r="99" stroke="#cad5b8" /><ellipse cx="180" cy="140" rx="150" ry="46" transform="rotate(-35 180 140)" stroke="#b7c9a1" /><circle cx="282" cy="65" r="9" fill="#b7c9a1" /></svg>
          </div>
        </section>
      </main>

      <LandingParticleEffects root={root} paused={particlesPaused} onPauseChange={setParticlesPaused} />

      <footer className="landing-footer landing-container">
        <div><a className="landing-brand" href="#home" aria-label="Curio home"><BrandMark /><span>curio<span className="landing-brand-dot">.</span></span></a><span>A little more curious.</span></div>
        <nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="#subjects">Subjects</a><a href="#teach">For creators</a><a href="#questions">Questions</a></nav>
        <span className="landing-copyright">© {new Date().getFullYear()} Curio</span>
      </footer>
    </div>
  );
}
