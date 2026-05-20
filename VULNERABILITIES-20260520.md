# VULNERABILITIES.md — `jjy-audible.js`

Security and robustness review of `jjy-audible.js` (audible variant of `jjy.js`). All findings refer to the version dated 27-SEP-2025.

## Scope and threat model

`jjy-audible.js` is a client-side script with the following exposure profile:

- No network I/O (no `fetch`, `XMLHttpRequest`, `WebSocket`, `postMessage`, `EventSource`).
- No persistent storage (no `localStorage`, `sessionStorage`, `IndexedDB`, cookies).
- No external resources loaded at runtime; no `eval`, `Function(...)`, dynamic `import`, or `innerHTML` writes.
- One DOM read of `new Date().toString()` written via `innerText` (safe — `innerText` does not parse HTML).
- All inputs come from local browser APIs (`Date.now()`, the audio context's clock, the `summer-time` checkbox — and the variant ignores even that).

Because there is no attacker-controlled data path into the script, the realistic XSS / injection / CSRF surface is **effectively zero**. The findings below are robustness defects, race conditions, and defense-in-depth gaps rather than directly exploitable vulnerabilities. They are still worth fixing because they can cause uncaught exceptions, surprising UI states, or — in one case — hearing harm.

Each finding lists a severity rating using the convention: **High** = exploitable or causes data corruption; **Medium** = reproducible crash or user-visible incorrect state; **Low** = code smell with no current exploit path; **Info** = advisory.

---

## V1 — `firstIntervalId` is never canceled by `stop()` *(Medium)*

**Location:** `jjy-audible.js` lines 248–250 (creation), lines 265–275 (`stop()` does not clear it).

**Description:**
`start()` schedules two pending callbacks:

```js
firstIntervalId = setTimeout(function() {
  signal = schedule(new Date(t), false);  // reads ctx via closure
}, (delay - (Math.trunc(delay / 1000) * 1000)));

intervalId = setTimeout(function() { ... }, delay);
```

`stop()` calls `clearInterval(intervalId)` (which also cancels the pending setTimeout — `clearInterval` and `clearTimeout` are interchangeable per HTML spec), then sets `ctx = null`. But `firstIntervalId` is never cleared. If the user presses **Start** and then **Stop** within the sub-second remainder of `delay` (i.e., 0–999 ms, depending on when the click landed within the wall-clock minute), the pending `firstIntervalId` callback still fires. It then calls `schedule(...)`, which dereferences `ctx.currentTime` and `ctx.createOscillator()` on a now-`null` `ctx` — uncaught `TypeError` to the console.

**Impact:** Console exception on rapid Start→Stop. No audible glitch (the audio context is already closed), but the error pollutes diagnostics and could leak partial scheduling state into `signal`, which would then be drawn by the visualizer for the next animation frame until `stop()`'s `signal = undefined` line runs (it already ran by then — but the firstIntervalId callback runs *after* `stop()`, so it will *re-set* `signal` based on the stale, closed context). Net: the rendered visualization may briefly show a frame after the user pressed Stop, which is confusing.

**Fix:**

```js
function stop() {
  if (firstIntervalId) {
    clearTimeout(firstIntervalId);
    firstIntervalId = null;
  }
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (ctx) {
    ctx.close();
    ctx = null;
  }
  signal = undefined;
}
```

Defensive alternative: also guard the `firstIntervalId` callback body with `if (!ctx) return;`.

---

## V2 — `intervalId` is reused for two different timer types *(Low)*

**Location:** `jjy-audible.js` lines 253–256.

**Description:**
```js
intervalId = setTimeout(function() {
  interval();
  intervalId = setInterval(interval, 60 * 1000);
}, delay);
```

The variable `intervalId` first holds a `setTimeout` ID, then is overwritten with a `setInterval` ID by the timeout callback. This currently works because `clearInterval` and `clearTimeout` accept either type of ID. It is fragile: a future reader could "tidy" this by switching to `clearTimeout` only, breaking the second branch; and it makes the data flow harder to reason about.

**Impact:** No current bug. Maintenance hazard only.

**Fix:** Use two distinct variables — e.g., `setupTimeoutId` and `tickIntervalId` — and clear both in `stop()`.

---

## V3 — DOM lookups are not null-guarded *(Low)*

**Location:** `jjy-audible.js` lines 277, 292–294.

**Description:**
```js
var control_button = document.getElementById("control-button");
// ...
control_button.addEventListener('click', function() { ... });

var canvas = document.getElementById('canvas');
var ctx2d = canvas.getContext('2d');
```

If this script is loaded by a page that does not provide all of `#control-button`, `#time`, and `#canvas`, the IIFE throws on the first missing element and stops executing. The current `index.html` happens to define all three, but `jjy-audible.js` carries the `Original source: ...` header and is plainly intended to be reusable.

**Impact:** Loud failure on misconfigured hosts. Not exploitable; just brittle for reusers.

**Fix:** Add early-exit guards:

```js
var control_button = document.getElementById("control-button");
if (!control_button) return;  // inside IIFE
```

…and similar for `#time`, `#canvas`. If a host page intentionally omits the canvas, skip the visualizer rather than aborting the whole script.

---

## V4 — `new AudioContext()` is not wrapped in `try`/`catch` *(Low)*

**Location:** `jjy-audible.js` line 232 (inside the click handler at 280–290).

**Description:**
`start()` runs `ctx = new AudioContext()` without error handling. Browsers can throw here when:
- the user has disabled audio in browser settings,
- the per-tab AudioContext limit (e.g., 6 on Chrome) has been reached by other code,
- the browser is iOS Safari in a non-gesture context (unlikely here since the constructor is gated by a click, but possible in embedded scenarios).

If construction throws, the surrounding click handler has already executed `control_button.innerText = "Stop"` and `play_flag = true`, so the UI now claims the signal is playing but no context exists. Pressing Stop will then attempt `ctx.close()` on `undefined` (guarded by `if (ctx)`, so it is safe), but the audio never plays and there is no user-visible error.

**Impact:** Silent failure to transmit; user sees "Stop" button but no sound. They may believe the page is broken and try repeatedly.

**Fix:** Wrap construction, and if it throws, restore button state and surface a message:

```js
try {
  ctx = new AudioContext();
} catch (e) {
  control_button.innerText = "Start";
  play_flag = false;
  alert("Audio could not be started: " + e.message);
  return;
}
```

(Or set a `<span>` on the page instead of `alert`.)

---

## V5 — Unbounded amplitude can damage hearing *(Info — safety, not security)*

**Location:** `jjy-audible.js` lines 63–73 and 87–97.

**Description:**
Each tone uses `gain.gain.linearRampToValueAtTime(1, t + ramptime)` — a peak gain of **1.0** (full digital scale) at the device's current system volume. The `README.md` and `index.html` actively instruct users to "turn the volume up to maximum" (a direction inherited from `jjy.js`, where the high amplitude is required to drive a clipped 13.333 kHz square wave into ~40 kHz harmonics). In the audible variant the carrier is a 1 kHz sine — clearly audible and uncomfortable at full volume, especially through earbuds.

**Impact:** Real risk of hearing discomfort or temporary threshold shift if a user follows the original "maximum volume" instructions while listening to the audible variant.

**Fix (recommended in order):**
1. Cap the gain — for example `gain.gain.linearRampToValueAtTime(0.3, t + ramptime)` — and tune by ear.
2. Add a per-page volume slider that scales the gain target.
3. Update the explanatory copy when this variant is loaded so the "maximum volume" guidance is removed for the audible mode. The current `index.html` text still describes the antenna-driving workflow.

---

## V6 — Stale leap-second table *(Info — data integrity)*

**Location:** `jjy-audible.js` lines 18–21.

**Description:**
`plus_leapsecond_list` contains only `new Date(2017, 0, 1, 9)`. `getleapsecond()` returns 0 for any date more than 31 days after that entry — i.e., always, in 2026 and beyond. The encoder therefore never sets the LS1/LS2 announcement bits at seconds 53–54, even in the (currently theoretical) case that a future leap second is scheduled.

**Impact:** Functional drift, not a vulnerability. Receivers will never hear a leap-second warning from this transmitter even when the real JJY broadcasts one. Negative leap seconds remain unreachable because there is no `minus_leapsecond_list` (same as upstream).

**Fix:** Maintain `plus_leapsecond_list` against the IERS Bulletin C announcements; consider adding `minus_leapsecond_list` for completeness, or document explicitly that negative leap seconds are unsupported.

---

## V7 — No `'use strict'` *(Info — defense in depth)*

**Location:** Top of the IIFE, `jjy-audible.js` line 10.

**Description:**
The IIFE does not declare strict mode. Implicit globals (a typo like `signl = ...` would create `window.signl`), silent `this` coercion, and a few other footguns are enabled. The upstream `jjy.js` is identical in this respect.

**Fix:**
```js
(function() {
  "use strict";
  // ...
})();
```

Run the tests… er, run the page after adding it; nothing in the current code should break, but `"use strict"` would surface any typo that introduces an implicit global in future edits.

---

## Out of scope / non-issues considered and dismissed

The following were examined and judged not to be vulnerabilities of `jjy-audible.js` itself:

- **`render()` writes to `nowtime.innerText` every animation frame** — `innerText` does not parse HTML, and the source is `new Date().toString()`, which contains no user-controlled data. No XSS path.
- **Use of `Math.floor(Date.now() / 1000)` and `% 60`** — purely arithmetic, no overflow path within Number precision.
- **Multiple `AudioContext` instances over the lifetime of the page** — Each Start/Stop cycle creates a new context. Browsers allow this within the per-tab limit; `ctx.close()` releases the previous one.
- **The visualizer's `requestAnimationFrame` loop runs forever** — Including after `stop()`. It guards on `if (!signal)`, so it just clears the canvas and reschedules. No leak, no security concern.
- **`new Date(2017, 0, 1, 9)`** — uses local time, which means the boundary slides by host timezone. Functionally inherited from upstream `jjy.js`; not a vulnerability.

## Related host-page observations (not in `jjy-audible.js`)

These belong to `index.html` but affect the page that loads this script:

- **No Content Security Policy** — Adding `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'">` would prevent any future accidental inline-script or third-party-script regression.
- **`index.html` currently loads `jjy.js`, not `jjy-audible.js`.** If you switch the `<script src>`, also revise the "turn the volume up to maximum" copy (see V5).
- **Summer-time checkbox** is wired in HTML but ignored by `jjy-audible.js` (the variant hardcodes `false`). Either remove the checkbox when this variant is loaded, or restore the read of `summer_time_input.checked` to match user intent.
