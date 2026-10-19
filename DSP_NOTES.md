# FORMANTA 7 — DSP and calibration notes

This is an independent digital model. The supplied native reference contains
Windows x64 executables and a user guide, not DSP source code. Its code has
not been converted into WebAssembly. There are no native plugin binaries,
original panel bitmaps, activation files or recordings in the web release.

## Signal path

Each allocated modern voice uses four oscillator steps per output sample.
PolyBLEP saw/pulse generation supports oscillator-II frequency modulation,
signed phase increments, pulse width and waveform transition smoothing.
The generator/filter hot path is compiled from `dsp/core.c` into
`audio/core.wasm`. `audio/core-bytes.js` embeds the identical numeric bytes
so AudioWorklet does not need a fetch, base64 decoder or a compiler.

The filter uses a two-integrator implicit nonlinear state model. A bounded
rational current law has small-signal slope one:

    S(x,R) = R z (27 + z²) / (27 + 9 z²),  z = clamp(x/R, −3, 3)

The corresponding derivative is evaluated from the same reciprocal. A
linear predictor initializes Newton's method. The solve stops when the
residual is below 1e−11, with at most five corrections at each oversample.
This replaces a fixed three-iteration calculation: typical cases avoid
redundant divisions; difficult cases can take more iterations. Output
resolution, oversampling and effects are not reduced to save CPU.

Drive and resonance influence available rail voltage; a load-dependent
supply state adds recovery/sag. Starve reduces the rail. LP/BP/HP/notch/peak
outputs derive from the integrator states. Peak adds a resonant band to the
input rather than turning into a notch. This is an engineering model of the
behaviour, not a transistor-by-transistor netlist extracted from the plugin.

Decimation uses two cascaded 2:1 polyphase IIR halfband stages. The parallel
allpass branches use f64x2 SIMD arithmetic. Oscillator/filter state and
internal arithmetic remain f64; browser output is Float32 PCM. WebAssembly
memory is fixed at 128 KiB per engine, with 64 reusable voice state slots.
The JavaScript fallback implements the same implicit filter and halfband
stages; it retains JS oscillators when SIMD is unavailable.

Separate envelope, pitch and control smoothing, the stereo effects rack,
drum synthesis and sample-frame event queue remain in JavaScript.
A linked stereo peak limiter replaces always-on output soft saturation in
the modern path. It prevents hard output overflows without applying a
continuous high-level colour to quiet signals.

## Calibration assumptions

Native preset values and their physical mappings are retained. The absolute
frequency reference is an engineering calibration: 1000 Hz at the native
filter octave reference, with the source −6…+4.5-octave control range and a
12 Hz…min(22000 Hz,0.46 Fs) clamp. It has not been measured against a native
reference sweep. Envelope-to-cutoff range is nine octaves at full depth.
These values address the dark response of the previous model; they are not
proof of the native filter's transfer function.

Filter velocity scales the envelope contribution, so it has no independent
cutoff effect when envelope depth is zero. Amplifier drive, rail behaviour,
resonance and cutoff have been revised together. Existing delay, reverb,
phaser and chorus models remain independent implementations. Linear ADSR
segments do not establish a match to the native envelope curves.

The factory programs themselves are not randomly brightened, normalized
individually or rewritten. Their 458 native parameter sets, source names,
metadata and hashes are preserved. Legacy projects keep their stored data;
version-6 source-bank patches upgrade to the new modern engine on load.

## Threads, buffering and recording

LIVE: AudioWorklet runs SynthEngine. Worker modes render transferable PCM
blocks and recycle a bounded buffer pool through a MessageChannel to the
AudioWorklet sink. No SharedArrayBuffer/COOP/COEP headers are required, which
keeps ordinary GitHub Pages hosting possible. The event scheduler timestamps
notes in audio time. Profile selection changes buffering, not DSP quality.

The 43/128/341 ms queues add latency. No browser implementation can promise
zero key-to-headphone delay on arbitrary audio drivers. A larger queue can
absorb temporary stalls; it cannot fix sustained processing above real time.

Recording captures the actual stereo sink output. Stop waits for an explicit
flush acknowledgement before constructing a Blob from PCM16 chunks. Takes
above RIFF's 32-bit data-size range use an RF64 ds64 header. Browser memory
and download limits still constrain very large takes.

## Rebuilding

The website includes the compiled binary and runs without build tools.
To rebuild with Node and Clang/wasm-ld:

    node tools/build-core.cjs

Or use Zig's C compiler:

    node tools/build-core.cjs --cc /absolute/path/to/zig

This release was built with Zig 0.17.0's Clang frontend, optimized for
wasm32-freestanding with SIMD128. No unrestricted fast-math reassociation
or reduced-precision arithmetic is enabled. Compiler/runtime binaries are
not included in the archive.

See `VALIDATION.md` for observed results. Native reference audio, a physical
Polivoks and FiiO/Steinberg output hardware were not available for matched
measurement. Exact sonic equivalence is therefore not claimed.
