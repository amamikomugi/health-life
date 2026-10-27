export const NUTRIENTS = ['kcal', 'protein_g', 'fat_g', 'carbohydrate_g'];
export const MEALS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食' };
export function japanDate(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function dateAdd(date, days) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
export function weekStart(date) { const d = new Date(date + 'T12:00:00Z'); return dateAdd(date, -((d.getUTCDay() + 6) % 7)); }
export function dateRange(start, end) { const result = []; for (let d = start; d <= end && result.length < 370; d = dateAdd(d, 1)) result.push(d); return result; }
export function numeric(value) { return typeof value === 'number' && Number.isFinite(value) ? value : null; }
export function sumKnown(values) { return values.length && values.every(x => numeric(x) !== null) ? Math.round(values.reduce((a, b) => a + b, 0) * 1000) / 1000 : null; }
export function dailyRows(records, start, end) {
  return dateRange(start, end).map(date => {
    const rows = records.filter(r => r.date === date && !r.deleted_at);
    const meals = rows.filter(r => r.kind === 'meal');
    const summary = rows.filter(r => r.kind === 'daily_summary').sort((a, b) => String(b.updated_at || b.recorded_at || '').localeCompare(String(a.updated_at || a.recorded_at || '')))[0];
    const activity = metric => rows.filter(r => r.kind === 'daily_activity' && r.source_metric === metric).sort((a, b) => String(b.fetched_at || '').localeCompare(String(a.fetched_at || '')))[0];
    const steps = activity('steps_total'), active = activity('active_energy_total'), basal = activity('basal_energy_total');
    const food = Object.fromEntries(NUTRIENTS.map(key => [key, summary ? numeric(summary[key]) : sumKnown(meals.map(m => m[key]))]));
    const activeValue = active ? numeric(active.active_kcal) : numeric(summary?.active_kcal);
    const basalValue = basal ? numeric(basal.basal_kcal) : null;
    return { date, ...food, steps: steps ? numeric(steps.steps) : numeric(summary?.steps), active_kcal: activeValue, basal_kcal: basalValue, total_expenditure_kcal: activeValue !== null && basalValue !== null ? activeValue + basalValue : null, meals, summary, hasFood: !!summary || meals.length > 0, activityStatus: [steps, active, basal].some(r => r?.status === 'possibly_incomplete') ? 'possibly_incomplete' : steps?.status || 'not_fetched', fetchedAt: steps?.fetched_at || active?.fetched_at || null, estimated: summary?.status === 'imported_estimate' || meals.some(m => m.status === 'imported_estimate') };
  });
}
export function weightRows(records, baselineId) {
  const weights = records.filter(r => r.kind === 'weekly_weight' && !r.deleted_at).sort((a, b) => a.week_start.localeCompare(b.week_start));
  const baseline = weights.find(r => r.record_id === baselineId) || weights[0];
  return weights.map(r => { const previous = weights.find(w => w.week_start === dateAdd(r.week_start, -7)); return { ...r, previous_delta: previous ? r.weight_kg - previous.weight_kg : null, baseline_delta: baseline ? r.weight_kg - baseline.weight_kg : null }; });
}
export function recordedDailyTotals(records, today, now = new Date().toISOString(), startDate = '') {
  const next = records.map(r => ({ ...r }));
  const dates = [...new Set(records.filter(r => (r.kind === 'meal' || r.status === 'calculated_from_recorded_meals') && r.date < today && r.date >= startDate).map(r => r.date))];
  for (const date of dates) {
    const index = next.findIndex(r => r.date === date && r.kind === 'daily_summary');
    const old = next[index];
    if (old && old.status !== 'calculated_from_recorded_meals') continue;
    const meals = next.filter(r => r.date === date && r.kind === 'meal' && !r.deleted_at);
    if (!meals.length) { if (old && !old.deleted_at) next[index] = { ...old, deleted_at: now, updated_at: now }; continue; }
    const nutrients = Object.fromEntries(NUTRIENTS.map(key => [key, sumKnown(meals.map(r => r[key]))]));
    const ids = meals.map(r => r.record_id).sort();
    const coverage = ['breakfast','lunch','dinner'].every(type => meals.some(r => r.meal === type)) ? 'breakfast_lunch_dinner_recorded' : 'partial_recorded';
    if (old && !old.deleted_at && old.day_coverage === coverage && NUTRIENTS.every(key => old[key] === nutrients[key]) && JSON.stringify(old.included_meal_ids) === JSON.stringify(ids)) continue;
    const record = { ...old, record_id: old?.record_id || `daily-${date.replaceAll('-', '')}`, date, kind: 'daily_summary', ...nutrients, status: 'calculated_from_recorded_meals', source_type: 'calculated_from_records', source_record_ids: ids, included_meal_ids: ids, day_coverage: coverage, base_nutrition: Object.fromEntries(NUTRIENTS.map(key => [key, 0])), notes: '記録済みの食事だけを合計しています。未報告の食事の有無は未確認です。', recorded_at: old?.recorded_at || now, updated_at: now };
    delete record.deleted_at;
    if (index >= 0) next[index] = record; else next.push(record);
  }
  return next;
}
function fail(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function validDate(date) { if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date + 'T12:00:00Z').getTime()) || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date) fail('日付を確認してください。'); return date; }
function optionalNumber(value, label, max = 20000) { if (value === '' || value === null || value === undefined) return null; const number = Number(value); if (!Number.isFinite(number) || number < 0 || number > max) fail(label + 'の数値を確認してください。'); return number; }
export function applyEntry(records, input, now = new Date().toISOString()) {
  if (!input || typeof input !== 'object') fail('入力内容を確認してください。');
  const next = records.map(r => ({ ...r }));
  const existing = input.record_id ? next.find(r => r.record_id === input.record_id) : null;
  const save = record => { const index = next.findIndex(r => r.record_id === record.record_id); if (index >= 0) next[index] = record; else next.push(record); return record; };
  const updateSummary = (date, record, remove = false) => {
    const summary = next.find(r => r.kind === 'daily_summary' && r.date === date && !r.deleted_at);
    if (!summary) return;
    const included = [...(summary.included_meal_ids || [])];
    if (existing && !included.includes(existing.record_id)) fail('この食事と日合計の対応が不明です。「日合計」を修正してください。', 409);
    const base = summary.base_nutrition || Object.fromEntries(NUTRIENTS.map(key => [key, numeric(summary[key])]));
    const ids = remove ? included.filter(id => id !== record.record_id) : [...new Set([...included, record.record_id])];
    const nutrition = Object.fromEntries(NUTRIENTS.map(key => [key, sumKnown([base[key], ...ids.map(id => next.find(r => r.record_id === id)?.[key] ?? null)])]));
    save({ ...summary, ...nutrition, base_nutrition: base, included_meal_ids: ids, updated_at: now, notes: [summary.notes, 'サイトで追加した食事を日合計に反映（重複計上なし）。'].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' ') });
  };
  if (input.action === 'delete') {
    if (!existing) fail('対象の記録が見つかりません。', 404);
    if (!['meal', 'weekly_weight', 'daily_summary'].includes(existing.kind)) fail('ヘルスケアの記録は取得元で修正してください。');
    if (existing.kind === 'meal') updateSummary(existing.date, existing, true);
    const deleted = { ...existing, deleted_at: now, updated_at: now };
    save(deleted); return { records: next, record: deleted, deleted: true };
  }
  const date = validDate(input.date);
  if (date > japanDate(new Date(now))) fail('未来の日付には実績を登録できません。');
  if (existing && existing.date !== date) fail('訂正では元の記録の日付を使用してください。');
  if (input.kind === 'weekly_weight') {
    const start = weekStart(date), weight = optionalNumber(input.weight_kg, '体重', 500);
    if (weight === null || weight <= 0) fail('体重を入力してください。');
    const prior = next.find(r => r.kind === 'weekly_weight' && r.week_start === start);
    const record = { ...prior, record_id: prior?.record_id || `weight-week-${start.replaceAll('-', '')}`, date: start, kind: 'weekly_weight', week_start: start, week_end: dateAdd(start, 6), weight_kg: weight, unit: 'kg', measured_at: prior?.measured_at ?? null, status: 'user_reported', source_type: 'website_form', source_text: `${start}週の体重 ${weight}kg`, recorded_at: prior?.recorded_at || now, updated_at: now };
    delete record.deleted_at; save(record); return { records: next, record };
  }
  if (!['meal', 'daily_summary'].includes(input.kind)) fail('記録の種類を確認してください。');
  if (existing && existing.kind !== input.kind) fail('訂正では元の記録の種類を使用してください。');
  const description = String(input.description || '').trim();
  if (description.length > 4000 || (input.kind === 'meal' && !description)) fail('食べたものを4,000文字以内で入力してください。');
  if (input.kind === 'meal' && !Object.hasOwn(MEALS, input.meal)) fail('食事区分を選んでください。');
  const nutrients = Object.fromEntries(NUTRIENTS.map(key => [key, optionalNumber(input[key], key, key === 'kcal' ? 20000 : 3000)]));
  const summary = input.kind === 'daily_summary' ? next.find(r => r.kind === 'daily_summary' && r.date === date && !r.deleted_at) : null;
  const prior = existing || summary;
  const record = { ...prior, record_id: prior?.record_id || (input.kind === 'daily_summary' ? `daily-${date.replaceAll('-', '')}` : `meal-${crypto.randomUUID()}`), date, kind: input.kind, ...(input.kind === 'meal' ? { meal: input.meal } : {}), description, ...nutrients, status: 'user_reported', source_type: 'website_form', source_text: description || `${date}の日合計を入力`, recorded_at: prior?.recorded_at || now, updated_at: now };
  if (input.kind === 'daily_summary') { delete record.base_nutrition; delete record.included_meal_ids; }
  delete record.deleted_at; save(record); if (input.kind === 'meal') updateSummary(date, record);
  return { records: next, record };
}
export function mergeRecords(current, incoming) {
  if (!Array.isArray(incoming) || incoming.length > 20000) fail('記録ファイルの形式を確認してください。');
  const map = new Map(current.map(r => [r.record_id, r]));
  for (const r of incoming) {
    if (!r || typeof r.record_id !== 'string' || r.record_id.length > 160 || !['meal','daily_summary','daily_activity','weekly_weight'].includes(r.kind)) fail('不正な記録が含まれています。');
    validDate(r.date);
    for (const key of [...NUTRIENTS, 'steps', 'active_kcal', 'basal_kcal', 'weight_kg']) if (r[key] !== undefined && r[key] !== null && (typeof r[key] !== 'number' || !Number.isFinite(r[key]) || r[key] < 0)) fail('記録内の数値を確認してください。');
    const existing = map.get(r.record_id);
    const stamp = value => value?.updated_at || value?.recorded_at || value?.fetched_at || '';
    if (!existing || stamp(r) > stamp(existing)) map.set(r.record_id, r);
  }
  return [...map.values()];
}
