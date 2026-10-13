import { extendedCourses } from './catalog.js';
import { lessonEnrichment } from './lessonEnrichment.js';
import { courseExtensions, foundationWorkshops } from './curriculum.js';
import { applicationLessons } from './applicationLessons.js';
export const categories = ['All courses', 'Mathematics', 'Computer science', 'Science', 'Thinking skills', ...extendedCourses.map(c => c.category)];

const lesson = (title, idea, example, question, options, answer, explanation) => ({ title, idea, example, question, options, answer, explanation });

export const courses = [
  {
    id: 'numbers', title: 'Thinking in numbers', category: 'Mathematics', label: 'MATHEMATICS', color: 'lavender', art: 'numbers', level: 'Beginner', minutes: 15,
    description: 'Build a feel for numbers. Discover the patterns hiding in plain sight.',
    lessons: [
      lesson('Find the pattern', 'A number sequence follows a rule. Instead of guessing the next number, look at what changes between each pair of neighbors. A constant difference is a useful clue.', 'In 3, 7, 11, 15, each number grows by 4. So the next number is 15 + 4 = 19. The same small rule can describe an endless sequence.', 'What comes next: 2, 5, 8, 11, …?', ['12', '13', '14', '16'], 2, 'Each step adds 3. Starting from 11, adding 3 gives 14. You found the rule!'),
      lesson('Parts of a whole', 'A fraction names equal parts of a whole. The denominator tells you how many equal pieces there are; the numerator tells you how many pieces you have.', 'If a pizza is cut into 8 equal slices and you eat 2, you ate 2/8. Group the slices in pairs and you see that 2/8 is the same amount as 1/4.', 'Which fraction is equivalent to 3/6?', ['1/3', '1/2', '2/3', '3/4'], 1, 'Divide both the numerator and denominator by 3: 3/6 = 1/2. Half of six equal pieces is three pieces.'),
      lesson('Percentages in the wild', 'Percent means out of 100. A 25% share is 25 out of every 100, or one quarter. Percentages let you compare amounts even when the totals differ.', 'A $40 book is discounted by 25%. One quarter of $40 is $10, so the final price is $30. First find the discount, then subtract it.', 'A $60 backpack has a 10% discount. What is its new price?', ['$6', '$50', '$54', '$66'], 2, '10% of $60 is $6. Subtract the discount: $60 − $6 = $54.'),
      lesson('The power of estimation', 'An estimate is a deliberate approximation. Rounding makes a calculation easier and helps you check whether an exact answer makes sense.', 'To estimate 198 × 5, use 200 × 5 = 1,000. The exact result, 990, is close. An answer of 9,900 would immediately look suspicious.', 'Which is the closest estimate for 49 × 21?', ['100', '500', '1,000', '10,000'], 2, 'Round 49 to 50 and 21 to 20. Then 50 × 20 = 1,000, which is close to the exact result of 1,029.'),
    ],
  },
  {
    id: 'computing', title: 'Computer science foundations', category: 'Computer science', label: 'COMPUTER SCIENCE', color: 'blue', art: 'computing', level: 'Beginner', minutes: 12,
    description: 'Think like a programmer, one wonderfully logical step at a time.',
    lessons: [
      lesson('An algorithm for everything', 'An algorithm is a precise sequence of steps to solve a problem. A good algorithm tells someone what to do without asking them to guess.', 'To find the largest number in a list, remember the first number. Check each remaining number and replace your remembered value whenever you find a larger one.', 'What should an algorithm do first when finding the largest number in a nonempty list?', ['Sort it randomly', 'Remember the first number', 'Delete the last number', 'Add every number'], 1, 'The first number is a valid starting candidate. Comparing every later number with it gives you the largest one by the end.'),
      lesson('Decisions, decisions', 'A conditional chooses an action based on whether a statement is true or false. Programmers often write it as if a condition is true, do this; otherwise, do that.', 'An app says: if temperature < 10, suggest a coat; otherwise, suggest a light jacket. At exactly 10, the first condition is false because 10 is not less than 10.', 'If score >= 50 means pass, what happens when score is 50?', ['Fail', 'Pass', 'Neither', 'The rule is missing'], 1, 'The >= symbol means greater than or equal to. A score of exactly 50 satisfies the condition.'),
      lesson('A little repetition', 'A loop repeats a set of instructions. It can run a fixed number of times or continue while a condition is true. Updating the condition prevents an endless loop.', 'Start with total = 0. For each number in [2, 4, 6], add it to total. The total becomes 2, then 6, then 12.', 'Start with total = 0. Add each number in [1, 3, 5]. What is total?', ['5', '8', '9', '15'], 2, 'The loop adds all three numbers: 0 + 1 + 3 + 5 = 9.'),
    ],
  },
  {
    id: 'logic', title: 'The art of problem solving', category: 'Thinking skills', label: 'THINKING SKILLS', color: 'peach', art: 'logic', level: 'All levels', minutes: 12,
    description: 'A fresh perspective is sometimes all you need. Let’s find yours.',
    lessons: [
      lesson('Work backward', 'When you know the final result, work backward to discover the starting point. Undo each operation in reverse order.', 'I double a number and then add 6 to get 20. Undo the addition: 20 − 6 = 14. Undo the doubling: 14 ÷ 2 = 7.', 'A number is multiplied by 3, then 2 is added. The result is 17. What was the number?', ['3', '5', '6', '7'], 1, 'Work backward: 17 − 2 = 15, and 15 ÷ 3 = 5. Check: 5 × 3 + 2 = 17.'),
      lesson('Test an assumption', 'An assumption is something you accept without proving it. Before drawing a conclusion, ask whether a different explanation fits the same evidence.', 'The sidewalk is wet. It may have rained, but a sprinkler could also explain it. A wet sidewalk alone does not prove that it rained.', 'Every cat is a mammal. A pet is a mammal. Must that pet be a cat?', ['Yes, always', 'Only at night', 'No, it could be another mammal', 'Mammals are not pets'], 2, 'Dogs and many other animals are mammals too. A category can contain more than one kind of thing.'),
      lesson('Break it into pieces', 'A complicated problem often becomes manageable when you split it into smaller problems. Solve each part, then combine the results.', 'To count squares in a 2 × 2 grid, count by size: four small squares and one large square. There are five squares in total.', 'How many squares of all sizes are in a 2 × 2 grid?', ['4', '5', '6', '8'], 1, 'There are four 1 × 1 squares and one 2 × 2 square: 4 + 1 = 5.'),
    ],
  },
  {
    id: 'physics', title: 'The physics of everyday life', category: 'Science', label: 'SCIENCE', color: 'sage', art: 'physics', level: 'Beginner', minutes: 12,
    description: 'From a bouncing ball to a bicycle. See the world a little differently.',
    lessons: [
      lesson('Keep on moving', 'Inertia is the tendency of an object to keep its current motion. A net force is needed to change its speed or direction.', 'When a bus stops suddenly, your body keeps moving forward for a moment. The seat belt provides a force that slows your body with the bus.', 'With no net force, how does a moving object behave?', ['It always stops', 'It keeps a constant velocity', 'It always speeds up', 'It turns in a circle'], 1, 'Newton’s first law says that with no net force, velocity stays constant. Velocity includes both speed and direction.'),
      lesson('Energy changes shape', 'Energy can be transferred and transformed. A ball held above the ground stores gravitational potential energy, which becomes kinetic energy as it falls.', 'At the top of a swing, the rider has more potential energy. Near the bottom, the rider moves fastest and has more kinetic energy.', 'Where does a swinging rider usually have the most kinetic energy?', ['At the highest point', 'At the lowest point', 'When fully stopped', 'It is always zero'], 1, 'Kinetic energy depends on speed. The rider moves fastest at the bottom of the swing.'),
      lesson('A balancing act', 'Pressure is force divided by area. The same force spread over a larger area produces less pressure.', 'Snowshoes spread your weight over a larger area than regular shoes. That lowers the pressure on the snow and helps you stay on top.', 'Why do snowshoes help you avoid sinking?', ['They increase your weight', 'They reduce gravity', 'They spread force over more area', 'They melt the snow'], 2, 'With the same force and a larger contact area, pressure decreases: pressure = force ÷ area.'),
    ],
  },
  {
    id: 'data', title: 'See the story in data', category: 'Mathematics', label: 'MATHEMATICS', color: 'yellow', art: 'data', level: 'Beginner', minutes: 12,
    description: 'Turn a jumble of numbers into something that makes sense.',
    lessons: [
      lesson('Meet the mean', 'The mean is a way to summarize a set of numbers. Add all the values and divide by the number of values. Large outliers can pull the mean upward.', 'For 2, 4, and 9, the sum is 15. There are 3 values, so the mean is 15 ÷ 3 = 5.', 'What is the mean of 3, 6, and 12?', ['6', '7', '9', '21'], 1, 'Add the values: 3 + 6 + 12 = 21. Divide by 3 values: 21 ÷ 3 = 7.'),
      lesson('The middle ground', 'The median is the middle value after you put numbers in order. For an even number of values, take the mean of the two middle values.', 'The ordered set 1, 2, 3, 4, 100 has a median of 3. The large outlier affects the mean much more than it affects the median.', 'What is the median of 9, 2, 7, 4, and 3?', ['3', '4', '5', '7'], 1, 'First sort the values: 2, 3, 4, 7, 9. The middle value is 4.'),
      lesson('A fair chance', 'Probability describes how likely an outcome is. For equally likely outcomes, divide the number of favorable outcomes by the total number of outcomes.', 'A fair six-sided die has 6 equally likely results. Three are even: 2, 4, and 6. The chance of rolling an even number is 3/6 = 1/2.', 'What is the probability of rolling a 6 on a fair six-sided die?', ['1/2', '1/3', '1/6', '6/6'], 2, 'There is one favorable outcome out of six equally likely outcomes, so the probability is 1/6.'),
    ],
  },
  {
    id: 'geometry', title: 'Geometry, reimagined', category: 'Mathematics', label: 'MATHEMATICS', color: 'pink', art: 'geometry', level: 'Beginner', minutes: 12,
    description: 'Explore the beautiful connections between shapes, space, and you.',
    lessons: [
      lesson('Angles add up', 'The interior angles of any triangle on a flat surface add up to 180 degrees. Knowing two angles lets you find the third.', 'If two angles are 60° and 70°, their sum is 130°. The remaining angle is 180° − 130° = 50°.', 'A triangle has angles of 90° and 35°. What is the third angle?', ['35°', '45°', '55°', '90°'], 2, 'Subtract the known angles from 180°: 180° − 90° − 35° = 55°.'),
      lesson('Room to grow', 'Area measures the surface inside a shape. The area of a rectangle is width times height. If both dimensions double, the area becomes four times as large.', 'A 3 × 4 rectangle has area 12. Double both sides to 6 × 8, and the area becomes 48 — four times 12.', 'A square has side length 5 cm. What is its area?', ['10 cm²', '20 cm²', '25 cm²', '50 cm²'], 2, 'Area = side × side. So 5 × 5 = 25 cm².'),
      lesson('Around the edge', 'Perimeter measures the distance around a shape. Add every side length. Area and perimeter describe different things: covering a floor versus fencing a garden.', 'A rectangle 3 m wide and 7 m long has perimeter 3 + 7 + 3 + 7 = 20 m. Its area is 21 m², a different measurement.', 'What is the perimeter of a rectangle with sides 4 m and 6 m?', ['10 m', '20 m', '24 m', '36 m'], 1, 'Add all four sides: 4 + 6 + 4 + 6 = 20 m.'),
    ],
  },
];

courses.push(...extendedCourses);
for (const course of courses) {
  course.lessons = course.lessons.map((lesson, index) => ({ ...lesson, ...foundationWorkshops[course.id]?.[index], ...lessonEnrichment[course.id]?.[index] }));
  const extension = courseExtensions[course.id];
  if (extension) {
    course.lessons.push(...extension.lessons);
    course.minutes = extension.minutes;
  }
  if (applicationLessons[course.id]) {
    course.lessons.push(applicationLessons[course.id]);
    course.minutes += 8;
  }
}

export const dailyChallenge = {
  title: 'A little food for thought',
  question: 'You have 3 boxes. Each box holds 3 smaller boxes, and each small box holds 3 marbles. How many marbles do you have?',
  options: ['9 marbles', '18 marbles', '27 marbles', '81 marbles'],
  answer: 2,
  explanation: 'There are 3 × 3 = 9 small boxes, each with 3 marbles. So 9 × 3 = 27 marbles. Breaking the problem into layers makes it much easier!',
};
