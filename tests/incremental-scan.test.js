/**
 * @fileoverview The incremental scan's yield path (#142)
 *
 * runAccessibilityChecks defaults to incremental. processNextChunk walks up to
 * CHUNK_SIZE elements, and bails out early when it has held the thread for
 * longer than CHUNK_DELAY:
 *
 *   if (performance.now() - chunkStartTime > INCREMENTAL_CONFIG.CHUNK_DELAY) {
 *     break;
 *   }
 *
 * After that break the remaining work is handed to requestAnimationFrame and
 * the call returns with the scan unfinished.
 *
 * That branch is the reason coverage for contentScript.js was not
 * reproducible: whether it executed depended on how long 25 elements happened
 * to take on a loaded machine, so the same tree measured 46.92% or 47.66%
 * depending on nothing but scheduling. Five runs in twenty crossed it.
 *
 * It is a worse problem than a wobbling number, and that is what this file is
 * really for. Every other suite asserting on a scan was racing the same 16ms:
 * with performance.now advancing, a scan returns LOGS.length === 0 and the
 * assertions run against nothing. It had not produced a false failure yet.
 *
 * So the clock is controlled rather than raced — here to force the yield, and
 * frozen in tests/highlighter.test.js and tests/ui-panels.test.js so their
 * scans always complete in one chunk. Timing decides nothing in either case.
 */

process.env.NODE_ENV = 'test';

Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });

require('../src/contentScript.js');

const realGetBoundingClientRect = Element.prototype.getBoundingClientRect;
const realPerformanceNow = performance.now;
const realRequestAnimationFrame = global.requestAnimationFrame;

/** Callbacks handed to requestAnimationFrame, so the test can drive them. */
let scheduled;

beforeAll(() => {
  Element.prototype.getBoundingClientRect = function () {
    return { top: 0, left: 0, width: 100, height: 50, right: 100, bottom: 50 };
  };
});

afterAll(() => {
  Element.prototype.getBoundingClientRect = realGetBoundingClientRect;
  performance.now = realPerformanceNow;
  global.requestAnimationFrame = realRequestAnimationFrame;
});

beforeEach(() => {
  scheduled = [];
  global.requestAnimationFrame = callback => {
    scheduled.push(callback);
    return scheduled.length;
  };
  document.body.innerHTML = '';
  global.LOGS.length = 0;
  global.resetThrottle();
});

afterEach(() => {
  performance.now = realPerformanceNow;
});

/**
 * Make every read of the clock appear `step` ms later than the last, which
 * forces the chunk to exceed CHUNK_DELAY on its first check.
 *
 * @param {number} step Milliseconds to advance per call.
 * @returns {void}
 */
function advanceClockBy(step) {
  let t = 0;
  performance.now = () => {
    t += step;
    return t;
  };
}

/** Freeze the clock so a chunk can never exceed CHUNK_DELAY. */
function freezeClock() {
  performance.now = () => 0;
}

/**
 * Run whatever requestAnimationFrame callbacks are pending, repeatedly, until
 * the scan stops scheduling more.
 *
 * @param {number} [limit] Safety cap on iterations.
 * @returns {number} How many callbacks ran.
 */
function drainScheduled(limit = 200) {
  let ran = 0;
  while (scheduled.length > 0 && ran < limit) {
    const pending = scheduled;
    scheduled = [];
    for (const callback of pending) {
      callback();
      ran += 1;
    }
  }
  return ran;
}

/** A page with more elements than one chunk can hold. */
const MANY_ELEMENTS =
  '<main>' + Array.from({ length: 40 }, (_, i) => `<img src="${i}.jpg">`).join('') + '</main>';

describe('a chunk that finishes inside its budget', () => {
  it('completes synchronously and schedules nothing', () => {
    freezeClock();
    document.body.innerHTML = '<main><img src="a.jpg"><img src="b.jpg"></main>';

    global.runAccessibilityChecks();

    expect(global.LOGS.length).toBe(2);
    expect(scheduled).toHaveLength(0);
  });
});

describe('a chunk that runs over its budget', () => {
  it('yields rather than blocking, leaving the scan unfinished', () => {
    // This is the branch that made coverage unreproducible, reached on purpose
    // instead of by luck.
    advanceClockBy(100); // CHUNK_DELAY is 16
    document.body.innerHTML = '<main><img src="a.jpg"><img src="b.jpg"></main>';

    global.runAccessibilityChecks();

    expect(global.LOGS.length).toBe(0);
    // The remaining work is queued, not dropped.
    expect(scheduled.length).toBeGreaterThan(0);
  });

  it('finishes once the frames it asked for actually run', () => {
    advanceClockBy(100);
    document.body.innerHTML = '<main><img src="a.jpg"><img src="b.jpg"></main>';

    global.runAccessibilityChecks();
    expect(global.LOGS.length).toBe(0);

    const ran = drainScheduled();

    expect(ran).toBeGreaterThan(0);
    // Same answer as the synchronous path: yielding must not lose findings.
    expect(global.LOGS.length).toBe(2);
  });

  it('reaches the same result as a scan that never yielded', () => {
    // Both arms drain. A frozen clock stops the loop exceeding CHUNK_DELAY, but
    // it does not make the scan synchronous: the chunk still ends after
    // CHUNK_SIZE elements and queues the remainder. On this 40-element page the
    // frozen arm finds 24 before its first assertion if you forget to drain,
    // which is how this test failed on its first run.
    freezeClock();
    document.body.innerHTML = MANY_ELEMENTS;
    global.runAccessibilityChecks();
    drainScheduled();
    const withoutYielding = global.LOGS.length;

    global.LOGS.length = 0;
    global.resetThrottle();
    scheduled = [];
    advanceClockBy(100);
    document.body.innerHTML = MANY_ELEMENTS;
    global.runAccessibilityChecks();
    drainScheduled();

    expect(withoutYielding).toBeGreaterThan(0);
    expect(global.LOGS.length).toBe(withoutYielding);
  });

  it('a page larger than one chunk never completes in a single call', () => {
    // Worth pinning separately, because it is the limit of what freezing the
    // clock buys: CHUNK_SIZE is 25, so anything bigger yields on element count
    // regardless of timing. The fixtures in the suites that freeze the clock
    // are all well under that.
    freezeClock();
    document.body.innerHTML = MANY_ELEMENTS;

    global.runAccessibilityChecks();
    const afterFirstCall = global.LOGS.length;
    drainScheduled();

    expect(afterFirstCall).toBeLessThan(global.LOGS.length);
  });
});

describe('when requestAnimationFrame is unavailable', () => {
  it('falls back to setTimeout', () => {
    // Service-worker-ish environments and older hosts have no rAF. The
    // fallback exists for that; nothing exercised it.
    const realSetTimeout = global.setTimeout;
    const timeouts = [];
    global.requestAnimationFrame = undefined;
    global.setTimeout = callback => {
      timeouts.push(callback);
      return timeouts.length;
    };

    try {
      advanceClockBy(100);
      document.body.innerHTML = '<main><img src="a.jpg"><img src="b.jpg"></main>';

      global.runAccessibilityChecks();

      expect(timeouts.length).toBeGreaterThan(0);
    } finally {
      global.setTimeout = realSetTimeout;
    }
  });
});
