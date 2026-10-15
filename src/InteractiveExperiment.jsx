import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Lightbulb } from 'lucide-react';
import { extent } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { experimentDefinitions } from './lessonStudies.js';
import { calculateExperiment, displayNumber, experimentControls, initialExperimentValues, parseCheckpointAnswer, parseObservations } from './experimentModels.js';

function Formula({ definition }) {
  // Only authored expressions reach KaTeX. Learner input is never interpreted
  // as markup, JavaScript, TeX commands, or an expression to evaluate.
  const html = katex.renderToString(definition.formula, { throwOnError: false, trust: false, strict: 'error', output: 'htmlAndMathml', maxExpand: 100, maxSize: 10 });
  return <figure className="study-formula"><div dangerouslySetInnerHTML={{ __html: html }} /><figcaption>{definition.formulaText}</figcaption></figure>;
}

function ModelChart({ chart, metrics }) {
  const id = useId();
  const ref = useRef(null);
  const [width, setWidth] = useState(480);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(240, Math.floor(entries[0].contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const height = 280, left = 58, right = width - 18, top = 34, bottom = 218;
  const points = chart.series.flatMap(item => item.points);
  const autoX = extent(points, p => p.x), autoY = extent([...points.map(p => p.y), 0]);
  const xDomain = chart.xDomain || [autoX[0] ?? 0, autoX[0] === autoX[1] ? (autoX[1] || 0) + 1 : autoX[1] ?? 1];
  const yDomain = chart.yDomain || [autoY[0] || 0, autoY[1] === autoY[0] ? autoY[1] + 1 : autoY[1]];
  const x = scaleLinear().domain(xDomain).range([left, right]);
  const y = scaleLinear().domain(yDomain).range([bottom, top]);
  if (!chart.yDomain) y.nice(4);
  const band = scaleBand().domain(chart.labels || []).range([left, right]).padding(0.28);
  const path = line().x(p => x(p.x)).y(p => y(p.y));
  return <figure className="model-chart" ref={ref}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{chart.yLabel} by {chart.xLabel.toLowerCase()}</title>
      <desc id={`${id}-description`}>{metrics.map(item => `${item.label}: ${item.value} ${item.unit}`).join('. ')}. Plotted values, rounded to two decimal places, are available in the data table below.</desc>
      <text x={left} y={17} className="chart-axis-title">{chart.yLabel}</text>
      {y.ticks(4).map(tick => <g key={tick}><line className="chart-grid" x1={left} x2={right} y1={y(tick)} y2={y(tick)} /><text className="chart-tick" x={left - 9} y={y(tick) + 4} textAnchor="end">{displayNumber(tick)}</text></g>)}
      <line className="chart-zero" x1={left} x2={right} y1={y(0)} y2={y(0)} />
      {chart.type === 'bar' ? chart.series[0].points.map((p, i) => <g key={i}>{chart.series.map((item, index) => <rect key={item.name} className={`chart-bar chart-bar-${index}`} x={band(chart.labels[i]) + index * band.bandwidth() / chart.series.length} y={Math.min(y(item.points[i].y), y(0))} width={band.bandwidth() / chart.series.length - (chart.series.length > 1 ? 2 : 0)} height={Math.max(1, Math.abs(y(item.points[i].y) - y(0)))} rx="3" />)}<text className="chart-tick" x={band(chart.labels[i]) + band.bandwidth() / 2} y={bottom + 21} textAnchor="middle">{chart.labels[i]}</text></g>) : <>
        {x.ticks(Math.max(2, Math.floor((right - left) / 65))).map(tick => <text key={tick} className="chart-tick" x={x(tick)} y={bottom + 21} textAnchor="middle">{displayNumber(tick)}</text>)}
        {chart.series.map((item, index) => <g key={item.name} className={`chart-series chart-series-${index}`}><path d={path(item.points) || ''} fill="none" />{item.points.length <= 13 && item.points.map((p, i) => <circle key={i} cx={x(p.x)} cy={y(p.y)} r="3" />)}</g>)}
        {chart.marker && <circle className="chart-marker" cx={x(chart.marker.x)} cy={y(chart.marker.y)} r="6" />}
      </>}
      <text className="chart-axis-title" x={(left + right) / 2} y={height - 10} textAnchor="middle">{chart.xLabel}</text>
    </svg>
    {chart.series.length > 1 && <figcaption className={`chart-legend ${chart.type === 'bar' ? 'chart-legend-bars' : ''}`}>{chart.series.map((item, index) => <span key={item.name}><i className={`legend-line legend-line-${index}`} />{item.name}</span>)}</figcaption>}
    {chart.note && <figcaption className="chart-marker-note">{chart.note}</figcaption>}
    {chart.marker && <figcaption className="chart-marker-note">The outlined dot marks your selected setting.</figcaption>}
  </figure>;
}

function TransferCheckpoint({ checkpoint }) {
  const id = useId();
  const inputRef = useRef(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [hint, setHint] = useState(false);
  const submit = event => {
    event.preventDefault();
    const value = parseCheckpointAnswer(answer);
    if (value === null) { setFeedback('invalid'); inputRef.current?.focus(); return; }
    setFeedback(Math.abs(value - checkpoint.answer) <= 1e-9 ? 'correct' : 'retry');
  };
  return <section className="transfer-checkpoint" aria-labelledby={`${id}-title`}>
    <span className="eyebrow">TRY A DIFFERENT CASE</span><h4 id={`${id}-title`}>Can you use the idea?</h4><p id={`${id}-question`}>{checkpoint.question}</p>
    <form onSubmit={submit} noValidate><label htmlFor={`${id}-answer`}>Your answer{checkpoint.unit && ` (${checkpoint.unit})`}</label><div className="checkpoint-answer"><input id={`${id}-answer`} ref={inputRef} value={answer} inputMode="decimal" autoComplete="off" maxLength={40} aria-describedby={`${id}-question ${id}-format${feedback === 'invalid' ? ` ${id}-feedback` : ''}`} aria-invalid={feedback === 'invalid' || undefined} onChange={event => { setAnswer(event.target.value); setFeedback(null); }} /><button className="button primary" type="submit">Check prediction<ArrowRight size={16} /></button></div><small id={`${id}-format`}>Enter a number without a unit. Decimals are accepted.</small></form>
    <button className="text-button checkpoint-hint" aria-expanded={hint} aria-controls={`${id}-hint`} onClick={() => setHint(value => !value)}><Lightbulb size={16} />{hint ? 'Hide hint' : 'Get a hint'}</button>
    <p id={`${id}-hint`} hidden={!hint} className="checkpoint-hint-text">{checkpoint.hint}</p>
    {feedback && <div id={`${id}-feedback`} className="study-feedback" role="status"><strong>{feedback === 'correct' ? 'Your prediction checks out.' : feedback === 'invalid' ? 'Enter a number to check.' : 'Try following the quantities again.'}</strong><p>{feedback === 'correct' ? checkpoint.explanation : feedback === 'invalid' ? 'Use digits and an optional decimal point or comma, such as 12.5. Leave units outside the answer.' : checkpoint.hint}</p></div>}
    <details className="study-solution"><summary>Show the worked solution</summary><p>{checkpoint.explanation}</p></details>
  </section>;
}

export default function InteractiveExperiment({ kind }) {
  const definition = experimentDefinitions[kind];
  const id = useId();
  const inputRef = useRef(null);
  const initialList = kind === 'accumulator' ? [3, 5, 2] : [2, 3, 4, 5, 6];
  const [values, setValues] = useState(() => initialExperimentValues(kind));
  const [observations, setObservations] = useState(initialList);
  const [draft, setDraft] = useState(initialList.join(', '));
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState('');
  const [iteration, setIteration] = useState(0);
  const model = calculateExperiment(kind, values, observations, iteration);
  const reset = () => { setValues(initialExperimentValues(kind)); setObservations(initialList); setDraft(initialList.join(', ')); setError(null); setApplied('Original settings restored.'); setIteration(0); };
  const apply = event => {
    event.preventDefault();
    const parsed = parseObservations(draft);
    if (parsed.error) { setError(parsed.error); setApplied(''); inputRef.current?.focus(); return; }
    setObservations(parsed.values); setIteration(0); setError(null); setApplied(`Applied ${parsed.values.length} observations. ${kind === 'accumulator' ? 'The loop is back at step zero.' : 'The chart and summaries are updated.'}`);
  };
  return <section className="interactive-experiment" aria-labelledby={`${id}-title`}>
    <span className="eyebrow">PREDICT · CHANGE · EXPLAIN</span><h4 id={`${id}-title`}>{definition.title}</h4><p>{definition.invitation}</p>
    <div className="experiment-controls">
      {experimentControls[kind].map(control => <label key={control.key} htmlFor={`${id}-${control.key}`}><span>{control.label}<strong>{displayNumber(values[control.key])} {control.unit}</strong></span><input type="range" aria-label={control.label} id={`${id}-${control.key}`} min={control.min} max={control.max} step={control.step} value={values[control.key]} aria-valuetext={`${displayNumber(values[control.key])} ${control.unit}`} onChange={event => setValues(current => ({ ...current, [control.key]: Number(event.target.value) }))} /></label>)}
      {['statistics', 'accumulator'].includes(kind) && <form onSubmit={apply} className="experiment-list" noValidate><label htmlFor={`${id}-observations`}>Observations, in order</label><input id={`${id}-observations`} ref={inputRef} value={draft} onChange={event => { setDraft(event.target.value); setError(null); setApplied(''); }} maxLength={180} aria-invalid={!!error} aria-describedby={`${id}-input-help${error ? ` ${id}-error` : ''}`} /><small id={`${id}-input-help`}>Up to 12 numbers between −100 and 100, separated by commas. Use a dot for decimals. Leave blank to test an empty list.</small>{error && <p className="experiment-error" id={`${id}-error`} role="alert">{error} The displayed model still uses the last applied list.</p>}<button className="button outline" type="submit">Apply observations<ArrowRight size={16} /></button></form>}
      <div className="experiment-buttons">{kind === 'accumulator' && <button className="button primary" disabled={iteration >= observations.length} onClick={() => setIteration(value => Math.min(value + 1, observations.length))}>Process next input<ArrowRight size={16} /></button>}<button className="button outline" onClick={reset}><RotateCcw size={16} />Reset model</button></div>
      <p className="experiment-announcement" role="status">{applied}</p>
    </div>
    {kind === 'accumulator' && <pre className="experiment-code" aria-label="Running total pseudocode"><code>{'total = 0\nfor each value in inputs:\n    total = total + value\nreturn total'}</code></pre>}
    <div className="experiment-metrics" role="status" aria-live="polite" aria-atomic="true">{model.metrics.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.unit === '$' ? '$' : ''}{item.value}{item.unit !== '$' && item.unit && <small> {item.unit}</small>}</strong></div>)}</div>
    <ModelChart chart={model.chart} metrics={model.metrics} />
    <details className="experiment-data"><summary>Read the data table</summary><div className="experiment-table-wrap" tabIndex={0} role="region" aria-label="Experiment data table"><table><caption>Plotted values; display rounded to two decimal places</caption><thead><tr>{model.headers.map(title => <th key={title} scope="col">{title}</th>)}</tr></thead><tbody>{model.rows.length ? model.rows.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{typeof value === 'number' ? displayNumber(value) : value}</td>)}</tr>) : <tr><td colSpan={model.headers.length}>No observations. Add a list to compare values.</td></tr>}</tbody></table></div></details>
    <p className="experiment-notice"><strong>Look for this:</strong> {definition.notice}</p>
    <Formula definition={definition} /><p>{definition.model}</p><p className="experiment-limit"><strong>Model assumptions:</strong> {definition.limits}{kind === 'risk' && ' A negative reduction means the comparison rate is higher.'}</p>
    <TransferCheckpoint checkpoint={definition.checkpoint} />
  </section>;
}
