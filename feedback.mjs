// Visual feedback against the user's saved target candidates; not a health assessment.
export function characterFeedback(day, targets, options = {}) {
  const neutral = (message, detail) => ({ mood: 'neutral', message, detail });
  if (!day?.hasFood) return neutral('今日は、どんな一日かな？', '記録を待っています。');
  if (!day.summary) return neutral('記録してくれて、ありがとう。', '日合計がまだ分からないので、良し悪しは判定しません。');
  if (typeof day.kcal !== 'number' || typeof targets?.daily_kcal !== 'number' || targets.daily_kcal <= 0) return neutral('少しずつ、記録をつなげよう。', 'カロリーか比較目標が不明です。');
  const tolerance = options.calorie_tolerance_ratio ?? .1;
  const ratio = day.kcal / targets.daily_kcal;
  if (ratio < 1 - tolerance) return { mood: 'sad', message: '今日は、目標より少なめみたい。', detail: '食事も記録も、自分のペースで。また一緒に続けよう。' };
  if (ratio > 1 + tolerance) return { mood: 'sad', message: '今日は、目標を少し超えたみたい。', detail: 'こんな日もあります。次の記録も、一緒に続けていきましょう。' };
  if (typeof day.protein_g !== 'number' || typeof targets.protein_g !== 'number') return neutral('カロリーは目標に近いね。', 'たんぱく質が不明なので、バランスの判定はお休みです。');
  if (day.protein_g < targets.protein_g * (options.protein_minimum_target_ratio ?? .9)) return { mood: 'sad', message: 'たんぱく質は、目標より少なめだね。', detail: '今日の記録を、次の一日のヒントにしていきましょう。' };
  for (const key of ['fat_g','carbohydrate_g']) if (typeof day[key] === 'number' && typeof targets[key] === 'number' && day[key] > targets[key] * (1+tolerance)) return { mood: 'sad', message: '目標とのバランスを、見直してみよう。', detail: `${key === 'fat_g' ? '脂質' : '炭水化物'}が目標候補より多めです。ひとつずつ、整えていきましょう。` };
  return { mood: 'happy', message: '目標に近いバランス！いい感じだね！', detail: 'こつこつ続けるあなたを、応援しています。' };
}
