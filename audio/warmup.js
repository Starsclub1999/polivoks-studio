import {SynthEngine} from './dsp.js?v=5.0.0';
export function warmEngine(sr,state){
 const p={...state.p,voices:3,unison:1,aa:.01,ad:.12,as:.8,res:.72,cutoff:.6,noise:.04,xPhase:.18,xRing:.15,xChorus:.3,xPwm:.2,xWow:.25,xCrush:.1};
 const e=new SynthEngine(sr,p,state.fx);e.extended=true;e.on(48,.8);
 const l=new Float32Array(256),r=new Float32Array(256);
 for(let i=0;i<40;i++){if(i%8===0){e.targetP.wave1=(i/8)%5;e.targetP.wave2=(i/8+1)%5;e.on(36+i,.8);for(let j=0;j<7;j++)e.drum(j,.65)}e.process(l,r)}
}
