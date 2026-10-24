# Native DSP evidence report — Formanta 8 research

Read-only static analysis of supplied `reference/reference-dsp.dll` and `reference/dsp-decompiled.c`. No native binary was executed. Ghidra's C is reconstructed output, with wrong return types and missing floating-point call arguments in several hot functions. Important missing arguments/results were checked using `objdump` disassembly. This establishes useful algorithms, not complete source recovery or measured identity with the original plugin. Untrusted 7.3.4 and shared-chat claims were not used as authority.

## Useful files

- `native-filter-coefficients.json`: exact decoded four-biquad coefficients at all eight supported effective sample rates.
- `native-oscillator-data.json`: verified wavetable generation, harmonic counts, pulse duties, wave gains and band selection.
- `native-core-constants.json`, `native-extra-constants.json`: doubles decoded by PE virtual-address-to-file-offset mapping.
- `functions/*.c`: bounded extracts with native address headers.
- `extract-native-coefficients.py`, `read-pe-constants.py`: reproducible extraction utilities. They read data; they do not run native DSP.

## Actual hot path

`FUN_18012c500` (decompiled lines 254856–255368) updates parameters/MIDI, sums voices, applies global shaping and stereo FX. `FUN_18000f9c0` (10432–10567) is each voice. Its custom envelopes are `FUN_18000de80` (9563–9616), oscillators `FUN_18000d970` (9331–9540), and filter `FUN_18000f290` (10151–10306). Generic `ADSREnvelope` and `SaturatedAnalogFilter` classes elsewhere in the binary are not this instrument's custom voice path.

## Filter: confirmed equations and processing order

Constructor/setup: `FUN_18000e0c0`, lines 9648–10150. At host rate `Fs`, native oversampling is `OS = Fs < 68000 ? 4 : Fs < 188000 ? 2 : 1`. Effective rate is `Fe = OS*Fs`. Supported coefficient sets are exactly 176400, 192000, 264600, 288000, 352800, 384000, 576000, 768000 Hz. At 44.1 and 48 kHz the effective rates are 176.4 and 192 kHz. The native constructor returns without creating the two cascades when no listed effective rate matches; a web port should explicitly support its intended host rates rather than silently invent native coefficients.

`FUN_18000f290` uses two main states `B` and `L`, plus separate upsampling and downsampling cascades, each containing four second-order IIR biquads. Four biquads are the antialiasing network, **not four main nonlinear resonant filter stages**.

```
f = (6114.649727999999 / Fe) * 2^clamp(cutoffCV, -6, 4.5)
slew = f * starveSlew
for os in 0..OS-1:
    L = clamp(L + clamp(f*B, -slew, slew), -5, 3.5)
    u = upCascade(os == 0 ? input*OS : 0)
    H = u - resonanceFeedback*B - L
    B = clamp(B + clamp(f*H, -slew, slew), -5, 3.5)
    response = [L, B, H, L+H, L-H][responseMode]
    output = downCascade(tanh(response * ampDriveGain))
return 5 * output
```

The `L` update precedes `H` and `B`. LP uses updated `L`; BP uses updated `B`; HP is `H` calculated before `B` update. This sequencing matters. Saturation is **after response selection**, before the downsampling cascade. `FUN_18030d66c` is the CRT hyperbolic tangent routine (not inferred just from an unnamed call).

Each biquad follows `y=b0*x+z1; z1=z2-a1*y+b1*x; z2=b2*x-a2*y`. Coefficients are supplied in JSON with precisely these signs. Each section's DC gain checks numerically to one within floating-point rounding; no additional passband gain was discovered. Cascades have independent state.

Control callback `FUN_18012d630`:

| Control | Native target |
|---|---|
| Filter Drive / Grab, normalized `d` | input gain `.3+d` |
| Starve / Glob, normalized `s` | slew coefficient `8*(.5-.47*s)` = 4 down to .24 |
| Amp Drive / Grot, normalized `a` | filter-output tanh gain `.3+2.5*a*a` |
| Resonance `r<.9` | feedback `.8 - .7375*r/.9` |
| Resonance `r>=.9` | feedback `.0625 - .1225*(r-.9)/.1`, ending at -.06 |

Native rails initialize to -5 and +3.5 and are fixed in the recovered voice path. There is no support here for simulated dynamic supply sag, Newton iterations, rational op-amp clipping, or the current 7.0 ZDF/TPT equations. At high resonance negative damping is intentional; do not automatically clamp feedback nonnegative.

## Custom ADSR: confirmed, including unusual sustain and loop

`FUN_18000de80`. Both envelopes have internal value `y`, previous gate, and attack-phase flag. Neither resets `y` to zero on note-on. Rising gate sets attack. When gate is high and `y>=5`, attack flag clears. If loop is enabled, high gate with `y<.5` sets attack again. Attack target is **12.3**, not 1 or 5. Thresholds are checked before that sample's update.

```
if gate rises: attackPhase = true
if loop and gate and y < .5: attackPhase = true
if !gate or y >= 5: attackPhase = false
if gate:
    coeff,target = attackPhase ? (attackCoeff,12.3) : (decayCoeff,sustain)
else:
    coeff,target = (releaseCoeff,0)
    if releaseHoldGlobal: coeff=0
value += (target-value) * coeff * (48000/Fs)
```

Callback coefficients (physical knob times in **milliseconds**):

- attack `2/(timeMs*.003*48000+1) = 2/(144*timeMs+1)`.
- decay and release `2/(timeMs*.001*48000+1) = 2/(48*timeMs+1)`.
- filter sustain `5*s`; amplifier sustain `3.535*s`.
- Accurate control limits from controls sibling: minimum **3 ms**, attack max 3000 ms, decay/release max 10000 ms. An early exploratory message suggesting .3 ms was unverified and is withdrawn.

If implementing normalized envelope `z=y/5`: attack target 2.46, threshold 1, loop threshold .1; filter sustain `s`, amp sustain `.707*s`. Both envelopes use this same normalization. If normalizing amp separately by 3.535, its attack threshold exceeds 1; merely clipping normalized amp attack at 1 is incorrect. Loop only automatically restarts if the internal value falls below .5; sustained levels at or above this prevent looping. Release chases zero exponentially and has no exact finite duration. A practical web voice-silence threshold must be stated as implementation behavior.

## Voice routing, recovered missing XMM arguments

`FUN_18000f9c0` disassembly 0x18000fc7b–0x18000ff62 restores the envelope return values, cutoff argument and amplifier multiplication absent in Ghidra C. Let `F`,`A` be internal filter/amp envelope values, `V` squared normalized MIDI velocity, and `LFO` the **native bipolar amplitude approximately ±5**:

```
F *= 1 - filterVelocityDepth + V*filterVelocityDepth
A *= 1 - ampVelocityDepth + V*ampVelocityDepth
cutoffCV = cutoffPhysical + F*(2*filterEnvAmountPhysical)
          + LFO*(.2*filterModPhysical)
          + glidedPitchCV1*keyboardTrackingPhysical
          + .05*voiceFilterDetuneState
voiceOut = filterOut * max(0, .7+LFO*(.2*ampModPhysical)) * A * 1.43
```

The small static per-voice cutoff detune is initialized in `FUN_18000f690`; oscillator pitch variation is another static random difference times .00375 octave. Native filter tracking references **MIDI 36** (see below). Modulation multipliers assume native LFO ±5; web LFO ±1 must multiply amplitudes correspondingly. `filterEnvAmountPhysical` is signed, not a normalized 0..1 position; obtain physical values from the verified control mapping, not by guessing.

Native mixer and input highpass:

```
x = (osc1*mix1 + osc2*mix2 + noise*noiseGain + external*externalGain) * (filterDrive+.3)
hp = x - lowState
lowState += hp * (1-exp(-188.496/Fs))    # about 30 Hz
filterOut = nativeFilter(hp, cutoffCV)
```

Native mixer-noise target is `noiseKnob+.001`. Noise is a triangular distribution from two successive 32-bit LCG steps (`s=343fd_hex*s+269ec3_hex`, unsigned overflow): `(hi16(s1)/65536-hi16(s2)/65536)*10`. The LFO noise variant uses multiplier5. Oscillators and envelopes are advanced at host rate, while the filter input is zero-stuffed and oversampled internally. Oversampling oscillators in addition changes their sound.

All major continuous targets smooth per host sample as `p += (target-p)*(144/Fs)` (`FUN_18012c500`; rate set in `FUN_180129a90`). Glide is separate: `2/(48*glideMs+1)`, subject to native mono/duo mode logic. Unlike the custom envelopes, the visible per-voice glide update does not multiply by `48000/Fs`; source behavior can therefore vary with sample rate. A sample-rate-corrected glide would be a deliberate web-port improvement.

## Pitch, FM, and wave generation

Native MIDI-to-CV constructors `FUN_1800084d0` (poly) and `FUN_180008d60` (mono) initialize note reference **36** and semitone multiplier hexadecimal `3fb5555560000000` = .0833333358168602. `FUN_180126630` stores pitch `(MIDI-36)*multiplier` and velocityCV `(velocity/127)*5`. `FUN_18012c500`, addresses 0x18012d22f–0x18012d237, squares `velocityCV*.2`, confirming `V=(velocity/127)^2`.

Oscillator range physical0..4 adds octaves after this note CV (default2); thus at standard setting the oscillator's CV is approximately `(MIDI-12)/12`. Filter keyboard tracking uses glided pitch **before octave-range addition**, `(MIDI-36)/12`, not `(MIDI-48)/12`.

FM is exponential/octave-CV: oscillator II output multiplied by `.4*fmAmountPhysical` is **added** to oscillator I pitch CV. It is not `Hz*(1+wave*amount)` linear FM. Modulator pitch amount similarly targets `.4*modAmountPhysical` times native LFO ±5. Fine tuning offsets divide physical semitones by12. Default shape/range parameters should follow the source registration maps.

`FUN_18012f9e0` generates 33 pairs of bandlimited wavetable banks. Each bank has 8000 usable samples, stride8002:

```
ramp[i] = sum(h=1..H) sin(2*pi*i*h/8000)/h
tri[i] = sum(odd h<=H) (-1)^((h-1)/2) * sin(2*pi*i*h/8000)/h^2
H = [338,283,238,201,169,142,119,100,84,70,59,50,42,35,29,25,20,
     16,13,12,10,8,6,5,5,4,3,2,2,1,1,1,1]
```

These tables are computed raw Fourier sums, not extracted assets. In particular do **not** multiply Fourier ramp by -3.25; that factor only belongs to its low-pitch analytic fallback.

`FUN_18000d970`: `p=clamp(pitchCV-1.842,-20.99,8.95)`. Frequency is approximately `46.875*1.25*2^p`, with fractional exponent quantized to one of 2400 `2^(k/2400)` values and max frequency22000. Native phase units are0..8000, increment `frequency*8000/Fs`. Above p=0, banks correspond quarter octaves: base `max(0,4*floor(p))`, quarter offset `floor(4*frac(p))`, bank capped32, crossfade fraction `frac(4*frac(p))`. Phase lookup itself uses integer truncation, with no interpolation between adjacent phase samples in this routine. Below p<=-.25 native analytic ramp is `(phase/8000-.5)*-3.25`; between -.25 and0 it crossfades analytic and first band.

The five output shapes are:

- Triangle: triangle table sampled at phase+.75 cycle; `4.5*tri + .8*(rampCurrent-rampPrevious)`. Analytic fallback is `1.33333333*(4*t-1)` for t<.5, else `1.33333333*(3-4*t)`. Triangle phase increment is multiplied1.015 below half cycle and .9854368932038836 above half cycle, yielding asymmetry without changing average period.
- Saw/ramp: `-4.6*ramp`.
- Three square/pulses: `-4.8*(rampAtPhasePlusDuty-ramp-(1.6-3.2*duty))`.
- Oscillator I duty array `.5,.5,.428,.196,.073`; oscillator II `.5,.5,.447,.204,.055`. Non-.5 square duties and unequal oscillators are real source constants.

A recurrence (`sin(h*a)` computed from a sin/cos pair) can generate tables efficiently without changing these equations. Allocations/table construction should be completed outside audio processing. A web renderer may choose phase interpolation for numerical quality, but that is a deliberate difference from this recovered function, not native evidence.

## Global shaping and uncertainties

After voice summation, main process clamps a shaping branch at ±5 and applies parabolic soft clipping inside that range: negative `shaped=.2*(sum+5)^2-5`, positive `shaped=5-.2*(sum-5)^2`. It blends `(1-wet)*sum*1.5+wet*shaped`; `.75` scaling depends on mono/unison mode, then `.1`, then `*10*.25` into stereo FX. Exact user control of the global wet scalar `DAT_1809d6060` was not recovered in this bounded pass; do not equate it to Grot merely because it is a drive operation. The separate Grot target above is confirmed. The global wet target has only reads in the supplied decompiled module, so its default BSS value0 may leave this branch dry (`sum*1.5`). This is plausible, not proof against indirect writes. After stereo FX the master target is `.2*volumePhysical^2`, smoothed at144/Fs. A final OnePoleStereo initialized in highpass mode with5Hz cutoff (`FUN_1800093a0` / `FUN_180009410`) precedes final multiplication4. Thus with FX bypass, optional pre-FX clipping/biquad branch bypassed, and global shaping wet0, net gain from summed voice output is `.3*volume^2` in poly, `.225*volume^2` in mono/unison, before the near-unity audio-band highpass. Source behavior of the optional pre-FX branch flag `param_1[0x276]` was not resolved. Per-preset loudness should not be calibrated with arbitrary EQ or undocumented reference-only gain overrides.

Voice assignment parses mono/duo and poly state arrays and voice stealing; complete priority and sustain behavior is not fully reconstructed here. Native voice capacity16 is clear from sample-rate setter allocations. ARP and effects are researched separately by the controls/FX sibling. No numerical native-vs-web render comparison was performed, so audible identity, full behavior equivalence and real-time CPU headroom remain unproven.

## Concrete implementation order and unresolved limits

1. Replace unsupported Newton/dynamic-rail filter with the confirmed two-state slew-limited equations, exact cascades and source-rate handling.
2. Replace linear ADSR with native target chasing, sustain factors, loop thresholds and sample-rate scaling.
3. Correct physical control-to-CV conversions, native note reference, velocity square, exponential FM, input HP and oscillator waveform gains/duties.
4. Generate native-equation bandlimited tables before rendering; keep constructor/processing allocations away from AudioWorklet callbacks.
5. Validate finite output and control sensitivity at48k and44.1k; compare envelope attack/release, self-oscillation, high-note spectra, voice modes and FX against reference recordings when actual matching source renders are available.

The previous model's halfband coefficients, generic PolyBLEP waves, rational Newton clipping, dynamic sag, and extra phase/ring/PWM macro behavior are independent approximations. Shared-chat claims of a four-stage resonant core, automatic exactness from WebAssembly, or reference-calibrated EQ do not follow from native evidence. AudioWorklet/WASM provides execution isolation and speed; algorithm identity requires the actual routing above and subsequent reference verification.
