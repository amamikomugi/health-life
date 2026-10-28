// Visual feedback against the user's saved target candidates; not a health assessment.
export function characterFeedback(day, targets, options = {}) {
  const neutral = (message, detail) => ({ mood: 'neutral', message, detail });
  if (!day?.hasFood) return neutral('今日は、どんな一日じゃった？', 'おぬしのお話、わらわは待っておるぞ。');
  if (!day.summary) return neutral('記録してくれて、嬉しいのじゃ。', '一日の合計はまだ分からぬのじゃ。そろってから、一緒にふりかえろうぞ。');
  if (day.summary.status === 'calculated_from_recorded_meals' && day.summary.day_coverage === 'partial_recorded') return neutral('記録してくれて、嬉しいのじゃ。', 'まだ一部の食事の記録じゃな。一日のふりかえりは、そろってからにするぞ。');
  if (typeof day.kcal !== 'number' || typeof targets?.daily_kcal !== 'number' || targets.daily_kcal <= 0) return neutral('少しずつ、記録をつなぐのじゃ。', 'カロリーか比較する目標が、まだ分からぬのじゃ。');
  const tolerance = options.calorie_tolerance_ratio ?? .1;
  const ratio = day.kcal / targets.daily_kcal;
  if (ratio < 1 - tolerance) return { mood: 'sad', message: '今日は、目標より少なめじゃな。', detail: 'しょぼん…。食事も記録も、おぬしのペースで。またわらわと一緒に続けるのじゃ。' };
  if (ratio > 1 + tolerance) return { mood: 'sad', message: 'ちと、目標を越えたようじゃな。', detail: 'こんな日もあるのじゃ。わらわとゆっくり、ふりかえってみようぞ。' };
  if (typeof day.protein_g !== 'number' || typeof targets.protein_g !== 'number') return neutral('カロリーは目標に近いのじゃ。', 'たんぱく質はまだ分からぬので、バランスのふりかえりはお休みじゃ。');
  if (day.protein_g < targets.protein_g * (options.protein_minimum_target_ratio ?? .9)) return { mood: 'sad', message: 'たんぱく質は、目標より少なめじゃな。', detail: '今日の記録を、次の一日のヒントにするのじゃ。わらわも一緒に考えるぞ。' };
  for (const key of ['fat_g','carbohydrate_g']) if (typeof day[key] === 'number' && typeof targets[key] === 'number' && day[key] > targets[key] * (1+tolerance)) return { mood: 'sad', message: '目標とのバランスを、見てみるのじゃ。', detail: `${key === 'fat_g' ? '脂質' : '炭水化物'}が目標候補より多めじゃな。ひとつずつ、一緒に整えていこうぞ。` };
  return { mood: 'happy', message: 'いい調子じゃ！ わらわも嬉しいぞ♪', detail: '目標に近いバランスじゃな。こつこつ続けるおぬしを、わらわは応援しておるぞ！' };
}
