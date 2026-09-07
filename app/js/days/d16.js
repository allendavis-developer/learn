import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(16);

const packetFSM = {
  states: ['IDLE', 'HEADER', 'PAYLOAD', 'DROP'],
  inputs: ['start-of-frame', 'header ok', 'bad length', 'last byte', 'reset'],
  transitions: {
    IDLE: { 'start-of-frame': 'HEADER', reset: 'IDLE' },
    HEADER: { 'header ok': 'PAYLOAD', 'bad length': 'DROP', reset: 'IDLE' },
    PAYLOAD: { 'last byte': 'IDLE', 'bad length': 'DROP', reset: 'IDLE' },
    DROP: { 'last byte': 'IDLE', reset: 'IDLE' },
  },
  init: 'IDLE'
};

export default {
  title: 'State machines, Git, linearity, op-amps',
  emoji: '🔁',
  strands: ['H', 'S', 'M', 'E'],
  summary: 'Uni starts today. **Hardware** (H02 L2): what "state" actually is — the smallest summary of the past that still decides the future — the four-state packet controller, why the state table is written before the HDL, Moore vs Mealy output timing, and one-hot vs binary encoding. **Code** (S03 L1): Git as a graph of snapshots, why a commit records its parent, the three places a change lives, why a branch is just a movable pointer, and a history-reasoning exercise. **Maths** (M06 L1): what expectation is, indicator variables, and linearity proved from the definition — then used on overlapping adjacent pairs. **Degree** (EEEN11101 / E01 L4): where the two ideal op-amp rules come from, the inverting and non-inverting amplifiers derived from them, the follower, the differential amplifier and the rails.',
  takeaway: 'State = the summary of the past you still need. Fill in every cell of the state table before writing HDL; a missing cell becomes accidental storage. Moore output = f(state), one cycle late but clean; Mealy = f(state, input), same cycle but it inherits the input\'s glitches. A commit is a snapshot plus a pointer to its parent; a branch is a movable pointer, which is why branching is free. E[ΣXᵢ] = ΣE[Xᵢ] always — overlap and dependence are irrelevant — so adjacent equal pairs in 10 flips average 9 × ½ = 4.5. Op-amp: huge gain + negative feedback ⇒ v₊ = v₋ and no input current; inverting −Rf/Rin, non-inverting 1 + Rf/Rin, and the output can never leave the rails.',
  steps: [
    // =====================================================================================================
    // HARDWARE: finite-state machines (H02 L2)
    // =====================================================================================================
    q.info('H', 'State is the summary of the past you still need', `A block of plain logic sees only what is on its inputs **right now**. Hand it the byte 0x04 and ask "is that a length or a payload byte?" It cannot answer. The answer depends on what came before.

So the circuit has to keep something. Not the whole history — you do not need every byte since power-up — only enough of it to decide what to do next. That summary is the **state**.

For a receiver that reads packets, the summary is tiny: *waiting for a packet*, *reading the header*, *reading the payload*, *throwing away a bad packet*. Four situations. Everything else about the past is irrelevant to the next decision, so it does not need to be remembered.

A machine with a finite list of such situations is a **finite-state machine**, an FSM. It is made of two pieces you already have from Day 15: a **register** holding which state you are in, and combinational logic that computes the **next state** from (current state, inputs). The clock decides when the next state becomes the current one.

The design skill is choosing the states. Too few and you cannot tell two situations apart; too many and you are remembering things that never change a decision.`, {
      terms: [
        ['State', 'The smallest summary of everything that has already happened which still affects what the machine does next.'],
        ['Finite-state machine (FSM)', 'A circuit with a finite list of states, a rule for moving between them, and outputs that depend on the state.'],
        ['State register', 'The flip-flops that hold which state you are in. It changes only at a clock edge.'],
        ['Next-state logic', 'Combinational logic computing the next state from (state, inputs). It runs continuously; the edge captures its answer.'],
        ['Transition', 'One rule: "in state S with input X, go to state T".'],
      ]
    }),
    q.info('H', 'Write the state table before the HDL', `The four-state packet controller, as English first:

- **IDLE**: waiting. A start-of-frame takes you to **HEADER**.
- **HEADER**: reading the length and type. Header valid → **PAYLOAD**; malformed length → **DROP**.
- **PAYLOAD**: counting bytes. Last byte → **IDLE**; a bad length discovered late → **DROP**.
- **DROP**: swallow the rest of the bad packet so the next one starts clean. Last byte → **IDLE**.
- **Reset**, from any state → IDLE.

Now the handbook's rule: **fill in a table with one row per state and one column per input, before you write a line of HDL.** Every cell is a decision you make on purpose.

Why it matters so much: in HDL, a case you never mention does not mean "nothing happens". A signal that is not assigned on some path has to **keep its old value**, and keeping a value is storage. The tool builds storage you never drew (Day 18's accidental latch), or leaves a state you can enter and never leave. Neither shows up in the branches you happened to test.

The table is also your test plan: one test per cell, plus reset from every state.`, {
      terms: [
        ['State table', 'A grid of (state, input) → next state, with every cell filled in deliberately.'],
        ['Start of frame', 'The signal or byte pattern that says a new packet begins here.'],
        ['Malformed length', 'A length field that cannot be right (too big, too small, inconsistent with the frame).'],
        ['DROP state', 'A state whose job is to consume the rest of a bad packet so the next packet is not misread.'],
        ['Unreachable / trap state', 'A state you can never enter, or one you can never leave. Both come from unfilled cells.'],
      ],
      widget: W('fsm', { ...packetFSM, title: 'Packet controller' })
    }),
    q.goal('H', 'In the packet-controller simulation (IDLE → HEADER on start-of-frame; HEADER → DROP on a bad length; DROP → IDLE on the last byte), drive it from IDLE into **DROP** and then back to IDLE.', W('fsm', { ...packetFSM, title: 'Packet controller', solvePath: ['start-of-frame', 'bad length', 'last byte'] }),
      s => s.history.includes('DROP') && s.state === 'IDLE',
      'start-of-frame → HEADER, bad length → DROP, last byte → IDLE. DROP exists so the remainder of a bad packet is eaten rather than being read as the start of the next one.'),
    q.mc('H', 'A packet controller has states IDLE, HEADER, PAYLOAD and DROP. It is in PAYLOAD and the last byte of the packet arrives. Next state?', ['IDLE', 'HEADER', 'DROP', 'PAYLOAD'], 0, 'The packet is complete, so the machine goes back to waiting for the next start-of-frame.', { grid: true }),
    q.mc('H', 'Why does an FSM need a state register at all, rather than plain combinational logic?', ['The right response to a byte depends on what came before, and combinational logic can only see the inputs present now', 'Because registers are faster than logic gates', 'Because the clock has to drive something', 'Because inputs arrive too quickly to be used directly'], 0, 'A length byte and a payload byte look identical on the wire. Only the remembered situation tells them apart, and remembering needs a register.'),
    q.mc('H', 'What actually goes wrong if one (state, input) cell of the state table is left unspecified in the HDL?', ['The signal must hold its old value, so the tool builds storage you never intended — or a state with no way out — and only the untested branch shows it', 'The simulator refuses to run', 'The machine returns to its reset state', 'The output becomes zero in that case'], 0, 'Not assigning something is an instruction to remember it. That is why the handbook wants the table complete before the code.'),
    q.num('H', 'A controller has 4 states and 5 possible input events. How many cells does a complete state transition table have?', 20, '4 states × 5 inputs = 20 cells. Each one is a decision; leaving any of them to chance is how FSM bugs are made.'),
    q.order('H', 'Order the steps of designing an FSM the way the handbook asks.', ['list the states and the input events', 'fill in every cell of the state/transition table, including reset from each state', 'draw the diagram and check each state can be entered and left', 'write the HDL directly from the table', 'test one case per table cell, plus reset from every state'], 'Table first, code second, and the tests come from the table rather than from the code you just wrote.'),
    q.info('H', 'Moore and Mealy: the same detector, two output timings', `An FSM also has **outputs**, and there are exactly two places they can come from.

**Moore**: output = f(state). The output only changes when the state changes, which only happens at a clock edge. So it is a clean, registered signal — but it appears **one cycle after** the input that caused it, because the state that "knows" only exists after the edge.

**Mealy**: output = f(state, input). The output reacts in the **same cycle** as the input, because the logic looks at the input directly. Faster by one cycle — but the output is now a combinational function of an input, so any glitch or late arrival on that input goes straight to the output, and a receiver latching it must meet setup against it.

Take a detector for "two 1s in a row". Moore needs three states (no trailing 1, one trailing 1, two or more) and raises its output while it sits in the third. Mealy needs two states and raises its output during the cycle in which the second 1 arrives.

Neither is more correct. The rule is: know which one you wrote, and say so in the interface, because "the output pulses in the same cycle as the last byte" and "the cycle after" are different contracts. Toggle input cells below and compare the two rows.`, {
      terms: [
        ['Moore output', 'An output computed from the state alone. Registered and glitch-free, one cycle later.'],
        ['Mealy output', 'An output computed from the state and the current input. Same cycle, but combinational: it can glitch.'],
        ['Registered output', 'An output that comes straight from a flip-flop, so it changes only just after a clock edge.'],
        ['Glitch', 'A short unintended pulse while combinational logic settles. Harmless if only a register samples it later; harmful if something reacts to it.'],
        ['Contract', 'The stated agreement about when a signal is valid, so the block that receives it can be designed against it.'],
      ],
      widget: W('mooremealy', { bits: [0, 1, 1, 0, 1, 1, 1, 0] })
    }),
    q.mc('H', 'A "two 1s in a row" detector is built twice: once as a Moore machine, once as Mealy. The second 1 arrives in cycle 4. In which cycle does each output go high?', ['Moore in cycle 5, Mealy in cycle 4', 'Both in cycle 4', 'Both in cycle 5', 'Moore in cycle 4, Mealy in cycle 5'], 0, 'Mealy looks at the input directly, so it reacts within the same cycle. Moore can only respond once the state register has changed, which happens at the edge ending cycle 4.'),
    q.mc('H', 'Which is the real cost of a Mealy output?', ['It is combinational in the input, so an input glitch or a late input arrival passes straight through to the output', 'It needs more states than Moore', 'It cannot be simulated', 'It only works with an asynchronous reset'], 0, 'Mealy usually needs fewer states. The price is a combinational path from an input pin to an output pin, with the glitching and timing that implies.'),
    q.mc('H', 'A downstream block samples your FSM\'s "packet_done" output with a flip-flop and you want no chance of a glitch being caught. Which output style do you choose, and why?', ['Moore: the output comes straight from the state register, so it is stable from just after one edge to just after the next', 'Mealy: it is one cycle earlier', 'Either: glitches cannot exist in synchronous logic', 'Neither: use a gated clock instead'], 0, 'A registered (Moore) output changes only just after an edge and is stable across the cycle. A Mealy output can wobble while its input settles.'),
    q.info('H', 'How the states are encoded, and what to do about illegal ones', `A state is stored as bits, and you choose the code.

**Binary encoding**: 4 states in 2 bits (00, 01, 10, 11). Fewest flip-flops, but the next-state logic has to decode combinations of bits, so it is wider and slower.

**One-hot**: one flip-flop per state, exactly one of them 1 (0001, 0010, 0100, 1000). More flip-flops — which an FPGA has in abundance, sitting next to every lookup table anyway — but "am I in PAYLOAD?" is now a **single wire**, not a decode. The next-state logic collapses to a few small OR terms, so one-hot is usually the faster choice on an FPGA. Tools often pick it for you.

One-hot has a catch: 4 flip-flops have 16 patterns and only 4 are legal. A glitch or a single-event upset can land you on 0000 or 0101. If nothing handles that, the machine sits in a state your table never described and stops responding for good. The fix is a **default** arm that sends any unrecognised pattern back to IDLE (or to an error state that reports itself), plus a reset you can always assert.`, {
      terms: [
        ['Encoding', 'The choice of bit pattern that represents each state.'],
        ['One-hot', 'One flip-flop per state, exactly one high. Decoding a state is a single wire.'],
        ['Binary encoding', 'States numbered in binary: ⌈log₂ N⌉ flip-flops, but wider decode logic.'],
        ['Illegal state', 'A bit pattern that corresponds to no state in your table. One-hot has many of them.'],
        ['Default arm', 'The catch-all branch that gives every unlisted pattern a defined next state, usually the reset state.'],
      ]
    }),
    q.num('H', 'An FSM has 9 states. How many flip-flops does a **binary** encoding need?', 4, '2³ = 8 is not enough for 9 states; 2⁴ = 16 is. So 4 flip-flops, with 7 unused patterns.'),
    q.num('H', 'An FSM has 9 states. How many flip-flops does a **one-hot** encoding need?', 9, 'One flip-flop per state. More storage, but "am I in state k?" becomes one wire instead of a 4-input decode.'),
    q.mc('H', 'A one-hot FSM with 5 states uses 5 flip-flops. A cosmic-ray upset flips one of them, leaving 00000. With no default arm, what happens?', ['No transition matches, so the machine holds 00000 for ever and stops responding until reset', 'It returns to the reset state automatically', 'The synthesiser prevents this at compile time', 'It behaves like the state with the lowest number'], 0, '32 patterns, 5 legal. An unlisted pattern has no described behaviour, so it is a trap state. A default arm back to IDLE costs almost nothing and removes the failure mode.'),
    q.code('H', 'Model the packet controller as a Python function. `solve(events)` starts in `"IDLE"` and returns the **state trace**: a list whose first entry is `"IDLE"` and which then has one entry per event, giving the state *after* that event. Transitions: from `"IDLE"`, `"sof"` → `"HEADER"`. From `"HEADER"`, `"hdr_ok"` → `"PAYLOAD"` and `"bad_len"` → `"DROP"`. From `"PAYLOAD"`, `"last"` → `"IDLE"` and `"bad_len"` → `"DROP"`. From `"DROP"`, `"last"` → `"IDLE"`. `"reset"` goes to `"IDLE"` from any state. Any (state, event) not listed leaves the state unchanged.', {
      fn: 'solve',
      starter: 'TABLE = {\n    "IDLE":    {"sof": "HEADER"},\n    "HEADER":  {"hdr_ok": "PAYLOAD", "bad_len": "DROP"},\n    "PAYLOAD": {"last": "IDLE", "bad_len": "DROP"},\n    "DROP":    {"last": "IDLE"},\n}\n\ndef solve(events):\n    state = "IDLE"\n    trace = [state]\n    for e in events:\n        # reset wins from any state; otherwise look the cell up, and stay put if it is empty\n        pass\n    return trace\n',
      tests: [
        { args: [[]], expect: ['IDLE'], name: 'no events: the trace is just the reset state' },
        { args: [['sof', 'hdr_ok', 'last']], expect: ['IDLE', 'HEADER', 'PAYLOAD', 'IDLE'], name: 'one clean packet' },
        { args: [['sof', 'bad_len', 'sof', 'last']], expect: ['IDLE', 'HEADER', 'DROP', 'DROP', 'IDLE'], name: 'DROP ignores a start-of-frame inside the bad packet' },
        { args: [['sof', 'hdr_ok', 'reset', 'sof']], expect: ['IDLE', 'HEADER', 'PAYLOAD', 'IDLE', 'HEADER'], name: 'reset mid-packet, then a fresh packet' },
        { args: [['last', 'hdr_ok']], expect: ['IDLE', 'IDLE', 'IDLE'], name: 'events that no cell covers leave the state alone' },
      ],
      gen: 'def gen():\n    E = ["sof", "hdr_ok", "bad_len", "last", "reset"]\n    for _ in range(30):\n        n = random.randint(0, 12)\n        yield ([random.choice(E) for _ in range(n)],)',
      refCode: 'T = {"IDLE": {"sof": "HEADER"}, "HEADER": {"hdr_ok": "PAYLOAD", "bad_len": "DROP"}, "PAYLOAD": {"last": "IDLE", "bad_len": "DROP"}, "DROP": {"last": "IDLE"}}\ndef ref(events):\n    s = "IDLE"; out = [s]\n    for e in events:\n        s = "IDLE" if e == "reset" else T.get(s, {}).get(e, s)\n        out.append(s)\n    return out',
      solution: 'TABLE = {\n    "IDLE":    {"sof": "HEADER"},\n    "HEADER":  {"hdr_ok": "PAYLOAD", "bad_len": "DROP"},\n    "PAYLOAD": {"last": "IDLE", "bad_len": "DROP"},\n    "DROP":    {"last": "IDLE"},\n}\n\ndef solve(events):\n    state = "IDLE"\n    trace = [state]\n    for e in events:\n        if e == "reset":\n            state = "IDLE"\n        else:\n            state = TABLE.get(state, {}).get(e, state)\n        trace.append(state)\n    return trace'
    }, 'The dictionary *is* the state table, written as data instead of as a diagram, and the RTL version is a case statement over the same cells. `TABLE.get(state, {}).get(e, state)` spells out the "stay put" default explicitly — in HDL that default is what silently becomes a latch if you forget it. Returning the whole trace rather than just the final state is what makes this testable: a cycle-by-cycle trace is exactly what you compare against a simulation waveform.'),
    q.mc('H', 'Interview: your FSM has a "busy" output. A reviewer asks whether a new request arriving in the same cycle as the last byte is accepted. Which document answers that immediately?', ['The completed state table plus a stated Moore/Mealy choice: the cell for (PAYLOAD, last byte) and the output timing together define it', 'The synthesis report', 'The place-and-route timing summary', 'The testbench log for a nominal packet'], 0, 'Acceptance-while-busy is a contract question. The table gives the transition and the output style gives the cycle it is visible in; a nominal-packet log shows neither.'),
    q.mc('H', 'Interview: a colleague replaces a Moore output with the equivalent Mealy output to save a cycle of latency. What must be re-checked before shipping it?', ['Every consumer of that output: it is now combinational in an input, so its timing path and any glitch sensitivity change', 'Nothing: the states are the same', 'Only the reset behaviour', 'Only the state encoding'], 0, 'Saving the cycle moves work into the same cycle: a new input-to-output path to close timing on, and a signal that can glitch while it settles.'),
    q.mc('H', 'Interview: you are asked to defend one-hot encoding on an FPGA for a 12-state controller. The strongest argument is…', ['Flip-flops are already there next to every lookup table, and one-hot turns state decoding into a single wire, so the next-state logic is shallower and the clock can be faster', 'It uses fewer flip-flops than binary', 'It removes the need for a reset', 'It makes illegal states impossible'], 0, 'One-hot trades flip-flops (cheap and plentiful in an FPGA fabric) for shallower logic. It makes illegal states *more* numerous, which is exactly why you add a default arm.'),

    // =====================================================================================================
    // CODE: Git (S03 L1)
    // =====================================================================================================
    q.info('S', 'Git: snapshots joined into a graph', `The problem first. You have working code, you change five files to try an idea, the idea fails, and you cannot get back. Copying the folder to \`project_v2_final\` solves it badly: no record of what changed, no record of why, and no way to compare.

Git's answer is the **commit**: a snapshot of every tracked file at one moment, together with an author, a time, a message — and a pointer to the commit it came from, its **parent**.

That parent pointer is the whole design. Each commit names its ancestor, so the commits form a **graph** running backwards in time. From any commit you can walk back and get the exact tree of files it recorded. A commit joining two lines of work (a **merge**) simply has two parents.

A commit is named by a **hash** of its contents: same contents and same history, same name, everywhere. That is why the name is a long hex string rather than a version number, and why history cannot be quietly edited — changing anything changes the hash of that commit and of everything after it.`, {
      terms: [
        ['Repository (repo)', 'Your project folder plus the complete history stored in its .git directory.'],
        ['Commit', 'A snapshot of all tracked files at one moment, with author, time, message and a pointer to its parent.'],
        ['Parent', 'The commit a commit was made from. Merges have two parents; the very first commit has none.'],
        ['Hash', 'The long hex name of a commit, computed from its contents and history. Identical content and history give an identical name.'],
        ['Merge', 'A commit with two parents, joining two lines of work back together.'],
      ],
      widget: W('gitgraph', {})
    }),
    q.info('S', 'Three places a change lives, and why the middle one exists', `Your change passes through three places:

1. The **working tree**: the files on disk, as your editor left them.
2. The **index** (also called the *stage*): a list of exactly what will go into the next commit. \`git add\` copies a change into it.
3. The **repository**: the committed history. \`git commit\` turns the index into a new commit.

Beginners ask why the middle step exists at all. Because a working tree usually holds several unrelated changes at once — a bug fix, a rename, some debug prints. Committing them together produces a snapshot that cannot be reverted, reviewed, or bisected without dragging the others along. The index lets you commit *one coherent idea* and leave the rest for later.

The three commands that report on this: \`git status\` (which files are modified, which are staged), \`git diff\` (working tree vs index), \`git diff --staged\` (index vs last commit). Look at the diff before every commit; it is the cheapest review you will ever get.`, {
      terms: [
        ['Working tree', 'The files as they exist on disk right now.'],
        ['Index / stage', 'The prepared contents of the next commit. git add puts changes there.'],
        ['git status', 'Reports what is modified and what is staged.'],
        ['git diff', 'Shows changed lines: working tree vs index by default, or --staged for index vs last commit.'],
        ['Coherent commit', 'A commit containing one idea, so it can be read, reviewed, reverted or bisected on its own.'],
      ]
    }),
    q.info('S', 'A branch is a pointer, which is why branching is free', `A **branch** in Git is not a copy of anything. It is a small file containing one commit hash. \`main\` is a branch; there is nothing special about it beyond the name.

Committing does two things: it creates the commit, then moves the current branch's pointer to it. **HEAD** is a pointer to which branch you are currently on.

Two consequences worth remembering:

- Creating a branch writes about 40 bytes. That is why you branch for a half-hour experiment without thinking about it, and why "the branch is expensive" instincts from older tools are wrong here.
- Deleting a branch deletes only the pointer. The commits are still there until Git's garbage collection removes ones nothing can reach.

**Merging** starts from the **common ancestor** of the two branches — the most recent commit reachable from both — and applies each side's changes since then. If both sides edited the same lines, Git cannot know which to keep, so it stops and asks: a **conflict**. And "what has this branch got that main has not?" is just a graph question: the commits reachable from one and not the other. That is what today's exercise computes.`, {
      terms: [
        ['Branch', 'A movable pointer to a commit. It advances every time you commit on it.'],
        ['HEAD', 'A pointer to the branch (or commit) you currently have checked out.'],
        ['Common ancestor (merge base)', 'The most recent commit reachable from both branches. Merging compares each side against it.'],
        ['Conflict', 'Both branches changed the same lines since the common ancestor, so Git asks you to choose.'],
        ['Reachable', 'A commit you can arrive at by following parent pointers backwards from a starting commit.'],
      ]
    }),
    q.mc('S', 'What exactly does a Git commit record?', ['A snapshot of every tracked file at that moment, plus author, time, message and a pointer to its parent commit', 'Only the lines that changed, with no reference to earlier commits', 'A compressed backup of the whole folder including untracked files', 'A list of the commands you ran'], 0, 'Snapshot plus parent pointer. Diffs are computed between snapshots when you ask for them; the parent pointer is what turns a pile of snapshots into a history.'),
    q.mc('S', 'Why does Git have a staging area (the index) instead of committing everything you edited?', ['So one commit can contain one coherent change, even when the working tree holds several unrelated edits', 'Because commits would otherwise be too large to store', 'Because Git cannot read the working tree directly', 'To keep a backup in case the commit fails'], 0, 'A commit that mixes a fix, a rename and some debug prints cannot be reviewed, reverted or bisected on its own.'),
    q.mc('S', 'A Git branch is best described as…', ['A movable pointer to one commit, which advances when you commit', 'A separate copy of the whole repository on disk', 'A compressed archive of a release', 'A list of the files a developer owns'], 0, 'About 40 bytes on disk. Cheap branching is a direct consequence of the branch being a pointer rather than a copy.'),
    q.num('S', 'A history runs c0 → c1 → c2 → c3 → c4 in a straight line (c0 is the first commit and each commit\'s parent is the one before it). How many commits are reachable from c3 by following parent pointers, counting c3 itself?', 4, 'c3, c2, c1, c0. Reachability walks backwards; c4 is not reachable from c3 because pointers only run towards the past.'),
    q.mc('S', 'Two branches both changed the same lines of one file since their common ancestor. Git stops with a conflict. Why can it not just decide?', ['Both changes are equally valid edits to the same lines; only a human knows which one the code should end up with', 'Git cannot read that file type', 'The commits have the same hash', 'Because the branches have different names'], 0, 'Merging replays each side\'s changes relative to the common ancestor. Where the two sides disagree about the same lines, there is no rule that could choose correctly.'),
    q.order('S', 'Order the commands that take a new folder to a first tagged release.', ['git init', 'git add tests/test_adder.py', 'git commit -m "Add exhaustive 4-bit adder test"', 'git tag v0.1'], 'Create the repository, stage exactly what belongs in the change, commit it with a message that says why, then give that commit a fixed name so it can be referred to later.'),
    q.mc('S', 'Which commit message best meets the handbook\'s standard that history is evidence?', ['"Fix stale metadata after reset in the packet FSM; add regression test for a mid-packet reset"', '"fix"', '"changes to files"', '"WIP"'], 0, 'Say what changed and why, and name the test that stops it coming back. That message is what makes the commit useful to the person bisecting a regression six months later.'),
    q.code('S', 'Reason over a commit graph. `solve(parents, a, b)` takes `parents`, a dictionary mapping each commit name to the list of its parent commit names, and two commit names `a` and `b`. Return the sorted list of commits **reachable from `a` but not reachable from `b`**, where a commit is reachable from itself. (That is what `git log b..a` prints: "what does a have that b does not?") Reachability follows parent pointers backwards; merge commits have two parents.', {
      fn: 'solve',
      starter: 'def solve(parents, a, b):\n    def reachable(start):\n        seen = set()\n        stack = [start]\n        # walk parent pointers backwards, never visiting a commit twice\n        return seen\n\n    return sorted(reachable(a) - reachable(b))\n',
      tests: [
        { args: [{ c0: [], c1: ['c0'], c2: ['c1'], c3: ['c2'] }, 'c3', 'c1'], expect: ['c2', 'c3'], name: 'straight line: c3 has two commits c1 does not' },
        { args: [{ c0: [], c1: ['c0'], c2: ['c1'], c3: ['c2'] }, 'c1', 'c3'], expect: [], name: 'a is an ancestor of b: nothing is exclusive to a' },
        { args: [{ c0: [], c1: ['c0'], c2: ['c1'] }, 'c2', 'c2'], expect: [], name: 'same commit both sides' },
        { args: [{ c0: [], c1: ['c0'], c2: ['c1'], f1: ['c1'], f2: ['f1'] }, 'f2', 'c2'], expect: ['f1', 'f2'], name: 'a side branch: only its own two commits' },
        { args: [{ c0: [], c1: ['c0'], c2: ['c1'], f1: ['c1'], f2: ['f1'], m: ['c2', 'f2'] }, 'm', 'c2'], expect: ['f1', 'f2', 'm'], name: 'a merge commit brings both parents\' histories with it' },
        { args: [{ c0: [] }, 'c0', 'c0'], expect: [], name: 'the very first commit, which has no parents' },
      ],
      gen: 'def gen():\n    for _ in range(15):\n        n = random.randint(1, 8)\n        names = ["c%d" % i for i in range(n)]\n        parents = {}\n        for i, nm in enumerate(names):\n            if i == 0:\n                parents[nm] = []\n            else:\n                k = random.randint(1, min(2, i))\n                parents[nm] = random.sample(names[:i], k)\n        yield (parents, random.choice(names), random.choice(names))',
      refCode: 'def ref(parents, a, b):\n    def reach(s):\n        seen = set(); st = [s]\n        while st:\n            c = st.pop()\n            if c in seen: continue\n            seen.add(c)\n            st.extend(parents.get(c, []))\n        return seen\n    return sorted(reach(a) - reach(b))',
      solution: 'def solve(parents, a, b):\n    def reachable(start):\n        seen = set()\n        stack = [start]\n        while stack:\n            c = stack.pop()\n            if c in seen:\n                continue\n            seen.add(c)\n            stack.extend(parents.get(c, []))\n        return seen\n\n    return sorted(reachable(a) - reachable(b))'
    }, 'History is a directed graph and every "what is on this branch?" question is a reachability question. The `seen` set does two jobs: it stops you revisiting a commit reached by two different paths (a merge makes that normal), and it guarantees the walk terminates. Each commit is expanded once, so the cost is linear in commits plus parent edges. The empty results are the interesting tests: if `a` is an ancestor of `b`, everything `a` has is already in `b`, which is exactly the "already merged, nothing to do" case.'),
    q.mc('S', 'Interview: your reachability walk over a commit graph uses a `seen` set. Someone asks what breaks without it. The precise answer is…', ['A merge commit is reachable by two paths, so its ancestors would be expanded repeatedly — exponential work on a history with many merges', 'Nothing: parent pointers never repeat', 'It would return commits in the wrong order', 'The program would crash on the first commit'], 0, 'It is not just a speed trick. Diamond-shaped history (branch then merge) means the same ancestors are found down both paths, and without the set the repeated expansion multiplies at every diamond.'),
    q.mc('S', 'Interview: you are asked to find the **common ancestor** of two branches with the same style of graph walk. The simplest correct description is…', ['Take the commits reachable from both, and pick the one that is not an ancestor of any other commit in that set', 'Take the commit with the smallest hash among all commits', 'Take the first commit of the repository', 'Take the parent of whichever branch tip is older'], 0, 'The shared ancestors are the intersection of the two reachable sets. The merge base is the newest of those: the one no other shared ancestor can reach from below.'),
    q.tf('S', 'Deleting a Git branch immediately deletes the commits that were made on it.', false, 'A branch is a pointer. Deleting it removes the pointer; the commits survive and can still be recovered by hash until garbage collection removes objects nothing can reach.'),

    // =====================================================================================================
    // MATHS: expectation, indicators, linearity (M06 L1)
    // =====================================================================================================
    q.info('M', 'Expectation: the long-run average, written as a weighted sum', `Roll a fair die many times and average the results. The average settles near **3.5**. That number is the **expectation** of the roll.

Where does it come from? Each face appears about 1/6 of the time, so in n rolls you get about n/6 of each face and the average is

(1 + 2 + 3 + 4 + 5 + 6)/6 = 3.5.

Written generally: **E[X] = Σ (value × probability of that value)**. Every outcome contributes its value, weighted by how often it happens.

Two things to keep straight. The expectation need not be a possible value — no die face shows 3.5 — because it is a centre, not a prediction. And it says nothing about spread: a coin paying £0 or £100 and a certain payment of £50 both have expectation 50, and no gambler thinks they are the same. Spread is variance, later.

Expectation is the quantity that engineering asks for first: average packets per second, average cycles per transaction, average cost per trade.`, {
      terms: [
        ['Random variable', 'A number attached to each outcome of an experiment: the value of a die roll, the number of heads in ten flips.'],
        ['Expectation E[X]', 'The probability-weighted average of a random variable: Σ value × probability. The value the long-run average settles on.'],
        ['Weighted sum', 'A sum in which each term is multiplied by its share. Here the shares are probabilities and they add to 1.'],
        ['Centre, not prediction', 'E[X] need not be an achievable value; it is where the average of many repeats lands.'],
      ]
    }),
    q.info('M', 'Indicator variables turn counting into adding', `Here is the trick that does most of the work in expectation problems.

An **indicator** is a random variable that is **1** when some event happens and **0** when it does not. Its expectation is easy:

E[I] = 1 × P(event) + 0 × P(not event) = **P(event)**.

So the expectation of an indicator *is* the probability. That single line is the bridge between counting problems and probability problems.

Now take any question of the form "how many … on average?" Write the count as a sum of indicators, one per slot that could contribute:

- Number of sixes in 12 rolls: one indicator per roll, each worth 1/6.
- Number of adjacent equal pairs in 10 flips: one indicator per **gap** between neighbouring flips. Ten flips have **9** gaps, and each pair matches with probability ½ (whatever the first flip is, the second matches it half the time).

The count is I₁ + I₂ + … . To get its expectation you now need one more fact, which is the next card.`, {
      terms: [
        ['Indicator variable', 'A 0/1 random variable: 1 if an event happens, 0 if not. Often written I or 1ₐ.'],
        ['E[I] = P(A)', 'The expectation of an indicator equals the probability of its event. The single most used identity in this topic.'],
        ['Slot', 'One place where the thing you are counting could occur: a roll, a gap between neighbours, a position in a shuffle.'],
        ['Decomposition', 'Writing a count as a sum of indicators, one per slot.'],
      ],
      widget: W('indicators', { mode: 'pairs', n: 10 })
    }),
    q.info('M', 'Linearity, and why dependence cannot break it', `**Linearity of expectation**: for any random variables at all,

**E[X + Y] = E[X] + E[Y]**.

The proof is two lines and worth seeing, because it explains why the rule has no conditions. Expectation is a sum over outcomes ω, each weighted by its probability:

E[X + Y] = Σ_ω (X(ω) + Y(ω))·P(ω) = Σ_ω X(ω)P(ω) + Σ_ω Y(ω)P(ω) = E[X] + E[Y].

All that happened was splitting a sum into two sums. Nothing asked how X and Y relate, so **no independence is needed**.

Use it on the adjacent pairs. Ten fair flips, 9 gaps, indicator Iₖ for gap k. The count is I₁ + … + I₉, so the expected count is 9 × ½ = **4.5**. The gaps clearly overlap — gap 1 and gap 2 share flip 2, so knowing one tells you something about the other — and it does not matter in the slightest.

Where independence *is* required: multiplying, E[XY] = E[X]E[Y], and adding variances. Those are genuinely different claims, and they do break when variables are dependent.`, {
      terms: [
        ['Linearity of expectation', 'E[X + Y] = E[X] + E[Y], and E[aX] = aE[X], for any random variables — dependent or not.'],
        ['Dependent', 'Knowing one variable changes the distribution of the other. Overlapping pairs are dependent.'],
        ['Independence', 'Knowing one tells you nothing about the other. Needed for E[XY] = E[X]E[Y], not for sums.'],
        ['Variance', 'The average squared distance from the mean: a measure of spread. Variances add only when variables are uncorrelated.'],
      ]
    }),
    q.num('M', 'Ten fair coin flips are made in a row. What is the expected number of adjacent equal pairs (positions where a flip matches the flip immediately after it)?', 4.5, '10 flips have 9 adjacent gaps. Each gap matches with probability ½, because whatever the first of the two shows, the second matches half the time. By linearity the expected count is 9 × ½ = 4.5, even though neighbouring gaps share a flip.'),
    q.num('M', 'Five fair coin flips are made in a row. What is the expected number of adjacent equal pairs?', 2, '5 flips have 4 gaps, each worth ½: 4 × ½ = 2.'),
    q.num('M', 'A fair six-sided die is rolled 12 times. Expected number of sixes?', 2, 'One indicator per roll, each with expectation 1/6. 12 × 1/6 = 2.'),
    q.mc('M', 'Ten fair coin flips. The indicators for the pair (flip 1, flip 2) and the pair (flip 2, flip 3) are…', ['dependent, because they share flip 2 — and their expectations still add', 'independent, because the flips are independent', 'mutually exclusive', 'identical'], 0, 'Knowing that flips 1 and 2 matched changes what "flips 2 and 3 match" means about flip 1 and 3, so the indicators are dependent. Linearity does not care: the proof only splits a sum.'),
    q.mc('M', 'Which step in the proof of E[X + Y] = E[X] + E[Y] is where independence would have been needed, if it were needed at all?', ['Nowhere: the proof only splits one sum over outcomes into two sums', 'When writing E[X] as a sum over outcomes', 'When multiplying by P(ω)', 'At the very end, when adding the two sums'], 0, 'E[X + Y] = Σ(X(ω) + Y(ω))P(ω) = ΣX(ω)P(ω) + ΣY(ω)P(ω). Splitting a finite sum is always allowed, so the identity holds for any joint behaviour.'),
    q.tf('M', 'For any random variables X and Y, E[X·Y] = E[X]·E[Y].', false, 'That one does need independence (or at least zero correlation). Take X as a fair coin\'s 0/1 result and Y = X: E[XY] = E[X²] = ½ but E[X]E[Y] = ¼. Sums are safe; products are not.'),
    q.num('M', 'Ten fair coin flips are made in a row. What is the expected number of positions where "HH" occurs (a head immediately followed by a head)?', 2.25, '9 gaps, and each is HH with probability ¼. 9 × ¼ = 2.25. Note the same 9 slots as the "equal pairs" count, with a different per-slot probability.'),
    q.num('M', 'Interview: a standard 52-card deck (13 cards in each of 4 suits) is shuffled and laid in a row. What is the expected number of adjacent pairs of cards that share a suit?', 12, '51 adjacent gaps. For any gap, given the first card, 12 of the remaining 51 cards share its suit, so P = 12/51. Expected count = 51 × 12/51 = 12 exactly. The gaps are heavily dependent and it changes nothing.'),
    q.num('M', 'Interview: 20 fair coin flips are made in a row. What is the expected number of positions where a flip differs from the flip immediately after it (the number of "switches")?', 9.5, '19 gaps, each a switch with probability ½: 19 × ½ = 9.5. Equal pairs and switches must add to 19, and 9.5 + 9.5 = 19. ✓'),
    q.num('M', 'Interview: eight fair six-sided dice are rolled in a row. Expected number of adjacent pairs showing the same number, to 3 d.p.?', 1.167, '7 gaps; a gap matches with probability 1/6 (whatever the first die shows, the second matches with probability 1/6). 7/6 = 1.167.', { tol: 0.004 }),
    q.mc('M', 'Interview: a candidate computes the expected number of adjacent equal pairs in 10 flips by listing all 2¹⁰ = 1024 sequences and averaging. Their answer agrees with 4.5. What does the indicator argument give you that the enumeration does not?', ['It scales: the same two lines give the answer for a million flips, and it shows exactly which fact (P = ½ per gap) the answer depends on', 'A different, more accurate number', 'A proof that the pairs are independent', 'The variance of the count'], 0, 'Enumeration answers one instance. Linearity gives (number of slots) × (probability per slot), so you can see immediately what changes if the coin is biased or the sequence is longer — and it tells you nothing about the variance, which really does need the dependence.'),

    // =====================================================================================================
    // DEGREE: the ideal op-amp (EEEN11101 / E01 L4)
    // =====================================================================================================
    q.info('E', 'A huge gain, plus feedback: where the two rules come from', `An **operational amplifier** is a component with two inputs and one output that does one thing:

**vout = A · (v₊ − v₋)**

with a gain A that is enormous: 100,000 is ordinary. The output cannot leave the supply voltages, its **rails**. Say the rails are ±15 V. Then for the output to be anywhere in between, the input difference must satisfy |v₊ − v₋| < 15/100000 = **150 µV**. Anything larger and the output is pinned at a rail.

So an op-amp on its own is nearly useless as an amplifier: microvolts of noise send the output to a rail. It is a superb **comparator** — it tells you which input is higher — and nothing else.

**Negative feedback** is what makes it useful. Connect a path from the output back to the **−** input. Now if v₋ drifts low, the output rises, and that rise is fed back to v₋, pushing it up again. The circuit hunts until the difference is almost nothing. The amplifier is not obeying a rule; it is being *forced* to a balance point by its own output.

The two famous rules are just the description of that balance:
1. **No current flows into the inputs** — the input resistance is millions of ohms, so with microvolts across it, the current is picoamps.
2. **v₊ = v₋** — because any measurable difference, multiplied by A, would have driven the output to a rail.

Rule 2 is an approximation that gets better as A grows. Try it below: with A = 10 it fails badly, at A = 10⁵ it is exact to five figures — and remove the feedback resistor and it collapses entirely.`, {
      terms: [
        ['Operational amplifier (op-amp)', 'A high-gain differential amplifier: it outputs A × (v₊ − v₋), with A of order 10⁵.'],
        ['Open-loop gain A', 'The gain of the bare amplifier, with no feedback connected. Huge and poorly controlled.'],
        ['Rails', 'The supply voltages. The output can never go beyond them, so a big input difference just pins it.'],
        ['Negative feedback', 'A path from the output back to the − input, so the output acts to reduce the difference between the inputs.'],
        ['Virtual short', 'The consequence: under negative feedback the two inputs sit at (almost) the same voltage, without being wired together.'],
      ],
      widget: W('opampfb', { A: 1e5, Rf: 10, Rin: 1, vin: 0.5, rails: 5 })
    }),
    q.info('E', 'The inverting amplifier, derived from the two rules', `The circuit: the source vin goes through a resistor **Rin** to the **−** input. A second resistor **Rf** runs from the − input back to the output. The **+** input is connected to ground.

Now use the rules, in order.

**Rule 2** says v₋ = v₊ = 0 V. The − node sits at zero volts even though no wire connects it to ground; it is called a **virtual ground**. Nothing is holding it there except the output, continuously correcting.

**Ohm's law on Rin**: the current from the source into that node is (vin − 0)/Rin = vin/Rin.

**Rule 1** says none of that current goes into the op-amp input. It has exactly one other route: through Rf towards the output. So the same current flows through Rf.

**Ohm's law on Rf**: going from the − node (0 V) through Rf to the output, the voltage drops by I·Rf in the direction of flow, so

**vout = 0 − (vin/Rin)·Rf = −(Rf/Rin)·vin.**

Two things fall out. The gain is set only by a **ratio of two resistors** — the op-amp's own vague gain of "about 10⁵" has vanished from the answer, which is the entire reason for using feedback. And because the source always looks into a node held at 0 V, the **input resistance of this stage is just Rin**: a low-value Rin gives high gain but loads the source hard.`, {
      terms: [
        ['Inverting amplifier', 'Source through Rin to the − input, Rf from − input to output, + input grounded. Gain = −Rf/Rin.'],
        ['Virtual ground', 'A node held at 0 V by feedback rather than by a wire. Currents behave as if it were grounded.'],
        ['Closed-loop gain', 'The gain of the whole circuit with feedback: a resistor ratio, not the op-amp\'s open-loop A.'],
        ['Input resistance of a stage', 'What the source sees. For the inverting amplifier it is Rin, because the far end of Rin is at 0 V.'],
        ['Feedback resistor Rf', 'The resistor from the output back to the − input. It carries the same current as Rin.'],
      ]
    }),
    q.info('E', 'Non-inverting, the follower, and the differential amplifier', `**Non-inverting.** Put the source straight on the **+** input, and build a divider from the output back to the − input with Rf on top and Rin to ground. Rule 1 says no current is drawn by the − input, so the divider is undisturbed:

v₋ = vout · Rin/(Rin + Rf).

Rule 2 says v₋ = vin. Solve: **vout = (1 + Rf/Rin)·vin**. The gain is positive and can never be below 1, because the divider can only reduce vout on the way back.

**The follower.** Set Rf = 0 and remove Rin: gain 1. Useless? No — it draws almost no current from the source (rule 1) and drives its output hard. A sensor with a 100 kΩ output impedance collapses when a 1 kΩ load is attached; put a follower in between and the sensor sees nothing while the load gets its full voltage. That is **buffering**, and it is most of what op-amps do in practice.

**Differential amplifier.** Feed both inputs through matched Rin, with Rf from the output to the − input and Rf from the + input to ground. Then **vout = (Rf/Rin)(V₊ − V₋)**. Only the *difference* is amplified; anything both inputs share — mains hum picked up on a long sensor cable, a shifting ground reference — appears at both inputs equally and is subtracted away. That is **common-mode rejection**, and it is why every strain-gauge bridge and every ECG front end is built this way. It works only in as much as the resistors really are matched.`, {
      terms: [
        ['Non-inverting amplifier', 'Source on the + input, divider from output to − input. Gain = 1 + Rf/Rin, always at least 1.'],
        ['Voltage follower (buffer)', 'A non-inverting amplifier with gain 1. Takes almost no current in, supplies current out.'],
        ['Loading', 'A load drawing current from a source with internal resistance, pulling its voltage down. A buffer prevents it.'],
        ['Differential amplifier', 'Amplifies V₊ − V₋ by Rf/Rin with matched resistors.'],
        ['Common-mode signal', 'Whatever both inputs share — hum, ground shift. A differential amplifier subtracts it out.'],
      ],
      widget: W('opamp', { Rf: 10, Rin: 1, vin: 0.5, rails: 5 })
    }),
    q.info('E', 'Rails, saturation and what the datasheet adds (E01 L4)', `The two rules are an idealisation, and E01 L4 is about the four ways a real device leaves it.

**Output range.** The output can never pass the rails, and typically stops a volt or two short of them. Ask an inverting stage with gain −10 for −8 V from a ±5 V supply and you get −5 V: **saturation**. The gain equation is simply no longer describing the circuit, because rule 2 has failed — the output can no longer move enough to balance the inputs.

**Input range.** Many op-amps cannot accept inputs right up to the rails either. A "rail-to-rail input" part is a specific, more expensive choice.

**Bandwidth.** A is only huge at low frequency; it falls off as frequency rises. Most parts are specified by a **gain-bandwidth product**: gain × bandwidth is roughly constant. A part with 1 MHz GBW gives a gain of 100 up to about 10 kHz, and a gain of 10 up to about 100 kHz. Asking for gain 1000 at 100 kHz is asking for 100 MHz of GBW.

**Output current.** The output stage can only supply so much, tens of milliamps. A 50 Ω load at 5 V wants 100 mA and will not get it.

So designing a stage means: choose the resistor ratio for the gain, then check the largest expected input against the rails, the highest expected frequency against the GBW, and the load current against the output limit. Gain alone is not a design.`, {
      terms: [
        ['Saturation', 'The output stuck at a rail because the ideal answer is out of range. The gain formula stops applying.'],
        ['Gain-bandwidth product (GBW)', 'Gain × usable bandwidth, roughly constant for one part. 1 MHz GBW → gain 10 up to about 100 kHz.'],
        ['Rail-to-rail', 'A part whose inputs and/or outputs work all the way to the supply voltages.'],
        ['Output current limit', 'The largest current the output stage can supply, typically tens of mA.'],
        ['Headroom', 'The margin between the largest signal you expect and the rail. Design it in, do not discover it.'],
      ]
    }),
    q.num('E', 'An inverting amplifier is built with Rin = 1 kΩ from the source to the − input and Rf = 10 kΩ from the − input to the output, with the + input grounded. What is its gain (vout/vin)?', -10, 'Gain = −Rf/Rin = −10/1 = −10. The minus sign is the inversion: a positive input gives a negative output.'),
    q.num('E', 'An inverting amplifier has Rin = 1 kΩ and Rf = 10 kΩ, is supplied from ±5 V rails, and is fed vin = 0.5 V. What is vout, in volts?', -5, 'Ideal output = −10 × 0.5 = −5.0 V, exactly at the negative rail. Any larger input saturates the stage.', { unit: 'V' }),
    q.num('E', 'A non-inverting amplifier has the source on the + input, Rf = 9 kΩ from the output to the − input and Rin = 1 kΩ from the − input to ground. What is its gain?', 10, 'Gain = 1 + Rf/Rin = 1 + 9 = 10. The divider feeds back one tenth of the output, and feedback forces that tenth to equal vin.'),
    q.mc('E', 'In an ideal op-amp circuit with negative feedback, the current flowing into each input pin is…', ['zero — the input resistance is enormous, so microvolts across it give a negligible current', 'equal to vin/Rin', 'equal to the output current', 'set by the supply rails'], 0, 'Rule 1. It is what lets you say the current through Rin continues entirely through Rf, which is the step that produces the gain formula.', { grid: true }),
    q.mc('E', 'In an inverting amplifier the − input is called a "virtual ground". What holds it at 0 V?', ['The feedback: the output moves to whatever value makes the − input match the grounded + input', 'A wire from that node to ground', 'The input resistor Rin, which drops the whole input voltage', 'Nothing: it is only at 0 V when vin is 0'], 0, 'No wire is connected. If the node drifts up, the huge gain drives the output down, and Rf pulls the node back. Cut the feedback resistor and the "virtual ground" disappears at once.'),
    q.num('E', 'A differential amplifier is built with matched resistors: Rin = 10 kΩ on each input and Rf = 100 kΩ. The inputs are V₊ = 1.05 V and V₋ = 1.00 V. What is vout, in volts, to 2 d.p.?', 0.5, 'vout = (Rf/Rin)(V₊ − V₋) = 10 × 0.05 = 0.50 V. The 1 V that both inputs share is common-mode and is rejected.', { unit: 'V', tol: 0.005 }),
    q.mc('E', 'With well-matched resistors, a differential amplifier rejects…', ['the common-mode signal: whatever both inputs share, such as mains hum on a long sensor cable', 'the difference between its inputs', 'all DC signals', 'nothing; it amplifies both inputs equally'], 0, 'Only V₊ − V₋ appears at the output. Interference picked up equally by both wires cancels, which is why sensor bridges use this stage.'),
    q.mc('E', 'A sensor with 100 kΩ internal resistance must drive a 1 kΩ load. Why does a unity-gain voltage follower between them help, when its gain is only 1?', ['It draws almost no current from the sensor, so the sensor is not loaded, and its own output can supply the load\'s current', 'It increases the sensor voltage tenfold', 'It filters out noise', 'It converts the voltage into a current'], 0, 'Without it, the 100 kΩ source and 1 kΩ load form a divider and almost all of the signal is lost. Gain 1 with a huge input resistance and a low output resistance is exactly what is needed.'),
    q.num('E', 'Exam-style: an op-amp has an open-loop gain of 200,000 and supply rails of ±15 V. What is the largest input difference |v₊ − v₋|, in microvolts, for which the output is still inside the rails?', 75, '|v₊ − v₋| = 15/200000 V = 7.5 × 10⁻⁵ V = 75 µV. Beyond that the output would have to exceed a rail, so it saturates. This is why the bare op-amp is a comparator and why rule 2 is such a good approximation once feedback is added.', { unit: 'µV', tol: 0.5 }),
    q.num('E', 'Exam-style: design an inverting amplifier with a gain of −4 using an input resistor Rin = 2.2 kΩ. What feedback resistance Rf is required, in kΩ?', 8.8, 'Gain = −Rf/Rin, so Rf = 4 × 2.2 = 8.8 kΩ. The nearest standard E12 value is 8.2 kΩ (gain −3.73) or 10 kΩ (gain −4.55); state which you would buy and why.', { unit: 'kΩ', tol: 0.05 }),
    q.num('E', 'Exam-style: a non-inverting amplifier has Rf = 47 kΩ from output to the − input and Rin = 10 kΩ from the − input to ground, runs from ±12 V rails, and is fed vin = 0.25 V. What is vout, in volts, to 3 d.p.?', 1.425, 'Gain = 1 + 47/10 = 5.7. vout = 5.7 × 0.25 = 1.425 V, comfortably inside the ±12 V rails.', { unit: 'V', tol: 0.005 }),
    q.num('E', 'Exam-style: an inverting amplifier uses Rin = 1 kΩ and Rf = 10 kΩ, but with an op-amp whose open-loop gain is only A = 1000. Solving vout = −A·v₋ together with the node equation gives vout/vin = −A·Rf/(A·Rin + Rf + Rin). What is the actual closed-loop gain, to 2 d.p.?', -9.89, 'vout/vin = −(1000 × 10)/(1000 × 1 + 10 + 1) = −10000/1011 = −9.891. The ideal answer is −10, so a gain of only 1000 costs about 1.1% of accuracy. With A = 10⁵ the error is about 0.011%: that is why "huge A" is worth paying for even though A itself never appears in the design formula.', { tol: 0.03 }),
    q.num('E', 'Exam-style: an op-amp has a gain-bandwidth product of 1 MHz. A stage built from it needs a closed-loop gain of 50. What is the largest signal frequency it can amplify properly, in kHz?', 20, 'Gain × bandwidth ≈ GBW, so bandwidth ≈ 1,000,000/50 = 20,000 Hz = 20 kHz. Above that the available gain falls and the output shrinks, even though the resistor ratio has not changed.', { unit: 'kHz', tol: 0.5 }),
    q.mc('E', 'Exam-style: an inverting stage with a gain of −10 runs from ±5 V rails and is fed a 0.8 V DC input. State the output and explain it.', ['−5 V: the ideal value −8 V is beyond the rail, so the output saturates and the gain equation no longer applies', '−8 V, since the gain is fixed at −10', '+5 V, because the output inverts twice', '0 V, because the amplifier shuts down'], 0, 'Once the output hits the rail it can no longer move enough to keep v₋ equal to v₊, so rule 2 fails and the derivation behind −Rf/Rin no longer holds. The check is: largest expected input × gain must fit inside the rails with headroom.'),
    ...genius(q, 16),
  ]
};
