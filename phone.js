const me=myNum();$('#me').textContent=me;
if(new URLSearchParams(location.search).get('embed'))document.body.classList.add('embed');
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let contacts=contactList();
const an=norm(new URLSearchParams(location.search).get('add'));
if(an&&an!==me&&!S.contacts[an]){setContact(an,'Contact '+(contacts.length+1));history.replaceState(null,'',location.pathname)}
const nameOf=n=>(S.contacts[n]&&S.contacts[n].name)||n;
const COL=['blue','','green','grey'];
function drawBook(){const all=contactList();$('#rows').innerHTML=all.length?all.map(c=>{const tel=c.n.startsWith('tel:');return `<div class="row"><div class="nm">${esc(c.name)}<small>${tel?'Phone number: '+esc(c.n.slice(4))+' (opens your dialler)':esc(c.n)+' (WiFi call)'}</small></div>${tel?`<a class="rc" href="${esc(c.n)}" aria-label="Call ${esc(c.name)} with your phone">Call</a>`:`<button class="rc" data-call="${c.n}" aria-label="Call ${esc(c.name)}">Call</button>`}<button class="re" data-ed="${esc(c.n)}" aria-label="Change name of ${esc(c.name)}">Name</button><button class="rd" data-del="${esc(c.n)}" aria-label="Delete ${esc(c.name)}">Delete</button></div>`}).join(''):'<p class="note">No one yet.</p>';
 document.querySelectorAll('[data-call]').forEach(b=>b.onclick=()=>dial(b.dataset.call));
 document.querySelectorAll('[data-ed]').forEach(b=>b.onclick=()=>{const n=b.dataset.ed;const v=prompt('Their name',nameOf(n));if(v&&v.trim())setContact(n,v.trim().slice(0,40))});
 document.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{const n=b.dataset.del;if(confirm('Delete '+nameOf(n)+' from the phone book?'))delContact(n)})}
function draw(){drawBook();contacts=contactList();$('#contacts').innerHTML=contacts.filter(c=>!c.n.startsWith('tel:')).slice(0,4).map((c,i)=>`<button class="big c ${COL[i%4]}" data-n="${c.n}" aria-label="Call ${esc(c.name)}">${esc(c.name)}</button>`).join('');
 document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>dial(b.dataset.n));
 const l=S.calls[S.calls.length-1];$('#lastcall').textContent=l?`Last call: ${l.dir==='in'?'from':'to'} ${nameOf(l.n)}, ${new Date(l.ts).toLocaleString([],{weekday:'short',hour:'numeric',minute:'2-digit'})}`:''}
draw();onSync=draw;
onState=s=>paintState(s);
let first=!get('setup');onReady=()=>{if(first){first=false;put('setup',1);say('Your phone is online. Tap a big button to call.')}};
state();
const showS=(id,on)=>{const e=$('#'+id);if(e)e.classList.toggle('hide',!on)};
let dc=null,other=null,cur=null,stream=null,timer=null,pending=false,expect=null,ringCall=null,ringT=null,callerDcs={},relayTried=false;
function stopRing(){clearInterval(ringT);ringT=null;showS('ring',0);try{speechSynthesis.cancel()}catch(e){}}
function tidy(){setMute(false);const k=dc;dc=null;if(k)setTimeout(()=>{try{k.close()}catch(e){}},800);const c=cur;cur=null;try{c&&c.close()}catch(e){}if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;clearInterval(timer);pending=false;expect=null;showS('incall',0);showS('tapsound',0);stopRing()}
function endCall(msg){tidy();if(msg){$('#err').textContent=msg;say(msg);setTimeout(()=>{if($('#err').textContent===msg)$('#err').textContent=''},8000)}}
window.onPeerMissing=()=>{if(pending)endCall('They are not online right now.')};
window.onCallerConn=d=>{callerDcs[d.peer]=d;d.on('data',x=>{if(x==='bye'&&cur&&d.peer===other)endCall('Call ended')});d.on('close',()=>{if(callerDcs[d.peer]===d)delete callerDcs[d.peer]});if(cur&&d.peer===other)dc=d};
function playRemote(s){const a=$('#aud');a.srcObject=s;a.muted=false;const p=a.play();if(p&&p.catch)p.catch(()=>{showS('tapsound',1);say('Tap the blue button to hear them.')})}
$('#tapsound').onclick=()=>{unlockAudio();$('#aud').play().then(()=>showS('tapsound',0)).catch(()=>{})};
function hook(c,who,onFail){cur=c;other=c.peer;let live=false;
 c.on('stream',s=>{playRemote(s);const pc=c.peerConnection;
  const chk=()=>{if(cur!==c||!pc)return;const st=pc.iceConnectionState;
   if(['connected','completed'].includes(st)&&!live){live=true;pending=false;$('#cwho').textContent='Talking to '+who;say('Connected');buzz(100);const t0=Date.now();timer=setInterval(()=>{const s2=Math.floor((Date.now()-t0)/1000);$('#ctime').textContent=Math.floor(s2/60)+':'+String(s2%60).padStart(2,'0')},1000)}
   if(st==='failed'||(live&&(st==='closed'||pc.connectionState==='closed')))endCall('Call ended');
   if(live&&st==='disconnected')setTimeout(()=>{if(cur===c&&pc.iceConnectionState==='disconnected')endCall('Call ended')},6000)};
  if(pc){pc.addEventListener('iceconnectionstatechange',chk);pc.addEventListener('connectionstatechange',chk)}chk();
  if(!live)$('#cwho').textContent='Connecting to '+who;
  setTimeout(()=>{if(!live&&cur===c){if(onFail)onFail();else endCall('Could not connect. Tap Test my connection to check this WiFi.')}},25000)});
 c.on('close',()=>{if(cur===c)endCall('Call ended')});c.on('error',()=>{if(cur===c)endCall('Call ended')})}
function openDc(to,n){try{const d=peer.connect(to,{reliable:true,serialization:'json'});dc=d;
 d.on('data',x=>{if(x==='bye'&&cur)endCall('Call ended');else if(x&&x.t==='redirect'&&typeof x.to==='string'&&x.to.startsWith(pid(n)))redirect(x.to,n)})}catch(e){}}
function place(to,n,opts){const who=nameOf(n);openDc(to,n);
 const c=peer.call(to,stream,{metadata:{video:false,ver:APP_VER,name:myName()},sdpTransform:undefined});
 hook(c,who,()=>{if(!relayTried&&opts!=='relay'){relayTried=true;$('#cwho').textContent='Trying the relay…';const old=cur;cur=null;try{old.close()}catch(e){}placeRelay(to,n)}else endCall('Could not connect. Tap Test my connection to check this WiFi.')})}
function placeRelay(to,n){// second try forcing the free TURN relay
 const old=peer.options.config;peer.options.config=ICE_RELAY;try{place(to,n,'relay')}finally{peer.options.config=old}}
function redirect(to,n){const old=cur;cur=null;try{old&&old.close()}catch(e){}$('#cwho').textContent='Connecting to '+nameOf(n);place(to,n)}
async function dial(n){buzz();unlockAudio();$('#err').textContent='';if(!ready){say('Reconnecting. Please try again in a moment.');$('#err').textContent='Reconnecting. Try again in a moment.';return}
 const who=nameOf(n);try{stream=await mic()}catch(e){endCall('Please allow the microphone to make calls.');return}
 showS('incall',1);$('#cwho').textContent='Calling '+who;$('#ctime').textContent='';say('Calling '+who);pending=true;relayTried=false;
 put('last',n);addCall(n,'out');place(pid(n),n);setTimeout(()=>{if(pending&&cur)endCall('No answer')},45000)}
function ringUI(who,onAns,onDec){showS('ring',1);$('#rwho').textContent=who+' is calling';buzz([400,200,400,200,400]);say(who+' is calling. Tap the big green button to answer.');clearInterval(ringT);ringT=setInterval(()=>buzz([400,200,400]),2500);$('#ans').onclick=onAns;$('#dec').onclick=onDec}
async function answerMedia(c,who){unlockAudio();try{stream=await mic()}catch(e){try{c.close()}catch(_){}endCall('Please allow the microphone to answer.');return}stopRing();showS('incall',1);$('#cwho').textContent='Connecting to '+who;c.answer(stream);hook(c,who);dc=callerDcs[c.peer]||null}
onCall=c=>{if(get('paused',false)&&!(expect&&c.peer===expect)){try{c.close()}catch(e){}return}const n=fromPid(c.peer)||'Unknown',who=(S.contacts[n]&&S.contacts[n].name)||(c.metadata&&c.metadata.name)||n;
 if(expect&&c.peer===expect){expect=null;answerMedia(c,who);return}
 if(cur||ringCall){try{c.close()}catch(e){}return}
 ringCall=c;addCall(n,'in');if(norm(n)&&!S.contacts[n])setContact(n,String((c.metadata&&c.metadata.name)||'').slice(0,40)||('Contact '+(contactList().length+1)));
 if(role==='hub')toDevs({t:'ring',from:n,peer:c.peer});
 const clear=()=>{if(ringCall===c){ringCall=null;stopRing();if(role==='hub')toDevs({t:'stop'})}};
 c.on('close',clear);
 ringUI(who,()=>{ringCall=null;if(role==='hub')toDevs({t:'stop'});answerMedia(c,who)},()=>{clear();try{c.close()}catch(e){}})};
// linked device: hub tells us someone is ringing
onRing=x=>{if(cur||get('paused',false))return;const n=norm(x.from)||'Unknown',who=nameOf(n);
 ringUI(who,()=>{stopRing();unlockAudio();expect=x.peer;showS('incall',1);$('#cwho').textContent='Connecting to '+who;toHub({t:'take'});setTimeout(()=>{if(expect===x.peer&&!cur)endCall('Could not connect')},20000)},()=>{stopRing();toHub({t:'decline'})})};
onStopRing=()=>{stopRing()};
// hub: a linked device answered or declined
onHubMsg=(dev,x)=>{if(!ringCall)return;const c=ringCall;
 if(x.t==='take'){const d=callerDcs[c.peer];if(d&&d.open){d.send({t:'redirect',to:dev});ringCall=null;stopRing();toDevs({t:'stop'},dev);setTimeout(()=>{try{c.close()}catch(e){}},1500)}else{toDevs({t:'stop'})}}
 else if(x.t==='decline'){ringCall=null;stopRing();toDevs({t:'stop'});try{c.close()}catch(e){}}};
$('#hang').onclick=()=>{buzz();if(dc&&dc.open){try{dc.send('bye')}catch(e){}}endCall('Call ended')};
$('#call').onclick=()=>{buzz();contacts=contactList();contacts=contacts.filter(c=>!c.n.startsWith('tel:'));if(contacts.length){const l=get('last',contacts[0].n);dial(S.contacts[l]?l:contacts[0].n)}else{showS('add',1);say('Type their Coffeebreak call ID, then tap save and call.');$('#anum').focus()}};
$('#asave').onclick=()=>{const n=norm($('#anum').value);if(!n){say('That call ID does not look right. It starts with C B.');return}const name=$('#aname').value.trim()||('Contact '+(contactList().length+1));
 setContact(n,name);showS('add',0);dial(n)};
$('#acancel').onclick=()=>showS('add',0);
$('#helpb').onclick=()=>{buzz([200,100,200]);showS('help',1);say('Help. For an emergency tap the red button to open your dialler with triple zero. Or call your first contact.')};
$('#hback').onclick=()=>showS('help',0);
$('#hfam').onclick=()=>{showS('help',0);const l=contactList();if(l.length)dial(l[0].n);else say('You have no contacts yet.')};
$('#share').onclick=async()=>{const u=shareLink(me);try{if(navigator.share){await navigator.share({title:'Coffeebreak call ID',text:'Call me over WiFi on Coffeebreak One-Tap Phone: '+me,url:u});return}}catch(e){if(e.name==='AbortError')return}try{await navigator.clipboard.writeText(u);say('Link copied')}catch(e){prompt('Copy your link',u)}};

function setMute(on){const b=$('#mute');b.classList.toggle('on',on);b.textContent=on?'Muted - tap to unmute':'Mute';b.setAttribute('aria-pressed',String(on));if(stream)stream.getAudioTracks().forEach(t=>t.enabled=!on)}
$('#mute').onclick=()=>{buzz();const on=!$('#mute').classList.contains('on');setMute(on);say(on?'Muted':'Unmuted')};
function paintPause(){const pz=get('paused',false),b=$('#pause');b.textContent=pz?'Paused - tap to take calls':'Pause calls';b.classList.toggle('red',pz);b.setAttribute('aria-pressed',String(pz));state()}
$('#pause').onclick=()=>{buzz();const pz=!get('paused',false);put('paused',pz);if(pz&&ringCall){try{ringCall.close()}catch(e){}ringCall=null;stopRing();if(role==='hub')toDevs({t:'stop'})}paintPause();say(pz?'Paused. Not taking calls.':'Online. Taking calls.')};
paintPause();

let qrFor='';function paintQR(){const id=myNum(),u=pairURL();if(!$('#pqr')){$('#me').textContent=id;return}if(u===qrFor)return;qrFor=u;$('#me').textContent=id;$('#pqr').innerHTML='';try{new QRCode($('#pqr'),{text:u,width:280,height:280,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(e){}}
paintQR();setInterval(paintQR,3000);

$('#bookadd').onclick=()=>{showS('add',1);$('#anum').focus()};
const canPick='contacts' in navigator&&'select' in navigator.contacts;if(canPick)showS('bookimp',1);
$('#bookimp').onclick=async()=>{try{const r=await navigator.contacts.select(['name','tel'],{multiple:true});let k=0;for(const c of r){const nm=((c.name||[])[0]||'Contact').slice(0,40);for(const t of(c.tel||[])){const x=String(t).replace(/[^\d+]/g,'');if(/^\+?\d{3,15}$/.test(x)){setContact('tel:'+x,nm);k++;break}}}say(k?'Added '+k+' people':'No one added')}catch(e){}};
// ---------- Connect a phone ----------
const NOQR=!!window.CB_NOQR;
if(NOQR){showS('scanb',0);showS('codeb',1);showS('cqrwrap',0);showS('ccodewrap',1)}
function pstat(id,txt,kind){const e=$('#'+id);e.textContent=txt;e.className='status '+(kind||'on');showS(id,1)}
function showPaired(name){const t='Connected to '+name;['pairst','cstat','codestat'].forEach(i=>pstat(i,t,'on'));buzz([80,60,80]);say(t);setTimeout(()=>{showS('conov',0);showS('codeov',0);showS('scanov',0)},2500)}
let pairing=null;// {n,name} or {code}
window.onPair=(m,from)=>{checkVer(m.ver);const n=norm(m.num);if(!n||n===me)return;const name=String(m.name||'').slice(0,40)||'Coffeebreak friend';
 if(!S.contacts[n]||S.contacts[n].del||/^Contact \d+$/.test(S.contacts[n].name)||S.contacts[n].name!==name)setContact(n,name);
 if(m.kind==='pair')sendPair(n,'pairok');
 if(m.kind==='pairok'&&pairing){pairing=null;put('pairWith',null)}
 put('last',n);showPaired(name)};
function pairLoop(){let tries=0;const step=()=>{if(!pairing)return;if(Date.now()-pairing.t>180000){pstat('pairst','Could not reach the other phone. Make sure it is open, then try again.','try');pairing=null;put('pairWith',null);return}
  if(ready){const ok=pairing.code?sendCode(pairing.code):sendPair(pairing.n,'pair');tries++;const who=pairing.name||'the other phone';const txt=tries<=1?'Connecting to '+who:'Trying again';pstat('pairst',txt,tries<=1?'off':'try');if(pairing.code)pstat('codestat',txt,tries<=1?'off':'try')}
  else pstat('pairst','Connecting','off');
  setTimeout(step,ready?2500:400)};step()}
function startPairWith(n,name){if(!norm(n)||n===me)return;if(!S.contacts[n])setContact(n,name||'Coffeebreak friend');pairing={n,name,t:Date.now()};pairLoop()}
const pw=get('pairWith',null);if(pw&&pw.n&&Date.now()-pw.t<180000)startPairWith(pw.n,pw.name);
$('#conb').onclick=()=>{buzz();showS('conov',1);showS('cstat',0);
 if(NOQR){$('#ccode').textContent='…';startCode(c=>{$('#ccode').textContent=c.slice(0,3)+' '+c.slice(3);say('Your code is '+c.split('').join(' '))});return}
 const u=pairURL();if(!$('#cqr'))return;$('#clink').textContent=u;$('#cqr').innerHTML='';try{new QRCode($('#cqr'),{text:u,width:520,height:520,colorDark:'#000000',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}catch(e){}say('Point the other phone camera at this code.')};
$('#cclose').onclick=()=>showS('conov',0);
if($('#ccopy'))$('#ccopy').onclick=async()=>{const u=pairURL();try{await navigator.clipboard.writeText(u);$('#ccopy').textContent='Link copied';say('Link copied')}catch(e){prompt('Copy this link',u)}};
// code entry
let codeIn='';function paintCode(){$('#codev').textContent=codeIn.replace(/(\d{3})(?=\d)/,'$1 ')||' '}
$('#pad').innerHTML=['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k=>`<button data-k="${k}" aria-label="${k==='⌫'?'Delete':k==='✓'?'Connect':k}">${k}</button>`).join('');
document.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{buzz(30);const k=b.dataset.k;if(k==='⌫')codeIn=codeIn.slice(0,-1);else if(k==='✓'){$('#codego').click();return}else if(codeIn.length<6)codeIn+=k;paintCode()});
$('#codeb').onclick=()=>{buzz();codeIn='';paintCode();showS('codestat',0);showS('codeov',1);say('Type the code shown on the other phone.')};
$('#codego').onclick=()=>{if(codeIn.length!==6){say('The code has 6 numbers.');pstat('codestat','The code has 6 numbers','try');return}pairing={code:codeIn,name:'',t:Date.now()};pairLoop()};
$('#codeclose').onclick=()=>showS('codeov',0);
// in-app scanner: BarcodeDetector, or the bundled jsQR on iPhone and iPad
let scanS=null,scanT=null;
function stopScan(){clearTimeout(scanT);if(scanS)scanS.getTracks().forEach(t=>t.stop());scanS=null}
function handleScan(txt){try{const u=new URL(txt);const a=norm(u.searchParams.get('pair')),ad=norm(u.searchParams.get('add'));const n=a||ad;if(n){stopScan();showS('scanov',0);startPairWith(n,String(u.searchParams.get('n')||'').slice(0,40));return true}}catch(e){}return false}
if($('#scanb'))$('#scanb').onclick=async()=>{buzz();showS('scanov',1);$('#scanmsg').textContent='Point at the code on the other phone.';
 try{scanS=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false})}catch(e){$('#scanmsg').textContent='Camera not allowed. You can also scan with the normal camera app.';return}
 const v=$('#scanv');v.srcObject=scanS;await v.play().catch(()=>{});const bd=('BarcodeDetector' in window)?new BarcodeDetector({formats:['qr_code']}):null;const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
 const tick=async()=>{if(!scanS)return;try{if(bd){const r=await bd.detect(v);for(const c of r)if(handleScan(c.rawValue))return}else if(window.jsQR&&v.videoWidth){cv.width=v.videoWidth;cv.height=v.videoHeight;cx.drawImage(v,0,0);const d=cx.getImageData(0,0,cv.width,cv.height);const r=jsQR(d.data,d.width,d.height);if(r&&handleScan(r.data))return}}catch(e){}scanT=setTimeout(tick,200)};tick()};
if($('#sclose'))$('#sclose').onclick=()=>{stopScan();showS('scanov',0)};
