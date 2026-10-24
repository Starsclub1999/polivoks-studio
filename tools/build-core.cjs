/* Reproducible standalone WebAssembly build. Needs Clang/wasm-ld or Zig.
 * node tools/build-core.cjs --cc /path/to/zig
 * No compiler, package manager or external runtime is needed by the website.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const args=process.argv.slice(2),at=args.indexOf('--cc'),compiler=at>=0?args[at+1]:(process.env.FORMANTA_CC||'clang');if(!compiler)throw Error('Missing compiler');
const root=path.resolve(__dirname,'..'),out=path.join(root,'audio/core.wasm');
const flags=['-target','wasm32-freestanding','-O3','-msimd128','-fno-math-errno','-fno-honor-nans','-fno-signed-zeros','-ffp-contract=off','-nostdlib','-Wl,--no-entry','-Wl,--export=filter4','-Wl,--export=synth4','-Wl,--export=get_memory_base','-Wl,--export=get_table_base','-Wl,--export=get_pitch_base','-Wl,--export=get_tanh_base','-Wl,--export-memory','-Wl,-z,stack-size=16384','-Wl,--initial-memory=8388608','-Wl,--max-memory=8388608','-Wl,--strip-all','-o',out,path.join(root,'dsp/core.c')];
let r=cp.spawnSync(compiler,[...(/(?:^|[\/])zig(?:\.exe)?$/.test(compiler)?['cc']:[]),...flags],{stdio:'inherit'});if(r.error)throw r.error;if(r.status)process.exit(r.status);
const bytes=fs.readFileSync(out);if(!WebAssembly.validate(bytes))throw Error('Invalid WebAssembly');fs.writeFileSync(path.join(root,'audio/core-bytes.js'),'// Built from dsp/core.c. No fetch or byte decoder on the audio thread.\nexport const CORE_BYTES=new Uint8Array('+JSON.stringify([...bytes])+');\n');console.log('Formanta f64 native-derived core:',bytes.length,'bytes');
