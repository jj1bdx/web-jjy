# web-jjy

This fork of web-jjy focuses on `jjy-audible.js`, an audio-generation script synchronizing with the Japan's Standard Frequency Station(s) JJY.

## Usage

Check the `index.html` script for how to embed the `jjy.js` (and `jjy-audible.js`) code.

## Disclaimer

As in the MIT License:

> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Warning — listening volume

`jjy-audible.js` is included as a parallel variant of the scripts that emits a 1 kHz sine wave. It is intended for listening to the JJY frame, not for driving a radio-controlled clock. Each tone in the audible variant ramps up to a peak gain of **1.0** (full digital scale).

**Do not raise your system volume to maximum while listening to the audible variant**, especially through earphones or headphones — sustained 1 kHz tones at full digital scale can cause hearing discomfort or a temporary threshold shift. Start with the system volume low and adjust upward only as needed.

## Tested environment

Mac mini 2023 (M2 Pro) + Arc browser.

## License

Released under the MIT License. See [LICENSE.md](LICENSE.md).

## Related links

- [shogo82148/web-jjy](https://github.com/shogo82148/web-jjy)

## AI Usage

Claude Code is used to verify and fix the possible vulnerabilities, and to provide the language translation from Japanese to English.