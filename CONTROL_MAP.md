# Карта органов управления8.0

Позиции и взаимодействие берутся из js/panel-schema.js; указатель и шкала используют одинаковую угловую функцию. Нативные физические кривые совместно применяются UI и аудиотрактом.

|Панель|Параметр|Надпись|Диапазон/положения|Кривая|
|---|---|---|---|---|
|main|lfoRate|ЧАСТОТА|0.01…20|skew 0.332771966473|
|main|lfoShape|РЕЖИМ|↗ / ↘ / △ / П / Ш / СЛ|linear|
|main|lfoSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|main|wheelOn|КОЛЕСО|ВЫКЛ / ВКЛ|linear|
|main|reset|СБРОС|ВЫКЛ / ВКЛ|linear|
|main|glide|ГЛИССАНДО|1…500|skew 0.512382032066|
|main|duo|I / I+II|ВЫКЛ / ВКЛ|linear|
|main|unison|УНИСОН|ВЫКЛ / ВКЛ|linear|
|main|voices|КОЛ-ВО ГОЛОСОВ|МОНО / ДУЭТ / 4 / 8 / 16|linear|
|main|spread|РАЗНОБОЙ|0…1|linear|
|main|range1|ДИАПАЗОН|32′ / 16′ / 8′ / 4′ / 2′|linear|
|main|wave1|ВОЛНА|△ / ↗ / П / ┌ / ╷|linear|
|main|mod1|МОДУЛЯЦИЯ|0…1|skew 0.301029995664|
|main|range2|ДИАПАЗОН|32′ / 16′ / 8′ / 4′ / 2′|linear|
|main|wave2|ВОЛНА|△ / ↗ / П / ┌ / ╷|linear|
|main|mod2|МОДУЛЯЦИЯ|0…1|skew 0.301029995664|
|main|fm|ГЕНЕРАТОР II / ЧМ|0…1|linear|
|main|detune|РАССТРОЙКА|-7…7|skew 0.5 symmetric|
|main|mix1|ГЕНЕРАТОР I|0…1|linear|
|main|mix2|ГЕНЕРАТОР II|0…1|linear|
|main|noise|ШУМ|0…1|linear|
|main|fa|АТАКА|3…3000|skew 0.629780952931|
|main|fd|ЗАТУХАНИЕ|3…10000|skew 0.300676840553|
|main|fr|ПОСЛЕЗВУЧ.|3…10000|skew 0.430355395179|
|main|aa|АТАКА|3…3000|skew 0.629780952931|
|main|ad|ЗАТУХАНИЕ|3…10000|skew 0.300676840553|
|main|ar|ПОСЛЕЗВУЧ.|3…10000|skew 0.430355395179|
|main|fs|ПЬЕДЕСТАЛ|0…1|linear|
|main|as|ПЬЕДЕСТАЛ|0…1|linear|
|main|cutoff|ЧАСТОТА СРЕЗА|-6…4.5|linear|
|main|res|РЕЗОНАНС|0…1|linear|
|main|tracking|ОТСЛЕЖИВАНИЕ|0…1|linear|
|main|floop|РЕЖ. ГЕН. ОГИБ.|ВЫКЛ / ВКЛ|inverse|
|main|starve|ИСТОЩ.|0…1|linear|
|main|drive|ФИЛЬТ. ДРАЙВЕР|0…1|linear|
|main|response|ОТКЛИК|НЧ / СЧ / ВЧ / ПФ / ПИК|linear|
|main|fmod|МОДУЛЯЦИЯ|0…2|skew 0.301029995664|
|main|fenv|ГЛУБ. ОГИБ.|-1…1|linear|
|main|fvel|СКОРОСТЬ|0…1|linear|
|main|ampDrive|УСИЛИТ.|0…1|linear|
|main|aloop|РЕЖ. ГЕН. ОГИБ.|ВЫКЛ / ВКЛ|inverse|
|main|amod|МОДУЛЯЦИЯ|0…1|skew 0.756470797366|
|main|avel|СКОРОСТЬ|0…1|linear|
|shared|tune|МАСТ. СТРОЙ|-7.1…7.1|skew 0.5 symmetric|
|shared|volume|ГРОМКОСТЬ|0…1|linear|
|fx|fxRate|ЧАСТОТА|0.01…20|skew 0.332771966473|
|fx|fxShape|РЕЖИМ|↗ / ↘ / △ / П / Ш / СЛ|linear|
|fx|fxSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|fx|fxWheel|КОЛЕСО|ВЫКЛ / ВКЛ|linear|
|fx|fxReset|СБРОС|ВЫКЛ / ВКЛ|linear|
|fx|arpMode||ВЫК / ↑ / ↓ / ↑↓ / СЛЧ|linear|
|fx|arpRate|ЧАСТОТА|0.25…30|skew 0.5|
|fx|arpSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|fx|arpRange||1 / 2 / 3 / 4|linear|
|fx|phMode||ВЫК / 4 / 6 / 12|linear|
|fx|chMode||ВЫК / ФЛЭН / ХОР|linear|
|fx|eMode||ВЫК / ЦИФРА / ЛЕНТА / П–П|linear|
|fx|rMode||ВЫК / ПРУЖ / ПЛАСТ / КОМН / ЗАЛ / КОСМ|linear|
|fx|phRate|ЧАСТОТА|0.01…8|skew 0.5|
|fx|phRes|РЕЗОНАНС|0…1|linear|
|fx|phSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|fx|phDepth|ГЛУБИНА|0…1|linear|
|fx|phMod|МОДУЛЯТОР ЭФФ.|-1…1|skew 0.5 symmetric|
|fx|phWidth|ШИРИНА Q|0.01…1|linear|
|fx|chRate|ЧАСТОТА|0.01…8|skew 0.5|
|fx|chRes|РЕЗОНАНС|0…1|linear|
|fx|chSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|fx|chDepth|ГЛУБИНА|0…1|linear|
|fx|chMod|МОДУЛЯТОР ЭФФ.|-1…1|skew 0.5 symmetric|
|fx|chMix|МИКС|0…1|linear|
|fx|eTime|ВРЕМЯ|1…2000|skew 0.5|
|fx|eFeedback|ОБР. СВЯЗЬ|0…1|linear|
|fx|eRate|СКОРОСТЬ МОД.|0.2…20|skew 0.564533002438|
|fx|eSync|СИНХ.|ВЫКЛ / ВКЛ|linear|
|fx|eDamp|ДЕМПФЕР|0…1|linear|
|fx|eDepth|ГЛУБИНА МОД.|0…1|skew 0.5|
|fx|eMod|ВРЕМЯ / МОД.|-1…1|skew 0.5 symmetric|
|fx|eSpread|РАЗМАХ|0…20|linear|
|fx|eMix|МИКС|0…1|linear|
|fx|rDecay|РАСПАД|0…1|linear|
|fx|rPre|ПРЕДЗАДЕРЖКА|0…150|linear|
|fx|rHP|ВЧ|20…20000|skew 0.5|
|fx|rLP|НЧ|20…20000|skew 0.5|
|fx|rMod|РАСПАД / МОД.|-1…1|skew 0.5 symmetric|
|fx|rMix|МИКС|0…1|linear|
