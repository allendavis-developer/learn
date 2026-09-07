// Runs learner code (Python via Pyodide, or JavaScript) in a Web Worker with a hard timeout.
// Usage: const r = await runCode({ lang:'python', code, tests, speed, refCode, checker }) → { ok, results:[{name, ok, got, expect, ms}], speed:{ms, budgetMs, ok}, error }

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';

const workerSrc = `
let pyodideReady = null;
function loadPy(){ if(!pyodideReady){ importScripts('${PYODIDE_URL}'); pyodideReady = loadPyodide({ indexURL: '${PYODIDE_URL.replace('pyodide.js', '')}' }); } return pyodideReady; }

const HARNESS = \`
import json, time, random, traceback
def __run(spec):
    out = {"results": [], "speed": None, "error": None}
    ns = {}
    try:
        exec(spec["code"], ns)
    except Exception as e:
        out["error"] = "Your code did not run: " + traceback.format_exc().strip().splitlines()[-1]
        return out
    fn = ns.get(spec["fn"])
    if fn is None:
        out["error"] = "Define a function called " + spec["fn"]
        return out
    ref = None
    if spec.get("refCode"):
        rns = {}
        exec(spec["refCode"], rns)
        ref = rns.get("ref")
    checker = None
    if spec.get("checker"):
        cns = {}
        exec(spec["checker"], cns)
        checker = cns.get("check")
    tests = list(spec.get("tests") or [])
    if spec.get("gen"):
        gns = {"random": random}
        exec(spec["gen"], gns)
        random.seed(spec.get("seed", 1))
        for i, args in enumerate(gns["gen"]()):
            tests.append({"name": "random case %d" % (i+1), "args": list(args), "expect": None, "useRef": True})
    for t in tests:
        args = t.get("args", [])
        name = t.get("name") or ("solve(" + ", ".join(repr(a) for a in args)[:60] + ")")
        try:
            t0 = time.perf_counter()
            got = fn(*[__copy(a) for a in args])
            ms = (time.perf_counter() - t0) * 1000
            expect = t.get("expect")
            if t.get("useRef") and ref is not None:
                expect = ref(*[__copy(a) for a in args])
            if checker is not None:
                ok = bool(checker(args, got, expect))
            else:
                ok = got == expect or (isinstance(got, tuple) and list(got) == expect) or (isinstance(expect, list) and isinstance(got, list) and got == expect)
            out["results"].append({"name": name, "ok": ok, "got": repr(got)[:120], "expect": repr(expect)[:120], "ms": ms})
        except Exception as e:
            out["results"].append({"name": name, "ok": False, "got": "raised " + type(e).__name__ + ": " + str(e)[:100], "expect": repr(t.get("expect"))[:120], "ms": 0})
    sp = spec.get("speed")
    if sp and all(r["ok"] for r in out["results"]):
        gns = {"random": random}
        exec(sp["gen"], gns)
        random.seed(7)
        args = list(gns["gen"]())
        t0 = time.perf_counter()
        try:
            fn(*args)
            ms = (time.perf_counter() - t0) * 1000
            out["speed"] = {"ms": ms, "budgetMs": sp["budgetMs"], "ok": ms <= sp["budgetMs"], "label": sp.get("label", "")}
        except Exception as e:
            out["speed"] = {"ms": 0, "budgetMs": sp["budgetMs"], "ok": False, "label": "raised " + type(e).__name__}
    return out
def __copy(a):
    import copy
    return copy.deepcopy(a)
\`;

self.onmessage = async (e) => {
  const spec = e.data;
  try {
    if (spec.lang === 'js') {
      const results = []; let error = null;
      let fn;
      try { fn = new Function(spec.code + '\\nreturn ' + spec.fn + ';')(); } catch (err) { error = 'Your code did not run: ' + err.message; }
      if (!error) for (const t of spec.tests || []) {
        try { const t0 = performance.now(); const got = fn(...JSON.parse(JSON.stringify(t.args))); const ms = performance.now() - t0; const ok = JSON.stringify(got) === JSON.stringify(t.expect); results.push({ name: t.name || ('solve(' + t.args.map(a => JSON.stringify(a)).join(', ').slice(0, 60) + ')'), ok, got: JSON.stringify(got), expect: JSON.stringify(t.expect), ms }); }
        catch (err) { results.push({ name: t.name || 'case', ok: false, got: 'threw ' + err.message, expect: JSON.stringify(t.expect), ms: 0 }); }
      }
      self.postMessage({ ok: !error && results.every(r => r.ok), results, error, speed: null });
      return;
    }
    self.postMessage({ status: 'loading' });
    const py = await loadPy();
    self.postMessage({ status: 'running' });
    py.runPython(HARNESS);
    py.globals.set('__spec_json', JSON.stringify(spec));
    const res = py.runPython('json.dumps(__run(json.loads(__spec_json)))');
    const out = JSON.parse(res);
    out.ok = !out.error && out.results.length > 0 && out.results.every(r => r.ok) && (!out.speed || out.speed.ok);
    self.postMessage(out);
  } catch (err) {
    self.postMessage({ ok: false, results: [], error: 'Runner error: ' + (err && err.message || String(err)) });
  }
};
`;

let worker = null, warm = false;
function getWorker() {
  if (!worker) {
    const blob = new Blob([workerSrc], { type: 'application/javascript' });
    worker = new Worker(URL.createObjectURL(blob));
  }
  return worker;
}
export function warmUp() {
  if (warm) return;
  warm = true;
  try { getWorker(); runCode({ lang: 'python', code: 'def solve():\n    return 1', fn: 'solve', tests: [{ args: [], expect: 1 }] }, () => {}, 60000).catch(() => {}); } catch (e) { /* ignore */ }
}

let chain = Promise.resolve();
export function runCode(spec, onStatus = () => {}, timeoutMs = 8000) {
  const job = chain.then(() => runOne(spec, onStatus, timeoutMs));
  chain = job.catch(() => {});
  return job;
}
function runOne(spec, onStatus, timeoutMs) {
  return new Promise(resolve => {
    const w = getWorker();
    let done = false;
    let timer = null;
    const arm = ms => { clearTimeout(timer); timer = setTimeout(() => {
      if (done) return; done = true;
      w.terminate(); worker = null; warm = false;
      resolve({ ok: false, results: [], error: `Timed out after ${ms / 1000}s: an infinite loop, or far too slow. (The runner was restarted.)`, timeout: true });
    }, ms); };
    arm(timeoutMs);
    const handler = e => {
      if (e.data && e.data.status) { onStatus(e.data.status); if (e.data.status === 'loading') arm(120000); if (e.data.status === 'running') arm(timeoutMs); return; }
      if (done) return; done = true;
      clearTimeout(timer);
      w.removeEventListener('message', handler);
      resolve(e.data);
    };
    w.addEventListener('message', handler);
    w.postMessage(spec);
  });
}
