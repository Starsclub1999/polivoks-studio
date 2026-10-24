# Audio implementation · 8.0

The base is the clean7.0 project. The former Newton/rational/ZDF filter has been
replaced in the modern bank path; it is not described as the native algorithm.
No7.3.4 sound-engine code or calibration/EQ was transplanted.

## Implemented from verified evidence

- 33 f64 oscillator bands,8000 phase samples per band, recovered harmonic counts,
  separate oscillator pulse duties, pitch-band blending and triangle phase warp.
  Tables are generated from Fourier equations once at module initialization.
- Exponential FM: oscillatorII output×.4×FM depth adds to oscillatorI octave CV.
- Native MIDI pitch reference is note36. Master tune and oscillatorII detune
  convert physical semitones to octave CV. Native fractional pitch quantization
  uses2400 subdivisions per octave.
- Attack target12.3V, transition at5V; filter sustain5×S, amp sustain3.535×S.
  Attack coefficient2/(144*timeMs+1), decay/release2/(48*timeMs+1), scaled48000/Fs.
  Loop threshold is.5V. Velocity contribution is squared.
- Filter slew=(.5−.47*Starve)×8; state rails−5/+3.5. Input drive=.3+Drive;
  output tanh gain=.3+2.5*AmpDrive². Resonance feedback follows the verified
  piecewise curve and crosses into self-oscillation at its upper end.
- Two independent four-biquad cascades surround the nonlinear filter. Exact f64
  coefficients are in audio/native-data.js. At48kHz,4× processing gives192kHz.
  Native oversampling thresholds are68000/188000Hz. Unsupported rates explicitly
  fail; the browser controller requests48kHz.
- A30Hz input high-pass and5Hz final DC rejection. Source-derived master level
  includes squared Volume; studio master and final overload protection remain.
- Native control power curves:27 nonlinear /38 linear slider declarations.
  All458 sourceValues objects remain preserved in js/soundbook.js.
- 20 native timing divisions; rate controls use reverse indexing, echo forward.
  ARP uses50% gate,1–4octaves and no repeated up/down endpoints.

## Web-specific behavior and remaining differences

The primary VCO/filter code is C compiled to WebAssembly with fixed memory and
f64 arithmetic. There is no allocation, module loading or decoding inside the C
render loop. JavaScript fallback uses the same equations and tables. Tanh uses
an interpolated f64 lookup; C exponent approximation is checked against the JS
filter. These numerical approximations are not a bit-identical native port.

Continuous controls retain browser smoothing. Voice stealing adds a short fade;
unison detune spread and exact allocation history are approximations. Native
pre-FX optional shaping branches and every FX internal have not been completely
ported. Phaser, flange/chorus, digital/tape/ping-pong echo and six reverb modes
remain independent browser processors. Their ranges, curves, radio states and
sync timing now match the recovered control metadata.

Original-mode compatibility processing, drum synthesis, recorder, limiter and
studio-wide effects are web implementations. The studio master is separate from
the plugin-derived Volume law. Exact native loudness, nonlinear phase response
and complete sonic identity require paired native/web renders with identical
patch, MIDI, sample rate and controller state; that comparison was not performed.

## Scheduling

LIVE runs in AudioWorklet. PCM modes use a module Worker and recycled buffers,
then a lightweight AudioWorklet sink. At48kHz the selected queue is roughly
43/128/341ms. AUTO benchmarks the16-voice/all-FX path; it does not guarantee a
particular machine's output deadline. The graph/device add their own latency.

Main-thread drawings and editors are separate from synthesis. Clean Tone uses
OscillatorNode to bypass synth/drum DSP. PCM underruns measure missing queued
samples, not USB/ASIO driver events. Web Audio does not expose a native ASIO host.

## Build

`node tools/build-core.cjs --cc /path/to/zig` rebuilds audio/core.wasm and the
identical embedded byte module. The build is freestanding, with no native DLL
execution or redistributed plugin binary. `python3 tools/build-offline.py`
embeds the current modules, font and MIDI into OPEN_FORMANTA.html.

## 8.1 verified timing / FX corrections

The source standalone clock is now separate from studio/MIDI tempo, with an explicit
link switch. Exact native FX LFO shape polarity, pulse range and the 20 Hz TPT lowpass
are restored. Wheel scaling follows the filter. Delay modulation adds 19.99 ms per
normalized source; spread is symmetric and final channel times clamp to 1..2000 ms.
The delay allocation therefore shrank from 50.05 to 2.025 seconds per channel.
Native skewed mix for echo/reverb and square-root chorus mix replace linear crossfades.
Reverb decay uses the full physical external modulation range. Main noise remains
broadband; main S&H now has the source triangular amplitude distribution.

Program revisions reset stale ARP deadlines and retire prior voices while preserving
held keys. Retiring voices use their last sample under the existing 6 ms de-click fade;
16 new voices no longer require 16 additional full VCO/filter renders on that transition.
Unused legacy frequency/filter calculations are skipped on the modern path; envelope
coefficients are shared across voices. Five fixed-seed renders before/after those two
unused-calculation optimizations matched exactly over 102400 output samples each.

See research/native-tempo-fx.md and native-noise-audit.md for addresses and uncertainties.
The chorus external modulation gate and the independent reverb algorithms remain
approximations. No running native plug-in A/B or bit-exact full-engine claim is made.

## 8.2 program restoration and telemetry

Factory parameter sets, source clock values and the synthesis core are retained. Corrected controller transfer curves and discrete destinations change only previously misinterpreted live mappings. Program selection restores complete source settings; live wheel/pressure/bend are neutralized for reproducible preset auditions.

Telemetry adds synth-only window peaks and independent main, FX, ARP, phaser, chorus, echo-time and echo-modulation phases. Packets are limited to roughly30Hz and use audio frame timestamps. PCM display waits until the corresponding playback position; inactive effect lamps do not extrapolate. Meter telemetry excludes the drum machine and is measured before the studio protection limiter. UI mechanics use a separate native Web Audio bus and do not enter the music PCM recorder. No queue length or profile latency was increased for these UI features.
