import React, { Component, Suspense, lazy, useId, useState } from 'react';
import { ArrowRight, FlaskConical, ExternalLink } from 'lucide-react';
import { getLessonStudy, reasoningCases } from './lessonStudies.js';
import './lesson-study.css';

const InteractiveExperiment = lazy(() => import('./InteractiveExperiment.jsx'));

export class LessonStudyBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <aside className="study-load-error" role="status"><p>The interactive material could not load. Your lesson and progress are still available.</p><button className="button outline" onClick={() => window.location.reload()}>Reload interactive material</button></aside> : this.props.children;
  }
}

function ReasoningCase({ task }) {
  const id = useId();
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  return <section className="reasoning-case" aria-labelledby={id}>
    <h4 id={id}>Make the reasoning yours</h4><p>{task.prompt}</p>
    <div className="reasoning-options" role="group" aria-label="Reasoning choices">{task.options.map((option, index) => <button key={option} aria-pressed={selected === index} onClick={() => { setSelected(index); setChecked(false); }}>{option}</button>)}</div>
    <button className="button primary" disabled={selected === null || checked} onClick={() => setChecked(true)}>Check reasoning<ArrowRight size={16} /></button>
    {checked && <div className="study-feedback" role="status"><strong>{selected === task.answer ? 'Your reasoning holds.' : 'Revisit this part.'}</strong><p>{task.feedback[selected]}</p>{selected === task.answer && <p><strong>Take it further:</strong> {task.extension}</p>}</div>}
    <small>This is a learning discussion. Complete the lesson check to record progress.</small>
  </section>;
}

export default function LessonStudy({ course, lessonIndex }) {
  const study = getLessonStudy(course, lessonIndex);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  if (!study) return null;
  const task = study.sections.length && reasoningCases[course.id];
  return <section className="lesson-study" aria-labelledby={titleId}>
    <div className="lesson-study-heading"><span className="eyebrow">DEEPER UNDERSTANDING</span><h3 id={titleId}>{study.title}</h3></div>
    {study.sections.map(part => <section className="study-reading" key={part.title}><h4>{part.title}</h4><p>{part.text}</p></section>)}
    {study.experiment && <>
      <button className="button primary study-open" aria-expanded={open} aria-controls={`${titleId}-experiment`} onClick={() => setOpen(value => !value)}><FlaskConical size={18} />{open ? 'Close experiment' : 'Open interactive experiment'}</button>
      <div id={`${titleId}-experiment`} hidden={!open}>{open && <LessonStudyBoundary><Suspense fallback={<p role="status">Loading the interactive model…</p>}><InteractiveExperiment kind={study.experiment} /></Suspense></LessonStudyBoundary>}</div>
      <p className="study-session-note">Experiment freely. Exploration does not mark the lesson complete or award coins. Closing resets the model.</p>
    </>}
    {task && <ReasoningCase task={task} />}
    {study.url && <a className="study-source" href={study.url} target="_blank" rel="noopener noreferrer">Read further: {study.source}<ExternalLink size={14} /><span className="sr-only"> (opens in a new tab)</span></a>}
  </section>;
}
