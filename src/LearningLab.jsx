import React, { useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Coins, FlaskConical, Play, RotateCcw } from 'lucide-react';
import { budgetResult, learningLabs, parseNumberList, simplifyFraction, traceAlgorithm } from './labs.js';
import SelectField from './SelectField.jsx';

function FractionStudio({ onComplete }) {
  const [parts, setParts] = useState(8);
  const [shaded, setShaded] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const fraction = simplifyFraction(shaded.length, parts);
  const exactPercent = (shaded.length * 100) % parts === 0;
  const percent = Math.round(shaded.length / parts * 100);
  const changeParts = value => { setParts(value); setShaded([]); setFeedback(null); };
  const toggle = index => { setShaded(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]); setFeedback(null); };
  const check = () => {
    const correct = parts >= 8 && shaded.length * 4 === parts * 3;
    setFeedback(correct ? { correct, text: `${shaded.length}/${parts} simplifies to 3/4. Regrouping equal parts keeps the amount the same.` } : { correct, text: parts < 8 ? 'Use at least eight equal parts so you can show an equivalent fraction.' : `You shaded ${shaded.length}/${parts}. Three quarters means three of every four equal parts. Try grouping the pieces in fours.` });
    if (correct) onComplete('fractions');
  };
  return <div className="lab-experiment"><span className="eyebrow">MAKE THE IDEA VISIBLE</span><h2>Different pieces. The same amount.</h2><p>Shade an amount equal to <strong>3/4</strong>, using at least eight equal pieces. Click a piece to shade or clear it.</p>
    <label className="lab-range-label" htmlFor="fraction-parts">Equal pieces <strong>{parts}</strong></label><input id="fraction-parts" type="range" min={2} max={12} value={parts} style={{ '--range-progress': `${(parts - 2) / 10 * 100}%` }} onChange={event => changeParts(Number(event.target.value))} />
    <div className="fraction-grid" style={{ '--parts': parts }} role="group" aria-label="Fraction pieces">{Array.from({ length: parts }, (_, index) => <button key={index} aria-label={`Piece ${index + 1}`} aria-pressed={shaded.includes(index)} className={shaded.includes(index) ? 'shaded' : ''} onClick={() => toggle(index)}>{shaded.includes(index) ? <Check size={21} /> : index + 1}</button>)}</div>
    <div className="fraction-equation" role="img" aria-label={`${shaded.length} out of ${parts} equals ${fraction.numerator} over ${fraction.denominator}, ${exactPercent ? 'equal to' : 'approximately'} ${percent} percent`} aria-live="polite"><span><strong>{shaded.length}</strong><small>{parts}</small></span><b>=</b><span><strong>{fraction.numerator}</strong><small>{fraction.denominator}</small></span><b>{exactPercent ? '=' : '≈'}</b><strong>{percent}%</strong></div>
    <p className="lab-teaching-note">Change the number of pieces to see why a fraction depends on equal parts, not just a count of shaded pieces.</p>
    <button className="button primary" onClick={check}>Check my model<ArrowRight size={17} /></button>{feedback && <div className={`lab-feedback ${feedback.correct ? 'success' : 'hint'}`} role="status"><strong>{feedback.correct ? 'Equivalent fractions, understood.' : 'Try a different model.'}</strong><p>{feedback.text}</p></div>}
  </div>;
}

const initialExpenses = { food: 120, transport: 45, study: 60, leisure: 75 };
const expenseLabels = { food: 'Food', transport: 'Transport', study: 'Study materials', leisure: 'Leisure' };
function BudgetChallenge({ onComplete }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [checked, setChecked] = useState(false);
  const result = budgetResult(expenses);
  const chartBase = Math.max(300, result.spent);
  const check = () => { setChecked(true); if (result.complete) onComplete('budget'); };
  return <div className="lab-experiment"><span className="eyebrow">A DECISION YOU CAN USE</span><h2>Make room for a savings goal.</h2><p>You have <strong>$300</strong>. Protect <strong>$60 in savings</strong>, while keeping at least $60 for food, $30 for transport, and $30 for study materials. Decide where to make a trade-off.</p>
    <div className="budget-summary"><div><span>Monthly budget</span><strong>$300</strong></div><div><span>Total spending</span><strong>${result.spent}</strong></div><div className={result.remaining < 0 ? 'budget-over' : ''}><span>{result.remaining < 0 ? 'Over budget' : 'Available for savings'}</span><strong>${Math.abs(result.remaining)}</strong></div></div>
    <div className="budget-chart" role="img" aria-label={`Spending ${result.spent} dollars out of 300 dollars`}>{Object.entries(expenses).map(([key, value]) => <span className={`budget-${key}`} key={key} style={{ width: `${value / chartBase * 100}%` }} />)}{result.remaining > 0 && <span className="budget-savings" style={{ width: `${result.remaining / chartBase * 100}%` }} />}</div>
    <div className="budget-controls">{Object.entries(expenses).map(([key, value]) => <div key={key}><label className="lab-range-label" htmlFor={`budget-${key}`}>{expenseLabels[key]}<strong>${value}</strong></label><input id={`budget-${key}`} type="range" min={0} max={300} step={5} value={value} style={{ '--range-progress': `${value / 300 * 100}%` }} onChange={event => { setExpenses(current => ({ ...current, [key]: Number(event.target.value) })); setChecked(false); }} /></div>)}</div>
    <div className="lab-actions"><button className="button primary" onClick={check}>Check my budget<ArrowRight size={17} /></button><button className="text-button" onClick={() => { setExpenses(initialExpenses); setChecked(false); }}><RotateCcw size={16} />Reset budget</button></div>
    {checked && <div className={`lab-feedback ${result.complete ? 'success' : 'hint'}`} role="status"><strong>{result.complete ? 'You protected the essentials and your goal.' : 'Your budget needs another decision.'}</strong>{result.complete ? <p>You left ${result.remaining} for savings. There is more than one valid budget: the useful skill is checking your needs and trade-offs.</p> : <ul>{result.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>}</div>}
  </div>;
}

function AlgorithmTracer({ onComplete }) {
  const [input, setInput] = useState('2, 4, 6');
  const [operation, setOperation] = useState('sum');
  const [prediction, setPrediction] = useState('');
  const [locked, setLocked] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [checked, setChecked] = useState(false);
  const inputRef = useRef(null);
  const predictionRef = useRef(null);
  const traceRef = useRef(null);
  const previousLocked = useRef(locked);
  useLayoutEffect(() => {
    if (previousLocked.current === locked) return;
    previousLocked.current = locked;
    const target = locked ? traceRef.current : inputRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest' });
  }, [locked]);
  const start = () => {
    let values;
    try {
      values = parseNumberList(input);
    } catch (error) { setError({ field: 'list', message: error.message }); inputRef.current?.focus(); return; }
    if (!prediction.trim() || !Number.isFinite(Number(prediction)) || Number(prediction) < 0 || Number(prediction) > 800) {
      setError({ field: 'prediction', message: 'Enter a prediction from 0 to 800 before tracing.' }); predictionRef.current?.focus(); return;
    }
    setLocked({ values, prediction: Number(prediction), operation }); setStep(0); setChecked(false); setError(null);
  };
  const trace = locked ? traceAlgorithm(locked.values, locked.operation) : [];
  const finished = locked && step === trace.length;
  const correct = finished && locked.prediction === trace.at(-1).result;
  const compare = () => { setChecked(true); if (correct) onComplete('algorithms'); };
  const reset = () => { setLocked(null); setStep(0); setPrediction(''); setChecked(false); setError(null); };
  const nextList = () => { reset(); setInput(Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 12)).join(', ')); };
  return <div className="lab-experiment"><span className="eyebrow">THINK BEFORE YOU RUN IT</span><h2>Follow every change.</h2><p>Predict the result first. Then run the algorithm one step at a time and compare your prediction with the trace.</p>
    <div className="algorithm-inputs"><label>Number list<input ref={inputRef} aria-label="Algorithm number list" aria-invalid={error?.field === 'list'} aria-describedby={`algorithm-list-hint${error?.field === 'list' ? ' algorithm-error' : ''}`} value={input} maxLength={40} disabled={Boolean(locked)} onChange={event => { setInput(event.target.value); if (error?.field === 'list') setError(null); }} /><small id="algorithm-list-hint">2–8 whole numbers from 0 to 100, separated by commas.</small></label><SelectField label="Algorithm" value={operation} disabled={Boolean(locked)} onChange={setOperation} options={[{ value: 'sum', label: 'Add all numbers' }, { value: 'max', label: 'Find the largest number' }]} /><label>Your predicted result<input ref={predictionRef} type="number" min={0} max={800} aria-invalid={error?.field === 'prediction'} aria-describedby={error?.field === 'prediction' ? 'algorithm-error' : undefined} value={prediction} disabled={Boolean(locked)} onChange={event => { setPrediction(event.target.value); if (error?.field === 'prediction') setError(null); }} /></label></div>
    {!locked && <button className="button primary" onClick={start}>Lock prediction & start<Play size={16} /></button>}
    {error && <p className="form-message error" id="algorithm-error" role="alert">{error.message}</p>}
    {locked && <><pre className="algorithm-code"><code>{locked.operation === 'sum' ? 'total = 0\nfor each number:\n  total = total + number\nreturn total' : 'largest = first number\nfor each remaining number:\n  largest = max(largest, number)\nreturn largest'}</code></pre><div className="algorithm-values" aria-label="Algorithm inputs">{locked.values.map((value, index) => <span key={index} className={index < step ? 'processed' : ''}>{value}</span>)}</div>
      <div className="trace-current" ref={traceRef} tabIndex={-1} role="status">{step ? <>After step {step}: <strong>{locked.operation === 'sum' ? 'total' : 'largest'} = {trace[step - 1].result}</strong></> : 'Your prediction is locked. Run the first step.'}</div>
      {step > 0 && <div className="trace-table-wrap"><table className="trace-table"><caption>How the variable changes</caption><thead><tr><th scope="col">Step</th><th scope="col">Number</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>{trace.slice(0, step).map(row => <tr key={row.step}><td>{row.step}</td><td>{row.value}</td><td>{row.previous}</td><td>{row.result}</td></tr>)}</tbody></table></div>}
      <div className="lab-actions">{!finished ? <button className="button primary" onClick={() => setStep(current => Math.min(current + 1, trace.length))}>Run next step<Play size={16} /></button> : <button className="button primary" onClick={compare}>Compare my prediction<ArrowRight size={17} /></button>}<button className="text-button" onClick={reset}><RotateCcw size={16} />Edit the inputs</button></div>
      {checked && <div className={`lab-feedback ${correct ? 'success' : 'hint'}`} role="status"><strong>{correct ? 'Your prediction matches the trace.' : 'The trace reveals the difference.'}</strong><p>You predicted {locked.prediction}. The final {locked.operation === 'sum' ? 'total' : 'largest value'} is {trace.at(-1).result}. {locked.operation === 'sum' ? 'Each step carries the previous total forward and adds the next value.' : 'A smaller value does not replace the current largest candidate.'}</p><button className="text-button" onClick={nextList}>Try a new list<ArrowRight size={16} /></button></div>}
    </>}
  </div>;
}

export default function LearningLab({ courses, progress, onComplete, onOpen }) {
  const [selected, setSelected] = useState('fractions');
  const current = learningLabs.find(lab => lab.id === selected);
  const course = courses.find(course => course.id === current.courseId);
  return <div className="learning-lab"><div className="lab-intro"><span className="lab-intro-icon"><FlaskConical size={27} /></span><div><h2>Understand it by changing it.</h2><p>Build a model, make a decision, and trace a result. Each completed lab earns 30 Curio coins once.</p></div></div>
    <nav className="lab-selector" aria-label="Choose a learning lab">{learningLabs.map(lab => <button key={lab.id} aria-pressed={selected === lab.id} onClick={() => setSelected(lab.id)}><span>{lab.title}</span>{progress.completedLabs?.[lab.id] && <Check size={16} />}</button>)}</nav>
    <div className="lab-workspace"><section hidden={selected !== 'fractions'}><FractionStudio onComplete={onComplete} /></section><section hidden={selected !== 'budget'}><BudgetChallenge onComplete={onComplete} /></section><section hidden={selected !== 'algorithms'}><AlgorithmTracer onComplete={onComplete} /></section></div>
    <div className="lab-footer"><span>{progress.completedLabs?.[selected] ? <><Check size={17} />Lab completed · 30 coins earned</> : <><Coins size={17} />Complete this lab to earn 30 Curio coins</>}</span>{course && <button className="text-button" onClick={() => onOpen(course, current.lessonIndex)}>Learn the idea behind this lab<ArrowRight size={17} /></button>}</div>
  </div>;
}
