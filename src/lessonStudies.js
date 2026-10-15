// Curated supplements use stable course IDs and exact lesson titles. Creator
// courses cannot accidentally inherit a built-in experiment or its answers.
const section = (title, text) => ({ title, text });
const check = (question, answer, unit, hint, explanation) => ({ question, answer, unit, hint, explanation });

export const experimentDefinitions = {
  reaction: {
    title: 'Balance atoms without changing substances',
    invitation: 'Change the coefficients of H₂, O₂ and H₂O. Compare the count of each element on the two sides before deciding the reaction is balanced.',
    model: 'A coefficient multiplies every atom in its formula. Hydrogen requires 2a = 2c; oxygen requires 2b = c. The smallest positive whole-number solution is a = 2, b = 1, c = 2.',
    formula: 'a\\,\\mathrm{H_2}+b\\,\\mathrm{O_2}\\longrightarrow c\\,\\mathrm{H_2O}',
    formulaText: 'a hydrogen molecules plus b oxygen molecules form c water molecules. Adjust coefficients, not the subscripts in the chemical formulas.',
    limits: 'Atom accounting for this idealized reaction. It does not simulate reaction rate, heat or a safe laboratory procedure.',
    notice: 'Compare coefficients 2, 1, 2 with 4, 2, 4. Both conserve atoms; the first gives the smallest whole-number ratio.',
    checkpoint: check('In 4H₂ + bO₂ → 4H₂O, what value of b balances oxygen?', 2, '', 'The four water molecules contain four oxygen atoms. Each O₂ molecule supplies two.', 'b = 2 supplies four oxygen atoms. Hydrogen is already balanced: eight atoms on each side.'),
  },
  cashflow: {
    title: 'A profitable sale can still leave a cash gap',
    invitation: 'Keep the customer payment fixed, then delay its arrival. Watch the cash balance between the initial purchase and the final receipt.',
    model: 'At each date, closing cash equals opening cash plus receipts minus payments. A negative balance indicates a funding gap in this plan, even when the ending balance is positive.',
    formula: 'C_{end}=C_{start}+\\mathrm{receipts}-\\mathrm{payments}',
    formulaText: 'Closing cash equals opening cash plus money received minus money paid during the period.',
    limits: 'A three-month plan with an upfront supply payment, monthly overhead and one customer receipt at the end of the selected month. No borrowing or other cash flows are included. The chart shows balances after the stated events; intramonth payment order may create an additional gap.',
    notice: 'Move the customer receipt from month 1 to month 3. The final total stays the same, but what happens before the receipt?',
    checkpoint: check('Start with $100, pay $80 for supplies now, then $30 overhead before any customer receipt. What cash balance does the plan reach?', -10, '$', 'Subtract both payments from the opening cash. A negative result is allowed.', '$100 − $80 − $30 = −$10. The plan needs $10 of funding by that point; a later profitable receipt cannot pay an earlier bill.'),
  },
  offers: {
    title: 'Look past the monthly price',
    invitation: 'Compare two offers for the same service and term. Change fees and monthly prices, then find when the cheaper total changes.',
    model: 'Total cost is the mandatory upfront fee plus the monthly price multiplied by the number of months. The lower monthly price can take time to recover a larger fee.',
    formula: 'T(m)=f+mp',
    formulaText: 'Total paid over m months equals the mandatory upfront fee plus m times the monthly payment.',
    limits: 'Equivalent service, one upfront fee and fixed monthly payments, with no interest, taxes, discounts or cancellation charges. Affordability and payment timing are separate considerations.',
    notice: 'With the original settings, compare 12 months with 24 months. At what whole month does B first become cheaper?',
    checkpoint: check('Offer A costs $20 monthly for 12 months. B costs $17 monthly plus a $50 fee. How much more does B cost over the term?', 14, '$', 'Calculate both totals before subtracting: A = 20 × 12; B = 17 × 12 + 50.', 'A totals $240 and B totals $254. B costs $14 more despite its lower monthly price.'),
  },
  percentage: {
    title: 'Two changes, two starting values',
    invitation: 'Try a rise followed by a discount. Before moving the controls, predict whether equal percentages will return you to the starting amount.',
    model: 'The discount acts on the increased price. Each change multiplies the current amount; the original amount is not reused as the base.',
    formula: 'P_{final}=P_0(1+r/100)(1-d/100)',
    formulaText: 'Final price equals initial price times one plus the rise rate times one minus the discount rate.',
    limits: 'A price model with no taxes, fees or rounding between steps. Currency is rounded only for display.',
    notice: 'Set the rise and discount to 20%. Explain why the $4 loss on $100 is not a calculation error.',
    checkpoint: check('A $200 price rises by 10%, then falls by 10%. What is the final price?', 198, '$', 'Calculate the increased price first. The second 10% uses that new price.', '$200 × 1.10 = $220; $220 × 0.90 = $198. Equal percentage changes have different bases.'),
  },
  accumulator: {
    title: 'Watch the state, one input at a time',
    invitation: 'Edit a list, predict its total, then advance the loop. The chart includes the initial state, before any input has been processed.',
    model: 'After k iterations, total equals the sum of the first k inputs. This loop invariant explains why an update must preserve the previous total.',
    formula: 'S_0=0,\\qquad S_k=S_{k-1}+x_k',
    formulaText: 'The initial sum is zero. Each next sum is the previous sum plus the next input.',
    limits: 'This is a trace of the displayed sum algorithm, not a JavaScript execution environment. Values are limited to −100 through 100.',
    notice: 'Include a negative value. A correct running total can decrease; it does not have to increase at each step.',
    checkpoint: check('A total starts at 0 and processes [5, −2, 4]. What is the total after the second input?', 3, '', 'Stop after adding −2; the final 4 has not been processed yet.', 'The trace is 0 → 5 → 3 → 7. After exactly two inputs, the total is 3.'),
  },
  motion: {
    title: 'Connect a journey to its graph',
    invitation: 'Change initial speed and constant acceleration. Predict the shape of the position graph, then compare it with the table.',
    model: 'Position accumulates motion over time; with acceleration, velocity itself changes. The curved position graph comes from accumulating a changing velocity.',
    formula: 'x(t)=v_0t+\\tfrac12at^2,\\qquad v(t)=v_0+at',
    formulaText: 'Position is initial velocity times time plus half acceleration times time squared. Velocity is initial velocity plus acceleration times time.',
    limits: 'One-dimensional motion starting at position zero, with constant acceleration. The model omits air resistance and changing forces.',
    notice: 'Set acceleration to zero. Then increase it. Which graph is straight, and what does a steeper section mean?',
    checkpoint: check('Starting at rest with acceleration 2 m/s², how far does the object travel in 3 seconds?', 9, 'm', 'Use half × acceleration × time squared. Initial velocity is zero.', '½ × 2 × 3² = 9 m. Multiplying acceleration by time gives velocity, not distance.'),
  },
  pressure: {
    title: 'Same force, different contact',
    invitation: 'Hold the force fixed and increase contact area. Predict whether pressure doubles or halves when area doubles.',
    model: 'Pressure measures force per unit area. The curve is inverse: adding the same amount of area produces a smaller pressure reduction when the existing area is already large.',
    formula: 'p=F/A,\\qquad 1\\,\\mathrm{Pa}=1\\,\\mathrm{N/m^2}',
    formulaText: 'Average pressure equals force divided by contact area. One pascal is one newton per square metre.',
    limits: 'Average pressure over the stated area. An uneven surface can have local pressures above or below this average.',
    notice: 'Compare 0.02 → 0.04 m² with 0.04 → 0.08 m². The area doubles in both cases; the pressure halves in both.',
    checkpoint: check('A 90 N force is spread over 0.03 m². What is the average pressure?', 3000, 'Pa', 'Divide by 0.03, not by 3. Check that your area is in square metres.', '90 ÷ 0.03 = 3000 Pa. The same force over 0.06 m² would give 1500 Pa.'),
  },
  statistics: {
    title: 'One outlier, two summaries',
    invitation: 'Edit the observations. Compare the mean and median before and after replacing just one value with an extreme observation.',
    model: 'The mean uses every magnitude. The median uses order and the middle position. Neither tells you how the observations were selected.',
    formula: '\\bar{x}=\\frac{\\sum_{i=1}^{n}x_i}{n}',
    formulaText: 'The mean is the sum of all observations divided by their count.',
    limits: 'Descriptive statistics for the entered list. The chart has a fixed −100 to 100 scale so changing one observation cannot silently stretch the axis. It does not estimate population uncertainty.',
    notice: 'Compare [2, 3, 4, 5, 6] with [2, 3, 4, 5, 100]. Which summary changes most, and which would you report for a typical value?',
    checkpoint: check('For [2, 3, 4, 5, 100], how much larger is the mean than the median?', 18.8, '', 'The sum is 114 and there are five values. Subtract the middle ordered value from the mean.', 'Mean = 114 ÷ 5 = 22.8; median = 4. Their difference is 18.8. The outlier affects the mean strongly.'),
  },
  volume: {
    title: 'Scale a box, then check the units',
    invitation: 'Change one dimension at a time. Predict volume before changing all three dimensions together.',
    model: 'A base layer has length × width square units. Height tells you how many unit layers to stack. Scaling every length by k scales volume by k³.',
    formula: 'V=lwh,\\qquad V_{scaled}=k^3V',
    formulaText: 'Box volume equals length times width times height. Scaling every length by k multiplies volume by k cubed.',
    limits: 'An ideal rectangular box with interior dimensions in centimetres. Wall thickness and packing gaps are omitted.',
    notice: 'Double length alone and compare with doubling all three dimensions. Explain why the volume factors are 2 and 8.',
    checkpoint: check('A 2 × 3 × 4 cm box has every dimension doubled. What is the new volume?', 192, 'cm³', 'First find 24 cm³, then multiply by 2³. Or multiply 4 × 6 × 8.', '4 × 6 × 8 = 192 cm³. Doubling three independent dimensions gives eight times the original volume.'),
  },
  concentration: {
    title: 'Dilution without losing solute',
    invitation: 'Add solvent while keeping the solute mass fixed. Predict whether the solute disappears or its share of the mixture changes.',
    model: 'Mass percentage divides solute mass by the total solution mass. Adding pure solvent increases the denominator while conserving solute mass.',
    formula: 'w=\\frac{m_{solute}}{m_{solute}+m_{solvent}}\\times100\\%',
    formulaText: 'Mass percentage is solute mass divided by total solution mass, times one hundred percent.',
    limits: 'Mass-based concentration for a fully dissolved mixture with no evaporation or reaction. These controls do not represent volume or molarity.',
    notice: 'With 10 g solute and 90 g solvent the mixture is 10% by mass. Add 100 g solvent: why does the concentration halve?',
    checkpoint: check('A solution contains 20 g solute and 80 g solvent. Add 100 g pure solvent. What is the new mass percentage?', 10, '%', 'The solute stays 20 g. The new total solution mass is 200 g.', '20 ÷ (20 + 80 + 100) × 100 = 10%. Solute mass is conserved; concentration changes.'),
  },
  light: {
    title: 'Distance is also a delay',
    invitation: 'Choose a distance in astronomical units. Read the light travel time and think about what “seeing now” means.',
    model: 'Travel time is distance divided by speed. The astronomical unit is a defined length; light takes about 499 seconds to cross one AU.',
    formula: 't=d/c,\\qquad 1\\,\\mathrm{AU}=149{,}597{,}870{,}700\\,\\mathrm{m}',
    formulaText: 'Light travel time equals distance divided by light speed. An astronomical unit is 149,597,870,700 metres.',
    limits: 'Straight travel in vacuum, using c = 299,792,458 m/s. A chosen distance is not a live planet position; orbital distances vary.',
    notice: 'Double the distance. Does the delay double? Why is this relationship straight while compound growth is curved?',
    checkpoint: check('Using 8.3 minutes per AU as an approximation, what is the light travel time across 6 AU?', 49.8, 'min', 'Multiply the stated approximate time for one AU by six.', '6 × 8.3 = 49.8 minutes. The interactive model uses the more precise physical constants, so its value differs slightly.'),
  },
  breakEven: {
    title: 'Where revenue catches total cost',
    invitation: 'Change price, unit cost and fixed cost. Look for the first whole number of sales that avoids a loss.',
    model: 'Each sale contributes price minus variable cost toward fixed cost. If that contribution is zero or negative, more sales cannot recover a positive fixed cost.',
    formula: '\\pi(q)=(p-v)q-F',
    formulaText: 'Profit equals price minus variable unit cost, times quantity, minus fixed cost.',
    limits: 'All produced units are sold at one price; costs stay constant in this range. The model excludes tax, inventory changes and capacity limits.',
    notice: 'Set price equal to unit cost, then below it. Explain why there is no finite break-even quantity with a positive fixed cost.',
    checkpoint: check('Fixed cost is $45, price is $8 and variable cost is $5 per unit. How many whole units are needed to break even?', 15, 'units', 'Each sale contributes $3. Divide the fixed cost by this contribution.', '(8 − 5) × 15 − 45 = 0. Revenue of $120 equals total cost of $120.'),
  },
  growth: {
    title: 'Interest on interest',
    invitation: 'Compare simple and annual compound growth with the same starting balance and rate. Track their gap over time.',
    model: 'Simple interest repeatedly uses the original principal. Compound interest uses the updated balance. The curves coincide after one year but generally separate after that.',
    formula: 'B_n=P(1+r/100)^n,\\qquad S_n=P(1+nr/100)',
    formulaText: 'Compound balance is principal times one plus the annual rate raised to the number of years. Simple balance is principal times one plus years times the annual rate.',
    limits: 'A constant annual rate, annual compounding and no deposits, withdrawals, fees, tax or inflation. This is a mathematical scenario, not a return forecast.',
    notice: 'Set the rate to zero, then compare years 1 and 10 at 5%. Explain which amount earns interest in each model.',
    checkpoint: check('Starting with $100 at 10% compounded annually, what is the balance after two years?', 121, '$', 'The first year ends at $110. The second year earns 10% of $110.', '$100 × 1.10² = $121. Simple interest would give $120; the extra $1 is interest on the first year’s interest.'),
  },
  risk: {
    title: 'Put the headline back into counts',
    invitation: 'Change outcome counts in two hypothetical groups of 1,000 over the same time period. Compare absolute and relative changes.',
    model: 'Absolute reduction subtracts the two rates. Relative reduction divides that difference by the baseline rate. Keeping both denominators visible prevents a large relative number from hiding a small starting risk.',
    formula: 'ARR=p_A-p_B,\\qquad RRR=\\frac{p_A-p_B}{p_A}',
    formulaText: 'Absolute risk reduction is baseline risk minus comparison risk. Relative reduction divides that difference by the baseline risk.',
    limits: 'Hypothetical groups with the same denominator and period. No confidence intervals or causal conclusion are implied. A zero baseline makes relative reduction undefined.',
    notice: 'Compare 20 → 10 with 200 → 100 outcomes. Both halve relative risk; how do their absolute reductions differ?',
    checkpoint: check('A rate falls from 8% to 6%. What is the relative reduction, in percent?', 25, '%', 'The absolute reduction is 2 percentage points. Divide 2 by the baseline 8, then multiply by 100.', '(8 − 6) ÷ 8 × 100 = 25%. The absolute reduction is 2 percentage points, not 25.'),
  },
};

const studies = [
  ['numbers', 'Calculate a percentage change', 'Name the base before calculating', 'percentage', [
    section('Multipliers explain successive changes', 'A 20% rise multiplies a value by 1.20. A 20% fall multiplies the new value by 0.80. Their product is 0.96, so a rise and fall of equal percentage leave 96% of the original. Reversing a 20% rise requires a fall of 1 − 1/1.20, about 16.67%. The operation can be undone, but the inverse multiplier is not found by simply changing the sign.'),
    section('Separate relative change from percentage points', 'If a pass rate rises from 40% to 50%, the absolute change is 10 percentage points. Relative to the starting 40%, the increase is 10/40 = 25%. Include the original and new amounts in your explanation. When the original is zero, report an absolute change instead of dividing by zero.'),
  ], 'OpenStax · Percent applications', 'https://openstax.org/books/prealgebra-2e/pages/6-1-understand-percent'],
  ['computing', 'Keep a running total', 'Explain why the loop works', 'accumulator', [
    section('State an invariant, then preserve it', 'Before the first iteration, the total of the processed inputs is zero because none have been processed. Suppose the stored total is correct after k inputs. Adding the next input makes it correct after k + 1. When all inputs are processed, the same statement describes the whole list. This is a reason the algorithm works, rather than a guess based on one successful test.'),
    section('Choose tests that challenge the rule', 'A list of positive numbers may hide a mistaken “take the maximum” update. Test a negative value, zero, one item and an empty list. For [5, −2, 4], the states are 0, 5, 3, 7. An empty list should leave a sum at zero; finding a maximum requires a different empty-input policy. Write down the expected result before running the trace.'),
  ], 'MDN · Loops and iteration', 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration'],
  ['logic', 'Find a counterexample', 'Disprove the right statement', null, [
    section('Keep the domain and conclusion separate', 'The claim “every prime is odd” has a domain: prime numbers. A counterexample must belong to that domain and fail the conclusion. The number 2 qualifies because it has exactly two positive divisors and is even. The number 9 does not qualify: being an odd composite does not challenge a claim about primes. Writing the claim as “if prime, then odd” makes the direction clear.'),
    section('Use a counterexample to improve a claim', 'After finding 2, revise the statement to “every prime greater than 2 is odd.” Now give a reason: any even integer greater than 2 is divisible by 2 and itself, so it cannot be prime. Testing 3, 5 and 7 supported the first claim but could never remove the exception. A corrected general claim still needs a reason that covers its entire domain.'),
  ], 'OpenStax · Contemporary Mathematics', 'https://openstax.org/details/books/contemporary-mathematics'],
  ['physics', 'Connect pressure to contact area', 'Derive a pressure comparison', 'pressure', [
    section('Use ratios before reaching for a calculator', 'At fixed force, pressure is inversely proportional to contact area. Dividing p₂ = F/A₂ by p₁ = F/A₁ gives p₂/p₁ = A₁/A₂. If area becomes three times as large, average pressure becomes one third. This comparison works without knowing the force, provided the force really stays the same.'),
    section('Square units change the conversion', 'One centimetre is 0.01 metre, so one square centimetre is 0.0001 square metre. A 100 N force over 100 cm² acts over 0.01 m² and gives 10,000 Pa. Dividing by 100 without converting produces the wrong unit. Average pressure also cannot identify the highest local pressure on an uneven surface.'),
  ], 'OpenStax · Fluids', 'https://openstax.org/books/college-physics-2e/pages/11-introduction-to-fluid-statics'],
  ['data', 'Check whether a sample represents the group', 'Audit the path from data to claim', 'statistics', [
    section('Coverage comes before a bigger sample', 'Suppose 800 students attend a school, but a survey link is sent only to a 100-member club. Even if all 100 answer, the response rate among invited students is 100% while 700 students had no chance to participate. A precise summary of the club can still be a poor estimate of the school. Record the target population, invitation method and missing groups separately.'),
    section('A better summary cannot repair selection bias', 'The mean and median answer questions about measured values. Replacing a mean with a median can reduce sensitivity to an extreme value, but it cannot recover the views of people never sampled. Invite students across year groups, examine who responds and describe remaining uncertainty. Choose the summary after checking what each observation represents.'),
  ], 'OpenStax · Sampling and data', 'https://openstax.org/books/introductory-statistics-2e/pages/1-introduction'],
  ['geometry', 'Calculate the volume of a box', 'Connect dimensions to scaling', 'volume', [
    section('Build volume from unit layers', 'A 4 cm by 3 cm base contains twelve 1 cm² squares. A layer 1 cm high therefore holds twelve 1 cm³ cubes. Stacking two such layers gives 24 cm³. This explains the multiplication length × width × height and why the result uses cubic units. A side length by itself cannot tell you how much the box holds.'),
    section('Capacity and covering scale differently', 'Doubling every dimension creates eight times the capacity because 2 × 2 × 2 = 8. Its exterior area becomes four times as large because each face scales in two dimensions. For a cube, volume is s³ while surface area is 6s². A larger container therefore does not require packaging material in the same proportion as its capacity.'),
  ], 'OpenStax · Geometry', 'https://openstax.org/books/prealgebra-2e/pages/9-introduction'],
  ['biology', 'Use a model of inheritance carefully', 'Read a probability model responsibly', null, [
    section('Enumerate equally likely combinations', 'In a simplified single-gene model, each Aa parent passes A or a with probability one half. The combinations are AA, Aa, aA and aa, each with probability one quarter. Combining the two heterozygous outcomes gives a one-half chance of Aa. Each offspring is a new event: three earlier outcomes do not force the fourth to complete a 3:1 pattern.'),
    section('Separate genotype from a complex trait', 'A dominant allele in this model affects the stated phenotype when one copy is present. “Dominant” does not mean stronger, better or more common in a population. Real traits may involve many genes, environment, incomplete dominance or different inheritance patterns. State the model’s assumptions before using its probabilities; do not apply a classroom square to personal health predictions.'),
  ], 'OpenStax · Mendel’s experiments and heredity', 'https://openstax.org/books/biology-2e/pages/12-introduction'],
  ['chemistry', 'Balance atoms in a reaction', 'Conserve atoms, change the grouping', 'reaction', [
    section('Count each element on both sides', 'In H₂ + O₂ → H₂O, oxygen is unbalanced: two oxygen atoms enter but only one leaves. Use 2H₂ + O₂ → 2H₂O. Now both sides contain four hydrogen atoms and two oxygen atoms. The coefficient multiplies an entire formula; a subscript belongs to the identity of the substance. Changing H₂O to H₂O₂ would describe a different substance.'),
    section('Use conservation in a different setting', 'Balancing a reaction conserves atoms while rearranging their bonds. Diluting a nonreacting solution conserves the solute while adding solvent. These are different processes with the same useful question: what stays constant? In the experiment below, change coefficients while keeping each substance’s formula intact. Compare both elements before declaring the reaction balanced.'),
  ], 'OpenStax · Chemical reactions', 'https://openstax.org/books/chemistry-2e/pages/4-introduction'],
  ['astronomy', 'Use a light-travel-time model', 'Connect observation to the past', 'light', [
    section('Check dimensions and the meaning of a unit', 'The speed of light is 299,792,458 metres per second in vacuum. Dividing metres by metres per second leaves seconds, which is the unit of travel time. A light-year measures distance: it is how far light travels in a year. It is not a time delay by itself until you specify a light-travel scenario.'),
    section('A picture has an observation time', 'At one AU, the delay is about 8 minutes 19 seconds. Seeing a distant object records light that left earlier; a signal sent back must make another journey. For a fixed separation, a round trip takes twice the one-way time. Actual spacecraft communication also depends on changing separation, routing and processing, so this straight-line model is a starting estimate.'),
  ], 'NASA · What is a light-year?', 'https://spaceplace.nasa.gov/light-year/en/'],
  ['earth', 'Interpret a flood-risk forecast', 'Explain risk without promising an outcome', null, [
    section('A chance per year is not a schedule', 'A 1% annual exceedance chance means the stated flood level has a 1-in-100 chance of being exceeded in a given year under the model. It does not mean floods arrive exactly once every hundred years. Under an independent, constant-risk model, the chance of at least one exceedance in 30 years is 1 − 0.99³⁰, about 26%. Real hazards can change, so state those assumptions.'),
    section('Connect the forecast to a decision', 'Rainfall is one input. Soil saturation, drainage, land cover and upstream flow can change the runoff reaching a location. Compare the forecast period and place with the decision you are making, and distinguish flood probability from consequences. A lower-probability event with severe consequences may still justify preparation. Use official local alerts for an actual emergency.'),
  ], 'USGS · The 100-year flood', 'https://www.usgs.gov/special-topics/water-science-school/science/100-year-flood'],
  ['english', 'Revise vague references', 'Make the reader’s task easier', null, [
    section('Give a pronoun a clear referent', '“Maya sent Sara the draft after she revised it” leaves the reviser unclear. If Maya revised it, write “After revising the draft, Maya sent it to Sara.” If Sara revised it, name Sara explicitly. A shorter sentence is not automatically clearer: repeat a noun when the repetition prevents a consequential misunderstanding.'),
    section('Revise in two passes', 'First identify the reader’s task: understand a claim, follow an instruction or make a decision. Then underline pronouns and broad words such as “this,” “it” and “better.” Ask what each refers to and by which criterion something improves. Replace “This made it better” with a concrete link such as “Adding labels made the chart easier to compare.” Read the revision without the surrounding paragraph to test whether enough context remains.'),
  ], 'Purdue OWL · Pronoun reference', 'https://owl.purdue.edu/owl/general_writing/grammar/pronouns/index.html'],
  ['history', 'Separate an event from its later interpretation', 'Build a claim with an evidence trail', null, [
    section('Date the event and the account separately', 'A memoir written in 1970 about an event in 1930 is evidence of a later recollection. It may contain useful testimony, but its date, purpose and audience differ from a diary entry made at the time. “Primary” is a relationship to the research question, not a guarantee of accuracy. Record when the source was created as well as which event it describes.'),
    section('Corroborate without counting copies', 'Three articles repeating one unverified report are not three independent confirmations. Trace where a claim came from, compare accounts with different access and incentives, and look for records that could challenge it. In your conclusion, distinguish “the source claims,” “another record supports” and “the evidence does not establish.” A cautious claim can be more informative than a confident claim that hides a gap.'),
  ], 'Library of Congress · Analyzing primary sources', 'https://www.loc.gov/programs/teachers/getting-started-with-primary-sources/guides/'],
  ['geography', 'Choose a map projection for a task', 'Choose which distortion matters', null, [
    section('A flat map trades one property for another', 'Flattening a curved surface introduces distortion. An equal-area projection preserves relative areas but may distort shapes. A conformal projection preserves local angles but can strongly enlarge high-latitude regions. No single flat world map preserves area, shape, distance and direction everywhere. Name the task before selecting the map.'),
    section('Match a calculation to the map’s limits', 'For comparing forest coverage between continents, preserving area matters. For measuring a short local route, use an appropriate local projection and the stated scale. A scale bar on a world map does not make every long distance equally reliable. Check the legend, projection, geographic extent and data date before interpreting a visual difference as a difference in the world.'),
  ], 'USGS · Map projections', 'https://www.usgs.gov/programs/national-geospatial-program/map-projections'],
  ['business', 'Read a cash-flow timeline', 'Separate profitability from cash available', 'cashflow', [
    section('Record when money actually moves', 'A customer’s promise to pay next month is different from cash available today. If a business starts with $100, pays $80 for supplies today and receives $120 next month, today’s cash is $20. The activity may earn a profit overall, yet a bill due before the customer pays can still create a shortfall. Put receipts and payments on dates rather than only adding their final totals.'),
    section('Use break-even as one part of a plan', 'Contribution per unit helps estimate how many sales cover fixed cost, but the break-even quantity does not specify when those sales are paid. Check capacity, unsold inventory and payment terms separately. The timeline below makes receipt timing visible. Change only the payment month to see why an unchanged final total can hide a different funding requirement.'),
  ], 'OpenStax · Accounting', 'https://openstax.org/details/books/principles-financial-accounting'],
  ['economics', 'Distinguish fixed cost from sunk cost', 'Choose using the costs still ahead', 'breakEven', [
    section('Ask whether the cost is avoidable now', '“Fixed” describes how a cost behaves over a quantity range. “Sunk” describes whether it can be recovered at the time of a decision. A room booking may be fixed across 10–20 attendees but still cancellable before a deadline. After a nonrefundable payment, that same amount may be sunk. The label depends on the decision and its timing.'),
    section('Do not let a past payment decide the next unit', 'If you already paid an unrecoverable $40 setup cost, producing one more unit depends on its additional revenue and avoidable cost, including the value of alternatives. The setup cost still matters when reporting total profit, but changing a sunk cost on a chart cannot change the contribution from the next unit. Compare the slope of profit with its vertical starting point in the experiment.'),
  ], 'OpenStax · Production and costs', 'https://openstax.org/books/principles-economics-3e/pages/7-introduction-to-production-costs-and-industry-structure'],
  ['design', 'Write an actionable error message', 'Design the recovery, not just the warning', null, [
    section('Separate a field problem from a service problem', 'A missing title can be corrected by editing the title. A failed network request cannot be fixed by rewriting it. Use a field message for the first case and a save-status message with retry for the second. Preserve valid work in both cases. Tell the user whether a change was actually saved instead of showing success immediately after a click.'),
    section('Test with keyboard and assistive technology', 'Associate error text with the input using aria-describedby and mark an invalid value with aria-invalid. After a failed submission, focus an error summary or the first invalid field. A polite status region can announce a save result without stealing focus. Check that the message remains understandable without colour and that retry works after the underlying problem is corrected.'),
  ], 'W3C WAI · Validating input', 'https://www.w3.org/WAI/tutorials/forms/validation/'],
  ['engineering', 'Compare repeat measurements', 'Distinguish consistency from correctness', 'statistics', [
    section('Describe variation and calibration separately', 'Readings of 10.1, 10.2 and 10.0 cm have a mean of 10.1 cm and range of 0.2 cm. If a suitable reference is 10.0 cm, the mean is 0.1 cm higher. This small set alone does not establish the instrument’s uncertainty or the cause of the difference. Repeated measurements can be close together while sharing a calibration offset.'),
    section('Use a controlled comparison', 'To compare two sensors, keep the reference, units, environment and procedure comparable. Record every reading rather than only the closest one. Repeating can reveal random variation, while a reference check can reveal a common offset. Do not add decimal places to imply precision the instrument cannot support. In the experiment, compare an outlier with a shift applied to every value.'),
  ], 'NIST · Measurement process characterization', 'https://www.itl.nist.gov/div898/handbook/mpc/mpc.htm'],
  ['health', 'Interpret an absolute risk difference', 'Translate percentages into people', 'risk', [
    section('Keep denominator and time period visible', 'A change from 20 to 10 outcomes per 1,000 people is a reduction of 10 per 1,000, or one percentage point. Relative to 20, it is a 50% reduction. A change from 200 to 100 per 1,000 is also a 50% relative reduction but a ten-point absolute reduction. The headline alone cannot tell you which situation applies.'),
    section('Check what the comparison can establish', 'A rate difference describes the groups observed. To attribute it to a treatment, inspect the study design, possible confounding, uncertainty and whether the population and period match the question. A zero baseline makes a relative reduction undefined. The interactive counts below are invented examples for learning, not evidence about a treatment or a personal health recommendation.'),
  ], 'Cochrane · Understanding evidence', 'https://www.cochrane.org/evidence'],
  ['arts', 'Turn a rhythm into equivalent groupings', 'Keep time while changing the pattern', null, [
    section('Distinguish pulse, duration and accent', 'At 60 quarter-note beats per minute, each quarter-note beat lasts one second. In 4/4, a bar lasts four seconds. Eight evenly spaced eighth notes divide that same time into half-second durations. Accenting selected subdivisions changes emphasis without requiring a tempo change. More events can fill the same duration.'),
    section('Count first, then vary one feature', 'Tap four steady beats while saying “1 and, 2 and, 3 and, 4 and.” Keep tapping while clapping only on the spoken numbers, then on every syllable. Finally omit one clap while continuing the count: a rest occupies time too. Compare the total bar duration before and after each change. A recording or a metronome can help reveal rushing that is hard to notice while performing.'),
  ], 'Open Music Theory · Rhythm and meter', 'https://viva.pressbooks.pub/openmusictheory/chapter/simple-meter-and-time-signatures/'],
  ['finance', 'Compare the full cost of two offers', 'Put every payment on the comparison', 'offers', [
    section('Compare equivalent terms before adding', 'Offer A charges $20 monthly for 12 months. Offer B charges $17 monthly plus a $50 setup fee for the same 12 months. Their totals are $240 and $254. The lower monthly price costs $14 more over the stated term. Confirm the same service, duration, mandatory charges and cancellation conditions before deciding the totals are comparable.'),
    section('Separate a total from an interest model', 'Adding fixed payments is not the same calculation as compound growth. The offer experiment below adds scheduled payments and a fee; it does not apply an interest rate. If a balance accrues interest, a different calculation is needed. Real borrowing comparisons can also require APR, payment timing and additional fees. Keep the assumptions visible rather than using a simple total as a substitute for a full loan comparison.'),
  ], 'CFPB · Comparing loan offers', 'https://www.consumerfinance.gov/consumer-tools/auto-loans/'],
];

export const lessonStudies = studies.map(([courseId, lessonTitle, title, experiment, sections, source, url]) => ({ courseId, lessonTitle, title, experiment, sections, source, url }));

const placements = {
  numbers: [['Percentages in the wild', 'percentage']],
  computing: [['A little repetition', 'accumulator'], ['Find a bug with a trace', 'accumulator']],
  physics: [['Use a speed model', 'motion'], ['A balancing act', 'pressure']],
  data: [['Meet the mean', 'statistics'], ['The middle ground', 'statistics']],
  geometry: [['Room to grow', 'volume']],
  chemistry: [['Compare solution concentrations', 'concentration'], ['Dissolving is mixing', 'concentration']],
  astronomy: [['Measuring immense distances', 'light']],
  business: [['Find a break-even quantity', 'breakEven']],
  finance: [['Interest grows a balance', 'growth'], ['Follow compound growth', 'growth']],
};
for (const [courseId, items] of Object.entries(placements)) for (const [lessonTitle, experiment] of items) {
  const definition = experimentDefinitions[experiment];
  lessonStudies.push({ courseId, lessonTitle, title: definition.title, experiment, sections: [] });
}

export function getLessonStudy(course, lessonIndex) {
  if (course.author || course.preview || !course.lessons?.[lessonIndex]) return null;
  return lessonStudies.find(item => item.courseId === course.id && item.lessonTitle === course.lessons[lessonIndex].title) || null;
}

export const reasoningCases = {
  logic: {
    prompt: 'Claim: every rectangle with perimeter 20 cm has area 25 cm². Which test actually disproves it?',
    options: ['A 5 × 5 cm square: perimeter 20 cm, area 25 cm².', 'A 4 × 6 cm rectangle: perimeter 20 cm, area 24 cm².', 'A 3 × 3 cm square: perimeter 12 cm, area 9 cm².'],
    answer: 1,
    feedback: ['This case supports the claim. Look for a rectangle with the required perimeter but a different area.', 'The rectangle belongs to the stated domain and fails the conclusion: 2(4 + 6) = 20, but 4 × 6 = 24.', 'This square fails the required perimeter, so it lies outside the claim’s domain.'],
    extension: 'How would you revise the claim? A useful next question is which rectangle has the greatest area for that perimeter.',
  },
  biology: {
    prompt: 'In the simplified Aa × Aa model, three offspring happen to be AA. What is the probability that the next is aa?',
    options: ['100%: the sequence must balance out.', '0%: these parents only produce AA.', '25%: each offspring is a new independent event under this model.'], answer: 2,
    feedback: ['The expected ratio is not a quota for a short sequence. Earlier outcomes do not change independent probabilities.', 'Three observations do not remove other possible allele combinations.', 'Each parent passes a with probability ½. For an independent offspring, ½ × ½ = ¼, regardless of the earlier sequence.'],
    extension: 'Explain why a 25% probability does not promise exactly one aa offspring in every four.',
  },
  earth: {
    prompt: 'A model gives a 1% annual flood exceedance chance. A flood occurred last year. Which statement is justified?',
    options: ['No flood can occur for the next 99 years.', 'The stated annual chance is a probability, not a waiting-period guarantee.', 'A flood is certain this year.'], answer: 1,
    feedback: ['A return-period label does not impose a fixed gap between events.', 'The occurrence last year does not create a guaranteed flood-free period. Check whether the model and conditions have changed.', 'One earlier event does not establish certainty for this year.'],
    extension: 'Name two changing local conditions that could make a constant-risk model less reliable.',
  },
  english: {
    prompt: 'Intended meaning: Sara revised the draft, then Maya sent it. Which version makes the reviser clear?',
    options: ['Maya sent Sara the draft after she revised it.', 'After Sara revised the draft, Maya sent it to her.', 'She revised it, then she sent it.'], answer: 1,
    feedback: ['“She” could refer to either Maya or Sara, so the original ambiguity remains.', 'Naming Sara in the revision clause identifies the reviser; Maya is explicitly the sender.', 'Removing both names makes the sequence harder to interpret.'],
    extension: 'Now write a version where Maya did the revision. Check that the wording changes the meaning deliberately.',
  },
  history: {
    prompt: 'Three websites quote the same unsigned account of an event. What is the strongest next step?',
    options: ['Count them as three independent witnesses.', 'Discard every later source automatically.', 'Trace the original account and seek an independently created record.'], answer: 2,
    feedback: ['Repeating one account does not produce independent corroboration.', 'A later source can still be useful, depending on the question, evidence and provenance.', 'Tracing the dependency avoids counting copies as confirmations. An independent record can support or challenge the claim.'],
    extension: 'What would you need to know about the original account’s author, date and purpose before using it?',
  },
  geography: {
    prompt: 'You want to compare the area of forest coverage across continents. Which projection property matters most directly?',
    options: ['Preserving relative areas.', 'Making every coastline look familiar.', 'Enlarging high-latitude land masses.'], answer: 0,
    feedback: ['An equal-area projection supports area comparisons. You still need comparable forest definitions and data dates.', 'Familiar shapes do not guarantee that displayed areas are comparable.', 'Unequal area enlargement could make a coverage difference look larger than it is.'],
    extension: 'Would your projection choice necessarily stay the same for local navigation? Explain the different task.',
  },
  design: {
    prompt: 'The title is valid, but saving fails because the service is unreachable. Which recovery fits the actual problem?',
    options: ['Erase the form and mark the title invalid.', 'Preserve the draft, say saving failed, and offer Retry save.', 'Show “Saved” because the button was pressed.'], answer: 1,
    feedback: ['A valid title cannot fix a service failure. Erasing work adds a new problem.', 'This reports the actual status, protects work and gives a relevant next action. Announce the retry result as well.', 'A click is not evidence of a completed save. False success could cause the user to lose work.'],
    extension: 'Describe how the retry result should be announced without unexpectedly moving keyboard focus.',
  },
  arts: {
    prompt: 'At 60 quarter-note beats per minute in 4/4, eight even eighth notes fill one bar. How long is that bar?',
    options: ['8 seconds because there are eight notes.', '2 seconds because eighth notes are shorter.', '4 seconds because the four-beat pulse has not changed.'], answer: 2,
    feedback: ['The note count does not set the beat duration. Two eighth notes share one quarter-note beat.', 'Shorter notes divide the bar; they do not shorten a bar at the same pulse and meter.', 'Four beats × one second per beat = four seconds. Eight notes each occupy half a second.'],
    extension: 'Replace the first two eighth notes with a quarter note. What stays the same about the bar?',
  },
};
