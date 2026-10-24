# Native controls, ARP and FX evidence — clean7.0 audit

Research date:2026-10-20. Scope: static reading of supplied DSP/host Ghidra output and native PE constants; no binary execution, no app edits. The isolated7.3.4 tree and shared chat are not treated as evidence. Function addresses below are stable identifiers; line references refer to `reference/dsp-decompiled.c`.

## Findings that justify implementation changes

1. Native tempo sync has **20** deliberately interleaved divisions, not16. Native rate knobs reverse the index; Echo Time does not. Using a sorted/generic16 division table changes ARP, LFO, phaser, chorus and echo timing even if the preset physical values are loaded correctly.
2. Native ARP pulse gate is **50%**. The clean7.0 `.76` multiplier is not supported by native code.
3. ARP Random GUI state maps to internal algorithm4, not3. Only four enabled algorithms are exposed despite the generic internal arpeggiator supporting more.
4. Main/FX key-reset flags reset their LFO phase on allocator note-count transition0→positive. Additional overlapping notes do not individually reset those LFOs.
5. Chorus mode disables the resonance control. Native UI page selection only changes visibility; opening MAIN must not bypass ARP/FX.
6. Three native ranges differ from the previously inspected web schema: Filter/Amp attack3…3000ms, Filter Mod depth0…2, Master Tune−7.1…+7.1 semitones. Source preset values should be re-normalized from the preserved physical source values after correcting descriptors.

No verified evidence says that the bank generally fails to activateFX. In the specific Lo Fi Club Key source values supplied to parent, `reverbOff=true` correctly means no reverb; chorus and Tape echo should remain enabled. Parent independently reports that all458×85 descriptor/source-value roundtrips pass. That validates internal roundtrip consistency with the current descriptors; it does not prove those descriptors' limits match native. `arpRate` .25…30Hz agrees with native. The three independently confirmed native-range discrepancies above require descriptor correction and re-normalization from physical source values; the sync-table defect is a separate issue.

## Sync timing

The20 native f64 constants atVA `0x180434100` are quarter-note beat durations:

```
[1/24,1/16,3/32,1/12,1/8,3/16,1/6,1/4,3/8,1/3,
 1/2,3/4,2/3,1,3/2,4/3,2,3,4,8]
```

Conventional labels, inferred from those numerical beat durations, are:
`1/64T,1/64,1/64D,1/32T,1/32,1/32D,1/16T,1/16,1/16D,1/8T,1/8,1/8D,1/4T,1/4,1/4D,1/2T,1/2,1/2D,1/1,2/1`.

`FUN_18012d630`, event2/case0 (starts255437), calculates indexes using **native normalized value** at control bytes+0x418:

| Control | Native index |
|---|---|
| Main LFO, FX LFO, ARP, phaser, flange/chorus speed | `clamp(trunc((1-v)*20),0,19)` |
| Echo Time | `clamp(trunc(v*20),0,19)` |

Relevant extract lines: mainLFO73; ARP286; FXLFO317; phaser351; flange/chorus419; Echo464. At nonnegative normalized values `trunc` equals `floor`; clamp handles endpoints. Do not sort the table: dotted/triplet entries are interleaved in the native memory.

`FUN_18012c500`, lines254934–254946, applies ARP synced frequency `1000/((60000/BPM)*beats[index])`; free frequency is the smoothed physical `arpSpeed` value. The constructor range is .25…30Hz/default6.5Hz. Native LFOs have separate Main/FX rates and sync flags.

## ARP note order, gate and reset

- `FUN_18012b2f0` (254052) and `FUN_18012d630` event3/case1 agree: Up→0, Down→1, UpDown→2, Random→4. Enabling/disabling invokes `FUN_18012b3f0` to clear/reset current note state.
- Range buttons1,2,3,4 set maximum added-octave index0,1,2,3 at module bytes+0x10d4 (native ARP starts at module+0x580). This is base octave plus0…range−1, not symmetric octaves around the played note.
- `FUN_180122500` (248118) scans base MIDI pitches ascending forUp and descending forDown, then changes octave. Random mode4 independently chooses held base pitch and octave. The generic object has additional internal modes, but no evidence makes them selectable in this plugin.
- UpDown endpoint repetition is suppressed by `FUN_1801235b0` (248876) and the bounded repeat check in `FUN_180123670` (248908; extract lines374–391).
- `FUN_180123670` output adds12×octave and **clamps** values above127 to127 (extract lines444–450); discarding these notes would differ from native behavior.
- ARP oscillator is created by `FUN_180125e60` (250615). Its pulse width at+0x50 is the f64 `.5`. DigitalOscillator vtableVA `0x1804f1168`, offset+0x30→`FUN_180125e10` (250587): output+5 for phase<pulseWidth, otherwise−5. `FUN_180123670` reads that pulse, advances oscillator, and uses threshold2.5: rising pulse emits the next note, falling pulse emits noteOff. Therefore gate duty is50% in steady state, not76%.
- DigitalOscillator vtable+0x20→`FUN_180125b10` (250409) resets phase at+0x58 to0 and refreshes random sample. ARP processing consumes pending-reset flag+0xbd8 and calls this reset before reading the pulse (extract lines358–365). First-note handling can request reset/force a pulse; this is additional to steady-state50% duty.
- MIDI sustain CC64 is explicitly recognized by `FUN_180123670` (extract lines186–201). Under the object's enabled sustain handling, pedal down preserves logical held notes; release calls `FUN_180005d40` (3878), reconciling logical note mask to physical key mask. Generic latch flags exist, but no source UI ARP latch control was found; adding one as an original plugin feature would be unsupported.

## Key Reset and control/LED flags

`FUN_18012d630` event4/case2, extract1201–1203/1262–1264:
- `modKeyReset`→`DAT_1805aa5c4 = (value>0)`; updates Main key-resetLED.
- `fxModKeyReset`→module bytes+0x42fd=`value>0`; updatesFX key-resetLED.

`FUN_18012c500`, lines255108–255117 (extract253–262), caches allocator note count at entry then tests `oldCount==0 && newCount>0`. Only there it calls each enabled LFO's virtual+0x20 phase-reset method. This is a first-held-note transition, not retrigger on every polyphonic note. Pulse reset starts at phase0; exact output at phase0 depends on selected LFO waveform.

Sync flags also have independent LED updates; they must be loaded even when a panel is hidden. Native incoming radio events with value<=0 are ignored for mode changes; the selected positive radio event sets the algorithm. A web preset loader should apply one decoded mode per radio group after reading the complete preset rather than toggle every false source button as an imperative OFF action.

## FX source modes and UI behavior

`FUN_18012d630` event3/case1, lines256298–256536 (extract930–1168):

| Source IDs in order | Internal modes | Additional behavior |
|---|---|---|
| `phsrOff / phsr4Stg / phsr6Stg / phsr12Stg` |0/1/2/3|Active stage-pair count2/3/6, respectively|
| `flngChorOff / flngChorFlngEnbl / flngChorChorEnbl` |0/1/2|Chorus disables resonance control; Off/Flange enable it|
| `echoOff / echoDigi / echoTape / echoPingPong` |0/1/2/3|Off→active resets echo buffers|
| `reverbOff / reverbSpring / reverbPlate / reverbRoom / reverbHall / reverbGalac` |0/1/2/3/4/5|Calls `FUN_180129c90(module,mode)`|

Internal fields (8-byte module slot offsets): phaser0x885, flange/chorus0x91c, echo0xc43, reverb0x113c. FX modulator enable byte at module+0x4278 is reevaluated as **any activeFXmode>0**. Several section handlers clear DSP buffers only when previous mode wasOff. Reapplying all presets should not inadvertently clear each active effect repeatedly through a false-button sweep.

View MAIN/ARP-FX event handlers (extract728–751) set display flags and refresh layout; they do not change the above mode fields. This supports keeping the full studio visible while the synthesizer panel changes.

## All registered native slider limits

These65 registrations are decoded directly from `FUN_180131620` (starts258247), resolving constants from the supplied PE. `FUN_180009a80` constructor arguments contain lower/upper/default physical values and store them at control slots0x9a/0x9b/0x82. Table values below are native physical numbers; discrete index ranges are not literal voice counts/octave lengths. A separate callback may turn those indexes into displayed semantic values. Line identifies the registration in `dsp-decompiled.c`.

| Native source ID | Physical range | Default | Module control slot | Line |
|---|---:|---:|---|---:|
| `RateKnob` | 0.01…20 | 6 | `0xa8` | 258631 |
| `fxModRateKnob` | 0.01…20 | 6 | `0xa9` | 258647 |
| `GlideKnob` | 1…500 | 1 | `0xa7` | 258664 |
| `voiceAssgnNumOfVoices` | 0…4 | 0 | `0xa6` | 258682 |
| `voiceAssgnUniDetune` | 0…1 | 0.2 | `0xa5` | 258697 |
| `VCO1LFOKnob` | 0…1 | 0 | `0xa4` | 258712 |
| `XmodKnob` | 0…1 | 0 | `0xa3` | 258727 |
| `VCO2LFOKnob` | 0…1 | 0 | `0xa2` | 258741 |
| `DetuneKnob` | -7…7 | 0.1 | `0xa1` | 258755 |
| `MixVCO1Knob` | 0…1 | 0.7 | `0xa0` | 258774 |
| `MixVCO2Knob` | 0…1 | 0.7 | `0x9f` | 258789 |
| `MixNoiseKnob` | 0…1 | 0 | `0x9e` | 258803 |
| `FAttackKnob` | 3…3000 | 5 | `0x9d` | 258819 |
| `FDecayKnob` | 3…10000 | 250 | `0x9c` | 258838 |
| `FSustainKnob` | 0…1 | 0.8 | `0x9b` | 258855 |
| `FReleaseKnob` | 3…10000 | 150 | `0x9a` | 258870 |
| `CutoffKnob` | -6…4.5 | 4.5 | `0x99` | 258887 |
| `ResonanceKnob` | 0…1 | 0 | `0x98` | 258902 |
| `VCFTrkKnob` | 0…1 | 0.45 | `0x97` | 258916 |
| `GlobKnob` | 0…1 | 0 | `0x96` | 258932 |
| `GrabKnob` | 0…1 | 0 | `0x95` | 258946 |
| `FilterLFOKnob` | 0…2 | 0 | `0x94` | 258961 |
| `LFOWaveKnob` | 0…5 | 2 | `0x92` | 258976 |
| `fxLFOWaveKnob` | 0…5 | 2 | `0x93` | 258990 |
| `Octave2Knob` | 0…4 | 1 | `0x91` | 259005 |
| `Wave2Knob` | 0…4 | 1 | `0x90` | 259020 |
| `Octave1Knob` | 0…4 | 1 | `0x8f` | 259034 |
| `ResponseKnob` | 0…4 | 0 | `0x8e` | 259049 |
| `Wave1Knob` | 0…4 | 2 | `0x8d` | 259063 |
| `FADSRKnob` | -1…1 | 0 | `0x7c` | 259213 |
| `FVelKnob` | 0…1 | 0 | `0x7b` | 259228 |
| `AAttackKnob` | 3…3000 | 5 | `0x79` | 259253 |
| `ADecayKnob` | 3…10000 | 250 | `0x78` | 259269 |
| `ASustainKnob` | 0…1 | 0.8 | `0x77` | 259284 |
| `AReleaseKnob` | 3…10000 | 150 | `0x76` | 259298 |
| `GrotKnob` | 0…1 | 0 | `0x75` | 259314 |
| `AmpLFOKnob` | 0…1 | 0 | `0x74` | 259327 |
| `AVelKnob` | 0…1 | 0 | `0x73` | 259342 |
| `VolumeKnob` | 0…1 | 0.5 | `0x71` | 259368 |
| `TuneKnob` | -7.1…7.1 | 0 | `0x70` | 259382 |
| `arpSpeed` | 0.25…30 | 6.5 | `0x62` | 259573 |
| `phsrSpeed` | 0.01…8 | 0.4 | `0x4a` | 259860 |
| `phsrDepth` | 0…1 | 0.65 | `0x49` | 259878 |
| `phsrFXModAmt` | -1…1 | 0 | `0x48` | 259893 |
| `flngChorSpeed` | 0.01…8 | 1 | `0x47` | 259908 |
| `flngChorRes` | 0…1 | 0.7 | `0x46` | 259926 |
| `flngChorDepth` | 0…1 | 0.65 | `0x45` | 259941 |
| `echoTime` | 1…2000 | 500 | `0x44` | 259957 |
| `flngChorFXModAmt` | -1…1 | 0 | `0x43` | 259973 |
| `flngChorMix` | 0…1 | 0.5 | `0x42` | 259989 |
| `echoTimeModAmt` | -1…1 | 0 | `0x41` | 260003 |
| `echoMix` | 0…1 | 0.25 | `0x40` | 260019 |
| `phsrRes` | 0…1 | 0.7 | `0x3f` | 260032 |
| `phsrQwidth` | 0.01…1 | 0.8 | `0x3e` | 260045 |
| `echoFdbck` | 0…1 | 0.35 | `0x3d` | 260060 |
| `echoModRate` | 0.2…20 | 6 | `0x3c` | 260077 |
| `echoModDepth` | 0…1 | 0 | `0x3b` | 260094 |
| `echoDamp` | 0…1 | 0.2 | `0x3a` | 260109 |
| `echoSpread` | 0…20 | 5 | `0x39` | 260122 |
| `reverbDec` | 0…1 | 0.5 | `0x38` | 260137 |
| `reverbPredelay` | 0…150 | 0 | `0x37` | 260151 |
| `reverbHP` | 20…20000 | 20 | `0x36` | 260168 |
| `reverbLP` | 20…20000 | 20000 | `0x35` | 260185 |
| `reverbDecModAmt` | -1…1 | 0 | `0x34` | 260201 |
| `reverbMix` | 0…1 | 0.5 | `0x33` | 260218 |

## Independently confirmed range discrepancies

- `FAttackKnob`/`AAttackKnob`:3…3000ms, default5. Both constructor unit strings decode literally to `ms` (VA0x1804349a4/0x18043530c). Callback `FUN_18012d630` extract167/225 computes the native attack coefficient from that physical millisecond value. A10000ms maximum differs from native.
- `FilterLFOKnob`:0…2, default0. Callback extract202–204 maps physical×0.2 to target `DAT_1805af200`; full knob therefore reaches0.4, twice the depth available with an assumed0…1 physical range. Constructor also declares a custom midpoint0.2, so do not infer exact normalized free curve only from the maximum.
- `TuneKnob`:−7.1…+7.1 **semitones**, default0. Registration explicitly labels `Semitones`. VA0x1805101d0/0x1805101d8 hold f64−7.1/+7.1 (raw `6666666666661cc0`/`6666666666661c40`). Callback extract114–116 sets `DAT_1809d60c0=physical/12` (`DAT_18050f5b8=12`), then frame processing smooths into `DAT_1807c28f8`. The unusual endpoints are directly evidenced, not rounded guesses.

## Known limits of this audit

- Physical ranges/defaults and sync tables are verified. **Follow-up resolved native host curves:** see `slider-curve-research.md` and `native-slider-curves.json`. Native JUCE power/skew curves differ from previous web logarithmic curves; the original free-value→normalized uncertainty is superseded by that evidence. Parent's earlier roundtrip was internal consistency, not native-curve correctness.
- The audio sounding identical to a licensed native plugin is not established by static control research. No A/B render or native execution was performed.
- Native DSP formulas for VCO/filter/envelope are covered by sibling audio research, not duplicated here.
- No native-code basis was established for speculative7.3.4 additions. Do not reuse its algorithms solely because a shared chat called them native.

Machine-readable artifacts: `native-control-limits.json`, `native-control-slots.json`, `native-sync.json`, `native-mode-mapping.json`. Reproducible local decoder: `reference/extract-control-limits.py`; raw function extracts in `reference/` are research helpers, not shipped app assets.
