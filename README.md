# web-jjy

Radio-controlled clocks set their time by receiving JJY, the Japanese standard-time radio signal that broadcasts time-of-day information.
web-jjy reproduces this signal in the browser, so you can set a radio-controlled clock even in places where the real JJY broadcast does not reach.

## Usage

A live demo is available at the [Web JJY simulator](http://shogo82148.github.io/web-jjy/).
Plug an antenna (an ordinary pair of earphones works fine) into your computer's headphone jack and place it near the radio-controlled clock.
Turn the volume up to maximum and press the **Start** button to begin transmitting the signal. Put the clock into forced-reception mode and wait for it to pick up the time.

This page does not adjust the computer's own clock, so it is a good idea to sync your computer with NTP beforehand.

## Disclaimer

No liability is accepted for any damage arising from use of this software.

## Tested environment

Confirmed to work with MacBook Air + Google Chrome 48.0.2564.116 + CITIZEN 8RZ152.

## How it works

The standard JJY signal is broadcast at 40 kHz or 60 kHz.
Wherever electric current flows, electromagnetic waves are produced, so feeding a signal at that frequency into a pair of earphones turns them into a serviceable antenna.

The catch is that ordinary audio amplifiers are not designed to reproduce frequencies above the human hearing range of about 20 kHz. The workaround is to exploit the harmonics present in a distorted waveform. When the volume is cranked up high enough that the sound clips, the audio signal becomes roughly a square wave. A 13.333 kHz square wave contains a component at three times that frequency — 39.999 kHz — so it can radiate at roughly 40 kHz.
For more detail, see the [JJY simulator freeware page](http://www.starstonesoft.com/jjy_simulator.htm) (in Japanese).

## License

Released under the MIT License. See [LICENSE.md](https://github.com/shogo82148/web-jjy/blob/gh-pages/LICENSE.md).

## Related links

- [shogo82148/web-jjy](https://github.com/shogo82148/web-jjy)
- [Emitting radio waves from a web browser](https://shogo82148.github.io/blog/2016/03/29/web-jjy/) (blog post, in Japanese)
- [Web JJY now supports summer time](https://shogo82148.github.io/blog/2018/08/11/web-jjy-summer-time-support/) (blog post, in Japanese)
