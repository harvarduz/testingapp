import { mean, median, sum, cumsum } from 'd3-array';

export const experimentControls = {
  reaction: [control('hydrogen', 'Hydrogen coefficient', 1, 1, 6, 1, ''), control('oxygen', 'Oxygen coefficient', 1, 1, 6, 1, ''), control('water', 'Water coefficient', 1, 1, 6, 1, '')],
  cashflow: [control('opening', 'Opening cash', 100, 50, 300, 10, '$'), control('supplies', 'Upfront supply payment', 80, 20, 200, 10, '$'), control('overhead', 'Monthly overhead', 20, 0, 60, 10, '$'), control('receipt', 'Customer receipt', 120, 50, 300, 10, '$'), control('paymentMonth', 'Receipt arrives at end of month', 2, 1, 3, 1, '')],
  offers: [control('aMonthly', 'A monthly payment', 20, 5, 50, 1, '$'), control('aFee', 'A upfront fee', 0, 0, 100, 5, '$'), control('bMonthly', 'B monthly payment', 17, 5, 50, 1, '$'), control('bFee', 'B upfront fee', 50, 0, 100, 5, '$'), control('months', 'Contract term', 12, 1, 36, 1, 'months')],
  percentage: [control('initial', 'Initial price', 100, 10, 500, 10, '$'), control('rise', 'Price rise', 20, 0, 100, 5, '%'), control('discount', 'Discount on the new price', 20, 0, 100, 5, '%')],
  motion: [control('velocity', 'Initial velocity', 2, 0, 10, 1, 'm/s'), control('acceleration', 'Constant acceleration', 1, 0, 5, 0.5, 'm/s²'), control('time', 'Journey duration', 6, 1, 12, 1, 's')],
  pressure: [control('force', 'Force', 120, 30, 300, 10, 'N'), control('area', 'Contact area', 0.04, 0.01, 0.1, 0.01, 'm²')],
  volume: [control('length', 'Length', 4, 1, 10, 1, 'cm'), control('width', 'Width', 3, 1, 10, 1, 'cm'), control('height', 'Height', 2, 1, 10, 1, 'cm')],
  concentration: [control('solute', 'Solute mass', 10, 5, 50, 5, 'g'), control('solvent', 'Solvent mass', 90, 50, 500, 10, 'g')],
  light: [control('distance', 'Distance', 1, 0.5, 30, 0.5, 'AU')],
  breakEven: [control('fixed', 'Fixed cost', 40, 10, 200, 10, '$'), control('price', 'Price per unit', 5, 1, 15, 1, '$'), control('variable', 'Variable cost per unit', 3, 1, 12, 1, '$')],
  growth: [control('principal', 'Starting balance', 100, 100, 5000, 100, '$'), control('rate', 'Annual interest rate', 5, 0, 15, 1, '%'), control('years', 'Years', 10, 1, 30, 1, 'years')],
  risk: [control('baseline', 'Baseline group outcomes', 20, 0, 200, 5, 'per 1,000'), control('comparison', 'Comparison group outcomes', 10, 0, 200, 5, 'per 1,000')],
  statistics: [], accumulator: [],
};
function control(key, label, value, min, max, step, unit) { return { key, label, value, min, max, step, unit }; }
export function initialExperimentValues(kind) { return Object.fromEntries((experimentControls[kind] || []).map(item => [item.key, item.value])); }
export function parseObservations(text) {
  if (!text.trim()) return { values: [], error: null };
  const parts = text.split(',');
  if (parts.length > 12) return { error: 'Use at most 12 observations so each step remains readable.' };
  if (parts.some(part => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part.trim()))) return { error: 'Separate numbers with commas. Use a dot for decimals, for example 2, 3.5, −4 (type a minus sign as -).' };
  const values = parts.map(Number);
  if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 100)) return { error: 'Each observation must be between −100 and 100.' };
  return { values, error: null };
}
export function parseCheckpointAnswer(text) {
  const input = text.trim().replace(',', '.');
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input) && Number.isFinite(Number(input)) ? Number(input) : null;
}
export const displayNumber = value => Number.isFinite(value) ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : 'Undefined';
const point = (x, y) => ({ x, y });
const series = (name, points) => ({ name, points });
const metric = (label, value, unit = '') => ({ label, value: typeof value === 'number' ? displayNumber(value) : value, unit });
const range = (count, calculate) => Array.from({ length: count + 1 }, (_, x) => calculate(x));

export function calculateExperiment(kind, v, observations = [], iteration = 0) {
  let chart = {}, metrics = [], rows = [], headers = [];
  if (kind === 'reaction') {
    const reactants = [2 * v.hydrogen, 2 * v.oxygen], products = [2 * v.water, v.water];
    chart = { type: 'bar', xLabel: 'Element', yLabel: 'Atom count', labels: ['Hydrogen', 'Oxygen'], yDomain: [0, 12], series: [series('Reactants', reactants.map((y, x) => point(x, y))), series('Products', products.map((y, x) => point(x, y)))] };
    const balanced = reactants.every((count, i) => count === products[i]);
    metrics = [metric('Atom accounting', balanced ? 'Balanced' : 'Keep adjusting'), metric('Reaction', `${v.hydrogen}H₂ + ${v.oxygen}O₂ → ${v.water}H₂O`)];
    headers = ['Element', 'Reactant atoms', 'Product atoms']; rows = chart.labels.map((name, i) => [name, reactants[i], products[i]]);
  } else if (kind === 'cashflow') {
    const openingAfterSupplies = v.opening - v.supplies;
    const balances = [v.opening, openingAfterSupplies];
    for (let month = 1; month <= 3; month++) balances.push(balances.at(-1) - v.overhead + (month === v.paymentMonth ? v.receipt : 0));
    chart = { type: 'bar', xLabel: 'Cash-flow event', yLabel: 'Cash balance ($)', labels: ['Start', 'Paid', 'M1', 'M2', 'M3'], note: 'Start: opening cash. Paid: after upfront supplies. M1–M3: after each month’s payments and any receipt.', series: [series('Cash after event', balances.map((y, x) => point(x, y)))] };
    const lowest = Math.min(...balances);
    metrics = [metric('Ending cash', balances.at(-1), '$'), metric('Lowest event balance', lowest, '$'), metric('Funding gap at these events', Math.max(0, -lowest), '$')];
    headers = ['Event', 'Cash received ($)', 'Cash paid ($)', 'Balance ($)']; rows = balances.map((balance, i) => [['Opening cash', 'Upfront supplies', 'Month 1', 'Month 2', 'Month 3'][i], i >= 2 && i - 1 === v.paymentMonth ? v.receipt : 0, i === 1 ? v.supplies : i >= 2 ? v.overhead : 0, balance]);
  } else if (kind === 'offers') {
    const offerA = range(v.months, month => point(month, v.aFee + month * v.aMonthly));
    const offerB = range(v.months, month => point(month, v.bFee + month * v.bMonthly));
    const difference = offerB.at(-1).y - offerA.at(-1).y;
    chart = { xLabel: 'Monthly payments made', yLabel: 'Total paid ($)', series: [series('Offer A', offerA), series('Offer B', offerB)] };
    metrics = [metric('Offer A total', offerA.at(-1).y, '$'), metric('Offer B total', offerB.at(-1).y, '$'), metric('Cheaper over this term', difference === 0 ? 'Equal totals' : `${difference > 0 ? 'A' : 'B'} by $${displayNumber(Math.abs(difference))}`)];
    headers = ['Month', 'A total ($)', 'B total ($)']; rows = offerA.map((p, i) => [p.x, p.y, offerB[i].y]);
  } else if (kind === 'percentage') {
    const risen = v.initial * (1 + v.rise / 100), final = risen * (1 - v.discount / 100);
    const values = [v.initial, risen, final];
    chart = { type: 'bar', xLabel: 'Change stage', yLabel: 'Price ($)', labels: ['Original', 'After rise', 'After discount'], series: [series('Price', values.map((y, x) => point(x, y)))] };
    metrics = [metric('Final price', final, '$'), metric('Change from original', (final / v.initial - 1) * 100, '%')];
    headers = ['Stage', 'Price ($)']; rows = values.map((y, i) => [chart.labels[i], y]);
  } else if (kind === 'accumulator') {
    const totals = [0, ...cumsum(observations)];
    const step = Math.min(Math.max(0, iteration), observations.length);
    chart = { xLabel: 'Inputs processed', yLabel: 'Running total', series: [series('Processed total', totals.slice(0, step + 1).map((y, x) => point(x, y)))], xDomain: [0, Math.max(1, observations.length)], yDomain: [Math.min(0, ...totals), Math.max(1, ...totals)] };
    metrics = [metric('Inputs processed', `${step} / ${observations.length}`), metric('Current total', totals[step])];
    headers = ['Step', 'Input', 'Total']; rows = totals.slice(0, step + 1).map((total, i) => [i, i ? observations[i - 1] : '—', total]);
  } else if (kind === 'motion') {
    const points = range(v.time, t => point(t, v.velocity * t + 0.5 * v.acceleration * t * t));
    chart = { xLabel: 'Time (s)', yLabel: 'Position (m)', series: [series('Position', points)] };
    metrics = [metric('Final position', points.at(-1).y, 'm'), metric('Final velocity', v.velocity + v.acceleration * v.time, 'm/s')];
    headers = ['Time (s)', 'Position (m)', 'Velocity (m/s)']; rows = points.map(p => [p.x, p.y, v.velocity + v.acceleration * p.x]);
  } else if (kind === 'pressure') {
    const points = range(9, n => { const area = (n + 1) / 100; return point(area, v.force / area); });
    chart = { xLabel: 'Area (m²)', yLabel: 'Pressure (Pa)', series: [series('Average pressure', points)], marker: point(v.area, v.force / v.area) };
    metrics = [metric('Selected pressure', v.force / v.area, 'Pa'), metric('Contact area', v.area, 'm²')];
    headers = ['Area (m²)', 'Pressure (Pa)']; rows = points.map(p => [p.x, p.y]);
  } else if (kind === 'volume') {
    const base = v.length * v.width, volume = base * v.height;
    chart = { xLabel: 'Height (cm)', yLabel: 'Volume (cm³)', series: [series('Volume with this base', range(10, h => point(h, base * h)))], marker: point(v.height, volume) };
    metrics = [metric('Base area', base, 'cm²'), metric('Volume', volume, 'cm³'), metric('Surface area', 2 * (base + v.length * v.height + v.width * v.height), 'cm²')];
    headers = ['Height (cm)', 'Volume (cm³)']; rows = chart.series[0].points.map(p => [p.x, p.y]);
  } else if (kind === 'concentration') {
    const concentration = solvent => 100 * v.solute / (v.solute + solvent);
    const points = range(45, n => point(50 + n * 10, concentration(50 + n * 10)));
    chart = { xLabel: 'Solvent mass (g)', yLabel: 'Solute (% by mass)', series: [series('Mass concentration', points)], marker: point(v.solvent, concentration(v.solvent)) };
    metrics = [metric('Solute concentration', concentration(v.solvent), '% by mass'), metric('Total solution mass', v.solute + v.solvent, 'g')];
    headers = ['Solvent (g)', 'Total mass (g)', 'Solute (% by mass)']; rows = points.filter((_, i) => i % 5 === 0 || points[i].x === v.solvent).map(p => [p.x, v.solute + p.x, p.y]);
  } else if (kind === 'light') {
    const minutesPerAU = 149597870700 / 299792458 / 60;
    chart = { xLabel: 'Distance (AU)', yLabel: 'One-way light time (min)', series: [series('Light travel time', range(30, d => point(d, d * minutesPerAU)))], marker: point(v.distance, v.distance * minutesPerAU) };
    metrics = [metric('One-way delay', v.distance * minutesPerAU, 'min'), metric('Round-trip delay', 2 * v.distance * minutesPerAU, 'min')];
    headers = ['Distance (AU)', 'One-way time (min)']; rows = [0, 1, v.distance, 5, 10, 20, 30].filter((d, i, all) => all.indexOf(d) === i).sort((a, b) => a - b).map(d => [d, d * minutesPerAU]);
  } else if (kind === 'breakEven') {
    const contribution = v.price - v.variable;
    const breakEven = contribution > 0 ? Math.ceil(v.fixed / contribution) : null;
    const cap = Math.max(50, (breakEven || 0) + 10);
    const quantities = Array.from(new Set([0, ...Array.from({ length: 10 }, (_, i) => Math.round((i + 1) * cap / 10)), ...(breakEven === null ? [] : [breakEven])])).sort((a, b) => a - b);
    const revenue = quantities.map(q => point(q, v.price * q)), cost = quantities.map(q => point(q, v.fixed + v.variable * q));
    chart = { xLabel: 'Units sold', yLabel: 'Amount ($)', series: [series('Revenue', revenue), series('Total cost', cost)] };
    metrics = [metric('Contribution per sale', contribution, '$'), metric('First whole-unit break-even', breakEven === null ? 'No finite quantity' : breakEven, breakEven === null ? '' : 'units')];
    headers = ['Units', 'Revenue ($)', 'Total cost ($)', 'Profit ($)']; rows = quantities.map((q, i) => [q, revenue[i].y, cost[i].y, revenue[i].y - cost[i].y]);
  } else if (kind === 'growth') {
    const compound = range(v.years, y => point(y, v.principal * (1 + v.rate / 100) ** y));
    const simple = range(v.years, y => point(y, v.principal * (1 + y * v.rate / 100)));
    chart = { xLabel: 'Year', yLabel: 'Balance ($)', series: [series('Compound', compound), series('Simple', simple)] };
    metrics = [metric('Compound balance', compound.at(-1).y, '$'), metric('Simple balance', simple.at(-1).y, '$'), metric('Interest-on-interest difference', compound.at(-1).y - simple.at(-1).y, '$')];
    headers = ['Year', 'Compound ($)', 'Simple ($)']; rows = compound.map((p, i) => [p.x, p.y, simple[i].y]);
  } else if (kind === 'risk') {
    const absolute = (v.baseline - v.comparison) / 10;
    const relative = v.baseline === 0 ? null : (v.baseline - v.comparison) / v.baseline * 100;
    chart = { type: 'bar', xLabel: 'Hypothetical group', yLabel: 'Outcomes per 1,000', labels: ['Baseline', 'Comparison'], yDomain: [0, 200], series: [series('Outcome count', [point(0, v.baseline), point(1, v.comparison)])] };
    metrics = [metric('Absolute reduction', absolute, 'percentage points'), metric('Relative reduction', relative === null ? 'Undefined (zero baseline)' : relative, relative === null ? '' : '%')];
    headers = ['Group', 'Outcomes / 1,000', 'Rate (%)']; rows = [['Baseline', v.baseline, v.baseline / 10], ['Comparison', v.comparison, v.comparison / 10]];
  } else if (kind === 'statistics') {
    chart = { type: 'bar', xLabel: 'Observation number', yLabel: 'Value', yDomain: [-100, 100], labels: observations.map((_, i) => String(i + 1)), series: [series('Observation', observations.map((y, x) => point(x, y)))] };
    metrics = [metric('Mean', observations.length ? mean(observations) : 'No observations'), metric('Median', observations.length ? median(observations) : 'No observations'), metric('Count', observations.length), metric('Sum', sum(observations))];
    headers = ['Observation', 'Value']; rows = observations.map((v, i) => [i + 1, v]);
  } else throw new Error('Unknown lesson experiment.');
  return { chart, metrics, headers, rows };
}
