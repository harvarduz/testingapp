import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Download, Eye, FileUp, Globe, Plus, Save, Trash2 } from 'lucide-react';
import Account from './Account.jsx';
import { api, downloadJson } from './api.js';
import { categories, courses } from './data.js';
import { colors, artTypes, emptyCourse, emptyLesson, normalizeCourse, publicationIssues } from '../shared/course.js';
import { CourseArt } from './Art.jsx';
import './marketplace.css';

function Offer() {
  return <div className="creator-offer"><span className="creator-offer-icon"><Globe size={22} /></span><div><strong>Publish your own courses.</strong><p>Course publishing is free for a limited time. No card needed.</p></div><span className="offer-price">$0<span>publishing fee</span></span></div>;
}

function CourseEditor({ initial, onBack, onSaved, onPreview, onDirtyChange }) {
  const [course, setCourse] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [leavePending, setLeavePending] = useState(false);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const update = values => { setCourse(c => ({ ...c, ...values })); setDirty(true); setMessage(''); setIssues([]); };
  const updateLesson = (index, values) => update({ lessons: course.lessons.map((lesson, i) => i === index ? { ...lesson, ...values } : lesson) });
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async publish => {
    setError(''); setMessage(''); setBusy(true);
    try {
      const content = normalizeCourse(course, categories.slice(1));
      const missing = publish ? publicationIssues(content) : [];
      setIssues(missing);
      if (missing.length) return;
      const result = await api(`/creator/courses${course.id ? '/' + course.id : ''}`, { method: course.id ? 'PUT' : 'POST', body: content });
      let saved = result.course;
      // Retain the id if publishing fails after the draft was saved.
      setCourse(saved); setDirty(false); onSaved();
      if (publish) {
        await api(`/creator/courses/${saved.id}/publish`, { method: 'POST', body: {} });
        saved = { ...saved, status: 'published', everPublished: true };
        setCourse(saved); onSaved();
      }
      setMessage(publish ? 'Published. Students can now find your course in Explore courses.' : saved.status === 'published' ? 'Changes saved. Your published course is up to date.' : 'Draft saved. It is only visible in your workspace.');
    } catch (error) { setError(error.message); }
    finally { setBusy(false); }
  };
  const preview = () => {
    try {
      const normalized = normalizeCourse(course, categories.slice(1));
      const missing = publicationIssues(normalized);
      setIssues(missing);
      if (!missing.length) onPreview({ ...normalized, id: course.id || 'creator-preview', preview: true });
    } catch (error) { setError(error.message); }
  };
  return <section className="course-editor" aria-label="Course editor">
    <div className="editor-top"><button className="text-button" onClick={() => dirty ? setLeavePending(true) : onBack()}><ArrowLeft size={17} />Your courses</button><span className={`status-pill ${course.status === 'published' ? 'published' : ''}`}>{course.status === 'published' ? 'Published' : 'Private draft'}{dirty ? ' · Unsaved changes' : ''}</span></div>
    {leavePending && <div className="editor-leave" role="alert"><span>You have unsaved changes.</span><button className="text-button" onClick={() => setLeavePending(false)}>Keep editing</button><button className="text-button" onClick={onBack}>Discard changes</button></div>}
    <div className="editor-heading"><div><span className="eyebrow">SHARE WHAT YOU KNOW</span><h2>{course.id ? 'Edit your course.' : 'Create a course.'}</h2><p>Explain it clearly, show an example, then let your students try.</p></div><button className="button outline" onClick={preview} disabled={busy}><Eye size={17} />Preview lesson</button></div>
    <form onSubmit={e => { e.preventDefault(); save(false); }}>
      <fieldset disabled={busy} className="editor-details">
        <legend>Course details</legend>
        <label className="editor-wide">Course title<input value={course.title} onChange={e => update({ title: e.target.value })} maxLength={100} placeholder="What will students discover?" /></label>
        <label className="editor-wide">Short description<textarea value={course.description} onChange={e => update({ description: e.target.value })} maxLength={500} rows={3} placeholder="Who is this for, and what will they learn?" /></label>
        <label>Subject<select value={course.category} onChange={e => update({ category: e.target.value })}>{categories.slice(1).map(category => <option key={category}>{category}</option>)}</select></label>
        <label>Level<select value={course.level} onChange={e => update({ level: e.target.value })}>{['Beginner', 'Intermediate', 'Advanced', 'All levels'].map(level => <option key={level}>{level}</option>)}</select></label>
        <label>Estimated minutes<input type="number" min={1} max={600} value={course.minutes} onChange={e => update({ minutes: Number(e.target.value) })} /></label>
        <label>Illustration<select value={course.art} onChange={e => update({ art: e.target.value })}>{artTypes.map(art => <option key={art} value={art}>{art[0].toUpperCase() + art.slice(1)}</option>)}</select></label>
        <div className="editor-wide editor-colors"><span>Cover color</span><div>{colors.map(color => <button type="button" key={color} aria-label={`${color} cover`} aria-pressed={course.color === color} className={`cover-swatch ${color}`} onClick={() => update({ color })}>{course.color === color && <Check size={17} />}</button>)}</div></div>
      </fieldset>
      <div className="editor-lessons-heading"><h3>The learning journey</h3><span>{course.lessons.length}/50 lessons</span></div>
      {course.everPublished && <p className="editor-tip">Published lesson positions stay fixed to protect students’ progress. You can improve their content and add new lessons at the end.</p>}
      {course.lessons.map((lesson, index) => <details className="editor-lesson" key={index} open={course.lessons.length === 1 ? true : undefined}>
        <summary><span className="editor-lesson-number">{index + 1}</span><span>{lesson.title || 'Untitled lesson'}</span><ChevronDown size={17} /></summary>
        <fieldset disabled={busy}>
          <legend className="sr-only">Lesson {index + 1} content</legend>
          <label>Lesson title<input aria-label={`Lesson ${index + 1} title`} value={lesson.title} onChange={e => updateLesson(index, { title: e.target.value })} maxLength={100} /></label>
          <label>The idea<textarea aria-label={`Lesson ${index + 1} idea`} value={lesson.idea} onChange={e => updateLesson(index, { idea: e.target.value })} rows={4} maxLength={5000} placeholder="Explain one idea in plain language." /></label>
          <label>A useful example<textarea aria-label={`Lesson ${index + 1} example`} value={lesson.example} onChange={e => updateLesson(index, { example: e.target.value })} rows={4} maxLength={5000} placeholder="Show how the idea works in a specific situation." /></label>
          <label>Quiz question<input aria-label={`Lesson ${index + 1} question`} value={lesson.question} onChange={e => updateLesson(index, { question: e.target.value })} maxLength={500} /></label>
          <fieldset className="editor-answers"><legend>Four answer options</legend>{lesson.options.map((option, optionIndex) => <label key={optionIndex}>Option {optionIndex + 1}<input aria-label={`Lesson ${index + 1} option ${optionIndex + 1}`} value={option} onChange={e => updateLesson(index, { options: lesson.options.map((v, i) => i === optionIndex ? e.target.value : v) })} maxLength={300} /></label>)}</fieldset>
          <label>Correct answer<select aria-label={`Lesson ${index + 1} correct answer`} value={lesson.answer} onChange={e => updateLesson(index, { answer: Number(e.target.value) })}>{lesson.options.map((option, i) => <option key={i} value={i}>Option {i + 1}{option && ` — ${option}`}</option>)}</select></label>
          <label>Why that answer is right<textarea aria-label={`Lesson ${index + 1} answer explanation`} value={lesson.explanation} onChange={e => updateLesson(index, { explanation: e.target.value })} rows={3} maxLength={3000} placeholder="Help students understand, whether their answer was right or wrong." /></label>
          {course.lessons.length > 1 && (!course.everPublished || index >= initial.lessons.length) && <button type="button" className="text-button danger" onClick={() => update({ lessons: course.lessons.filter((_, i) => i !== index) })}><Trash2 size={15} />Remove lesson {index + 1}</button>}
        </fieldset>
      </details>)}
      <button type="button" className="button outline" disabled={busy || course.lessons.length >= 50} onClick={() => update({ lessons: [...course.lessons, emptyLesson()] })}><Plus size={17} />Add a lesson</button>
      {issues.length > 0 && <div className="publication-issues" role="alert"><strong>A few things to finish before publishing:</strong><ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {message && <p className="form-message success" role="status">{message}</p>}
      <div className="editor-actions"><span><Check size={15} />Free publishing · Limited-time offer</span><div><button type="submit" className="button outline" disabled={busy}><Save size={16} />{busy ? 'Saving…' : course.status === 'published' ? 'Save changes' : 'Save draft'}</button><button type="button" className="button primary" disabled={busy} onClick={() => save(true)}><Globe size={16} />{course.status === 'published' ? 'Save & publish' : 'Publish for free'}</button></div></div>
    </form>
  </section>;
}

export default function Creator({ user, onSession, onCatalogChange, onPreview, onDirtyChange }) {
  const [ownCourses, setOwnCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const upload = useRef(null);
  const load = async () => {
    if (!user) return;
    setLoading(true);
    try { setOwnCourses((await api('/creator/courses')).courses); setError(''); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [user?.id]); // A new session always reloads the owner's workspace.
  const refresh = () => { load(); onCatalogChange(); };
  const importFile = async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Choose a course JSON file smaller than 1 MB.');
      const content = normalizeCourse(JSON.parse(await file.text()), categories.slice(1));
      setEditing({ ...content, status: 'draft' }); setError('');
    } catch (error) { setError(error instanceof SyntaxError ? 'The file is not valid JSON. Download our template to get started.' : error.message); }
  };
  const changeStatus = async (course, action) => {
    setBusy(course.id); setError('');
    try {
      await api(`/creator/courses/${course.id}${action === 'delete' ? '' : '/' + action}`, { method: action === 'delete' ? 'DELETE' : 'POST', body: action === 'delete' ? undefined : {} });
      setDeletePending(null); refresh();
    } catch (error) { setError(error.message); }
    finally { setBusy(null); }
  };
  return <div className="creator-workspace">
    <Offer />
    {!user ? <div className="creator-welcome"><div><span className="eyebrow">THE CREATOR WORKSPACE</span><h2>Teach what you know.</h2><p>Build a short course around it. Start with one useful idea, add an example and a quiz, and publish it for other curious minds.</p><ul><li><Check size={16} />Write lessons in the course editor</li><li><Check size={16} />Upload a course as a JSON file</li><li><Check size={16} />Preview, save drafts, and publish</li><li><Check size={16} />Keep ownership of your course content</li></ul><p className="creator-tip">Create an account to keep your drafts private and your published courses attributed to you.</p></div><Account onSession={onSession} /></div>
    : editing ? <CourseEditor key={editing.id || 'new'} initial={editing} onBack={() => setEditing(null)} onSaved={refresh} onPreview={onPreview} onDirtyChange={onDirtyChange} />
    : <>
      <div className="creator-list-heading"><div><h2>Your courses.</h2><p>Private drafts stay here. Published courses appear in the student catalog.</p></div><button className="button primary" onClick={() => setEditing({ ...emptyCourse(), status: 'draft' })}><Plus size={17} />Create a course</button></div>
      <div className="creator-import"><div><FileUp size={22} /><span><strong>Already have your course written?</strong><small>Upload a JSON file, review it in the editor, then publish. Up to 1 MB.</small></span></div><div><button className="text-button" onClick={() => downloadJson({ ...courses[0], id: undefined, title: 'My first course' }, 'curio-course-template.json')}><Download size={16} />Download template</button><button className="button outline" onClick={() => upload.current.click()}><FileUp size={16} />Upload course</button><input ref={upload} className="sr-only" type="file" accept=".json,application/json" aria-label="Upload course JSON" onChange={importFile} /></div></div>
      {error && <div className="form-message error" role="alert">{error}<button className="text-button" onClick={load}>Try again</button></div>}
      {loading ? <p role="status" className="creator-loading">Opening your workspace…</p> : !ownCourses.length && !error ? <div className="creator-empty"><span><BookOpen size={33} /></span><h3>Your workspace is ready.</h3><p>Create a course or upload our template. Drafts stay private until you publish them.</p><button className="text-button" onClick={() => setEditing({ ...emptyCourse(), status: 'draft' })}>Start a first draft<ArrowRight size={17} /></button></div> : <div className="creator-course-list">{ownCourses.map(course => <article key={course.id} className="creator-course-row"><div className={`creator-course-cover ${course.color}`}><CourseArt type={course.art} /></div><div className="creator-course-row-copy"><span className={`status-pill ${course.status === 'published' ? 'published' : ''}`}>{course.status === 'published' ? 'Published' : 'Private draft'}</span><h3>{course.title || 'Untitled course'}</h3><p>{course.category} · {course.lessons.length} lessons</p></div><div className="creator-row-actions"><button className="button outline" disabled={busy === course.id} onClick={() => setEditing(course)}>Edit course</button>{course.status === 'published' ? <button className="text-button" disabled={busy === course.id} onClick={() => changeStatus(course, 'unpublish')}>Unpublish</button> : <button className="text-button" disabled={busy === course.id} onClick={() => changeStatus(course, 'publish')}>Publish for free</button>}{!course.everPublished && (deletePending === course.id ? <div className="delete-confirm"><span>Delete draft?</span><button disabled={busy === course.id} onClick={() => changeStatus(course, 'delete')}>Delete</button><button onClick={() => setDeletePending(null)}>Keep</button></div> : <button className="creator-delete" aria-label={`Delete ${course.title || 'untitled course'}`} onClick={() => setDeletePending(course.id)}><Trash2 size={16} /></button>)}</div></article>)}</div>}
    </>}
  </div>;
}
