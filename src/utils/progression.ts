import type { Character, StatName, ProfessionTier } from '../types/wfrp';

export const getAdvanceCost = (current: number, type: 'stat' | 'skill'): number => {
  // Упрощенная таблица стоимости по правилам 4-й редакции
  if (current < 5) return type === 'stat' ? 10 : 10;
  if (current < 10) return type === 'stat' ? 15 : 15;
  if (current < 15) return type === 'stat' ? 20 : 20;
  return 30; // и так далее по прогрессии
};

// Функция для "покупки" улучшения
export const canAdvance = (char: Character, key: StatName, tier: ProfessionTier): boolean => {
  return tier.attributes.includes(key); // Можно качать только статы текущей профессии
};