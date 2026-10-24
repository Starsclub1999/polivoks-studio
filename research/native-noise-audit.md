# Formanta 8.1: native noise, envelopes, and reported engine stalls

Scope: bounded research against the supplied DSP DLL and Ghidra output, plus the current 8.0 implementation copied to `formanta81`. No application changes were made for this audit. Version 7.3.4 was not used. Native audio A/B recordings were not available; a spectral or perceptual match to the executable is not claimed.

## Main findings

1. The shared hiss in five named patches is not caused by an excessive mixer-noise gain: their original mixer-noise knob is zero. All five select **white noise for the FX LFO** and apply it to delay time. Applying this raw noise directly to delay read positions can create broadband artifacts. The sibling native FX audit established a separate 20 Hz lowpass for FX modulation; that filter should not be added indiscriminately to the main synth LFO.
2. Two other patches genuinely include noise in the source: **Modulated Atoms** has mixer noise 0.1847826087, and **Buenos Notches** has 0.1219429348. Removing those values would modify the source patch. Buenos Notches also selects the notch response (`ResponseKnob=3`), which passes substantial high-frequency content.
3. The supplied native mixer actually has a small noise floor: `MixNoiseKnob + .001`. The current web core uses `MixNoiseKnob` directly. Therefore that difference cannot explain excessive web hiss.
4. Neither Motr nor Edit Bass produced a numeric DSP failure in 12-second fresh-engine renders or 22 successive held-chord program transitions at 44.1/48 kHz. Edit Bass does create 32 concurrent voices at arpeggiator transitions (16 new plus 16 retiring); the observed 128-frame block p99 reached 2.924 ms at 48 kHz against a 2.667 ms real-time budget. This is evidence of a performance risk, not proof of the user's persistent failure cause.
5. Crushed Planets intentionally combines a 3000 ms filter attack and a 100% wet echo with a free delay of 500.75 ms. A measurable delayed onset is inherent in those source values. Fix excessive implementation latency without silently shortening its native envelope or replacing its wet mix.

## Exact native noise path

`FUN_180131620` registers `MixNoiseKnob` at module slot `0x9e`, physical range 0…1, default 0 (`dsp-decompiled.c` line 258803; verified earlier control audit).

Callback `FUN_18012d630` dispatch at **0x18012dbaf–0x18012dbc7**:

- compares control pointer at module + `0x4f0` (= `0x9e*8`);
- adds the f64 constant at **0x18050f070**, decoded directly from the DLL as **0.001**;
- stores target at **0x1807c2940**.

By comparison, VCO1 and VCO2 callbacks at **0x18012db83–0x18012dba9** store the physical knob values directly at `0x1809d6108` and `0x1805af2a8`.

`FUN_18012c500`, extract lines 269–271, smooths all three targets:

```text
mix1 += (targetMix1 - mix1) * parameterCoefficient
mix2 += (targetMix2 - mix2) * parameterCoefficient
noiseGain += (noiseKnob + .001 - noiseGain) * parameterCoefficient
```

The coefficient is `144/Fs`, established by `FUN_180129a90` in the existing native audio audit. This is parameter smoothing, not a lowpass on the actual mixer noise.

`FUN_18000f9c0` produces two successive unsigned 32-bit LCG steps:

```text
s1 = (s * 214013 + 2531011) modulo 2^32
s2 = (s1 * 214013 + 2531011) modulo 2^32
noise = (high16(s1)/65536 - high16(s2)/65536) * 10
```

It uses one shared native random state at **0x1809eed60**. The noise has an approximately triangular amplitude distribution and broad spectrum. There is no recovered pink-noise coloring filter in this mixer path. At extract line 125, native noise is mixed **before** input drive, input highpass, and the instrument filter:

```text
x = (VCO1*mix1 + VCO2*mix2 + noise*noiseGain + external*externalGain)
    * (filterDrive + .3)
hp = x - inputLowState
inputLowState += hp * (1 - exp(-188.496/Fs))
```

`formanta81/dsp/core.c` and JS fallback implement the same LCG formula and ×10 amplitude, with per-voice rather than shared random state. They omit the native .001 floor. This floor is tiny; it should not be used as an explanation for the reported loud web hiss.

## Main synth LFO noise is not the FX LFO

The main LFO white-noise branch in `FUN_18000f9c0` is fully visible at **0x18000fb2e–0x18000fb84**. It produces the same LCG difference with multiplier **5**, then writes the raw result to voice + `0x58`. The sample-and-hold branch at **0x18000fb86–0x18000fbeb** samples the same triangular noise on a rising sign crossing of the source saw wave. There is no intervening lowpass before this value is used for voice pitch/cutoff/VCA modulation. Some voices share the first voice's value, depending on native mode.

The web main white-noise LFO uses `Math.random()-Math.random()`, which has the same normalized triangular distribution. Its sample-and-hold instead uses a uniform `Math.random()*2-1`; a uniform distribution has twice the variance of the triangular difference at the same peak range. This is a real source mismatch (about +3 dB in S&H modulation variance), separate from the FX modulation artifact.

## Named source patches

| Russian label | Native name | Mixer noise | FX shape | Echo time modulation | Additional facts |
|---|---|---:|---|---:|---|
| Всадники тундры | Tundra Riders | 0 | White noise (4) | .1348636901 | Stored standalone tempo 86 |
| Раздробленный бит (КОЛ) | Decimated Beat (MW) | 0 | White noise (4) | -1 | Resonance 1; chorus FX modulation 1 |
| Глубокий ритм | Deep Rhythm | 0 | White noise (4) | 1 | Resonance 1; flange FX modulation 1 |
| Клавиши лоу-фай | LoFi Keys | 0 | White noise (4) | .1654659831 | Main LFO also noise; VCO2 depth .06517 |
| Лезвия | Los Blades | 0 | White noise (4) | .0134359935 | Stored tempo 86; amp attack 3000 ms |
| Модулированные атомы | Modulated Atoms | .1847826087 | White noise (4) | 1 | Filter loop enabled; source noise intentional |
| Доброй режекции | Buenos Notches | .1219429348 | Triangle (2) | 0 | Notch response 3; source noise intentional |

The similar INHALT patch **Lo Fi Club Key** is a different program from the user's **LoFi Keys**. It has its own nonzero source noise (.0734757133) and must not be substituted for that patch in reproduction tests.

## Exact custom envelope and gate semantics

`FUN_18000de80` was checked both in decompiled C and assembly **0x18000de80–0x18000df41**. The state is previous gate byte, attack flag byte, value `y`, target, coefficient.

```text
risingGate = gate && !previousGate
if loop:
    if gate && (y < .5 || risingGate): attack = true
else:
    if risingGate: attack = true
if !gate || y >= 5: attack = false
previousGate = gate
if gate:
    target,coefficient = attack ? (12.3, attackCoefficient)
                                : (sustain, decayCoefficient)
else:
    target,coefficient = (0, releaseHold ? 0 : releaseCoefficient)
y += (target-y) * coefficient * (48000/Fs)
```

Constants verified directly from PE:

| Address | Value | Role |
|---|---:|---|
| `0x18050f070` | .001 | Decay/release time conversion and mixer noise floor |
| `0x18050f0a0` | .003 | Attack time conversion |
| `0x18050f860` | 48000 | Envelope reference rate |
| `0x18050f560` | 5 | Attack threshold and main LFO amplitude |
| `0x18050f510` | 3.535 | Amp sustain scale |
| `0x18050f5c0` | 12.3 | Attack target |
| `0x18050f030` | .00032 | Native amplifier render threshold |
| `0x18050f5a8` | 10 | Mixer noise amplitude |
| `0x18050efa0` | 1/65536 | LCG high-word normalization |

Attack coefficient is `2/(144*timeMs+1)`; decay/release use `2/(48*timeMs+1)`. Amp sustain is `3.535*s`, filter sustain `5*s`. Envelopes do not reset amplitude to zero on note-on. Loop restarts only below .5 V while gated; a sustain above that threshold prevents repeated looping.

With the web normalized value `z=y/5`, native targets become attack 2.46; threshold 1; loop threshold .1; amp sustain `.707*s`; filter sustain `s`. Current native web envelope implements these correctly. Its silence threshold `.000064` corresponds to native `.00032 V / 5`. The native voice does not evaluate oscillator/filter when amp is below `.00032 V`; the web can still evaluate it while gate remains high.

A separate difference: native release-hold freezes envelope release by setting release coefficient to zero after gate-off. The web sustain pedal retains note gates until release, allowing decay to continue meanwhile. This can change held-pedal envelopes, but was not shown to cause the reported persistent stall.

## Reproduction and limits

Files:

- `probe-instability-baseline.mjs` / `instability-baseline-results.json`: fresh engines, Motr/Edit Bass, 12 seconds each at 48/44.1 kHz, held chord 0–5 s, second chord 6–10 s, released tail to 12 s.
- `probe-transitions-baseline.mjs` / `transitions-baseline-results.json`: 11 programs per rate, same live engine, held chord across selections; each program 4 seconds, off at midpoint, retrigger at 60%; final 3-second release.

All cases: no exception, nonfinite audio, nonfinite core states, nonfinite selected FX scalar states, or negative voice slots. End state after release was no notes, no held ARP keys and no voices. Fresh Motr maximum one concurrent voice; fresh Edit Bass up to 32. Transition peak up to .97298; output limiting remained finite.

Performance observations depend on Node JIT and shared machine load, so do not directly certify browser AudioWorklet deadlines. At 48 kHz, Edit Bass transition p99 reached 2.9243 ms per 128 frames (budget 2.6667 ms). Other isolated outliers reached 10.04 ms. Avoid interpreting 'no NaN in Node' as a successful device/browser test.

Source-level persistent-poison paths exist in the original web implementation even though normal named-preset tests did not trigger them: FX ring buffers may retain a nonfinite input; the final `lastL/lastR` are assigned before validation; nonfinite event times can block an ordered event queue; allocation failure falls through to a legacy path. These justify bounded recovery checks, but the named-preset failure should not be declared reproduced without a concrete triggering input.

DSP baseline hashes observed before app edits:

```text
bc3f16870b4d7a0d7172de8db14e95aed965693ac78dae9a37a0ce2565912f02  audio/dsp.js
307b295ccadfe78479b67179ffad43bc35ac6bb5f853f0bfca927fcca1f64cc2  audio/core.js
d4b04762063ddbee934d289be0611e385982ce41dcfe4f9ef25ab6389b34e5df  audio/fx-rack.js
755739924b0b16d53f6c938d7d2bbb35a5db75f82ee1bff80b0be07482287a99  dsp/core.c
a691161f13ca9e08f66d45ee2126b3df23a9c366bbaec454ebc563a03ad162ba  reference-dsp.dll
```
