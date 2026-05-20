// Original source:
// https://github.com/shogo82148/web-jjy
// License: MIT License
// See https://github.com/shogo82148/web-jjy/blob/gh-pages/LICENSE.md
// Modified by Kenji Rikitake, JJ1BDX
// to generate audible sine wave sounds

// 27-SEP-2025: add attack/decay timing for each tone output

(function() {
  "use strict";
  // make sound frequency really audible
  var freq = 1000;
  var ctx;
  var signal;

  var AudioContext = window.AudioContext || window.webkitAudioContext;

  // Leap second insersion list in Japan Standard Time.
  // Note: negative leap seconds are NOT supported by this implementation.
  // There is intentionally no minus_leapsecond_list; the encoder branch for
  // a negative leap second (LS1=1, LS2=0) is therefore unreachable. The IERS
  // has never announced a negative leap second, so this remains a theoretical
  // case in the JJY frame specification.
  var plus_leapsecond_list = [
    new Date(2017, 0, 1, 9)
  ];

  // Leap second
  // +1: to be inserted within one month
  // -1: to be deleted within one month
  function getleapsecond() {
    var now = Date.now();
    for (var i = 0; i < plus_leapsecond_list.length; i++) {
      var diff = plus_leapsecond_list[i] - now;
      if (diff > 0 && diff <= 31 * 24 * 60 * 60 * 1000) {
        return 1;
      }
    }
    return 0;
  }

  // Calculate event schedules
  function schedule(date, summer_time) {
    var now = Date.now();
    var start = date.getTime();
    var offset = (start - now) / 1000 + ctx.currentTime;
    var minute = date.getMinutes();
    var hour = date.getHours();
    var fullyear = date.getFullYear();
    var year = fullyear % 100;
    var week_day = date.getDay();
    var year_day = (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000) + 1;
    var array = [];
    var leapsecond = getleapsecond();
    // attack/decay time of audio in seconds
    var ramptime = 0.008;
    // parity bit
    var pa = 0;

    // Output the marker of the "s"th second of every minutes
    function marker(s) {
      var bittime = 0.2;
      array.push(bittime);
      var t = s + offset;
      if (t < 0) {
        return;
      }
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      // osc.type = "square";
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + ramptime);
      osc.start(t);
      gain.gain.setValueAtTime(1, t + bittime - ramptime);
      gain.gain.linearRampToValueAtTime(0, t + bittime);
      osc.stop(t + bittime);
    }

    // Output the bit and update the parity bit
    function bit(s, value, weight) {
      var b = value >= weight;
      var bittime = b ? 0.5 : 0.8;
      value -= b ? weight : 0;
      pa += b ? 1 : 0;
      array.push(bittime);
      var t = s + offset;
      if (t < 0) {
        return value;
      }
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      // osc.type = "square";
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + ramptime);
      osc.start(t);
      gain.gain.setValueAtTime(1, t + bittime - ramptime);
      gain.gain.linearRampToValueAtTime(0, t + bittime);
      osc.stop(t + bittime);
      return value;
    }

    // Marker
    marker(0);

    // Minute
    pa = 0;
    minute = bit(1, minute, 40);
    minute = bit(2, minute, 20);
    minute = bit(3, minute, 10);
    minute = bit(4, minute, 16);
    minute = bit(5, minute, 8);
    minute = bit(6, minute, 4);
    minute = bit(7, minute, 2);
    minute = bit(8, minute, 1);
    var pa2 = pa;

    // P1
    marker(9);

    // Hour
    pa = 0;
    hour = bit(10, hour, 80);
    hour = bit(11, hour, 40);
    hour = bit(12, hour, 20);
    hour = bit(13, hour, 10);
    hour = bit(14, hour, 16);
    hour = bit(15, hour, 8);
    hour = bit(16, hour, 4);
    hour = bit(17, hour, 2);
    hour = bit(18, hour, 1);
    var pa1 = pa;

    // P2
    marker(19);

    // Cumulative days since January the 1st
    year_day = bit(20, year_day, 800);
    year_day = bit(21, year_day, 400);
    year_day = bit(22, year_day, 200);
    year_day = bit(23, year_day, 100);
    year_day = bit(24, year_day, 160);
    year_day = bit(25, year_day, 80);
    year_day = bit(26, year_day, 40);
    year_day = bit(27, year_day, 20);
    year_day = bit(28, year_day, 10);

    // P3
    marker(29);

    year_day = bit(30, year_day, 8);
    year_day = bit(31, year_day, 4);
    year_day = bit(32, year_day, 2);
    year_day = bit(33, year_day, 1);

    // 0
    bit(34, 0, 1);
    // 0
    bit(35, 0, 1);
    bit(36, pa1 % 2, 1);
    bit(37, pa2 % 2, 1);
    // SU1
    bit(38, 0, 1);

    // P4
    marker(39);

    // SU2
    if (summer_time) {
      bit(40, 1, 1);
    } else {
      // Summer Time in effect
      // (No change within 6 days to the normal
      //  (non-Summer) Time)
      bit(40, 0, 1);
    }

    // Year
    year = bit(41, year, 80);
    year = bit(42, year, 40);
    year = bit(43, year, 20);
    year = bit(44, year, 10);
    year = bit(45, year, 8);
    year = bit(46, year, 4);
    year = bit(47, year, 2);
    year = bit(48, year, 1);

    // P5
    marker(49);

    // Day of the week
    week_day = bit(50, week_day, 4);
    week_day = bit(51, week_day, 2);
    week_day = bit(52, week_day, 1);

    // Leap Second
    if (leapsecond === 0) {
      // No leap second
      // 0
      bit(53, 0, 1);
      // 0
      bit(54, 0, 1);
    } else if (leapsecond > 0) {
      // Positive leap second
      // 1
      bit(53, 1, 1);
      // 1
      bit(54, 1, 1);
    } else {
      // Negative
      // 1
      bit(53, 1, 1);
      // 0
      bit(54, 0, 1);
    }

    // Four zeros
    bit(55, 0, 1);
    bit(56, 0, 1);
    bit(57, 0, 1);
    bit(58, 0, 1);

    // P0
    marker(59);

    return array;
  }

  var setupTimeoutId;
  var tickIntervalId;
  // var summer_time_input = document.getElementById("summer-time")
  var firstIntervalId;

  function start() {
    try {
      ctx = new AudioContext();
    } catch (e) {
      control_button.innerText = "Start";
      play_flag = false;
      alert("Audio could not be started: " + e.message);
      return;
    }
    var now = Date.now();
    var t = Math.floor(now / (60 * 1000)) * 60 * 1000;
    var next = t + 60 * 1000;
    // Set timer to the time a bit earlier
    // than zero second of every minute
    var delay = next - now - 1000;
    if (delay < 0) {
      t = next;
      delay += 60 * 1000;
    }

    // signal = schedule(new Date(t), summer_time_input.checked);
    // Hack: add the less-than-one-second delay
    // to align the starting time
    // TODO: must investigate why this works
    firstIntervalId = setTimeout(function() {
      // Defense-in-depth: stop() may have closed ctx between scheduling and firing.
      if (!ctx) {
        return;
      }
      signal = schedule(new Date(t), false);
    }, (delay - (Math.trunc(delay / 1000) * 1000)));

    // HACK: cancel before timeout is ignited
    setupTimeoutId = setTimeout(function() {
      interval();
      tickIntervalId = setInterval(interval, 60 * 1000);
    }, delay);

    function interval() {
      t += 60 * 1000;
      // signal = schedule(new Date(t), summer_time_input.checked);
      signal = schedule(new Date(t), false);
    }
  }

  function stop() {
    if (firstIntervalId) {
      clearTimeout(firstIntervalId);
      firstIntervalId = null;
    }
    if (setupTimeoutId) {
      clearTimeout(setupTimeoutId);
      setupTimeoutId = null;
    }
    if (tickIntervalId) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
    if (ctx) {
      ctx.close();
      ctx = null;
    }
    signal = undefined;
  }

  var control_button = document.getElementById("control-button");
  if (!control_button) {
    return;
  }
  var play_flag = false;

  control_button.addEventListener('click', function() {
    if (play_flag) {
      control_button.innerText = "Start";
      play_flag = false;
      stop();
    } else {
      control_button.innerText = "Stop";
      play_flag = true;
      start();
    }
  });

  var nowtime = document.getElementById('time');
  if (!nowtime) {
    return;
  }
  var canvas = document.getElementById('canvas');
  if (!canvas) {
    return;
  }
  var ctx2d = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;

  render();

  function render() {
    nowtime.innerText = new Date().toString();

    var i;
    ctx2d.clearRect(0, 0, w, h);
    if (!signal) {
      requestAnimationFrame(render);
      return;
    }
    var now = Math.floor(Date.now() / 1000) % 60;

    for (i = 0; i < signal.length; i++) {
      if (i == now) {
        if (signal[i] < 0.3) {
          ctx2d.fillStyle = "#FF0000";
        } else if (signal[i] < 0.7) {
          ctx2d.fillStyle = "#FFFF00";
        } else {
          ctx2d.fillStyle = "#00FF00";
        }
      } else {
        if (signal[i] < 0.3) {
          ctx2d.fillStyle = "#7F0000";
        } else if (signal[i] < 0.7) {
          ctx2d.fillStyle = "#7F7F00";
        } else {
          ctx2d.fillStyle = "#007F00";
        }
      }
      ctx2d.fillRect((i % 30) * 30, Math.floor(i / 30) * 100, 30 * signal[i], 80);
    }
    requestAnimationFrame(render);
  }

})();