# Источники и границы переноса

## Предоставленный архив

`Atomika.zip`: Windows x64 `Atomika.vst3`, ресурсы интерфейса и 458
фабричных файлов пресетов. Коллекции: Atomika Presets (308), INHALT
Atomika Collection (100), Snakes of Russia Atomika Collection (50).
Названия коллекций и исходные метки авторства сохранены в данных.

Использованы числовые настройки пресетов, назначения контроллеров,
названия и расположение органов управления на двух панелях.
`js/soundbook.js` сохраняет исходные данные и SHA-256 каждого файла.
Windows-библиотека, изображения панели, служебные настройки и данные
аккаунта в сайт не включены. Звук и панель реализованы собственным кодом;
рисунок не является фотографией плагина с наложенными регуляторами.
Название веб-инструмента — «ПОЛИВОКС».

## Документация разработчика

Расположение и назначение функций сверены с руководством Cherry Audio:

- https://docs.cherryaudio.com/pdf/Atomika%20Synthesizer%20User%20Guide.pdf
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/osc
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/filter
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/amp
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/mod
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/arpeggio
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/effects
- https://docs.cherryaudio.com/cherry-audio/instruments/atomika-synthesizer/fxmod

Браузерная модель воспроизводит семейства функций, но не является
нативным MRB/Cherry Audio DSP и не заявляет точного совпадения звучания.
Названия сторонних инструментов и коллекций служат атрибуцией источника;
они не означают участие или одобрение их авторов.

## Собственные музыкальные материалы

192 нотные программы и 192 парные драм-партии сочинены для студии.
Новые программы не являются транскрипциями записей и не утверждают,
что исполнитель использовал эти партии или конкретный тембр.
Прежние фабричные стилизации и аранжировки Баха/Бетховена заменены.
Наборы 808/909/606/лоуфай и другие — синтезируемые стилизации; фирменные
аудиосэмплы в проект не входят.

## Веб-платформа

- https://developer.chrome.com/blog/audio-worklet-design-pattern
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

Выпуск использует JavaScript AudioWorklet и Worker/PCM. Он не содержит
WebAssembly-модуля, скомпилированного из VST3.
