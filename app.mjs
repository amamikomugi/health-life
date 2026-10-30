import {dailyRows,dateAdd,dateRange,japanDate,weekStart,weightRows,sumKnown,NUTRIENTS,weeklyCalorieBudget} from './model.mjs?v=d3c00b43ccf7';
import {characterFeedback,positiveFoodFeedback,comfortFoodFeedback,habitFeedback,weightFeedback,reviewFeedback} from './feedback.mjs?v=ba37f76f4f24';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=(v,d=0)=>typeof v==='number'&&Number.isFinite(v)?v.toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const signed=(v,d=1)=>v===null||v===undefined?'—':(v>0?'+':v<0?'−':'±')+number(Math.abs(v),d);
const short=d=>`${Number(d.slice(5,7))}/${Number(d.slice(8,10))}`;
const day=d=>'日月火水木金土'[new Date(d+'T12:00:00Z').getUTCDay()];
const today=japanDate(); let state={tab:'overview',start:weekStart(today),period:7,chart:'energy',praiseVariant:Math.floor(Math.random()*5)},data;
const names={overview:'お部屋のようす',meals:'食事の日記',weight:'体重のあゆみ',data:'記録のこと'};
$('#today').textContent=today.replaceAll('-','.')+'（'+day(today)+'）';
function ranges(){const end=dateAdd(state.start,state.period-1);return `<div class="range-controls"><div class="segmented"><button data-period="7" class="${state.period===7?'selected':''}">1週間</button><button data-period="28" class="${state.period===28?'selected':''}">4週間</button></div><div class="date-switch"><button class="icon-button" data-range="prev" aria-label="前の期間">‹</button><span>${short(state.start)} — ${short(end)}</span><button class="icon-button" data-range="next" aria-label="次の期間" ${dateAdd(state.start,state.period)>today?'disabled':''}>›</button></div><button class="text-button" data-range="today">今週</button></div>`;}
function chart(rows,mode,target){const isWeight=mode==='weight';const points=rows.map(r=>({date:isWeight?r.week_start:r.date,a:isWeight?r.weight_kg:mode==='steps'?r.steps:r.kcal,b:mode==='energy'?r.total_expenditure_kcal:null}));const known=points.flatMap(p=>[p.a,p.b]).filter(v=>typeof v==='number');if(!known.length)return '<div class="chart-empty"><span style="font-size:33px">❧</span><b>ここから、記録を育てるのじゃ</b><small>教えてくれた記録を、グラフにしていくぞ。</small></div>';
  const w=760,h=252,l=55,r=24,t=24,b=38;const min=isWeight?Math.floor((Math.min(...known)-.5)*2)/2:0,max=isWeight?Math.ceil((Math.max(...known)+.5)*2)/2:Math.max(target||0,...known)*1.16||1;
  const step=(w-l-r)/points.length,x=i=>l+step*(i+.5),y=v=>t+(max-v)/(max-min||1)*(h-t-b);let svg='';
  for(let i=0;i<5;i++){const v=min+(max-min)*i/4;svg+=`<line x1="${l}" x2="${w-r}" y1="${y(v)}" y2="${y(v)}" stroke="#e9ddcb" stroke-dasharray="3 5"/><text x="${l-12}" y="${y(v)+4}" text-anchor="end">${number(v,isWeight?1:0)}</text>`;}
  if(target&&mode==='energy')svg+=`<line x1="${l}" x2="${w-r}" y1="${y(target)}" y2="${y(target)}" stroke="#c0ab8e" stroke-dasharray="5 4"/><text x="${w-r}" y="${y(target)-8}" text-anchor="end">目標候補 ${number(target)} kcal</text>`;
  if(!isWeight)points.forEach((p,i)=>{svg+=typeof p.a==='number'?`<rect x="${x(i)-Math.min(step*.22,22)}" y="${y(p.a)}" width="${Math.min(step*.44,44)}" height="${Math.max(2,y(0)-y(p.a))}" rx="5" fill="${mode==='steps'?'#cf965a':'#b85c2b'}"><title>${p.date}：${number(p.a,mode==='steps'?0:1)}${mode==='steps'?'歩':'kcal'}</title></rect>`:`<circle cx="${x(i)}" cy="${y(0)-4}" r="2.5" fill="#e2d2b9"><title>${p.date}：未記録・未取得</title></circle>`;});
  let segment='';const draw=()=>{if(segment)svg+=`<path d="${segment}" fill="none" stroke="${isWeight?'#b85c2b':'#bda074'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;segment='';};points.forEach((p,i)=>{const v=isWeight?p.a:p.b;if(typeof v==='number')segment+=`${segment?' L':'M'} ${x(i)} ${y(v)}`;else draw();});draw();
  points.forEach((p,i)=>{const v=isWeight?p.a:p.b;if(typeof v==='number'){svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="5" fill="${isWeight?'#b85c2b':'#bda074'}" stroke="white" stroke-width="2"><title>${p.date}：${number(v,1)}${isWeight?'kg':'kcal'}</title></circle>`;if(isWeight&&points.length<10)svg+=`<text class="point-label" x="${x(i)}" y="${y(v)-15}" text-anchor="middle">${number(v,1)} kg</text>`;}if(points.length<=14||i%Math.ceil(points.length/10)===0)svg+=`<text x="${x(i)}" y="${h-12}" text-anchor="middle">${short(p.date)}${isWeight?'週':''}</text>`;});
  return `<div class="chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${isWeight?'週ごとの体重推移':mode==='steps'?'日ごとの歩数':'日ごとの摂取カロリーと総消費カロリー'}。未取得・未記録の期間は、線をつながぬのじゃ。">${svg}</svg></div>`;}
function delta(row,key){const target=data.settings.current_targets[{kcal:'daily_kcal',protein_g:'protein_g',fat_g:'fat_g',carbohydrate_g:'carbohydrate_g'}[key]];return row[key]!==null&&typeof target==='number'?row[key]-target:null;}
function dailyTable(rows){return `<section class="panel"><div class="panel-head"><div><h2>日ごとの記録</h2><p>食べたものも、歩いたぶんも、ここでふりかえるのじゃ。</p></div><button class="text-button" data-tab="meals">食事の詳細 →</button></div><div class="table-scroll"><table><thead><tr><th>日付</th><th>摂取量<small>kcal</small></th><th>たんぱく質<small>g</small></th><th>脂質<small>g</small></th><th>炭水化物<small>g</small></th><th>歩数<small>歩</small></th><th>活動消費<small>kcal</small></th><th>総消費<small>kcal</small></th></tr></thead><tbody>${rows.map(row=>`<tr class="${row.date===today?'today-row':''}"><td><div class="day"><b>${short(row.date)}</b><span class="weekday">${day(row.date)}</span>${row.date===today?'<span class="today-chip">今日</span>':''}</div></td>${NUTRIENTS.map(key=>`<td><strong>${positiveNumber(number(row[key],key==='kcal'?0:1),positiveNotes(row).daily[key],row.date+':day:'+key)}</strong><span class="delta">${signed(delta(row,key),key==='kcal'?0:1)}</span></td>`).join('')}<td>${positiveNumber(number(row.steps),positiveNotes(row).daily.steps,row.date+':day:steps')}${row.activityStatus==='possibly_incomplete'?'<span class="delta">途中の値</span>':''}</td><td>${number(row.active_kcal,1)}</td><td>${number(row.total_expenditure_kcal,1)}</td></tr>`).join('')}</tbody></table></div><div class="table-foot"><span>下の段は、目標候補との差（摂取量 − 目標）じゃよ。</span><span>— 未記録・未取得</span></div><details class="details"><summary>目標とデータについて</summary><p>比較目標は ${number(data.settings.current_targets.daily_kcal)} kcal・P ${number(data.settings.current_targets.protein_g)} g・F ${number(data.settings.current_targets.fat_g)} g・C ${number(data.settings.current_targets.carbohydrate_g)} gじゃ。過去チャットから引き継いだ、再確認前の候補値じゃよ。過去の栄養値には概算も含まれておるぞ。活動消費は、食事目標との差から引かぬのじゃ。</p></details></section>`;}
function overview(rows,weights){const known=rows.filter(r=>r.kcal!==null),knownSteps=rows.filter(r=>r.steps!==null),average=known.length?known.reduce((s,r)=>s+r.kcal,0)/known.length:null,steps=knownSteps.length?knownSteps.reduce((s,r)=>s+r.steps,0):null,weight=weights.at(-1),target=data.settings.current_targets.daily_kcal;
  return `<div class="section-top"><h2>暮らしのふりかえり <span>${state.period===7?'WEEKLY':'4 WEEKS'}</span></h2>${ranges()}</div><div class="metrics"><article class="metric"><div class="metric-label">摂取カロリー<i>♧</i></div><div class="metric-value">${number(average)}<small>kcal / 日</small></div><p>記録した${known.length}日間の平均じゃ</p><div class="mini-track"><span style="width:${Math.min(100,average!==null&&target?average/target*100:0)}%"></span></div><div class="metric-foot">目標候補 ${number(target)} kcal<span>${average!==null&&target?signed(average-target,0)+' kcal':'—'}</span></div></article><article class="metric"><div class="metric-label">歩いた歩数<i>♧</i></div><div class="metric-value">${number(steps)}<small>歩</small></div><p>この期間に取得できた分の合計じゃ</p><div class="steps-bars">${rows.slice(0,7).map(r=>`<div><i style="height:${r.steps!==null?Math.max(4,Math.min(28,r.steps/10000*28)):3}px;background:${r.steps!==null?'#cc985e':'#ece1d0'}"></i><small>${day(r.date)}</small></div>`).join('')}</div><div class="metric-foot">${knownSteps.length}日分のデータ<span>Apple Health</span></div></article><article class="metric warm"><div class="metric-label">週の初めの体重<i>◉</i></div><div class="metric-value">${number(weight?.weight_kg,1)}<small>kg</small></div><p>${weight?short(weight.week_start)+'週の記録':'記録を待っておるぞ'}</p><div class="weight-delta"><span>前週比</span><b>${signed(weight?.previous_delta)}<small> kg</small></b></div><button class="metric-link" data-tab="weight">体重の推移を見る<span>→</span></button></article><article class="metric note-card"><span class="note-label">わらわの置き手紙</span><h3>小さな一歩も、<br>見ておるぞ。</h3><p>焦らず、こつこつ。<br>一緒に続けようぞ。</p><span class="note-leaf" aria-hidden="true">❧</span></article></div><section class="panel"><div class="panel-head"><div><h2>食事と活動の推移</h2><p>日々のバランスを、一緒に見てみるのじゃ。</p></div><div class="segmented"><button data-chart="energy" class="${state.chart==='energy'?'selected':''}">カロリー</button><button data-chart="steps" class="${state.chart==='steps'?'selected':''}">歩数</button></div></div><div class="legend"><span><i></i>${state.chart==='energy'?'摂取カロリー':'歩数'}</span>${state.chart==='energy'?'<span><i class="line"></i>総消費カロリー</span>':''}<small>${state.chart==='energy'?'kcal':'歩'}</small></div>${chart(rows,state.chart,target)}<div class="chart-foot">ⓘ 記録や取得がない日は、空欄にしておるぞ。${state.chart==='energy'?'総消費は、活動消費と安静時消費の合計じゃ。':''}</div></section>${dailyTable(rows)}`;}
const mealSlots=[['breakfast','朝','☀'],['lunch','昼','◒'],['dinner','晩','☾'],['snack','おやつ','♧']];
function feedbackOptions(){const comfort=data.settings.reporting?.comfort_annotations;return {...data.settings.reporting?.character_feedback,...data.settings.reporting?.positive_annotations,comfort_enabled:comfort?.enabled,excess_tolerance_ratio:comfort?.excess_tolerance_ratio,praise_variant:state.praiseVariant};}
function positiveNotes(row){const notes=positiveFoodFeedback(row,data.settings.current_targets,feedbackOptions());return {...notes,daily:{...notes.daily,...comfortFoodFeedback(row,data.settings.current_targets,feedbackOptions())}};}
function positiveNumber(value,note,key){
  if(!note)return esc(value);
  return `<button type="button" class="praise-target" data-feedback-mood="${note.mood==='sad'?'sad':'happy'}" data-positive-note="${esc(note.message)}" data-positive-key="${esc(key+':'+value)}" aria-label="${esc(note.label+'。'+note.message+' 押すとわらわが紹介するぞ。')}" aria-controls="positive-cheer" aria-expanded="false"><span>${esc(value)}</span><svg class="praise-circle" viewBox="0 0 120 64" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M107 16C91 -1 31 -1 12 16C-5 31 8 57 37 59C70 67 116 53 115 30C115 17 102 8 87 7"/></svg></button>`;
}
function mealNutrition(values,showDelta=false,notes={},context=''){
  const labels={kcal:'カロリー（kcal）',protein_g:'P たんぱく質（g）',fat_g:'F 脂質（g）',carbohydrate_g:'C 炭水化物（g）'};
  return '<dl class="meal-nutrients">'+NUTRIENTS.map(key=>`<div><dt>${labels[key]}</dt><dd>${positiveNumber(typeof values[key]==='number'?number(values[key],1):'未確定',notes[key],context+':'+key)}${showDelta?`<small class="meal-total-delta">目標差 ${signed(delta(values,key),1)}</small>`:''}</dd></div>`).join('')+'</dl>';
}
function mealEntryMarkup(record,showNutrition=true){
  const estimated=record.status?.includes('estimate')||record.status?.includes('assumptions')||/仮計上|概算/.test(record.notes||'');
  const foodItems=Array.isArray(record.food_items)?record.food_items:[];
  return `<div class="meal-entry" data-record-id="${esc(record.record_id)}"><h4>${esc(record.description||'食事の記録')}</h4>${showNutrition?mealNutrition(record):''}${foodItems.length?`<div class="food-breakdown"><p class="food-breakdown-label">食材ごとの内訳 <small>可食部換算・概算を含む</small></p><div class="food-table-scroll" tabindex="0" role="region" aria-label="食材ごとのカロリーとPFC"><table class="food-table"><thead><tr><th scope="col">食材</th><th scope="col">分量<small>g</small></th><th scope="col">kcal</th><th scope="col">P<small>g</small></th><th scope="col">F<small>g</small></th><th scope="col">C<small>g</small></th></tr></thead><tbody>${foodItems.map(item=>`<tr><th scope="row">${esc(item.food)}</th><td>${number(item.portion_g,1)}</td>${NUTRIENTS.map(key=>`<td>${typeof item[key]==='number'?number(item[key],1):'未確定'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`:''}${record.notes?`<details class="meal-entry-note"><summary>分量・計算の補足を見るのじゃ</summary><p>${esc(record.notes)}</p></details>`:''}<span class="source-label">${record.status==='imported_estimate'?'過去チャットからの概算記録':estimated?'概算・仮計上を含む記録':'入力した記録'}</span></div>`;
}
function mealSlotMarkup(row,[type,label,icon]){
  const entries=row.meals.filter(record=>record.meal===type);
  const totals=Object.fromEntries(NUTRIENTS.map(key=>[key,sumKnown(entries.map(record=>record[key]))]));
  return `<article class="panel meal-slot meal-slot-${type}" aria-labelledby="meal-${row.date}-${type}"><header class="meal-slot-head"><h3 id="meal-${row.date}-${type}"><span aria-hidden="true">${icon}</span>${label}</h3><span>${entries.length?entries.length+'件の記録':row.summary?'内訳なし':'未記録'}</span></header>${entries.length?`<div class="meal-slot-total"><span>この枠の記録分の合計</span>${mealNutrition(totals,false,positiveNotes(row).meals[type],row.date+':'+type)}</div><div class="meal-slot-entries">${entries.map(record=>mealEntryMarkup(record,entries.length>1)).join('')}</div>`:`<div class="meal-slot-empty"><span aria-hidden="true">${icon}</span><p>${row.summary?'この時間帯の内訳は残っておらぬのじゃ。':'まだ記録がないのじゃ。'}</p><small>食べなかったとの確認はしておらぬぞ。</small></div>`}</article>`;
}
function meals(){
  const end=dateAdd(state.start,state.period-1);
  const days=dailyRows(data.records,state.start,end).filter(row=>row.date<=today&&row.hasFood).reverse();
  return `<div class="section-top"><div><h2>おぬしの食事日記</h2><p class="meal-page-note">日付ごとに、朝・昼・晩・おやつを並べておるぞ。</p></div>${ranges()}</div><div class="meal-days">${days.length?days.map(row=>`<section class="meal-day" data-meal-date="${row.date}" aria-labelledby="meal-day-${row.date}"><header class="meal-day-head"><div><span class="eyebrow">${row.date.slice(0,4)}年の食事日記</span><h2 id="meal-day-${row.date}"><time datetime="${row.date}">${short(row.date)}<small>（${day(row.date)}）</small></time>${row.date===today?'<span class="today-chip">今日</span>':''}</h2></div><span class="soft-badge">${row.summary?'日合計の記録あり':'記録済みの途中経過'}</span></header><div class="meal-day-total"><p>${row.summary?'日合計':'記録済みの合計'}<small>目標差 ＝ 摂取量 − 目標候補</small></p>${mealNutrition(row,true,positiveNotes(row).daily,row.date+':day')}</div>${row.summary?`<details class="meal-summary-note"><summary>日合計と食事の内訳について</summary><p>日合計は保存済みの集計値じゃ。下の4枠には、時間帯が分かる個別の記録を載せておるぞ。枠内の記録を日合計へ重ねて足してはおらぬのじゃ。</p>${row.summary.notes?`<p>${esc(row.summary.notes)}</p>`:''}</details>`:''}<div class="meal-day-grid">${mealSlots.map(slot=>mealSlotMarkup(row,slot)).join('')}</div></section>`).join(''):'<div class="panel empty-state"><h3>この期間は、まだ食事の記録がないのじゃ。</h3><p>何を食べたか、ひとつずつ教えてたもれ。</p><button class="primary-button" data-input>記録のしかたを見る</button></div>'}</div>`;
}
function weight(weights){const latest=weights.at(-1),points=weights.length?dateRange(weights[0].week_start,latest.week_start).filter(d=>weekStart(d)===d).map(d=>weights.find(w=>w.week_start===d)||{week_start:d,weight_kg:null}):[];return `<div class="weight-banner"><div><span class="eyebrow">週に一度のふりかえりじゃ</span><h2>おぬしの変化、見守っておるぞ。</h2><p>月曜始まりの週ごとに、週初めの体重を教えてたもれ。</p></div><div class="weight-number">${number(latest?.weight_kg,1)}<small>kg</small><span>最新の記録</span></div><i class="banner-leaf" aria-hidden="true">❧</i></div><section class="panel"><div class="panel-head"><div><h2>体重の推移</h2><p>${weights.length?'初回 '+short(weights[0].week_start)+'週からの記録':'初めての記録、待っておるぞ'}</p></div><span class="soft-badge">${weights.length}週の記録</span></div>${chart(points,'weight')}<div class="chart-foot">ⓘ ${weights.length===1?'今は初回の1件じゃ。次の週も教えてくれたら、変化を一緒に見られるぞ。':'未記録の週は線をつながぬぞ。直前の週が未記録なら、前週比も「—」じゃ。'}</div></section><section class="panel"><div class="panel-head"><h2>週ごとの体重</h2><span class="unit-label">増減 = 今週 − 比較対象</span></div><div class="table-scroll"><table><thead><tr><th>週（月曜〜日曜）</th><th>体重</th><th>前週比</th><th>初回比</th></tr></thead><tbody>${weights.map(r=>`<tr><td><b>${short(r.week_start)} — ${short(r.week_end)}</b><span class="delta">${r.week_start.slice(0,4)}年</span></td><td><strong>${positiveNumber(number(r.weight_kg,1)+' kg',weightFeedback(r,feedbackOptions()),r.week_start+':weight')}</strong></td><td>${r.previous_delta===null?'—':signed(r.previous_delta)+' kg'}</td><td>${r.baseline_delta===null?'—':signed(r.baseline_delta)+' kg'}</td></tr>`).join('')}</tbody></table>${!weights.length?'<div class="empty-state">体重の記録も、待っておるぞ。</div>':''}</div></section>`;}
function connection(){const date=value=>value?new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未取得';return `<div class="data-grid"><section class="panel"><div class="integration-symbol">♡</div><span class="soft-badge">freddy経由で連携</span><h2>Apple Health</h2><p>歩数と消費カロリーは、iPhoneのヘルスケアからfreddy経由で受け取っておるぞ。</p><div class="path"><span>ヘルスケア</span>›<span>freddy</span>›<span>記録台帳</span>›<span>このサイト</span></div><dl><div><dt>取得するデータ</dt><dd>歩数・活動消費・安静時消費</dd></div><div><dt>直近の取得</dt><dd>${esc(date(data.health_sync.last_fetched_at))}</dd></div><div><dt>同期元の最終更新</dt><dd>${esc(date(data.health_sync.last_source_sync_at))}</dd></div></dl><div class="instruction"><h3>毎日の記録の流れ</h3><ol><li>食べたものを、Codexチャットでわらわに教えてたもれ。食事は登録・訂正のたびに公開するぞ。</li><li>毎日${esc(data.update_schedule?.healthcare_local_time||data.update_schedule?.local_time||'01:00')}（日本時間）に、freddyからヘルスケアのデータを取得するのじゃ。</li><li>毎日${esc((data.update_schedule?.local_times||[data.update_schedule?.local_time||'01:00']).join('・'))}（日本時間）に、保存した記録を、このサイトへお届けするぞ。</li><li>公開の処理が済んだら、最新の記録が見られるのじゃ。</li></ol><p>iPhoneの同期が古いときは、freddyを開いて同期してほしいのじゃ。このサイトからiPhoneを直接操作することはできぬぞ。</p></div><button class="secondary-button" data-refresh>↻ 表示データを再読み込み</button></section><div class="data-stack"><section class="panel"><h2>記録の保存先</h2><p>食事・体重・活動の原本は、プロジェクトの台帳に大切に残しておるぞ。このサイトには、表示用のデータを公開しておるのじゃ。</p><div class="data-stat"><span>公開中のレコード</span><strong>${data.records.length}<small> 件</small></strong></div><a class="secondary-button full" href="./data.json" download="health-life-data.json">↓ 表示データを書き出す</a><span class="updated">サイト更新：${esc(date(data.updated_at))}</span></section><section class="panel"><h2>GitHub Pages</h2><p>ここは、おぬしとわらわの記録のおうちじゃ。食事は登録・訂正のたびに、ほかの記録も毎日01:00と14:00（日本時間）の定期更新でお届けするぞ。</p><a class="secondary-button full" href="${esc(data.repository)}" target="_blank" rel="noopener noreferrer" style="margin-top:20px">リポジトリを見る ↗</a></section><div class="data-note"><i>❧</i><p>記録がない日を、0にはせぬぞ。<br>分からぬことは、そのままにしておくのじゃ。</p></div></div></div>`;}
function updateNotice(){const times=data.update_schedule?.local_times||[],healthTime=data.update_schedule?.healthcare_local_time,mealImmediate=data.update_schedule?.push_on_meal_change;return '<aside class="update-notice" aria-label="ページの更新タイミング"><strong>'+ (mealImmediate?'食事は登録・訂正後に反映するぞ。':'保存済みの記録をお届けするぞ。')+'</strong><p>公開の処理が済むまで、少し待ってたもれ。</p><details><summary>歩数・体重などの定期更新について</summary><p>'+ (healthTime?esc(healthTime)+'（日本時間）に、歩数・消費カロリーを取得して更新するのじゃ。 ':'')+(times.length?'毎日 '+esc(times.join('・'))+'（日本時間）には、保存済みの体重や記録もまとめて更新するぞ。':'')+' 食事の反映は、この時刻を待たぬぞ。</p></details></aside>';}
function weeklyBudgetMarkup(){
  const budget=weeklyCalorieBudget(data.records,data.settings.current_targets,today),unknown=budget.remaining_kcal===null;
  const coverage=[budget.recorded_days+'日分の記録',budget.missing_elapsed_days?'今日までに未記録 '+budget.missing_elapsed_days+'日':'',budget.partial_days?'途中の記録 '+budget.partial_days+'日':''].filter(Boolean).join(' · ');
  const remaining=unknown?(budget.has_unknown_kcal?'未確定':'—'):(budget.remaining_kcal<0?'−':'')+number(Math.abs(budget.remaining_kcal),1);
  return `<section class="weekly-budget" aria-labelledby="weekly-budget-heading"><div class="weekly-budget-intro"><span class="eyebrow">${short(budget.week_start)}（月）〜${short(budget.week_end)}（日）</span><h2 id="weekly-budget-heading">今週の残りカロリー</h2><span class="soft-badge">記録分からの途中計算</span></div><div class="weekly-budget-numbers"><p class="weekly-budget-value">${remaining}${unknown?'':'<small>kcal</small>'}</p><p class="weekly-budget-formula">週間目標 ${number(budget.target_kcal,0)} − 記録済み ${number(budget.intake_kcal,1)} kcal</p>${budget.remaining_kcal!==null&&budget.remaining_kcal<0?'<p class="weekly-budget-over">負数は週間目標を超えた分じゃよ。</p>':''}</div><div class="weekly-budget-note"><p>${coverage}</p><p>未記録の食事があれば、その分はまだ差し引いておらぬぞ。歩数などの消費カロリーは、残量に足しておらぬぞ。</p>${budget.has_unknown_kcal?'<p>カロリーが不明の記録があるため、残りは未確定じゃ。</p>':''}</div></section>`;
}
function render(){const rows=dailyRows(data.records,state.start,dateAdd(state.start,state.period-1)),weights=weightRows(data.records,data.settings.reporting?.weekly_weight?.baseline_record_id);const headings={overview:['おかえり、おぬし。','ここは、わらわの小さな部屋。今日のことを、のんびり話していくのじゃ。'],meals:['おいしく食べたら、教えるのじゃ。','何を食べたか、わらわに聞かせてたもれ。おぬしのペースで記録を残すのじゃ。'],weight:['変化を、ゆっくり見ていこうぞ。','週の初めに一度、体重を教えてたもれ。長い目で、わらわと見ていくのじゃ。'],data:['記録のつながり、見てみるのじゃ。','歩数は届いておるかの？ ヘルスケアの取得状況や、更新の流れが分かるぞ。']};document.querySelectorAll('nav [data-tab]').forEach(button=>{button.classList.toggle('active',button.dataset.tab===state.tab);button.setAttribute('aria-current',button.dataset.tab===state.tab?'page':'false');});$('#crumb').textContent=names[state.tab];$('#app').innerHTML=`<div class="heading"><div><span class="eyebrow">狐妹の部屋 · こつこつ健康日記</span><h1>${headings[state.tab][0]}</h1><p>${headings[state.tab][1]}</p></div><button class="primary-button" data-input><span>＋</span>記録のしかた</button></div>${updateNotice()}${state.tab==='overview'?weeklyBudgetMarkup():''}${['meals','weight'].includes(state.tab)?'':mascotMarkup(rows)}${state.tab==='overview'?overview(rows,weights):state.tab==='meals'?meals():state.tab==='weight'?weight(weights):connection()}`;mountPositiveEffects();}
async function load(){try{const response=await fetch('./data.json?v='+Date.now(),{cache:'no-store'});if(!response.ok)throw new Error('記録を読み込めなかったのじゃ。');data=await response.json();$('#loading').hidden=true;render();}catch(error){$('#loading').innerHTML=`<div class="error-panel">${esc(error.message)}<br>少し待ってから、もう一度読み込んでほしいのじゃ。</div>`;}}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.tab){state.tab=button.dataset.tab;render();}if(button.dataset.period){state.period=Number(button.dataset.period);state.start=weekStart(state.start);render();}if(button.dataset.range){if(button.dataset.range==='today'){state.start=weekStart(today);state.period=7;}else state.start=dateAdd(state.start,button.dataset.range==='prev'?-state.period:state.period);render();}if(button.dataset.chart){state.chart=button.dataset.chart;render();}if(button.hasAttribute('data-input'))$('#input-dialog').showModal();if(button.hasAttribute('data-refresh'))void load();});
$('#close-dialog').addEventListener('click',()=>$('#input-dialog').close());$('#done-dialog').addEventListener('click',()=>$('#input-dialog').close());$('#input-dialog').addEventListener('click',event=>{if(event.target===$('#input-dialog')){const rect=event.target.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)event.target.close();}});
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let mascotMotion=!reducedMotion;
try{if(localStorage.getItem('health-life-mascot-motion')==='off')mascotMotion=false;}catch{}
function spriteMarkup(mood){return `<div class="mascot-scene mood-${mood} ${mascotMotion?'':'motion-paused'}"><span class="sad-weather" aria-hidden="true"><span class="sad-cloud"></span><i class="sad-raindrop rain-one"></i><i class="sad-raindrop rain-two"></i><i class="sad-raindrop rain-three"></i></span><span class="sad-gloom" aria-hidden="true"><i></i><i></i><i></i></span><span class="character-shadow" aria-hidden="true"></span><div class="character-sprite" role="img" aria-label="${mood==='happy'?'ぽよぽよと喜んでいる':mood==='sad'?'しおしおとした表情の':'穏やかな表情の'}あまみこむぎ"><img class="frame-base" src="./assets/character-base.png?v=27cc35b48886" alt="" aria-hidden="true"><img class="frame-half" src="./assets/character-blink-half.png?v=18c7984abea9" alt="" aria-hidden="true"><img class="frame-closed" src="./assets/character-blink-closed.png?v=33f4f3ae4459" alt="" aria-hidden="true"><img class="frame-mouth-half" src="./assets/character-mouth-half.png?v=352d78c86e0e" alt="" aria-hidden="true"><img class="frame-mouth" src="./assets/character-mouth-open.png?v=db693810e566" alt="" aria-hidden="true"><span class="character-tear" aria-hidden="true"></span></div><span class="character-sparkle sparkle-left" aria-hidden="true">✧</span><span class="character-sparkle sparkle-right" aria-hidden="true">✧</span></div>`;}

function foxSpriteMarkup(mood) {
  const label=mood==='happy'?'ぽよぽよと喜んでいる':mood==='sad'?'耳を垂らしてしおしおしている':'穏やかに見守っている';
  return `<div class="mascot-scene fox-scene mood-${mood} ${mascotMotion?'':'motion-paused'}"><span class="sad-weather" aria-hidden="true"><span class="sad-cloud"></span><i class="sad-raindrop rain-one"></i><i class="sad-raindrop rain-two"></i><i class="sad-raindrop rain-three"></i></span><span class="sad-gloom" aria-hidden="true"><i></i><i></i><i></i></span><span class="character-shadow" aria-hidden="true"></span><div class="character-sprite fox-sprite" role="img" aria-label="${label}九尾の狐妹"><img class="fox-frame fox-joy" src="./assets/fox-sister-base.png?v=75cde8b8fadb" alt="" aria-hidden="true"><img class="fox-frame fox-sad" src="./assets/fox-sister-sad.png?v=d9e1c2e66cdf" alt="" aria-hidden="true"><span class="character-tear" aria-hidden="true"></span></div><span class="character-sparkle sparkle-left" aria-hidden="true">✧</span><span class="character-sparkle sparkle-right" aria-hidden="true">✧</span></div>`;
}
function castMarkup(mood) {
  return `<div class="mascot-cast"><figure class="mascot-actor">${spriteMarkup(mood)}<figcaption>あまみこむぎ</figcaption></figure><figure class="mascot-actor">${foxSpriteMarkup(mood)}<figcaption>わらわ（狐妹）</figcaption></figure></div>`;
}
function roomStageMarkup(mood) {
  return `<div class="room-stage"><div class="room-set" aria-hidden="true"><svg viewBox="0 0 520 320" preserveAspectRatio="xMidYMid slice" fill="none"><path fill="#f5e8d0" d="M0 0H520V320H0Z"/><path fill="#e1bf91" d="M0 238H520V320H0Z"/><path d="M0 239H520M0 275H520M94 239L65 320M410 239L446 320" stroke="#cba371" stroke-width="2"/><path d="M0 7H520M18 0V239M501 0V239" stroke="#b88750" stroke-width="9"/><rect x="78" y="34" width="193" height="141" rx="3" fill="#fff8df" stroke="#bb905f" stroke-width="5"/><circle cx="226" cy="70" r="23" fill="#f4cd7c"/><path d="M80 147C114 110 127 164 168 126C202 93 216 133 269 105V173H80Z" fill="#ebc58d"/><path d="M80 77H269M80 124H269M141 35V174M206 35V174" stroke="#c9a776" stroke-width="3"/><path d="M70 179H280" stroke="#b88750" stroke-width="7" stroke-linecap="round"/><rect x="377" y="172" width="93" height="70" rx="4" fill="#c69b68" stroke="#ad7c45" stroke-width="3"/><path d="M378 206H469M424 173V240" stroke="#ad7c45" stroke-width="3"/><circle cx="414" cy="190" r="2" fill="#83562f"/><circle cx="436" cy="190" r="2" fill="#83562f"/><path d="M388 168V151H408V168M410 168V145H427V168" fill="#e8ce9e" stroke="#ad7c45" stroke-width="2"/><path d="M442 0V29" stroke="#9a6e3c" stroke-width="3"/><path d="M416 50L427 29H456L467 50Z" fill="#f4d18d" stroke="#ae804a" stroke-width="2"/><path d="M420 53H464" stroke="#c7a068" stroke-width="3"/><ellipse cx="260" cy="276" rx="196" ry="27" fill="#f7deb1" stroke="#d3aa72" stroke-width="3"/><ellipse cx="260" cy="276" rx="179" ry="19" stroke="#e5bf85" stroke-width="2"/><path d="M35 232L31 204H57L53 232Z" fill="#b97649"/><path d="M44 205V168M44 181L30 170M44 191L60 179" stroke="#a67541" stroke-width="2"/><path d="M29 173L23 157L39 163ZM51 177L67 167L65 184ZM37 166L43 151L50 167Z" fill="#cf8a45"/></svg></div>${castMarkup(mood)}</div>`;
}
function reviewCard(row, phase){
  const current=phase==='today',options=feedbackOptions();
  const habits=habitFeedback(data.records,row.date,options);
  let feedback=reviewFeedback(row,data.settings.current_targets,options,phase);
  if(feedback.mood==='neutral'&&habits.length&&row.hasFood)feedback={mood:'happy',message:'続けるおぬしが、わらわは嬉しいぞ♪',detail:habits[0].message};
  const yesterday=dateAdd(today,-1),title=current?'今日の評価':row.date===yesterday?'昨日の振り返り':'選んだ日の振り返り';
  const id='review-'+phase;
  const dates=[...new Set([yesterday,...data.records.filter(r=>!r.deleted_at&&r.date<today).map(r=>r.date)])].sort().reverse();
  return `<section class="mascot-panel review-card mood-${feedback.mood} ${mascotMotion?'':'motion-paused'}" aria-labelledby="${id}" data-review-date="${row.date}"><header class="review-heading"><div><span class="mascot-eyebrow">${short(row.date)}（${day(row.date)}）</span><h2 id="${id}">${title}</h2></div><span class="soft-badge">${current?'ここまでの記録':row.hasFood?'保存済みの記録':'食事は未記録'}</span></header>${roomStageMarkup(feedback.mood)}<div class="mascot-message"><h3>${esc(feedback.message)}</h3><p>${esc(feedback.detail)}</p><div class="habit-cheers">${habits.map(note=>positiveNumber(note.text,note,row.date+':habit:'+note.key)).join('')}</div></div><div class="review-records"><dl class="review-nutrition">${NUTRIENTS.map((key,i)=>`<div><dt>${['摂取量','P','F','C'][i]}</dt><dd>${number(row[key],1)}<small>${key==='kcal'?'kcal':'g'}</small></dd></div>`).join('')}</dl><p class="review-activity">歩数：${row.steps===null?'未取得':number(row.steps)+'歩'} · 総消費：${row.total_expenditure_kcal===null?'未取得':number(row.total_expenditure_kcal,1)+' kcal'}</p><small class="mascot-disclaimer">${current?'今日の途中評価じゃ。食事ごとのよいところを見つけ、一日分のカロリー達成・超過の判定はまだせぬぞ。':row.summary?.day_coverage==='partial_recorded'||!row.summary?'一日の食事がそろっておるかは未確認じゃ。残っている記録から振り返るぞ。':'保存済みの食事・活動で振り返っておるぞ。未報告や未取得の分は含まぬのじゃ。'}</small></div>${current?'':`<label class="review-history-label">過去の日も振り返る<select aria-label="ふりかえりの日付" id="review-date">${dates.map(date=>`<option value="${date}" ${date===row.date?'selected':''}>${short(date)}（${day(date)}）${date===yesterday?' 昨日':''}</option>`).join('')}</select></label>`}</section>`;
}
function mascotMarkup(){
  const yesterday=dateAdd(today,-1),historyDate=state.reviewDate&&state.reviewDate<today?state.reviewDate:yesterday;
  const current=dailyRows(data.records,today,today)[0],previous=dailyRows(data.records,historyDate,historyDate)[0];
  return `<div class="review-pair">${reviewCard(current,'today')}${reviewCard(previous,'history')}</div><div class="review-controls"><details class="feedback-rules"><summary>褒め方と慰め方を見るのじゃ</summary><p>褒める：1食のP比率20%以上、1日5,000歩以上、P目標候補の到達、記録の継続・再開、朝昼晩の記録、週の体重入力じゃ。昨日以前は、一部の記録だけでない日合計カロリーが目標候補の±10%以内なら褒めるぞ。</p><p>慰める：昨日以前の、一部の記録だけでない日合計カロリーか脂質が目標候補の110%を超えたとき。今日の途中経過や未確定の項目では判定せぬぞ。P比率は演出用の基準で、食事全体の健康度ではないのじゃ。</p></details><div class="mascot-tool-buttons"><button data-praise-variant>別の褒め方を見る</button><button data-mascot-preview>動きを試す</button>${reducedMotion?'<small class="mascot-disclaimer">端末の設定に合わせて、静かにしておるぞ</small>':`<button data-motion-toggle aria-pressed="${!mascotMotion}">${mascotMotion?'動きを止める':'動かす'}</button>`}</div></div>`;
}

document.body.insertAdjacentHTML('beforeend',`<dialog id="mascot-dialog"><div class="dialog-head"><div><span class="eyebrow">二人の動き見本じゃ</span><h2>二人の動き、見てみるかの？</h2></div><button class="icon-button" data-close-preview aria-label="プレビューを閉じる">×</button></div><div class="dialog-body"><div class="mascot-preview-box" id="mascot-preview-box">${castMarkup('happy')}</div><div class="preview-controls"><button data-preview-mood="happy" class="selected">ぽよぽよ</button><button data-preview-mood="sad">しおしお</button><button data-preview-mood="neutral">いつも通り</button></div><label class="feedback-example-label">反応の見本じゃ<select id="feedback-example"><option value="">条件を選ぶのじゃ</option value="protein">1食のP比率20%</option><option value="calorie">日合計カロリーが目標候補と同じ</option><option value="steps">5,000歩を記録</option><option value="calorie-excess">日合計カロリーが目標候補の120%</option><option value="fat-excess">日合計脂質が目標候補の120%</option></select></label><p id="feedback-example-message" role="status">ここでは、二人の動きと反応を試せるぞ。見本は記録には追加せぬから安心するのじゃ。</p></div></dialog>`);
document.addEventListener('change',event=>{
  if(event.target.id!=='feedback-example'||!event.target.value)return;
  const targets=data.settings.current_targets,type=event.target.value;
  const sample={hasFood:true,summary:{},kcal:targets.daily_kcal,fat_g:targets.fat_g};
  if(type==='calorie-excess')sample.kcal=targets.daily_kcal*1.2;
  if(type==='fat-excess')sample.fat_g=targets.fat_g*1.2;
  if(type==='steps'){sample.hasFood=false;sample.summary=null;sample.kcal=null;sample.steps=5000;}
  let feedback;
  if(type==='protein'){
    const note=positiveFoodFeedback({hasFood:true,meals:[{meal:'lunch',kcal:500,protein_g:25}]},targets,feedbackOptions()).meals.lunch.protein_g;
    feedback={mood:'happy',message:note.message};
  }else feedback=characterFeedback(sample,targets,feedbackOptions());
  $('#mascot-preview-box').innerHTML=castMarkup(feedback.mood);
  $('#feedback-example-message').textContent='【見本】'+feedback.message+(feedback.detail?' '+feedback.detail:'');
  document.querySelectorAll('[data-preview-mood]').forEach(button=>button.classList.toggle('selected',button.dataset.previewMood===feedback.mood));
});

document.addEventListener('change',event=>{if(event.target.id==='review-date'){state.reviewDate=event.target.value;render();}});
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.hasAttribute('data-praise-variant')){state.praiseVariant=(state.praiseVariant+1)%5;render();}if(button.hasAttribute('data-mascot-preview')){$('#mascot-preview-box').innerHTML=castMarkup(document.querySelector('[data-preview-mood].selected')?.dataset.previewMood||'happy');$('#mascot-dialog').showModal();}if(button.hasAttribute('data-close-preview'))$('#mascot-dialog').close();if(button.hasAttribute('data-motion-toggle')){mascotMotion=!mascotMotion;try{localStorage.setItem('health-life-mascot-motion',mascotMotion?'on':'off');}catch{}render();}if(button.dataset.previewMood){$('#mascot-preview-box').innerHTML=castMarkup(button.dataset.previewMood);document.querySelectorAll('[data-preview-mood]').forEach(b=>b.classList.toggle('selected',b===button));}});
document.body.insertAdjacentHTML('beforeend',`<svg class="praise-pointer" id="positive-pointer" aria-hidden="true" hidden><path/><circle r="3"/></svg><aside class="praise-companion" id="positive-cheer" aria-label="わらわのよいところ紹介" hidden><div class="praise-fox" aria-hidden="true"><div class="praise-bounce"><img src="./assets/fox-sister-pointing-v2.png?v=1003a28d5bd2" alt=""><span class="praise-star star-one">✧</span><span class="praise-star star-two">✦</span></div></div><div class="praise-note"><button class="praise-close" type="button" data-close-positive aria-label="よいところ紹介を閉じる">×</button><span>ここがよいのじゃ！</span><p id="positive-message" role="status" aria-live="polite"></p></div></aside>`);
let positiveObserver, positiveTarget=null, positiveTimer, positiveFrame, positiveAnimationFrame, positiveAutomatic=false;
const positiveSeen=new Set();
const praiseBox=$('#positive-cheer'), praisePointer=$('#positive-pointer');
const prefersQuiet=()=>!mascotMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function hidePositive(){
  clearTimeout(positiveTimer);
  cancelAnimationFrame(positiveAnimationFrame);positiveAnimationFrame=null;
  if(positiveTarget){positiveTarget.classList.remove('is-cheering');positiveTarget.setAttribute('aria-expanded','false');}
  positiveTarget=null;
  praiseBox.hidden=true;praisePointer.hidden=true;
}
function positionPositive(){
  if(!positiveTarget?.isConnected){hidePositive();return;}
  const rect=positiveTarget.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight;
  if(rect.bottom<0||rect.top>vh||rect.right<0||rect.left>vw){hidePositive();return;}
  const width=praiseBox.getBoundingClientRect().width,fox=praiseBox.querySelector('.praise-fox'),note=praiseBox.querySelector('.praise-note');
  const foxWidth=fox.getBoundingClientRect().width,center=rect.left+rect.width/2,compact=vw<620;
  let left,foxLeft,noteLeft,noteTop,pointLeft;
  if(compact){
    left=12;pointLeft=center<=vw/2;
    foxLeft=pointLeft?width-foxWidth:0;
    note.style.width=Math.min(200,width-foxWidth/2-12)+'px';
    noteLeft=pointLeft?0:width-note.getBoundingClientRect().width;
    noteTop=foxWidth*.41+22;
  }else{
    note.style.width='260px';
    pointLeft=center+16+foxWidth<=vw-12;
    const desiredFoxLeft=pointLeft?center+16:center-foxWidth-16;
    const reverse=desiredFoxLeft+width>vw-12;
    foxLeft=reverse?width-foxWidth:0;noteLeft=reverse?0:foxWidth+24;
    left=Math.max(12,Math.min(vw-width-12,desiredFoxLeft-foxLeft));
    noteTop=Math.max(12,foxWidth*.41-note.getBoundingClientRect().height/2);
  }
  fox.style.left=foxLeft+'px';fox.style.top='0px';fox.classList.toggle('is-mirrored',!pointLeft);
  note.style.left=noteLeft+'px';note.style.top=noteTop+'px';
  note.dataset.tail=compact?(noteLeft<foxLeft?'top-right':'top-left'):(noteLeft<foxLeft?'right':'left');
  const height=Math.max(foxWidth,noteTop+note.getBoundingClientRect().height);
  praiseBox.style.height=height+'px';
  const top=rect.bottom+12;
  if(top+height>vh-10){praiseBox.style.visibility='hidden';praisePointer.hidden=true;return;}
  praiseBox.style.left=left+'px';praiseBox.style.top=top+'px';praiseBox.style.visibility='visible';
  updatePositivePointers();
}
function updatePositivePointers(){
  if(!positiveTarget?.isConnected||praiseBox.hidden||praiseBox.style.visibility==='hidden')return;
  const rect=positiveTarget.getBoundingClientRect(),vw=document.documentElement.clientWidth,vh=window.innerHeight;
  const fox=praiseBox.querySelector('.praise-fox'),foxRect=fox.querySelector('img').getBoundingClientRect(),mirrored=fox.classList.contains('is-mirrored');
  const tipX=foxRect.left+foxRect.width*(mirrored?.83:.17),tipY=foxRect.top+foxRect.height*.24;
  const endX=rect.left+rect.width/2,endY=rect.bottom+2;
  if(praiseBox.dataset.mood==='sad'){praisePointer.hidden=true;return;}
  praisePointer.setAttribute('viewBox',`0 0 ${vw} ${vh}`);
  praisePointer.querySelector('path').setAttribute('d',`M${tipX} ${tipY} Q${endX} ${tipY} ${endX} ${endY}`);
  praisePointer.querySelector('circle').setAttribute('cx',endX);praisePointer.querySelector('circle').setAttribute('cy',endY);
  praisePointer.hidden=false;
}
function animatePositivePointers(){
  positiveAnimationFrame=null;
  if(!positiveTarget||prefersQuiet()||document.hidden)return;
  updatePositivePointers();positiveAnimationFrame=requestAnimationFrame(animatePositivePointers);
}
function showPositive(target,{automatic=false,scroll=true}={}){
  hidePositive();positiveTarget=target;positiveAutomatic=automatic;
  target.setAttribute('aria-expanded','true');
  // Restart the hand-drawn ring only in the page's own interactive UI.
  target.classList.remove('is-cheering');void target.offsetWidth;target.classList.add('is-cheering');
  const mood=target.dataset.feedbackMood==='sad'?'sad':'happy';
  praiseBox.dataset.mood=mood;
  praiseBox.querySelector('.praise-bounce img').src=mood==='sad'?"./assets/fox-sister-sad.png?v=d9e1c2e66cdf":"./assets/fox-sister-pointing-v2.png?v=1003a28d5bd2";
  praiseBox.querySelector('.praise-note > span').textContent=mood==='sad'?'わらわは味方じゃよ':'ここがよいのじゃ！';
  $('#positive-message').textContent=target.dataset.positiveNote;
  praiseBox.style.visibility='hidden';praiseBox.hidden=false;
  const quiet=prefersQuiet();document.body.classList.toggle('praise-motion-paused',quiet);
  positionPositive();
  const height=praiseBox.getBoundingClientRect().height,rect=target.getBoundingClientRect();
  if(!automatic&&scroll&&rect.bottom+height+22>window.innerHeight)target.scrollIntoView({block:height+rect.height/2+22>window.innerHeight/2?'start':'center',behavior:quiet?'instant':'smooth'});
  if(!quiet)positiveAnimationFrame=requestAnimationFrame(animatePositivePointers);
  if(automatic&&!quiet)positiveTimer=setTimeout(hidePositive,data.settings.reporting?.positive_annotations?.automatic_duration_ms||6500);
}
function mountPositiveEffects(){
  const restore=positiveTarget?.dataset.positiveKey,automatic=positiveAutomatic;
  positiveObserver?.disconnect();hidePositive();
  document.body.classList.toggle('praise-motion-paused',prefersQuiet());
  const targets=[...document.querySelectorAll('.praise-target')];
  const restored=restore&&targets.find(target=>target.dataset.positiveKey===restore);
  if(restored)showPositive(restored,{automatic,scroll:false});
  if(prefersQuiet()||!('IntersectionObserver'in window))return;
  let played=!!restored;
  const reserve=document.documentElement.clientWidth<620?380:300;
  positiveObserver=new IntersectionObserver(entries=>{
    if(played||positiveTarget||document.querySelector('dialog[open]'))return;
    const entry=entries.find(entry=>entry.isIntersecting&&!positiveSeen.has(entry.target.dataset.positiveKey));
    if(!entry)return;
    const rect=entry.target.getBoundingClientRect();
    if(rect.bottom>window.innerHeight-reserve)return;
    played=true;positiveSeen.add(entry.target.dataset.positiveKey);showPositive(entry.target,{automatic:true,scroll:false});
  },{threshold:.8,rootMargin:`0px 0px -${reserve}px 0px`});
  targets.forEach(target=>positiveObserver.observe(target));
}
document.addEventListener('click',event=>{
  const target=event.target.closest('[data-positive-note]');
  if(target)showPositive(target);
  if(event.target.closest('[data-close-positive]'))hidePositive();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&positiveTarget)hidePositive();});
const repositionPositive=()=>{if(!positiveTarget||positiveFrame)return;positiveFrame=requestAnimationFrame(()=>{positiveFrame=null;positionPositive();});};
window.addEventListener('scroll',repositionPositive,{passive:true,capture:true});
window.addEventListener('resize',repositionPositive,{passive:true});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{document.body.classList.toggle('praise-motion-paused',prefersQuiet());clearTimeout(positiveTimer);cancelAnimationFrame(positiveAnimationFrame);positiveAnimationFrame=null;updatePositivePointers();if(positiveTarget&&!prefersQuiet())positiveAnimationFrame=requestAnimationFrame(animatePositivePointers);});
document.addEventListener('visibilitychange',()=>{cancelAnimationFrame(positiveAnimationFrame);positiveAnimationFrame=null;if(!document.hidden&&positiveTarget&&!prefersQuiet())positiveAnimationFrame=requestAnimationFrame(animatePositivePointers);});
void load();
