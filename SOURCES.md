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
called Polivoks; the studio is FORMANTA — Sound Laboratory.

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

The catalogue contains 220 distinct source MIDI arrangements/riffs across 25 genre/context folders, with 151 paired source drum parts. `REPERTOIRE.json` records each source URL, arranger/uploader, original title, local SMF SHA-256, duration and part metadata. `MUSIC_CATALOG.csv` also identifies the associated source-bank program.

The retained earlier arrangements were retrieved on 2026-10-19 from Online Sequencer’s publicly delivered note data and converted to SMF with its public export mappings. New material was acquired on 2026-10-24 through the site’s ordinary Download .mid control, using Popular / All time and featured listings as selection inputs: https://onlinesequencer.net/sequences . Plays are a popularity signal, not an official score-accuracy rating.

Malformed source exports were accepted only when correcting out-of-range note velocities to127 or the invalid drum-program byte255 to0. Raw and resulting hashes plus exact byte-change counts are retained in source metadata. Pitch, event order, timing and duration were not rewritten. Files with unresolved malformed events were excluded. Alternative arrangements of the same identifiable composition were removed during curation.

These are community transcriptions and arrangements, not original studio MIDI or certified Polivoks stems. Artist grouping provides repertoire context; the original instrument used for each part is unverified. Source and rights holders retain their respective rights; these arrangements are not relicensed as original or public-domain work.

The opening uses a newly synthesized short Moscow Nights motif associated with the Mayak interval signal, by Vasily Solovyov-Sedoi; no broadcast recording is included. Drum kits are synthesized interpretations, not proprietary drum-machine samples.

## Platform

- AudioWorklet processing: https://webaudio.github.io/web-audio-api/
- WebAssembly SIMD: https://webassembly.github.io/spec/core/
- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

All browser runtime resources are local. The public source links open only
when the visitor selects them; source MIDI playback uses the bundled files.


## Native audit8.0

Provided Ghidra DSP and standalone-host decompilation plus PE constants; static analysis only. See NATIVE_AUDIT.md and research/ for verified addresses, curves and equations. No native binary is redistributed or executed. The public shared chat and7.3.4 are untrusted hints, not implementation authority.
