const valid = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const show = value => value.toLocaleString('ja-JP', { maximumFractionDigits: 1 });
const complete = day => !!day?.summary && !(day.summary.status === 'calculated_from_recorded_meals' && day.summary.day_coverage === 'partial_recorded');
const dateBefore = date => new Date(new Date(date + 'T12:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);

// These thresholds drive encouragement only; they do not set nutrition goals.
export function positiveFoodFeedback(day, targets, options = {}) {
  const result = { daily: {}, meals: {} };
  if (options.enabled === false || !day) return result;
  const tolerance = options.calorie_tolerance_ratio ?? .1;
  if (valid(day.steps) && day.steps >= (options.steps_min ?? 5000)) result.daily.steps = { label: '5000歩以上歩いた', message: `${show(day.steps)}歩を記録したのじゃ！ こつこつ歩いたおぬし、よく頑張ったのう♪${day.activityStatus === 'possibly_incomplete' ? ' 取得途中の値じゃよ。' : ''}` };
  if (!day.hasFood) return result;
  if (complete(day) && valid(day.kcal) && valid(targets?.daily_kcal) && targets.daily_kcal > 0 && Math.abs(day.kcal / targets.daily_kcal - 1) <= tolerance + 1e-9) result.daily.kcal = { label: 'カロリーが目標候補の範囲内', message: `この日は${show(day.kcal)} kcal。目標候補の前後${Math.round(tolerance * 100)}%に収まったのじゃ♪` };
  if (options.protein_daily_target_reached !== false && valid(day.protein_g) && valid(targets?.protein_g) && targets.protein_g > 0 && day.protein_g >= targets.protein_g) result.daily.protein_g = { label: '一日のたんぱく質目標候補に到達', message: `たんぱく質の記録が一日の目標候補${show(targets.protein_g)} gに届いたのじゃ♪${complete(day) ? '' : ' まだ記録の途中じゃよ。'}` };
  for (const type of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const entries = (day.meals || []).filter(record => record.meal === type && !record.deleted_at);
    if (!entries.length || !entries.every(record => valid(record.protein_g) && valid(record.kcal))) continue;
    const protein = entries.reduce((sum, record) => sum + record.protein_g, 0), kcal = entries.reduce((sum, record) => sum + record.kcal, 0);
    const ratio = kcal > 0 ? protein * 4 / kcal : null;
    if (ratio !== null && ratio >= (options.meal_protein_energy_min_ratio ?? .2) - 1e-9 && ratio <= 1 + 1e-9) result.meals[type] = { protein_g: { label: 'たんぱく質由来のカロリーが20%以上', message: `この食事はカロリーの${show(ratio * 100)}%がたんぱく質由来じゃ！ 上手に組み合わせたのう♪`, protein_energy_percent: ratio * 100 } };
  }
  return result;
}

export function comfortFoodFeedback(day, targets, options = {}) {
  const result = {};
  if (options.comfort_enabled === false || (options.comfort_enabled === undefined && options.enabled === false) || !complete(day)) return result;
  const tolerance = options.excess_tolerance_ratio ?? .1;
  for (const [key, targetKey, label, unit] of [['kcal', 'daily_kcal', 'カロリー', 'kcal'], ['fat_g', 'fat_g', '脂質', 'g']]) {
    if (valid(day[key]) && valid(targets?.[targetKey]) && targets[targetKey] > 0 && day[key] > targets[targetKey] * (1 + tolerance) + 1e-9) result[key] = { mood: 'sad', label: `${label}が目標候補より多め`, message: `${label}は${show(day[key])} ${unit}で、目標候補より多めじゃな。こんな日もあるぞ。おぬしを責めたりせぬ。次もいつものペースで、一緒に続けようの。` };
  }
  return result;
}

export function habitFeedback(records, date, options = {}) {
  if (options.enabled === false || !date) return [];
  const dates = [...new Set(records.filter(r => !r.deleted_at && ['meal', 'daily_summary'].includes(r.kind) && r.date <= date).map(r => r.date))].sort();
  if (!dates.includes(date)) return [];
  let streak = 0;
  for (let d = date; dates.includes(d); d = dateBefore(d)) streak++;
  const result = [], milestones = options.record_streak_days ?? [3, 7];
  if (milestones.includes(streak) || (streak > 7 && streak % (options.weekly_streak_interval_days ?? 7) === 0)) result.push({ key: 'streak', text: `${streak}日つづいたぞ`, label: '食事の記録を継続', message: `${streak}日続けて食事を記録できたのじゃ！ こつこつ続けるおぬしを、わらわは見ておるぞ♪` });
  const previous = dates.filter(d => d < date).at(-1);
  if (options.record_resumption !== false && previous && previous < dateBefore(date)) result.push({ key: 'resumed', text: 'また会えたのじゃ', label: '食事の記録を再開', message: 'また記録してくれて嬉しいのじゃ♪ お休みしても、こうして戻ってきてくれたことが嬉しいぞ。' });
  const meals = records.filter(r => !r.deleted_at && r.kind === 'meal' && r.date === date);
  if (options.three_meals_recorded !== false && ['breakfast', 'lunch', 'dinner'].every(type => meals.some(r => r.meal === type))) result.push({ key: 'three-meals', text: '朝昼晩を記録', label: '朝昼晩の食事を記録', message: '朝・昼・晩のお話を聞かせてくれたのじゃ！ 記録を残せたこと、わらわは嬉しいぞ♪' });
  return result;
}

export function weightFeedback(weight, options = {}) {
  if (options.enabled === false || options.weekly_weight_recorded === false || !weight || weight.deleted_at || !valid(weight.weight_kg) || weight.weight_kg <= 0) return null;
  return { label: '週の体重を記録', message: '今週の体重を教えてくれてありがとうなのじゃ♪ 増えた週も減った週も、一緒に見守っていこうぞ。' };
}

export function characterFeedback(day, targets, options = {}) {
  const neutral = (message, detail) => ({ mood: 'neutral', message, detail });
  const comfort = Object.values(comfortFoodFeedback(day, targets, options));
  if (comfort.length) return { mood: 'sad', message: 'ちと多めの日じゃったな。そばにおるぞ。', detail: comfort.map(note => note.message).join(' ') };
  const notes = positiveFoodFeedback(day, targets, options);
  if (notes.daily.kcal || notes.daily.steps) return { mood: 'happy', message: 'よいところ、見つけたのじゃ♪', detail: [notes.daily.kcal?.message, notes.daily.steps?.message].filter(Boolean).join(' ') };
  if (!day?.hasFood) return neutral('今日は、どんな一日じゃった？', 'おぬしのお話、わらわは待っておるぞ。');
  if (complete(day) && valid(day.kcal) && valid(targets?.daily_kcal) && day.kcal < targets.daily_kcal * .9) return neutral('今日は、目標候補より少なめじゃな。', '食事の量や記録の抜けも、ゆっくり見直してみようぞ。わらわも一緒じゃ。');
  if (notes.daily.protein_g || Object.keys(notes.meals).length) return { mood: 'happy', message: 'たんぱく質を意識できたのじゃな♪', detail: notes.daily.protein_g?.message || Object.values(notes.meals)[0].protein_g.message };
  return neutral('記録してくれて、嬉しいのじゃ。', '分からぬところや途中の記録で、良し悪しを決めたりせぬぞ。おぬしのペースで続けようの。');
}
