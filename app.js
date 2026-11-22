'use strict';
let lessons = [], questions = [], test = [], idx = 0, score = 0, answered = false, history = [];
const $ = id => document.getElementById(id);
const STORE_KEY = 'iot_academy_v2_history';
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shuffle = items => { const a=[...items]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
function loadHistory(){ try { const v=JSON.parse(localStorage.getItem(STORE_KEY)||'[]'); history=Array.isArray(v)?v:[]; } catch { history=[]; } }
function saveHistory(){ try { localStorage.setItem(STORE_KEY,JSON.stringify(history.slice(0,30))); } catch { $('historyNote').textContent='تعذر الحفظ؛ مساحة التخزين في المتصفح غير متاحة.'; } }
async function init(){
  try {
    const [lr,qr]=await Promise.all([fetch('data/lessons.json'),fetch('data/questions.json')]);
    if(!lr.ok||!qr.ok) throw new Error('تعذر تحميل ملفات البيانات');
    [lessons,questions]=await Promise.all([lr.json(),qr.json()]);
    if(!Array.isArray(lessons)||!Array.isArray(questions)) throw new Error('تنسيق ملفات JSON غير صحيح');
    questions=questions.filter(q=>q&&typeof q.question==='string'&&Array.isArray(q.options)&&q.options.length===3&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<3);
    $('total').textContent=questions.length.toLocaleString('ar'); $('count').textContent=questions.length.toLocaleString('ar');
    const cats=[...new Set(questions.map(q=>q.category).filter(Boolean))];
    cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;$('category').append(o)});
    $('lessonGrid').innerHTML=lessons.map((l,i)=>`<article class="card"><small>المسار ${i+1} • ${escapeHTML(l.level)} • ${escapeHTML(l.duration)}</small><h3>${escapeHTML(l.title)}</h3><p>${escapeHTML(l.body?.[0]||'')}</p><button data-lesson="${i}">افتح الدرس ←</button></article>`).join('');
    document.querySelectorAll('[data-lesson]').forEach(b=>b.addEventListener('click',()=>openLesson(+b.dataset.lesson)));
    loadHistory(); renderHistory(); $('historyCount').textContent=history.length.toLocaleString('ar');
  } catch(e){ $('lessonGrid').textContent='تعذر تحميل المحتوى. افتح المنصة عبر خادم محلي، وتأكد من وجود مجلد data بجانب الملفات.'; $('quizArea').textContent=e.message; }
}
function openLesson(i){const l=lessons[i];if(!l)return;$('lessonContent').innerHTML=`<h2>${escapeHTML(l.title)}</h2><p>المستوى: ${escapeHTML(l.level)} — ${escapeHTML(l.duration)}</p>${(l.body||[]).map((p,n)=>`<p>${n+1}. ${escapeHTML(p)}</p>`).join('')}<p class="task"><b>نشاط تطبيقي:</b> ${escapeHTML(l.task)}</p>`;$('modal').classList.remove('hidden');}
$('close').onclick=()=>$('modal').classList.add('hidden');
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')});
$('theme').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('iot_academy_theme',document.body.classList.contains('light')?'light':'dark')};
if(localStorage.getItem('iot_academy_theme')==='light')document.body.classList.add('light');
$('start').onclick=()=>{
  const c=$('category').value, requested=+$('amount').value, pool=questions.filter(q=>c==='all'||q.category===c);
  if(!pool.length){$('quizArea').innerHTML='<div class="question">لا توجد أسئلة في هذا القسم حالياً.</div>';return;}
  test=shuffle(pool).slice(0,Math.min(requested,pool.length));idx=0;score=0;render();$('quizArea').scrollIntoView({behavior:'smooth',block:'start'});
};
function render(){
  answered=false;const q=test[idx],pct=Math.round(idx/test.length*100);
  $('quizArea').innerHTML=`<div class="question"><div class="exam-top"><small>السؤال ${idx+1} من ${test.length}</small><small>الصحيحة: ${score}</small></div><div class="progress"><span style="width:${pct}%"></span></div><h3 class="exam-question">${escapeHTML(q.question)}</h3><p class="choose-hint">اختر إجابة واحدة فقط من الخيارات الثلاثة:</p><div class="answers">${q.options.map((a,i)=>`<button type="button" data-i="${i}"><b>${'أبج'[i]}</b><span>${escapeHTML(a)}</span></button>`).join('')}</div><div id="explain" aria-live="polite"></div><button class="btn hidden" id="next">${idx===test.length-1?'إنهاء الاختبار وعرض النتيجة':'السؤال التالي ←'}</button></div>`;
  document.querySelectorAll('.answers button').forEach(b=>b.addEventListener('click',()=>answer(+b.dataset.i)));
}
function answer(i){
  if(answered)return;answered=true;const q=test[idx],ok=i===q.answer;if(ok)score++;
  document.querySelectorAll('.answers button').forEach((b,n)=>{b.disabled=true;if(n===q.answer)b.classList.add('good');else if(n===i)b.classList.add('bad')});
  $('explain').innerHTML=`<div class="explain"><b>${ok?'إجابة صحيحة ✓':'إجابة غير صحيحة'}</b><br>${escapeHTML(q.explanation||'')}</div>`;
  $('next').classList.remove('hidden');$('next').onclick=()=>{idx++;if(idx<test.length)render();else showResult()};
}
function showResult(){
  const percent=Math.round(score/test.length*100),level=percent>=85?'متقدم':percent>=60?'متوسط':'مبتدئ';
  const record={date:new Date().toLocaleString('ar'),score,total:test.length,percent,level,category:$('category').value};
  history.unshift(record);history=history.slice(0,30);saveHistory();renderHistory();$('historyCount').textContent=history.length.toLocaleString('ar');
  $('quizArea').innerHTML=`<div class="question result"><small>اكتمل الاختبار</small><h2>نتيجتك النهائية</h2><h1>${percent}%</h1><p>الإجابات الصحيحة: ${score} من ${test.length}</p><p>الإجابات غير الصحيحة: ${test.length-score}</p><h3>مستواك: ${level}</h3><p>${percent>=85?'أداء ممتاز! واصل التعمق في المشاريع المتقدمة.':percent>=60?'نتيجة جيدة. راجع الشروحات وحاول رفع مستواك.':'ابدأ بمراجعة الدروس الأساسية ثم أعد الاختبار.'}</p><button class="btn" id="retry">إعادة الاختبار</button></div>`;
  $('retry').onclick=()=>$('start').click();
}
function renderHistory(){const el=$('historyList');if(!el)return;if(!history.length){el.innerHTML='<p>لا توجد نتائج محفوظة بعد. أكمل اختباراً لتظهر نتيجتك هنا.</p>';return;}el.innerHTML=history.slice(0,8).map(r=>`<div class="history-row"><span><b>${r.percent}% • ${escapeHTML(r.level)}</b><small>${escapeHTML(r.date)} — ${r.score}/${r.total}</small></span><span>${escapeHTML(r.category==='all'?'كل الأقسام':r.category)}</span></div>`).join('');}
$('clearHistory').onclick=()=>{if(!confirm('هل تريد حذف سجل النتائج المحفوظ على هذا الجهاز؟'))return;history=[];saveHistory();renderHistory();$('historyCount').textContent='0';};
init();
