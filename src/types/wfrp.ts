export type StatName = 'WS' | 'BS' | 'S' | 'T' | 'I' | 'Ag' | 'Dex' | 'Int' | 'WP' | 'Fel';

export interface Item {
  id: string;
  name: string;
  encumbrance: number;
  quantity: number;
  description?: string;
  type: 'trappings' | 'weapon' | 'armour' | 'grimoire';
}

export interface ProfessionTier {
  level: 1 | 2 | 3 | 4;
  name: string;
  attributes: StatName[]; // Какие статы можно качать на этом уровне
  skills: string[];      // Список доступных навыков
  items: string[];       // Что нужно иметь для этого уровня
}

export interface Character {
  id?: number;
  name: string;
  currentWounds: number; // Текущее здоровье
  species: 'Human' | 'Elf' | 'Dwarf' | 'Halfling';
  career: string;
  careerTier: 1 | 2 | 3 | 4;
  stats: Record<StatName, {base: number, advances: number}>;
  advances: Record<StatName, number>; // Сколько раз прокачали стат
  advantage: number;
  skills: Skill[];
  inventory: Item[];
  xp: {
    total: number;
    spent: number;
  };
  currentProfession: {
    id: string;
    tier: 1 | 2 | 3 | 4;
  };
  conditions: Condition[];
}

export interface Skill {
  name: string;
  stat: StatName;
  advances: number;
  isGroup?: boolean;
}

export interface Condition {
  name: string;
  value: number; // Например, Кровотечение 3
}
