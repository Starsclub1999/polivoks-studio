# FORMANTA — Sound Clinic · 7.0

A pixel hardware studio with Polivoks, an independent piano-roll composer,
drum machine, oscilloscope and Elektronika K–82 sound/music catalogue.
Russian and English interfaces include a 27-chapter laboratory-folder manual.

Extract the entire archive. On Windows run `start-windows.cmd` with Python 3
installed. On macOS/Linux run `python3 start-local.py`. Keep the server window
open. Audio requires localhost or HTTPS; opening HTML through `file://` only
provides reception and the manual. Browser security does not need to change.

For GitHub Pages, upload all files and folders, with `index.html` in the
published root. Select the branch and root folder in Settings → Pages.
No build, npm installation, CDN or application server is required.

Press START, watch the Formanta logo and newly synthesized short Mayak
interval-signal motif, choose a language, then read the folder or enter the lab.

The 458 source sound programs retain their original numeric settings and
English names. The MAIN and ARP/FX pages retain the established pixel cabinet.
Stepped controls, loop switches and glide direction have been corrected.
The independent C/WebAssembly SIMD engine uses f64 arithmetic, fourfold
oscillator/filter processing, a convergence-controlled nonlinear implicit
solve and two halfband decimation stages. A JavaScript filter fallback is
included. See `DSP_NOTES.md` for calibration assumptions and limits.

AUTO benchmarks the engine. LIVE runs in AudioWorklet without an extra PCM
queue. Worker profiles use 43/128/341 ms queues at the same algorithmic
quality. Buffering adds latency; it cannot make an overloaded engine faster.
Actual USB/interface latency and FiiO/Steinberg hardware were not measured.

The music library replaces procedural factory placeholders with 14 existing
community MIDI arrangements/riffs, approximately 46 minutes in total, plus
8 source drum parts. Select actual source tracks individually or together.
Each card credits its uploader and links to the source. Artist folders do not
certify that a particular original studio part was played on Polivoks. Period
repertoire is labelled separately. Short riffs retain their source length.
The 68 synthesized drum sound kits remain independent of MIDI patterns.

Arrangements are no longer capped at a minute; sparse storage supports long
MIDI and manually composed scores. Notes and drums have separate ends and
non-destructive playback-range cropping. Practical limits are memory,
2 million events per type, a 24 MB input MIDI and 32-bit bar addressing.
SMF 0/1, tempo maps, fractional positions, sustain, SMPTE and GM drum numbers
are supported. SysEx and general CC automation are not imported.

Stereo PCM recording has no five-minute timer. Chunked WAV assembly and
RF64 headers support long takes, subject to available browser memory.
JSON v7 preserves projects; earlier sessions and personal sounds can be restored.

This is an independent browser reconstruction. Native Windows plugin binaries
are neither executed nor included. Identical sound to the native reference or
physical instrument has not been established. Sources, repertoire and performed
checks are documented in `SOURCES.md`, `REPERTOIRE.json`, `VALIDATION.md`.
