#!/usr/bin/env python3
"""Build the double-click local page from the exact same website modules."""
from pathlib import Path
import json,re,base64
D=Path(__file__).resolve().parents[1]
def b64(data):return base64.b64encode(data).decode('ascii')
classic={p.name:b64(p.read_bytes()) for p in (D/'js').glob('*.js')}
audio={p.relative_to(D).as_posix():b64(p.read_bytes()) for p in (D/'audio').glob('*.js')}
midi={p.relative_to(D).as_posix():b64(p.read_bytes()) for p in (D/'assets/midi').glob('*.mid')}
bootstrap='''window.FORMANTA_OFFLINE=true;
(()=>{const decode=s=>new TextDecoder().decode(Uint8Array.from(atob(s),c=>c.charCodeAt(0))),classic=CLASSIC,audio=AUDIO;
window.FORMANTA_CLASSIC={};for(const [name,data]of Object.entries(classic))FORMANTA_CLASSIC[name]=URL.createObjectURL(new Blob([decode(data)],{type:'text/javascript'}));
window.FORMANTA_AUDIO={};let pending=new Map(Object.entries(audio).map(([k,v])=>[k,decode(v)]));
while(pending.size){let progress=false;for(let [path,code]of pending){const base=new URL(path,'https://formanta.invalid/'),imports=[...code.matchAll(/from\\s+['"]([^'"]+)['"]/g)];if(imports.some(m=>!FORMANTA_AUDIO[new URL(m[1],base).pathname.slice(1)]))continue;code=code.replace(/from\\s+(['"])([^'"]+)\\1/g,(all,q,spec)=>'from '+q+FORMANTA_AUDIO[new URL(spec,base).pathname.slice(1)]+q);FORMANTA_AUDIO[path]=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));pending.delete(path);progress=true}if(!progress)throw Error('Offline audio module dependency cycle')}
window.FORMANTA_MIDI=MIDI;})();'''.replace('CLASSIC',json.dumps(classic,separators=(',',':')),1).replace('AUDIO',json.dumps(audio,separators=(',',':')),1).replace('MIDI;',json.dumps(midi,separators=(',',':'))+';',1)
# Keep the same HTML, CSS, scripts and algorithms; only resource transport changes.
html=(D/'index.html').read_text()
def css(m):
 path=D/m.group(1).split('?')[0];text=path.read_text()
 def resource(n):
  ref=n.group(1).strip('"\' ');p=path.parent/ref
  return 'url(data:font/woff;base64,'+b64(p.read_bytes())+')' if p.exists() else n.group(0)
 text=re.sub(r'url\(([^)]+)\)',resource,text)
 return '<style>'+text+'</style>'
html=re.sub(r'<link[^>]*href="(assets/[^\"]+\.css(?:\?[^\"]*)?)"[^>]*>',css,html)
html=html.replace('</head>','<script>'+bootstrap.replace('</script','<\\/script')+'</script></head>')
def script(m):return '<script>'+(D/m.group(1).split('?')[0]).read_text().replace('</script','<\\/script')+'</script>'
html=re.sub(r'<script[^>]*src="(js/[^\"]+)"[^>]*>\s*</script>',script,html)
(D/'OPEN_FORMANTA.html').write_text(html)
print('Offline page:',len(html.encode()),'bytes;',len(audio),'audio modules;',len(midi),'MIDI files')
