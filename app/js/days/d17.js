import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(17);

export default {
  title: 'Resets, debugging by hypothesis, indicators, measurement theory',
  emoji: '🔄',
  strands: ['H', 'S', 'M', 'E'],
  summary: '**Hardware** (H02): why a reset exists at all, synchronous versus asynchronous assertion and the harder question of *release*, and the handbook\'s trap — a reset that returns the state variable to IDLE but leaves the byte count and stored length behind, so the next packet is parsed against the last one\'s metadata. **Code** (S03 L2): debugging as hypothesis testing, preserving evidence, finding the first wrong output, and bisecting a suspect set in log₂ steps — with a call-budgeted bisect you write yourself. **Maths** (M06): indicator variables applied — fixed points in a shuffle (the answer is 1 for every n), occupied and empty buckets, distinct values seen. **Degree** (EEEN11201 / E09): a measurement is a value plus a method plus an uncertainty; accuracy vs precision vs resolution; systematic vs random error and their different fixes; reading ±(0.5 % + 2 digits) and choosing the range; and how the meter itself loads the circuit.',
  takeaway: 'A reset must establish a state that is meaningful to everything outside, not merely set convenient registers to zero: clear or invalidate every piece of partial-packet metadata, and test reset from every state. Debug like a scientist: preserve the evidence, reproduce, find the first wrong output, change one thing, then bisect — log₂(n) tests instead of n. E[indicator] = P(event), so expected fixed points in a shuffle of n cards = n × 1/n = 1, for every n. Accuracy is bias (fix by calibration), precision is scatter (fix by averaging), resolution is neither; ±(0.5 % + 2 digits) on 12.34 V with 0.01 V resolution is ±0.082 V.',
  steps: [
    // =====================================================================================================
    // HARDWARE: reset (H02)
    // =====================================================================================================
    q.info('H', 'Why a reset exists: at power-up the flip-flops hold junk', `Switch the board on. Every flip-flop in the design settles into 0 or 1 by whichever way its transistors happened to fall. Nothing chose those values. A counter might start at 47,102; a state register might start in a pattern that corresponds to no state at all.

So a design needs one input whose job is to force the whole machine into a known starting condition: **reset**. It is asserted at power-up, and again whenever software or a supervisor decides the system should start over.

The naive picture of reset is "set the registers to zero". That is nearly right and dangerously incomplete, and the rest of this strand is about the gap. The correct statement, from the handbook, is that **a reset must establish an externally meaningful state**: after reset, everything another block can see or infer must be valid and consistent.

Two design decisions follow, and they are separate questions: *how* reset takes effect (synchronously or not), and *what* it must actually clear.`, {
      terms: [
        ['Reset', 'A control input that forces registers to defined values, so the design starts from a known condition.'],
        ['Assert / de-assert', 'Turning a control signal on / turning it off. For reset, de-asserting is also called releasing it.'],
        ['Power-on state', 'What a flip-flop holds before anything drives it: unpredictable in general.'],
        ['Known state', 'A condition you can name and reason about, rather than one you inherited by accident.'],
        ['Externally meaningful', 'Valid and consistent from the point of view of the blocks that observe you, not merely tidy inside.'],
      ]
    }),
    q.info('H', 'Synchronous or asynchronous — and why release is the hard half', `**Synchronous reset**: the reset input is read at the clock edge, exactly like any other input to the next-state logic. \`if (rst) state <= IDLE; else state <= next;\` It is simple, it is analysed by the ordinary timing tools, and it needs no special treatment — but it does nothing while the clock is stopped, so it cannot be your power-up reset if the clock has not started yet.

**Asynchronous reset**: the reset reaches a dedicated pin on the flip-flop and forces it immediately, clock or no clock. Perfect for power-up. The catch is not asserting it; it is **releasing** it.

Picture reset going away at some arbitrary moment. Each flip-flop needs the reset to be gone a little before the next clock edge (its **recovery time**), just as data needs setup time. If the release happens too close to an edge, some flip-flops leave reset on that edge and others on the following one. Your machine starts with half its registers one cycle ahead of the other half, which is not any state you designed.

The standard fix is a **reset synchroniser**: assert asynchronously (works with no clock), but pass the release through two flip-flops clocked by the destination clock so every register leaves reset on the same edge. Assert immediately, release in step.`, {
      terms: [
        ['Synchronous reset', 'Sampled at the clock edge, like a normal input. Simple timing; needs a running clock.'],
        ['Asynchronous reset', 'Forces the flip-flop immediately, with no clock required. Ideal for power-up.'],
        ['Reset release (de-assertion)', 'The moment reset goes away. All registers should leave reset on the same clock edge.'],
        ['Recovery time', 'How long before a clock edge an asynchronous reset must already be released for the edge to behave predictably.'],
        ['Reset synchroniser', 'Two flip-flops that make the release of an asynchronous reset line up with the destination clock.'],
      ]
    }),
    q.info('H', 'The trap: resetting the state variable is not resetting the state', `Here is the handbook\'s worked failure, and it is worth taking personally because it passes every obvious test.

A packet receiver holds three things: the state (IDLE / HEADER / PAYLOAD), the **byte count** so far, and the **length** read out of the header. Someone writes the reset as:

\`\`\`
if (rst) state <= IDLE;
\`\`\`

Reset in the middle of a packet. The state goes to IDLE, which looks right. But \`count\` is still 3 and \`length\` is still 40, left over from the packet that was abandoned. The next start-of-frame arrives, the machine enters HEADER, and depending on the code it may now compare against a stale length, or report a packet length that includes bytes from a packet that no longer exists.

Nothing in a "send a packet, check it arrives" test finds this, because that test never resets mid-packet.

Two habits fix it. **Clear or invalidate everything an outside observer could later see** — count, length, checksum-so-far, buffered bytes, any "ready" or "done" flag. Where clearing to zero would itself be misleading (a length of 0 that downstream logic treats as a real length), add a **valid bit** and clear that instead: the data is then explicitly meaningless rather than plausibly wrong. And **test reset from every state and at every position of a transmission**, not just from idle.

Drive the simulation below into the middle of a packet, then compare the two reset buttons.`, {
      terms: [
        ['Metadata', 'The bookkeeping a machine keeps alongside the data: byte count, declared length, running checksum.'],
        ['Stale state', 'A value left over from before that is no longer valid but is still readable, so it gets used.'],
        ['Invalidate', 'Mark data as meaningless with a valid bit, rather than overwriting it with a value that looks real.'],
        ['Valid bit', 'A single flag saying "the register beside me holds real data". Clearing it is often better than clearing the data.'],
        ['Reset coverage', 'Testing reset from every state and every point in a transfer, not only from idle.'],
      ],
      widget: W('resetmeta', {})
    }),
    q.goal('H', 'In the packet-receiver simulation (registers: state, byte count, and length read from the header), start a packet, take a header and at least one data byte, then press **reset (state only)** and start another packet — until the readout reports that a packet has begun with stale metadata.', W('resetmeta', {}), s => s.everStale === true,
      'The state variable returns to IDLE and looks innocent, while count and length still hold the abandoned packet\'s values. The next start-of-frame then inherits them. Pressing "reset (everything)" instead leaves all three registers consistent.'),
    q.mc('H', 'A packet controller\'s reset sets state = IDLE but leaves byte_count and stored_length unchanged. What is the consequence?', ['The next packet can be parsed or reported against the previous packet\'s count and length, silently corrupting it', 'Nothing: only the state register affects behaviour', 'The controller can never leave IDLE again', 'Reset takes an extra clock cycle to complete'], 0, 'This is the handbook\'s H02 checkpoint. Returning only the state variable to idle leaves stale metadata that corrupts the next packet, and a nominal send-a-packet test never exercises it.'),
    q.mc('H', 'Which describes a **synchronous** reset?', ['It is sampled at the clock edge and behaves like any other input to the next-state logic', 'It forces the flip-flops immediately, with no clock needed', 'It only clears the state register and leaves data registers alone', 'It cannot be represented in simulation'], 0, 'Synchronous reset is ordinary logic, so ordinary timing analysis covers it. The immediate one is the asynchronous reset, which is what you want at power-up before the clock is running.'),
    q.mc('H', 'For an asynchronous reset, why is **releasing** it harder than asserting it?', ['If the release lands too close to a clock edge, some flip-flops leave reset on that edge and others on the next, so the machine starts in a state you never designed', 'Because releasing a reset needs more power', 'Because the reset pin cannot be de-asserted once used', 'Because release has to happen while the clock is stopped'], 0, 'Each flip-flop has a recovery time before the edge. A release that violates it makes the exit from reset non-uniform. A reset synchroniser (assert asynchronously, release through two flops on the destination clock) fixes it.'),
    q.mc('H', 'A length register would be misleading if reset simply set it to 0, because downstream logic treats 0 as a real length. What is the better reset behaviour?', ['Clear a separate valid bit, so the length is explicitly marked meaningless rather than plausibly wrong', 'Set it to the maximum possible length instead', 'Leave it unchanged and document it', 'Reset it twice to be certain'], 0, '"Externally meaningful" is the requirement. A cleared valid bit says "there is no length yet"; a zero says "the length is zero", which is a different and false claim.'),
    q.tf('H', 'Testing a reset once, from the IDLE state, is sufficient evidence that the reset is correct.', false, 'H02 L3 asks for reset tested at every transmission position and from every state. Mid-packet resets are where the stale-metadata bugs live; a reset from idle clears almost nothing and proves almost nothing.'),
    q.code('H', 'Model a packet receiver whose reset really does clear everything. `solve(events)` processes a list of events starting from state `"IDLE"` with byte count 0, and returns `[state, count, reported]`. Events: `"sof"` in IDLE starts a packet (state `"PAYLOAD"`, count 0); `"byte"` in PAYLOAD adds one to the count; `"last"` in PAYLOAD adds one to the count, appends that count to `reported` as the finished packet\'s length, and returns to `"IDLE"` (the count register keeps its reported value); `"reset"` from any state gives state `"IDLE"` **and count 0**. Any other combination leaves everything unchanged.', {
      fn: 'solve',
      starter: 'def solve(events):\n    state, count = "IDLE", 0\n    reported = []\n    for e in events:\n        if e == "reset":\n            # clear EVERYTHING an outside observer could see, not just the state\n            pass\n        elif e == "sof" and state == "IDLE":\n            pass\n        elif e == "byte" and state == "PAYLOAD":\n            pass\n        elif e == "last" and state == "PAYLOAD":\n            pass\n    return [state, count, reported]\n',
      tests: [
        { args: [[]], expect: ['IDLE', 0, []], name: 'no events: the power-up state' },
        { args: [['sof', 'byte', 'byte', 'last']], expect: ['IDLE', 3, [3]], name: 'one packet of three bytes' },
        { args: [['sof', 'byte', 'last', 'sof', 'byte', 'last']], expect: ['IDLE', 2, [2, 2]], name: 'two packets in a row: the second must not inherit the first\'s count' },
        { args: [['sof', 'byte', 'byte', 'reset', 'sof', 'byte', 'last']], expect: ['IDLE', 2, [2]], name: 'reset mid-packet, then a clean packet: the abandoned bytes must not be counted' },
        { args: [['sof', 'byte', 'reset']], expect: ['IDLE', 0, []], name: 'reset clears the partial count as well as the state' },
        { args: [['byte', 'last', 'sof', 'sof']], expect: ['PAYLOAD', 0, []], name: 'events that make no sense in the current state change nothing' },
      ],
      gen: 'def gen():\n    E = ["sof", "byte", "last", "reset"]\n    for _ in range(30):\n        n = random.randint(0, 14)\n        yield ([random.choice(E) for _ in range(n)],)',
      refCode: 'def ref(events):\n    st, c, rep = "IDLE", 0, []\n    for e in events:\n        if e == "reset": st, c = "IDLE", 0\n        elif e == "sof" and st == "IDLE": st, c = "PAYLOAD", 0\n        elif e == "byte" and st == "PAYLOAD": c += 1\n        elif e == "last" and st == "PAYLOAD":\n            c += 1; rep.append(c); st = "IDLE"\n    return [st, c, rep]',
      solution: 'def solve(events):\n    state, count = "IDLE", 0\n    reported = []\n    for e in events:\n        if e == "reset":\n            state, count = "IDLE", 0\n        elif e == "sof" and state == "IDLE":\n            state, count = "PAYLOAD", 0\n        elif e == "byte" and state == "PAYLOAD":\n            count += 1\n        elif e == "last" and state == "PAYLOAD":\n            count += 1\n            reported.append(count)\n            state = "IDLE"\n    return [state, count, reported]'
    }, 'Two lines carry the whole lesson. `state, count = "IDLE", 0` on reset is the "clear everything" habit; writing only `state = "IDLE"` passes the first three tests and fails the fourth, which is exactly the bug the handbook describes. And `state, count = "PAYLOAD", 0` on start-of-frame is the belt-and-braces version: re-initialise metadata on entry as well as on reset, so a missed reset cannot corrupt a packet either. Notice test 6: an event that makes no sense in the current state must do nothing at all — that is the "every cell of the table is a deliberate decision" rule from yesterday.'),
    q.mc('H', 'Interview: you are handed an FSM whose reset test suite is one test — "assert reset, then send a good packet, check it arrives". Name the strongest single test to add.', ['Assert reset in the middle of a packet, release it, then send a good packet and check its reported length', 'Send two good packets back to back', 'Assert reset twice in a row from idle', 'Send a packet with a bad checksum'], 0, 'The existing test only ever resets from idle, where there is no partial state to clear. A mid-packet reset is the case where stale metadata exists and can leak into the next packet.'),
    q.mc('H', 'Interview: a design uses an asynchronous reset and works on the bench, but occasionally starts up wrong after a fast power cycle. What do you check first?', ['How the reset is released: without a synchroniser, registers can leave reset on different clock edges', 'Whether the reset polarity is inverted', 'Whether the clock frequency is too low', 'Whether the state encoding is one-hot'], 0, 'Intermittent, start-up-only, timing-dependent behaviour points at the release. Assertion is robust; de-assertion near a clock edge violates recovery time and splits the design across two cycles.'),

    // =====================================================================================================
    // CODE: debugging by hypothesis and bisecting (S03 L2)
    // =====================================================================================================
    q.info('S', 'A bug is a gap between your model and the machine', `You believe the program does one thing; it does another. Debugging is closing that gap, and the fastest way is the scientific method rather than staring.

The unit of progress is a **hypothesis**: a specific claim that predicts something you can check. "The length check uses the padded length rather than the declared one" is a hypothesis — it predicts that a message with padding fails and an unpadded one passes, and one run settles it. "Something is wrong with the parser" predicts nothing and cannot be tested.

The discipline that makes hypotheses cheap:

1. **Preserve the evidence first.** The seed, the input file, the tool versions, the exact failing output, before you change a single line. Once you start editing, the original failure may become unreproducible and you have destroyed the only thing that could have told you what happened.
2. **Reproduce on demand.** If you cannot make it fail when you want, you cannot know you fixed it — only that it stopped happening today.
3. **Find the first wrong output, not the last symptom.** The crash at packet 900 is fallout; the checksum state first went wrong at packet 412. Everything after 412 is noise.
4. **Change one thing at a time.** Change five and see it pass, and you have learned almost nothing: you cannot say which change mattered, and four of them may be new bugs waiting.`, {
      terms: [
        ['Hypothesis', 'A specific, testable claim about the cause, which predicts an observation you can go and make.'],
        ['Evidence', 'The seed, inputs, versions and failing output, captured before anything is changed.'],
        ['Reproduce', 'Make the failure happen on demand with the same inputs. The entry ticket to debugging.'],
        ['First wrong output', 'The earliest point where behaviour departs from the reference. Everything after it is consequence.'],
        ['Regression', 'Something that used to work and now fails.'],
      ]
    }),
    q.info('S', 'Bisecting: halve the suspect set instead of walking it', `You have a set of suspects and a test that says "still fine" or "already broken". The suspects are ordered — commits in history, messages in a 10,000-message input, bytes in a file — and the property is **monotone**: everything before some point is fine and everything from that point on is broken.

Then do not walk the list. **Test the middle.** Whichever answer you get, half the suspects are eliminated at once. 1024 commits become 512, then 256, and after ten tests one commit is left. In general the number of tests is about **log₂ n**: 64 commits need 6, a million need 20.

\`git bisect\` automates exactly this for history: you tell it a good commit and a bad one, it checks out the middle, you say good or bad, it repeats. \`git bisect run ./test.sh\` does even the answering for you.

Three things break it, and knowing them is half the skill:

- **A flaky test.** If the answer is sometimes wrong, bisect confidently converges on the wrong commit. Make the test deterministic first.
- **Commits that do not build.** They are neither good nor bad; skip them and accept a wider final answer.
- **A non-monotone property** — the bug was introduced, fixed, and reintroduced. Bisect will find *a* transition, not necessarily the one you care about.

The same halving works on inputs: to shrink a 10,000-message failing case, keep testing halves and keep whichever half still fails.`, {
      terms: [
        ['Bisect', 'Binary search over an ordered suspect set: test the middle, discard the half that cannot contain the answer.'],
        ['Monotone property', 'Everything before the boundary is good and everything after it is bad. Bisect needs this to be true.'],
        ['git bisect', 'Git\'s built-in binary search over commits, given a known-good and a known-bad commit.'],
        ['Flaky test', 'A test whose result varies for the same input. It poisons a bisect, because one wrong answer discards the right half.'],
        ['Shrinking', 'Cutting a large failing input down to the smallest one that still fails, usually by the same halving idea.'],
      ],
      widget: W('bisect', { bad: 11 })
    }),
    q.order('S', 'Order the steps for chasing a regression that fails only with one random seed.', ['preserve the seed, the inputs, the tool versions and the failing output', 'reproduce the failure deterministically', 'locate the first wrong output rather than the final symptom', 'form one hypothesis, change one thing, re-run', 'bisect the commit history to find the change responsible'], 'Evidence first, because changing things can make the original failure unreproducible. Reproduction next, because without it you cannot tell a fix from a coincidence.'),
    q.mc('S', 'Why change only one thing at a time when debugging?', ['So a pass or a fail can be attributed to that one change', 'Because Git refuses to record more than one change', 'Because it is faster to type', 'To keep commit messages short'], 0, 'Five simultaneous changes followed by a pass tells you the bug is somewhere in five places, and may have added new ones. One change gives one clean bit of information.'),
    q.mc('S', 'A crash is reported at packet 900, but the checksum state was already wrong at packet 412. Where do you investigate?', ['At packet 412, the first wrong output — everything after it is consequence', 'At packet 900, where the crash happened', 'At packet 1, always', 'At the final packet of the run'], 0, 'Symptoms surface downstream of causes. Debugging the crash site usually produces a fix that hides the real defect.'),
    q.num('S', 'A regression was introduced somewhere in a run of 64 commits (the first is known good, the last known bad). Bisecting needs about how many test runs?', 6, 'Each test halves the candidate range: 64 → 32 → 16 → 8 → 4 → 2 → 1, which is log₂ 64 = 6 tests. Walking the history one commit at a time could take 63.'),
    q.num('S', 'A regression was introduced somewhere in a run of 1,000,000 commits (the first is known good, the last known bad). Roughly how many test runs does bisecting need?', 20, 'log₂ 1,000,000 ≈ 19.9, so about 20. Doubling the history adds one test, which is why binary search is worth the discipline it demands.', { tol: 1 }),
    q.mc('S', 'Your bisect finishes and blames a commit that only changes a comment. The most likely explanation is…', ['The test is flaky: one wrong good/bad answer sends the search into the wrong half, and it converges confidently on nonsense', 'Comments can change compiled behaviour', 'Bisect always needs one more step than log₂ n', 'The history was too short to bisect'], 0, 'Binary search trusts every answer completely. Make the test deterministic (fixed seed, fixed environment), then bisect again.'),
    q.code('S', 'Write a bisect that respects a call budget. `solve(n, hidden)` searches commits numbered 0 … n−1. Commit 0 is known good and commit n−1 is known bad; the first bad commit is somewhere in 1 … n−1. The starter builds the oracle for you: `is_bad(i)` returns True if commit i is broken, and counts how many times you called it — treat `hidden` itself as unreadable and only ever ask through `is_bad`. Return `[first_bad_commit, number_of_calls]`. A linear scan gets the right commit and fails: the check enforces a budget of about log₂ n calls.', {
      fn: 'solve',
      starter: 'def solve(n, hidden):\n    calls = [0]\n\n    def is_bad(i):                 # the oracle: one build-and-test run\n        calls[0] += 1\n        return i >= hidden\n\n    lo, hi = 0, n - 1              # invariant: lo is known good, hi is known bad\n    while hi - lo > 1:\n        mid = (lo + hi) // 2\n        # ask once, then throw away half the range\n        pass\n    return [hi, calls[0]]\n',
      tests: [
        { args: [16, 11], expect: null, name: '16 commits, first bad is 11 → must find 11 in at most 4 calls' },
        { args: [2, 1], expect: null, name: 'only two commits: the answer needs no calls at all' },
        { args: [16, 1], expect: null, name: 'the very first commit after the good one is the culprit' },
        { args: [16, 15], expect: null, name: 'the last commit is the culprit' },
        { args: [1000, 673], expect: null, name: '1000 commits in at most 10 calls' },
        { args: [1000000, 654321], expect: null, name: 'a million commits in at most 20 calls — a linear scan would need 654,321' },
      ],
      gen: 'def gen():\n    for _ in range(25):\n        n = random.randint(2, 5000)\n        yield (n, random.randint(1, n - 1))',
      checker: 'def check(args, got, expect):\n    n, hidden = args[0], args[1]\n    if not isinstance(got, (list, tuple)) or len(got) != 2:\n        return False\n    ans, calls = got\n    if ans != hidden:\n        return False\n    budget = max(0, n - 2).bit_length()\n    return isinstance(calls, int) and calls <= budget',
      solution: 'def solve(n, hidden):\n    calls = [0]\n\n    def is_bad(i):\n        calls[0] += 1\n        return i >= hidden\n\n    lo, hi = 0, n - 1\n    while hi - lo > 1:\n        mid = (lo + hi) // 2\n        if is_bad(mid):\n            hi = mid\n        else:\n            lo = mid\n    return [hi, calls[0]]'
    }, 'The invariant is the whole algorithm: **lo is always known good, hi is always known bad**, so the first bad commit is always in (lo, hi]. It holds at the start because the problem says so, and each test restores it — a bad mid becomes the new hi, a good mid becomes the new lo. When hi − lo = 1 there is nowhere left for the boundary to hide, so hi is the answer, and no extra call is needed to confirm it. The loop condition is `hi - lo > 1`, not `lo < hi`: testing lo or hi again would waste a call on a commit whose answer you already know. Each test halves the range, so the number of calls is ⌈log₂(n−1)⌉ — 20 for a million commits.'),
    q.mc('S', 'Interview: your bisect loop keeps the invariant "lo is known good, hi is known bad" and stops when hi − lo = 1. Why does it not need one more call to confirm the answer?', ['The invariant already asserts hi is bad and lo is good, and there is no commit between them, so hi must be the first bad one', 'It does need one more call; the loop is buggy', 'Because the oracle caches its answers', 'Because commit 0 is always good'], 0, 'Every fact the final call would establish is already recorded in the invariant. Recognising that is the difference between ⌈log₂ n⌉ calls and ⌈log₂ n⌉ + 1.'),
    q.mc('S', 'Interview: when is a linear scan genuinely the better choice than bisecting a regression?', ['When one test run is cheap and the history is short, or when the property is not monotone so bisect could converge on the wrong change', 'Never: binary search is always better', 'When the number of commits is a power of two', 'When the test is flaky, since a scan tolerates flakiness'], 0, 'Bisect wins when a test run is expensive relative to the number of suspects, and it requires monotonicity. A flaky test breaks both approaches, but it destroys a bisect faster because one wrong answer discards half the truth.'),
    q.mc('S', 'Interview: a random test fails on a 10,000-message input. What is the best next step, and what idea does it reuse?', ['Shrink it: keep halving the input and keeping whichever half still fails, until you have a minimal case to save as a regression test', 'Rerun with 1,000,000 messages to make the failure more likely', 'Change the seed until the test passes', 'Delete the test and file a bug'], 0, 'It is the same halving as a bisect, applied to inputs instead of commits. A minimal failing case is readable, fast, and becomes the permanent regression test that stops the bug returning.'),

    // =====================================================================================================
    // MATHS: indicators in anger (M06)
    // =====================================================================================================
    q.info('M', 'The recipe: any "how many on average" is a sum of 0/1s', `An **indicator** is a random variable that is 1 when an event happens and 0 when it does not, so its expectation is just the probability of that event. Adding expectations is always allowed, whether or not the pieces are related. Together those two facts solve a whole class of problems by the same three steps:

1. **Find the slots.** One indicator per place the thing you are counting could occur.
2. **Find one probability.** Pick a single slot and work out how likely it is to contribute. Symmetry usually means every slot has the same probability.
3. **Multiply.** Expected count = number of slots × probability per slot.

The power of it is that step 2 is a question about *one* slot, so it is usually easy even when the whole count has a horrible distribution. You never need to know how the count is distributed to know its average.

A worked one. Twelve rolls of a fair die, how many sixes on average? Slots: 12 rolls. One probability: 1/6. Answer: 12 × 1/6 = **2**.`, {
      terms: [
        ['Indicator variable', 'A 0/1 variable: 1 if an event happens, 0 if not. Its expectation is the event\'s probability.'],
        ['Slot', 'One place a contribution could occur: a roll, a card position, a bucket, a gap between neighbours.'],
        ['Symmetry', 'The observation that every slot has the same chance, so you only need to analyse one of them.'],
        ['Distribution', 'The full list of possible values and their probabilities. Expectation does not require knowing it.'],
      ],
      widget: W('indicators', { mode: 'sixes', n: 12 })
    }),
    q.info('M', 'Fixed points in a shuffle: the answer is 1, whatever n is', `Ten people put their hats in a pile; the hats are handed back at random. How many people get their own hat, on average?

Apply the recipe. **Slots**: the 10 people. **One probability**: person i gets a uniformly random hat, so P(their own) = 1/10. **Multiply**: 10 × 1/10 = **1**.

Now the striking part. With n people it is n × 1/n = **1**, for every n. A hundred people, a million people: on average exactly one person gets their own hat.

Take the surprise seriously, because it is the point. The events are strongly dependent — if 9 of 10 people have their own hat, the tenth certainly does too — and the count has an awkward distribution nobody wants to write down. Linearity ignores all of it. Any attempt to solve this by enumerating permutations is a much harder problem with the same answer.

In a shuffle, an item left in its original position is called a **fixed point**, and this is the standard result: a random permutation has one fixed point on average.`, {
      terms: [
        ['Fixed point', 'An item a shuffle leaves in its original position.'],
        ['Permutation', 'One particular ordering of n items. There are n! of them.'],
        ['Derangement', 'A permutation with no fixed points at all. About 1/e ≈ 36.8% of shuffles are derangements.'],
        ['Dependence, again', 'These indicators are strongly dependent, and the expected count is still just the sum of the individual probabilities.'],
      ]
    }),
    q.info('M', 'Buckets: count the empty ones, then subtract', `n keys are dropped into m buckets, each key landing in a uniformly random bucket, independently. How many buckets end up **occupied**, on average?

Trying to build an indicator for "bucket j is occupied" directly means asking "at least one of the n keys landed here", and "at least one" is almost always easier through its opposite. So:

P(bucket j gets no key) = (1 − 1/m)ⁿ — each key independently misses this bucket with probability 1 − 1/m.

Therefore P(occupied) = 1 − (1 − 1/m)ⁿ, and with one indicator per bucket:

**E[occupied buckets] = m · (1 − (1 − 1/m)ⁿ).**

Check it against common sense. With n = 1 key it gives m·(1/m) = 1 ✓. With a huge n it approaches m ✓. Three keys into four buckets: P(a given bucket is empty) = (3/4)³ = 27/64, so the expected number occupied is 4 × 37/64 = 37/16 = 2.3125.

The same complement trick answers "how many distinct values did I see?" for dice, hash tables and load balancers alike.`, {
      terms: [
        ['Bucket', 'One slot a key can land in: a hash-table entry, a server, a die face.'],
        ['Occupied bucket', 'A bucket that received at least one key.'],
        ['Complement', 'P(at least one) = 1 − P(none). The standard route into an "at least one" question.'],
        ['Collision', 'Two keys landing in the same bucket. The gap between n keys and the number of occupied buckets counts them.'],
      ]
    }),
    q.num('M', 'A fair six-sided die is rolled 12 times. What is the expected number of sixes?', 2, 'One indicator per roll, each with expectation 1/6: 12 × 1/6 = 2.'),
    q.num('M', 'A fair coin is flipped 7 times. Expected number of heads?', 3.5, '7 indicators, each worth ½: 7 × ½ = 3.5. Not an achievable count, which is fine — an expectation is a centre, not a prediction.'),
    q.num('M', 'Ten cards are shuffled uniformly at random and laid out in a row. What is the expected number of cards that end up in their original position?', 1, '10 positions, each occupied by its original card with probability 1/10. Total 10 × 1/10 = 1 — and the same argument gives 1 for any number of cards.'),
    q.num('M', 'Three keys are dropped independently into 4 buckets, each key choosing a bucket uniformly at random. What is the probability that a particular bucket stays empty? Give it as a fraction or decimal.', 27 / 64, 'Each key independently misses that bucket with probability 3/4, so all three miss with probability (3/4)³ = 27/64 ≈ 0.4219.', { display: '27/64' }),
    q.num('M', 'Three keys are dropped independently into 4 buckets, each key choosing uniformly at random. What is the expected number of buckets that receive at least one key, to 4 d.p.?', 37 / 16, 'P(a given bucket is occupied) = 1 − (3/4)³ = 37/64. Four buckets: 4 × 37/64 = 37/16 = 2.3125. Three keys, but only about 2.3 buckets used — the difference is collisions.', { tol: 0.002, display: '37/16 = 2.3125' }),
    q.mc('M', 'In the hat problem — n people, hats returned at random — the indicators "person i gets their own hat" are strongly dependent. Why is the expected count still simply n × (1/n)?', ['Because expectation of a sum is the sum of expectations for any variables at all; dependence would only matter for a product or a variance', 'Because with large n the dependence becomes negligible', 'Because the events are actually independent', 'Because every permutation is equally likely'], 0, 'Linearity comes from splitting a sum over outcomes, which never asks how the variables relate. The dependence is real and it changes the spread of the count, not its mean.'),
    q.num('M', 'Interview: five fair six-sided dice are rolled at once. What is the expected number of **distinct** face values showing, to 3 d.p.?', 3.589, 'Treat the 6 faces as buckets and the 5 dice as keys. A given face is missing with probability (5/6)⁵ = 3125/7776, so it appears with probability 1 − 3125/7776 = 4651/7776. Six faces: 6 × 4651/7776 = 3.5880.', { tol: 0.01 }),
    q.num('M', 'Interview: ten keys are hashed independently and uniformly into ten buckets. What is the expected number of **empty** buckets, to 3 d.p.?', 3.487, 'P(a given bucket is empty) = (9/10)¹⁰ = 0.34868. Ten buckets: 3.487. As n = m grows this tends to m/e ≈ 0.368m — over a third of a hash table is wasted when you use as many buckets as keys.', { tol: 0.01 }),
    q.num('M', 'Interview: 100 people each write their name on a card, the cards are shuffled uniformly, and one card is handed back to each person. What is the expected number of people who receive their own card?', 1, '100 slots, each with probability 1/100: exactly 1. The answer does not depend on the number of people, which is the whole point of the example.'),
    q.mc('M', 'Interview: a candidate is asked for the expected number of fixed points in a shuffle of n cards and starts counting permutations by number of fixed points. What is the flaw in that plan?', ['It computes the entire distribution to extract one number that n indicators give in a line — far more work, and it obscures why the answer does not depend on n', 'It gives the wrong answer', 'Permutations are not equally likely', 'It only works for small n because the count is not an integer'], 0, 'The enumeration is correct but enormously harder, and it hides the structure. Indicators show that the answer is (slots) × (probability per slot), so n × 1/n = 1 falls out immediately.'),

    // =====================================================================================================
    // DEGREE: measurement theory (EEEN11201 / E09)
    // =====================================================================================================
    q.info('E', 'A measurement is a value, a method and an uncertainty', `"The voltage is 5.2 V" is not a measurement. It is a number with no way to tell whether it is worth anything.

A measurement is three things: the **value**, the **method** that produced it (which instrument, on which range, connected where, under what conditions), and the **uncertainty** — the range within which the true value plausibly lies. Drop any one of them and the result cannot be checked, repeated, or compared with anybody else's.

This is the first idea in EEE in Practice, and it is not bureaucracy. Every number you will ever put in a lab report, a datasheet or a design review carries an implied claim about how well it is known. "5.2 V" claims two significant figures; "5.200 V" claims four and had better be justified.

The rest of this strand is the vocabulary for the uncertainty part: the two very different ways a reading can be wrong, and how a meter's own specification tells you how wrong it might be.`, {
      terms: [
        ['Measurand', 'The specific quantity being measured, defined precisely enough to be unambiguous.'],
        ['Method', 'Instrument, range, connection point and conditions. Part of the result, not an afterthought.'],
        ['Uncertainty', 'The interval within which the true value plausibly lies, quoted with the value.'],
        ['Significant figures', 'How many digits you are claiming to know. Writing more than you can justify is a false claim.'],
      ]
    }),
    q.info('E', 'Accuracy, precision, resolution: three different things', `Picture darts thrown at a board.

**Accuracy** is how close the *average* landing point is to the bullseye. Being wrong on average is a **systematic error**, a bias: a meter with an offset, a wrong calibration, a probe that loads the circuit, a thermocouple reading in the wrong units. Throwing more darts does not help at all — the average of a biased set of readings is still biased. The fix is **calibration**: compare against a known standard and correct the difference.

**Precision** is how tightly the darts cluster, wherever the cluster sits. Scatter is **random error**: thermal noise, quantisation, a shaky hand, mains pickup. Here more readings *do* help — averaging n readings shrinks the scatter of the average by √n (tomorrow's topic).

**Resolution** is the finest change the instrument can display: 0.01 V on a 3½-digit meter, one LSB of an ADC. It is neither of the other two. A meter can display 12.347 V with total confidence and be 0.5 V wrong.

The dangerous combination is precise but inaccurate: ten readings of 5.212, 5.209, 5.211 look authoritative and are all wrong by the same 0.21 V. Nothing in the numbers themselves reveals it — only a comparison against a standard does.`, {
      terms: [
        ['Accuracy', 'How close the mean reading is to the true value. Limited by systematic error.'],
        ['Precision (repeatability)', 'How tightly repeated readings cluster. Limited by random error.'],
        ['Resolution', 'The smallest change the instrument can show: one digit, one LSB. Not the same as accuracy.'],
        ['Systematic error (bias)', 'The same error every time. Fixed by calibration; averaging cannot touch it.'],
        ['Random error (noise)', 'A different error each time. Reduced by averaging many readings.'],
        ['Traceability', 'A documented calibration chain back to a national standard, so two labs agree.'],
      ],
      widget: W('accuracy', { bias: 0.5, spread: 0.15 })
    }),
    q.info('E', 'Reading ±(0.5 % of reading + 2 digits)', `A meter's datasheet does not promise "±0.5 %". It promises something like **±(0.5 % of reading + 2 digits)**, and the two terms are two different physical faults.

**The percentage term** is **gain error**: the meter's internal scale factor is slightly off, so the error grows in proportion to what you are measuring. 0.5 % of 12.34 V is 0.062 V.

**The digits term** is everything that is *fixed* in size: offset in the input stage, and the quantisation of the display itself. It is quoted in **counts of the last displayed digit**, which is why it depends on the **range** you selected, not on the reading. A 3½-digit meter counts up to 1999, so its resolution is one two-thousandth of the range: 0.01 V on the 20 V range, 0.1 V on the 200 V range.

Add them for the worst case. 12.34 V on the 20 V range: 0.0617 + 2 × 0.01 = **±0.082 V**, about 0.66 %. The same voltage on the 200 V range: 0.0617 + 2 × 0.1 = **±0.262 V**, three times worse for no benefit.

Hence the rule every lab teaches without explaining: **choose the lowest range the reading fits on.** The percentage term does not care, but the digits term shrinks by a factor of ten each time you step down.`, {
      terms: [
        ['Gain error', 'A scale-factor error, proportional to the reading. The "% of reading" term.'],
        ['Offset / quantisation error', 'A fixed-size error, independent of the reading. The "+ n digits" term.'],
        ['Count / last digit', 'One step of the display. A 3½-digit meter has 1999 counts, so one count is range/2000.'],
        ['Range', 'The full-scale setting. It fixes the resolution and therefore the size of the digits term.'],
        ['Worst case', 'Adding the terms outright, assuming both errors push the same way. Datasheet specs are stated this way.'],
      ],
      widget: W('meterspec', { pct: 0.5, digits: 2, reading: 12.34, ranges: [2, 20, 200], range: 20 })
    }),
    q.info('E', 'The meter changes the circuit it measures', `A voltmeter is not a passive observer. It is a resistor you have just connected across part of your circuit, and current now flows through it that did not before. That is **loading**.

How much it matters depends entirely on what it is placed across. A 10 MΩ meter across a car battery: nothing happens, because the source can supply that current a million times over. The same meter across a node fed through 1 MΩ resistors: the reading collapses, because the meter's resistance is comparable to the circuit's own.

The rule: **compare the instrument's input impedance with the impedance it is measuring across.** A 10 MΩ voltmeter is safe on a node whose Thévenin resistance is a few kilohms, and is a serious error source above a few hundred kilohms.

The same story for an oscilloscope, with a twist: a scope probe also adds **capacitance** (roughly 10 pF for a ×10 probe, more like 100 pF for a plain coaxial lead). That is irrelevant at DC and dominant at megahertz, because a capacitor's impedance falls as frequency rises. It is why a fast edge looks slower on a scope than it really is, and why a long ground lead adds ringing that was never in the circuit.

The honest way to report a loaded measurement is not to hide it, but to state the instrument's impedance, or to correct for it: a 5 V node with a 100 kΩ source resistance measured by a 1 MΩ meter reads 5 × 1000/1100 = 4.55 V, and you can say so.`, {
      terms: [
        ['Loading', 'The instrument drawing current and changing the very quantity it is measuring.'],
        ['Input impedance', 'The resistance (and capacitance) an instrument presents to the circuit. 10 MΩ is typical for a DMM.'],
        ['Probe capacitance', 'The capacitance a scope probe adds at the node. Harmless at DC, dominant at high frequency.'],
        ['Source (Thévenin) resistance', 'The resistance looking back into the node being measured. Loading matters when it is comparable to the instrument\'s.'],
        ['Correcting vs reporting', 'Either compute the true value from the known loading, or state the method so the reader can.'],
      ],
      widget: W('probe', { Rs: 100 })
    }),
    q.mc('E', 'A meter is used ten times on a 5.000 V reference and gives 5.212, 5.209, 5.211, 5.210, 5.213 V and so on. How would you describe it?', ['Precise but not accurate: a tight cluster sitting about 0.21 V away from the true value', 'Accurate but not precise', 'Both accurate and precise', 'Neither accurate nor precise'], 0, 'The scatter is a couple of millivolts, so precision is excellent. The mean is 5.211 against a true 5.000, so there is a 0.21 V systematic error that no amount of repetition will reveal or remove.'),
    q.mc('E', 'Which kind of error does averaging many readings reduce?', ['Random error only', 'Systematic error only', 'Both equally', 'Neither'], 0, 'Random errors scatter both ways and partly cancel, so the mean of n readings has √n less scatter. A bias is identical in every reading, so it survives averaging untouched.', { grid: true }),
    q.mc('E', 'A voltmeter reads 0.1 V high on every measurement. What is the correct fix?', ['Calibrate it against a known standard and correct the offset', 'Take many more readings and average them', 'Switch to a higher-resolution range', 'Quote the readings unchanged and hope'], 0, 'A systematic error is removed by comparison with something known to be right. Averaging a biased instrument just gives a more precise wrong answer.'),
    q.tf('E', 'A reading displayed to 5 significant figures is necessarily accurate to 5 significant figures.', false, 'Resolution is not accuracy. The extra digits can be noise, or they can be a very confident-looking bias. Only the instrument\'s accuracy specification and its calibration tell you which digits mean anything.'),
    q.num('E', 'A meter specified as ±(0.5 % of reading + 2 digits) reads 12.34 V on a range whose resolution is 0.01 V. What is the worst-case uncertainty in volts, to 3 d.p.?', 0.082, '0.5 % of 12.34 = 0.0617 V. The digits term is 2 × 0.01 = 0.02 V. Worst case they add: 0.0817 ≈ 0.082 V, which is 0.66 % of the reading.', { unit: 'V', tol: 0.001 }),
    q.num('E', 'A 12-bit ADC spans 0 to 3.3 V. What is one LSB (its resolution), in millivolts, to 3 d.p.?', 0.806, '2¹² = 4096 steps across 3.3 V, so one step is 3.3/4096 = 0.0008057 V = 0.806 mV. That is the resolution and says nothing on its own about the converter\'s accuracy.', { unit: 'mV', tol: 0.004 }),
    q.mc('E', 'A thermistor with ±2 % tolerance is read by a 10-bit ADC covering 0–5 V (one step ≈ 4.9 mV). What limits the accuracy of the temperature reading?', ['The sensor tolerance: a systematic error far larger than one ADC step, so a finer ADC would change nothing', 'The ADC resolution', 'The ADC sampling rate', 'The resistance of the connecting wires'], 0, 'Always find the biggest term in the error budget first. 2 % of the signal dwarfs 4.9 mV, so the money should go on calibrating the sensor, not on a 16-bit converter.'),
    q.tf('E', 'Ten repeated readings that agree with each other to within one digit prove that the instrument is correctly calibrated.', false, 'They prove repeatability, which is precision. Every one of those readings can share the same calibration offset, and nothing inside the set of readings can reveal it — only a comparison against a traceable standard can.'),
    q.mc('E', 'You must measure a 20 nanosecond pulse on a digital line. Which instrument, and why?', ['An oscilloscope: a DMM reports an average over its whole measurement window and cannot resolve events that short', 'A DMM on its fastest range, since it has more digits', 'A DMM in AC mode, which responds to fast signals', 'Either: both sample fast enough'], 0, 'Choose instrumentation that can resolve the signal. A DMM integrates over milliseconds, so a 20 ns pulse becomes a tiny shift in an average; a scope with adequate bandwidth shows its shape.'),
    q.num('E', 'A ×10 oscilloscope probe adds about 10 pF of capacitance at the node it touches. At 10 MHz, what is the magnitude of that capacitor\'s impedance, in ohms, to the nearest ohm? (|Z| = 1/(2πfC).)', 1592, '|Z| = 1/(2π × 10⁷ × 10⁻¹¹) = 1/(6.283 × 10⁻⁴) = 1592 Ω. At DC the same capacitance is an open circuit and irrelevant; at 10 MHz it is 1.6 kΩ hung on the node, which is why fast edges look slower on a scope than they really are.', { unit: 'Ω', tol: 20 }),
    q.num('E', 'Exam-style: a 3½-digit meter (1999 counts, so resolution = range/2000) specified as ±(0.5 % of reading + 2 digits) measures 1.85 V. Using the lowest range that fits, the 2 V range, state the worst-case uncertainty in volts to 3 d.p.', 0.011, 'On the 2 V range the resolution is 2/2000 = 0.001 V. Gain term: 0.005 × 1.85 = 0.00925 V. Digits term: 2 × 0.001 = 0.002 V. Total ±0.01125 ≈ ±0.011 V, i.e. 0.61 % of the reading.', { unit: 'V', tol: 0.0006 }),
    q.num('E', 'Exam-style: a 3½-digit meter (1999 counts, so resolution = range/2000) specified as ±(0.5 % of reading + 2 digits) measures 1.85 V, but is left switched to the 200 V range. State the worst-case uncertainty in volts, to 3 d.p.', 0.209, 'On the 200 V range the resolution is 0.1 V. Gain term: 0.00925 V. Digits term: 2 × 0.1 = 0.2 V. Total ±0.209 V — nearly 19 times worse than on the 2 V range, and more than 11 % of the reading. This is why you step down to the lowest range that does not overflow.', { unit: 'V', tol: 0.001 }),
    q.num('E', 'Exam-style: a 10 V source drives two 100 kΩ resistors in series, so the voltage across the lower resistor is 5.000 V with nothing connected. A voltmeter of input resistance 1 MΩ is placed across the lower resistor. What does it read, in volts, to 3 d.p.?', 4.762, 'The meter is in parallel with the lower 100 kΩ: 100k ∥ 1M = 100 × 1000/1100 = 90.91 kΩ. The divider is now 10 × 90.91/(100 + 90.91) = 4.762 V. The meter has changed the circuit by 0.238 V, a 4.8 % loading error, and nothing in the reading itself reveals it.', { unit: 'V', tol: 0.01 }),
    q.num('E', 'A meter specified as ±(0.5 % of reading + 2 digits) with a resolution of 0.01 V reads 12.34 V. Express the worst-case uncertainty as a percentage of the reading, to 2 d.p.', 0.66, 'The uncertainty is 0.0617 + 0.02 = 0.0817 V, and 0.0817/12.34 = 0.662 %. Notice it is larger than the headline 0.5 %: the digits term always makes the true percentage worse, and much worse for small readings.', { unit: '%', tol: 0.02 }),
    q.mc('E', 'Why is the fixed part of a meter specification quoted in "digits" rather than in volts?', ['Because it comes from offset and display quantisation, whose size is set by the range you selected, not by the reading', 'Because volts would be too small to print', 'Because it applies only to digital meters', 'Because it changes in proportion to the reading'], 0, 'One digit means one count of the display, which is range/2000 on a 3½-digit meter. Quoting it in digits makes one number correct on every range.'),
    q.num('E', 'Exam-style: a 4½-digit meter has 19999 counts, so its resolution is range/20000. On the 20 V range it is specified as ±(0.05 % of reading + 3 digits) and it reads 12.345 V. State the worst-case uncertainty in volts, to 4 d.p.', 0.0092, 'Resolution = 20/20000 = 0.001 V. Gain term: 0.0005 × 12.345 = 0.0062 V. Digits term: 3 × 0.001 = 0.003 V. Total ±0.0092 V, about 0.075 % — roughly nine times better than the 3½-digit meter, and the extra digit of display is only part of the reason.', { unit: 'V', tol: 0.0004 }),
    q.mc('E', 'Exam-style: one resistor is sent to two labs for measurement. Lab A reports 100.2 ± 0.3 Ω and lab B reports 100.9 ± 0.3 Ω. What is the correct conclusion?', ['The intervals 99.9–100.5 and 100.6–101.2 do not overlap, so at least one lab has an uncorrected systematic error or an understated uncertainty', 'They agree, because both are about 100 Ω', 'Lab B is right because its value is larger', 'Nothing can be said without more readings from each lab'], 0, 'Quoted uncertainties are a testable claim. Non-overlapping intervals mean the claims are inconsistent, and more repeat readings would not resolve it — the disagreement is systematic, so it points at calibration or method.'),
    q.mc('E', 'Exam-style: a 10 MΩ voltmeter gives a reading you suspect is loaded. Which single piece of information decides whether the loading matters?', ['The Thévenin resistance of the node being measured: loading matters when it is not far below the meter\'s 10 MΩ', 'The value of the supply voltage', 'The meter\'s resolution in digits', 'Whether the source is AC or DC'], 0, 'Loading is a divider between the source resistance and the instrument\'s input resistance. A few kilohms against 10 MΩ is an error of parts per thousand; a few megohms against 10 MΩ is tens of per cent.'),
    ...genius(q, 17),
  ]
};
