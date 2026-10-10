import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, Bookmark, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Compass, Flame, GraduationCap, LayoutDashboard, Lightbulb, Menu, Search, Settings2, Sparkles, Sprout, Target, Trophy, X, Zap, Bell, RotateCcw, Plus, Minus } from 'lucide-react';
import { BrandMark, CourseArt, HeroArt } from './Art.jsx';
import { categories, courses as starterCourses, dailyChallenge } from './data.js';
import { STORAGE_KEY, readProgress, localDate, completeLesson, completeChallenge, streakCount, courseCompleted, emptyProgress, mergeProgress } from './progress.js';
import Landing from './Landing.jsx';
import Creator from './Creator.jsx';
import Account from './Account.jsx';
import { api } from './api.js';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'learning', label: 'My learning', icon: BookOpen },
  { id: 'explore', label: 'Explore courses', icon: Compass },
  { id: 'practice', label: 'Daily practice', icon: Zap },
  { id: 'creators', label: 'Creator workspace', icon: GraduationCap },
];
const views = [...navItems.map(n => n.id), 'achievements', 'home'];
const landingSections = ['how-it-works', 'courses', 'why-curio', 'questions', 'try-a-lesson', 'landing-main', 'subjects', 'teach'];
const challengeBank = [dailyChallenge, ...starterCourses.flatMap(c => c.lessons.map(l => ({ ...l, title: l.title })))];
const ownerKey = 'curio.student.owner';
const savedOwner = () => { try { return localStorage.getItem(ownerKey); } catch { return null; } };
const saveOwner = id => { try { if (id) localStorage.setItem(ownerKey, id); else localStorage.removeItem(ownerKey); } catch { /* Local storage errors are shown by the progress effect. */ } };
const challengeForDay = (date) => challengeBank[Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000) % challengeBank.length];

function Modal({ children, onClose, title, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.focus();
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]');
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (!nodes.length) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current || !ref.current.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current || !ref.current.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}><section ref={ref} tabIndex={-1} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><button className="icon-button modal-close" onClick={onClose} aria-label="Close dialog"><X size={20}/></button>{children}</section></div>;
}

function CourseCard({ course, progress, onOpen }) {
  const done = courseCompleted(progress, course);
  const enrolled = progress.enrolled.includes(course.id);
  const allDone = done === course.lessons.length;
  return <article className="course-card">
    <button className={`course-cover ${course.color}`} onClick={() => onOpen(course)} aria-label={`View ${course.title}`}><span className="level-tag">{course.level}</span><CourseArt type={course.art}/><span className="cover-arrow"><ArrowUpRight size={18}/></span></button>
    <div className="course-body"><span className={`eyebrow course-category ${course.color}-text`}>{course.label}</span><h3><button onClick={() => onOpen(course)}>{course.title}</button></h3><p>{course.description}</p>{course.author && <small className="course-author">By {course.author} · Community course</small>}
      <div className="course-meta"><span><BookOpen size={13}/>{course.lessons.length} lessons</span><span className="meta-dot">·</span><span><Clock3 size={13}/>{course.minutes} min</span></div>
      {enrolled && <div className="course-progress"><div className="progress-track"><span style={{ width: `${done / course.lessons.length * 100}%` }}/></div><span>{done}/{course.lessons.length} complete</span></div>}
      <button className={`course-action ${enrolled ? 'enrolled' : ''}`} onClick={() => onOpen(course)}>{allDone ? 'Review course' : enrolled ? 'Continue learning' : 'Explore course'}{allDone ? <CheckCheck size={16}/> : <ArrowRight size={16}/>}</button>
    </div>
  </article>;
}

function Quiz({ question, onComplete, completed = false, buttonLabel = 'Finish lesson' }) {
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && selected === question.answer;
  return <div className="quiz"><span className="eyebrow">YOUR TURN</span><h2>{question.question}</h2><p className="quiz-hint">Take your time. Learning happens when you try.</p><div className="quiz-options" role="group" aria-label="Answer choices">{question.options.map((option, i) => <button key={option} className={`quiz-option ${selected === i ? 'selected' : ''} ${checked && selected === i ? correct ? 'correct' : 'incorrect' : ''}`} aria-pressed={selected === i} onClick={() => { setSelected(i); setChecked(false); }} disabled={correct}><span className="answer-letter">{String.fromCharCode(65 + i)}</span>{option}{correct && selected === i && <Check size={19}/>}</button>)}</div>
    {checked && <div className={`answer-feedback ${correct ? 'success' : 'retry'}`} role="status"><span>{correct ? <Sparkles size={20}/> : <Lightbulb size={20}/>}</span><div><strong>{correct ? 'That’s an aha moment!' : 'Not quite — you’re still learning.'}</strong><p>{correct ? question.explanation : 'Try another answer. Go back to the example if you need a fresh perspective.'}</p></div></div>}
    <div className="quiz-footer">{correct ? <button className="button primary" onClick={onComplete}>{completed ? 'Back to practice' : buttonLabel}<ArrowRight size={17}/></button> : <button className="button primary" disabled={selected === null} onClick={() => setChecked(true)}>Check my answer<ArrowRight size={17}/></button>}<span><Lightbulb size={14}/>Mistakes are part of the process.</span></div>
  </div>;
}

function PatternPlayground() {
  const [step, setStep] = useState(3);
  return <div className="pattern-playground"><div className="playground-title"><span><Sparkles size={16}/> Make a pattern</span><span>Start at 2. Change the step.</span></div><div className="number-sequence">{Array.from({ length: 5 }, (_, i) => <React.Fragment key={i}>{i > 0 && <span className="sequence-add">+{step}</span>}<span className="sequence-number" style={{ '--i': i }}>{2 + i * step}</span></React.Fragment>)}</div><div className="step-control"><span>Step size</span><button aria-label="Decrease step size" onClick={() => setStep(v => Math.max(1, v - 1))} disabled={step === 1}><Minus size={16}/></button><strong aria-live="polite">{step}</strong><button aria-label="Increase step size" onClick={() => setStep(v => Math.min(9, v + 1))} disabled={step === 9}><Plus size={16}/></button></div></div>;
}

function CourseModal({ course, progress, enroll, finish, close }) {
  const [lessonIndex, setLessonIndex] = useState(null);
  const [phase, setPhase] = useState('idea');
  const [justFinished, setJustFinished] = useState(null);
  const done = courseCompleted(progress, course);
  const next = course.lessons.findIndex((_, i) => !progress.completed[course.id]?.includes(i));
  const openLesson = i => { enroll(course.id); setLessonIndex(i); setPhase('idea'); setJustFinished(null); };
  const item = course.lessons[lessonIndex];
  const allDone = done === course.lessons.length;
  return <Modal wide title={lessonIndex === null ? course.title : item.title} onClose={close}>
    {lessonIndex === null ? <><div className={`course-detail-cover ${course.color}`}><CourseArt type={course.art}/><span className="detail-cover-label"><GraduationCap size={18}/>A little more curious</span></div><div className="course-detail-content"><span className="eyebrow">{course.label} · {course.level.toUpperCase()}</span><h2>{course.title}</h2><p>{course.description}</p><div className="detail-meta"><span><BookOpen size={16}/>{course.lessons.length} interactive lessons</span><span><Clock3 size={16}/>About {course.minutes} minutes</span></div>
      {justFinished !== null && <div className="completion-notice" role="status"><CheckCheck size={21}/><div><strong>{course.preview ? 'Preview complete. Your students can try this lesson.' : allDone ? 'Course complete. Look at you grow!' : 'Lesson complete. One step forward!'}</strong><span>{course.preview ? 'This preview did not change your learning progress.' : allDone ? 'You’ve completed every lesson in this course.' : `${done} of ${course.lessons.length} lessons complete. Keep your curiosity going.`}</span></div></div>}
      <div className="detail-progress"><span>Your learning path</span><span>{done}/{course.lessons.length} complete</span></div><div className="progress-track"><span style={{ width: `${done / course.lessons.length * 100}%` }}/></div><div className="lesson-list">{course.lessons.map((l, i) => <button key={i} onClick={() => openLesson(i)}><span className={`lesson-number ${progress.completed[course.id]?.includes(i) ? 'done' : ''}`}>{progress.completed[course.id]?.includes(i) ? <Check size={17}/> : String(i + 1).padStart(2, '0')}</span><span><strong>{l.title}</strong><small>Learn · explore · practice</small></span><ChevronRight size={19}/></button>)}</div><button className="button primary full-width" onClick={() => openLesson(next === -1 ? 0 : next)}>{allDone ? 'Review the first lesson' : done ? 'Continue learning' : 'Let’s start learning'}<ArrowRight size={18}/></button><p className="detail-note">{course.preview ? 'Creator preview. Trying this lesson does not change your learning progress.' : 'No rush, no pressure. Your progress is saved as you go.'}</p></div></> : <div className="lesson-content"><button className="text-button lesson-back" onClick={() => setLessonIndex(null)}><ChevronLeft size={16}/>{course.title}</button><div className="lesson-header"><span className="eyebrow">LESSON {lessonIndex + 1} OF {course.lessons.length}</span><span>{phase === 'idea' ? '1' : '2'} / 2 steps</span></div><div className="lesson-steps"><span className="active"/><span className={phase === 'quiz' ? 'active' : ''}/></div>{phase === 'idea' ? <><h2>{item.title}</h2><p className="lesson-idea">{item.idea}</p>{course.id === 'numbers' && lessonIndex === 0 ? <PatternPlayground/> : <div className={`lesson-art ${course.color}`}><CourseArt type={course.art}/></div>}<div className="example-box"><span><Lightbulb size={19}/></span><div><strong>Let’s make it concrete</strong><p>{item.example}</p></div></div><button className="button primary full-width" onClick={() => setPhase('quiz')}>Got it. Let me try!<ArrowRight size={18}/></button></> : <><Quiz key={lessonIndex} question={item} buttonLabel={course.preview ? 'Finish preview' : 'Finish lesson'} onComplete={() => { finish(course.id, lessonIndex); setJustFinished(lessonIndex); setLessonIndex(null); }}/><button className="text-button revisit" onClick={() => setPhase('idea')}><ChevronLeft size={15}/>Revisit the idea</button></>}</div>}
  </Modal>;
}

function ProfileModal({ progress, update, close }) {
  const [name, setName] = useState(progress.name);
  const [goal, setGoal] = useState(progress.goal);
  const [error, setError] = useState('');
  return <Modal title="Make yourself at home" onClose={close}><div className="profile-dialog"><span className="dialog-icon"><Sprout size={27}/></span><span className="eyebrow">YOUR LITTLE CORNER</span><h2>Make yourself at home.</h2><p>A few small details for a learning journey that feels like you.</p><form noValidate onSubmit={e => { e.preventDefault(); if (!name.trim()) { setError('Please enter a name to continue.'); return; } update(p => ({ ...p, name: name.trim(), goal })); close(); }}><label htmlFor="learner-name">What should we call you?</label><input id="learner-name" value={name} onChange={e => { setName(e.target.value); setError(''); }} maxLength={32} placeholder="Your first name" aria-describedby={error ? 'name-error' : undefined} aria-invalid={Boolean(error)}/>{error && <p className="field-error" id="name-error" role="alert">{error}</p>}<label htmlFor="daily-goal">Your daily learning goal</label><select id="daily-goal" value={goal} onChange={e => setGoal(Number(e.target.value))}><option value={1}>A little curious · 1 activity a day</option><option value={2}>Keep growing · 2 activities a day</option><option value={3}>All in · 3 activities a day</option></select><span className="form-note">A lesson or daily challenge counts as one activity.</span><button className="button primary full-width" type="submit">Save my preferences<Check size={17}/></button></form><p className="privacy-note">Your preferences are saved in this browser. When signed in, your learning progress is also saved to your account.</p></div></Modal>;
}

export default function App() {
  const [courses, setCourses] = useState(starterCourses);
  const [user, setUser] = useState(null);
  const [serviceError, setServiceError] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [view, setView] = useState(() => views.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home');
  const [progress, setProgress] = useState(() => readProgress(localStorage));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All courses');
  const [learningFilter, setLearningFilter] = useState('In progress');
  const [sort, setSort] = useState('Recommended');
  const [modal, setModalState] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [today, setToday] = useState(localDate());
  const creatorDirty = useRef(false);
  const onCreatorDirty = React.useCallback(value => { creatorDirty.current = value; }, []);
  const mayLeaveEditor = () => {
    if (!creatorDirty.current) return true;
    if (!window.confirm('Leave the course editor? Your unsaved changes will be lost.')) return false;
    creatorDirty.current = false; return true;
  };
  const searchRef = useRef(null);
  const modalOpener = useRef(null);
  const setModal = next => {
    if (next) modalOpener.current = document.activeElement;
    setModalState(next);
  };
  const streak = streakCount(progress.activity);
  const activities = progress.activity[today] || 0;
  const totalDone = courses.reduce((sum, c) => sum + courseCompleted(progress, c), 0);
  const completedCourses = courses.filter(c => courseCompleted(progress, c) === c.lessons.length).length;
  const enrolledCourses = courses.filter(c => progress.enrolled.includes(c.id));
  const challenge = challengeForDay(today);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); setStorageError(false); } catch { setStorageError(true); } }, [progress]);
  useEffect(() => {
    const tick = () => setToday(localDate());
    const interval = setInterval(tick, 30000);
    const hashChange = () => {
      const value = location.hash.slice(1);
      if (value !== 'creators' && !mayLeaveEditor()) { location.hash = 'creators'; return; }
      if (!value || views.includes(value)) setView(value || 'home');
      else if (landingSections.includes(value)) setView('home');
    };
    const keyboard = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener('hashchange', hashChange); document.addEventListener('keydown', keyboard);
    return () => { clearInterval(interval); window.removeEventListener('hashchange', hashChange); document.removeEventListener('keydown', keyboard); };
  }, []);
  const refreshCatalog = async () => {
    try { setCourses((await api('/courses')).courses); setServiceError(''); }
    catch (error) { setServiceError(error.message); }
  };
  useEffect(() => {
    const controller = new AbortController();
    api('/courses', { signal: controller.signal }).then(result => setCourses(result.courses)).catch(error => { if (error.name !== 'AbortError') setServiceError(error.message); });
    api('/session', { signal: controller.signal }).then(session => {
      setUser(session.user);
      if (session.user) {
        const owner = savedOwner();
        setProgress(p => mergeProgress(owner && owner !== session.user.id ? emptyProgress() : p, session.progress));
        saveOwner(session.user.id);
      } else if (savedOwner()) { setProgress(emptyProgress()); saveOwner(null); }
      setSessionLoading(false);
    }).catch(error => { if (error.name !== 'AbortError') { setSessionLoading(false); setServiceError(error.message); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!user || sessionLoading || signingOut) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setSyncStatus('Saving to your account…');
      api('/progress', { method: 'PUT', body: progress, signal: controller.signal }).then(() => setSyncStatus('Saved to your account')).catch(error => { if (error.name !== 'AbortError') setSyncStatus(error.message); });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [progress, user?.id, sessionLoading, signingOut]);
  const navigate = page => { if (page !== 'creators' && !mayLeaveEditor()) return; setView(page); location.hash = page; setSidebarOpen(false); setQuery(''); setCategory('All courses'); setNotifications(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openCourse = course => setModal({ type: 'course', course });
  const enroll = id => setProgress(p => p.enrolled.includes(id) ? p : { ...p, enrolled: [...p.enrolled, id] });
  const finish = (id, index) => setProgress(p => completeLesson(p, id, index, today));
  const close = React.useCallback(() => {
    setModalState(null);
    requestAnimationFrame(() => modalOpener.current?.focus());
  }, []);
  const acceptSession = session => {
    const owner = savedOwner();
    setUser(session.user); setProgress(p => mergeProgress(owner && owner !== session.user.id ? emptyProgress() : p, session.progress));
    saveOwner(session.user.id);
    setServiceError(''); setSyncStatus(''); setSessionLoading(false); close();
  };
  const signOut = async () => {
    setSigningOut(true);
    try {
      await api('/progress', { method: 'PUT', body: progress });
      await api('/auth/logout', { method: 'POST', body: {} });
      setUser(null); setProgress(emptyProgress()); setSyncStatus(''); saveOwner(null);
    } catch (error) { setServiceError(error.message); }
    finally { setSigningOut(false); }
  };
  let filtered = courses.filter(c => (category === 'All courses' || c.category === category) && `${c.title} ${c.category} ${c.description} ${c.lessons.map(l => l.title).join(' ')}`.toLowerCase().includes(query.toLowerCase().trim()));
  if (sort === 'Shortest first') filtered = [...filtered].sort((a, b) => a.minutes - b.minutes);
  if (sort === 'A–Z') filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  const learningCourses = enrolledCourses.filter(c => learningFilter === 'All courses' || (learningFilter === 'Completed' ? courseCompleted(progress, c) === c.lessons.length : courseCompleted(progress, c) < c.lessons.length));
  const dashboardCourses = enrolledCourses.filter(c => courseCompleted(progress, c) < c.lessons.length).slice(0, 3);
  const featured = dashboardCourses.length ? dashboardCourses : courses.slice(0, 3);
  const pageTitle = { overview: 'Your next “aha!” starts here.', explore: 'Follow your curiosity.', learning: 'Small steps. Real progress.', practice: 'A little practice goes a long way.', achievements: 'Look at you grow.', creators: 'Teach something worth knowing.' }[view];
  const pageSubtitle = { overview: 'A fresh perspective, a new skill, a little more you. Let’s get into it.', explore: 'Big ideas, bite-sized lessons. Find something that makes you wonder.', learning: 'Your learning journey, all in one place. Pick up right where you left off.', practice: 'Give your brain something good to think about today.', achievements: 'Every little discovery deserves a little celebration.', creators: 'A clear idea can open a whole new world for someone.' }[view];
  return <>
    {view === 'home' ? (
      <div inert={modal ? true : undefined}>
        <Landing
          courses={courses}
          onExplore={subject => { navigate('explore'); if (typeof subject === 'string') setCategory(subject); }}
          onCreate={() => navigate('creators')}
          onAccount={() => setModal({ type: 'account' })}
          user={user}
          serviceError={serviceError}
          onRetry={refreshCatalog}
          onEnter={() => navigate(progress.enrolled.length ? 'learning' : 'overview')}
          onOpenCourse={openCourse}
          hasProgress={progress.enrolled.length > 0}
        />
      </div>
    ) : <>
    <a className="skip-link" href="#main-content" inert={modal ? true : undefined}>Skip to learning content</a>
    <div className="app-shell" inert={modal ? true : undefined}>
      {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)}/>}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}><button className="brand" onClick={() => navigate('home')} aria-label="Curio home"><BrandMark/><span>curio<span className="brand-dot">.</span></span></button><span className="sidebar-caption">A LITTLE MORE CURIOUS</span>
        <nav aria-label="Main navigation"><span className="nav-label">YOUR LEARNING SPACE</span>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${view === id ? 'active' : ''}`} onClick={() => navigate(id)} aria-current={view === id ? 'page' : undefined}><Icon size={19} strokeWidth={1.7}/><span>{label}</span>{view === id && <span className="nav-active-dot"/>}</button>)}<div className="nav-divider"/><button className={`nav-item ${view === 'achievements' ? 'active' : ''}`} onClick={() => navigate('achievements')} aria-current={view === 'achievements' ? 'page' : undefined}><Trophy size={19} strokeWidth={1.7}/><span>Achievements</span>{view === 'achievements' && <span className="nav-active-dot"/>}</button></nav>
        <div className="sidebar-bottom"><div className="streak-card"><div className="streak-title"><span className="streak-flame"><Flame size={20}/></span><strong>{streak ? `${streak}-day streak` : 'A habit worth growing'}</strong></div><p>{streak ? 'Little by little, a lot becomes possible.' : 'One small discovery. Every day.'}</p><div className="streak-days">{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const active = progress.activity[localDate(d)] > 0; return <span key={i} className={active ? 'done' : i === 6 ? 'today' : ''} title={`${d.toLocaleDateString('en', { weekday: 'long' })}: ${active ? 'Activity complete' : 'No activity yet'}`}>{active ? <Check size={12}/> : d.toLocaleDateString('en', { weekday: 'narrow' })}</span>; })}</div></div><button className="nav-item help-button" onClick={() => setModal({ type: 'help' })}><CircleHelp size={19}/><span>A little help?</span><ArrowUpRight size={15}/></button><div className="sidebar-footer"><span className="little-sprout"><Sprout size={15}/></span>Made for curious minds.</div></div>
      </aside>
      <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(v => !v)} aria-label="Open navigation" aria-expanded={sidebarOpen}><Menu size={22}/></button><span className="breadcrumb">Your learning space<ChevronRight size={13}/><strong>{view === 'achievements' ? 'Achievements' : navItems.find(n => n.id === view)?.label}</strong></span></div><div className="topbar-actions"><div className="search-field"><Search size={16}/><input ref={searchRef} aria-label="Search courses" placeholder="Find your next curiosity" value={query} onChange={e => { if (!mayLeaveEditor()) return; setQuery(e.target.value); if (view !== 'explore') { setView('explore'); location.hash = 'explore'; setCategory('All courses'); } }}/>{query ? <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button> : <kbd>⌘ K</kbd>}</div><div className="notification-wrap"><button className={`icon-button notification-button ${notifications ? 'is-active' : ''}`} aria-label="Learning updates" aria-expanded={notifications} onClick={() => setNotifications(v => !v)}><Bell size={19}/></button>{notifications && <div className="notification-popover"><span className="eyebrow">A NOTE FOR YOU</span><h3>{activities ? 'You’re making progress!' : 'Your next discovery is waiting.'}</h3><p>{activities ? `You’ve completed ${activities} ${activities === 1 ? 'activity' : 'activities'} today. Every small step counts.` : `${courses.length} courses. New discoveries. Start a lesson and see where it takes you.`}</p><button className="text-button" onClick={() => navigate('learning')}>Visit my learning<ArrowRight size={14}/></button></div>}</div><span className="topbar-divider"/><button className="avatar" onClick={() => setModal({ type: 'profile' })} aria-label="Edit learner profile">{progress.name.charAt(0).toUpperCase()}</button></div></header>
        <main id="main-content"><div className="page-heading"><div><div className="greeting"><span className="greeting-spark"><Sparkles size={14}/></span>{progress.name === 'Learner' ? 'HELLO, CURIOUS MIND' : `HELLO, ${progress.name.toUpperCase()}`}</div><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div><button className="day-streak" onClick={() => navigate('achievements')}><Flame size={19}/><strong>{streak}</strong><span>day streak</span></button></div>
          {storageError && <div className="storage-warning" role="status">Your browser can’t save progress right now. You can still learn, but progress may be lost after refreshing.</div>}
          {serviceError && <div className="storage-warning" role="alert">{serviceError}<button className="text-button" onClick={refreshCatalog}>Retry course service</button></div>}
          <div className="account-access">{sessionLoading ? <span>Opening your account…</span> : user ? <><span>Signed in as {user.name}</span><button onClick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button></> : <><span>Save your learning across devices.</span><button onClick={() => setModal({ type: 'account' })}>Sign in / Create account</button></>}</div>
          {user && syncStatus && <p className={`sync-message ${syncStatus.startsWith('Saved') || syncStatus.startsWith('Saving') ? '' : 'sync-error'}`} role="status">{syncStatus}</p>}
          {view === 'creators' && <Creator user={user} onSession={acceptSession} onCatalogChange={refreshCatalog} onPreview={openCourse} onDirtyChange={onCreatorDirty} />}
          {view === 'overview' && <>
            <div className="hero-row"><section className="hero"><div className="hero-copy"><span className="hero-tag"><span/>SMALL STEPS. BIG DISCOVERIES.</span><h2>Big ideas start with<br/>a little <span>curiosity.</span></h2><p>Don’t just learn the answer.<br/>Discover the wonderful why behind it.</p><button className="button primary hero-button" onClick={() => openCourse(featured[0])}>{dashboardCourses.length ? 'Keep learning' : 'Find your first aha'}<ArrowRight size={17}/></button><div className="hero-footnote"><span className="tiny-avatars"><i>A</i><i>M</i><i>J</i></span><span>A space for every kind of curious.</span></div></div><HeroArt/></section>
              <section className="daily-goal-card"><div className="goal-heading"><span><Target size={17}/>Your daily goal</span><button className="icon-button" onClick={() => setModal({ type: 'profile' })} aria-label="Change daily goal"><Settings2 size={16}/></button></div><div className="goal-ring"><svg viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="57" fill="none" stroke="#eff0e8" strokeWidth="10"/><circle cx="70" cy="70" r="57" fill="none" stroke="#638463" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${Math.min(activities / progress.goal, 1) * 358} 358`} transform="rotate(-90 70 70)"/></svg><div><span className="goal-number">{Math.min(activities, progress.goal)}<small>/{progress.goal}</small></span><span>activities today</span></div><span className="ring-spark"><Sparkles size={18}/></span></div><h3>{activities >= progress.goal ? 'You did your thing!' : 'A little better, every day.'}</h3><p>{activities >= progress.goal ? 'Goal complete. Anything extra is a bonus.' : 'Just a few minutes can make a difference.'}</p><button className="goal-action" onClick={() => navigate('practice')}>{activities >= progress.goal ? 'Keep the momentum' : 'Let’s make it happen'}<ArrowRight size={16}/></button></section>
            </div>
            <section className="courses-section"><div className="section-heading"><div><h2>{dashboardCourses.length ? 'Pick up where you left off' : 'Find your next fascination'}<span className="heading-dot">.</span></h2><p>{dashboardCourses.length ? 'Your next discovery is just one lesson away.' : 'A few good places to start. A whole world to explore.'}</p></div><button className="text-button" onClick={() => navigate(dashboardCourses.length ? 'learning' : 'explore')}>{dashboardCourses.length ? 'My learning' : 'View all courses'}<ArrowRight size={16}/></button></div>{!dashboardCourses.length && <div className="category-tabs" aria-label="Filter featured courses">{categories.slice(0, 5).map(cat => <button key={cat} className={category === cat ? 'active' : ''} aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</button>)}</div>}<div className="course-grid">{(dashboardCourses.length ? featured : category === 'All courses' ? courses.slice(0, 3) : courses.filter(c => c.category === category).slice(0, 3)).map(c => <CourseCard key={c.id} course={c} progress={progress} onOpen={openCourse}/>)}</div></section>
            <div className="bottom-row"><section className="challenge-banner"><div className="challenge-illustration"><Lightbulb size={34} strokeWidth={1.3}/><span className="mini-star">✦</span></div><div><span className="eyebrow">THE DAILY BRAIN STRETCH</span><h3>Good things come to curious minds.</h3><p>One little challenge. One fresh way to think.</p></div><button className="button outline" onClick={() => setModal({ type: 'challenge' })}>{progress.dailyChallenges.includes(today) ? 'Review challenge' : 'Give it a try'}<ArrowUpRight size={16}/></button></section><div className="learning-note"><span><Sprout size={22}/></span><p>“The beautiful thing about learning is that nobody can take it away from you.”</p><small>— B. B. King</small></div></div>
          </>}
          {view === 'explore' && <><section className="explore-intro"><div><Compass size={25}/><span>There’s a whole world in here.</span></div><p>{courses.length} thoughtful courses · {courses.reduce((n, c) => n + c.lessons.length, 0)} hands-on lessons · Always free to explore</p></section><div className="catalog-toolbar"><div className="category-tabs" aria-label="Course category">{categories.slice(0, 5).map(cat => <button key={cat} className={category === cat ? 'active' : ''} aria-pressed={category === cat} onClick={() => setCategory(cat)}>{cat}</button>)}</div><label className="subject-select"><span className="sr-only">Choose a subject</span><select aria-label="Choose a subject" value={category} onChange={e => setCategory(e.target.value)}>{categories.map(cat => <option key={cat}>{cat}</option>)}</select></label><label className="sort-select"><span className="sr-only">Sort courses</span><select aria-label="Sort courses" value={sort} onChange={e => setSort(e.target.value)}><option>Recommended</option><option>Shortest first</option><option>A–Z</option></select><ChevronDown size={14}/></label></div><div className="catalog-results"><span>{filtered.length} {filtered.length === 1 ? 'course' : 'courses'}{query && <> for <strong>“{query}”</strong></>}</span>{(query || category !== 'All courses') && <button className="text-button" onClick={() => { setQuery(''); setCategory('All courses'); }}>Clear filters<X size={13}/></button>}</div>{filtered.length ? <div className="course-grid">{filtered.map(c => <CourseCard key={c.id} course={c} progress={progress} onOpen={openCourse}/>)}</div> : <div className="empty-state"><span><Search size={30}/></span><h2>No discoveries here just yet.</h2><p>Try a different word or explore all our courses.</p><button className="button primary" onClick={() => { setQuery(''); setCategory('All courses'); }}>Explore all courses<ArrowRight size={16}/></button></div>}</>}
          {view === 'learning' && <><div className="learning-stats"><div><span className="stat-icon green"><BookOpen size={23}/></span><span><strong>{enrolledCourses.length}</strong><small>courses started</small></span></div><div><span className="stat-icon purple"><CheckCheck size={23}/></span><span><strong>{totalDone}</strong><small>lessons completed</small></span></div><div><span className="stat-icon orange"><Trophy size={23}/></span><span><strong>{completedCourses}</strong><small>courses completed</small></span></div></div><div className="section-heading learning-section-heading"><h2>Your learning collection<span className="heading-dot">.</span></h2></div><div className="category-tabs" aria-label="Filter my learning">{['In progress', 'Completed', 'All courses'].map(f => <button key={f} className={learningFilter === f ? 'active' : ''} aria-pressed={learningFilter === f} onClick={() => setLearningFilter(f)}>{f}</button>)}</div>{learningCourses.length ? <div className="course-grid">{learningCourses.map(c => <CourseCard key={c.id} course={c} progress={progress} onOpen={openCourse}/>)}</div> : <div className="empty-state"><span><Bookmark size={31}/></span><h2>{learningFilter === 'Completed' ? 'Your first finish line is ahead.' : 'Your next chapter is unwritten.'}</h2><p>{learningFilter === 'Completed' ? 'Finish every lesson in a course to see it here. Small steps get you there.' : 'Start any course and it’ll find a home right here. What are you curious about?'}</p><button className="button primary" onClick={() => navigate('explore')}>Find something to learn<ArrowRight size={16}/></button></div>}</>}
          {view === 'practice' && <><section className="practice-feature"><div className="practice-copy"><span className="hero-tag"><span/>A FRESH CHALLENGE, EVERY DAY</span><h2>Stretch your mind.<br/>Surprise yourself.</h2><p>{challenge.question}</p><button className="button primary" onClick={() => setModal({ type: 'challenge' })}>{progress.dailyChallenges.includes(today) ? 'Review today’s challenge' : 'Take today’s challenge'}<ArrowRight size={17}/></button><span className="practice-time"><Clock3 size={14}/>About 2 minutes · No pressure</span></div><div className="practice-decoration"><Lightbulb size={90} strokeWidth={.8}/><span className="practice-star">✦</span><span className="practice-small-star">✧</span></div></section>{progress.dailyChallenges.includes(today) && <div className="completion-notice"><CheckCheck size={21}/><div><strong>Today’s challenge? Done.</strong><span>A new challenge arrives tomorrow. Keep exploring in the meantime.</span></div></div>}<div className="section-heading practice-section-heading"><div><h2>Keep those ideas fresh<span className="heading-dot">.</span></h2><p>A quick lesson is a great way to build a lasting skill.</p></div></div><div className="course-grid">{courses.slice(0, 3).map(c => <CourseCard key={c.id} course={c} progress={progress} onOpen={openCourse}/>)}</div></>}
          {view === 'achievements' && <><section className="achievements-intro"><div className="achievement-big-icon"><Trophy size={43} strokeWidth={1.4}/></div><h2>Progress is a collection<br/>of little moments.</h2><p>You’ve made {totalDone} {totalDone === 1 ? 'discovery' : 'discoveries'} so far. Here’s to your next one.</p></section><div className="badge-grid">{[{ title: 'First spark', text: 'Complete your very first lesson.', icon: Sparkles, unlocked: totalDone >= 1, color: 'purple' }, { title: 'Curiosity in motion', text: 'Complete five different lessons.', icon: Compass, unlocked: totalDone >= 5, color: 'green' }, { title: 'A beautiful habit', text: 'Learn three days in a row.', icon: Flame, unlocked: streak >= 3, color: 'orange' }, { title: 'Chapter complete', text: 'Finish every lesson in a course.', icon: GraduationCap, unlocked: completedCourses >= 1, color: 'blue' }, { title: 'Brain stretcher', text: 'Solve your first daily challenge.', icon: Lightbulb, unlocked: progress.dailyChallenges.length >= 1, color: 'yellow' }, { title: 'Wonderfully rounded', text: 'Complete a lesson in three courses.', icon: Sprout, unlocked: courses.filter(c => courseCompleted(progress, c) > 0).length >= 3, color: 'pink' }].map(({ title, text, icon: Icon, unlocked, color }) => <article className={`badge-card ${unlocked ? 'unlocked' : ''}`} key={title}><span className={`badge-medal ${color}`}><Icon size={34} strokeWidth={1.5}/></span><span className="badge-state">{unlocked ? <><Check size={12}/>Earned</> : 'Yet to discover'}</span><h3>{title}</h3><p>{text}</p></article>)}</div></>}
          <footer className="main-footer"><span><BrandMark small/>A little more curious. A little more you.</span><button onClick={() => setModal({ type: 'help' })}>Learning is for everyone<ArrowUpRight size={13}/></button></footer>
        </main>
      </div>
    </div>
    </>}
    {modal?.type === 'course' && <CourseModal course={modal.course} progress={modal.course.preview ? emptyProgress() : progress} enroll={modal.course.preview ? () => {} : enroll} finish={modal.course.preview ? () => {} : finish} close={close}/>}
    {modal?.type === 'account' && <Modal title="Your Curio account" onClose={close}><Account onSession={acceptSession} /></Modal>}
    {modal?.type === 'profile' && <ProfileModal progress={progress} update={setProgress} close={close}/>}
    {modal?.type === 'challenge' && <Modal wide title="Today’s brain stretch" onClose={close}><div className="challenge-dialog"><span className="challenge-dialog-icon"><Lightbulb size={29}/></span><div className="challenge-dialog-heading"><span className="eyebrow">THE DAILY BRAIN STRETCH</span><span>{new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span></div><Quiz question={challenge} completed={progress.dailyChallenges.includes(today)} buttonLabel="Save my discovery" onComplete={() => { setProgress(p => completeChallenge(p, today)); close(); }}/></div></Modal>}
    {modal?.type === 'help' && <Modal title="A little help" onClose={close}><div className="help-dialog"><span className="dialog-icon"><CircleHelp size={27}/></span><span className="eyebrow">WELCOME TO CURIO</span><h2>Learning starts with wondering.</h2><p>Curio makes big ideas approachable with short explanations, concrete examples, and questions you can actually try.</p><div className="help-step"><span>1</span><div><strong>Follow a spark</strong><p>Browse {courses.length} courses across {categories.length - 1} subjects, from mathematics and science to design and languages.</p></div></div><div className="help-step"><span>2</span><div><strong>Learn by doing</strong><p>Read an idea, explore the example, and check your answer. Retry as often as you like.</p></div></div><div className="help-step"><span>3</span><div><strong>Watch yourself grow</strong><p>Build a daily habit, track your lessons, and earn achievements along the way.</p></div></div><div className="help-privacy"><Bookmark size={18}/><p>Guest progress is saved in this browser. Sign in to save progress to your account and continue on another device. Clearing browser data removes guest progress.</p></div><button className="button primary full-width" onClick={() => { close(); navigate('explore'); }}>Let’s explore<ArrowRight size={17}/></button></div></Modal>}
  </>;
}
