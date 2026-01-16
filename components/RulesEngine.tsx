import React, { useState, useEffect, useRef } from 'react';
import { BudgetRule, Category, RecurringItem, UserSettings } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { Plus, Trash2, Tag, Repeat, Clock, Workflow, Zap, Info, Cpu, Calendar, CreditCard } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface RulesEngineProps {
  rules: BudgetRule[];
  highlightRuleId?: string | null;
  onClearHighlight?: () => void;
  recurringItems: RecurringItem[];
  settings: UserSettings;
  onAddRule: (rule: Omit<BudgetRule, 'id'>) => void;
  onDeleteRule: (id: string) => void;
  onDeleteRecurring: (id: string) => void;
  onAddRecurringClick?: () => void;
}

const RecurringSwipeableItem: React.FC<{
    item: RecurringItem;
    currencySymbol: string;
    onDelete: (id: string) => void;
}> = ({ item, currencySymbol, onDelete }) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const touchStartX = useRef<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isDeleting) return;
        if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
        const diff = e.touches[0].clientX - touchStartX.current;
        if (diff < 0) setOffsetX(diff);
    };
    const handleTouchEnd = () => {
        if (isDeleting) return;
        if (offsetX < -75) { 
            triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); 
        }
        else setOffsetX(0);
        setIsSwiping(false);
        touchStartX.current = null;
    };

    return (
        <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'} animate-slide-up mb-1`}>
            <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-5 rounded-2xl"><Trash2 className="text-white" size={16} /></div>
            <div 
                className={`relative z-10 px-4 py-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl transition-transform`} 
                style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: CATEGORY_COLORS[item.category] }}>
                            <Repeat size={14} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-tight leading-none mb-1">{item.merchant || item.note}</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{item.frequency}</span>
                                <span className="text-[7px] text-slate-300 font-black">•</span>
                                <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1"><Calendar size={8} /> Next: {item.nextDueDate}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="font-black text-[13px] text-slate-900 dark:text-white">{currencySymbol}{Math.round(item.amount).toLocaleString()}</p>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{item.category}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const RulesEngine: React.FC<RulesEngineProps> = ({ rules, highlightRuleId, onClearHighlight, recurringItems, settings, onAddRule, onDeleteRule, onDeleteRecurring, onAddRecurringClick }) => {
  const [activeTab, setActiveTab] = useState<'mapping' | 'recurring'>('mapping');
  const [isAdding, setIsAdding] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<Category>('Needs');
  
  const currencySymbol = getCurrencySymbol(settings.currency);

  useEffect(() => {
    if (highlightRuleId) {
      setActiveTab('mapping');
      const timer = setTimeout(() => { if (onClearHighlight) onClearHighlight(); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightRuleId, onClearHighlight]);

  const handleAdd = () => {
    if (!keyword) return;
    onAddRule({ keyword, category });
    setKeyword(''); setIsAdding(false);
  };

  const sectionClass = `glass premium-card p-3 rounded-2xl mb-1 relative overflow-hidden shadow-sm`;

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-1 mx-1 shadow-md h-[55px] flex items-center justify-between">
        <div>
          <h1 className="text-[14px] font-black text-white uppercase leading-none tracking-tight">Rules Engine</h1>
          <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Automation Center</p>
        </div>
        {activeTab === 'mapping' ? (
          <button onClick={() => { triggerHaptic(); setIsAdding(true); }} className="p-2 bg-white/10 rounded-xl text-white active:scale-95"><Plus size={16} strokeWidth={3} /></button>
        ) : (
          <button onClick={() => { triggerHaptic(); onAddRecurringClick?.(); }} className="p-2 bg-white/10 rounded-xl text-white active:scale-95"><Plus size={16} strokeWidth={3} /></button>
        )}
      </div>

      <div className="flex glass p-1 rounded-2xl mb-2 mx-1 border-white/10 shadow-sm h-[48px] items-center">
        <button onClick={() => setActiveTab('mapping')} className={`flex-1 h-full py-1 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === 'mapping' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Semantic Map</button>
        <button onClick={() => setActiveTab('recurring')} className={`flex-1 h-full py-1 text-[9px] font-black uppercase rounded-xl transition-all ${activeTab === 'recurring' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>Scheduled</button>
      </div>

      <div className="px-1 space-y-1">
        {activeTab === 'mapping' && (
          <>
            {isAdding && (
              <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 shadow-xl space-y-4 mb-3 animate-kick">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Detection Keyword</p>
                   <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. Netflix, Uber..." className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-[11px] font-black outline-none border border-slate-100 dark:border-slate-700 dark:text-white" />
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Target</p>
                  <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                    {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                      <button key={cat} onClick={() => setCategory(cat)} className={`flex-1 py-2 text-[8px] font-black uppercase rounded-lg transition-all ${category === cat ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setIsAdding(false)} className="flex-1 text-[9px] font-black uppercase p-4 text-slate-400">Cancel</button>
                  <button onClick={handleAdd} className="flex-[2] bg-brand-primary text-white rounded-2xl py-4 text-[9px] font-black uppercase shadow-lg shadow-blue-200 dark:shadow-none">Authorize Rule</button>
                </div>
              </div>
            )}
            {rules.map(rule => (
              <div key={rule.id} className={`${sectionClass} flex items-center justify-between group ${highlightRuleId === rule.id ? 'border-emerald-500 animate-pulse bg-emerald-50/10' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-300">
                    <Tag size={14} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-tight tracking-tight uppercase">{rule.keyword}</h4>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 block">{rule.category}</span>
                  </div>
                </div>
                <button onClick={() => { triggerHaptic(20); onDeleteRule(rule.id); }} className="p-2 text-slate-200 hover:text-rose-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
              </div>
            ))}
            {rules.length === 0 && !isAdding && (
               <div className="flex flex-col items-center justify-center py-32 opacity-20">
                 <Workflow size={40} />
                 <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-4">Zero Logic Nodes</p>
               </div>
            )}
          </>
        )}
        {activeTab === 'recurring' && (
           <div className="space-y-1">
              {recurringItems.map(item => (
                  <RecurringSwipeableItem key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteRecurring} />
              ))}
              {recurringItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-40 opacity-20">
                    <Clock size={40} />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] mt-4">No Schedules Provisioned</p>
                </div>
              )}
           </div>
        )}
      </div>
    </div>
  );
};

export default RulesEngine;