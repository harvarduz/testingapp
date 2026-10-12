import React, { useRef, useState } from 'react';
import { ArrowRight, Check, CheckCheck, Coins, RotateCcw, Route, Target, X } from 'lucide-react';
import { courseCompleted, localDate } from './progress.js';
import { dailyQuests, learningRewards, pathProgress, practiceQuestions, studyPaths } from './learning.js';

export function WorkedLesson({ lesson }) {
  if (!lesson.steps?.length && !lesson.objectives?.length) return null;
  return <div className="worked-lesson">
    {lesson.objectives?.length > 0 && <section aria-label="Learning goals"><h3>By the end of this lesson</h3><ul>{lesson.objectives.map(goal => <li key={goal}><Target size={15} />{goal}</li>)}</ul></section>}
    {lesson.steps?.length > 0 && <section aria-label="Worked example"><h3>Work through an example</h3><ol>{lesson.steps.map((step, index) => <li key={index}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>}
    {lesson.commonMistake && <aside className="common-mistake"><strong>A mistake to watch for</strong><p>{lesson.commonMistake}</p></aside>}
  </div>;
}

export function StudyPaths({ courses, progress, onChoose, onOpen }) {
  const active = studyPaths.find(path => path.id === progress.activePath?.id);
  const status = active && pathProgress(active, courses, progress);
  return <div className="study-paths">
    {active && <section className="active-path" aria-labelledby="active-path-title">
      <div className="active-path-heading"><span className="eyebrow">YOUR STUDY PLAN</span><span>{status.completed}/{status.total} lessons complete</span></div>
      <h2 id="active-path-title">{active.title}</h2><p>{active.outcome}</p>
      <div className="path-progress-label"><span>Path progress</span><strong>{status.percent}%</strong></div><div className="progress-track"><span style={{ width: `${status.percent}%` }} /></div>
      {status.nextCourse ? <button className="button primary" onClick={() => onOpen(status.nextCourse, status.nextIndex)}>Continue your path<ArrowRight size={18} /></button> : <p className="path-complete"><CheckCheck size={19} />Every lesson in this path is complete. Try targeted practice to keep it fresh.</p>}
      <ol className="path-course-list">{status.courses.map(course => {
        const done = courseCompleted(progress, course);
        return <li key={course.id}><span className={done === course.lessons.length ? 'step-done' : ''}>{done === course.lessons.length ? <Check size={17} /> : <Route size={17} />}</span><button onClick={() => onOpen(course)}><strong>{course.title}</strong><small>{done}/{course.lessons.length} lessons · {course.minutes} min</small></button><ArrowRight size={17} /></li>;
      })}</ol>
      <small className="path-note">The order is a guide. You can open any course and learn at your own pace.</small>
    </section>}
    <div className="section-heading"><div><h2>{active ? 'Explore another direction' : 'Choose a direction'}</h2><p>Follow a sequence of courses with a clear, practical goal.</p></div></div>
    <div className="path-grid">{studyPaths.map(path => {
      const item = pathProgress(path, courses, progress);
      const selected = active?.id === path.id;
      return <article className={`path-card ${path.color}`} key={path.id}><span className="path-icon"><Route size={24} /></span><h3>{path.title}</h3><p>{path.description}</p><strong className="path-outcome">What you’ll be able to do</strong><p>{path.outcome}</p><span className="path-details">{item.courses.length} courses · {item.total} lessons · {item.completed} complete</span><button className={selected ? 'button outline' : 'button primary'} aria-label={`${selected ? 'Following' : 'Choose'} ${path.title}`} disabled={selected} onClick={() => onChoose(path.id)}>{selected ? <><Check size={17} />Your current path</> : <>Choose this path<ArrowRight size={17} /></>}</button></article>;
    })}</div>
  </div>;
}

export function LearningMomentum({ progress, date }) {
  const rewards = learningRewards(progress);
  const quests = dailyQuests(progress, date);
  return <section className="learning-momentum" aria-labelledby="momentum-title">
    <div className="coin-summary"><span className="curio-coin"><Coins size={25} /></span><div><span className="eyebrow">YOUR CURIO COINS</span><strong>{rewards.coins}<small>earned through learning</small></strong></div></div>
    <div className="daily-quests"><h2 id="momentum-title">Three small wins for today</h2><p>Pick one to start. Every completed lesson earns 25 Curio coins.</p><div>{quests.map(quest => <span key={quest.title} className={quest.count === quest.target ? 'quest-done' : ''}>{quest.count === quest.target ? <Check size={16} /> : <Target size={16} />}<span>{quest.title}</span><strong>{quest.count}/{quest.target}</strong></span>)}</div></div>
  </section>;
}

export function PracticeOverview({ courses, progress, onStart, onExplore }) {
  const questions = practiceQuestions(courses, progress);
  const attempts = Object.values(progress.practiceAttempts || {});
  const correct = attempts.filter(item => item.correct).length;
  return <section className="targeted-practice" aria-labelledby="targeted-practice-title">
    <span className="eyebrow">LEARN IT. USE IT. REMEMBER IT.</span><h2 id="targeted-practice-title">Practice what you’ve learned.</h2>
    <p>New questions based on your completed lessons. Missed questions come first, followed by questions you haven’t tried yet.</p>
    <div className="practice-metrics"><span><strong>{questions.length}</strong> questions available</span><span><strong>{attempts.length}</strong> recent answers</span><span><strong>{attempts.length ? `${Math.round(correct / attempts.length * 100)}%` : '—'}</strong> answered correctly</span></div>
    {questions.length ? <button className="button primary" onClick={() => onStart()}>Start targeted practice<ArrowRight size={18} /></button> : <><p className="practice-start-note">Finish a lesson first, then come back to practice it with different questions.</p><button className="button outline" onClick={onExplore}>Find your first lesson<ArrowRight size={17} /></button></>}
    <small>Up to five questions per session. Earn 20 Curio coins for your first successful practice session each day.</small>
  </section>;
}

export function PracticeSession({ courses, progress, courseId, lessonIndex, onRecord, onComplete, onOpen }) {
  const [questions, setQuestions] = useState(() => practiceQuestions(courses, progress, courseId, lessonIndex).slice(0, 5));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [checked, setChecked] = useState(false);
  const [finished, setFinished] = useState(false);
  const [coins, setCoins] = useState(0);
  const answerId = useRef(crypto.randomUUID());
  const recordedAnswers = useRef(new Set());
  const question = questions[index];
  const correctCount = answers.filter(answer => answer.correct).length;
  const streak = [...answers].reverse().findIndex(answer => !answer.correct);
  const consecutive = streak === -1 ? answers.length : streak;
  const check = () => {
    if (selected === null || checked || recordedAnswers.current.has(answerId.current)) return;
    recordedAnswers.current.add(answerId.current);
    const correct = selected === question.answer;
    setChecked(true);
    setAnswers(current => [...current, { ...question, correct }]);
    onRecord(question, correct, answerId.current);
  };
  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(value => value + 1); setChecked(false); setSelected(null); answerId.current = crypto.randomUUID();
    } else {
      const earned = correctCount > 0 && !progress.practiceDays?.includes(localDate());
      if (correctCount > 0) onComplete();
      setCoins(earned ? 20 : 0); setFinished(true);
    }
  };
  const restart = () => {
    setQuestions(practiceQuestions(courses, progress, courseId, lessonIndex).slice(0, 5));
    setIndex(0); setSelected(null); setAnswers([]); setChecked(false); setFinished(false); setCoins(0); answerId.current = crypto.randomUUID();
  };
  if (!questions.length) return <div className="practice-session"><h2>No practice questions yet.</h2><p>Complete a lesson to build your personal practice set.</p></div>;
  if (finished) {
    const missed = answers.filter(answer => !answer.correct).filter((answer, index, items) => items.findIndex(item => item.course.id === answer.course.id && item.lessonIndex === answer.lessonIndex) === index);
    return <div className="practice-session session-result"><span className="result-medal"><CheckCheck size={36} /></span><span className="eyebrow">PRACTICE COMPLETE</span><h2>{correctCount === questions.length ? 'Every answer, understood.' : 'You know what to work on next.'}</h2><p><strong>{correctCount} of {questions.length}</strong> answers correct.</p>{coins > 0 && <div className="session-coins"><Coins size={23} />+{coins} Curio coins</div>}
      {missed.length > 0 ? <section className="practice-next"><h3>Return to these ideas</h3><p>Read the explanation, then practise it again.</p>{missed.map(answer => <button key={`${answer.course.id}:${answer.lessonIndex}`} onClick={() => onOpen(answer.course, answer.lessonIndex)}><span><strong>{answer.lesson.title}</strong><small>{answer.course.title}</small></span><ArrowRight size={17} /></button>)}</section> : <p>You applied these ideas successfully. Come back later to check what you remember.</p>}
      <button className="button primary full-width" onClick={restart}><RotateCcw size={17} />Practice again</button><small>Repeating a session does not add course completions or more practice coins today.</small>
    </div>;
  }
  return <div className="practice-session"><div className="practice-session-top"><span className="eyebrow">TARGETED PRACTICE</span><span>{index + 1}/{questions.length} questions</span></div><div className="progress-track"><span style={{ width: `${index / questions.length * 100}%` }} /></div><p className="practice-topic">{question.course.title} · {question.lesson.title}</p><h2>{question.question}</h2><p>Try to answer before looking back at the lesson.</p><div className="practice-options" role="group" aria-label="Practice answer options">{question.options.map((option, optionIndex) => <button key={optionIndex} aria-pressed={selected === optionIndex} disabled={checked} className={`${selected === optionIndex ? 'selected' : ''} ${checked && optionIndex === question.answer ? 'correct' : ''}`} onClick={() => setSelected(optionIndex)}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{checked && optionIndex === question.answer && <Check size={18} />}</button>)}</div>
    {checked && <div className={`practice-feedback ${answers.at(-1)?.correct ? 'correct' : 'retry'}`} role="status"><strong>{answers.at(-1)?.correct ? consecutive >= 2 ? `${consecutive} correct in a row!` : 'That’s right.' : 'A useful mistake. Here’s why.'}</strong><p>{question.explanation}</p></div>}
    <button className="button primary full-width" onClick={checked ? next : check} disabled={!checked && selected === null}>{checked ? index + 1 === questions.length ? 'See my results' : 'Next question' : 'Check answer'}<ArrowRight size={18} /></button><small>Your answers save as you go. Practice does not change your lesson completion totals.</small>
  </div>;
}

export function RewardToast({ reward, onDismiss }) {
  if (!reward) return null;
  return <div className="reward-toast" key={reward.id}><span className="reward-coin"><Coins size={25} /></span><div role="status"><strong>{reward.title}</strong><span>+{reward.coins} Curio coins</span></div><button onClick={onDismiss} aria-label="Dismiss learning reward"><X size={18} /></button><div className="reward-particles" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--particle': index }} />)}</div></div>;
}
