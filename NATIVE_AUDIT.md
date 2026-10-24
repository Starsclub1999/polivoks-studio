# Проверка декомпиляции и исходной базы · 8.0

За основу взят наш архив7.0. Версия7.3.4 и публичный чат изучались отдельно;
их утверждения использовались только как гипотезы. Код их нового движка,
«калибровочный» EQ, стереорасширение и предполагаемые нативные алгоритмы
автоматически не переносились.

Источник проверки — предоставленные Ghidra-псевдокод и PE-константы DSP-библиотеки,
а также код host для кривых регуляторов. Псевдокод не является оригинальным
компилируемым исходником. Бинарники не запускались и не входят в сайт.

| Находка | Подтверждение | Изменение |
|---|---|---|
|65диапазонов/значений по умолчанию|DSP FUN_180131620|Исправлены Attack3–3000ms, Filter Mod0–2, Tune±7.1полутона|
|27нелинейных и38линейных кривых|Host FUN_1404aee70,1404af070,1400f2460,1400f2330|Вместо предположенной логарифмической шкалы применяется native skew, включая симметричные кривые|
|20делений и направление индекса|VA0x180434100; FUN_18012d630|Исправлены LFO, ARP, phaser, chorus, echo sync|
|50%gateARP|FUN_180125e60,125e10,123670|Заменены неподтверждённые76%|
|Режимы и first-key reset|FUN_18012b2f0,12c500,12d630|Состояние страниц отделено от маршрута звука|
|Огибающие|FUN_18000de80|Экспоненциальные цели, реальные коэффициенты и уровни|
|Основной фильтр|FUN_18000f290,00e0c0,00df50|Два интегратора, slew clipping, асимметричные границы, точные AA-каскады|
|Генераторы и таблицы|FUN_18000d970,12f9e0|33диапазона, Fourier-таблицы, разные duty двух VCO, экспоненциальная FM|
|Распределение CV/velocity|FUN_18000f9c0,126630|Нота36 как опора, velocity², проверенные коэффициенты|

Все458 исходных программ сохраняют sourceValues, исходные имена, метаданные и
хеши. Позиции ручек пересчитаны по подтверждённым кривым. Две исходные записи
выходят за объявленный диапазон Filter Attack: Big Reese4545.534ms и
Sweet Triangles4180.663ms. В интерфейсе применяется предел3000ms; исходные
числа сохранены. Это явная обработка несовместимости исходных данных с диапазоном,
а не незаметная замена исходного архива.

Lo Fi Club Key: source reverbOff=true, поэтому ревербератор должен быть выключен.
Хор и ленточное эхо включены. Его echoTime575.740ms даёт native unit.536203,
индекс10, то есть.5четвертной доли в синхронном режиме. Добавление реверберации
«на слух» изменило бы исходную программу.

Перенос подтверждённых формул основного тракта не доказывает полное совпадение
со всеми скрытыми состояниями нативного приложения. FX остаются собственными
реализациями; детали — DSP_NOTES.md. Проверенные тесты — VALIDATION.md.

## Follow-up: 8.1

The newer bounded audits in research/native-tempo-fx.md and research/native-noise-audit.md
supersede earlier assumptions about FX LFO smoothing, echo modulation units/mix,
source standalone tempo and main sample-and-hold distribution. Source preset bytes
and their 458 normalized parameter sets are unchanged from 8.0. Crushed Planets'
fully wet delay is retained. The reported persistent freeze was not reproduced as
a numeric failure; stress testing did expose Edit Bass deadline pressure from
voice overlap. That load and stale ARP program deadlines have been addressed.

## Follow-up: 8.2

The supplied current archive again matched all458 source program hashes,49,471 native parameter entries and38,930 normalized panel values. No factory sound values were replaced with invented settings. Both panels now load unconditionally; stale FX/mode flags and the composer/clock link controls were removed. Program selection resets performance input to neutral as a deliberate consistency rule; native preset-load behavior for those live controller values was not established.

Controller mapping uses t=x^(c<=0 ? 1-c : 1/(1+c)), then min+(max-min)*t. Discrete positions use nearest-step rounding; two-state switches use unit>.5, with inverse loop conventions preserved.150 independent reference points cover affected curve and discrete mappings.

All28 native LED registrations were mapped. State, oscillator-phase, graded phase and synth-only output meter paths are distinct. FX LFO continues advancing during bypass; the registered ARP-speed lamp has no located runtime setter and remains dark. Output uses three green and two red lenses with the source polynomial, not invented dB thresholds. A100ms clip hold follows the apparent native host duration; the forwarded host API units were not independently proven. PCM telemetry is stamped with rendered frames and displayed at playback time. Layout changes retain drawn knob pointers and the same hit geometry.

Native program data fidelity does not imply bit-identical full audio. The earlier reconstruction limitations still apply. No proprietary binaries or manual PDF are distributed.
