'use strict';
let ctx=null,node=null,analyser=null,engine=null,audioWorker=null,audioOut=null,audioReady=false,startPromise=null,processorMode='',micStream=null,micNode=null,recChunks=[],recording=false,recStart=0,recSamples=0,audioLate=0,audioPeak=0,audioVoices=0,audioQueueSeconds=0,nativeTone=null,nativeToneGain=null,resolvedAudioProfile='';
const audioPerf={underruns:null,missing:0,queued:0,load:0,worst:0,block:0,quantum:0,late:0,benchmark:null};
let audioProfile=PVBoot.fresh?'auto':(PVStore.get('audio-profile-v3')||'auto');
if(!['auto','live','buffered','safe','direct'].includes(audioProfile))audioProfile='auto';
const AUDIO_VERSION='6.0.0';
let directReadyPromise=null,audioUnlockPending=false;
function audioURL(path){let u=new URL(path,document.baseURI);u.searchParams.set('v',AUDIO_VERSION);return u.href}
function statePacket(){return{type:'params',p:performanceParams(),fx:{...fx,bpm:typeof tempoAt==='function'&&playing?tempoAt(playheadStep):+$('bpm').value,kit:drumKits[currentKit],drumTracks},extended,wheel:modWheel,bend,pressure}}
function post(m){if(!audioReady)return;if(audioWorker){if(m.type==='record')node.port.postMessage(m);else audioWorker.postMessage({type:'command',data:m})}else node?.port.postMessage(m)}
function syncAudio(){post(statePacket())}
function updateAudioDiagnostic(){
 if(!$('audioDiagnostic'))return;const sr=ctx?.sampleRate||48000,under=audioPerf.underruns===null?'не измеряются':audioPerf.underruns;
 $('audioDiagnostic').textContent=processorMode+' · провалы '+under+' · очередь '+Math.round(audioPerf.queued/sr*1000)+' мс · вывод '+audioPerf.quantum+' отсч.';
 let test=audioPerf.benchmark,device=ctx?Math.round(((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000):0;
 $('diagnosticReadout').textContent=(audioWorker?'Готовый PCM: '+Math.round(audioPerf.queued/sr*1000)+' мс. DSP '+audioPerf.load.toFixed(0)+'%, максимум блока '+audioPerf.worst.toFixed(1)+' мс. ':'LIVE: дополнительной PCM-очереди нет; пропуски драйвера здесь не измеряются. ')+(test?'Стартовый тест 16 голосов: P95 '+test.p95.toFixed(2)+' / бюджет '+test.budget.toFixed(2)+' мс. ':'')+'Заявленная браузером задержка тракта: '+device+' мс. Это не замер задержки от клавиши до наушников.';
}
function handleAudioMessage(m){
 if(m.type==='pcm')acceptPCM(m.chunks);
 if(m.type==='meter'){audioPeak=m.peak||0;if(m.voices!==undefined)audioVoices=m.voices;audioPerf.quantum=m.quantum||128;if(m.late!==undefined)audioPerf.late=m.late;if(m.underruns!==undefined){audioPerf.underruns=m.underruns;audioPerf.missing=m.missing;audioPerf.queued=m.queued}updateAudioDiagnostic()}
}
async function loadWorklet(path){await ctx.audioWorklet.addModule(audioURL(path))}
async function probeAudio(){
 if(!window.Worker)return null;let worker=new Worker(audioURL('audio/probe.js'),{type:'module',name:'Polivoks startup probe'});
 try{return await new Promise((resolve,reject)=>{let timer=setTimeout(()=>reject(Error('Тест производительности: таймаут')),8000);worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message||'Ошибка теста DSP'))};worker.onmessage=e=>{clearTimeout(timer);e.data.type==='result'?resolve(e.data):reject(Error(e.data.message))};worker.postMessage({sr:48000,state:statePacket()})})}finally{worker.terminate()}
}
async function createDirectAudio(){
 audioWorker?.terminate();audioWorker=null;audioQueueSeconds=0;audioPerf.underruns=null;
 if(!ctx.audioWorklet)throw Error('AudioWorklet недоступен. Используйте HTTPS или localhost.');
 await loadWorklet('audio/direct.js');
 node=new AudioWorkletNode(ctx,'pv-direct',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{state:statePacket()}});
 directReadyPromise=new Promise((resolve,reject)=>{let timeout=setTimeout(()=>reject(Error('LIVE: движок не ответил')),8000);node.onprocessorerror=()=>{clearTimeout(timeout);reject(Error('Не удалось инициализировать LIVE DSP'))};node.port.onmessage=e=>{if(e.data.type==='primed'){clearTimeout(timeout);resolve()}else handleAudioMessage(e.data)}});
 processorMode='LIVE / DSP 6';
}
async function createBufferedAudio(profile){
 const block=profile==='live'?512:profile==='safe'?2048:1024,goal=profile==='live'?4:profile==='safe'?8:6;
 audioQueueSeconds=block*goal/ctx.sampleRate;await loadWorklet('audio/consumer.js');
 node=new AudioWorkletNode(ctx,'pv-buffered-sink',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});node.port.onmessage=e=>handleAudioMessage(e.data);
 const channel=new MessageChannel();node.port.postMessage({type:'pipe',goal,block,port:channel.port2},[channel.port2]);
 audioWorker=new Worker(audioURL('audio/producer.js'),{type:'module',name:'Polivoks DSP 6'});
 await new Promise((resolve,reject)=>{let timeout=setTimeout(()=>reject(Error('PCM Worker: время запуска истекло')),10000);audioWorker.onerror=e=>{clearTimeout(timeout);reject(Error('DSP Worker: '+e.message))};audioWorker.onmessage=e=>{const m=e.data;if(m.type==='primed'){clearTimeout(timeout);resolve()}if(m.type==='workerStats'){audioPerf.load=m.load;audioPerf.worst=m.worstMs;audioPerf.block=m.blockMs;audioPerf.late=m.late;audioVoices=m.voices;updateAudioDiagnostic()}};audioWorker.postMessage({type:'init',sr:ctx.sampleRate,block,goal,frame:Math.round(ctx.currentTime*ctx.sampleRate),state:statePacket(),port:channel.port1},[channel.port1])});
 audioPerf.underruns=0;processorMode='WORKER / PCM '+Math.round(audioQueueSeconds*1000)+' ms';
}
async function startAudio(){
 if(startPromise)return startPromise;
 startPromise=(async()=>{try{
  $('audioProfile').disabled=true;
  if(!ctx){
   let selected=audioProfile,benchmark=null;
   ctx=new(window.AudioContext||window.webkitAudioContext)({sampleRate:48000,latencyHint:['auto','direct','live'].includes(audioProfile)?'interactive':.025});
   audioUnlockPending=true;await ctx.resume();audioUnlockPending=false;await ctx.suspend();
   if(selected==='auto'){
    $('power').textContent='ТЕСТ DSP…';
    try{benchmark=await probeAudio()}catch(e){toast(e.message+'; выбран PCM 128 мс')}
    selected=benchmark&&benchmark.p95<benchmark.budget*.55&&benchmark.p99<benchmark.budget*.9?'direct':benchmark&&benchmark.mean<benchmark.budget*.7?'live':'buffered';
   }
   resolvedAudioProfile=selected;
   analyser=ctx.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=.75;
   Object.assign(audioPerf,{underruns:null,missing:0,queued:0,load:0,worst:0,block:0,quantum:0,late:0,benchmark});
   if(selected==='direct')await createDirectAudio();
   else {try{await createBufferedAudio(selected)}catch(e){toast('PCM: '+e.message+'; попытка LIVE');node?.disconnect();await createDirectAudio();resolvedAudioProfile='direct'}}
   const previousError=node.onprocessorerror;node.onprocessorerror=e=>{previousError?.(e);PVBoot.failure('Ошибка аудиопроцессора. Выберите другой аудиопрофиль для перезапуска.')};
   audioOut=ctx.createGain();audioOut.gain.setValueAtTime(0,ctx.currentTime);node.connect(audioOut);audioOut.connect(analyser);analyser.connect(ctx.destination);
   audioUnlockPending=true;await ctx.resume();audioUnlockPending=false;if(directReadyPromise)await directReadyPromise;
   audioReady=true;syncAudio();audioOut.gain.setTargetAtTime(1,ctx.currentTime,.006);
   if(micStream){micNode=ctx.createMediaStreamSource(micStream);micNode.connect(node)}
  }
  audioUnlockPending=true;await ctx.resume();audioUnlockPending=false;PVBoot.audioStarted();$('audioLed').classList.add('on');$('status').lastChild.textContent=' 48 kHz / '+(audioWorker?'PCM':'LIVE');$('power').textContent='ЗВУК ВКЛЮЧЁН';$('power').classList.add('on');$('engineInfo').textContent=processorMode+' • 48000 Hz • НЕЛИНЕЙНЫЙ ФИЛЬТР 2×';updateAudioDiagnostic();return true;
 }catch(e){
  audioReady=false;audioUnlockPending=false;directReadyPromise?.catch(()=>{});directReadyPromise=null;audioWorker?.terminate();audioWorker=null;node?.disconnect();analyser?.disconnect();audioOut?.disconnect();if(ctx){try{await ctx.close()}catch{}}ctx=node=analyser=engine=audioOut=null;
  $('power').textContent='ПОВТОРИТЬ ЗАПУСК';$('engineInfo').textContent='ОШИБКА: '+e.message;PVBoot.failure('Не удалось включить звук: '+e.message);toast('Аудио: '+e.message);return false;
 }finally{$('audioProfile').disabled=false;startPromise=null}})();return startPromise;
}
async function changeAudioProfile(){
 audioProfile=$('audioProfile').value;PVStore.set('audio-profile-v3',audioProfile);if(!ctx)return;
 if(recording)await stopRecording();stopNativeTone();stop();micNode?.disconnect();node?.disconnect();analyser?.disconnect();audioOut?.disconnect();audioWorker?.terminate();audioWorker=null;await ctx.close();ctx=node=analyser=engine=audioOut=null;directReadyPromise=null;audioReady=false;startPromise=null;await startAudio();toast(processorMode);
}
function stopNativeTone(){if(!nativeTone)return;try{nativeToneGain.gain.setTargetAtTime(0,ctx.currentTime,.006);nativeTone.stop(ctx.currentTime+.05)}catch{}nativeTone=null;nativeToneGain=null;if(audioOut)audioOut.gain.setTargetAtTime(1,ctx.currentTime,.01);$('nativeTone').classList.remove('on');$('nativeTone').textContent='▶ ЧИСТЫЙ ТОН / ТЕСТ'}
async function testNativeTone(){if(nativeTone){stopNativeTone();return}if(!await startAudio())return;emergencyReset();audioOut.gain.setTargetAtTime(0,ctx.currentTime,.006);nativeTone=ctx.createOscillator();nativeTone.type='sine';nativeTone.frequency.value=440;nativeToneGain=ctx.createGain();nativeToneGain.gain.setValueAtTime(0,ctx.currentTime);nativeToneGain.gain.linearRampToValueAtTime(.045,ctx.currentTime+.04);nativeTone.connect(nativeToneGain);nativeToneGain.connect(analyser);nativeTone.start();$('nativeTone').classList.add('on');$('nativeTone').textContent='■ ВЫКЛЮЧИТЬ ЧИСТЫЙ ТОН';toast('Чистый тон обходит DSP синтезатора и барабанов.')}
$('power').onclick=()=>{if(audioUnlockPending&&ctx)ctx.resume().catch(()=>{});return startAudio()};
