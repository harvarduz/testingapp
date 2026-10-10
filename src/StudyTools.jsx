import React, { useState } from 'react';
import { ArrowRight, BookOpen, Check, Link, NotebookPen } from 'lucide-react';

export function CourseShare({ course }) {
  const [message, setMessage] = useState('');
  const link = new URL(location.pathname, location.origin);
  link.hash = `course=${encodeURIComponent(course.id)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link.href); setMessage('Link copied'); }
    catch { setMessage('Select the link below to copy it.'); }
  };
  return <div className="course-share"><button className="text-button" onClick={copy}><Link size={16} />{message === 'Link copied' ? 'Link copied' : 'Copy course link'}</button>{message && <span className="share-status" role="status">{message === 'Link copied' ? <Check size={15} /> : <input aria-label="Course sharing link" readOnly value={link.href} onFocus={event => event.target.select()} />}</span>}</div>;
}

export function LessonNotes({ course, index, progress, onChange, signedIn, syncStatus, storageError }) {
  const key = `${course.id}:${index}`;
  const text = progress.notes?.[key]?.text || '';
  const status = signedIn ? syncStatus || 'Your notes sync with your account.' : storageError ? 'Browser storage is unavailable. These notes may be lost after refreshing.' : 'Saved in this browser. Sign in to keep notes across devices.';
  return <details className="lesson-notes"><summary><NotebookPen size={18} /><span>Your notes</span><small>{text ? storageError && !signedIn ? 'Storage unavailable' : 'Note saved' : 'Private to you'}</small></summary><div><label htmlFor="lesson-note">What do you want to remember?</label><textarea id="lesson-note" value={text} rows={4} maxLength={2000} placeholder="An explanation in your own words, a useful example, or a question to come back to." onChange={event => onChange(course.id, index, event.target.value)} /><div className="notes-caption"><span aria-live="polite">{status}</span><span>{text.length}/2000</span></div></div></details>;
}

export function ReviewQueue({ courses, progress, onOpen }) {
  const lessons = courses.flatMap(course => course.lessons.map((lesson, index) => ({ course, lesson, index })).filter(item => progress.completed[course.id]?.includes(item.index)));
  if (!lessons.length) return null;
  return <section className="review-queue" aria-labelledby="review-title"><div className="section-heading"><div><h2 id="review-title">Review what you’ve learned</h2><p>Return to a completed lesson. Reviews won’t change your completion totals.</p></div><span>{lessons.length} lessons available</span></div><div className="review-list">{lessons.slice(-6).reverse().map(({ course, lesson, index }) => <button key={`${course.id}:${index}`} onClick={() => onOpen(course, index)}><span className={`review-icon ${course.color}`}><BookOpen size={20} /></span><span><strong>{lesson.title}</strong><small>{course.title}</small></span><ArrowRight size={18} /></button>)}</div></section>;
}
