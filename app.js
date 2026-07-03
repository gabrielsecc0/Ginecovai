
const DATA = window.CASOS_GINECO_DATA;
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const STORE_KEY = 'gineco-pwa-navy-gold-v1';
let state = {caseIndex:0, query:'', tag:'all', mode:'exam', openAnswer:null, reviewed:{}, starred:{}, drawer:null};
let deferredInstallPrompt = null;

function loadState(){
  try{ const raw = localStorage.getItem(STORE_KEY); if(raw){ state = {...state, ...JSON.parse(raw)}; } }catch(e){}
  state.caseIndex = Math.min(Math.max(0, state.caseIndex||0), DATA.cases.length-1);
}
function saveState(){
  const keep = {caseIndex:state.caseIndex, query:state.query, tag:state.tag, mode:state.mode, reviewed:state.reviewed, starred:state.starred};
  localStorage.setItem(STORE_KEY, JSON.stringify(keep));
}
function esc(s){return String(s??'').replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function stripQnum(q){return String(q||'').replace(/^\s*\d+\s*[\.)]\s*/, '').trim();}
function toast(msg){const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800)}
function allQuestions(){return DATA.cases.flatMap(c=>c.questions.map(q=>({caseObj:c, q})));}
function tags(){return ['all', ...Array.from(new Set(DATA.cases.flatMap(c=>c.tags))).sort()];}
function answerHTML(answer){
  return (answer||['(sin respuesta en el original)']).map(line=>{
    const s = esc(line);
    const low = String(line).toLowerCase();
    if(low.includes('sin respuesta')) return `<p class="no-answer"><strong>Sin respuesta en el original.</strong></p>`;
    if(String(line).startsWith('[')) return `<p class="note">${s}</p>`;
    if(/^([a-z]\)|[•\-–])\s*/i.test(String(line).trim())) return `<p class="answer-line">${s}</p>`;
    return `<p class="answer-line">${s}</p>`;
  }).join('');
}
function highlight(text){
  let out=esc(text);
  const q=state.query.trim();
  if(q.length<2) return out;
  const safe=q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try{ out=out.replace(new RegExp(`(${safe})`,'ig'), '<mark>$1</mark>'); }catch(e){}
  return out;
}
function caseMatches(c){
  if(state.tag !== 'all' && !c.tags.includes(state.tag)) return false;
  const q = normalize(state.query.trim());
  if(!q) return true;
  const hay = normalize([c.title, c.shortTitle, ...c.stem, ...c.questions.flatMap(x=>[x.question, ...(x.answer||[])])].join(' '));
  return hay.includes(q);
}
function questionMatches(q){
  const query = normalize(state.query.trim());
  if(!query) return true;
  return normalize([q.question, ...(q.answer||[])].join(' ')).includes(query);
}
function renderShell(){
  $('#caseCount').textContent = DATA.meta.caseCount;
  $('#questionCount').textContent = DATA.meta.questionCount;
  renderTagFilter();
  renderModes();
  renderCaseList();
  renderProgress();
  renderCase();
}
function renderTagFilter(){
  const sel=$('#tagFilter');
  sel.innerHTML = tags().map(t=>`<option value="${esc(t)}">${t==='all'?'Todas las áreas':esc(t)}</option>`).join('');
  sel.value = state.tag;
}
function renderModes(){
  $$('.seg').forEach(btn=>btn.classList.toggle('active', btn.dataset.mode===state.mode));
}
function renderCaseList(){
  const list=$('#caseList');
  const filtered=DATA.cases.filter(caseMatches);
  if(!filtered.length){ list.innerHTML='<li class="small">Sin resultados con este filtro.</li>'; return; }
  list.innerHTML = filtered.map(c=>{
    const ix=DATA.cases.indexOf(c);
    const active = ix===state.caseIndex ? ' active' : '';
    const done = c.questions.filter(q=>state.reviewed[q.id]).length;
    return `<li><button class="case-nav${active}" data-index="${ix}"><span class="num">${String(c.number).padStart(2,'0')}</span><span class="title">${highlight(c.shortTitle)}</span><span class="meta">${c.questions.length} preguntas · ${done}/${c.questions.length} revisadas</span></button></li>`;
  }).join('');
}
function renderProgress(){
  const total=DATA.meta.questionCount;
  const reviewed=Object.keys(state.reviewed).filter(id=>state.reviewed[id]).length;
  const pct= total ? Math.round(reviewed*100/total) : 0;
  $('#progressBar').style.width = pct+'%';
  $('#progressText').textContent = `${reviewed}/${total} preguntas revisadas · ${pct}% completado`;
}
function renderHome(){
  const root=$('#caseRoot');
  const reviewed=Object.keys(state.reviewed).filter(id=>state.reviewed[id]).length;
  root.innerHTML = `
    <section class="hero">
      <p class="kicker">Secco Core / Navy & Gold</p>
      <h2>Casos clínicos<br>Ginecología</h2>
      <p>App de estudio interactiva: lee el caso, intenta responder, y revela solamente la respuesta seleccionada.</p>
      <div class="pill-row"><span class="pill">${DATA.meta.caseCount} casos</span><span class="pill">${DATA.meta.questionCount} preguntas</span><span class="pill">offline al instalar</span><span class="pill">respuesta única</span></div>
    </section>
    <section class="panel">
      <h3>Flujo recomendado</h3>
      <div class="quick-grid">
        <div class="quick-card"><strong>1. Modo examen</strong><p>Las respuestas quedan ocultas. Al tocar “ver respuesta” se abre solo la seleccionada.</p></div>
        <div class="quick-card"><strong>2. Modo estudio</strong><p>La respuesta elegida aparece debajo de la pregunta, sin abrir todas las demás.</p></div>
        <div class="quick-card"><strong>3. Progreso</strong><p>Marca preguntas como revisadas y vuelve luego a las pendientes o destacadas.</p></div>
      </div>
    </section>
    <section class="panel"><h3>Progreso global</h3><div class="progress-wrap"><div class="progress-line"><div style="width:${Math.round(reviewed*100/DATA.meta.questionCount)}%"></div></div><div class="progress-label">${reviewed}/${DATA.meta.questionCount} revisadas</div></div></section>`;
}
function renderCase(){
  if(location.hash === '' || location.hash === '#home') { renderHome(); return; }
  const c=DATA.cases[state.caseIndex];
  const root=$('#caseRoot');
  const stem = c.stem.length ? c.stem.map(p=>p.startsWith('[')?`<p class="note">${highlight(p)}</p>`:`<p>${highlight(p)}</p>`).join('') : '<p class="empty">Sin viñeta clínica independiente.</p>';
  const tagsHTML = c.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join(' ');
  const qs = c.questions.filter(questionMatches);
  const qcards = qs.map(q=>renderQuestion(c,q)).join('') || '<p class="empty">Este caso no tiene preguntas que coincidan con la búsqueda.</p>';
  root.innerHTML = `
    <article class="case-head">
      <p class="kicker" style="color:var(--gold-3)">Caso ${String(c.number).padStart(2,'0')} · ${c.questions.length} preguntas</p>
      <h2>${highlight(c.shortTitle)}</h2>
      <div>${tagsHTML}</div>
      <div class="case-tools"><button class="btn small ghost" data-action="prev-case">← Anterior</button><button class="btn small ghost" data-action="next-case">Siguiente →</button><button class="btn small gold" data-action="random-question">Pregunta aleatoria</button><button class="btn small ghost" data-action="copy-case">Copiar caso</button></div>
    </article>
    <section class="panel stem"><h3>Viñeta clínica</h3>${stem}</section>
    <section class="panel"><h3>Preguntas</h3><div class="questions">${qcards}</div></section>`;
  setTimeout(()=>{
    if(state.openAnswer){ const el=document.getElementById(state.openAnswer); if(el) el.scrollIntoView({behavior:'smooth', block:'center'}); }
  }, 30);
}
function renderQuestion(c,q){
  const open = state.mode==='study' && state.openAnswer===q.id;
  const reviewed = !!state.reviewed[q.id];
  const starred = !!state.starred[q.id];
  const answer = open ? `<div class="answer-inline">${answerHTML(q.answer)}</div>` : '';
  return `<article class="q-card" id="${q.id}">
    <div class="q-top"><div class="qno">${String(q.number).padStart(2,'0')}</div><div><p class="qtext">${highlight(stripQnum(q.question))}</p></div></div>
    <div class="q-actions">
      <button class="btn small gold" data-action="show-answer" data-cid="${c.id}" data-qid="${q.id}">${open?'Ocultar':'Ver respuesta'}</button>
      <button class="btn small ${reviewed?'mark-reviewed':'ghost'}" data-action="toggle-reviewed" data-qid="${q.id}">${reviewed?'✓ Revisada':'Marcar revisada'}</button>
      <button class="btn small ${starred?'starred':'ghost'}" data-action="toggle-star" data-qid="${q.id}">${starred?'★ Destacada':'☆ Destacar'}</button>
    </div>
    ${answer}
  </article>`;
}
function findCaseById(id){return DATA.cases.find(c=>c.id===id)}
function findQuestion(qid){
  for(const c of DATA.cases){ const q=c.questions.find(x=>x.id===qid); if(q) return {c,q}; }
  return null;
}
function openDrawer(qid){
  const hit=findQuestion(qid); if(!hit) return;
  const {c,q}=hit;
  state.drawer=qid; state.openAnswer = state.mode==='study' ? qid : state.openAnswer; saveState();
  $('#drawerTitle').textContent = `Caso ${String(c.number).padStart(2,'0')} · Pregunta ${String(q.number).padStart(2,'0')}`;
  $('#drawerSub').textContent = c.shortTitle;
  $('#drawerQuestion').innerHTML = `<p class="kicker">Pregunta</p><p><strong>${esc(stripQnum(q.question))}</strong></p>`;
  $('#drawerAnswer').innerHTML = `<p class="kicker" style="color:var(--gold-3)">Respuesta única seleccionada</p>${answerHTML(q.answer)}`;
  $('#drawer').classList.add('open'); $('#backdrop').classList.add('show');
}
function closeDrawer(){ $('#drawer').classList.remove('open'); $('#backdrop').classList.remove('show'); state.drawer=null; saveState(); }
function goCase(ix){ state.caseIndex=(ix+DATA.cases.length)%DATA.cases.length; state.openAnswer=null; location.hash=`case-${state.caseIndex+1}`; saveState(); renderCaseList(); renderProgress(); renderCase(); }
function randomQuestion(){
  const pool = DATA.cases.flatMap((c,ci)=>c.questions.map(q=>({ci,q}))).filter(x=>!state.reviewed[x.q.id]);
  const arr = pool.length ? pool : DATA.cases.flatMap((c,ci)=>c.questions.map(q=>({ci,q})));
  const pick = arr[Math.floor(Math.random()*arr.length)];
  goCase(pick.ci);
  setTimeout(()=>openDrawer(pick.q.id),80);
}
function resetProgress(){
  if(confirm('¿Borrar progreso, destacadas y respuestas abiertas?')){ state.reviewed={}; state.starred={}; state.openAnswer=null; saveState(); renderShell(); toast('Progreso reiniciado'); }
}
function exportProgress(){
  const blob = new Blob([JSON.stringify({exportedAt:new Date().toISOString(), reviewed:state.reviewed, starred:state.starred}, null, 2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='progreso_casos_gineco.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function bindEvents(){
  $('#searchInput').addEventListener('input', e=>{state.query=e.target.value; saveState(); renderCaseList(); renderCase();});
  $('#tagFilter').addEventListener('change', e=>{state.tag=e.target.value; saveState(); renderCaseList(); renderCase();});
  $$('.seg').forEach(btn=>btn.addEventListener('click',()=>{state.mode=btn.dataset.mode; state.openAnswer=null; saveState(); renderModes(); renderCase(); toast(state.mode==='exam'?'Modo examen':'Modo estudio');}));
  document.addEventListener('click', e=>{
    const nav=e.target.closest('.case-nav'); if(nav){ goCase(Number(nav.dataset.index)); if(window.innerWidth<980) $('#sidebar').classList.remove('show'); return; }
    const btn=e.target.closest('[data-action]'); if(!btn) return;
    const act=btn.dataset.action;
    if(act==='show-answer'){
      const qid=btn.dataset.qid;
      if(state.mode==='study'){
        state.openAnswer = state.openAnswer===qid ? null : qid; saveState(); renderCase();
      } else { openDrawer(qid); }
    }
    if(act==='toggle-reviewed'){ const qid=btn.dataset.qid; state.reviewed[qid]=!state.reviewed[qid]; if(!state.reviewed[qid]) delete state.reviewed[qid]; saveState(); renderCaseList(); renderProgress(); renderCase(); }
    if(act==='toggle-star'){ const qid=btn.dataset.qid; state.starred[qid]=!state.starred[qid]; if(!state.starred[qid]) delete state.starred[qid]; saveState(); renderCase(); }
    if(act==='prev-case') goCase(state.caseIndex-1);
    if(act==='next-case') goCase(state.caseIndex+1);
    if(act==='random-question') randomQuestion();
    if(act==='copy-case') {navigator.clipboard?.writeText(DATA.cases[state.caseIndex].stem.join('\n\n')).then(()=>toast('Viñeta copiada'));}
  });
  $('#mobileMenu').addEventListener('click',()=>$('#sidebar').classList.add('show'));
  $('#backdrop').addEventListener('click',()=>{ closeDrawer(); $('#sidebar').classList.remove('show'); });
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#homeBtn').addEventListener('click',()=>{ location.hash='home'; state.openAnswer=null; saveState(); renderCaseList(); renderCase(); });
  $('#randomBtn').addEventListener('click', randomQuestion);
  $('#resetBtn').addEventListener('click', resetProgress);
  $('#exportBtn').addEventListener('click', exportProgress);
  $('#printBtn').addEventListener('click',()=>window.print());
  $('#installBtn').addEventListener('click', async()=>{
    if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; }
    else toast('Para instalar: abrir por HTTPS/localhost y usar “Agregar a pantalla de inicio”.');
  });
  window.addEventListener('hashchange', routeFromHash);
  window.addEventListener('keydown', e=>{
    if(e.key==='Escape') closeDrawer();
    if(e.key==='ArrowRight' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) goCase(state.caseIndex+1);
    if(e.key==='ArrowLeft' && !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)) goCase(state.caseIndex-1);
  });
}
function routeFromHash(){
  const h=location.hash.replace('#','');
  if(!h || h==='home'){ renderCaseList(); renderHome(); return; }
  const m=h.match(/^case-(\d+)/);
  if(m){ state.caseIndex=Math.min(Math.max(0,Number(m[1])-1),DATA.cases.length-1); saveState(); renderCaseList(); renderCase(); }
}
function registerSW(){
  if('serviceWorker' in navigator && location.protocol !== 'file:'){
    navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  }
}
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); deferredInstallPrompt=e; $('#installBtn').disabled=false; });
function init(){
  loadState();
  $('#searchInput').value = state.query || '';
  bindEvents();
  renderShell();
  routeFromHash();
  registerSW();
}
document.addEventListener('DOMContentLoaded', init);
