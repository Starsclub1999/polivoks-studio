# Sources and credits / Источники и благодарности

## Sound and control reference

The user-supplied preset archive provides 458 numeric sound programs and
the source hierarchy (308 factory, 100 INHALT, 50 Snakes of Russia).
The additional user-supplied VST3/standalone archive provides a native
Windows reference and its user guide. Controls, physical ranges and switch
positions were checked against that guide. `js/soundbook.js` retains the
source numeric values, original English names, metadata and per-file hashes.

No proprietary executable, original GUI asset or user guide PDF is included
in this release. The pixel cabinet, reception, catalogue and folder are
rendered by the app's own HTML/CSS/canvas code. The browser instrument is
called Polivoks; the studio is FORMANTA — Sound Clinic.

The closed native DSP cannot establish a browser implementation by itself.
The release uses its own C/WebAssembly/JavaScript synthesis model, documented
in `DSP_NOTES.md`, and does not claim measured identical sound.

## Polivoks history and published circuits

- Vladimir Kuzmin interview, Analogik:
  https://analogik.com/articles/180/polivoks-russian-vintage-synth
- Vladimir Kuzmin interview, Red Bull Music Academy:
  https://web03125.microsites03.redbull.com/2016/03/vladimir-kuzmin-interview/
- René Schmitz / Schmitzbits, published VCF, VCA, VCO, keyboard and connector
  schematics: https://www.schmitzbits.de/polivoks/index.html
- Marc Bareille / Papareil Synth Labs, filter adaptation and construction:
  http://m.bareille.free.fr/modular1/vcf_polivoks/vcf_polivoks.htm
- ModularSynthesis, Polivoks filter construction and measurements:
  https://modularsynthesis.com/kuzmin/polivoks/polivoks_vcf.htm
- Erica Synths, published DIY module schematics, boards and documentation:
  https://github.com/erica-synths/diy-eurorack

The manual credits Vladimir Kuzmin and the engineering team, with Olimpiada
Kuzmina's cabinet design. It distinguishes original design, public schematic
archives and later hardware/digital modelling contributions. Mark Barton
(MRB) is acknowledged for later modelling research; no closed DSP source is
represented as having been published or included in this browser model.

## Music sources

`REPERTOIRE.json` records every bundled MIDI arrangement: source URL,
uploader, source title, track names, source protobuf hash, local SMF hash,
length and recommended sound. `MUSIC_CATALOG.csv` is the readable catalogue.

The fourteen publicly accessible Online Sequencer arrangements were retrieved
on 2026-10-19. The site's publicly delivered protobuf note data were converted
to standard SMF 1 using its public schema and MIDI export pitch/drum mappings.
Only notes, timing, velocity, track labels/program numbers and tempo changes
are used; no third-party player or synthesizer code is shipped. Timing uses
384 PPQN (96 ticks per source sixteenth); source volume and instrument volume
are converted by the source export's velocity scale and MIDI's 1…127 limits.

These are community transcriptions/arrangements of existing music, not
original studio MIDI or certified original Polivoks stems. Artist grouping
provides repertoire context. The USSR folder is explicitly period repertoire.
The original instrument used for each transcribed part is not verified.
Credit on a public source is not a representation of a new redistribution
licence. Source/rights holders retain their respective rights; the site does
not relicense their music as original or public domain.

For Polivoks use in DOOM, see Mick Gordon's own music presentation and
interview, e.g. https://origineffects.com/2016/06/21/the-tunes-of-doom-it-djents-interviews-mick-gordon/
The existence of that use does not establish every transcribed DOOM part's
original instrument.

The opening uses a newly synthesized short Moscow Nights motif associated
with the Mayak interval signal (composer Vasily Solovyov-Sedoi). It does not
use a broadcast recording. Drum kits are synthesized interpretations;
proprietary drum-machine samples are not bundled.

## Platform

- AudioWorklet processing: https://webaudio.github.io/web-audio-api/
- WebAssembly SIMD: https://webassembly.github.io/spec/core/
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

All browser runtime resources are local. The public source links open only
when the visitor selects them; source MIDI playback uses the bundled files.
