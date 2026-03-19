import type { StatName } from '../types/wfrp';

export const PROFESSIONS_DB = {
  rat_catcher: {
    name: "Крысолов",
    tiers: [
      { 
        level: 1, 
        name: "Истребитель", 
        attributes: ['WS', 'S', 'T', 'I', 'WP'] as StatName[],
        skills: ["Athletics", "Melee (Basic)", "Ranged (Sling)", "Stealth"]
      }
      // ... следующие тиры
    ]
  }
};
