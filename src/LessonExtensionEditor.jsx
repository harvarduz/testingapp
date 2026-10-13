import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import SelectField from './SelectField.jsx';

const blankQuestion = () => ({ question: '', options: ['', '', '', ''], answer: 0, explanation: '' });
export default function LessonExtensionEditor({ lesson, index, onChange }) {
  const goals = lesson.objectives || [];
  const steps = lesson.steps || [];
  const practice = lesson.practice || [];
  const updateQuestion = (position, values) => onChange({ practice: practice.map((question, number) => number === position ? { ...question, ...values } : question) });
  return <details className="lesson-extension-editor"><summary>Learning goals, worked steps & extra practice</summary><div>
    <p>Help students apply the idea before they take the quiz. These additions are optional.</p>
    <h4>Learning goals</h4>
    {goals.map((goal, position) => <label key={position}>Goal {position + 1}<input aria-label={`Lesson ${index + 1} learning goal ${position + 1}`} value={goal} maxLength={200} onChange={event => onChange({ objectives: goals.map((item, number) => number === position ? event.target.value : item) })} /><button type="button" className="text-button danger" onClick={() => onChange({ objectives: goals.filter((_, number) => number !== position) })}><Trash2 size={14} />Remove goal {position + 1}</button></label>)}
    <button type="button" className="button outline" disabled={goals.length >= 5} onClick={() => onChange({ objectives: [...goals, ''] })}><Plus size={15} />Add learning goal</button>
    <h4>Worked example steps</h4>
    {steps.map((step, position) => <label key={position}>Step {position + 1}<textarea aria-label={`Lesson ${index + 1} worked step ${position + 1}`} value={step} maxLength={1500} rows={3} onChange={event => onChange({ steps: steps.map((item, number) => number === position ? event.target.value : item) })} /><button type="button" className="text-button danger" onClick={() => onChange({ steps: steps.filter((_, number) => number !== position) })}><Trash2 size={14} />Remove step {position + 1}</button></label>)}
    <button type="button" className="button outline" disabled={steps.length >= 8} onClick={() => onChange({ steps: [...steps, ''] })}><Plus size={15} />Add worked step</button>
    <label>A common mistake to explain<textarea aria-label={`Lesson ${index + 1} common mistake`} value={lesson.commonMistake || ''} maxLength={1500} rows={3} onChange={event => onChange({ commonMistake: event.target.value })} /></label>
    <h4>Extra practice questions</h4><p>Use different examples to check whether students can apply the idea. Add up to five questions.</p>
    {practice.map((question, position) => <fieldset className="extra-question-editor" key={position}><legend>Practice question {position + 1}</legend>
      <label>Question<input aria-label={`Lesson ${index + 1} practice ${position + 1} question`} value={question.question} maxLength={500} onChange={event => updateQuestion(position, { question: event.target.value })} /></label>
      {question.options.map((option, number) => <label key={number}>Option {number + 1}<input aria-label={`Lesson ${index + 1} practice ${position + 1} option ${number + 1}`} value={option} maxLength={300} onChange={event => updateQuestion(position, { options: question.options.map((item, optionIndex) => optionIndex === number ? event.target.value : item) })} /></label>)}
      <SelectField label="Correct answer" aria-label={`Lesson ${index + 1} practice ${position + 1} correct answer`} value={String(question.answer)} onChange={answer => updateQuestion(position, { answer: Number(answer) })} options={question.options.map((_, number) => ({ value: String(number), label: `Option ${number + 1}` }))} />
      <label>Explain the answer<textarea aria-label={`Lesson ${index + 1} practice ${position + 1} explanation`} value={question.explanation} rows={3} maxLength={3000} onChange={event => updateQuestion(position, { explanation: event.target.value })} /></label>
      <button type="button" className="text-button danger" onClick={() => onChange({ practice: practice.filter((_, number) => number !== position) })}><Trash2 size={15} />Remove practice question {position + 1}</button>
    </fieldset>)}
    <button type="button" className="button outline" disabled={practice.length >= 5} onClick={() => onChange({ practice: [...practice, blankQuestion()] })}><Plus size={15} />Add practice question</button>
  </div></details>;
}
