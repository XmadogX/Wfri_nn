import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { StatName, Character } from "../types/wfrp";
import { performTest } from "../utils/performs";

// --- БИБЛИОТЕКИ ---
const WEAPON_LIBRARY = [
  { name: 'Меч (Ручное)', damage: 'SB + 4', skill: 'Рукопашная (Базовая)', traits: ['Защитное'] },
  { name: 'Кинжал', damage: 'SB + 2', skill: 'Рукопашная (Базовая)', traits: ['Быстрое', 'Короткое'] },
  { name: 'Топор', damage: 'SB + 4', skill: 'Рукопашная (Базовая)', traits: ['Разрушительное'] },
  { name: 'Двуручный меч', damage: 'SB + 6', skill: 'Рукопашная (Двуручное)', traits: ['Ударное', 'Громоздкое'] },
  { name: 'Рапира', damage: 'SB + 3', skill: 'Рукопашная (Фехтование)', traits: ['Точное'] },
  { name: 'Лук (Обычный)', damage: 'SB + 3', skill: 'Дальнее (Лук)', traits: ['Пробивающее'] },
  { name: 'Арбалет', damage: 'SB + 4', skill: 'Дальнее (Арбалет)', traits: ['Бронебойное'] },
  { name: 'Мушкет', damage: 'SB + 9', skill: 'Дальнее (Пороховое)', traits: ['Бронебойное', 'Громогласное'] }
];

const ALL_SKILLS_LIBRARY = [
  { name: 'Атлетика', stat: 'Ag' }, { name: 'Восприятие', stat: 'I' },
  { name: 'Уклонение', stat: 'Ag' }, { name: 'Хладнокровие', stat: 'WP' },
  { name: 'Стойкость', stat: 'T' }, { name: 'Рукопашная (Базовая)', stat: 'WS' }
];

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const getAdvanceCost = (current: number, isStat: boolean) => {
  const next = current + 1;
  if (isStat) {
    if (next <= 5) return 25; if (next <= 10) return 30;
    if (next <= 15) return 40; return 60;
  }
  if (next <= 5) return 10; if (next <= 10) return 15;
  if (next <= 15) return 20; return 30;
};

const getHitLocation = (roll: number) => {
  const s = roll.toString().padStart(2, '0').split('').reverse().join('');
  const rev = parseInt(s);
  if (rev <= 10) return "Голова";
  if (rev <= 20) return "Л. Рука";
  if (rev <= 30) return "П. Рука";
  if (rev <= 70) return "Корпус";
  if (rev <= 80) return "Л. Нога";
  return "П. Нога";
};

export const CharacterSheet = ({ charId }: { charId: number }) => {
  const char = useLiveQuery(() => db.characters.get(charId)) as Character | undefined;
  
  const [isCombat, setIsCombat] = useState(false);
  const [manualRoll, setManualRoll] = useState("");
  const [testResult, setTestResult] = useState<{ msg: string, detail?: string, crit?: boolean, fumble?: boolean, damage: string } | null>(null);
  const [skillSearch, setSkillSearch] = useState("");
  const [showWepModal, setShowWepModal] = useState(false);
  const [wepSearch, setWepSearch] = useState("");
  const [showXpModal, setShowXpModal] = useState(false);
  const [combatSkillSearch, setCombatSkillSearch] = useState("");

  if (!char) return <div className="p-10 text-center animate-pulse font-serif text-stone-500 italic">Связь с архивами...</div>;

  // Данные из БД
  const skills = char.skills || [];
  const inventory = char.inventory || [];
  const conditions = char.conditions || {};
  const advantage = char.advantage || 0;
  const favoriteSkills = char.favoriteSkills || [];
  

  // Расчеты
  const getBonus = (val: number) => Math.floor(val / 10);
  const sb = getBonus(char.stats.S.base + char.stats.S.advances);
  const tb = getBonus(char.stats.T.base + char.stats.T.advances);
  const maxWounds = (tb * 2) + sb + getBonus(char.stats.WP.base + char.stats.WP.advances);
  const currentWounds = char.currentWounds ?? maxWounds;
  const maxEnc = sb + tb;
  const currentEnc = inventory.reduce((acc, item) => acc + (item.encumbrance || 0), 0);

  // --- ЛОГИКА ТЕСТА ---
  const onTest = (key: string, baseStat: StatName, skillAdv: number = 0, isWeapon: boolean = false, weaponDmg: string = "0") => {
    const rollValue = manualRoll ? parseInt(manualRoll) : Math.floor(Math.random() * 100) + 1;
    const res = performTest(char, baseStat, skillAdv, rollValue);
    
    let finalSl = res.sl;
    let finalTarget = res.target;

    // Модификатор преимущества в бою
    if (isCombat && (baseStat === 'WS' || baseStat === 'BS')) {
      finalTarget += (advantage * 10);
      finalSl += advantage;
    }
    console.log(sb, weaponDmg, parseInt(weaponDmg.replace(/SB\s*\+\s*/, "")) || 0, finalSl);
    
    const damage = isWeapon ? `Зона: ${getHitLocation(res.roll)} | Урон: ${(sb + (parseInt(weaponDmg.replace(/SB\s*\+\s*/, "")) || 0) + finalSl)}` : '';

    setTestResult({
      msg: `${key}: ${res.roll} vs ${finalTarget} | СУ: ${finalSl}`,
      detail: res.isCritical ? "💥 КРИТИЧЕСКИЙ УСПЕХ!" : res.isFumble ? "💀 КРИТИЧЕСКИЙ ПРОВАЛ!" : res.isSuccess ? "🟢 УСПЕХ" : "🔴 НЕУДАЧА",
      crit: res.isCritical,
      fumble: res.isFumble,
      damage
    });
    setManualRoll("");
  };

  // --- ФУНКЦИИ ОБНОВЛЕНИЯ ---
  const updateXP = async (amount: number) => {
    const newTotal = Math.max(char.xp.spent, char.xp.total + amount);
    await db.characters.update(charId, { "xp.total": newTotal });
  };

  const handleAdvance = async (type: 'stat' | 'skill', key: string) => {
    const currentAdv = type === 'stat' ? char.stats[key as StatName].advances : skills.find(s => s.name === key)?.advances || 0;
    const cost = getAdvanceCost(currentAdv, type === 'stat');
    if (char.xp.total - char.xp.spent < cost) return alert("Недостаточно XP!");

    if (type === 'stat') {
      await db.characters.update(charId, { [`stats.${key}.advances`]: currentAdv + 1, "xp.spent": char.xp.spent + cost });
    } else {
      const newSkills = skills.map(s => s.name === key ? { ...s, advances: s.advances + 1 } : s);
      await db.characters.update(charId, { skills: newSkills, "xp.spent": char.xp.spent + cost });
    }
  };

  const toggleFavoriteSkill = async (name: string) => {
    const newFavs = favoriteSkills.includes(name) ? favoriteSkills.filter(n => n !== name) : [...favoriteSkills, name];
    await db.characters.update(charId, { favoriteSkills: newFavs });
  };

  const toggleCond = async (n: string, d: number) => {
    const next = Math.max(0, (conditions[n] || 0) + d);
    const newC = { ...conditions };
    if (next === 0) delete newC[n]; else newC[n] = next;
    await db.characters.update(charId, { conditions: newC });
  };

  return (
    <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-500 ${isCombat ? 'bg-slate-950 text-red-50' : 'bg-stone-100 text-slate-900'}`}>
      
      {/* HEADER */}
      <div className="p-4 border-b border-red-900/20 bg-inherit z-20 flex justify-between items-center shadow-xl shrink-0">
        <div onClick={() => setShowXpModal(true)} className="cursor-pointer active:opacity-50">
          <h2 className="text-lg font-serif font-bold uppercase leading-none">{char.name}</h2>
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">XP: {char.xp.total - char.xp.spent}</span>
        </div>
        <button onClick={() => setIsCombat(!isCombat)} className={`px-8 py-2.5 rounded-full font-black text-[10px] uppercase shadow-lg transition-all ${isCombat ? 'bg-red-700 text-white animate-pulse' : 'bg-slate-800 text-white'}`}>
          {isCombat ? '⚔️ В БОЮ' : '📜 В МИРЕ'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-48">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT: STATS */}
          <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-1 gap-2">
            {Object.entries(char.stats).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-slate-700/20 shadow-sm group">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black opacity-30 uppercase tracking-widest">{key}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-mono font-bold">{val.base + val.advances}</span>
                    {val.advances > 0 && <span className="text-[10px] text-green-600 font-bold">+{val.advances}</span>}
                  </div>
                </div>
                <div className="flex gap-2  transition-opacity">
                  <button onClick={() => handleAdvance('stat', key)} className="bg-green-900/20 text-green-600 p-2 rounded-lg text-xs font-bold">+</button>
                  <button onClick={() => onTest(key, key as StatName)} className="bg-red-900 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-110 transition-transform">🎲</button>
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT: MAIN CONTENT */}
          <div className="md:col-span-8 space-y-4">
            {isCombat ? (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                {/* WOUNDS & ADVANTAGE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-red-900/10 p-4 rounded-3xl border border-red-900/30">
                    <div className="flex justify-between items-end mb-2 text-[10px] font-black uppercase text-red-500">
                      <span>Ранения</span>
                      <span className="font-mono text-xl">{currentWounds}/{maxWounds}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div className="bg-red-700 h-full transition-all" style={{ width: `${(currentWounds / maxWounds) * 100}%` }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => db.characters.update(charId, { currentWounds: Math.max(0, currentWounds - 1) })} className="flex-1 bg-red-900/30 py-2 rounded-xl border border-red-900/40">-1</button>
                      <button onClick={() => db.characters.update(charId, { currentWounds: Math.min(maxWounds, currentWounds + 1) })} className="flex-1 bg-green-900/20 py-2 rounded-xl border border-green-900/40">+1</button>
                    </div>
                  </div>
                  <div className="bg-amber-900/10 p-4 rounded-3xl border border-amber-900/30 flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase text-amber-600 leading-none mb-1 tracking-tighter">Преимущество</span>
                      <span className="text-4xl font-mono font-bold text-amber-500 leading-none">{advantage}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => db.characters.update(charId, { advantage: Math.max(0, advantage - 1) })} className="w-10 h-10 bg-slate-800 rounded-full font-bold border border-slate-700">-</button>
                      <button onClick={() => db.characters.update(charId, { advantage: advantage + 1 })} className="w-10 h-10 bg-amber-600 text-white rounded-full font-bold shadow-lg shadow-amber-900/40">+</button>
                    </div>
                  </div>
                </div>

                {/* COMBAT SKILLS */}
                <div className="bg-slate-900/40 p-4 rounded-3xl border border-red-900/20 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black uppercase text-red-500 italic tracking-widest">Навыки боя</h3>
                    <input 
                      type="text" placeholder="🔍 Найти..." 
                      className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-[10px] w-24 outline-none focus:border-red-900 transition-all"
                      value={combatSkillSearch} onChange={(e) => setCombatSkillSearch(e.target.value)}
                    />
                  </div>
                  {combatSkillSearch && (
                    <div className="bg-slate-900 border border-red-900/30 rounded-xl overflow-hidden shadow-2xl">
                      {skills.filter(s => s.name.toLowerCase().includes(combatSkillSearch.toLowerCase())).map(s => (
                        <button key={s.name} onClick={() => { toggleFavoriteSkill(s.name); setCombatSkillSearch(""); }} className="w-full text-left p-3 text-[11px] border-b border-white/5 hover:bg-red-900/20 font-bold">
                          {s.name} {favoriteSkills.includes(s.name) ? '✅' : '➕'}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {skills.filter(s => favoriteSkills.includes(s.name)).map((s, i) => {
                      const total = char.stats[s.stat as StatName].base + char.stats[s.stat as StatName].advances + s.advances;
                      return (
                        <div key={i} className="relative group">
                          <button onClick={() => onTest(s.name, s.stat as StatName, s.advances)} className="w-full flex justify-between items-center p-3 bg-slate-900 border border-red-900/10 rounded-xl active:scale-95 transition-all">
                            <div className="text-left truncate mr-2">
                              <p className="text-[10px] font-bold text-red-50 truncate leading-tight">{s.name}</p>
                              <p className="text-[7px] uppercase font-black text-red-900">{s.stat}</p>
                            </div>
                            <span className="font-mono font-black text-amber-500 text-lg">{total}</span>
                          </button>
                          <button onClick={() => toggleFavoriteSkill(s.name)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-md  transition-opacity">×</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* WEAPONS */}
                <div className="space-y-2">
                  <div className="flex justify-between px-2 items-center">
                    <h3 className="text-[10px] font-black uppercase text-red-500 tracking-widest italic opacity-40">Арсенал</h3>
                    <button onClick={() => setShowWepModal(true)} className="text-[10px] font-bold uppercase underline text-amber-600">+ Снарядить</button>
                  </div>
                  {inventory.filter(i => i.type === 'weapon').map((w: any) => (
                    <div key={w.id} className="bg-white/5 border border-red-900/20 p-4 rounded-3xl flex justify-between items-center shadow-lg group hover:bg-white/10 transition-all">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-red-50 italic underline leading-none">{w.name}</span>
                        <span className="text-[10px] text-red-400 font-bold uppercase mt-1.5 tracking-tighter">Урон: {w.damage}</span>
                        <div className="flex gap-1 mt-1">
                          {w.traits?.map((t: string) => <span key={t} className="text-[7px] bg-red-900/40 text-red-200 px-1.5 py-0.5 rounded uppercase font-black">{t}</span>)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => db.characters.update(charId, { inventory: inventory.filter(i => i.id !== w.id) })} className=" p-2 text-xs transition-opacity hover:text-red-500">🗑️</button>
                        <button onClick={() => onTest(w.name, 'WS', 0, true, w.damage)} className="bg-red-800 text-white px-6 py-2.5 rounded-2xl font-black text-[10px] shadow-md uppercase active:scale-95 transition-transform tracking-widest border border-red-600/50">Удар</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONDITIONS */}
                <div className="space-y-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
                    {['Кровотечение', 'Оглушение', 'Усталость', 'Горение', 'Шок'].map(c => (
                      <button key={c} onClick={() => toggleCond(c, 1)} className="shrink-0 bg-slate-800 text-[8px] font-black px-4 py-2 rounded-full uppercase border border-slate-700 active:bg-red-800 shadow-md">+ {c}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(conditions).map(([n, v]) => (
                      <div key={n} className="flex justify-between items-center bg-red-900/20 p-2 rounded-xl border border-red-900/40 animate-in zoom-in">
                        <span className="text-[9px] font-bold uppercase ml-2 text-red-200">{n}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleCond(n, -1)} className="font-bold text-lg px-2">－</button>
                          <span className="font-mono font-bold text-xl">{v as number}</span>
                          <button onClick={() => toggleCond(n, 1)} className="font-bold text-lg px-2">＋</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* EXPLORATION MODE (SKILLS & INVENTORY) */
              <div className="space-y-4 animate-in slide-in-from-left duration-300">
                <input 
                  type="text" placeholder="Поиск навыка..." 
                  className="w-full p-4 rounded-3xl bg-white border border-stone-300 shadow-inner text-sm outline-none focus:border-amber-600 transition-all"
                  value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)}
                />
                <div className="space-y-1">
                  {skills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).map((s, i) => {
                    const total = char.stats[s.stat as StatName].base + char.stats[s.stat as StatName].advances + s.advances;
                    const cost = getAdvanceCost(s.advances, false);
                    return (
                      <div key={i} className="flex justify-between items-center p-3 bg-white rounded-2xl border border-stone-200 hover:border-amber-400 transition-all shadow-sm group">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-slate-700 leading-tight">{s.name}</span>
                          <span className="text-[8px] uppercase opacity-40 font-black tracking-tighter">{s.stat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right leading-none mr-1">
                            <span className="text-[8px] block opacity-30 font-bold mb-0.5">+{s.advances}</span>
                            <span className="font-mono font-bold text-lg">{total}</span>
                          </div>
                          <button onClick={() => handleAdvance('skill', s.name)} className="bg-amber-100 text-amber-700 px-3 py-1 rounded-xl flex flex-col items-center shadow-sm active:scale-90 transition-transform">
                            <span className="font-bold text-xs leading-none">+</span>
                            <span className="text-[7px] font-black uppercase tracking-tighter">{cost}</span>
                          </button>
                          <button onClick={() => onTest(s.name, s.stat as StatName, s.advances)} className="bg-slate-800 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg active:rotate-12 transition-transform">🎲</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* INVENTORY */}
                <div className="pt-6 border-t-2 border-stone-200">
                  <div className="flex justify-between items-center px-2 mb-3">
                    <span className="text-[10px] font-black uppercase text-stone-500 tracking-widest italic">Сумка</span>
                    <span className={`text-[10px] font-black uppercase ${currentEnc > maxEnc ? 'text-red-600' : 'text-stone-400'}`}>Вес: {currentEnc} / {maxEnc}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {inventory.map((item, i) => (
                      <div key={item.id || i} className="flex justify-between items-center p-3.5 bg-stone-200/50 rounded-2xl border border-stone-300/30 group">
                        <span className="font-medium text-slate-800 italic text-xs">{item.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] opacity-40 font-bold uppercase tracking-tighter">Вес: {item.encumbrance}</span>
                          <button onClick={() => db.characters.update(charId, { inventory: inventory.filter(inv => inv.id !== item.id) })} className=" text-red-800/40 hover:text-red-800 transition-all text-xs">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ROLL / RESULT */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-sm z-50 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          {testResult && (
            <div 
              onClick={() => setTestResult(null)} 
              className={`p-4 rounded-3xl shadow-2xl border-2 animate-in slide-in-from-bottom-6 cursor-pointer text-center ${testResult.crit ? 'bg-green-600 border-green-400' : testResult.fumble ? 'bg-red-800 border-red-600' : 'bg-amber-600 border-amber-400'} text-white shadow-black/40`}
            >
              <div className="text-[11px] font-black uppercase tracking-widest mb-1 leading-tight">{testResult.msg}</div>
              <div className="text-black text-[10px] font-black mt-1 bg-white/20 rounded-lg py-1 shadow-inner uppercase tracking-wider">{testResult.detail}</div>
              {testResult.damage && <div className="text-[11px] font-black uppercase tracking-widest mb-1 leading-tight">{testResult.damage}</div>}
              <div className="text-[8px] mt-2 opacity-50 uppercase font-black italic tracking-widest">Закрыть</div>
            </div>
          )}
          <input 
            type="number" placeholder="БРОСОК КУБОВ (1-100)..." 
            className="w-full p-5 rounded-[2.5rem] bg-white/95 border-2 border-amber-600 shadow-2xl outline-none text-slate-900 font-bold text-center placeholder:text-[10px] placeholder:font-black focus:border-amber-700 transition-all focus:scale-105 font-mono text-xl"
            value={manualRoll} onChange={(e) => setManualRoll(e.target.value)} 
          />
        </div>
      </div>

      {/* XP MODAL */}
      {showXpModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-stone-100 p-8 rounded-[3rem] w-full max-w-xs border-t-8 border-amber-600 shadow-2xl text-center">
            <div className="text-4xl font-mono font-bold text-amber-700 mb-1">{char.xp.total - char.xp.spent}</div>
            <div className="text-[10px] font-black uppercase text-stone-400 tracking-widest mb-8">Осталось опыта</div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[10, 25, 50, 100].map(v => (
                <button key={`plus-${v}`} onClick={() => updateXP(v)} className="bg-amber-600/10 border border-amber-600/30 p-4 rounded-2xl font-bold text-amber-700 active:bg-amber-600 active:text-white transition-all hover:scale-105">+{v}</button>
              ))}
              {[10, 25, 50, 100].map(v => (
                <button key={`minus-${v}`} onClick={() => updateXP(-v)} className="bg-red-600/10 border border-red-600/30 p-4 rounded-2xl font-bold text-red-700 active:bg-red-600 active:text-white transition-all hover:scale-105">-{v}</button>
              ))}
            </div>
            <button onClick={() => setShowXpModal(false)} className="w-full text-xs font-black uppercase text-stone-400 py-3 border-t border-stone-200 tracking-[0.2em] hover:text-stone-600">Закрыть</button>
          </div>
        </div>
      )}

      {/* WEAPON MODAL */}
      {showWepModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in slide-in-from-bottom-10 duration-300">
          <div className="bg-stone-100 p-6 rounded-[2.5rem] w-full max-w-sm border-t-8 border-red-800 shadow-2xl flex flex-col max-h-[85vh]">
            <h3 className="text-xl font-serif font-bold mb-4 uppercase text-slate-800 text-center tracking-tighter italic underline decoration-red-800 decoration-4">Арсенал Империи</h3>
            <input 
              className="w-full p-4 bg-white rounded-2xl border border-stone-300 outline-none mb-4 text-sm shadow-inner" 
              placeholder="Поиск в кузнице..." value={wepSearch} onChange={(e) => setWepSearch(e.target.value)} 
            />
            <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 no-scrollbar">
              {WEAPON_LIBRARY.filter(w => w.name.toLowerCase().includes(wepSearch.toLowerCase())).map(w => (
                <button key={w.name} onClick={() => {
                  db.characters.update(charId, { inventory: [...inventory, { ...w, id: Date.now().toString(), type: 'weapon', quantity: 1, encumbrance: 1 }] });
                  setShowWepModal(false);
                }} className="w-full text-left p-4 bg-white border border-stone-200 rounded-2xl hover:border-red-500 active:bg-red-50 transition-all flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm leading-tight text-slate-800 group-hover:text-red-700 transition-colors">{w.name}</span>
                    <span className="text-[10px] text-red-600 font-bold uppercase mt-1 tracking-widest">{w.damage}</span>
                  </div>
                  <span className="text-xl opacity-20 group-hover:opacity-100 transition-all">➕</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowWepModal(false)} className="w-full text-xs font-black uppercase text-stone-400 py-3 tracking-widest border-t border-stone-200">Закрыть</button>
          </div>
        </div>
      )}
    </div>
  );
};
