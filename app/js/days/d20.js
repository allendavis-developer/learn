import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(20);

export default {
  title: 'Busy signals & mid-frame reset, log n, "at least one drop", inductors',
  emoji: '🛰️',
  strands: ['H', 'A', 'M', 'E'],
  summary: 'Handbook week 3, H02 L3 finished. **Hardware**: what a transmitter does with a byte that arrives while it is busy (refuse, queue, drop-and-count, overwrite — one of them is never allowed), what a reset must leave behind when it lands in the middle of a frame, why an aborted frame can be *silently accepted* as a wrong byte, and why a queue only absorbs bursts. **Algorithms** (A02 preview): the cost of halving — why log₂ n is tiny, why one probe needs a question whose answer flips only once, and the counting bound that says n + 1 possible answers need ⌈log₂(n+1)⌉ probes. **Maths** (M05 L2): P(at least one drop) = 1 − (1−p)ⁿ, why n·p is an upper bound and an expected count but not that probability, the 1 − e^(−np) rule of thumb, and inverting the formula to design for a reliability target. **Degree** (EEEN11101, E01): where v = L·di/dt comes from, why current cannot jump, the RL step response derived from KVL with τ = L/R, and the switch-off spike that flyback diodes exist to absorb.',
  takeaway: 'Busy is a state and acceptance during it is a **contract**: refuse (ready low), queue, or drop *and count it*; never overwrite, never lose silently. Reset must leave an externally meaningful state: line idle high, bit index and busy cleared, no done pulse for a frame that never finished — and a receiver may still accept the truncated frame as a wrong byte, so end-to-end checks exist for a reason. Halving n costs ⌊log₂ n⌋ steps; a lower-bound search over n items needs ⌈log₂(n+1)⌉ probes because it has n + 1 possible answers. P(at least one) = 1 − (1−p)ⁿ ≈ 1 − e^(−np); n·p is the expected count and an upper bound, not the probability. Inductor: v = L·di/dt, τ = L/R, i cannot jump, energy ½LI², and interrupting it makes a spike.',
  steps: [
    // =====================================================================================================
    // HARDWARE: acceptance while busy, reset mid-frame, and what a queue can and cannot fix (H02 L3)
    // =====================================================================================================
    q.info('H', 'Busy is a state, and what happens during it is a contract', `A UART transmitter holds **one** byte at a time and needs 10 bit-times to push it out. At 115,200 baud that is 87 µs, which is thousands of clock cycles. Sooner or later software writes a new byte in the middle of that. The design must say — in writing — what happens then. There are only four answers:

- **Refuse.** Drop a \`ready\` output low while busy. The source keeps its byte and writes again later. Nothing is lost, and the cost is pushed back to whoever produced the data. This is the handshake Day 22 builds properly.
- **Queue.** Put a small buffer in front. \`ready\` becomes "the buffer is not full". Bursts are absorbed; the contract at the edge is still refuse.
- **Drop, and say so.** Discard the byte, raise an **overflow flag** and increment a counter. Acceptable only when loss is declared, visible and counted.
- **Overwrite.** Load the new byte into the shift register mid-frame. This corrupts a frame already on the wire *and* loses the new byte's start. Never a design; always a bug.

The dangerous option is the fifth one nobody chooses on purpose: drop it silently. Nothing complains, simulation passes, and the fault appears as one wrong reading a week later. The handbook rule (H02 L3) is blunt: **define acceptance while busy**, then test it.`, {
      terms: [
        ['Busy', 'The transmitter is part-way through a frame and cannot start another.'],
        ['Acceptance contract', 'The written rule for what happens to an input offered while busy: refused, queued, dropped-and-counted, or accepted.'],
        ['Backpressure', 'Telling the source to wait by lowering ready, instead of losing its data.'],
        ['Overflow flag / counter', 'A status bit and count that make a deliberate drop visible to software. Loss without a signal is invisible loss.'],
        ['Shift register', 'The register holding the byte being sent; it moves one bit onto the line per bit-time.'],
      ],
      widget: W('uartbusy', { byte: 0x41, byte2: 0x0F })
    }),
    q.mc('H', 'A UART transmitter is half-way through sending a byte when software writes a second byte. Which behaviour is **never** an acceptable design?', ['Loading the new byte into the shift register straight away, so the frame in progress changes mid-flight', 'Lowering ready so the source holds the byte and retries', 'Accepting it into a small queue in front of the transmitter', 'Discarding it, raising an overflow flag and counting it'], 0, 'Overwriting corrupts the frame already on the wire and loses the new byte\'s framing. The other three are honest contracts: refuse, queue, or drop with the loss made visible.'),
    q.info('H', 'A reset that lands in the middle of a byte', `The handbook is precise about resets: a reset must establish an **externally meaningful state**, not merely set convenient registers to zero. For a transmitter caught mid-frame that means all of:

- the line driven back to **idle high**, immediately;
- the bit index and the shift register cleared, so the next frame starts at the start bit;
- \`busy\` cleared and \`ready\` raised, so the source is not left waiting forever;
- **no "transmit done" pulse** for a frame that never finished, or software will believe a byte it never sent went out.

Now look at the other end of the wire, because this is the part that surprises people. Suppose reset lands on data bit 5 of 0x41. The receiver aligned to the start bit long ago and is counting its own bit-times. It samples bits 5, 6 and 7 as 1 (the idle line), then samples the stop bit position: also 1, a perfectly legal stop bit. So the receiver reports a **successful byte** that never existed. A truncated frame is only detected when the abort happens to leave a 0 where the stop bit should be. That is why a link that must not lose or invent bytes carries an end-to-end check (a length, a checksum) above the UART.

So the test is not "reset once and see". It is: for every bit position 0 … 9, and for idle, assert reset, then check the line, the flags and the *next* frame. Eleven cases, one loop.`, {
      terms: [
        ['Meaningful reset state', 'A state the outside world can rely on: idle line, cleared counters, no false completion signal.'],
        ['Abort', 'Abandoning the frame in progress rather than finishing it after reset.'],
        ['Framing error', 'What a receiver reports when the stop-bit position samples 0 instead of 1: the frame did not end where it should.'],
        ['Done pulse', 'A one-cycle signal meaning "the byte has left". It must not fire for an aborted frame.'],
        ['Bit position', 'Which of the 10 frame bits is currently on the wire: 0 = start, 1…8 = data, 9 = stop. The state variable a reset test must sweep.'],
      ]
    }),
    q.goal('H', 'In the transmitter simulation below, pick the **refuse while busy** contract, write a byte, step the bit clock a few times, then press reset while the frame is still in progress.', W('uartbusy', { byte: 0x41, byte2: 0x0F }), s => s.policy === 'refuse' && s.resetMidFrame && !s.busy,
      'A mid-frame reset abandons the frame: the line goes back to idle high and the bit counter is cleared, so the next write starts a clean start bit. With the refuse contract, no byte is ever lost without the source being told.'),
    q.mc('H', 'A reset is asserted while a UART transmitter is on data bit 3 of a frame. Immediately afterwards, the line and the internal state should be…', ['line idle high, bit index and shift register cleared, busy low; the frame is abandoned', 'line held low until the frame would have finished, then idle', 'the frame continues, because a reset only affects the next byte', 'undefined until the next write'], 0, 'Reset aborts to a clean idle. A stale bit index would make the next frame start part-way through, and the receiver would see rubbish.'),
    q.tf('H', 'A test suite that asserts reset on a UART transmitter only while it is idle has verified the transmitter\'s reset behaviour.', false, 'Idle reset is the easy case: almost nothing has to be cleared. The bugs live mid-frame, where a bit index, a shift register, a busy flag and a done pulse are all live. H02 L3 asks for reset at every transmission position: 10 frame bits plus idle.'),
    q.num('H', 'A UART frame is 10 bit-times (start, 8 data, stop). To test reset at every position the frame can be in, plus the idle state, how many separate reset tests does that make?', 11, 'One per frame bit position (0 … 9) plus one from idle: 11. It is one loop over the position, not eleven hand-written tests.'),
    q.mc('H', 'Interview: a transmitter is reset on data bit 5 of a byte, so the line jumps to idle high for the rest of the frame. What does a normal UART receiver at the far end report?', ['A completed byte with wrong data: the remaining data bits sample as 1 and the stop-bit position also samples 1, so nothing looks wrong to it', 'A framing error, because the frame was cut short', 'Nothing: it detects the missing bits and waits', 'A parity error'], 0, 'The receiver counts bit-times from the start edge; it has no other way to know the frame was abandoned. Idle-high fills the remaining data bits with 1s and provides a legal stop bit. Only an end-to-end check above the UART catches this.'),
    q.info('H', 'What a queue can fix, and what it cannot', `Adding a buffer in front of the transmitter feels like it makes the busy problem go away. It does not; it changes *which* problem you have.

A UART at 115,200 baud with 10-bit frames carries **11,520 bytes per second**, one byte every 86.8 µs. Suppose software writes a burst of 64 bytes back to back and then goes quiet for 10 ms. During the burst the queue fills at the write rate and drains at one byte per 86.8 µs; over 10 ms the link can carry 115 bytes, so the burst is comfortably absorbed and the queue empties again. Sizing is that simple: **queue depth ≥ burst size − (bytes the link drains during the burst)**.

Now suppose software writes 20,000 bytes per second, for ever. The link carries 11,520. No queue of any depth fixes that: it fills at 8,480 bytes per second until it is full, and then you are back to the same four choices at the queue's edge. **A buffer converts a rate problem into a delay, and only if the average rate fits.** When it does not fit, the honest options are: slow the source (refuse), raise the baud rate, or declare and count the loss.

This is why the first question about any buffer is not "how deep?" but "what is the long-run rate?".`, {
      terms: [
        ['Burst', 'A short spell of arrivals faster than the long-run average rate.'],
        ['Drain rate', 'How fast the consumer removes items: 11,520 bytes/s for a 10-bit frame at 115,200 baud.'],
        ['Sustained overload', 'Average arrival rate above the drain rate. No finite buffer helps; something must give.'],
        ['Queue depth', 'How many items the buffer holds. Sized from burst size minus what drains during the burst.'],
      ]
    }),
    q.num('H', 'A UART sends 10-bit frames at 115,200 baud. How many bytes per second can it carry, at most?', 11520, '115,200 bits per second ÷ 10 bits per frame = 11,520 bytes per second. The start and stop bits cost 20% of the raw rate.'),
    q.num('H', 'A UART link drains 11,520 bytes per second. Software writes a burst of 64 bytes instantly and then nothing for a long time. Buffer entries needed so that no byte is refused or lost (the transmitter itself holds one byte)?', 63, 'The transmitter takes the first byte immediately; the other 63 must wait somewhere. Nothing drains during an instantaneous burst, so the queue needs 63 entries.'),
    q.mc('H', 'Interview: software writes 20,000 bytes per second, for ever, into a UART that carries 11,520 bytes per second. Which buffer depth solves it?', ['None: the average arrival rate exceeds the drain rate, so any finite buffer fills and the choice between refusing and dropping returns', '256 bytes', '4096 bytes, sized from the difference of the rates', 'Depth 1, if ready is registered'], 0, 'A buffer absorbs bursts, i.e. it trades depth for delay. It cannot create bandwidth. Fix the rate: slow the source, raise the baud, or declare the loss.'),
    q.code('H', 'Build a bit-time model of a transmitter with the **refuse while busy** contract and a reset.\n\n`solve(byte, second_byte, write_at, reset_at)` simulates 20 bit-times, numbered 0 to 19. A frame for `byte` is already starting at bit-time 0. A frame is the 10 levels: start bit 0, the 8 data bits **LSB first**, stop bit 1.\n\nAt each bit-time, in this order: (1) if the bit-time equals `reset_at`, the transmitter is reset and any frame in progress is abandoned; (2) if the bit-time equals `write_at`, a write of `second_byte` is attempted — it starts a new frame if the transmitter is idle, otherwise it is refused and counted; (3) the transmitter drives one level onto the line: the next bit of the frame in progress, or 1 (idle) if there is none. `write_at` or `reset_at` of −1 means it never happens.\n\nReturn `{"line": [20 levels], "refused": count, "completed": [bytes whose 10 bits all went out]}`.', {
      fn: 'solve',
      starter: 'def solve(byte, second_byte, write_at, reset_at):\n    def frame(b):\n        return [0] + [(b >> i) & 1 for i in range(8)] + [1]\n    line, refused, completed = [], 0, []\n    cur, idx, cur_byte = frame(byte), 0, byte     # a frame is already in progress at bit-time 0\n    for t in range(20):\n        # 1. reset  2. attempted write  3. drive one level\n        pass\n    return {"line": line, "refused": refused, "completed": completed}\n',
      tests: [
        { args: [0x41, 0x0F, -1, -1], expect: { line: [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], refused: 0, completed: [65] }, name: 'no write, no reset: one clean frame then idle' },
        { args: [0x41, 0x0F, -1, 3], expect: { line: [0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], refused: 0, completed: [] }, name: 'reset on frame bit 3: abandoned, line idle high, nothing completed' },
        { args: [0x41, 0x0F, 5, -1], expect: { line: [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], refused: 1, completed: [65] }, name: 'write while busy is refused, not merged into the frame' },
        { args: [0x41, 0x0F, 12, -1], expect: { line: [0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0], refused: 0, completed: [65] }, name: 'write after the frame ends starts a second frame, unfinished at bit-time 19' },
        { args: [0x41, 0x0F, 4, 4], expect: { line: [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1], refused: 0, completed: [15] }, name: 'reset then write in the same bit-time: the transmitter is idle by then, so the write is accepted' },
        { args: [0x00, 0xFF, -1, 0], expect: { line: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], refused: 0, completed: [] }, name: 'reset at bit-time 0: not even the start bit goes out' },
      ],
      gen: 'def gen():\n    for _ in range(30):\n        yield (random.randint(0, 255), random.randint(0, 255), random.choice([-1, -1, 0, 3, 5, 9, 10, 12, 15]), random.choice([-1, -1, -1, 0, 2, 4, 7, 11, 14]))',
      refCode: 'def ref(byte, second_byte, write_at, reset_at):\n    def frame(b):\n        return [0] + [(b >> i) & 1 for i in range(8)] + [1]\n    line, refused, completed = [], 0, []\n    cur, idx, cur_byte = frame(byte), 0, byte\n    for t in range(20):\n        if t == reset_at:\n            cur, idx = None, 0\n        if t == write_at:\n            if cur is None:\n                cur, idx, cur_byte = frame(second_byte), 0, second_byte\n            else:\n                refused += 1\n        if cur is None:\n            line.append(1)\n        else:\n            line.append(cur[idx]); idx += 1\n            if idx == 10:\n                completed.append(cur_byte); cur, idx = None, 0\n    return {"line": line, "refused": refused, "completed": completed}',
      solution: 'def solve(byte, second_byte, write_at, reset_at):\n    def frame(b):\n        return [0] + [(b >> i) & 1 for i in range(8)] + [1]\n    line, refused, completed = [], 0, []\n    cur, idx, cur_byte = frame(byte), 0, byte\n    for t in range(20):\n        if t == reset_at:\n            cur, idx = None, 0\n        if t == write_at:\n            if cur is None:\n                cur, idx, cur_byte = frame(second_byte), 0, second_byte\n            else:\n                refused += 1\n        if cur is None:\n            line.append(1)\n        else:\n            line.append(cur[idx])\n            idx += 1\n            if idx == 10:\n                completed.append(cur_byte)\n                cur, idx = None, 0\n    return {"line": line, "refused": refused, "completed": completed}'
    }, 'Three pieces of state say everything: the frame being driven, the index into it, and nothing else. Reset sets the frame to "none", which is exactly "line idle, counter cleared, not busy" — one assignment, because the state was designed to be resettable. The refusal is one branch: a write only takes effect when there is no frame. Note the "reset and write in the same bit-time" case: the order of the two rules is part of the contract, so the test pins it down rather than leaving it to whoever writes the RTL.'),
    q.code('H', 'A UART divides its clock down to the bit rate with an integer counter, so the actual bit rate is rarely exactly the one requested. Write `solve(clock_hz, baud)` returning `[divisor, error_percent]`: the divisor is `clock_hz / baud` rounded to the nearest whole number, and the error is |divisor × baud − clock_hz| / clock_hz × 100, rounded to 3 decimal places.', {
      fn: 'solve',
      starter: 'def solve(clock_hz, baud):\n    divisor = round(clock_hz / baud)\n    error = 0.0\n    return [divisor, round(error, 3)]\n',
      tests: [
        { args: [50000000, 115200], expect: [434, 0.006], name: '50 MHz / 115200 → 434.03, rounded to 434' },
        { args: [100000000, 9600], expect: [10417, 0.003] },
        { args: [48000000, 9600], expect: [5000, 0.0], name: 'exact division → zero error' },
        { args: [1843200, 115200], expect: [16, 0.0], name: 'the classic UART crystal: an exact multiple of 16 × 115200' },
      ],
      gen: 'def gen():\n    for _ in range(8):\n        yield (random.choice([12e6, 25e6, 50e6, 100e6]), random.choice([9600, 19200, 57600, 115200, 921600]))',
      refCode: 'def ref(clock_hz, baud):\n    d = round(clock_hz / baud)\n    return [d, round(abs(d * baud - clock_hz) / clock_hz * 100, 3)]',
      solution: 'def solve(clock_hz, baud):\n    divisor = round(clock_hz / baud)\n    error = abs(divisor * baud - clock_hz) / clock_hz * 100\n    return [divisor, round(error, 3)]'
    }, 'The counter can only hold whole cycles, so the achievable bit rate is clock/divisor and the requested one is usually between two achievable ones. Rounding to the nearest divisor halves the worst-case error compared with truncating. 0.006% is nothing; a divisor of 3 instead of 3.4 would be 13% and would lose every byte.'),

    // =====================================================================================================
    // ALGORITHMS: the cost of halving (A02 preview — the algorithm itself is Day 22)
    // =====================================================================================================
    q.info('A', 'Halving: why log n is so small', `You are looking for a name in a sorted list of a million. Reading from the top costs up to a million comparisons. Opening the book in the middle costs one comparison and tells you which **half** the name is in; the other half is gone for ever.

Count what that buys. Start with n candidates. After 1 probe at most n/2 remain, after 2 probes n/4, after k probes **n/2^k**. You are finished when one candidate is left, so you need k with n/2^k ≤ 1, that is **k ≥ log₂ n**. Not an estimate: it is what "halve repeatedly" means.

| n | probes if you scan | halvings to one candidate |
|---|---|---|
| 1,000 | 1,000 | 9 |
| 1,000,000 | 1,000,000 | 19 |
| 1,000,000,000 | 1,000,000,000 | 29 |

The numbers barely move because they count **doublings**, and doubling gets you to a billion in thirty steps. This is the cheapest big win in computing, and the reason sorted order is worth paying for: sort once, then every lookup is nearly free.

Day 22 writes the algorithm with its invariant and its edge cases. Today is the cost model, because you should be able to price a search before you write one.`, {
      terms: [
        ['Probe', 'One look at one element, and the comparison that follows from it.'],
        ['log₂ n', 'How many times n can be halved before one is left; equivalently how many doublings take you from 1 up to n. log₂ 1024 = 10.'],
        ['Candidate set', 'The part of the array the answer could still be in. Halving means each probe throws away half of it.'],
        ['Linear scan', 'Looking at every element in turn: n probes, no order required.'],
      ],
      widget: W('halving', { n: 1024 })
    }),
    q.num('A', 'A sorted array holds 1024 items. How many times can the candidate range be halved, 1024 → 512 → 256 → …, before a single candidate is left?', 10, '2¹⁰ = 1024, so ten halvings. Compare 1024 probes for a scan.'),
    q.num('A', 'log₂(1,000,000) is about what, to the nearest whole number?', 20, '2²⁰ = 1,048,576, just above a million, so log₂(10⁶) ≈ 19.93 ≈ 20. Handy pair to memorise: 2¹⁰ ≈ 10³, so 2²⁰ ≈ 10⁶ and 2³⁰ ≈ 10⁹.'),
    q.mc('A', 'Doubling the number of items in a sorted array adds how many probes to a halving search?', ['One', 'Twice as many', 'None', 'log₂ n more'], 0, 'log₂(2n) = log₂ n + 1. One extra probe removes the extra half. That "+1 per doubling" is the fingerprint of logarithmic cost: if you double the input and the work goes up by a constant amount, the cost is logarithmic.', { grid: true }),
    q.info('A', 'The counting bound: n + 1 answers need ⌈log₂(n+1)⌉ probes', `Here is the same result reached from the other side, and it is the argument an interviewer wants.

Each probe gives you one **yes/no** answer. After p probes you have received p bits, which can distinguish at most **2^p** different outcomes. So if a task has M possible answers, no method built from yes/no comparisons can always finish in fewer than log₂ M probes.

Searching a sorted array of n items for "the first position holding a value ≥ x" has **n + 1** possible answers: position 0, 1, …, n−1, or "past the end" when every value is smaller. So you need p with 2^p ≥ n + 1, i.e. **p ≥ log₂(n + 1)**, and halving achieves exactly ⌈log₂(n + 1)⌉. It is optimal, not merely good.

That is where the small mismatch comes from: 1024 items take **10** halvings to reach one candidate, but **11** probes, because after narrowing to a single position you still need one comparison to decide between that position and "past the end". Being able to say which of the two you mean — halvings of the range, or comparisons performed — is what separates a memorised "log n" from an owned one.

The bound also tells you when halving is impossible: if a probe cannot rule out half the candidates, it does not deliver a whole bit, and the count does not apply.`, {
      terms: [
        ['Yes/no probe', 'A comparison with two outcomes. p of them carry p bits and separate at most 2^p cases.'],
        ['Information bound', 'A lower bound on work that comes from counting possible answers, not from any particular algorithm.'],
        ['⌈x⌉ (ceiling)', 'Round up to the next whole number: ⌈log₂ 1025⌉ = 11.'],
        ['Optimal', 'No method of the same kind can do better in the worst case. Halving hits the counting bound exactly.'],
      ],
      widget: W('bigo', { n: 1024 })
    }),
    q.num('A', 'A sorted array holds 4096 items. Searching it for the first position with a value ≥ x has 4097 possible answers (positions 0…4095, or "past the end"). Worst-case number of yes/no probes, from 2^p ≥ 4097?', 13, '2¹² = 4096 < 4097 ≤ 8192 = 2¹³, so 13 probes. Twelve halvings reduce the range to one position; the thirteenth probe decides between that position and "past the end".'),
    q.num('A', 'Guessing a whole number between 1 and 1000 with "higher or lower?" questions: worst-case number of questions needed, from 2^p ≥ 1000?', 10, '2⁹ = 512 < 1000 ≤ 1024 = 2¹⁰. Ten questions distinguish 1024 possibilities, which is enough; nine cannot.'),
    q.mc('A', 'Halving only works when one probe can rule out half the candidates. Which property makes that valid on a sorted array?', ['The question "is this element ≥ x?" answers no, no, …, yes, yes along the array: it flips at most once, so one answer settles a whole side', 'The elements are distinct', 'The array length is a power of two', 'The elements are integers'], 0, 'A question whose answer changes at most once along the order is what lets a single probe eliminate a side. On an unsorted array the answer at one position says nothing about any other, so no half can be discarded and you are back to n probes.'),
    q.mc('A', 'Interview: a sorted **linked list** of 1,000,000 nodes. What does a halving search cost there, and why?', ['About n work, because reaching the middle node means walking from the head: halving needs constant-time access to any position', 'log₂ n, the same as an array', 'It is impossible on any linked structure', 'n log n, because the list must be sorted first'], 0, 'The log n count assumes a probe is cheap. In a linked list each probe costs a walk, so the total is O(n) and a plain scan is simpler. Random access is the hidden requirement; a balanced tree is the linked answer.'),
    q.mc('A', 'Interview: for an array of 8 sorted integers, a plain linear scan usually beats a halving search in real code. Is that a contradiction of the log n analysis?', ['No: the analysis compares growth rates, not small-n running times, and a scan has smaller constants and predictable branches', 'Yes: log n is smaller than n for every n', 'No, because 8 is not a power of two', 'Yes: the analysis is wrong for small arrays'], 0, 'log₂ 8 = 3 versus 8 probes, but scanning 8 adjacent values reads one cache line with a branch the processor predicts, while halving jumps around memory and mispredicts. Growth rates decide at large n; constants decide at small n. Real libraries switch to a scan below a threshold.'),
    q.code('A', 'Write `solve(ns)`: for each whole number n in the list `ns` (each n ≥ 1), count how many times n can be halved with integer division (n = n // 2) before it reaches 1. Return the list of counts, in the same order. Example: 1000 → 500 → 250 → 125 → 62 → 31 → 15 → 7 → 3 → 1, so nine halvings. `solve([])` is `[]`. The speed test passes 20,000 values up to a billion, so the obvious slow version — counting down one at a time — will not finish.', {
      fn: 'solve',
      starter: 'def solve(ns):\n    out = []\n    for n in ns:\n        steps = 0\n        # halve until one candidate is left\n        out.append(steps)\n    return out\n',
      tests: [
        { args: [[1]], expect: [0], name: 'already one candidate: no halving needed' },
        { args: [[2]], expect: [1], name: 'two candidates: one halving' },
        { args: [[1024]], expect: [10], name: 'an exact power of two' },
        { args: [[1000]], expect: [9], name: 'not a power of two: 1000 → 500 → 250 → 125 → 62 → 31 → 15 → 7 → 3 → 1' },
        { args: [[]], expect: [], name: 'empty list' },
        { args: [[3, 4, 5, 6, 7, 8]], expect: [1, 2, 2, 2, 2, 3], name: 'every count is floor(log2 n)' },
        { args: [[10 ** 9]], expect: [29], name: 'a billion: 2^29 = 536,870,912 ≤ 10^9 < 2^30' },
      ],
      gen: 'def gen():\n    for _ in range(20):\n        yield ([random.randint(1, 10 ** 9) for _ in range(random.randint(0, 12))],)',
      refCode: 'def ref(ns):\n    return [n.bit_length() - 1 for n in ns]',
      speed: { gen: 'def gen():\n    return [[random.randint(1, 10 ** 9) for _ in range(20000)]]', budgetMs: 2000, label: '20,000 values up to a billion (about 30 halvings each)' },
      solution: 'def solve(ns):\n    out = []\n    for n in ns:\n        steps = 0\n        while n > 1:\n            n //= 2\n            steps += 1\n        out.append(steps)\n    return out'
    }, 'The count is ⌊log₂ n⌋: the inner loop runs about 30 times even for a billion, so 20,000 values cost about 600,000 steps in total. Subtracting one at a time would cost 10⁹ steps for a single value. The hidden reference uses Python\'s `n.bit_length() - 1`, which is the same quantity read straight off the binary representation — a good reminder that ⌊log₂ n⌋ is just "how many bits n needs, minus one".'),

    // =====================================================================================================
    // MATHS: at least one, expected counts, and the rare-event approximation (M05 L2)
    // =====================================================================================================
    q.info('M', 'The chance that nothing goes wrong', `A link drops each packet independently with probability **p = 0.01**. You send 100 packets. What is the chance that **at least one** is dropped?

Attacking "at least one" head-on is painful: the event is "packet 1 drops, or packet 2 drops, or …", and those can happen together, so you cannot simply add. Turn it round. "At least one drop" fails exactly when **every** packet survives, and "every" is an *and*, which independence turns into a product:

P(no drop) = 0.99 × 0.99 × … × 0.99 = 0.99¹⁰⁰ = **0.366**.

So P(at least one) = 1 − 0.366 = **0.634**. In general, for n independent trials each failing with probability p:

**P(at least one) = 1 − (1 − p)ⁿ**

The move is worth naming because you will use it constantly: *at least one* is the complement of *none*, and *none* is the only event of that family with a one-line probability. Whenever a question says "at least one", write down "none" first.`, {
      terms: [
        ['At least one', 'One or more. Its complement is "none", which is a single intersection of events.'],
        ['Complement rule', 'P(A) = 1 − P(not A). Used whenever "not A" is easier to count.'],
        ['Independent trials', 'Each packet\'s fate leaves the others\' chances unchanged, so probabilities multiply.'],
        ['(1 − p)ⁿ', 'The probability that n independent trials all avoid an event of probability p.'],
      ],
      widget: W('atleastone', { p: 0.01, n: 100 })
    }),
    q.num('M', 'Packets drop independently with probability 0.01. P(at least one drop in 100 packets), to 3 decimal places?', 0.634, '1 − 0.99¹⁰⁰ = 1 − 0.366 = 0.634.', { tol: 0.002 }),
    q.num('M', 'Packets drop independently with probability 0.01. P(no drop at all in 2 packets), to 4 decimal places?', 0.9801, '0.99 × 0.99 = 0.9801. So P(at least one drop in 2) = 0.0199, very close to 2 × 0.01 while np is still small.', { tol: 0.0002 }),
    q.num('M', 'Packets drop independently with probability 0.01. P(at least one drop in 10 packets), to 3 decimal places?', 0.096, '1 − 0.99¹⁰ = 1 − 0.9044 = 0.0956.', { tol: 0.002 }),
    q.num('M', 'A fair six-sided die is rolled 4 times. P(at least one six), to 3 decimal places?', 0.518, '1 − (5/6)⁴ = 1 − 625/1296 = 671/1296 = 0.5177. Just above a half — the old gambler\'s bet.', { tol: 0.003 }),
    q.info('M', 'Why n·p is not that probability (and what it is)', `The tempting shortcut for 100 packets at p = 0.01 is 100 × 0.01 = 1, i.e. "certain". It is wrong, and it is worth knowing exactly *how* it is wrong, because n·p is a real quantity — just not that one.

**It is an upper bound.** Adding the probabilities of the 100 individual drop events counts every outcome with two drops twice, every outcome with three drops three times, and so on. Over-counting can only inflate, so P(at least one) ≤ n·p, always. When n·p ≥ 1 the bound says nothing at all, which is the giveaway: a probability cannot be 1.5, so a formula that returns 1.5 for 150 packets was never a probability.

**It is the expected count.** Give packet i an indicator: 1 if it drops, 0 if not. Its average value is p. The number of drops is the sum of the 100 indicators, and averages of sums add, so the expected number of drops is 100 × 0.01 = **1**. This needs no independence at all.

So for our link: the average number of drops is 1, and the chance of seeing at least one is 0.634. Both are true. The gap exists because the runs that drop 2 or 3 packets pull the average up while contributing nothing extra to "at least one".`, {
      terms: [
        ['Union bound', 'P(A₁ or … or Aₙ) ≤ P(A₁) + … + P(Aₙ). Equality only when the events cannot overlap.'],
        ['Indicator', 'A variable that is 1 when an event happens and 0 otherwise. Its average is the event\'s probability.'],
        ['Expected count', 'The long-run average number of occurrences: n·p for n trials. Needs no independence.'],
        ['Over-counting', 'Adding probabilities of overlapping events counts shared outcomes more than once.'],
      ]
    }),
    q.mc('M', 'Packets drop independently with probability 0.01. Why is 100 × 0.01 = 1 not the probability that at least one of 100 packets drops?', ['Adding the 100 individual drop probabilities counts outcomes with several drops more than once; the sum is only an upper bound, and it would exceed 1 for 150 packets', 'Because 0.01 is too small for the formula to apply', 'Because the packets are not really independent', 'It is the probability; 0.634 is the approximation'], 0, 'n·p over-counts overlaps, so it can only be an upper bound, and it fails the basic test that a probability lies in [0, 1]. The exact answer is 1 − 0.99¹⁰⁰ = 0.634.'),
    q.num('M', 'Packets drop independently with probability 0.01. Expected **number** of drops in 100 packets?', 1, 'Each packet contributes an indicator with average 0.01, and averages add: 100 × 0.01 = 1. Multiplying is legitimate here; it was not legitimate for the probability.'),
    q.tf('M', 'For n independent trials each failing with probability p, the value n·p is always at least as large as P(at least one failure).', true, 'The union bound: P(at least one) = 1 − (1−p)ⁿ ≤ np. They are close when np is small (100 packets at p = 0.0001 gives 0.00995 versus 0.01) and far apart when np approaches 1.'),
    q.info('M', 'The rule of thumb, and designing to a target', `Two things make this formula usable without a calculator.

**The approximation.** Write (1 − p)ⁿ = e^(n·ln(1−p)). For small p, ln(1 − p) ≈ −p, so

**P(at least one) ≈ 1 − e^(−n·p)**

Only the product n·p matters. At n·p = 1 that is 1 − 1/e = **0.632**, against the exact 0.634 — and it stays that close for any (n, p) with the same product and small p. At n·p = 0.01 it gives 0.00995, which rounds to n·p: the union bound is nearly tight when n·p ≪ 1. At n·p = 10 it gives 0.99995: effectively certain.

**Designing backwards.** Engineering usually asks the inverse: how many trials until the risk reaches a target T? Solve 1 − (1−p)ⁿ = T:

n = ln(1 − T) / ln(1 − p)

With p = 0.01 and T = 0.5: n = ln 0.5 / ln 0.99 = (−0.6931)/(−0.01005) = 68.97, so by the **69th** packet a drop is more likely than not. Notice ln 2 / p ≈ 0.693/p is the general answer for "50% chance": the half-life of a rare event.`, {
      terms: [
        ['Rare-event approximation', '1 − (1 − p)ⁿ ≈ 1 − e^(−np), accurate when p is small; only the product np matters.'],
        ['e', '2.71828…: here it appears because (1 − 1/n)ⁿ → 1/e as n grows.'],
        ['Design target', 'The largest acceptable probability of failure. Invert the formula to get the n or p that meets it.'],
        ['0.693/p', 'The number of trials at which a rare event first becomes more likely than not (from ln 2).'],
      ]
    }),
    q.num('M', 'Trials are independent and each succeeds with probability p, with n·p = 1 and p small. Use P(at least one success) ≈ 1 − e^(−n·p) to estimate the chance of at least one success, to 3 decimal places.', 0.632, '1 − e⁻¹ = 1 − 0.3679 = 0.632. For p = 0.01 and n = 100 the exact answer is 0.634; the approximation depends only on the product n·p.', { tol: 0.003 }),
    q.num('M', 'Exam-style: packets drop independently with probability 0.01. How many packets must be sent before the probability of at least one drop first reaches 0.5? Use n = ln(0.5)/ln(0.99) and round up.', 69, 'ln 0.5 = −0.6931, ln 0.99 = −0.01005, so n = 68.97 → 69 packets. The rule of thumb 0.693/p = 69.3 gives the same answer.'),
    q.num('M', 'Exam-style: a link must have at most a 1% chance of losing at least one packet in a run of 1000 independent packets. Largest allowed per-packet drop probability, to 2 significant figures? (Use p ≈ −ln(0.99)/1000.)', 1.0e-5, '(1−p)¹⁰⁰⁰ ≥ 0.99 → 1000·ln(1−p) ≥ ln 0.99 → p ≈ 0.01005/1000 = 1.005 × 10⁻⁵. Roughly: the target 0.01 divided by 1000, because np ≈ target when np is tiny.', { tol: 1e-6 }),
    q.mc('M', 'Interview: 500 servers each fail on a given day independently with probability 0.002. Which is larger — the expected number of failures that day, or the probability that at least one fails?', ['The expected number, 1.0, against a probability of 1 − 0.998⁵⁰⁰ ≈ 1 − e⁻¹ ≈ 0.63', 'The probability, because it counts every failure', 'They are equal, since both are np', 'Not comparable: one is a count, so no comparison is possible'], 0, 'np = 1 exactly; the probability is ≈ 0.63. The days with two or three failures raise the average without changing "at least one". Comparing a count with a probability is fine here — the point of the question is that they are different numbers people confuse.'),
    q.mc('M', 'Interview: a link drops each packet independently with probability 10⁻⁶. Estimate the chance that at least one of 10 million packets is dropped, without a calculator.', ['n·p = 10, so 1 − e⁻¹⁰ ≈ 0.99995: a drop is essentially certain', 'n·p = 10, so the probability is 10', 'About 10⁻⁶, since each packet is very reliable', 'About 0.5, because rare events are unpredictable'], 0, 'Only the product matters: np = 10⁷ × 10⁻⁶ = 10. Then 1 − e⁻¹⁰ and e⁻¹⁰ ≈ 4.5 × 10⁻⁵. Per-packet reliability means nothing until you multiply by how many packets you send.'),
    q.mc('M', 'Interview: "Each of 50 packets drops with probability 0.02, so n·p = 1 and a drop is certain." Where does the argument break, and what is the true probability?', ['n·p is an expected count and an upper bound, not a probability; the true value is 1 − 0.98⁵⁰ = 0.636', 'Nowhere: n·p = 1 does mean certainty', 'The packets are not independent, so nothing can be said', 'n·p should have been 50/0.02'], 0, 'Same structure as the 100-at-0.01 case, and the same answer to three figures, because only the product np matters when p is small: 1 − e⁻¹ ≈ 0.632.'),

    // =====================================================================================================
    // DEGREE: inductors and RL transients (EEEN11101, E01)
    // =====================================================================================================
    q.info('E', 'The inductor: where v = L·di/dt comes from', `A capacitor stores energy by separating charge in an electric field. An **inductor** — a coil of wire — stores energy in a **magnetic field**. Current through the coil makes a magnetic field through its middle; more turns and more current mean more field.

Two pieces of physics turn that into a circuit law. First, the amount of magnetic field threading the coil is proportional to the current in it: call the total **flux linkage** λ, then λ = **L**·i. That equation *defines* the inductance L: it is how much field this particular coil produces per amp. Second, a changing magnetic field through a loop of wire creates a voltage around that loop, and the voltage opposes the change that caused it. Put them together:

**v = dλ/dt = L·di/dt**

Read it as a sentence: *the voltage across a coil is proportional to how fast its current is changing.* Steady current, no voltage. Fast change, big voltage. The unit of L is the **henry** (H): 1 H needs 1 volt to change its current by 1 amp per second.

The picture to keep is **inertia**. Current is like velocity, L like mass, voltage like force: it takes a push to change how fast something is already moving, and the energy stored is ½Li² exactly as kinetic energy is ½mv².`, {
      terms: [
        ['Inductor', 'A coil that stores energy in the magnetic field created by its own current.'],
        ['Inductance L (henry, H)', 'Flux linkage per amp; equivalently the volts needed per amp-per-second of change. 1 H = 1 V·s/A.'],
        ['Flux linkage λ', 'How much magnetic field threads the coil, counting every turn. λ = L·i for a linear inductor.'],
        ['Opposing the change', 'The induced voltage always acts against the change in current that produced it, which is why an inductor resists sudden changes.'],
        ['Stored energy', '½Li² joules, held in the magnetic field. The capacitor\'s counterpart is ½Cv².'],
      ]
    }),
    q.num('E', 'The current through a 0.5 H inductor is increasing at a steady 20 A/s. Voltage across it, in volts?', 10, 'v = L·di/dt = 0.5 × 20 = 10 V.', { unit: 'V' }),
    q.num('E', 'The current through a 2 H inductor ramps at a constant rate from 0 to 3 A in 0.1 s. Voltage across it during the ramp, in volts?', 60, 'di/dt = 3/0.1 = 30 A/s, so v = 2 × 30 = 60 V. A constant ramp gives a constant voltage.', { unit: 'V' }),
    q.tf('E', 'An ideal inductor carrying a perfectly constant current has zero volts across it.', true, 'v = L·di/dt and di/dt = 0. To a steady current an ideal inductor is a plain piece of wire; all its interesting behaviour is in the changes.'),
    q.num('E', 'A 0.1 H inductor carries a steady 0.5 A. Energy stored in its magnetic field, in millijoules?', 12.5, '½Li² = ½ × 0.1 × 0.25 = 0.0125 J = 12.5 mJ.', { unit: 'mJ' }),
    q.info('E', 'Current cannot jump — and the two limits that follow', `Suppose the current through an inductor tried to jump from 0 to 1 A instantly. Then di/dt would be infinite, so v = L·di/dt would be infinite, and the power v·i would be infinite too. Nothing supplies that, so it does not happen: **the current through an inductor is continuous**. Whatever it was an instant before a switch flips, it is that same value an instant after. (The same argument on a capacitor says its *voltage* cannot jump.)

Two consequences do most of the work in problems:

- **At t = 0⁺**, just after switching on a circuit that was off, the inductor's current is still 0. An element carrying zero current, whatever the voltage across it, behaves at that instant like an **open circuit**.
- **At steady state**, when nothing is changing any more, di/dt = 0 so v = 0. An element with no voltage across it behaves like a **short circuit** — a plain wire.

The capacitor is the mirror image: a short at t = 0⁺ (its voltage is stuck at its old value, and if that was 0 it looks like a wire), an open circuit at steady state. Learning them as a pair costs half as much as learning them separately, and the duality runs all the way through: i ↔ v, C ↔ L, ½Cv² ↔ ½Li², τ = RC ↔ τ = L/R.`, {
      terms: [
        ['Continuity of inductor current', 'i(0⁺) = i(0⁻). A jump would demand infinite voltage and infinite power.'],
        ['t = 0⁺', 'The instant just after a switch operates, when the circuit has changed but nothing has moved yet.'],
        ['Steady state', 'Long after switching, when all currents and voltages have stopped changing.'],
        ['Duality', 'Capacitor and inductor obey the same equations with current and voltage swapped.'],
      ]
    }),
    q.mc('E', 'A switch connects a 5 V source to a series resistor and inductor that were previously carrying no current. At the instant just after the switch closes, the inductor behaves like…', ['an open circuit: the current is still zero, because it cannot jump', 'a short circuit', 'a resistor of the same numerical value as L', 'a 5 V source'], 0, 'Continuity fixes i(0⁺) = 0. Zero current with a voltage across it is exactly what an open circuit does. All 5 V appears across the inductor at that instant.'),
    q.mc('E', 'A resistor and an inductor are in series across a DC supply and everything has settled. What does the inductor do to the circuit in that steady state?', ['Nothing: with di/dt = 0 it has zero volts across it and acts as a plain wire, so the current is just V/R', 'It blocks the current entirely', 'It halves the current', 'It stores charge, like a capacitor'], 0, 'Steady current means no changing field, so no induced voltage. All the supply voltage is dropped across the resistor.'),
    q.match('E', 'Match each inductor fact to the capacitor fact that mirrors it.', [['Its voltage is set by how fast its current changes', 'Its current is set by how fast its voltage changes'], ['Its current cannot change instantly', 'Its voltage cannot change instantly'], ['It stores half times inductance times current squared', 'It stores half times capacitance times voltage squared'], ['Its time constant is inductance divided by resistance', 'Its time constant is resistance times capacitance']], 'Swap current for voltage and L for C and every inductor statement becomes the matching capacitor statement. The two components are the same idea told with the roles exchanged.'),
    q.info('E', 'The RL step response, derived', `Take a supply V switched onto a resistor R in series with an inductor L, all initially at rest. Kirchhoff's voltage law around the loop, with the same current i through both:

**V = i·R + L·di/dt**

That is a first-order differential equation of exactly the shape you solved on Day 11. Put it in standard form by dividing by R:

(L/R)·di/dt + i = V/R

The coefficient of di/dt is the **time constant**, τ = **L/R**. Check its units: henry/ohm = (V·s/A)/(V/A) = seconds. ✓ The final value is i(∞) = V/R, because at steady state di/dt = 0. With i(0) = 0 the solution is

**i(t) = (V/R)·(1 − e^(−t/τ))**

Substituting it back satisfies both the equation and i(0) = 0, which is the only check that counts.

Read the shape. The initial slope is di/dt(0) = V/L, so a bigger L means a slower start — the inertia again. After one τ the current has covered **63.2%** of its final value, after 2τ **86.5%**, after 5τ **99.3%**: "settled" in practice. And note what τ = L/R says: a *larger* resistance makes an RL circuit faster, the opposite of RC, because the resistor is what forces the current to stop changing.`, {
      terms: [
        ['Time constant τ', 'L/R seconds for an RL circuit; the time to cover 63.2% of the remaining gap to the final value.'],
        ['Final value V/R', 'The steady current, once the inductor has stopped opposing anything.'],
        ['Initial slope V/L', 'How fast the current starts to rise: all of V is across the inductor at t = 0.'],
        ['5τ rule', 'After five time constants the response is within 0.7% of its final value; usually called settled.'],
      ],
      widget: W('rl', { R: 10, L: 0.1, V: 5 })
    }),
    q.num('E', 'A 5 V supply is switched onto a 10 Ω resistor in series with a 0.1 H inductor. Time constant, in milliseconds?', 10, 'τ = L/R = 0.1/10 = 0.01 s = 10 ms.', { unit: 'ms' }),
    q.num('E', 'A 5 V supply is switched onto a 10 Ω resistor in series with a 0.1 H inductor. Final (steady-state) current, in amperes?', 0.5, 'At steady state the inductor is a wire, so i = V/R = 5/10 = 0.5 A.', { unit: 'A' }),
    q.num('E', 'In any RL circuit switched on from rest, what percentage of its final current has been reached after exactly one time constant? (1 decimal place)', 63.2, '1 − e⁻¹ = 0.632, so 63.2%. The same fraction as an RC circuit charging, for the same reason: the exponent is −t/τ in both.', { unit: '%', tol: 0.2 }),
    q.num('E', 'A 24 V supply is switched onto a 12 Ω resistor in series with a 60 mH inductor, initially carrying no current. Rate of change of current at the instant of switching, in A/s?', 400, 'At t = 0⁺ the current is 0, so no volts are dropped across the resistor and all 24 V is across the inductor: di/dt = V/L = 24/0.06 = 400 A/s.', { unit: 'A/s' }),
    q.num('E', 'Exam-style: a 12 V supply is switched onto a 6 Ω resistor in series with a 0.3 H inductor, initially at rest. Time for the current to reach 1.5 A, in milliseconds (1 d.p.)?', 69.3, 'Final current 12/6 = 2 A and τ = L/R = 0.3/6 = 50 ms. Set 2(1 − e^(−t/τ)) = 1.5 → e^(−t/τ) = 0.25 → t = τ·ln 4 = 50 × 1.386 = 69.3 ms.', { unit: 'ms', tol: 0.3 }),
    q.num('E', 'Exam-style: a relay coil of resistance 100 Ω and inductance 50 mH is switched onto a 24 V supply. (a) Steady-state coil current, in milliamperes?', 240, 'τ does not matter for the final value: i(∞) = V/R = 24/100 = 0.24 A = 240 mA.', { unit: 'mA' }),
    q.num('E', 'Exam-style: a relay coil of resistance 100 Ω and inductance 50 mH is switched onto a 24 V supply. (b) Time for the coil current to reach 90% of its final value, in milliseconds (2 d.p.)?', 1.15, 'τ = L/R = 0.05/100 = 0.5 ms. 1 − e^(−t/τ) = 0.9 → t = τ·ln 10 = 0.5 × 2.303 = 1.15 ms. The 90% time is always 2.303τ, for RL and RC alike.', { unit: 'ms', tol: 0.03 }),
    q.num('E', 'Exam-style: a 12 V supply feeds a 6 Ω resistor in series with a 0.3 H inductor, left switched on until everything has settled. Energy stored in the inductor at that point, in joules (2 d.p.)?', 0.6, 'Steady current i = 12/6 = 2 A, so W = ½Li² = ½ × 0.3 × 4 = 0.6 J. That energy has to go somewhere when the circuit is broken — the next card.', { unit: 'J', tol: 0.02 }),
    q.info('E', 'Switching it off: the spike, and the flyback diode', `Closing a switch onto an inductor is gentle: the current rises smoothly. **Opening** one is violent.

The inductor is carrying current I and holding ½LI² joules. The switch tries to force the current to zero in the microsecond its contacts take to part. The inductor answers with v = L·di/dt, and with di/dt enormous and negative, the voltage reverses and rises to whatever it takes to keep the current flowing: 0.1 H interrupted from 0.5 A in 1 µs would demand 0.1 × 0.5/10⁻⁶ = **50,000 V**. In reality the air between the contacts breaks down first and the current keeps flowing as a **spark**, which is precisely how a petrol engine's ignition coil is built to work — and precisely what destroys a transistor switching a relay.

The fix is to give the current a path it can take. Put a **flyback diode** across the coil, pointing so it is reverse-biased (blocking) in normal operation. The instant the coil's voltage reverses, the diode conducts, and the trapped current circulates through the coil and diode, decaying with τ = L/R of that loop until the ½LI² has become heat. The switch never sees more than about a volt.

The rule generalises: whenever a design interrupts current in an inductive load — relays, solenoids, motors, even long cables — ask where the stored energy goes. It always goes somewhere.`, {
      terms: [
        ['Inductive kick / spike', 'The large reverse voltage produced when an inductor\'s current is interrupted quickly.'],
        ['Flyback diode', 'A diode across an inductive load, blocking in normal operation, that gives the trapped current a path when the switch opens.'],
        ['Freewheeling', 'The trapped current circulating through the coil and diode while its energy decays into heat.'],
        ['Arcing', 'Air breaking down across opening switch contacts so the current continues as a spark. Erodes contacts and radiates interference.'],
      ]
    }),
    q.num('E', 'A 0.1 H inductor carrying 0.5 A has its current interrupted in 1 µs at a constant rate. Magnitude of the voltage this demands across the inductor, in volts?', 50000, '|v| = L·|di/dt| = 0.1 × (0.5/10⁻⁶) = 50,000 V. Real circuits never reach it: something breaks down or arcs first, which is the whole problem.', { unit: 'V' }),
    q.mc('E', 'Why is a diode fitted across a relay coil, reverse-biased so it does not conduct while the relay is energised?', ['When the switch opens, the coil\'s voltage reverses and the diode conducts, giving the trapped current a path to decay through instead of arcing across the switch', 'It rectifies the coil current', 'It makes the relay switch faster', 'It protects the coil from too much current while energised'], 0, 'The coil is holding ½LI² and will produce whatever voltage it takes to keep its current flowing. The diode offers a harmless loop; without it the energy is dumped into the switch or transistor.'),
    q.num('E', 'Exam-style: an inductor carrying 2 A has its circuit opened, and the only path left for its current is a 1 kΩ bleeder resistor across the inductor. Voltage across that resistor at the instant the circuit opens, in volts?', 2000, 'Inductor current is continuous, so 2 A must flow the moment after switching, and the only path is the 1 kΩ resistor: v = 2 × 1000 = 2000 V. Big bleeder resistors mean fast decay but huge initial voltage; that trade-off is why a diode (about 1 V) is preferred.', { unit: 'V' }),
    q.mc('E', 'Exam-style: two identical RL circuits are switched on from rest, differing only in resistance: circuit A has R = 10 Ω, circuit B has R = 100 Ω, both with L = 0.1 H. Which reaches its own final current faster, and why?', ['B, because τ = L/R is ten times smaller; its final current is also ten times smaller', 'A, because a smaller resistance lets current build up faster', 'They settle in the same time, since L is the same', 'B, because its final current is larger'], 0, 'τ = L/R = 10 ms for A and 1 ms for B. More resistance means a smaller final current reached sooner. This is the opposite of RC, where more resistance means slower.'),
    ...genius(q, 20),
  ]
};
