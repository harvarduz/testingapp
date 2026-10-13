import React, { useId, useState } from 'react';
import { ArrowRight, Check, RotateCcw } from 'lucide-react';
import { simplifyFraction } from './labs.js';
import { comparePacks } from './skillModels.js';
import './skill-playground.css';

const models = [{ id: 'fractions', label: 'Fractions', lesson: 1 }, { id: 'discounts', label: 'Discounts', lesson: 2 }, { id: 'prices', label: 'Unit prices', lesson: 4 }];
const initialPacks = () => ({ a: { price: '6.00', quantity: '4' }, b: { price: '8.00', quantity: '6' } });
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function SkillPlayground({ onOpenLesson }) {
  const id = useId();
  const [model, setModel] = useState('fractions');
  const [shaded, setShaded] = useState([0, 1, 2, 3]);
  const [discount, setDiscount] = useState(10);
  const [packs, setPacks] = useState(initialPacks);
  const [choice, setChoice] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const fraction = simplifyFraction(shaded.length, 8);
  const saved = 80 * discount / 100;
  const payable = 80 - saved;
  const comparison = comparePacks(packs.a, packs.b);
  const changeModel = next => { setModel(next); setFeedback(null); };
  const togglePiece = index => { setShaded(current => current.includes(index) ? current.filter(value => value !== index) : [...current, index]); setFeedback(null); };
  const changePack = (key, field, value) => { setPacks(current => ({ ...current, [key]: { ...current[key], [field]: value } })); setChoice(null); setFeedback(null); };
  const reset = () => {
    if (model === 'fractions') setShaded([0, 1, 2, 3]);
    else if (model === 'discounts') setDiscount(10);
    else { setPacks(initialPacks()); setChoice(null); }
    setFeedback(null);
  };
  const check = () => {
    if (model === 'fractions') {
      const correct = shaded.length === 6;
      setFeedback({ correct, title: correct ? 'Different pieces. The same amount.' : 'Compare equal groups.', text: correct ? 'Six of eight equal pieces simplify to three quarters: 6/8 = 3/4 = 75%.' : `You shaded ${shaded.length}/8. Group the eight pieces into four equal pairs, then shade three of those pairs.` });
    } else if (model === 'discounts') {
      const correct = payable === 60;
      setFeedback({ correct, title: correct ? 'You found the discount.' : 'Check the saving first.', text: correct ? '25% of $80 is $20. Subtract the saving: $80 − $20 = $60.' : `At ${discount}% off, you save ${money(saved)} and pay ${money(payable)}. To reach $60, find what percentage of $80 equals a $20 saving.` });
    } else if (comparison.valid && choice) {
      const correct = choice === comparison.winner;
      const [a, b] = comparison.packs;
      const roundedTie = comparison.winner !== 'equal' && money(a.unitPrice) === money(b.unitPrice);
      const explanation = comparison.winner === 'equal' ? 'Both packs have the same price per item. Choose the quantity you actually need.' : `Pack ${comparison.winner.toUpperCase()} has the lower unit price.${roundedTie ? ' The displayed amounts round to the same cent, but the unrounded unit prices differ.' : ''} Compare one item at a time, then consider whether you need the whole pack.`;
      setFeedback({ correct, title: correct ? 'A fair comparison.' : 'Use a shared unit.', text: `A: ${money(a.priceCents / 100)} ÷ ${a.quantity} = ${money(a.unitPrice)} per item. B: ${money(b.priceCents / 100)} ÷ ${b.quantity} = ${money(b.unitPrice)} per item. ${explanation}` });
    }
  };
  return <section className="landing-section landing-container skill-playground" aria-labelledby={`${id}-title`}>
    <div className="landing-section-heading" data-reveal><div><span className="landing-kicker">YOUR TURN</span><h2 id={`${id}-title`}>Make the idea work.</h2></div><p>Build a fraction, try a discount or compare two packs. Each model shows the calculation as you change it.</p></div>
    <div className="skill-playground-shell">
      <div className="skill-model-choices" role="group" aria-label="Choose a practice model">{models.map(item => <button key={item.id} aria-pressed={model === item.id} aria-controls={`${id}-model`} onClick={() => changeModel(item.id)}>{item.label}</button>)}</div>
      <div className="skill-model" id={`${id}-model`}>
        {model === 'fractions' && <><div className="skill-model-heading"><h3>Build three quarters.</h3><p>Shade equal pieces to show an amount equal to 3/4. Tap a shaded piece again to clear it.</p></div><div className="skill-fraction-pieces" role="group" aria-label="Practice fraction pieces">{Array.from({ length: 8 }, (_, index) => <button key={index} aria-label={`Practice piece ${index + 1}`} aria-pressed={shaded.includes(index)} onClick={() => togglePiece(index)}>{shaded.includes(index) ? <Check size={22} /> : index + 1}</button>)}</div><div className="skill-equation" role="status" aria-label="Fraction model"><strong>{shaded.length}/8</strong><span>=</span><strong>{fraction.numerator}/{fraction.denominator}</strong><span>=</span><strong>{shaded.length / 8 * 100}%</strong></div></>}
        {model === 'discounts' && <><div className="skill-model-heading"><h3>Find the discount.</h3><p>An item costs $80. Adjust the discount until the final price is exactly $60.</p></div><label className="skill-range-label" htmlFor={`${id}-discount`}>Discount <strong aria-hidden="true">{discount}%</strong></label><input id={`${id}-discount`} type="range" aria-valuetext={`${discount}% discount`} min={0} max={50} step={5} value={discount} style={{ '--range-progress': `${discount * 2}%` }} onChange={event => { setDiscount(Number(event.target.value)); setFeedback(null); }} /><div className="skill-money-summary" role="status" aria-label="Discount calculation"><div><span>Original price</span><strong>$80.00</strong></div><div><span>You save</span><strong>{money(saved)}</strong></div><div><span>You pay</span><strong>{money(payable)}</strong></div></div><div className="skill-discount-bar" aria-hidden="true"><span style={{ transform: `scaleX(${1 - discount / 100})` }} /></div><p className="skill-calculation">Saving = $80 × {discount} ÷ 100. Final price = $80 − {money(saved)}.</p></>}
        {model === 'prices' && <><div className="skill-model-heading"><h3>Which pack is better value?</h3><p>Change the prices or quantities, then compare the cost of one item. Prices are shown rounded to cents.</p></div><div className="skill-pack-grid">{['a', 'b'].map((key, index) => {
          const result = comparison.packs[index];
          return <fieldset key={key}><legend>Pack {key.toUpperCase()}</legend><label htmlFor={`${id}-${key}-price`}>Pack price ($)</label><input id={`${id}-${key}-price`} aria-describedby={!result.validPrice ? `${id}-${key}-price-error` : undefined} aria-invalid={!result.validPrice} type="number" inputMode="decimal" min={.01} max={100} step={.01} value={packs[key].price} onChange={event => changePack(key, 'price', event.target.value)} />{!result.validPrice && <p className="skill-input-error" id={`${id}-${key}-price-error`}>Use $0.01–$100, with up to two decimal places.</p>}<label htmlFor={`${id}-${key}-quantity`}>Items in the pack</label><input id={`${id}-${key}-quantity`} aria-describedby={!result.validQuantity ? `${id}-${key}-quantity-error` : undefined} aria-invalid={!result.validQuantity} type="number" inputMode="numeric" min={1} max={12} step={1} value={packs[key].quantity} onChange={event => changePack(key, 'quantity', event.target.value)} />{!result.validQuantity && <p className="skill-input-error" id={`${id}-${key}-quantity-error`}>Use 1–12 whole items.</p>}<p className="skill-unit-output">{comparison.valid ? <><strong>{money(result.unitPrice)}</strong> per item</> : 'Enter a valid price and quantity.'}</p></fieldset>;
        })}</div><div className="skill-pack-answers" role="group" aria-label="Which pack has the lower unit price?">{[{ id: 'a', label: 'Pack A' }, { id: 'b', label: 'Pack B' }, { id: 'equal', label: 'Same value' }].map(item => <button key={item.id} disabled={!comparison.valid} aria-pressed={choice === item.id} onClick={() => { setChoice(item.id); setFeedback(null); }}>{item.label}</button>)}</div></>}
      </div>
      <div className="skill-model-actions"><button className="landing-button landing-button-dark" disabled={model === 'prices' && (!comparison.valid || !choice)} onClick={check}>Check my model<ArrowRight size={17} /></button><button className="text-button" onClick={reset}><RotateCcw size={16} />Reset model</button></div>
      {feedback && <div className={`skill-model-feedback ${feedback.correct ? 'is-correct' : 'is-hint'}`} role="status"><strong>{feedback.title}</strong><p>{feedback.text}</p></div>}
      <div className="skill-model-next"><p>Take the next step with a worked example and more practice.</p><button className="landing-text-button" onClick={() => onOpenLesson(models.find(item => item.id === model).lesson)}>Open the full lesson<ArrowRight size={17} /></button></div>
    </div>
  </section>;
}
