# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project language

Use English language with American spelling throughout the project.
All documents and source code comments in the repository must be written in English with American spelling.

## Old Japanese files

Japanese files under old-original-files must not be modified.

## Overview

web-jjy is a single-page static web app that emits the Japanese standard-time radio signal (JJY) through the audio output, so a nearby radio-controlled clock can sync. It is hosted at https://shogo82148.github.io/web-jjy/.

There is no build system, no package manager, no tests, and no linter. The project is plain HTML + vanilla JS served as-is. To work on it locally, open `index.html` in a browser (or serve the directory with any static server, e.g. `python3 -m http.server`).

## Deployment

The default branch **is** `gh-pages` — this repository serves GitHub Pages directly off the working branch. There is no separate `main`/`master`. Any commit pushed to `gh-pages` becomes live.

## Architecture

Two files do all the work:

- `index.html` — UI shell: Start/Stop button, summer-time checkbox, canvas, and Japanese explanatory copy. Loads `jjy.js`.
- `jjy.js` — Entire IIFE; everything below lives here.

### Signal generation (`schedule()` in jjy.js)

JJY broadcasts one frame per minute, one symbol per second (60 symbols, indices 0–59). Each symbol is a burst of carrier with three possible durations encoding marker / 1 / 0:

- marker `M`/`P0`–`P5` → 0.2 s burst
- bit `1` → 0.5 s burst
- bit `0` → 0.8 s burst

`schedule(date, summer_time)` builds **one full minute** of signal for the timestamp `date`:

1. Computes an `offset` so `ctx.currentTime + offset` lines up with the wall-clock start of `date`.
2. For each of the 60 second-slots, calls `marker(s)` or `bit(s, value, weight)`. Both create a fresh `OscillatorNode` at `freq = 13333` Hz, square wave, scheduled with `osc.start(t)` / `osc.stop(t + duration)`.
3. The 13.333 kHz square-wave carrier is intentional: amplifier clipping produces a 3rd harmonic at ~39.999 kHz, the actual JJY-40 radio frequency. **Do not "fix" the 13333 Hz value** — the audible square wave is the antenna driver, not a bug.
4. The TCO bit layout (minute / hour / day-of-year / parity / summer-time / year / weekday / leap-second flags) follows the JJY frame spec; `bit()` performs BCD decomposition by repeatedly subtracting weights and also accumulates parity in the closure variable `pa`. `pa1` (hour parity) goes to second 36; `pa2` (minute parity) goes to second 37.

`schedule()` also returns an `array` of per-second durations used purely for the canvas visualizer.

### Scheduling loop (`start()` / `stop()`)

`start()` finds the next wall-clock minute boundary, schedules that minute's signal **one second early** so the first marker fires on time, then `setInterval(interval, 60_000)` enqueues each subsequent minute. All actual timing comes from Web Audio's `osc.start(t)` — `setTimeout`/`setInterval` only act as a coarse "schedule the next batch" trigger.

`stop()` calls `ctx.close()`, which cancels every pending OscillatorNode in that context. There is no per-oscillator bookkeeping.

### Leap seconds

`plus_leapsecond_list` is a hardcoded array of `Date` objects. `getleapsecond()` returns `1` if any entry falls within 31 days from now (encoded as a positive leap-second insertion notice at seconds 53–54 of the frame). The list must be updated by hand when a new leap second is announced; negative leap seconds are wired up in the encoder but cannot be triggered because there is no `minus_leapsecond_list`.

### Visualizer (`render()`)

A `requestAnimationFrame` loop reads the most recent `signal` array produced by `schedule()` and draws each second as a colored bar (red = marker, yellow = 1, green = 0; bright = current second, dim = others). Two rows of 30 columns. The visualizer reflects only the most recently scheduled minute, so during minute rollover it briefly shows the upcoming minute's data, not the one currently airing.
