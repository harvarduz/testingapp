import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronDown, Download, Eye, FileUp, Globe, Plus, Save, Trash2 } from 'lucide-react';
import Account from './Account.jsx';
import { api, downloadJson } from './api.js';
import { categories, courses } from './data.js';
import { colors, artTypes, emptyCourse, emptyLesson, normalizeCourse, publicationIssues } from '../shared/course.js';
import { CourseArt } from './Art.jsx';
import './marketplace.css';
import LessonExtensionEditor from './LessonExtensionEditor.jsx';
import SelectField from './SelectField.jsx';
import ActionPending from './ActionPending.jsx';

function Offer() {
  return <div className="creator-offer"><span className="creator-offer-icon"><Globe size={22} /></span><div><strong>Publish your own courses.</strong><p>Course publishing is free for a limited time. No card needed.</p></div><span className="offer-price">$0<span>publishing fee</span></span></div>;
}

function CourseEditor({ initial, onBack, onSaved, onPreview, onDirtyChange }) {
  const [course, setCourse] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [saveAction, setSaveAction] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [issues, setIssues] = useState([]);
  const [dirty, setDirty] = useState(Boolean(initial.imported));
  const [leavePending, setLeavePending] = useState(false);
  const [validationAction, setValidationAction] = useState('publishing');
  const editor = useRef(null);
  const validation = useRef(null);
  const errorMessage = useRef(null);
  const titleInput = useRef(null);
  const backButton = useRef(null);
  const keepEditingButton = useRef(null);
  const pendingLessonFocus = useRef(null);
  const saving = useRef(false);
  const protectedLessons = useRef(initial.everPublished ? initial.lessons.length : 0);
  useLayoutEffect(() => { titleInput.current?.focus(); }, []);
  useLayoutEffect(() => {
    if (pendingLessonFocus.current === null) return;
    const lesson = editor.current.querySelectorAll('.editor-lesson')[pendingLessonFocus.current];
    pendingLessonFocus.current = null;
    if (lesson) { lesson.open = true; lesson.querySelector('input')?.focus(); }
  }, [course.lessons.length]);
  useLayoutEffect(() => { if (issues.length) validation.current?.focus(); }, [issues]);
  useLayoutEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  useLayoutEffect(() => { if (leavePending) keepEditingButton.current?.focus(); }, [leavePending]);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const update = values => { setCourse(c => ({ ...c, ...values })); setDirty(true); setMessage(''); setError(''); setIssues([]); };
  const updateLesson = (index, values) => update({ lessons: course.lessons.map((lesson, i) => i === index ? { ...lesson, ...values } : lesson) });
  useEffect(() => {
    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const save = async publish => {
    if (saving.current) return;
    saving.current = true;
    setError(''); setMessage(''); setSaveAction(publish ? 'publish' : 'save'); setBusy(true);
    try {
      const content = normalizeCourse({ ...course, minutes: Number(course.minutes) }, categories.slice(1));
      const missing = publish || course.status === 'published' ? publicationIssues(content) : [];
      setValidationAction(publish ? 'publishing' : 'saving this published course');
      setIssues(missing);
      if (missing.length) return;
      const result = await api(`/creator/courses${course.id ? '/' + course.id : ''}`, { method: course.id ? 'PUT' : 'POST', body: content });
      let saved = result.course;
      if (saved.everPublished) protectedLessons.current = saved.lessons.length;
      // Retain the id if publishing fails after the draft was saved.
      setCourse(saved); setDirty(false); onSaved();
      if (publish) {
        await api(`/creator/courses/${saved.id}/publish`, { method: 'POST', body: {} });
        saved = { ...saved, status: 'published', everPublished: true };
        protectedLessons.current = saved.lessons.length;
        setCourse(saved); onSaved();
      }
      setMessage(publish ? 'Published. Students can now find your course in Explore courses.' : saved.status === 'published' ? 'Changes saved. Your published course is up to date.' : 'Draft saved. It is only visible in your workspace.');
    } catch (error) { setError(error.message); }
    finally { saving.current = false; setBusy(false); setSaveAction(null); }
  };
  const preview = () => {
    setError(''); setMessage(''); setValidationAction('previewing');
    try {
      const normalized = normalizeCourse({ ...course, minutes: Number(course.minutes) }, categories.slice(1));
      const missing = publicationIssues(normalized);
      setIssues(missing);
      if (!missing.length) onPreview({ ...normalized, id: course.id || 'creator-preview', preview: true });
    } catch (error) { setError(error.message); }
  };
  return <section className="course-editor" aria-label="Course editor" ref={editor}>
    <div className="editor-top"><button ref={backButton} className="text-button" disabled={busy} onClick={() => dirty ? setLeavePending(true) : onBack()}><ArrowLeft size={17} />Your courses</button><span className={`status-pill ${course.status === 'published' ? 'published' : ''}`}>{course.status === 'published' ? 'Published' : 'Private draft'}{dirty ? ' · Unsaved changes' : ''}</span></div>
    {leavePending && <div className="editor-leave" role="alert"><span>You have unsaved changes.</span><button ref={keepEditingButton} className="text-button" onClick={() => { setLeavePending(false); backButton.current?.focus(); }}>Keep editing</button><button className="text-button" onClick={onBack}>Discard changes</button></div>}
    <div className="editor-heading"><div><span className="eyebrow">SHARE WHAT YOU KNOW</span><h2>{course.id ? 'Edit your course.' : 'Create a course.'}</h2><p>Explain it clearly, show an example, then let your students try.</p></div><button className="button outline" onClick={preview} disabled={busy}><Eye size={17} />Preview lesson</button></div>
    {issues.length > 0 && <div className="publication-issues" role="alert" tabIndex={-1} ref={validation}><strong>A few things to finish before {validationAction}:</strong><ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
    {error && <p className="form-message error" role="alert" tabIndex={-1} ref={errorMessage}>{error}</p>}
    <form aria-busy={busy} onSubmit={e => { e.preventDefault(); save(false); }}>
      <fieldset disabled={busy} className="editor-details">
        <legend>Course details</legend>
        <label className="editor-wide">Course title<input ref={titleInput} value={course.title} onChange={e => update({ title: e.target.value })} maxLength={100} placeholder="What will students discover?" /></label>
        <label className="editor-wide">Short description<textarea value={course.description} onChange={e => update({ description: e.target.value })} maxLength={500} rows={3} placeholder="Who is this for, and what will they learn?" /></label>
        <SelectField label="Subject" value={course.category} onChange={category => update({ category })} options={categories.slice(1)} disabled={busy} />
        <SelectField label="Level" value={course.level} onChange={level => update({ level })} options={['Beginner', 'Intermediate', 'Advanced', 'All levels']} disabled={busy} />
        <label>Estimated minutes<input type="number" min={1} max={600} required value={course.minutes} onChange={e => update({ minutes: e.target.value })} /></label>
        <SelectField label="Illustration" value={course.art} onChange={art => update({ art })} options={artTypes.map(art => ({ value: art, label: art[0].toUpperCase() + art.slice(1) }))} disabled={busy} />
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
          <SelectField label="Correct answer" aria-label={`Lesson ${index + 1} correct answer`} value={String(lesson.answer)} onChange={answer => updateLesson(index, { answer: Number(answer) })} options={lesson.options.map((option, i) => ({ value: String(i), label: `Option ${i + 1}${option ? ` — ${option}` : ''}` }))} disabled={busy} />
          <label>Why that answer is right<textarea aria-label={`Lesson ${index + 1} answer explanation`} value={lesson.explanation} onChange={e => updateLesson(index, { explanation: e.target.value })} rows={3} maxLength={3000} placeholder="Help students understand, whether their answer was right or wrong." /></label>
          <LessonExtensionEditor lesson={lesson} index={index} onChange={values => updateLesson(index, values)} />
          {course.lessons.length > 1 && index >= protectedLessons.current && <button type="button" className="text-button danger" onClick={() => update({ lessons: course.lessons.filter((_, i) => i !== index) })}><Trash2 size={15} />Remove lesson {index + 1}</button>}
        </fieldset>
      </details>)}
      <button type="button" className="button outline" disabled={busy || course.lessons.length >= 50} onClick={() => { pendingLessonFocus.current = course.lessons.length; update({ lessons: [...course.lessons, emptyLesson()] }); }}><Plus size={17} />Add a lesson</button>
      {message && <p className="form-message success" role="status">{message}</p>}
      <div className="editor-actions"><span><Check size={15} />Free publishing · Limited-time offer</span><div><button type="submit" className="button outline" disabled={busy} aria-busy={busy && saveAction === 'save' || undefined}>{busy && saveAction === 'save' ? <ActionPending>{course.status === 'published' ? 'Saving changes…' : 'Saving draft…'}</ActionPending> : <><Save size={16} />{course.status === 'published' ? 'Save changes' : 'Save draft'}</>}</button><button type="button" className="button primary" disabled={busy} aria-busy={busy && saveAction === 'publish' || undefined} onClick={() => save(true)}>{busy && saveAction === 'publish' ? <ActionPending>Publishing…</ActionPending> : <><Globe size={16} />{course.status === 'published' ? 'Save & publish' : 'Publish for free'}</>}</button></div></div>
    </form>
  </section>;
}

export default function Creator({ user, onSession, onCatalogChange, onPreview, onDirtyChange }) {
  const [ownCourses, setOwnCourses] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorSource, setErrorSource] = useState(null);
  const [busy, setBusy] = useState(null);
  const [deletePending, setDeletePending] = useState(null);
  const [notice, setNotice] = useState('');
  const actionLock = useRef(false), loadRevision = useRef(0);
  const pendingActionFocus = useRef(null), keepDraft = useRef(null), listError = useRef(null);
  const upload = useRef(null);
  const listHeading = useRef(null);
  const restoreListFocus = useRef(false);
  const closeEditor = () => { restoreListFocus.current = true; setEditing(null); };
  useLayoutEffect(() => {
    if (!editing && restoreListFocus.current) { restoreListFocus.current = false; listHeading.current?.focus(); }
  }, [editing]);
  useLayoutEffect(() => { if (deletePending) { keepDraft.current?.focus({ preventScroll: true }); keepDraft.current?.scrollIntoView({ block: 'nearest' }); } }, [deletePending]);
  useLayoutEffect(() => {
    if (!pendingActionFocus.current || busy || loading || editing) return;
    const target = pendingActionFocus.current; pendingActionFocus.current = null;
    if (error) return;
    const row = [...document.querySelectorAll('[data-creator-course]')].find(node => node.dataset.creatorCourse === target.id);
    const control = row?.querySelector(target.keep ? '.creator-delete' : 'button:not(:disabled)') || listHeading.current;
    control?.focus({ preventScroll: true }); control?.scrollIntoView({ block: 'nearest' });
  }, [deletePending, busy, loading, editing, error]);
  useLayoutEffect(() => { if (error) listError.current?.focus(); }, [error]);
  const load = async () => {
    if (!user) return;
    const request = ++loadRevision.current;
    setLoading(true);
    try {
      const result = await api('/creator/courses');
      if (request === loadRevision.current) { setOwnCourses(result.courses); setError(''); }
    } catch (error) { if (request === loadRevision.current) { setError(error.message); setErrorSource('load'); } }
    finally { if (request === loadRevision.current) setLoading(false); }
  };
  useEffect(() => { load(); return () => { loadRevision.current += 1; }; }, [user?.id]);
  const refresh = () => { const loadingCourses = load(); onCatalogChange(); return loadingCourses; };
  const importFile = async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('Choose a course JSON file smaller than 1 MB.');
      const content = normalizeCourse(JSON.parse(await file.text()), categories.slice(1));
      setEditing({ ...content, status: 'draft', imported: true }); setError('');
    } catch (error) { setError(error instanceof SyntaxError ? 'The file is not valid JSON. Download our template to get started.' : error.message); setErrorSource('import'); }
  };
  const changeStatus = async (course, action) => {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy({ id: course.id, action }); setError(''); setNotice('');
    try {
      await api(`/creator/courses/${course.id}${action === 'delete' ? '' : '/' + action}`, { method: action === 'delete' ? 'DELETE' : 'POST', body: action === 'delete' ? undefined : {} });
      pendingActionFocus.current = { id: course.id };
      setDeletePending(null);
      await refresh();
      setNotice(action === 'delete' ? 'Draft deleted.' : action === 'unpublish' ? 'Course unpublished. Your draft is private.' : 'Course published. Students can now find it in the catalog.');
    } catch (error) { setError(error.message); setErrorSource('action'); }
    finally { actionLock.current = false; setBusy(null); }
  };
  return <div className="creator-workspace">
    <Offer />
    {!user ? <div className="creator-welcome"><div><span className="eyebrow">THE CREATOR WORKSPACE</span><h2>Teach what you know.</h2><p>Build a short course around it. Start with one useful idea, add an example and a quiz, and publish it for other curious minds.</p><ul><li><Check size={16} />Write lessons in the course editor</li><li><Check size={16} />Upload a course as a JSON file</li><li><Check size={16} />Preview, save drafts, and publish</li><li><Check size={16} />Keep ownership of your course content</li></ul><p className="creator-tip">Create an account to keep your drafts private and your published courses attributed to you.</p></div><Account onSession={onSession} /></div>
    : editing ? <CourseEditor key={editing.id || 'new'} initial={editing} onBack={closeEditor} onSaved={refresh} onPreview={onPreview} onDirtyChange={onDirtyChange} />
    : <>
      <div className="creator-list-heading"><div><h2 ref={listHeading} tabIndex={-1}>Your courses.</h2><p>Private drafts stay here. Published courses appear in the student catalog.</p></div><button className="button primary" disabled={Boolean(busy)} onClick={() => setEditing({ ...emptyCourse(), status: 'draft' })}><Plus size={17} />Create a course</button></div>
      <div className="creator-import"><div><FileUp size={22} /><span><strong>Already have your course written?</strong><small>Upload a JSON file, review it in the editor, then publish. Up to 1 MB.</small></span></div><div><button className="text-button" onClick={() => downloadJson({ ...courses[0], id: undefined, title: 'My first course' }, 'curio-course-template.json')}><Download size={16} />Download template</button><button className="button outline" disabled={Boolean(busy)} onClick={() => upload.current.click()}><FileUp size={16} />Upload course</button><input ref={upload} className="sr-only" type="file" disabled={Boolean(busy)} accept=".json,application/json" aria-label="Upload course JSON" onChange={importFile} /></div></div>
      {error && <div className="form-message error" role="alert" tabIndex={-1} ref={listError}>{error}{errorSource === 'load' && <button className="text-button" onClick={load}>Try again</button>}{errorSource === 'import' && <button className="text-button" onClick={() => upload.current.click()}>Choose another file</button>}</div>}
      {notice && !error && <p className="form-message success" role="status">{notice}</p>}
      {loading ? <p role="status" className="creator-loading">Opening your workspace…</p> : !ownCourses.length && !error ? <div className="creator-empty"><span><BookOpen size={33} /></span><h3>Your workspace is ready.</h3><p>Create a course or upload our template. Drafts stay private until you publish them.</p><button className="text-button" onClick={() => setEditing({ ...emptyCourse(), status: 'draft' })}>Start a first draft<ArrowRight size={17} /></button></div> : <div className="creator-course-list">{ownCourses.map(course => <article key={course.id} className="creator-course-row" data-creator-course={course.id} aria-busy={busy?.id === course.id || undefined}><div className={`creator-course-cover ${course.color}`}><CourseArt type={course.art} /></div><div className="creator-course-row-copy"><span className={`status-pill ${course.status === 'published' ? 'published' : ''}`}>{course.status === 'published' ? 'Published' : 'Private draft'}</span><h3>{course.title || 'Untitled course'}</h3><p>{course.category} · {course.lessons.length} lessons</p></div><div className="creator-row-actions"><button className="button outline" disabled={Boolean(busy)} onClick={() => setEditing(course)}>Edit course</button>{course.status === 'published' ? <button className="text-button" disabled={Boolean(busy)} aria-busy={busy?.id === course.id && busy.action === 'unpublish' || undefined} onClick={() => changeStatus(course, 'unpublish')}>{busy?.id === course.id && busy.action === 'unpublish' ? <ActionPending>Unpublishing…</ActionPending> : 'Unpublish'}</button> : <button className="text-button" disabled={Boolean(busy)} aria-busy={busy?.id === course.id && busy.action === 'publish' || undefined} onClick={() => changeStatus(course, 'publish')}>{busy?.id === course.id && busy.action === 'publish' ? <ActionPending>Publishing…</ActionPending> : 'Publish for free'}</button>}{!course.everPublished && (deletePending === course.id ? <div className="delete-confirm"><span>Delete draft?</span><button disabled={Boolean(busy)} aria-busy={busy?.id === course.id && busy.action === 'delete' || undefined} onClick={() => changeStatus(course, 'delete')}>{busy?.id === course.id && busy.action === 'delete' ? <ActionPending>Deleting…</ActionPending> : 'Delete'}</button><button ref={keepDraft} disabled={Boolean(busy)} onClick={() => { pendingActionFocus.current = { id: course.id, keep: true }; setDeletePending(null); }}>Keep</button></div> : <button className="creator-delete" disabled={Boolean(busy)} aria-label={`Delete ${course.title || 'untitled course'}`} onClick={() => setDeletePending(course.id)}><Trash2 size={16} /></button>)}</div></article>)}</div>}
    </>}
  </div>;
}
