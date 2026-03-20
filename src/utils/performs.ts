import type { Character, StatName } from '../types/wfrp';

export const performTest = (
  char: Character, 
  statKey: StatName, 
  modifier: number = 0,
  forcedRoll?: number // Добавляем этот параметр
) => {
  
  const stat = char.stats[statKey];
  
  const target = stat.base + stat.advances + modifier;
  
  // Если forcedRoll передан, используем его, иначе генерим случайное
  const roll = forcedRoll !== undefined ? forcedRoll : Math.floor(Math.random() * 100) + 1;
  
  const sl = Math.floor(target / 10) - Math.floor(roll / 10);
  const isSuccess = roll <= target || roll === 1;

  return {
    roll,
    target,
    sl: isSuccess && sl < 0 ? 0 : sl,
    isSuccess,
    isCritical: (roll % 11 === 0 && isSuccess) || roll === 1,
    isFumble: (roll % 11 === 0 && !isSuccess) || roll >= 96
  };
};