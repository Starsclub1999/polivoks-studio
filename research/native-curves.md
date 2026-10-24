# Native slider conversion — host curve verification

Static audit2026-10-20. This resolves the nonlinear-curve uncertainty in `controls-fx-research.md`. No native code executed and no app files edited.

## Exact mappings

Let `lo`, `hi` be native physical limits, `k` the registered skew, `u` the normalized knob position, and `sign(0)=0`.

Plain:

```
t=clamp((x-lo)/(hi-lo),0,1)
u=t^k
x=lo+(hi-lo)*clamp(u,0,1)^(1/k)
```

Symmetric:

```
t=2*clamp((x-lo)/(hi-lo),0,1)-1
u=(sign(t)*abs(t)^k+1)/2
r=2*clamp(u,0,1)-1
x=lo+(hi-lo)*(sign(r)*abs(r)^(1/k)+1)/2
```

For an explicit physical midpoint `m`, native setter calculates:

```
k=ln(.5)/ln((m-lo)/(hi-lo))
```

A registered skew `.5` means a square physical response and square-root normalization. These curves are **not logarithmic interpolation** between physical endpoints. A native physical midpoint is a point at normalized position.5, including ranges that begin at0.

## Evidence chain

The supplied standalone EXE was extracted read-only as `reference/reference-host.exe`; the address mapping uses its PE sections, no process launch.

1. Host constructor `FUN_1403ccc40` assigns PSHost vtable atVA `0x1407cc318` (instruction1403ccc95). Native ModuleSlider callbacks reference this interface through control+0x4e8.
2. Native `FUN_180009be0` (`dsp-decompiled.c`7014) calls slider virtual+0x1c0 →`FUN_180120520`→PSHost+0x248. Vtable+0x248 is `FUN_1404aee70` (`host-decompiled.c`1009732). It resets skew1/symmetricfalse, checks `lo<m<hi`, then writes `ln(.5)/ln((m-lo)/(hi-lo))` to host range+0xb0.
3. Native `FUN_180009c60` (`dsp-decompiled.c`7035) calls slider virtual+0x1b8 →`FUN_180120550`→PSHost+0x240. Vtable+0x240 is `FUN_1404af070` (`host-decompiled.c`1009834). It writes the supplied skew and supplied symmetry byte to host range+0xb0/+0xb8. Its preliminary arithmetic-center calculation is overwritten by the explicit skew; the stored arithmetic center in native control+0x608 is not a declaration of physical value at unit.5 for this case.
4. Native physical→unit callback `FUN_1801203c0`→PSHost+0x288 →`FUN_1404ae210` (`host-decompiled.c`1008951)→PSSlider virtual+0x198. PSSlider vtable atVA `0x1407db9e8` resolves+0x198 to `FUN_1402b70f0` (`host-decompiled.c`611204)→`FUN_1400f2460` (215337). The latter implements the plain or symmetric exponent`k` formulas above, including clamping.
5. Inverse PSSlider vtable+0x190→`FUN_1402b7110` (611216)→`FUN_1400f2330` (215269), which implements `exp(log(u)/k)` and the signed symmetric inverse. Native math helpers `FUN_140197fb0`/`FUN_1404e67d0`/`FUN_1404e7ac0` are log/exp/pow operations. Disassembly confirms`FUN_1400f2460` loads skew intoXMM1 and unit ratio intoXMM0 before its call to the power helper, so decompiler omitted parameter lists do not change argument order.
6. PSHost+0x290→`FUN_1404ae0b0` obtains the slider's current physical value, then uses the same PSSlider+0x198 conversion. Both API paths agree.

No special per-control custom range callbacks were registered in the inspected constructor. Controls without either nonlinear setter keep skew1/symmetricfalse. Discrete controls have their separately registered step count; the normalized/physical formulas do not replace their discrete quantization.

## All nonlinear declarations

`native-slider-curves.json` contains **all65controls**, including linear defaults, original limits/defaults, native module slots, registration lines, declared curve setter, computed `physicalAtUnitHalf`, computed `defaultUnit`, and both forward/inverse formulas. These metadata are decoded by linear local-variable data flow through `FUN_180131620`; values passed via reused `uVar` locals are resolved from their latest assignment. Lines below identify each setter in `dsp-decompiled.c`.

| Native sourceID | Kind | Declared midpoint | Skew k | Symmetric | Physical at unit.5 | Setter line |
|---|---|---:|---:|---|---:|---:|
| `RateKnob` | midpoint | 2.5 | 0.332771966473 | no | 2.5 | 258644 |
| `fxModRateKnob` | midpoint | 2.5 | 0.332771966473 | no | 2.5 | 258660 |
| `GlideKnob` | midpoint | 130.0 | 0.512382032066 | no | 130 | 258678 |
| `VCO1LFOKnob` | midpoint | 0.1 | 0.301029995664 | no | 0.1 | 258724 |
| `VCO2LFOKnob` | midpoint | 0.1 | 0.301029995664 | no | 0.1 | 258752 |
| `DetuneKnob` | explicitSkew | — | 0.5 | yes | 0 | 258770 |
| `FAttackKnob` | midpoint | 1000.0 | 0.629780952931 | no | 1000 | 258833 |
| `FDecayKnob` | midpoint | 1000.0 | 0.300676840553 | no | 1000 | 258851 |
| `FReleaseKnob` | midpoint | 2000.0 | 0.430355395179 | no | 2000 | 258884 |
| `FilterLFOKnob` | midpoint | 0.2 | 0.301029995664 | no | 0.2 | 258973 |
| `AAttackKnob` | midpoint | 1000.0 | 0.629780952931 | no | 1000 | 259266 |
| `ADecayKnob` | midpoint | 1000.0 | 0.300676840553 | no | 1000 | 259281 |
| `AReleaseKnob` | midpoint | 2000.0 | 0.430355395179 | no | 2000 | 259311 |
| `AmpLFOKnob` | midpoint | 0.4 | 0.756470797366 | no | 0.4 | 259339 |
| `TuneKnob` | explicitSkew | — | 0.5 | yes | 0 | 259397 |
| `arpSpeed` | explicitSkew | — | 0.5 | no | 7.6875 | 259588 |
| `phsrSpeed` | explicitSkew | — | 0.5 | no | 2.0075 | 259874 |
| `phsrFXModAmt` | explicitSkew | — | 0.5 | yes | 0 | 259905 |
| `flngChorSpeed` | explicitSkew | — | 0.5 | no | 2.0075 | 259922 |
| `echoTime` | explicitSkew | — | 0.5 | no | 500.75 | 259970 |
| `flngChorFXModAmt` | explicitSkew | — | 0.5 | yes | 0 | 259986 |
| `echoTimeModAmt` | explicitSkew | — | 0.5 | yes | 0 | 260016 |
| `echoModRate` | midpoint | 6.0 | 0.564533002438 | no | 6 | 260091 |
| `echoModDepth` | explicitSkew | — | 0.5 | no | 0.25 | 260106 |
| `reverbHP` | explicitSkew | — | 0.5 | no | 5015 | 260182 |
| `reverbLP` | explicitSkew | — | 0.5 | no | 5015 | 260198 |
| `reverbDecModAmt` | explicitSkew | — | 0.5 | yes | 0 | 260214 |

## Consequences for presets and sync

- Filter Mod depth uses range0…2 with midpoint.2: `x=2*u^3.321928094887362`; native unit.5 is physical.2, not1.
- Filter/Amp attack:3…3000ms, midpoint1000ms, skew.6297809529313951. Filter/Amp decay:3…10000ms, midpoint1000ms, skew.3006768405528933. Release uses midpoint2000ms, skew.4303553951786526. These are power curves, not log-time curves.
- Master Tune±7.1semitones and Oscillator II Detune±7semitones use symmetric skew.5. Physical0 stays unit.5; smaller physical deviations occupy more knob travel than with a linear mapping.
- ARP uses .25…30Hz with plain skew.5. Native default6.5Hz normalizes to.45834924851410563. A logarithmic descriptor gives a different pointer and a different synced division despite roundtripping the same free Hz value.
- Echo Time1…2000ms uses plain skew.5. For Lo Fi Club Key's physical575.74ms, native unit=.5362030929400158. Native Echo sync index is `trunc(u*20)=10`, so native table duration is.5quarter-note beats. At120BPM this is250ms. This is an example computed from native formulas plus the source value supplied to parent; no native render was measured.
- Main/FXLFO speed uses physical midpoint2.5Hz in .01…20Hz. Phaser/chorus speed, ARP, EchoTime, reverbHP/LP, EchoModDepth use explicit plain skew.5.
- Phaser/chorus/echo/reverb bipolarFXmodamounts use symmetric skew.5. FADSRKnob is a separate bipolar **linear** control; do not apply one curve to all bipolar knobs.

Preset repair should decode preserved source physical values with these curves, and UI pointer, interaction, and audio mapping must share the same conversion. The native sync index uses native unit position, so correcting only the20-entry table while keeping log-normalized preset fields still changes the chosen division.

Roundtrip checks on the extracted metadata at units0,.01,.25,.5,.75,.99,1 passed within1e−9 for all65controls. This verifies transcription and inverse consistency; it is not an executed native A/B test.
