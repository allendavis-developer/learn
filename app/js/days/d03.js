import { dayBuilder, W } from '../lib.js';
import { genius } from './_genius.js';
const q = dayBuilder(3);

// Day 3, rewritten to the standing rules: ground-up "why before what", short plain cards,
// every prompt self-contained, a full ~60-minute session. See C:\dev\study\CLAUDE.md and app/CONTENT_GUIDE.md.
export default {
  title: 'Logic gates, dictionaries, independence, Kirchhoff',
  emoji: '🔀',
  strands: ['H', 'S', 'M', 'E'],
  summary: '**Hardware** (H01): what a gate physically is, why a truth table is the complete specification, why AND/OR/NOT can build *any* function (sum of products), De Morgan read out loud, NAND as a universal gate, and shrinking an expression to shrink the circuit — plus a Python gate-network simulator. **Code** (S01): how a dictionary finds things without searching, why keys must be immutable, counting with `.get` and the empty case, why sets drop duplicates, and the list-vs-set speed cliff. **Maths**: what independence really claims, why the product rule follows from a rectangle of outcomes, why "cannot both happen" is the opposite of independent, and how engineers get it wrong. **Degree** (E01): KCL as conservation of charge, KVL as conservation of energy per coulomb, node counting, and a full worked loop with a power balance.',
  takeaway: 'A truth table is the whole spec of a combinational circuit; one 1-row = one AND term, OR them together and you have built it. `NOT(A AND B)` = `(NOT A) OR (NOT B)` because the opposite of "both" is "at least one not". A dictionary computes where the key lives instead of searching, so keys must never change. Independent means `P(A and B) = P(A)·P(B)` — a numerical test, not a story. KCL: charge cannot pile up at a node. KVL: walk a loop and you return to the same height.',
  steps: [
    // =====================================================================================================
    // HARDWARE: gates, truth tables, sum of products, De Morgan, NAND, simplification
    // =====================================================================================================
    q.info('H', 'Two switches and a lamp', `Put two switches one after the other in a torch circuit. The lamp lights only when **both** are closed. Now wire them side by side instead: the lamp lights when **either** one is closed.

That is already AND and OR, built out of nothing but wire.

A **gate** is the same idea done with transistors instead of fingers: a small circuit whose output voltage is decided by its input voltages, settling a fraction of a nanosecond after they do. AND outputs 1 only when every input is 1. OR outputs 1 when any input is 1.

NOT is the one you cannot make from switches. Switches can only break a path; they can never invent a 1 where there was a 0. Inverting needs a transistor that pulls the output *up* to the supply when the input is low. That is why the transistor, not the switch, is the real building block.

A gate has no memory. Its output depends on the inputs it has right now and nothing else. That property has a name: **combinational**.`, {
      terms: [
        ['Gate', 'A small circuit whose output bit is decided by its input bits: AND, OR, NOT, XOR and friends.'],
        ['AND / OR / NOT', '1 only if all inputs are 1 / 1 if any input is 1 / flips the bit.'],
        ['Combinational', 'No memory: the output depends only on the inputs present right now.'],
        ['Propagation delay', 'The time a gate takes to settle after its inputs change. Real gates are fast, not instant.'],
      ],
      widget: W('logic', { inputs: ['A', 'B'], fn: (a, b) => a & b, outName: 'A AND B', title: 'AND gate' })
    }),
    q.info('H', 'The truth table is the whole specification', `A combinational circuit has no memory, so there is exactly one question you can ask it: for *these* inputs, what comes out? Write down every input combination with its output and you have said everything there is to say.

Two inputs give 4 rows, three give 8, n give **2ⁿ**. The count doubles with each new input because that input can be 0 or 1 alongside every combination already listed.

Two circuits are the *same* circuit precisely when their tables match row for row. Not "look similar", not "agree on the cases I tried". Every row. A single disagreeing row sinks the claim, which is why hardware engineers reach for the table before they argue.

**XOR** is the one you may not have met. It outputs 1 when its two inputs **differ**. Later this week it turns out to be addition without the carry, which is why it appears in every adder ever built.`, {
      terms: [
        ['Truth table', 'One row per input combination, with the output for each. 2ⁿ rows for n inputs.'],
        ['Row', 'One input combination together with its output. Filling every row is what makes the table a proof.'],
        ['XOR', 'Exclusive OR: 1 when the two inputs differ, 0 when they match.'],
        ['Equivalent circuits', 'Two designs whose truth tables agree on every single row. Then either may be built.'],
      ]
    }),
    q.goal('H', 'Fill in **all four rows** of the XOR truth table by trying every combination of the two inputs A and B.', W('logic', { inputs: ['A', 'B'], fn: (a, b) => a ^ b, outName: 'A XOR B', title: 'XOR gate' }), s => s.visited === 4,
      'XOR is 1 for (0,1) and (1,0), and 0 for (0,0) and (1,1): it fires when the inputs differ. Four rows means four combinations, and only a full table is a proof.'),
    q.num('H', 'A combinational function of **3** inputs has how many rows in its truth table?', 8, '2³ = 8. Each extra input doubles the row count, because it can be 0 or 1 alongside everything already listed.'),
    q.mc('H', 'A XOR B outputs 1 when…', ['A and B differ', 'A and B are both 1', 'at least one of A and B is 1', 'A and B are both 0'], 0, 'Exclusive OR: exactly one of the two inputs is 1. (0,1) and (1,0) give 1; (0,0) and (1,1) give 0.'),
    q.info('H', 'Why AND, OR and NOT are enough for everything', `A fair worry: there are 256 different functions of three inputs. Do we need a special gate for each one?

No, and here is the construction that settles it.

Take any single row of a truth table whose output is 1, say A=1, B=0, C=1. One AND gate spots exactly that row: \`A · ¬B · C\` is 1 for that combination and 0 for every other one. Give every 1-row its own AND gate, then feed all of those into one OR. The OR fires whenever any of the rows you wanted turns up, and stays quiet otherwise.

That recipe always works — any table, any number of inputs — using only AND, OR and NOT.

It is called **sum of products**: the AND terms are the products, the OR is the sum. It rarely gives the cheapest circuit, but it proves the thing that matters: you will never meet a function you cannot build.`, {
      terms: [
        ['Minterm', 'The AND term that is 1 for exactly one row of the table, with a NOT on every input that is 0 in that row.'],
        ['Sum of products', 'OR (the sum) of AND terms (the products). The recipe that turns any truth table into a circuit.'],
        ['Functionally complete', 'A set of gates that can build every Boolean function. AND, OR and NOT are complete.'],
      ],
      widget: W('sop', { inputs: ['A', 'B', 'C'], out: [0, 1, 0, 1, 1, 0, 1, 0] })
    }),
    q.goal('H', 'Using the sum-of-products builder for two inputs A and B, set the output column so the function is 1 exactly when A and B **differ** (that is, build XOR).', W('sop', { inputs: ['A', 'B'], target: [0, 1, 1, 0] }), s => s.out === '0110',
      'Rows (0,1) and (1,0) get a 1. Their AND terms are ¬A·B and A·¬B, so XOR = ¬A·B + A·¬B: two AND gates, one OR, two inverters. That is exactly what an XOR gate contains.'),
    q.mc('H', 'A colleague claims you need a dedicated gate type for every Boolean function. Why is that false?', ['Sum of products: give each 1-row of the table its own AND term and OR the terms together, using only AND, OR and NOT', 'Because all Boolean functions are secretly XOR', 'Because chips can only build 16 different functions', 'Because a truth table with more than 8 rows is impossible'], 0, 'The construction is mechanical and always works, which is why AND, OR and NOT are called functionally complete.'),
    q.num('H', 'A 3-input function is 1 on exactly **5** rows of its 8-row truth table. Built directly by sum of products, how many AND gates does the circuit need?', 5, 'One AND term per 1-row: 5 AND gates (3 inputs each), feeding a single 5-input OR. Simplification can often do better, but this always works.'),
    q.num('H', 'How many **different** Boolean functions of two inputs are there?', 16, 'A function of 2 inputs is a choice of output for each of the 4 rows, so 2⁴ = 16. (AND, OR, XOR, NAND, NOR, the two constants, and nine more.)'),
    q.info('H', "De Morgan: the opposite of \"both\"", `"It is not the case that **both** switches are closed." Say the same thing another way: **at least one** of them is open.

Those are the same statement, and that is De Morgan's law: \`NOT(A AND B)\` = \`(NOT A) OR (NOT B)\`.

Run the other one the same way. "**Neither** is closed" means "this one is open **and** that one is open": \`NOT(A OR B)\` = \`(NOT A) AND (NOT B)\`.

There is nothing here to memorise if you read it out loud. Push a NOT through a gate and the gate flips: AND becomes OR, OR becomes AND, and each input picks up its own NOT.

Hardware engineers call this **bubble pushing** and do it constantly, because the gates a chip is really made of are the inverting ones. Explore the table below until every row agrees.`, {
      terms: [
        ["De Morgan's laws", 'NOT(A AND B) = (NOT A) OR (NOT B), and NOT(A OR B) = (NOT A) AND (NOT B).'],
        ['Complement', 'The opposite of an expression: 1 wherever it was 0.'],
        ['Bubble pushing', 'Moving the little inversion circles through a gate network by applying De Morgan, to match the gates you actually have.'],
      ],
      widget: W('truthcmp', {
        inputs: ['A', 'B'], names: ['NOT(A AND B)', '(NOT A) OR (NOT B)'],
        fns: [(a, b) => (a && b) ? 0 : 1, (a, b) => ((a ? 0 : 1) || (b ? 0 : 1)) ? 1 : 0],
        title: 'De Morgan, row by row'
      })
    }),
    q.mc('H', '`NOT(A AND B)` is equal to…', ['`(NOT A) OR (NOT B)`', '`(NOT A) AND (NOT B)`', '`A OR B`', '`A XOR B`'], 0, 'The opposite of "both are 1" is "at least one is 0". Check the row A=1, B=0: the left side is NOT(0) = 1, and the right side is 0 OR 1 = 1.'),
    q.mc('H', '`NOT(A OR B)` is equal to…', ['`(NOT A) AND (NOT B)`', '`(NOT A) OR (NOT B)`', '`A AND B`', '`NOT A`'], 0, '"Neither" means "not this one and not that one". Check A=1, B=0: left is NOT(1) = 0; right is 0 AND 1 = 0.'),
    q.info('H', 'NAND: the gate chips are actually made of', `A CMOS chip does not naturally build an AND gate. What it builds cheaply is an **inverting** gate: **NAND** (an AND with a NOT on the output) and **NOR** (an OR with a NOT). A plain AND costs a NAND *plus* an inverter, so it is bigger and slower than the NAND inside it.

That would be awkward if NAND could not do everything. It can.

Tie both NAND inputs together and it inverts: \`NAND(A, A)\` = \`NOT A\`. AND is then a NAND followed by that inverter. And OR comes straight from De Morgan: \`A OR B\` = \`NOT(¬A AND ¬B)\` = NAND of the two inverted inputs.

So NAND alone builds NOT, AND and OR — and by sum of products it therefore builds *everything*. A gate with that property is called **universal**. NOR is universal too.`, {
      terms: [
        ['NAND', 'NOT(A AND B). Output 0 only when every input is 1.'],
        ['NOR', 'NOT(A OR B). Output 1 only when every input is 0.'],
        ['Universal gate', 'A single gate type that can build every Boolean function on its own. NAND and NOR both qualify.'],
        ['CMOS', 'The transistor style used in modern chips. It makes inverting gates naturally, so NAND and NOR are the cheap primitives.'],
      ]
    }),
    q.mc('H', 'A 2-input NAND gate has both of its inputs wired together and driven by a signal A. What does it output?', ['`NOT A`', '`A`', 'always 1', 'always 0'], 0, 'NAND(A, A) = NOT(A AND A) = NOT A. That one trick is the first step in building everything else from NAND alone.'),
    q.mc('H', 'Why are NAND and NOR the cheap primitives inside a CMOS chip, rather than AND and OR?', ['CMOS naturally builds inverting gates; a plain AND is a NAND with an extra inverter bolted on, so it costs more area and delay', 'AND and OR need more input pins', 'NAND is faster because it has fewer possible outputs', 'Historical habit with no physical reason'], 0, 'The transistor arrangement that pulls an output low for "all inputs high" is the natural one. Non-inverting gates are built by adding an inverter, never by being simpler.'),
    q.info('H', 'Fewer gates, shorter path', `Sum of products gives a circuit that works. It rarely gives the circuit you want to build. Every gate costs area, power, and a slice of the time budget between two clock edges, so shrinking the expression is real engineering, not tidiness.

Most of the rules are the ones arithmetic already taught you. Two are worth learning cold.

\`A + A·B = A\`. If A on its own already covers those rows, the extra term adds nothing. This is called **absorption**.

\`A + ¬A·B = A + B\`. Read it aloud: "A, or else B when A is missing." Between them they cover A or B.

Two more have no arithmetic twin: \`A + ¬A = 1\` and \`A · ¬A = 0\`. Something is either true or not.

And one habit to unlearn from school algebra: in Boolean algebra \`A + A = A\`. There is no 2.`, {
      terms: [
        ['Absorption', 'A + A·B = A. A term that only fires where a simpler term already fires is dead weight.'],
        ['Complement law', 'A + ¬A = 1 and A · ¬A = 0: a signal and its inverse cover everything, and overlap nowhere.'],
        ['Idempotent', 'A + A = A and A · A = A. Boolean values do not accumulate.'],
        ['Critical path', 'The slowest chain of gates between two registers. It sets the highest clock frequency the design can run at.'],
      ]
    }),
    q.mc('H', 'Simplify `A + (NOT A) AND B`.', ['`A OR B`', '`A AND B`', '`B`', '`A`'], 0, 'Wherever A is 1 the expression is 1. Wherever A is 0 it reduces to B. So it is 1 exactly when A or B is 1.'),
    q.mc('H', 'Simplify `A + A AND B`.', ['`A`', '`B`', '`A AND B`', '`A XOR B`'], 0, 'Absorption. The term A·B is only ever 1 when A is 1, and A alone already covers that. The extra AND gate can be deleted.'),
    q.tf('H', 'In Boolean algebra, `A + A` simplifies to `A`.', true, 'OR-ing a signal with itself changes nothing: 0+0 = 0 and 1+1 = 1. There is no "2" in Boolean algebra, which is the usual first slip for people coming from ordinary algebra.'),
    q.mc('H', 'Interview: a designer builds `NOT(A AND B)` in one module and `(NOT A) AND (NOT B)` in another, believing both expressions compute one identical function of A and B. Which input combination exposes the bug?', ['A=1, B=0 — the first gives 1, the second gives 0', 'A=1, B=1 — both give 1', 'A=0, B=0 — the first gives 0', 'No input exposes it; the two are equal'], 0, 'They mixed up De Morgan. NOT(A AND B) is (NOT A) OR (NOT B), not AND. At A=1, B=0: NOT(0) = 1, but 0 AND 1 = 0. A=0,B=1 also exposes it; A=0,B=0 and A=1,B=1 happen to agree, which is why a partial test misses it.'),
    q.num('H', 'Interview: your gate library only stocks 2-input gates, and you need a 4-input AND. Using a balanced tree of 2-input ANDs, how many gate delays lie between an input and the output?', 2, 'AND two pairs (one delay), then AND the two results (second delay). Three gates, depth 2. Chaining them in a line would also use three gates but give depth 3 — same area, worse critical path.'),
    q.mc('H', 'Interview: you are asked to defend implementing a design entirely in NAND gates on a CMOS process. The strongest argument is…', ['NAND is universal, so nothing is lost, and it is the natural inverting primitive of CMOS — AND/OR cost an extra inverter each in area and delay', 'NAND gates use less power because they output 0 more often', 'NAND circuits cannot have timing problems', 'NAND is the only gate that can be manufactured'], 0, 'Universality means no expressive power is given up; the CMOS argument means you stop paying for inverters you did not need. (Both NAND and NOR are universal; the choice between them is a transistor-sizing detail.)'),
    q.code('H', 'Build a gate-network simulator. Write `solve(netlist, values)` where `values` is a dictionary of input signal names to 0/1, and `netlist` is a list of gates, each written `[op, out_name, in_a, in_b]` with `op` one of `"AND"`, `"OR"`, `"XOR"`, `"NOT"` (a `"NOT"` gate ignores `in_b`, which is passed as `None`). The gates are listed in evaluation order, so every input of a gate is already known by the time you reach it. Return a dictionary holding **every** signal value, inputs included.', {
      fn: 'solve',
      starter: 'def solve(netlist, values):\n    v = dict(values)          # start from the inputs; never modify the caller\'s dictionary\n    for op, out, a, b in netlist:\n        # look up v[a] (and v[b] unless op is "NOT"), apply the gate, store it under out\n        pass\n    return v\n',
      tests: [
        { args: [[['NOT', 'ns', 's', null], ['AND', 't1', 'ns', 'a'], ['AND', 't2', 's', 'b'], ['OR', 'y', 't1', 't2']], { s: 1, a: 0, b: 1 }], expect: { s: 1, a: 0, b: 1, ns: 0, t1: 0, t2: 1, y: 1 }, name: 'a 2-to-1 mux selects b when s = 1' },
        { args: [[['NOT', 'ns', 's', null], ['AND', 't1', 'ns', 'a'], ['AND', 't2', 's', 'b'], ['OR', 'y', 't1', 't2']], { s: 0, a: 1, b: 0 }], expect: { s: 0, a: 1, b: 0, ns: 1, t1: 1, t2: 0, y: 1 }, name: 'the same network selects a when s = 0' },
        { args: [[], { a: 1 }], expect: { a: 1 }, name: 'an empty netlist returns just the inputs' },
        { args: [[['NOT', 'x', 'a', null]], { a: 0 }], expect: { a: 0, x: 1 }, name: 'NOT ignores the unused second input' },
        { args: [[['AND', 'ab', 'a', 'b'], ['NOT', 'nand', 'ab', null], ['NOT', 'na', 'a', null], ['NOT', 'nb', 'b', null], ['OR', 'dm', 'na', 'nb']], { a: 1, b: 0 }], expect: { a: 1, b: 0, ab: 0, nand: 1, na: 0, nb: 1, dm: 1 }, name: 'De Morgan: nand and dm agree' },
        { args: [[['XOR', 'x', 'a', 'b']], { a: 1, b: 1 }], expect: { a: 1, b: 1, x: 0 }, name: 'XOR of two 1s is 0' },
      ],
      gen: 'def gen():\n    for _ in range(30):\n        names = ["a", "b", "c"]\n        vals = {n: random.randint(0, 1) for n in names}\n        net = []\n        for i in range(6):\n            op = random.choice(["AND", "OR", "XOR", "NOT"])\n            out = "t%d" % i\n            x = random.choice(names)\n            y = random.choice(names) if op != "NOT" else None\n            net.append([op, out, x, y])\n            names.append(out)\n        yield [net, vals]',
      refCode: 'def ref(net, vals):\n    v = dict(vals)\n    f = {"AND": lambda x, y: x & y, "OR": lambda x, y: x | y, "XOR": lambda x, y: x ^ y, "NOT": lambda x, y: 1 - x}\n    for op, out, a, b in net:\n        v[out] = f[op](v[a], v[b] if b is not None else 0)\n    return v',
      solution: 'def solve(netlist, values):\n    v = dict(values)\n    for op, out, a, b in netlist:\n        x = v[a]\n        y = v[b] if b is not None else 0\n        if op == "AND":\n            v[out] = x & y\n        elif op == "OR":\n            v[out] = x | y\n        elif op == "XOR":\n            v[out] = x ^ y\n        else:\n            v[out] = 1 - x\n    return v'
    }, 'This is what a logic simulator does, minus the scheduling. Because the gates arrive in evaluation order, one pass in order is enough: each gate reads values already written and writes one new value. Copying `values` into a fresh dictionary matters — a simulator that scribbles on the caller\'s input dictionary is a bug waiting to bite in the second test. Real simulators drop the "already in order" assumption and sort the network first, or re-evaluate gates until nothing changes.'),

    // =====================================================================================================
    // CODE: dictionaries and sets, and why they are fast
    // =====================================================================================================
    q.info('S', 'Finding something without searching for it', `You have 10,000 usernames and want the score for one of them. In a list you walk from the front, comparing as you go: about 5,000 comparisons for one lookup. Do that once per web request and the machine is doing nothing else.

A **dictionary** answers in a handful of steps however big it grows. \`d = {"ana": 7, "bo": 4}\`, and \`d["ana"]\` is 7.

The trick is that the key is never searched for. It is **computed with**. Python runs the key through a **hash function** — a scrambler that turns any key into a number — and that number picks a slot in a block of memory. Python jumps straight to that slot.

Two different keys can land in the same slot. That is a **collision**, and then Python does have to compare a few entries. Which is why the honest claim is "constant time **on average**", not "always".`, {
      terms: [
        ['Dictionary (map)', 'A collection of key → value pairs, looked up by key. Keys are unique.'],
        ['Key / value', 'The thing you look up by / the thing stored under it.'],
        ['Hash function', 'A scrambler that turns a key into a number. That number decides which slot the entry lives in.'],
        ['Collision', 'Two keys landing in the same slot. Python compares the few entries there to sort it out.'],
        ['O(1) on average', 'The typical cost does not grow with the size of the collection. The worst case, with many collisions, is slower.'],
      ],
      widget: W('repl', { lines: [['d = {"ana": 7, "bo": 4}', ''], ['d["ana"]', '7'], ['d["bo"] = 5', ''], ['d', "{'ana': 7, 'bo': 5}"], ['len(d)', '2'], ['"ana" in d', 'True'], ['"zoe" in d', 'False'], ['d.get("zoe", 0)', '0'], ['d["zoe"]', "!KeyError: 'zoe'"]] })
    }),
    q.num('S', 'For `d = {"a": 1}`, what does `d.get("b", 0)` return?', 0, '"b" is not a key, so the default 0 comes back. `d["b"]` would raise KeyError instead.'),
    q.mc('S', 'What does `d["z"]` do when `d` is a dictionary that has no key `"z"`?', ['raises KeyError', 'returns None', 'returns 0', 'adds "z" with the value None'], 0, 'Python refuses to invent a value, because a silently invented value hides your typo until it corrupts something far away. Use `.get()` when a missing key is normal.'),
    q.mc('S', 'Why is a dictionary lookup roughly constant time, whatever the size of the dictionary?', ['The key is hashed to a number that names the slot directly, so Python jumps there instead of scanning entries', 'Python keeps the keys sorted and binary-searches them', 'Dictionaries are limited to a few hundred entries', 'The interpreter caches every lookup you have already done'], 0, 'Computing an address beats searching for one. Collisions add a few comparisons, which is why the guarantee is on average rather than always.'),
    q.info('S', 'Why a key must never be able to change', `Follow the mechanism and a rule falls out for free.

Python hashed your key to decide **which slot** to store the entry in. If the key later changed, its hash would change, so the slot it *should* live in would change — but the entry would still be sitting in the old slot. You could never find it again. The data would not be lost; it would be unreachable.

Python refuses to let that happen. Only **immutable** things can be keys: numbers, strings, and tuples of immutable things. A list can be changed after you build it, so a list can never be a key. Try it and you get \`TypeError: unhashable type: 'list'\`.

When you want a compound key, use a tuple: \`d[(3, 4)] = "corner"\` is fine, \`d[[3, 4]]\` is not.

One consequence that surprises everyone: equal keys are the *same* key. \`1\`, \`1.0\` and \`True\` are all equal, so a dictionary keeps only one of them.`, {
      terms: [
        ['Immutable', 'Cannot be changed after it is built: int, float, str, tuple. Lists and dictionaries are mutable.'],
        ['Hashable', 'Has a hash that never changes, so it can be a dictionary key or a set member.'],
        ['Tuple', 'A fixed sequence written with commas: (3, 4). The immutable cousin of a list, so it can be a key.'],
        ['TypeError: unhashable', "Python's way of saying you tried to use something changeable as a key."],
      ],
      widget: W('repl', { lines: [['d = {}', ''], ['d[(3, 4)] = "corner"', ''], ['d[(3, 4)]', "'corner'"], ['d[[3, 4]] = "oops"', "!TypeError: unhashable type: 'list'"], ['e = {1: "one"}', ''], ['e[True] = "two"', ''], ['e', "{1: 'two'}"], ['len({1, 1.0, True, 2})', '2']] })
    }),
    q.multi('S', 'Which of these can be used as a dictionary key in Python?', ['the integer 7', 'the string "seven"', 'the tuple (7, 8)', 'the list [7, 8]'], [0, 1, 2], 'Keys must be immutable so their hash can never change; otherwise the entry would end up in the wrong slot and become unreachable. A list is mutable, so Python raises TypeError: unhashable type.'),
    q.num('S', 'What does `len({1, 1.0, True, 2})` evaluate to?', 2, '1, 1.0 and True are all equal, so they hash to the same slot and the set keeps one of them. The set is {1, 2}: two elements.'),
    q.info('S', 'Counting things, and the empty case', `This is the job dictionaries were born for: how many times does each thing appear?

\`\`\`
def counts(items):
    d = {}
    for x in items:
        d[x] = d.get(x, 0) + 1
    return d
\`\`\`

Read \`d.get(x, 0)\` as "the count for x, or 0 if x is not there yet". That one call covers both the first sighting of an item and every later one, with no special case.

The cost is one hash and one jump per item, so counting a million items takes a million cheap steps — not a million searches.

Now the case an interviewer will ask about: what is \`counts([])\`? The loop body never runs, so you get \`{}\`: an empty dictionary. Not \`None\`, not an error. Deciding that on purpose, writing it down, and testing it is the difference between code that works and code that is *specified*.`, {
      terms: [
        ['d.get(k, default)', 'Return d[k] if the key exists, otherwise the default. Never raises.'],
        ['Frequency map', 'A dictionary from item to how many times it appeared.'],
        ['Empty input', 'The zero-item case. Decide what it returns, state it, and test it.'],
        ['Accumulator', 'A variable (here a dictionary) that carries the answer-so-far through a loop.'],
      ],
      widget: W('freqcount', { items: ['a', 'b', 'a', 'c', 'b', 'a'] })
    }),
    q.mc('S', 'You want to count how many times each word appears in a list of 100,000 words. The right tool is…', ['a dictionary mapping word → count', 'a list of the words', 'a set of the words', 'a single string'], 0, 'One hash and one jump per word. A set forgets counts; searching a list for each word would take about 5 billion comparisons.'),
    q.mc('S', 'A frequency counter written as `d = {}` then a loop doing `d[x] = d.get(x, 0) + 1` is called with an empty list. What comes back?', ['`{}` — an empty dictionary', '`None`', '`0`', 'a KeyError'], 0, 'The loop body never runs, so the dictionary created before the loop is returned unchanged. Returning the empty accumulator is the natural answer, and it should be a named test case.'),
    q.info('S', 'Sets: the keys with the values thrown away', `A **set** is a dictionary that only remembers the keys. Same hashing, same fast membership test, no values attached.

\`{1, 2, 3}\` is a set. \`set([1, 1, 2, 2, 2, 3])\` is \`{1, 2, 3}\`.

Duplicates vanish, and not as a convenience feature. Each value hashes to one slot, so the second 1 arrives at the slot where the first 1 already sits, finds an equal value there, and there is nowhere else for it to go. A set *cannot* hold a value twice.

Because the slot is chosen by a hash, a set has no order. Never rely on the order you happen to see when printing one.

And \`x in s\` costs the same single jump as a dictionary lookup. That is what makes a set the right answer to "have I seen this before?" — the question behind duplicate detection, visited-node tracking and most deduplication code.`, {
      terms: [
        ['Set', 'An unordered collection of unique, hashable values. Written {1, 2, 3}, built with set(...).'],
        ['Membership test', '`x in s`: one hash and one jump for a set, a full scan for a list.'],
        ['Unordered', 'A set has no positions and no reliable order. You cannot index it.'],
        ['Union / intersection / difference', 'a | b (in either), a & b (in both), a - b (in a but not b).'],
      ],
      widget: W('setops', { A: [3, 1, 4, 1, 5], B: [1, 5, 9, 2, 5] })
    }),
    q.num('S', 'What does `len(set([1, 1, 2, 2, 2, 3]))` evaluate to?', 3, 'A set holds each value once: {1, 2, 3}. The repeats hash to slots that are already occupied by an equal value, so there is nowhere for them to go.'),
    q.num('S', 'What does `len({1, 2, 3} & {2, 3, 4})` evaluate to?', 2, '`&` is intersection: the values in both sets, {2, 3}. Two of them.'),
    q.mc('S', 'Which claim about a Python set is true?', ['It has no reliable order, so you cannot index it with s[0]', 'It keeps its items in the order you inserted them', 'It keeps its items sorted', 'It can hold the same value twice'], 0, 'The slot an item lands in is decided by its hash, not by when you added it. If you need order, keep a list alongside the set.'),
    q.info('S', 'Same job, two speeds', `Remove the duplicates from a list of n items, keeping the first appearance of each. Two versions, one word different.

Keep the already-seen values in a **list**, and every \`if x in seen\` walks that list from the front. The walks get longer as the list grows; in total it is roughly n²/2 comparisons. At n = 50,000 that is over a billion.

Keep them in a **set**, and each check is one hash and one jump, no matter how many values are already in there. The total work grows in step with n. At n = 50,000 that is 50,000 cheap steps, and it finishes before you notice.

Same code shape, same output, one word different, and the gap between instant and a coffee break.

This is the first place where the *data structure*, not the cleverness of the loop, decides whether a program is usable. It will not be the last.`, {
      terms: [
        ['Linear time O(n)', 'Total work grows in step with the input size. Double the input, double the time.'],
        ['Quadratic time O(n²)', 'Work grows with the square of the input. Double the input, four times the time.'],
        ['Deduplicate', 'Keep one copy of each distinct value, usually in order of first appearance.'],
      ],
      widget: W('bigo', { n: 1024 })
    }),
    q.mc('S', 'Interview: a deduplication function keeps the already-seen values in a **list** and tests `if x in seen` for each of n items. What is its total running time, and what is the one-word fix?', ['O(n²), because each `in` scans the whole list; make `seen` a set and it becomes O(n)', 'O(n), because `in` is always constant time', 'O(n log n), because Python sorts the list first', 'O(n²), and there is no way to improve it'], 0, '`in` on a list is a scan; `in` on a set is a hash and a jump. Everything else in the function stays identical.'),
    q.mc('S', 'Interview: you are asked why Python forbids a list as a dictionary key. The mechanism-level answer is…', ['The slot an entry lives in is chosen from the key\'s hash; if the key could change, its hash would change and the entry would sit in the wrong slot, unreachable', 'Lists take too much memory to hash', 'Lists can contain other lists, and Python cannot recurse', 'It is an arbitrary restriction that other languages do not have'], 0, 'Immutability is not a style rule here, it is what makes the lookup work at all. Use a tuple when you need a compound key.'),
    q.num('S', 'Interview: what is `len(d)` after `d = {}`, then `d[0] = "a"`, then `d[False] = "b"`?', 1, 'In Python `False == 0` and they hash the same, so `d[False]` finds the entry `d[0]` already made and overwrites its value. The dictionary has one entry, `{0: "b"}`. The same trap makes `{1: "x"}[True]` return "x".'),
    q.code('S', 'Write `solve(items)`, a frequency counter: given a list of strings, return a dictionary mapping each distinct string to the number of times it appears. `solve(["a", "b", "a"])` must give `{"a": 2, "b": 1}`, and `solve([])` must give the empty dictionary `{}`. A list of 40,000 items must be counted within the time budget, so do not call `items.count(x)` for each item — that scans the whole list every time.', {
      fn: 'solve',
      starter: 'def solve(items):\n    d = {}\n    for x in items:\n        # add 1 to the count for x, treating a missing key as 0\n        pass\n    return d\n',
      tests: [
        { args: [['a', 'b', 'a', 'c', 'b', 'a']], expect: { a: 3, b: 2, c: 1 } },
        { args: [[]], expect: {}, name: 'empty input gives an empty dictionary' },
        { args: [['x']], expect: { x: 1 }, name: 'a single item' },
        { args: [['q', 'q', 'q', 'q']], expect: { q: 4 }, name: 'every item the same' },
        { args: [['a', 'b', 'c']], expect: { a: 1, b: 1, c: 1 }, name: 'no repeats at all' },
        { args: [['', '', 'a']], expect: { '': 2, a: 1 }, name: 'the empty string is a perfectly good key' },
      ],
      gen: 'def gen():\n    for _ in range(40):\n        n = random.randint(0, 30)\n        yield [[random.choice("abcde") for _ in range(n)]]',
      refCode: 'def ref(items):\n    d = {}\n    for x in items:\n        d[x] = d.get(x, 0) + 1\n    return d',
      speed: { gen: 'def gen():\n    return [[random.choice("abcdefghij") for _ in range(40000)]]', budgetMs: 2000, label: '40,000 items' },
      solution: 'def solve(items):\n    d = {}\n    for x in items:\n        d[x] = d.get(x, 0) + 1\n    return d'
    }, 'One hash and one jump per item, so the work grows in step with the list: 40,000 items, 40,000 cheap steps. The `items.count(x)` version re-scans the whole list for every item and does about 40,000 × 40,000 = 1.6 billion comparisons instead. `d.get(x, 0)` removes the "first time I have seen this" special case; `d[x] += 1` alone would raise KeyError on the first sighting. The empty list returns `{}` because the loop body simply never runs.'),

    // =====================================================================================================
    // MATHS: independence
    // =====================================================================================================
    q.info('M', 'When one thing tells you nothing about another', `Flip a coin, then roll a die. Whatever the coin did, the die still has six equally likely faces. The coin carried no information about the die.

That is **independence**, and it is a claim about information, not about time or causes. Two events are independent when learning that one of them happened would not make you change your bet on the other.

The test is numerical: A and B are independent exactly when

**P(A and B) = P(A) · P(B)**.

Two fair flips: P(heads on both) = ½ × ½ = ¼. Check it by listing the four equally likely sequences HH, HT, TH, TT — one of them is HH.

Be careful with the word. In ordinary speech "independent" means "unconnected". Here it means one specific arithmetic fact, and events can pass the test while looking thoroughly connected.`, {
      terms: [
        ['Independent', 'P(A and B) = P(A)·P(B). Knowing one event happened does not change your probability for the other.'],
        ['Multiplication rule', 'For independent events, the probability that all of them happen is the product of their probabilities.'],
        ['Dependent', 'Not independent: knowing one event happened shifts the probability of the other. Drawing cards without replacement is dependent.'],
      ],
      widget: W('coins', { n: 2 })
    }),
    q.num('M', 'A fair coin is flipped twice. P(both flips are heads) = ?', 0.25, 'The flips do not influence each other, so the probabilities multiply: ½ × ½ = ¼. Listing works too: HH is one of the four equally likely sequences HH, HT, TH, TT.', { display: '1/4' }),
    q.num('M', 'A fair coin is flipped twice. P(at least one head) = ?', 0.75, 'Easier through the complement: "no head" is TT, probability ½ × ½ = ¼. So 1 − ¼ = ¾.', { display: '3/4' }),
    q.num('M', 'A fair coin is flipped three times. P(all three are heads) = ?', 0.125, 'Each flip is independent of the others: ½ × ½ × ½ = 1/8. Equivalently HHH is one of 2³ = 8 equally likely sequences.', { display: '1/8' }),
    q.mc('M', 'Which statement is the definition of "events A and B are independent"?', ['P(A and B) = P(A)·P(B)', 'P(A or B) = P(A) + P(B)', 'A and B cannot both happen', 'P(A) = P(B)'], 0, 'The product rule is the definition. The sum rule belongs to mutually exclusive events, which is a different (in fact opposite) situation.'),
    q.info('M', 'Why the probabilities multiply', `The product rule is not an extra assumption bolted on. It falls out of counting cells.

Roll a red die and a blue die: 36 equally likely outcomes, as on Day 1. Let A be "the red die shows 5 or 6", which is 2 **rows** of the grid. Let B be "the blue die is even", which is 3 **columns**.

"A and B" is the block where those rows and columns cross: 2 × 3 = 6 cells. So P(A and B) = 6/36. And P(A) = 2/6, P(B) = 3/6, whose product is also 6/36.

The multiplication came from the rectangle: rows × columns. Whenever one event is decided entirely by the first die and the other entirely by the second, the favourable outcomes form a rectangle, and the sides multiply.

When two events pull on the *same* die, there is no rectangle, and multiplying is simply wrong.`, {
      terms: [
        ['Joint probability', 'P(A and B): the probability that both happen. Also written P(A ∩ B).'],
        ['Rectangle of outcomes', 'When A depends only on one experiment and B only on another, the outcomes where both hold form a block: (rows) × (columns).'],
        ['Sample space', 'Every possible outcome, listed once. Two dice: 36 ordered pairs.'],
      ],
      widget: W('dice', { event: (a, b) => a >= 5 && b % 2 === 0, eventName: 'red is 5 or 6, and blue is even', cond: () => true, condName: 'none' })
    }),
    q.num('M', 'A red die and a blue die are rolled. P(the red die shows 5 or 6 **and** the blue die is even) = ?', 6 / 36, 'Two rows crossed with three columns give a 2 × 3 = 6 cell block, out of 36. Equivalently (2/6) × (3/6) = 6/36 = 1/6.', { display: '6/36 = 1/6' }),
    q.num('M', 'Two fair dice are rolled. P(both dice show an even number) = ?', 0.25, 'Each die is even with probability 3/6 = ½, and the dice do not influence each other: ½ × ½ = ¼. Counting agrees: 3 × 3 = 9 cells out of 36.', { display: '9/36 = 1/4' }),
    q.info('M', "Independent is the opposite of \"cannot both happen\"", `These two get swapped constantly, and they are close to opposites.

**Mutually exclusive** means the events share no outcome: if one happens, the other cannot. A single die cannot show a 2 and a 5 at the same time.

But that is enormous information. Being told the die showed a 2 takes your probability for "it showed a 5" from 1/6 straight to 0. Far from telling you nothing, it settles the matter completely.

So two events with non-zero probability that cannot both happen are always **dependent**. Check the arithmetic on one die: P(2 and 5) = 0, but P(2)·P(5) = 1/36. Zero is not 1/36, so the product rule fails.

The bookkeeping to keep straight: mutually exclusive events **add** for "or". Independent events **multiply** for "and". Different situations, different words, different operation.`, {
      terms: [
        ['Mutually exclusive (disjoint)', 'The events share no outcome, so they cannot both happen. Then P(A or B) = P(A) + P(B).'],
        ['"Or" versus "and"', 'Adding answers "at least one of them"; multiplying answers "both of them", and only when they are independent.'],
      ]
    }),
    q.tf('M', 'A single fair die is rolled once. The events "the die shows 2" and "the die shows 5" are independent.', false, 'They cannot both happen, so P(both) = 0, while P(2)·P(5) = 1/36. The product rule fails, so they are dependent — in fact maximally so: learning one settles the other.'),
    q.mc('M', 'Events A and B are mutually exclusive and both have probability greater than zero. What follows?', ['They are dependent, because P(A and B) = 0 while P(A)·P(B) > 0', 'They are independent, because they do not interact', 'They are independent only if P(A) = P(B)', 'Nothing can be said'], 0, 'Being told A happened drops B to impossible. That is the strongest possible dependence, and the arithmetic agrees.'),
    q.info('M', 'Independence is a test, not a story', `Two fair dice, one red and one blue. Let A be "the sum is 7" and B be "the red die shows 1". Surely the sum depends on the red die?

Count instead of guessing. P(A) = 6/36 = 1/6. P(B) = 1/6. Both together is the single cell (1, 6), so 1/36. And 1/6 × 1/6 = 1/36. They pass the test: **independent**.

The reason is that whatever the red die shows, exactly one blue value completes a 7. Knowing the red die genuinely tells you nothing about your chance of a seven.

Change the target sum to 8 and it collapses. With red = 1, no blue value reaches 8, so P(both) = 0, while P(A)·P(B) = (5/36)(1/6) is not 0. **Dependent**.

So never decide independence by whether the events *feel* related. Multiply and compare. Engineers who assume two components fail independently because they look separate — same rack, same power supply, same faulty batch — are making exactly this mistake.`, {
      terms: [
        ['Testing independence', 'Compute P(A and B), compute P(A)·P(B), compare. Intuition about "relatedness" is not evidence.'],
        ['Common-cause failure', 'Two components that fail together because of something they share. It destroys the independence a reliability calculation assumed.'],
        ['Reliability', 'P(everything works). For n independent parts each working with probability p, it is pⁿ.'],
      ]
    }),
    q.mc('M', 'Two fair dice are rolled, one red and one blue. Are "the sum is 7" and "the red die shows 1" independent?', ['Yes: P(sum 7) = 1/6, P(red is 1) = 1/6, and P(both) = 1/36 = the product', 'No: the sum obviously depends on the red die', 'Yes, because the two dice are physically separate', 'No: P(both) = 0'], 0, 'The joint outcome is the single cell (1, 6): 1/36, which equals 1/6 × 1/6. Whatever the red die shows, exactly one blue value makes 7, so the red die carries no information about a seven.'),
    q.mc('M', 'Two fair dice are rolled, one red and one blue. Are "the sum is 8" and "the red die shows 1" independent?', ['No: P(both) = 0 but P(sum 8)·P(red is 1) = (5/36)(1/6), which is not 0', 'Yes, for the same reason that sum 7 and red = 1 are independent', 'Yes, because both dice are fair', 'No, but only because 8 is even'], 0, 'With red = 1 the largest sum is 7, so the two events cannot both happen. The product rule fails, so they are dependent. Independence is a numerical accident, not a property of "sum" events in general.'),
    q.num('M', 'A machine contains 5 components. Each works with probability 0.99, independently of the others, and the machine works only if every component works. P(the machine works), to 4 decimal places?', 0.9510, '0.99⁵ = 0.95099… ≈ 0.9510. Note the failure probability is nearly 5 × 1 % = 5 %, not 1 %: independent small risks add up almost linearly.', { tol: 0.0006 }),
    q.mc('M', 'Interview: "Each disk fails in a year with probability 0.01. We mirror two disks, so the pair fails with probability 0.01 × 0.01 = 0.0001." What is the weakest part of this argument?', ['It assumes the two failures are independent, but disks in one machine share a power supply, a temperature, a vibration environment and often a manufacturing batch', 'The multiplication is arithmetically wrong', 'Probabilities can never be multiplied', 'It should have added the probabilities instead'], 0, 'The arithmetic is fine; the assumption is not. Common causes are exactly what mirroring is supposed to survive, and they are what makes the true joint failure probability far larger than 10⁻⁴.'),
    q.num('M', 'Interview: a link drops each packet independently with probability 0.02, and the protocol sends every packet up to 3 times. P(a given packet is lost after all 3 attempts)?', 0.000008, 'All three attempts must fail, and they are independent: 0.02³ = 8 × 10⁻⁶. This is how a retry count is chosen — pick the smallest n whose pⁿ sits under your loss budget.', { tol: 0.0000005, display: '0.02³ = 8 × 10⁻⁶' }),
    q.num('M', 'Interview: a regression suite has 20 tests, each of which flakes (fails for no real reason) with probability 0.001, independently. P(at least one flake in a run), to 4 decimal places?', 0.0198, 'Go through the complement: P(no flake) = 0.999²⁰ = 0.98019, so P(at least one) ≈ 0.0198, close to 20 × 0.001 = 0.02. The linear estimate is a good approximation while n·p stays small, and it fails badly once n·p approaches 1.', { tol: 0.0006 }),

    // =====================================================================================================
    // DEGREE: Kirchhoff's laws (EEEN11101 / E01)
    // =====================================================================================================
    q.info('E', 'Charge cannot pile up at a junction', `Three wires meet at a point. 2 A flows in along one and 3 A in along another. What comes out of the third?

5 A, and there is nothing else it could be. A junction of wires is just metal, and it has nowhere to put charge. Any charge that arrived and stayed would build a voltage there, and that voltage would push back on the incoming current until the pile-up stopped. In the ideal model that happens instantly and perfectly, so the books balance exactly.

That is **Kirchhoff's current law**: at any junction, the current flowing in equals the current flowing out. It is conservation of charge, written for one point in a circuit. Nothing more.

The word for such a junction is **node**. Everything joined by unbroken wire is *one* node, because an ideal wire has no resistance and so no voltage across it.`, {
      terms: [
        ['Node', 'A junction of two or more components. Every point reachable without passing through a component is the same node.'],
        ['KCL', "Kirchhoff's current law: the currents into a node sum to the currents out of it."],
        ['Conservation of charge', 'Charge is never created or destroyed, only moved. KCL is that fact applied to one point.'],
        ['Ideal wire', 'A wire with zero resistance, so zero voltage across it, so both ends are at the same potential.'],
      ],
      widget: W('kcl', { I1: 2, I2: 3 })
    }),
    q.num('E', 'At a node, 2 A and 3 A flow **in** along two wires and a third wire is the only other connection. How many amperes flow **out** along the third wire?', 5, 'KCL: what goes in must come out. 2 + 3 = 5 A.', { unit: 'A' }),
    q.num('E', 'At a node, 4 A flows **in** along one wire, and two of the other three wires carry 1.5 A and 0.5 A **out**. How many amperes flow out along the remaining wire?', 2, 'The currents out must total the 4 A in: 4 − 1.5 − 0.5 = 2 A.', { unit: 'A' }),
    q.num('E', 'A node has exactly three wires. One carries 3 A **in**, another carries 5 A **out**. What current, in amperes, flows **in** along the third wire?', 2, '5 A leaves but only 3 A arrives on the first wire, so the third must bring the missing 2 A in. If you had guessed the arrow the other way you would get −2 A, which says the same thing.', { unit: 'A' }),
    q.mc('E', "Kirchhoff's current law is a statement of…", ['conservation of charge: a junction has nowhere to store charge, so what flows in must flow out', 'conservation of energy', "Ohm's law applied to a node", 'a convention that engineers agreed on for convenience'], 0, 'Charge that stayed at a node would build a voltage that immediately pushed back. In the ideal model the balance is exact.'),
    q.info('E', 'A loop brings you back to the same height', `Day 1's picture: voltage is electrical height, and a battery is a pump that lifts each coulomb.

Now walk once around any closed loop of a circuit and return to where you started. You are at the same point, so you are at the same height. Every climb you made on the way must be cancelled by the drops.

That is **Kirchhoff's voltage law**: around any closed loop, the rises equal the drops, so the signed sum of voltages is zero.

It is conservation of energy, counted per coulomb. Every joule a source hands to a coulomb is given back to the components on the way round, so the coulomb arrives home with exactly what it left with.

One honest caveat for later in your degree: this holds when no *changing* magnetic field passes through your loop. In transformers, and on fast digital boards, that assumption is precisely the one that fails.`, {
      terms: [
        ['Loop', 'Any closed path through a circuit that returns to its starting point.'],
        ['KVL', "Kirchhoff's voltage law: the signed sum of voltages around any closed loop is zero."],
        ['Rise / drop', 'Gaining potential (walking through a source from − to +) / losing it (walking across a resistor with the current).'],
        ['Conservation of energy', 'Energy is never created or destroyed. KVL is that fact counted per coulomb of charge.'],
      ]
    }),
    q.num('E', 'A 12 V battery drives a current around a single loop containing exactly two resistors. One resistor is measured to drop 5 V. How many volts does the other drop?', 7, 'KVL: the 12 V rise must be cancelled by the drops, so 12 = 5 + x and x = 7 V.', { unit: 'V' }),
    q.mc('E', "Kirchhoff's voltage law is a statement of…", ['conservation of energy per coulomb: walk a loop and you return to the potential you started at', 'conservation of charge', 'the fact that resistors always drop voltage', 'a rule that only applies to loops containing a battery'], 0, 'Voltage is joules per coulomb. Returning to the same point means returning to the same energy per coulomb, so the rises and drops must cancel.'),
    q.mc('E', 'Two resistors are joined end to end, and nothing else connects to the joint between them. What does KCL tell you about that joint?', ['The current leaving one resistor equals the current entering the other, so both carry the same current', 'The two currents add', 'The joint stores charge until the currents balance', 'Nothing, because KCL needs at least three wires'], 0, 'With only two connections KCL says in = out. That is exactly why components strung in a single path all carry one common current.'),
    q.info('E', 'Choose the arrows first, then let the signs report back', `You cannot write an equation about a current until you have said which direction counts as positive. So draw an arrow, guess freely, and let the algebra correct you.

Here is a full worked loop. One 12 V source, then a 3 Ω resistor, then a 4 V source connected so that it opposes the first, then a 5 Ω resistor, all in one ring. Take clockwise as positive.

Walk clockwise from one corner:

- through the 12 V source from − to +: a **rise** of 12
- across the 3 Ω resistor in the direction of the current: a **drop** of 3I (Day 1's passive sign convention)
- through the 4 V source from + to −: a **drop** of 4
- across the 5 Ω resistor: a **drop** of 5I

So 12 − 3I − 4 − 5I = 0, giving I = 1 A.

Positive, so the current really does run clockwise. Had it come out as −1 A, the honest reading would be 1 A the other way.`, {
      terms: [
        ['Reference direction', 'The arrow you choose before solving. A negative answer means the real current runs against it, and nothing is wrong.'],
        ['Loop equation', 'KVL written out for one loop, with every term signed by the direction you walked.'],
        ['Opposing source', 'A source connected so that walking with the current takes you from + to −: it takes energy out of the loop instead of adding it.'],
      ],
      widget: W('kvlloop', { V1: 12, V2: 4, R1: 3, R2: 5 })
    }),
    q.mc('E', 'You draw a current arrow through a resistor, solve the circuit, and get I = −2 A. This means…', ['2 A flows in the direction opposite to your arrow', 'the circuit is impossible', 'the resistance must be negative', 'you must redo the calculation with the arrow reversed before the answer is valid'], 0, 'The sign reports the direction relative to your chosen arrow. Guessing is the whole point of a reference direction, and the algebra corrects the guess for free.'),
    q.num('E', 'Exam-style: a single loop contains a 12 V source, a 3 Ω resistor, a 5 Ω resistor, and a 4 V source connected so that it opposes the 12 V source. Find the loop current, in amperes.', 1, 'Walking the loop: 12 − 3I − 4 − 5I = 0, so 8 = 8I and I = 1 A. The two sources oppose, so only the 8 V difference drives the loop.', { unit: 'A' }),
    q.num('E', 'Exam-style: a single loop contains a 12 V source, a 3 Ω resistor, a 5 Ω resistor and an opposing 4 V source, and carries 1 A. How many watts does the **4 V source** absorb?', 4, 'Current is pushed into its + terminal, so under the passive sign convention its power is +4 V × 1 A = 4 W: it is being charged. Check the balance: the 12 V source delivers 12 W, and 3 W + 5 W + 4 W = 12 W is absorbed.', { unit: 'W' }),
    q.num('E', 'Exam-style: a single loop contains a 24 V source and three resistors of 2 Ω, 4 Ω and 6 Ω. Find the loop current, in amperes.', 2, 'KVL: 24 = 2I + 4I + 6I = 12I, so I = 2 A. Only one path exists, so the same current flows in all three resistors.', { unit: 'A' }),
    q.num('E', 'Exam-style: a single loop contains a 24 V source and three resistors of 2 Ω, 4 Ω and 6 Ω, carrying 2 A. Find the voltage across the **6 Ω** resistor, in volts.', 12, 'V = I·R = 2 × 6 = 12 V. Check with KVL: 4 V + 8 V + 12 V = 24 V, the full source voltage.', { unit: 'V' }),
    q.num('E', 'Exam-style: a single loop contains a 24 V source and three resistors of 2 Ω, 4 Ω and 6 Ω, carrying 2 A. Find the power dissipated in the **4 Ω** resistor, in watts.', 16, 'P = I²R = 2² × 4 = 16 W. (Or V = 8 V across it, so P = 8 × 2 = 16 W.)', { unit: 'W' }),
    q.num('E', 'Exam-style: a single loop contains a 24 V source and three resistors of 2 Ω, 4 Ω and 6 Ω, carrying 2 A. Find the total power delivered by the source, in watts.', 48, 'P = V·I = 24 × 2 = 48 W. The resistors take 8 W + 16 W + 24 W = 48 W, which is KVL and conservation of energy saying the same thing twice.', { unit: 'W' }),
    q.num('E', 'Exam-style: a single loop contains two 9 V sources connected so that they **aid** each other, in series with a single 6 Ω resistor. Find the current, in amperes.', 3, 'Walking the loop gives 9 + 9 − 6I = 0, so I = 18/6 = 3 A. Aiding sources add their voltages; opposing ones subtract.', { unit: 'A' }),
    q.mc('E', 'One unbroken length of wire joins the top of a resistor, the top of a capacitor and the positive terminal of a battery, with no component in between. How many nodes are involved?', ['One: an ideal wire has no voltage across it, so every point on it is at the same potential', 'Three, one per component terminal', 'Two, because a battery terminal is special', 'None, because a node needs at least four wires'], 0, 'Node counting is about electrical connectivity, not about how long or bent the wire looks on the page. Treating those three terminals as separate nodes is a classic source of lost marks in nodal analysis.'),
    q.num('E', 'Exam-style: a single loop contains a 20 V source in series with an 8 Ω resistor and a 12 Ω resistor. Find the current, in amperes.', 1, 'KVL round the loop: 20 = 8I + 12I = 20I, so I = 1 A. One path means one common current.', { unit: 'A' }),
    q.num('E', 'Exam-style: a single loop contains a 20 V source in series with an 8 Ω resistor and a 12 Ω resistor, carrying 1 A. Find the voltage across the **8 Ω** resistor, in volts.', 8, 'V = I·R = 1 × 8 = 8 V. Check: 8 V + 12 V = 20 V, the whole source voltage, as KVL demands.', { unit: 'V' }),
    q.tf('E', "Kirchhoff's voltage law holds around any closed loop, even one with a rapidly changing magnetic field passing through it.", false, 'A changing magnetic flux through the loop induces an EMF around it (Faraday), so the voltages no longer sum to zero. KVL is the correct low-frequency approximation, which is why transformer and fast-edge problems need different tools.'),
    ...genius(q, 3),
  ]
};
