# Native tempo and FX modulation audit — Formanta 8.1

Read-only audit of the supplied standalone host/DSP DLL and their Ghidra output. No 7.3.4 code used. Source directory: `qa/formanta8/reference/`. Addresses below are PE virtual addresses, not file offsets. These are algorithmic findings, not an audible null-test against a running native plug-in.

## Decisive repairs

1. Use each preset's `sourceMeta.standaloneTempo` for the independent synth clock. This is tempo, not a native timbre control.
2. The FX LFO is explicitly low-pass filtered at **20 Hz** before controlling any effect. Per-sample unfiltered noise applied directly to delay time is not native behavior.
3. Echo modulation is **additive milliseconds**, with a maximum 19.99 ms excursion per full-depth modulation source, not a fraction of the base echo time.
4. Echo/reverb mix uses a shaped equal-power law. At mix=1, dry is exactly zero; Crushed Planets' delayed onset is inherent to its fully wet echo and long filter attack.

## Tempo evidence

- Host preset loader `FUN_14039ada0`, `host-decompiled.c` around lines 794372–794429, checks property `standaloneTempo` when standalone-mode flag `DAT_1408e0650 != 0`, converts the property to a number, checks range and calls `FUN_1403ccf90`.
- `FUN_1403ccf90` at **0x1403ccf90** stores that number at host-context **+0x88** and refreshes the toolbar. `FUN_1403d2570` calls the control identified by RTTI as `ToolbarTempoControl` and reads that same field.
- The physical bounds read from host PE are **1..450 BPM**, at f64 addresses **0x1407e1e28=1**, **0x1407e1ff0=450**. `FUN_14039a320` initializes the field to f64 120 (`0x405e000000000000`).
- `FUN_18012c500` reads timing-object **+0x20** as BPM for ARP sync. `FUN_18012a1e0` uses that same timing BPM for FX LFO, phaser, chorus and echo.
- Native synced rate: `Hz = BPM / (60 * beats[index])`. Native synced echo base: `ms = 60000 / BPM * beats[index]`.
- Native division array at **0x180434100**, in quarter-note beats:

```js
[1/24, 1/16, 3/32, 1/12, 1/8, 3/16, 1/6, 1/4, 3/8, 1/3,
 1/2, 3/4, 2/3, 1, 1.5, 4/3, 2, 3, 4, 8]
```

- Rate index: `clamp(trunc((1-unit)*20),0,19)`. Echo time index: `clamp(trunc(unit*20),0,19)`; verified callback `FUN_18012d630`.
- Current bank's stored BPM counts: 120×386, 86×47, 140×11, 115×5, 110×2, 102×2, and 105/117/107/78/93 each once. Tundra Riders and Motr are **86 BPM**. Using 112 instead makes them **112/86=1.3023×** as fast. This does not explain every factory ARP because many are 120 BPM; preserve each source value rather than apply a universal slowdown.
- On transport stopped→playing, `FUN_18012c500` aligns synced main/FX/phaser/chorus oscillators to `fract(transportQuarterNotes / beats[index])`. Its timing object playing flag is +0x70, quarter-note position +0x58. ARP note reset/gate behavior is separate; steady pulse gate is 50% (previous verified report).

## FX LFO: waveform and 20 Hz smoothing

### Evidence chain

- Module constructor **FUN_180131620**, `dsp-decompiled.c` line 258477, invokes `FUN_1800091d0(module+0x43a0,module,20,1)`.
- `FUN_1800091d0` creates `OnePoleFilter`, stores cutoff in object+0x48, lowpass flag true at object+0x58, then computes its coefficient in **FUN_180009250**. The latter uses the native tan approximation; a web `Math.tan(Math.PI*20/Fs)` is its direct analytic counterpart.
- `FUN_18012a1e0` at **0x18012a1e0**, lines 253551ff, applies the one-pole immediately after selecting FX waveform. Its coefficient is module+0x4400, state module+0x4410, LP/HP flag module+0x43f8. Native input scaling .2 and output scaling 5 cancel when using a normalized waveform.

### Actionable normalized equation

```js
const g = Math.tan(Math.PI * 20 / sampleRate);
const G = g / (1 + g);
const v = (rawNormalizedLFO - state) * G;
const filteredNormalizedLFO = state + v;
state = filteredNormalizedLFO + v;
const mod = filteredNormalizedLFO * (wheelEnabled ? wheelNormalized : 1);
```

Wheel scaling occurs **after** the filter. Keep this state between frames and note resets; native phase-reset does not visibly clear this lowpass state. Noise shape is still produced every sample; do not replace it with S&H.

### Waveforms

LFO vtable **0x1804f1218**, confirmed by constructor disassembly at 0x1801264de. Native amplitudes use ±5; normalized forms are:

| Shape | Normalized native waveform | Evidence |
|---|---|---|
| 0 | `2*phase-1` | vtable+0x48 → FUN_1801262f0 |
| 1 | `1-2*phase` | +0x40 → FUN_180126350 |
| 2 | `4*Math.abs(phase-.5)-1` | +0x50 → FUN_180126280; starts +1, reaches −1 at phase .5 |
| 3 | `phase<.5 ? 1 : 0` | +0x38 → FUN_1801263c0; **unipolar** pulse, verified actual assembly |
| 4 | `hi16(nextLCG)/65536-hi16(nextLCG)/65536` | inline code in FUN_18012a1e0; triangular-distribution noise |
| 5 | `2*heldUniform-1` | +0xa0 → FUN_180126160 |

LCG: unsigned 32-bit `state = state*0x343fd + 0x269ec3`. S&H's uniform uses `hi16(state)/65535` (f64 constant **0x18050f880**); main FX LFO phase advance **FUN_1801260d0** updates it once at phase wrap. Phase reset **FUN_180126090** sets phase0 and refreshes the uniform sample. Every selected shape then passes through the 20 Hz filter.

The FX LFO advances once each host sample even when all FX are bypassed or the silence gate skips processor work: the final call at `FUN_18012a1e0` end always invokes vtable+0x60. Native silence gating therefore does not freeze its phase. At a new nonzero input the FX gate clears immediately; its ordinary quiet gate does not add a first-note delay. Module common constructor `FUN_18011d070` sets quiet timeout field module+0x68 to192000 samples; sample-rate updates may adjust it elsewhere and were not traced in this bounded audit.

**Main/voice LFO is different.** Peer research in `native_noise_instability` confirms main shape4 is directly used for pitch/cutoff/amplitude; do not add this FX-only20 Hz lowpass to the main LFO without separate evidence. Intentional oscillator-noise settings in Buenos Notches/Los Blades should be retained.

## Echo: correct modulation, limits and mix

`FUN_18012a1e0` echo block: physical echo time smoothed at module+0x6300, external amount smoothed at +0x6390, own depth smoothed at +0x6780. Source callback maps `echoTimeModAmt` through a SmoothValue unchanged; source values are bipolar −1..1, not unit knob positions.

Native line:

```text
modulatedMs = baseMs
 + ownNativeSine * ownDepth * .01 * .2 * 1999
 + externalAmount * nativeFilteredFX * .01 * .2 * 1999
```

Constants read directly from PE: **0x18050f0f0=.01**, **0x18050f210=.2**, **0x18050f720=1999**, **0x18050f728=2000**. Because each native modulation waveform is normalizedWave*5:

```js
let timeMs = baseMs + 19.99 * (ownSineNormalized*echoModDepth + mod*echoTimeModAmt);
// Native both-channel spread, then final limits:
let leftMs  = clamp(timeMs - echoSpreadMs, 1, 2000);
let rightMs = clamp(timeMs + echoSpreadMs, 1, 2000);
```

When spread is zero both are equal. **Final clamp1..2000 applies even to synced base times above2 seconds.** The modulation conditional has its own clamp too; its later spread/final-limit block is unconditional. Current code's `baseDelay*(1+.18*ownDepth*sine+.35*externalAmount*noise)` can scramble long delay readheads by hundreds of milliseconds at audio rate. Native combines much shallower fixed-time modulation with a low-passed external noise source.

### Echo/reverb mix law

Assembly **0x18012abd5–0x18012ac20** explicitly loads exponent f64−1.8 from **0x18050fc10**, calls the power helper `FUN_180309420`, then `FUN_1800075b0` for wet/dry coefficients. Decompiled casts of this pow argument to int are a Ghidra artifact; actual xmm1 contains the f64−1.8. Reverb repeats it at **0x18012afe9–0x18012b032**.

For mix `m` in[0,1]:

```js
function F(x) { // exact recovered native fast-sine polynomial over [0,1]
  const y = 2*x-x*x;
  return y*(.775+.225*y);
}
const a = m**1.8, b = (1-m)**1.8;
const t = a/(a+b);
const wet = F(t), dry = F(1-t);
output = dry*input + wet*effectOutput;
```

`F(0)=0`, `F(.5)=.7078125`, `F(1)=1`. This gives **m1: dry0/wet1**, **m0: dry1/wet0**, with no singular endpoint evaluation needed in the web port. Chorus instead uses direct sqrt equal power: `wet=sqrt(m)`, `dry=sqrt(1-m)` in `FUN_1800079a0`.

### Crushed Planets

Source preset's echoMix is1, echoTime500.75ms free, echoPingPong on, almost fully wet flange, and filterAttack3000ms; amp/filter loop/attack flags contribute further envelope behavior. Exact fully-wet echo already explains a roughly half-second onset plus slow tonal opening. Preserve its sound. Prefer a visible wet-tail/onset indicator to silently adding dry signal or shortening its stored envelope. The native quiet gate exits on nonzero input; it is not evidence for postponing DSP allocation.

## Reverb decay modulation

`FUN_18012a1e0` after echo, module+0x89e0 mode:

```text
decay = clamp(smoothedReverbDec + smoothedDecModAmt*nativeFilteredFX*.2,0,1)
```

For normalized FX modulation, this is simply **`clamp(rDecay+rMod*mod,0,1)`**. Web's former `*.3` attenuation is not native. Galactic mode then applies `(1-(1-decay)^3)*1.035` before underlying reverb parameter mapping; other modes use the clamped decay directly. Decay updates feed native Dattorro/other processors, so matching this control alone does not make an independent web reverb algorithm identical.

## Chorus/flanger: verified values and unresolved gate

The wrapper computes native external control:

```text
q = clamp(-ownNativeSine * depthScale + smoothedFXAmount*nativeFilteredFX,-5,5)
depthScale = modeFlange ? .75*smoothedDepth : smoothedDepth
```

It stores q at module+0x49a0. **However**, `FUN_1800079a0` only reads the corresponding StereoChorus+0xb8 external value when its internal waveform-selector+0x48 equals4. Supplied `FUN_180129880` initializes that field0, and no later static write to4 was found. Do not claim this external route is active in native or adopt guessed delay depths as verified. General StereoChorus delay formula is `(depthField*(1+.1*q)+(maxField-depthField))*channelMultiplier`, with opposite phase used when its stereo flag is true. Its maxField+0x68 is set4ms in flange or15ms in chorus; constructor depthField+0x60 is90. This discrepancy merits runtime tracing before trying to duplicate full chorus internals. The shared20 Hz FX modulation filter and native mix laws above are unambiguous.

## Reproduction

PE f64 reader already provided at `qa/formanta8/reference/read-pe.py`; host equivalent at `read-host-pe.py`. For example:

```sh
objdump -d --start-address=0x18012abd5 --stop-address=0x18012ac28 qa/formanta8/reference/reference-dsp.dll
objdump -d --start-address=0x1801263c0 --stop-address=0x1801263f0 qa/formanta8/reference/reference-dsp.dll
```

Inspect `qa/formanta8/functions/18012a1e0.c`, `18012c500.c`, `18012d630.c`, and their complete surrounding Ghidra source for contextual reads. These native findings support fixing modulation/sync and preserving original bank settings, rather than applying per-preset noise gates or arbitrary cutoff reductions.
