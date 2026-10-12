// Additional worked examples and transfer questions for the foundation courses.
// Keep lesson positions stable: completion records use course ID + lesson index.
const question = (question, options, answer, explanation) => ({ question, options, answer, explanation });
export const lessonEnrichment = {
  numbers: [
    {
      objectives: ['Find a constant difference in a sequence.', 'Use a rule to calculate a later term.'],
      steps: ['Try 4, 9, 14, 19. Subtract neighbouring terms: 9 − 4 = 5, 14 − 9 = 5, and 19 − 14 = 5.', 'The same difference occurs each time, so add 5 for the next term: 19 + 5 = 24.', 'The first term is 4. To reach the sixth term, make five steps: 4 + 5 × 5 = 29. There is one fewer step than the term number.'],
      commonMistake: 'A few terms do not prove a rule is unique. A constant difference is the intended rule in these exercises; other sequences can multiply or alternate rules.',
      practice: [
        question('Using a constant difference, what follows 6, 10, 14, 18?', ['20', '21', '22', '24'], 2, 'The difference is 4, so 18 + 4 = 22.'),
        question('A sequence starts at 5 and adds 3 each time. What is its fifth term?', ['12', '15', '17', '20'], 2, 'Make four steps from the first term: 5 + 4 × 3 = 17.'),
        question('Using a constant difference, what follows 20, 17, 14, 11?', ['7', '8', '9', '10'], 1, 'Each term decreases by 3. The next term is 11 − 3 = 8.'),
      ],
    },
    {
      objectives: ['Simplify a fraction without changing its value.', 'Check whether two fractions are equivalent.'],
      steps: ['Suppose 6 of 10 equal pieces are shaded. The fraction is 6/10.', 'Both 6 and 10 are divisible by 2. Divide both numbers by 2 to get 3/5.', 'Check by multiplication: 3 × 2 = 6 and 5 × 2 = 10. The pieces have been regrouped, but the shaded amount is unchanged.'],
      commonMistake: 'Changing only the numerator or only the denominator changes the amount. To keep a fraction equivalent, multiply or divide both by the same nonzero number.',
      practice: [
        question('What is 4/12 in simplest form?', ['1/2', '1/3', '2/3', '3/4'], 1, 'Divide both numbers by 4: 4/12 = 1/3.'),
        question('Which fraction has the same value as 2/3?', ['3/4', '4/9', '6/9', '8/9'], 2, 'Multiply numerator and denominator by 3: 2/3 = 6/9.'),
        question('You shade 9 of 12 equal squares. What fraction is shaded in simplest form?', ['1/4', '1/2', '2/3', '3/4'], 3, 'Divide 9 and 12 by 3. The shaded fraction is 3/4.'),
      ],
    },
    {
      objectives: ['Calculate a percentage of an amount.', 'Distinguish the discount from the final price.'],
      steps: ['A jacket costs $80 and has a 15% discount. First calculate 10%: $80 ÷ 10 = $8.', '5% is half of 10%, so 5% of $80 is $4. Add them: the discount is $8 + $4 = $12.', 'Subtract the discount from the original price: $80 − $12 = $68. Check that the final price is less than $80.'],
      commonMistake: 'A $12 discount is the amount saved, not the price paid. Also, percentage changes use the original amount as their base.',
      practice: [
        question('A $50 item is reduced by 20%. What do you pay?', ['$10', '$30', '$40', '$45'], 2, '20% of $50 is $10; the final price is $50 − $10 = $40.'),
        question('What is 15% of 200?', ['15', '20', '25', '30'], 3, '10% is 20 and 5% is 10. Together, 15% is 30.'),
        question('A $40 price increases by 25%. What is the new price?', ['$45', '$50', '$55', '$65'], 1, '25% of $40 is $10. Add it for an increase: $40 + $10 = $50.'),
      ],
    },
    {
      objectives: ['Use rounded values to estimate a calculation.', 'Use an estimate to detect an unreasonable answer.'],
      steps: ['Estimate 302 × 19 by rounding 302 to 300 and 19 to 20.', 'Calculate the easier product: 300 × 20 = 6,000.', 'The exact answer is 5,738. An answer near 6,000 is reasonable; an answer near 60,000 suggests a place-value error.'],
      commonMistake: 'An estimate is not an exact result. Keep the original numbers when a precise price, dose, or measurement is required.',
      practice: [
        question('Which estimate is closest to 398 × 5?', ['200', '400', '2,000', '20,000'], 2, 'Round 398 to 400. Then 400 × 5 = 2,000.'),
        question('Estimate 61 × 29 using tens. Which result is most reasonable?', ['180', '900', '1,800', '18,000'], 2, 'Use 60 × 30 = 1,800.'),
        question('A calculator shows 7,500 for 15 × 50. Which estimate helps you spot the error?', ['About 75', 'About 750', 'About 7,500', 'About 75,000'], 1, '15 × 5 = 75, so 15 × 50 is 750. The displayed result is ten times too large.'),
      ],
    },
  ],
  computing: [
    {
      objectives: ['Trace an algorithm one step at a time.', 'Explain why every list item must be checked.'],
      steps: ['For the list [7, 2, 9, 4], start with largest = 7. This is a candidate, not the final answer yet.', 'Compare 2 with 7: keep 7. Compare 9 with 7: replace the candidate with 9.', 'Compare 4 with 9: keep 9. Every item has been checked, so return 9. The original order did not matter.'],
      commonMistake: 'The first item is not necessarily the largest. Stopping at the first larger item can miss an even larger value later.',
      practice: [
        question('A largest-number algorithm checks [4, 12, 8]. What should it return?', ['4', '8', '12', '24'], 2, 'Start at 4, replace it with 12, then keep 12 when checking 8.'),
        question('A remembered largest value is 10. The next item is 6. What should happen?', ['Replace 10 with 6', 'Keep 10', 'Add 6 to 10', 'Stop immediately'], 1, 'The next value is smaller, so keep the current candidate and continue checking.'),
        question('Why check all items in a largest-number algorithm?', ['To change the list order', 'To remove duplicates', 'A later item may be larger', 'To add all values'], 2, 'Without checking later items, you cannot know whether a larger value remains.'),
      ],
    },
    {
      objectives: ['Evaluate a true-or-false condition.', 'Check the boundary value of a comparison.'],
      steps: ['Use the rule: if age >= 16, allow registration; otherwise, show the age requirement.', 'For age 15, 15 >= 16 is false, so use the otherwise branch.', 'For age 16, the comparison is true because equality is included. Testing 15, 16, and 17 checks the boundary.'],
      commonMistake: 'The symbols > and >= behave differently at equality. Boundary tests are especially useful for ages, prices, scores, and dates.',
      practice: [
        question('If temperature > 30 triggers a warning, what happens at exactly 30?', ['A warning always appears', 'The condition is false', 'The program must stop', '30 is greater than 30'], 1, 'The strict > comparison excludes equality. At 30, the condition is false.'),
        question('If points <= 10 means beginner, how is a learner with 10 points classified?', ['Beginner', 'Advanced', 'Unclassified', 'Invalid'], 0, '<= includes equality, so 10 satisfies the beginner condition.'),
        question('Which ages best test the boundary of age >= 18?', ['1, 2, 3', '10, 11, 12', '17, 18, 19', '30, 40, 50'], 2, 'Test just below, exactly at, and just above the threshold.'),
      ],
    },
    {
      objectives: ['Track a variable as a loop runs.', 'Explain why a loop needs a stopping condition.'],
      steps: ['Start with total = 0 and the list [3, 5, 2]. Write down the value before each update.', 'After adding 3, total = 3. After adding 5, total = 8. After adding 2, total = 10.', 'The loop ends when all three items have been processed. Return 10; do not reset total inside the loop.'],
      commonMistake: 'Resetting total to zero each time discards previous work. A while-loop also needs a condition that can eventually become false.',
      practice: [
        question('Start at total = 0 and add each item in [2, 3, 7]. What is total?', ['7', '10', '12', '14'], 2, 'The successive totals are 2, 5, and 12.'),
        question('A loop runs 4 times and adds 2 each time to a value starting at 1. What is the final value?', ['7', '8', '9', '10'], 2, 'Start at 1 and add 4 × 2 = 8. The final value is 9.'),
        question('What can cause a while-loop to continue forever?', ['Its condition never becomes false', 'It has only three items', 'It adds two numbers', 'It starts at zero'], 0, 'A while-loop continues while its condition is true. The loop needs a reachable stopping condition.'),
      ],
    },
  ],
  data: [
    {
      objectives: ['Calculate a mean.', 'Recognize how an outlier can change the mean.'],
      steps: ['Five daily travel times are 10, 10, 15, 15, and 50 minutes. Add them to get 100 minutes.', 'Divide by the five observations: 100 ÷ 5 = 20 minutes.', 'The unusually long 50-minute trip pulls the mean above most trips. A mean describes the average; it does not have to equal an observed value.'],
      commonMistake: 'Divide by the number of observations, not the largest value. Keep outliers unless there is a valid reason to exclude them.',
      practice: [
        question('What is the mean of 4, 8, and 12?', ['4', '6', '8', '12'], 2, 'The sum is 24. Divide by 3 observations to get 8.'),
        question('Four scores total 60. What is their mean?', ['10', '15', '20', '60'], 1, 'Divide the total by the count: 60 ÷ 4 = 15.'),
        question('Adding a very large value to a small-valued data set usually does what to its mean?', ['Raises it', 'Lowers it', 'Leaves it unchanged', 'Makes it zero'], 0, 'A large value adds substantially to the total and tends to pull the mean upward.'),
      ],
    },
    {
      objectives: ['Find a median after sorting.', 'Handle an even number of observations.'],
      steps: ['For 8, 2, 10, 4, sort the values first: 2, 4, 8, 10.', 'There are four values, so there are two middle positions: 4 and 8.', 'Average those middle values: (4 + 8) ÷ 2 = 6. The median need not appear in the original set.'],
      commonMistake: 'Do not choose the middle item from the unsorted list. For an even count, both middle values are needed.',
      practice: [
        question('What is the median of 8, 1, 5, 3, 9?', ['3', '5', '8', '9'], 1, 'Sort to 1, 3, 5, 8, 9. The middle value is 5.'),
        question('What is the median of 2, 4, 10, and 12?', ['4', '6', '7', '10'], 2, 'The middle values are 4 and 10. Their mean is 7.'),
        question('Which must happen before finding a median?', ['Multiply all values', 'Remove the largest value', 'Put values in order', 'Round every value'], 2, 'The median is based on positions in the ordered set.'),
      ],
    },
    {
      objectives: ['Count equally likely outcomes.', 'Express a probability as favourable outcomes divided by total outcomes.'],
      steps: ['A bag contains 3 red counters and 2 blue counters. Each counter is equally likely to be drawn.', 'There are 5 possible counters, and 3 are red. The chance of red is 3/5.', 'The chance of blue is 2/5. These two probabilities add to 1 because they cover all outcomes for a single draw.'],
      commonMistake: 'The simple count formula assumes equally likely outcomes. An unfair die or differently weighted outcomes need a different model.',
      practice: [
        question('A fair die has faces 1 to 6. What is the probability of a number greater than 4?', ['1/6', '1/3', '1/2', '2/3'], 1, 'The favourable faces are 5 and 6: 2 out of 6, or 1/3.'),
        question('A bag has 2 green and 6 yellow counters. What is the chance of green on one equally likely draw?', ['1/4', '1/3', '1/2', '3/4'], 0, 'There are 2 green out of 8 total counters: 2/8 = 1/4.'),
        question('What is the probability of an impossible outcome?', ['0', '1/4', '1/2', '1'], 0, 'An impossible outcome has probability 0; a certain outcome has probability 1.'),
      ],
    },
  ],
  physics: [
    {
      objectives: ['Distinguish motion from a change in motion.', 'Relate a change in velocity to a net force.'],
      steps: ['Imagine a puck already moving in a straight line on an ideal frictionless surface.', 'With no net force, its speed and direction stay the same. It does not need a forward force merely to keep moving.', 'On a real floor, friction provides a force opposite the motion. That force explains the slowing down.'],
      commonMistake: 'No net force does not mean no motion. It means no change in velocity. Several forces can also cancel one another.',
      practice: [
        question('A moving object has zero net force. What stays constant?', ['Its velocity', 'Only its position', 'Its increasing speed', 'Its changing direction'], 0, 'Zero net force means zero acceleration, so both speed and direction stay constant.'),
        question('Why does a sliding book slow on a table?', ['Motion uses up its mass', 'Friction acts against its motion', 'Gravity disappears', 'No force acts at all'], 1, 'Friction supplies a net force opposing the sliding motion.'),
        question('An object moves in a circle at a constant speed. Is its velocity changing?', ['No, speed is enough', 'Yes, its direction changes', 'Only when it stops', 'Velocity must be zero'], 1, 'Velocity includes direction. Circular motion changes direction even at constant speed.'),
      ],
    },
    {
      objectives: ['Identify potential and kinetic energy.', 'Describe an energy transfer without claiming energy disappears.'],
      steps: ['Hold a ball above the ground. Its position gives it gravitational potential energy relative to the ground.', 'Release it. As height decreases, potential energy is transformed into kinetic energy and the ball speeds up.', 'At impact, energy transfers to sound, heating, and deformation. It is not simply destroyed when the ball stops.'],
      commonMistake: 'Energy is conserved overall, but not all of it remains as useful motion. Friction and impacts transfer energy into other forms.',
      practice: [
        question('As a dropped ball falls before impact, what generally happens?', ['Kinetic energy decreases', 'Potential energy becomes kinetic energy', 'All energy disappears', 'Its height increases'], 1, 'The ball loses height and gains speed: gravitational potential energy changes into kinetic energy.'),
        question('Which ball has more gravitational potential energy relative to the same floor, if both have the same mass?', ['The ball at 1 m', 'The ball at 3 m', 'They must be equal', 'The ball touching the floor'], 1, 'For the same mass and gravity, greater height means more gravitational potential energy.'),
        question('Where does some mechanical energy go when brakes slow a bicycle?', ['It becomes extra mass', 'It disappears completely', 'It is transferred as heating', 'It becomes gravity'], 2, 'Friction in the brakes transfers mechanical energy into thermal energy.'),
      ],
    },
    {
      objectives: ['Use pressure = force ÷ area.', 'Predict the effect of spreading the same force over a larger area.'],
      steps: ['A 120 N force acts over 0.04 m². Pressure is 120 ÷ 0.04 = 3,000 pascals.', 'Keep the force at 120 N but double the area to 0.08 m². Pressure becomes 120 ÷ 0.08 = 1,500 pascals.', 'The force did not change; doubling the contact area halved the pressure. This explains snowshoes and wide tyres on soft ground.'],
      commonMistake: 'Area is in the denominator. Increasing area lowers pressure only when the force is held constant.',
      practice: [
        question('The same force acts over twice the area. What happens to pressure?', ['It doubles', 'It halves', 'It stays the same', 'It becomes zero'], 1, 'Pressure = force ÷ area. Doubling the denominator halves the pressure.'),
        question('A force of 100 N acts over 0.5 m². What is the pressure?', ['50 Pa', '100 Pa', '200 Pa', '500 Pa'], 2, '100 ÷ 0.5 = 200 pascals.'),
        question('Why does a sharp knife cut more easily than a blunt one under the same force?', ['Its edge has a smaller area', 'It removes all friction', 'It reduces the applied force', 'It increases gravity'], 0, 'A smaller contact area produces greater pressure for the same force.'),
      ],
    },
  ],
  english: [
    {
      objectives: ['Identify a subject and verb.', 'Repair a sentence fragment.'],
      steps: ['Read “Because the class ended.” The word because introduces a reason, but the reader still needs a main thought.', 'Add the result: “Because the class ended, we went home.” The subject we and verb went form the main clause.', 'Read the whole sentence aloud. It now explains both the reason and what happened.'],
      commonMistake: 'A group of words can contain a subject and verb and still be a fragment when it begins with a word such as because or although and has no main clause.',
      practice: [
        question('Which sentence expresses a complete thought?', ['After the bus arrived', 'The bus arrived late.', 'Because the bus arrived', 'The very late bus'], 1, 'The bus is the subject and arrived is the verb. Nothing is left unfinished.'),
        question('Which repair completes “Although it was cold”?', ['Although it was cold outside', 'Although it was cold and windy', 'Although it was cold, we played outside.', 'Although the cold weather'], 2, 'The main clause we played outside completes the thought introduced by although.'),
        question('In “Sara explains the problem,” what is the subject?', ['Sara', 'explains', 'the problem', 'problem'], 0, 'Sara is the person performing the action. Explains is the verb.'),
      ],
    },
    {
      objectives: ['Identify who performs an action.', 'Rewrite a passive sentence in active voice.'],
      steps: ['Start with “The experiment was recorded by Mina.” The action is recorded, and Mina is the person doing it.', 'Move Mina to the subject position: “Mina recorded the experiment.” Keep the meaning and past tense.', 'Use passive voice when the action or recipient matters more than the actor, as in “The samples were stored overnight.” Active voice is a useful choice, not a universal rule.'],
      commonMistake: 'Not every sentence containing was is passive. “Mina was tired” describes a state; nobody performs an action on Mina.',
      practice: [
        question('Which sentence uses active voice?', ['The door was opened by Ali.', 'Ali opened the door.', 'The door had been opened.', 'The door was being opened.'], 1, 'Ali is the subject performing the action opened.'),
        question('What is the active version of “The map was drawn by Noor”?', ['Noor drew the map.', 'Noor was drawn by the map.', 'The map had been drawn.', 'The map was drawing Noor.'], 0, 'Put the actor Noor first and use the past-tense verb drew.'),
        question('Which statement about active voice is most accurate?', ['It is always the only correct choice', 'It often makes the actor clearer', 'It can never be past tense', 'It must use the word by'], 1, 'Active voice often helps a reader see who acted. Passive voice can also be appropriate.'),
      ],
    },
    {
      objectives: ['Match evidence to a specific claim.', 'Distinguish a measurement from an unrelated opinion.'],
      steps: ['Claim: “The new study method improved quiz scores.” Decide what would measure that improvement: quiz scores.', 'Compare scores before and after using the method under similar conditions. A change from 6/10 to 8/10 supports improvement for that learner.', 'Do not conclude that every student will improve from one result. Mention sample size and other explanations when describing the evidence.'],
      commonMistake: 'A result can support a claim without proving its cause. A new method, easier quiz, or extra study time could each help explain higher scores.',
      practice: [
        question('Which evidence best supports “The new battery lasts longer”?', ['Its packaging is blue', 'It costs more', 'It runs for 8 hours instead of 5 under the same test', 'A friend likes the brand'], 2, 'A controlled comparison of run times directly addresses battery life.'),
        question('One student improves after changing study methods. What can you safely conclude?', ['The method works for everyone', 'The student improved, but more evidence is needed about the cause', 'Studying is unnecessary', 'The old quiz was impossible'], 1, 'One result does not establish a universal effect or rule out other causes.'),
        question('Which supports a claim about a route being safer for pedestrians?', ['Measured fewer dangerous crossings', 'A shorter street name', 'The colour of the signs', 'A favourite cafe nearby'], 0, 'Dangerous crossings relate directly to pedestrian risk; the other details do not.'),
      ],
    },
  ],
};
