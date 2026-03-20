import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { CharacterSheet } from './components/CharacterSheet';
import type { Character, StatName } from './types/wfrp';
import { STATS_TRANSLATE } from './data/stats';

// Константы для создания
const STAT_LIST: StatName[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];
const INITIAL_SKILLS = [
  { "name": "Азартные игры", "stat": "Int", "advances": 0 },
  { "name": "Атлетика", "stat": "Ag", "advances": 0 },
  { "name": "Ближний бой (Базовый)", "stat": "WS", "advances": 0 },
  { "name": "Верховая езда", "stat": "Ag", "advances": 0 },
  { "name": "Вождение", "stat": "Ag", "advances": 0 },
  { "name": "Восприятие", "stat": "I", "advances": 0 },
  { "name": "Выживание", "stat": "Int", "advances": 0 },
  { "name": "Гребля", "stat": "S", "advances": 0 },
  { "name": "Запугивание", "stat": "S", "advances": 0 },
  { "name": "Интуиция", "stat": "I", "advances": 0 },
  { "name": "Кутеж", "stat": "T", "advances": 0 },
  { "name": "Лазание", "stat": "S", "advances": 0 },
  { "name": "Лидерство", "stat": "Fel", "advances": 0 },
  { "name": "Навигация", "stat": "I", "advances": 0 },
  { "name": "Обаяние", "stat": "Fel", "advances": 0 },
  { "name": "Обман", "stat": "Fel", "advances": 0 },
  { "name": "Плавание", "stat": "S", "advances": 0 },
  { "name": "Подкуп", "stat": "Fel", "advances": 0 },
  { "name": "Развлечение", "stat": "Fel", "advances": 0 },
  { "name": "Скрытность", "stat": "Ag", "advances": 0 },
  { "name": "Торговля", "stat": "Fel", "advances": 0 },
  { "name": "Уворот", "stat": "Ag", "advances": 0 },
  { "name": "Уклонение", "stat": "WP", "advances": 0 },
  { "name": "Усмирение животных", "stat": "Int", "advances": 0 },
  { "name": "Хладнокровие", "stat": "T", "advances": 0 },
]

const ADVANCED_SKILLS = [
  { "name": "Артистизм", "stat": "Dex", "advances": 0 },
  { "name": "Взлом", "stat": "Dex", "advances": 0 },
  { "name": "Дрессировка", "stat": "Int", "advances": 0 },
  { "name": "Знание (группа)", "stat": "Int", "advances": 0 },
  { "name": "Искусство (группа)", "stat": "Dex", "advances": 0 },
  { "name": "Исцеление", "stat": "Int", "advances": 0 },
  { "name": "Ловкость рук", "stat": "Dex", "advances": 0 },
  { "name": "Молитва", "stat": "Fel", "advances": 0 },
  { "name": "Морское дело", "stat": "Ag", "advances": 0 },
  { "name": "Настройка", "stat": "WP", "advances": 0 },
  { "name": "Ориентирование", "stat": "I", "advances": 0 },
  { "name": "Оценка", "stat": "Int", "advances": 0 },
  { "name": "Плавание (парус)", "stat": "Ag", "advances": 0 },
  { "name": "Постановка ловушек", "stat": "Dex", "advances": 0 },
  { "name": "Ремесло (группа)", "stat": "Dex", "advances": 0 },
  { "name": "Следопыт", "stat": "I", "advances": 0 },
  { "name": "Стрельба (группа)", "stat": "BS", "advances": 0 },
  { "name": "Тайный знак (группа)", "stat": "Int", "advances": 0 },
  { "name": "Торговля (группа)", "stat": "Int", "advances": 0 },
  { "name": "Фокусы", "stat": "Dex", "advances": 0 },
  { "name": "Химия", "stat": "Int", "advances": 0 },
  { "name": "Язык (группа)", "stat": "Int", "advances": 0 },
  { "name": "Язык магии", "stat": "Int", "advances": 0 }
]


const STARTER_CAREERS = [
  { id: 'rat_catcher', name: 'Крысолов' },
  { id: 'slayer', name: 'Убийца' },
  { id: 'wizard', name: 'Маг' },
  { id: 'guard', name: 'Стражник' }
];

// --- Компонент Предохранитель (Error Boundary) ---
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <h2 className="text-2xl font-serif mb-4 text-red-500 font-bold uppercase tracking-widest">Ошибка данных</h2>
          <p className="text-sm text-slate-400 mb-8 max-w-xs">Вероятно, структура персонажа в базе устарела. Нажмите кнопку ниже, чтобы очистить базу и починить приложение.</p>
          <button 
            onClick={() => { db.delete().then(() => window.location.reload()); }}
            className="bg-red-800 px-8 py-3 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95"
          >
            Сбросить всё и исправить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [activeCharId, setActiveCharId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedRace, setSelectedRace] = useState('Human');
  const [selectedCareer, setSelectedCareer] = useState(STARTER_CAREERS[0]);
  const [manualStats, setManualStats] = useState<Record<StatName, number>>(
    STAT_LIST.reduce((acc, stat) => ({ ...acc, [stat]: 30 }), {} as Record<StatName, number>)
  );

  const characters = useLiveQuery(() => db.characters.toArray());

  useEffect(() => {
    if (characters?.length && !activeCharId && !isCreating) {
      setActiveCharId(characters[0].id!);
    }
  }, [characters, activeCharId, isCreating]);

  const handleSaveCharacter = async () => {
    if (!newName.trim()) return alert("Введите имя!");
    
    // ГАРАНТИРУЕМ ПОЛНУЮ СТРУКТУРУ ОБЪЕКТА
    const newChar: Character = {
      name: newName,
      species: selectedRace as any,
      currentProfession: { id: selectedCareer.id, tier: 1 },
      xp: { total: 500, spent: 0 },
      advantage: 0,
      stats: STAT_LIST.reduce((acc, stat) => ({
        ...acc, 
        [stat]: { base: manualStats[stat], advances: 0 }
      }), {} as any),
      skills: [...INITIAL_SKILLS],
      inventory: [
        { id: 'cloth1', name: 'Обычная одежда', encumbrance: 0, quantity: 1, type: 'trappings' as any },
        { id: 'wep1', name: 'Кинжал', encumbrance: 0, quantity: 1, type: 'weapon' as any, damage: 'SB + 2' }
      ],
      conditions: {},
      currentWounds: undefined // Рассчитается в CharacterSheet
    };

    try {
      const id = await db.characters.add(newChar);
      setActiveCharId(id as number);
      setIsCreating(false);
      setNewName('');
    } catch (err) {
      console.error(err);
      alert("Ошибка при сохранении в базу!");
    }
  };

  if (isCreating) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <div className="bg-stone-100 p-4 sm:p-8 rounded-2xl shadow-2xl w-full max-w-2xl border-t-8 border-amber-700 my-4 animate-in zoom-in duration-300">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-center mb-6 uppercase tracking-widest text-slate-800">Новый Герой</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <input className="w-full p-4 border-2 border-stone-300 rounded-2xl text-lg outline-none focus:border-amber-600 bg-white" placeholder="Имя..." value={newName} onChange={e => setNewName(e.target.value)} />
              <select className="w-full p-4 border-2 border-stone-300 rounded-2xl bg-white font-bold" value={selectedRace} onChange={e => setSelectedRace(e.target.value)}>
                <option value="Human">Человек</option>
                <option value="Dwarf">Гном</option>
                <option value="Elf">Эльф</option>
                <option value="Halfling">Полурослик</option>
              </select>
              <select className="w-full p-4 border-2 border-stone-300 rounded-2xl bg-white font-bold" value={selectedCareer.id} onChange={e => setSelectedCareer(STARTER_CAREERS.find(c => c.id === e.target.value)!)}>
                {STARTER_CAREERS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="bg-stone-200 p-4 rounded-2xl shadow-inner border border-stone-300">
              <p className="text-[10px] font-black text-center mb-3 text-stone-500 uppercase tracking-widest leading-none">Характеристики</p>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-2 gap-2">
                {STAT_LIST.map(stat => (
                  <div key={stat} className="bg-white p-2 rounded-xl border border-stone-300 flex flex-col items-center shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 leading-none mb-1">{STATS_TRANSLATE[stat] || stat}</span>
                    <input type="number" className="w-full text-center font-bold text-amber-900 text-lg bg-transparent outline-none" value={manualStats[stat]} onChange={e => setManualStats({...manualStats, [stat]: parseInt(e.target.value) || 0})} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <button onClick={handleSaveCharacter} className="w-full bg-amber-800 text-white font-black py-4 rounded-3xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm">Создать</button>
            <button onClick={() => setIsCreating(false)} className="w-full py-2 text-stone-400 text-[10px] font-black uppercase tracking-widest">Отмена</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-300 flex flex-col overflow-hidden">
        {activeCharId ? (
          <>
            <header className="bg-slate-950 text-white p-3 flex justify-between items-center shadow-2xl px-4 shrink-0 border-b border-amber-900/30">
              <div className="flex items-center gap-3">
                <span className="text-xl">⚔️</span>
                <select 
                  className="bg-slate-900 text-amber-500 font-serif italic text-sm border-none outline-none cursor-pointer focus:ring-0 p-1"
                  value={activeCharId}
                  onChange={(e) => setActiveCharId(Number(e.target.value))}
                >
                  {characters?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsCreating(true)} className="text-[10px] font-black uppercase bg-amber-600/20 text-amber-500 border border-amber-600/30 px-3 py-1.5 rounded-full">+ ГЕРОЙ</button>
                <button onClick={() => { if(confirm('Удалить всех?')) { db.characters.clear(); setActiveCharId(null); } }} className="text-red-500/60 p-1.5 active:scale-125 transition-transform font-bold tracking-widest text-sm uppercase">🗑️</button>
              </div>
            </header>
            
            <main className="flex-1 overflow-hidden flex flex-col">
              <CharacterSheet charId={activeCharId} />
            </main>
          </>
        ) : (
          <div className="h-screen flex flex-col items-center justify-center bg-stone-950 text-white p-6">
            <div className="text-8xl mb-8 opacity-50 filter drop-shadow-[0_0_15px_rgba(185,28,28,0.3)]">🏰</div>
            <button onClick={() => setIsCreating(true)} className="bg-red-800 px-12 py-5 rounded-full font-black text-xl shadow-2xl active:scale-90 transition-all border-b-4 border-red-950">СОЗДАТЬ ПЕРСОНАЖА</button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
