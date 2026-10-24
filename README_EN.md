# FORMANTA — Sound Laboratory · 8.2

A physical pixel studio with Polivoks, a piano-roll terminal, an independent drum machine and an oscilloscope. Two instrument panels, Russian and English, a self-contained offline page and a buildless GitHub Pages version. Based on our 8.1 release; 7.3.4 is not used as the implementation base.

## Run before publication

1. Extract the archive.
2. Open **OPEN_FORMANTA.html** in Chrome or Edge.
3. Press **START**, choose a language and enter the laboratory.

The standalone page contains all MIDI, artwork, font and audio modules. It can be copied on its own and needs no server or network. Audio starts through a user action.

For the modular site, use **start-windows.cmd** on Windows or `python3 start-local.py` on macOS/Linux. The Windows launcher uses PowerShell without installing Python. Open `index.html` through localhost or HTTPS; direct file opening shows the appropriate entry route.

## Changes in 8.2

- Rechecked all **458** source programs against the supplied archive. Choosing a sound always restores both panels, effects, voice assignment, controller mappings and original independent synth tempo. Wheel, pressure and bend return to neutral. **↺** restores the selected program while retaining notes and drums.
- Correct native controller curves and discrete destinations, including waves, ranges and switches. Empty sound types are excluded from each collection.
- **28** source-derived lamps show switch state, oscillator phases and synth output. PCM indications follow playback time. The second panel’s captions avoid buttons, and the output meter has three green and two red lamps.
- **220** actual MIDI compositions/riffs in **25** genre folders, **151** paired source drum parts and **68** sound kits, totaling about **10.6 hours**. Source lengths are preserved and not padded with repeats. Cards retain arranger credits and source links.
- CRT folder navigation uses **▲ / ▼ → ENTER → BACK**. Root search spans all genres. Cards select a MIDI part, complete source-bank program and matched percussion. Loading notes automatically applies the associated sound.
- Distinct mechanical control sounds for devices and menus, with independent volume and disable switch. They are excluded from WAV recording. The synth keyboard and solo drum audition pads have no interface clicks.
- Physical switches and device-specific sliders replace ordinary checkbox/range artwork. Fullscreen is in the upper-right corner, including startup. The paginated manual has **29 chapters**.

New score sound associations follow the source GM instrument role and musical context, using complete unchanged source-bank programs. Acoustic parts are interpreted on Polivoks; no external GM sampler is included.

## Controls

Drag a knob vertically; Shift makes adjustments finer. The mouse wheel adjusts values. Double-click restores a control’s initial setting; ↺ restores the selected program. `A W S E D F…` plays, Z/X changes octave, space toggles transport and Escape resets playback.

**SYNTH TEMPO** is the independent ARP and synced-modulation clock, from 1 to 450 BPM. It is not a separate timbre-color setting. Source standaloneTempo is restored: Tundra Riders and Motr use 86 BPM. Composer/MIDI tempo remains independent.

Both editors support long scores, precise positions, adjustable track ends, seeking and independent page follow. Manual browsing suspends follow; **FOLLOW** returns the view to playback. Project files preserve edited notes, sounds and personal score-to-program associations. Earlier projects import without deleting their music.

## GitHub Pages

Upload the folder contents to a repository, retaining `index.html`, `js/`, `audio/` and `assets/` together. In Settings → Pages choose the branch and root folder. Visitors need no Node, npm or application server. Relative asset paths support subdirectory hosting.

## Audio and verification

AudioWorklet handles output, a separate Worker renders the PCM profiles, and a C/WebAssembly f64 core implements the native-derived VCO/VCF with a JavaScript calculation fallback. The Windows plug-in is neither executed nor bundled. Effects remain independent implementations with verified parameters, clock and modulation/mix behavior. Full native sound identity is not established without comparative A/B renders.

Existing profile latency is unchanged. LIVE adds no PCM queue; PCM profiles add about 43/128/341 ms at 48 kHz. AUTO measures processing headroom. Larger queues do not accelerate overloaded DSP. Clean test tone and diagnostics are in Settings. Physical FiiO and Steinberg hardware was not tested.

See `VALIDATION.md`, `TEST_REPORT.json` and `NATIVE_AUDIT.md`. Sixteen voices, unison and every effect can cause load spikes; zero latency or glitch-free output on every computer is not promised. Intended source noise and delayed fully wet echo attacks remain part of their original sounds.

## Music and development

`REPERTOIRE.json` and `MUSIC_CATALOG.csv` retain source metadata, arranger credits and hashes. Artist/genre grouping does not prove every original part used Polivoks. These are community MIDI arrangements performed through the laboratory instrument. Drum events come from the same source MIDI; kits are synthesized separately.

Import accepts SMF 0/1 MIDI up to 24 MB, two million notes and two million drum events, with an address range up to 2³²−1 bars. There is no one-minute duration limit. Tempo, sustain and channels are supported; general CC automation and external GM instrument sounds are not imported. At most four selected MIDI files remain decoded in the cache; the entire catalogue is not expanded at startup.

Rebuild offline HTML: `python3 tools/build-offline.py`. Checks: `node tools/test-native.mjs`, `node tools/test-regressions.mjs`, `node tools/test-indicators.mjs`, `node tools/test-catalog.mjs`. Core rebuild: `node tools/build-core.cjs --cc /path/to/zig`.
