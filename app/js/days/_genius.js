// The "mathematician's thread": one technique card + one harder problem on every lesson day.
// This is the third kind of maths the degree (MATH19611) and the quant strand (probability) do not
// teach by themselves: how mathematicians actually think. Parity, invariants, pairing, pigeonhole,
// induction, telescoping, symmetry, linearity, optimal stopping, gambler's ruin, eigen-intuition.
// It is stored as strand G so the UI and progress ledger never file it under quant probability.
// Difficulty ramps through the month. Each lesson day spreads `...genius(q, dayNum)` into its steps;
// Day 30 closes the month with a mixed test of the thread.

const T = {
  1: q => [
    q.info('M', 'Mathematician\'s thread · Parity: colour the board', `The single most useful trick in puzzle maths: find something that **cannot change** and see what it forbids. A chessboard has 32 black and 32 white squares. Every 1×2 domino covers **one of each**. So any region a set of dominoes can cover must have equal numbers of black and white squares. That one sentence settles whole classes of "can you tile…" questions without trying a single arrangement.`, {
      terms: [['Parity', 'Whether a count is odd or even. A quantity whose parity never changes is a powerful constraint.'], ['Invariant', 'Something that stays the same after every allowed move.'], ['Colouring argument', 'Paint the objects so each move affects the colours in a fixed way; count colours before and after.']]
    }),
    q.mc('M', 'Genius track · Remove two opposite corners from an 8×8 board (62 squares left). Can 31 dominoes tile it?', ['No: opposite corners are the same colour, leaving 30 of one colour and 32 of the other', 'Yes: 62 is even', 'Yes, but only with one specific layout', 'Only if the board is 7×7'], 0, 'Each domino needs one black and one white square. 30 ≠ 32, so no tiling exists. You never had to try one.'),
  ],
  2: q => [
    q.info('M', 'Mathematician\'s thread · Pairing (Gauss\'s trick)', `Asked for 1 + 2 + … + 100, the young Gauss paired the ends: 1 + 100, 2 + 99, … each pair is 101 and there are 50 pairs: **5050**. In general 1 + 2 + … + n = **n(n + 1)/2**. Pairing turns a long sum into (number of pairs) × (value of a pair). Look for it whenever terms come in matched opposites.`, {
      terms: [['Pairing', 'Group terms into pairs with a constant sum or product, then count the pairs.'], ['Triangular number', 'n(n+1)/2: the sum of the first n whole numbers.']]
    }),
    q.num('M', 'Genius track · Sum of the even numbers 2 + 4 + … + 200?', 10100, '2(1 + 2 + … + 100) = 2 × 5050. Or pair 2 + 200, 4 + 198, …: 50 pairs of 202.'),
  ],
  3: q => [
    q.info('M', 'Mathematician\'s thread · Counting pairs', `How many handshakes when n people each shake hands once with everyone else? Each person shakes n − 1 hands, giving n(n − 1), but that counts every handshake twice (once from each end). So **n(n − 1)/2**. This is C(n, 2): "choose 2 from n". The discipline is always: *count, then correct for over-counting*.`, {
      terms: [['C(n, 2)', 'The number of unordered pairs from n items: n(n − 1)/2.'], ['Over-counting', 'Counting each object k times, then dividing by k.']]
    }),
    q.num('M', 'Genius track · 20 teams play a league where every pair meets twice (home and away). How many matches?', 380, 'C(20, 2) = 190 pairs, each playing twice.'),
  ],
  4: q => [
    q.info('M', 'Mathematician\'s thread · AM–GM: the balanced shape wins', `For positive numbers, the **arithmetic mean is never below the geometric mean**: (a + b)/2 ≥ √(ab), with equality only when a = b. Consequence: for a fixed sum, the product is largest when the numbers are equal; for a fixed product, the sum is smallest when equal. A rectangle with fixed perimeter has maximum area when it is a **square**. This inequality is behind half of all "maximise / minimise" puzzles.`, {
      terms: [['AM–GM inequality', '(a + b)/2 ≥ √(ab) for a, b ≥ 0, equality iff a = b.'], ['Equality case', 'The condition under which an inequality becomes an equality. It tells you where the optimum is.']]
    }),
    q.num('M', 'Genius track · A rectangle has perimeter 40. Its largest possible area?', 100, 'Sides a + b = 20. Product ab ≤ ((a + b)/2)² = 100, equality at a = b = 10.'),
  ],
  5: q => [
    q.info('M', 'Mathematician\'s thread · Pigeonhole', `If you put more than n objects into n boxes, some box holds **at least two**. Trivial to state, surprisingly strong: among any 13 people, two share a birth month; among any 5 points in a unit square, two are within √2/2 of each other (split the square into 4 quarters). The skill is choosing the **boxes**.`, {
      terms: [['Pigeonhole principle', 'n + 1 objects in n boxes ⇒ some box has ≥ 2. More generally, kn + 1 objects ⇒ some box has ≥ k + 1.']]
    }),
    q.num('M', 'Genius track · A drawer has socks in 4 colours. How many must you take (blindfolded) to guarantee three of the same colour?', 9, 'Worst case: 2 of each colour = 8 without a triple. The 9th forces one. Formula: k·n + 1 with k = 2, n = 4.'),
  ],
  6: q => [
    q.info('M', 'Mathematician\'s thread · Induction: dominoes falling', `To prove a statement for **every** n: show it for n = 1 (the first domino falls), then show that if it holds for n it holds for n + 1 (each domino knocks over the next). Example: 1 + 3 + 5 + … + (2n − 1) = n². True for n = 1. If true for n, add the next odd number 2n + 1: n² + 2n + 1 = (n + 1)². Done for all n at once.`, {
      terms: [['Base case', 'The statement checked directly for the first value.'], ['Inductive step', 'Assume it for n (the hypothesis) and derive it for n + 1.']]
    }),
    q.num('M', 'Genius track · Sum of the first 50 odd numbers?', 2500, 'n² with n = 50. The picture: each odd number is an L-shaped layer added to a square.'),
  ],
  8: q => [
    q.info('M', 'Mathematician\'s thread · Coupon collector', `How many dice rolls, on average, to see **all six faces**? Break the wait into stages. The first new face takes 1 roll. Once you have k faces, each roll finds a new one with probability (6 − k)/6, so the wait is 6/(6 − k). Sum: 6(1/6 + 1/5 + 1/4 + 1/3 + 1/2 + 1) ≈ **14.7**. The technique: split a wait into independent stages and add expectations.`, {
      terms: [['Coupon collector', 'Expected trials to collect all n types ≈ n·H_n where H_n = 1 + 1/2 + … + 1/n.'], ['Stage decomposition', 'Split a process into phases whose expected lengths add.']]
    }),
    q.num('M', 'Genius track · Expected rolls to see all 6 faces, to 1 d.p.?', 14.7, '6 × (1 + 1/2 + 1/3 + 1/4 + 1/5 + 1/6) = 6 × 2.45 = 14.7.', { tol: 0.1 }),
  ],
  9: q => [
    q.info('M', 'Mathematician\'s thread · Telescoping', `1/(k(k + 1)) = 1/k − 1/(k + 1). Summed from k = 1 to n, everything cancels except the first and last pieces: (1 − 1/2) + (1/2 − 1/3) + … + (1/n − 1/(n + 1)) = **1 − 1/(n + 1)**. When a sum stubbornly resists, try writing each term as a **difference** of consecutive things.`, {
      terms: [['Telescoping sum', 'A sum whose terms cancel in pairs, leaving only the ends.'], ['Partial fractions', 'Splitting 1/(k(k+1)) into 1/k − 1/(k+1).']]
    }),
    q.num('M', 'Genius track · Σ 1/(k(k + 1)) for k = 1 to 99, as a decimal?', 0.99, '1 − 1/100.', { tol: 0.001 }),
  ],
  10: q => [
    q.info('M', 'Mathematician\'s thread · Cycles in modular arithmetic', `The last digit of 7ⁿ cycles: 7, 9, 3, 1, 7, 9, 3, 1, … with period 4. So the last digit of 7¹⁰⁰ depends only on 100 mod 4 = 0 → same as 7⁴ → **1**. Powers modulo m always fall into a cycle because there are only m possible remainders (pigeonhole again). Find the cycle, then reduce the exponent.`, {
      terms: [['mod m', 'The remainder after dividing by m. "Last digit" = mod 10.'], ['Period', 'The length of the repeating cycle of remainders.']]
    }),
    q.num('M', 'Genius track · Last digit of 3²⁰²⁶?', 9, 'Cycle of 3ⁿ mod 10: 3, 9, 7, 1 (period 4). 2026 mod 4 = 2 → second entry → 9.'),
  ],
  11: q => [
    q.info('M', 'Mathematician\'s thread · Gambler\'s ruin', `A fair coin: +1 on heads, −1 on tails. Start at 0. What is the chance of reaching +3 before −2? Let p(x) be the chance of winning from position x. Fairness means p(x) is the **average** of its neighbours, so p is a **straight line** from p(−2) = 0 to p(3) = 1. From 0: distance 2 out of a total span 5 → **2/5**. Symmetric walks make probabilities linear in position.`, {
      terms: [['Gambler\'s ruin', 'Starting at a with a target of N, a fair walk reaches N before 0 with probability a/N.'], ['Harmonic (averaging) property', 'For a fair walk, the win probability at x equals the mean of the win probabilities at x ± 1.']]
    }),
    q.num('M', 'Genius track · You have £30 and bet £1 on fair coin flips until you reach £100 or £0. Probability you reach £100, as a decimal?', 0.3, 'a/N = 30/100. Even a fair game is a 70 % ruin from here: that is why bankroll matters.', { tol: 0.005 }),
  ],
  12: q => [
    q.info('M', 'Mathematician\'s thread · Counting two ways', `A powerful proof style: count the same set **two different ways**, then set the answers equal. The number of subsets of an n-element set is 2ⁿ (each element is in or out). It is also Σ C(n, k) over k (subsets grouped by size). Hence **Σ C(n, k) = 2ⁿ**. No algebra, just two views of one thing.`, {
      terms: [['Double counting', 'Two correct counts of one set give an identity for free.'], ['Subset', 'Any selection of elements; the empty set and the whole set both count.']]
    }),
    q.num('M', 'Genius track · A pizza shop offers 8 toppings. How many different pizzas (any subset of toppings, including none)?', 256, '2⁸.'),
  ],
  13: q => [
    q.info('M', 'Mathematician\'s thread · Invariants under moves', `The numbers 1 to 10 are written on a board. A move erases two numbers a, b and writes |a − b|. After nine moves one number remains. Which numbers are possible? Look at the **sum modulo 2**: a + b and |a − b| have the same parity, so the parity of the total never changes. The total starts at 55 (odd), so the final number is **odd**. Whatever the play, no even ending exists.`, {
      terms: [['Invariant', 'A property preserved by every legal move.'], ['Modulo-2 invariant', 'Track only odd/even; it survives more operations than you would expect.']]
    }),
    q.mc('M', 'Genius track · The numbers 1 to 20 are written on a board. A move erases two numbers a, b and writes |a − b|; after 19 moves one number remains. The last number left is…', ['always even (sum 210 is even)', 'always odd', 'could be either', 'always zero'], 0, 'Sum 1..20 = 210, even. Parity of the sum is invariant, so the survivor is even.'),
  ],
  15: q => [
    q.info('M', 'Mathematician\'s thread · Bayes with a twist', `Two coins in a bag: one fair, one double-headed. You draw one and flip it twice: heads, heads. Chance it is the double-headed coin? Prior 1/2 each. Likelihood of HH: fair 1/4, double 1. Posterior ∝ prior × likelihood: fair 1/8, double 1/2. Normalise: double = (1/2)/(1/2 + 1/8) = **4/5**. Evidence multiplies the odds by the likelihood ratio (here 4:1).`, {
      terms: [['Likelihood ratio', 'P(evidence | A) / P(evidence | B). It is what the evidence contributes.'], ['Posterior odds', 'Prior odds × likelihood ratio.']]
    }),
    q.num('M', 'Genius track · A bag holds one fair coin and one double-headed coin. You draw one at random and flip it three times: heads, heads, heads. P(it is the double-headed coin), as a decimal (3 d.p.)?', 0.889, 'Likelihood ratio 8:1 → posterior 8/9.', { tol: 0.002 }),
  ],
  16: q => [
    q.info('M', 'Mathematician\'s thread · Linearity beats dependence', `100 people throw their hats in a pile and each takes one at random. Expected number who get their own hat? The events are dependent, but expectation does not care: E[sum] = sum of E, and each person has a 1/100 chance, so **1**, for any number of people. When a problem asks for an expected count, write it as a sum of indicator variables and stop worrying about dependence.`, {
      terms: [['Indicator variable', '1 if an event happens, 0 otherwise. Its expectation is the event\'s probability.'], ['Linearity of expectation', 'E[X + Y] = E[X] + E[Y] always, independent or not.']]
    }),
    q.num('M', 'Genius track · A random permutation of 1..52 (a shuffled deck). Expected number of cards in their original position?', 1, '52 × (1/52).'),
  ],
  17: q => [
    q.info('M', 'Mathematician\'s thread · Optimal stopping (roll again?)', `Roll a die; you may keep it or roll once more and take the second roll. What is the best strategy, and its value? Work **backwards**: the second roll is worth 3.5 on average. So keep the first roll only if it beats 3.5, i.e. 4, 5 or 6. Value = (1/2)(5) + (1/2)(3.5) = **4.25**. Backward induction from the last decision is the standard tool for "stop or continue" problems.`, {
      terms: [['Backward induction', 'Solve the last decision first, then use its value to decide the one before.'], ['Continuation value', 'What you expect if you do not stop now.']]
    }),
    q.num('M', 'Genius track · Roll a fair die up to three times; after the first or second roll you may stop and keep that roll, otherwise you take the last roll. With the best strategy, the expected value of the roll you keep, 3 d.p.?', 4.667, 'Two-roll value is 4.25, so after the first roll keep 5 or 6 only: (2/6)(5.5) + (4/6)(4.25) = 14/3.', { tol: 0.005 }),
  ],
  18: q => [
    q.info('M', 'Mathematician\'s thread · Fair price of a game', `A game pays £X where X is a die roll. The fair price is E[X] = 3.5. Now a game pays £X². The naive guess 3.5² = 12.25 is wrong: E[X²] = (1 + 4 + 9 + 16 + 25 + 36)/6 = **91/6 ≈ 15.17**. E[X²] > (E[X])², and the gap is exactly the variance. Trading-floor puzzles live on this distinction.`, {
      terms: [['Fair price', 'The expected payout; paying more loses on average.'], ['E[X²] ≥ (E[X])²', 'Always. The difference is Var(X).']]
    }),
    q.num('M', 'Genius track · Variance of a fair die roll, 3 d.p.?', 2.917, 'E[X²] − (E[X])² = 91/6 − 12.25 = 35/12.', { tol: 0.005 }),
  ],
  19: q => [
    q.info('M', 'Mathematician\'s thread · Strong induction and sums of cubes', `1³ + 2³ + … + n³ = (1 + 2 + … + n)² = (n(n + 1)/2)². A sum of cubes is the square of a triangular number: 1 + 8 + 27 + 64 = 100 = 10². Provable by induction: adding (n + 1)³ to (n(n+1)/2)² gives ((n+1)(n+2)/2)². Spotting a pattern in small cases, then proving it by induction, is the daily bread of a mathematician.`, {
      terms: [['Conjecture then prove', 'Compute small cases, guess the pattern, prove it by induction.']]
    }),
    q.num('M', 'Genius track · 1³ + 2³ + … + 10³ = ?', 3025, '(10 × 11/2)² = 55².'),
  ],
  20: q => [
    q.info('M', 'Mathematician\'s thread · Infinite series you can hold in your head', `1/2 + 1/4 + 1/8 + … = 1 (a geometric series with ratio 1/2). Less obvious: Σ k/2ᵏ = 1/2 + 2/4 + 3/8 + … = **2**. One route: it is the expected number of flips to the first head when p = 1/2. Another: write it as a sum of geometric tails: (1/2 + 1/4 + …) + (1/4 + 1/8 + …) + … = 1 + 1/2 + 1/4 + … = 2. Rearranging a double sum is a legitimate tool when all terms are positive.`, {
      terms: [['Geometric series', 'Σ rᵏ for k ≥ 0 equals 1/(1 − r) when |r| < 1.'], ['Tail sum trick', 'E[N] = Σ P(N ≥ k) for a non-negative integer N.']]
    }),
    q.num('M', 'Genius track · Σ k/3ᵏ for k ≥ 1, to 3 d.p.?', 0.75, 'Σ k·rᵏ = r/(1 − r)² with r = 1/3: (1/3)/(4/9) = 3/4.', { tol: 0.002 }),
  ],
  22: q => [
    q.info('M', 'Mathematician\'s thread · Symmetry arguments', `Three people each pick a random number in [0, 1]. Probability the first pick is the largest? By **symmetry**, each of the three is equally likely to be the largest: **1/3**. No integrals. Whenever the roles in a problem are interchangeable, the answer must respect that interchange. Symmetry is a computation you do not have to do.`, {
      terms: [['Symmetry', 'If swapping two objects leaves the problem unchanged, their probabilities are equal.'], ['Exchangeable', 'Random variables whose joint behaviour is unchanged by reordering.']]
    }),
    q.num('M', 'Genius track · Five people pick independent uniform numbers. Probability the third person\'s number is the second largest, as a decimal?', 0.2, 'Each rank is equally likely for each person: 1/5.', { tol: 0.005 }),
  ],
  23: q => [
    q.info('M', 'Mathematician\'s thread · Monty Hall, done properly', `Three doors, one car. You pick door 1. The host, who knows where the car is, opens another door showing a goat, and offers a switch. Switching wins with probability **2/3**: your first pick is right 1/3 of the time, and whenever it is wrong (2/3) the host\'s forced reveal points you to the car. The lesson is not the answer but the method: condition on **what the host was forced to do**, not on what you see.`, {
      terms: [['Conditioning', 'Update on the process that generated the evidence, not just the evidence itself.']]
    }),
    q.num('M', 'Genius track · 100 doors, one car. You pick one; the host opens 98 goat doors. Probability switching wins, as a decimal?', 0.99, 'Your door is right 1/100; the single remaining door carries the other 99/100.', { tol: 0.002 }),
  ],
  24: q => [
    q.info('M', 'Mathematician\'s thread · The birthday paradox', `How many people until two probably share a birthday? P(all different) = (365/365)(364/365)…: multiply the "no clash so far" chances. It drops below 1/2 at just **23** people. Intuition fails because the number of **pairs** (C(23, 2) = 253) is what matters, not the number of people. General rule: collisions appear around √(number of boxes).`, {
      terms: [['Birthday bound', 'With n boxes, expect a collision after about √(2n ln 2) ≈ 1.18√n draws.'], ['Hash collisions', 'Same maths: a 32-bit hash collides after about 2¹⁶ items.']]
    }),
    q.num('M', 'Genius track · A hash has 2²⁰ possible values. Roughly how many random items until a collision is more likely than not? (nearest hundred)', 1200, '1.18 × √(2²⁰) = 1.18 × 1024 ≈ 1200.', { tol: 60 }),
  ],
  25: q => [
    q.info('M', 'Mathematician\'s thread · Recurrences from the last move', `How many ways to tile a 2×n strip with 1×2 dominoes? Look at the **right-hand end**: either one vertical domino (leaving 2×(n − 1)) or two horizontal ones (leaving 2×(n − 2)). So T(n) = T(n − 1) + T(n − 2), with T(1) = 1, T(2) = 2: the Fibonacci numbers. "Condition on the last step" turns counting problems into recurrences.`, {
      terms: [['Recurrence', 'A rule expressing T(n) through smaller cases.'], ['Fibonacci', '1, 2, 3, 5, 8, 13, 21, 34, 55, 89, …']]
    }),
    q.num('M', 'Genius track · Number of domino tilings of a 2×10 strip?', 89, 'T(10) in the sequence 1, 2, 3, 5, 8, 13, 21, 34, 55, 89.'),
  ],
  26: q => [
    q.info('M', 'Mathematician\'s thread · How long until you are ruined?', `A fair ±1 walk starts at 0 and stops on hitting +a or −a. Expected number of steps? Let d(x) be the expected remaining steps from x. Each step costs 1 and lands you at x ± 1 equally, so d(x) = 1 + (d(x−1) + d(x+1))/2 with d(±a) = 0. The solution is **d(x) = a² − x²**, so from 0 the expected duration is **a²**. Squared distance is the natural clock of a random walk.`, {
      terms: [['Expected hitting time', 'Mean number of steps until a boundary is reached.'], ['Diffusive scaling', 'A random walk covers distance a in about a² steps.']]
    }),
    q.num('M', 'Genius track · Fair walk from 0, stopping at +8 or −8. Expected number of steps?', 64, 'a² with a = 8.'),
  ],
  27: q => [
    q.info('M', 'Mathematician\'s thread · Expected value of the maximum', `Roll two dice. Expected value of the larger roll? Use P(max ≤ k) = (k/6)²: the max is ≤ k only if both are. Then P(max = k) = (k² − (k − 1)²)/36 = (2k − 1)/36. Sum k·(2k − 1)/36 for k = 1..6 = 161/36 ≈ **4.47**. The general move: get the distribution of a max through its **cumulative** probability, which multiplies for independent variables.`, {
      terms: [['CDF of a maximum', 'P(max ≤ k) = Π P(Xᵢ ≤ k) for independent Xᵢ.']]
    }),
    q.num('M', 'Genius track · Roll three dice. Expected value of the largest, 3 d.p.?', 4.958, 'P(max = k) = (k³ − (k−1)³)/216. Sum k × that = 1071/216 = 4.958.', { tol: 0.005 }),
  ],
  29: q => [
    q.info('M', 'Mathematician\'s thread · Eigenvectors: the directions a matrix only stretches', `Most vectors get rotated and stretched by a matrix. A few special directions are only **stretched**: A**v** = λ**v**. Those are the eigenvectors, and λ is the eigenvalue. For A = [[2, 1], [1, 2]]: (1, 1) → (3, 3), so λ = 3; (1, −1) → (1, −1), so λ = 1. Eigenvalues are the roots of det(A − λI) = 0; here (2 − λ)² − 1 = 0. They govern stability, oscillation modes, Markov chains and PCA: the single most reused idea in applied maths.`, {
      terms: [['Eigenvector / eigenvalue', 'A direction v and scale λ with Av = λv.'], ['Characteristic equation', 'det(A − λI) = 0; its roots are the eigenvalues.'], ['Trace and determinant', 'Sum of eigenvalues = trace; product = determinant. Quick checks.']]
    }),
    q.num('M', 'Genius track · A = [[4, 1], [2, 3]]. Its larger eigenvalue?', 5, 'det(A − λI) = (4 − λ)(3 − λ) − 2 = λ² − 7λ + 10 = (λ − 5)(λ − 2). Check: trace 7 = 5 + 2, det 10 = 5 × 2.'),
  ],
  30: q => [
    q.mc('G', 'Mathematician\'s thread final · A 10×10 chessboard has two same-coloured squares removed. Can the remaining 98 squares be tiled by 49 dominoes?', ['No: each domino covers one square of each colour, but the removals leave unequal colour counts', 'Yes: 98 is even', 'Yes, whenever the removed squares are not adjacent', 'It depends only on whether the removed squares are corners'], 0, 'A domino always covers one black and one white square. Removing two squares of one colour leaves 48 of that colour and 50 of the other, so a tiling is impossible.', { hard: true }),
    q.num('G', 'Mathematician\'s thread final · Evaluate Σ 1/(k(k + 1)) for k = 1 to 999, as a decimal.', 0.999, 'Split each term as 1/k − 1/(k + 1). Everything between the ends cancels, leaving 1 − 1/1000 = 0.999.', { tol: 0.0001, hard: true }),
    q.num('G', 'Mathematician\'s thread final · A drawer contains socks in 5 colours. How many socks must be drawn blind to guarantee four of one colour?', 16, 'The worst case without four matching is three of each colour: 15 socks. The 16th forces some colour to appear four times.', { hard: true }),
    q.num('G', 'Mathematician\'s thread final · Seven people independently choose continuous random numbers. What is the probability that the fourth person chose the largest number? Give a decimal to 3 d.p.', 0.143, 'By symmetry, each of the seven people is equally likely to hold the unique maximum, so the probability is 1/7 ≈ 0.143.', { tol: 0.002, hard: true }),
    q.num('G', 'Mathematician\'s thread final · Roll a fair eight-sided die. You may keep the first result or reroll once and must keep the second result. With the best strategy, what is the expected result?', 5.5, 'The reroll is worth 4.5, so keep 5, 6, 7 or 8. The value is (4/8)×6.5 + (4/8)×4.5 = 5.5.', { tol: 0.001, hard: true }),
    q.num('G', 'Mathematician\'s thread final · You start with £40 and repeatedly win or lose £1 on fair independent coin flips until reaching £0 or £120. What is the probability of reaching £120? Give a decimal to 3 d.p.', 0.333, 'For a fair walk between 0 and 120, the win probability is the starting position divided by the target: 40/120 = 1/3.', { tol: 0.002, hard: true }),
    q.num('G', 'Mathematician\'s thread final · For the matrix [[3, 2], [2, 3]], what is the larger eigenvalue?', 5, 'The directions (1, 1) and (1, −1) are stretched by 5 and 1 respectively. Equivalently, (3 − λ)² − 4 = 0.', { hard: true }),
    q.mc('G', 'Mathematician\'s thread final · The numbers 1 to 30 are on a board. Each move erases a and b and writes |a − b|. After 29 moves, what must be true of the remaining number?', ['It is odd', 'It is even', 'It is zero', 'It is 1'], 0, 'The parity of the total is invariant because a + b and |a − b| have the same parity. The starting sum is 30×31/2 = 465, which is odd, so the survivor must be odd.', { hard: true }),
    q.num('G', 'Mathematician\'s thread final · How many subsets does a 12-element set have, including the empty set and the whole set?', 4096, 'Each element independently has two choices: in or out. Thus there are 2¹² = 4096 subsets. Counting by subset size gives the same identity Σ C(12, k) = 4096.', { hard: true }),
  ],
};

export const GENIUS_DAYS = Object.keys(T).map(Number);
export function genius(q, dayNum) {
  const f = T[dayNum];
  // Older cards were authored as M before this became a first-class strand. Normalise them here so
  // saved question IDs stay stable while all displays and progress records use the honest G label.
  return f ? f(q).map(step => ({ ...step, strand: 'G' })) : [];
}
