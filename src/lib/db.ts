import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Character } from '../types/wfrp';

export class MyDatabase extends Dexie {
  characters!: Table<Character>; 

  constructor() {
    super('WFRP_DB');
    this.version(1).stores({
      characters: '++id, name, career' // Индексируем для быстрого поиска
    });
  }
}

export const db = new MyDatabase();
