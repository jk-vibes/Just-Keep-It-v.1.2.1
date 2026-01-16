import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Expense, Income, Category, UserSettings, WealthItem, Notification, BudgetRule } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Trash2, Search, X, Sparkles, Loader2, Edit2, 
  Banknote, History, Zap, ArrowRightLeft,
  ArrowDownCircle, ArrowUpCircle, Wifi, Smartphone, 
  Shield, HeartPulse, ShoppingBag, Coffee, 
  Trophy, TrendingUp, Home, Car, Utensils, Plane,
  Gift, Dumbbell, ChevronLeft, ChevronRight,
  Briefcase, Scissors, Building2, PiggyBank,
  BookOpen, Construction, FilterX,
  BrainCircuit, ChevronRight as ChevronRightIcon,
  Fingerprint, LayoutList, BarChart3,
  TrendingDown, Activity, Wand2,
  Check, CheckCircle2, ListChecks, Square, CheckSquare,
  Tag, CheckCircle,
  CreditCard, Coins, Star, Heart, Receipt,
  Wallet, Copy, AlertTriangle, Layers,
  FileSpreadsheet, Save, ArrowRight
} from 'lucide-react';
import { auditTransaction, refineBatchTransactions } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface LedgerProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  rules?: BudgetRule[];
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onConfirm: (id: string, category: Category) => void;
  onUpdateExpense: (id: string, updates: Partial<Expense>) => void;
  onEditRecord: (record: Expense | Income | WealthItem) => void;
  onAddBulk: (items: any[]) => void;
  onViewRule?: (ruleId: string) => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  addNotification: (notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => void;
}

const getCategoryIcon = (category: string, subCategory?: string, type?: string) => {
  const sc = subCategory?.toLowerCase() || '';
  const c = category.toLowerCase();
  if (sc === 'bill payment') return <CreditCard size={14} />;
  if (sc === 'transfer') return <ArrowRightLeft size={14} />;
  if (sc.includes('rent') || sc.includes('home')) return <Home size={14} />;
  if (sc.includes('fuel') || sc.includes('transport') || sc.includes('car')) return <Car size={14} />;
  if (sc.includes('grocer') || sc.includes('market')) return <ShoppingBag size={14} />;
  if (sc.includes('util') || sc.includes('electricity')) return <Zap size={14} />;
  if (sc.includes('health') || sc.includes('med')) return <HeartPulse size={14} />;
  if (sc.includes('internet') || sc.includes('wifi')) return <Wifi size={14} />;
  if (sc.includes('mobile') || sc.includes('phone')) return <Smartphone size={14} />;
  if (sc.includes('din') || sc.includes('zomato') || sc.includes('swiggy')) return <Utensils size={14} />;
  if (sc.includes('travel') || sc.includes('trip')) return <Plane size={14} />;
  if (sc.includes('ent') || sc.includes('prime')) return <Activity size={14} />;
  if (sc.includes('sip') || sc.includes('invest')) return <TrendingUp size={14} />;
  if (type === 'Salary') return <Banknote size={14} />;
  if (type === 'Freelance') return <Briefcase size={14} />;
  if (c === 'needs') return <Shield size={14} />;
  if (c === 'wants') return <Star size={14} />;
  if (c === 'savings') return <Trophy size={14} />;
  return <Sparkles size={14} />;
};

const SwipeableItem: React.FC<{
  item: any;
  recordType: 'expense' | 'income' | 'transfer' | 'bill_payment';
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: any) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  isSelectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  aiSuggestion?: { category: Category; subCategory: string; merchant: string };
  isDuplicate?: boolean;
}> = ({ item, recordType, currencySymbol, onDelete, onEdit, onUpdateExpense, isSelectionMode, isSelected, onToggleSelect, aiSuggestion: initialAiSuggestion, isDuplicate }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localAiSuggestion, setLocalAiSuggestion] = useState<any | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting || isSelectionMode) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0 || isSelectionMode) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting || isSelectionMode) return;
    if (offsetX < -75) { triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const handleItemAudit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isAuditing || recordType !== 'expense') return;
    triggerHaptic();
    setIsAuditing(true);
    try {
      const result = await auditTransaction(item, currencySymbol);
      if (result) {
        setLocalAiSuggestion({
          category: result.suggestedCategory,
          subCategory: result.suggestedSubCategory,
          merchant: item.merchant
        });
      }
    } catch (err) {
      console.error("Neural scan failed", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const activeAiSuggestion = localAiSuggestion || initialAiSuggestion;

  const applyAuditCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    if (activeAiSuggestion && onUpdateExpense) {
      onUpdateExpense(item.id, { 
        category: activeAiSuggestion.category as Category, 
        subCategory: activeAiSuggestion.subCategory, 
        merchant: activeAiSuggestion.merchant,
        isAIUpgraded: true, 
        isConfirmed: true 
      });
      setLocalAiSuggestion(null);
    }
  };

  const amount = item.amount || 0;
  const parentCategory = recordType === 'expense' ? item.category : 'Uncategorized';
  const themeColor = recordType === 'income' ? '#10b981' : (recordType === 'transfer' || recordType === 'bill_payment') ? '#6366f1' : CATEGORY_COLORS[parentCategory as Category] || '#94a3b8';

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[300px] opacity-100'} animate-slide-up`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-6">
        <Trash2 className="text-white" size={16} />
      </div>
      
      <div 
        onClick={() => isSelectionMode ? onToggleSelect(item.id) : (triggerHaptic(), onEdit({ ...item, recordType }))}
        className={`relative z-10 px-2 py-2 border-b border-slate-50 dark:border-slate-800/40 bg-white dark:bg-slate-950 transition-all active:bg-slate-50 cursor-pointer flex flex-col gap-1`} 
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-2.5">
          {isSelectionMode && (
            <div className={`shrink-0 transition-all ${isSelected ? 'text-brand-primary' : 'text-slate-300'}`}>
              {isSelected ? <CheckSquare size={16} fill="currentColor" className="text-white dark:text-slate-950" /> : <Square size={16} />}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-2 overflow-hidden">
                <div className="w-9 h-9 flex items-center justify-center shrink-0 rounded-xl mt-0.5 p-2" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                  {getCategoryIcon(parentCategory, item.subCategory, recordType === 'income' ? item.type : undefined)}
                </div>
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-tight">
                      {recordType === 'income' ? item.type : item.subCategory || item.category}
                    </h4>
                    {item.ruleId && <Zap size={7} className="text-emerald-500 fill-emerald-500" />}
                    {item.isAIUpgraded && <Sparkles size={7} className="text-indigo-400" />}
                    {isDuplicate && <AlertTriangle size={7} className="text-amber-500" />}
                    {recordType === 'expense' && !item.isConfirmed && !activeAiSuggestion && (
                      <button 
                        onClick={handleItemAudit} 
                        disabled={isAuditing}
                        className="text-indigo-400 hover:text-indigo-600 transition-colors p-0.5 active:scale-90"
                        title="Neural Audit"
                      >
                        {isAuditing ? <Loader2 size={8} className="animate-spin" /> : <BrainCircuit size={8} />}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[6px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 rounded truncate max-w-[90px]">
                      {item.merchant || 'General'}
                    </span>
                    <span className="text-[6px] text-slate-300 font-black">•</span>
                    <p className="text-[6px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
              <p className={`font-black text-[13px] tracking-tight ${recordType === 'income' ? 'text-emerald-500' : (recordType === 'transfer' || recordType === 'bill_payment') ? 'text-indigo-500' : 'text-slate-900 dark:text-white'}`}>
                {recordType === 'income' ? '+' : '-'}{currencySymbol}{Math.round(amount).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {activeAiSuggestion && (
          <div className="mt-1 p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 animate-kick flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Audit Recommendation</p>
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-black text-slate-700 dark:text-slate-200 uppercase">{activeAiSuggestion.category}</span>
                <ArrowRight size={8} className="text-slate-300" />
                <span className="text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase">{activeAiSuggestion.subCategory}</span>
              </div>
            </div>
            <button onClick={applyAuditCategory} className="px-2 py-1 rounded bg-indigo-600 text-white text-[7px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-transform">Confirm</button>
          </div>
        )}
        {isDuplicate && (
          <div className="mt-1 p-1 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-100 dark:border-amber-900/30 flex items-center gap-1">
             <AlertTriangle size={8} className="text-amber-500" />
             <p className="text-[7px] font-black text-amber-700 dark:text-amber-400 uppercase">Duplicate Detected (Redundant Signature)</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Ledger: React.FC<LedgerProps> = ({ 
  expenses, incomes, wealthItems, settings, rules = [], onDeleteExpense, onDeleteIncome, onEditRecord, onAddBulk, viewDate, onMonthChange, onUpdateExpense
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'transfer' | 'bill_payment'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'compare'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefining, setIsRefining] = useState(false);
  const [batchSuggestions, setBatchSuggestions] = useState<Record<string, any>>({});
  const [duplicateIds, setDuplicateIds] = useState<Set<string>>(new Set());
  const [isShowingAISuggestionsOnly, setIsShowingAISuggestionsOnly] = useState(false);
  
  const currencySymbol = getCurrencySymbol(settings.currency);
  const monthLabel = `${viewDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()} '${viewDate.getFullYear().toString().slice(-2)}`;

  const totals = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const exps = expenses.filter(e => !['Transfer', 'Bill Payment'].includes(e.subCategory || '') && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).reduce((s, e) => s + e.amount, 0);
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).reduce((s, i) => s + i.amount, 0);
    return { incs, exps };
  }, [expenses, incomes, viewDate]);

  const compareData = [
    { name: 'In', amount: totals.incs, color: '#10b981' },
    { name: 'Out', amount: totals.exps, color: '#f43f5e' }
  ];

  const filteredRecords = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const q = searchQuery.toLowerCase().trim();
    
    const exps = expenses.filter(e => !['Transfer', 'Bill Payment'].includes(e.subCategory || '') && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'expense' as const }));
    const incs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y).map(i => ({ ...i, recordType: 'income' as const }));
    const transfers = expenses.filter(e => e.subCategory === 'Transfer' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'transfer' as const }));
    const billPayments = expenses.filter(e => e.subCategory === 'Bill Payment' && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y).map(e => ({ ...e, recordType: 'bill_payment' as const }));
    
    let list: any[] = [];
    if (isShowingAISuggestionsOnly) {
      list = [...exps, ...incs, ...transfers, ...billPayments].filter(e => !!batchSuggestions[e.id] || duplicateIds.has(e.id));
    } else {
      if (filterType === 'all') list = [...exps, ...incs, ...transfers, ...billPayments];
      else if (filterType === 'expense') list = exps;
      else if (filterType === 'income') list = incs;
      else if (filterType === 'transfer') list = transfers;
      else if (filterType === 'bill_payment') list = billPayments;
    }
    
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (!q) return list;
    return list.filter(rec => (rec.merchant || '').toLowerCase().includes(q) || (rec.category || '').toLowerCase().includes(q) || (rec.subCategory || '').toLowerCase().includes(q) || (rec.note || '').toLowerCase().includes(q));
  }, [filterType, expenses, incomes, viewDate, searchQuery, isShowingAISuggestionsOnly, batchSuggestions, duplicateIds]);

  const handleBatchRefine = async () => {
    triggerHaptic();
    setIsRefining(true);
    const allRecords = filteredRecords;
    const collisions = new Set<string>();
    const seen = new Map<string, string>();
    allRecords.forEach(r => {
       const key = `${r.amount}_${(r.merchant || r.note || '').toLowerCase().trim()}_${r.date}`;
       if (seen.has(key)) { collisions.add(r.id); collisions.add(seen.get(key)!); }
       else seen.set(key, r.id);
    });
    setDuplicateIds(collisions);
    const candidates = filteredRecords.filter(r => r.recordType === 'expense' && (r.category === 'Uncategorized' || !r.isConfirmed));
    try {
      if (candidates.length > 0) {
        const payload = candidates.map(c => ({ id: c.id, amount: c.amount, merchant: c.merchant || 'General', note: c.note || '' }));
        const suggestions = await refineBatchTransactions(payload);
        const newMap = { ...batchSuggestions };
        suggestions.forEach(s => { newMap[s.id] = s; });
        setBatchSuggestions(newMap);
      }
      setIsShowingAISuggestionsOnly(true);
    } catch (e) {
      setIsShowingAISuggestionsOnly(true);
    } finally { setIsRefining(false); }
  };

  const handleApplyAllSuggestions = () => {
    triggerHaptic(30);
    Object.keys(batchSuggestions).forEach(id => {
      const s = batchSuggestions[id];
      onUpdateExpense(id, { category: s.category, subCategory: s.subCategory, merchant: s.merchant, isAIUpgraded: true, isConfirmed: true });
    });
    setIsShowingAISuggestionsOnly(false);
    setBatchSuggestions({});
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-2 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xs font-black text-white uppercase leading-none tracking-tight">Ledger</h1>
          <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Registry Protocol</p>
        </div>
        
        {/* Header-based icons requested: AI icon and chart icon */}
        <div className="flex items-center gap-1">
           <button onClick={handleBatchRefine} disabled={isRefining} className={`p-2 rounded-xl transition-all active:scale-95 ${isShowingAISuggestionsOnly ? 'bg-white text-indigo-600' : 'bg-white/10 text-white'}`}>
                {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} strokeWidth={2.5} />}
           </button>
           <button onClick={() => { triggerHaptic(); setViewMode(viewMode === 'list' ? 'compare' : 'list'); }} className={`p-2 rounded-xl transition-all active:scale-95 ${viewMode === 'compare' ? 'bg-white text-indigo-600' : 'bg-white/10 text-white'}`}>
             {viewMode === 'list' ? <BarChart3 size={16} /> : <LayoutList size={16} />}
          </button>
        </div>
      </div>

      {isSearchOpen && (
        <div className="mx-0.5 mb-2 animate-kick relative z-20 flex justify-end">
          <div className="glass premium-card p-1.5 rounded-2xl flex items-center gap-2 shadow-lg border-brand-primary/20 max-w-[240px]">
            <Search size={10} className="text-slate-400 ml-1" />
            <input 
              autoFocus 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registry..." 
              className="flex-1 bg-transparent border-none outline-none text-[10px] font-bold dark:text-white placeholder:text-slate-400"
            />
            <button onClick={() => { setSearchQuery(''); setIsSearchOpen(false); triggerHaptic(); }} className="p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-transform">
              <X size={10} />
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION BAR - RIGHT PANE Tight implementation */}
      <div className="flex items-center justify-between glass p-1 rounded-xl mb-1 mx-0.5 border-white/10 shadow-sm h-[42px]">
        {/* Month Navigation - Kept on left */}
        <div className="flex items-center gap-1 h-full px-1">
          <button onClick={() => (triggerHaptic(), onMonthChange(-1))} className="p-1 text-slate-400 active:scale-90"><ChevronLeft size={16} strokeWidth={3} /></button>
          <h2 className="text-[9px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest min-w-[55px] text-center">{monthLabel}</h2>
          <button onClick={() => (triggerHaptic(), onMonthChange(1))} className="p-1 text-slate-400 active:scale-90"><ChevronRight size={16} strokeWidth={3} /></button>
        </div>

        {/* Right Pane: Search, Selection, and Filters - NO PADDING, NO GROUPING, TIGHT GAP */}
        <div className="flex items-center gap-0.5 flex-none h-full">
           <button onClick={() => { triggerHaptic(); setIsSearchOpen(!isSearchOpen); }} className={`p-1.5 transition-all active:scale-95 ${isSearchOpen ? 'text-indigo-600' : 'text-slate-400'}`}>
             <Search size={16} strokeWidth={2.5} />
           </button>
           <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={`p-1.5 transition-all active:scale-95 ${isSelectionMode ? 'text-brand-primary' : 'text-slate-400'}`}>
             <ListChecks size={16} strokeWidth={2.5} />
           </button>
           
           <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
           
           <button onClick={() => { triggerHaptic(); setFilterType('expense'); }} className={`p-1.5 transition-all ${filterType === 'expense' ? 'text-rose-500' : 'text-slate-400'}`}><ArrowDownCircle size={16} /></button>
           <button onClick={() => { triggerHaptic(); setFilterType('income'); }} className={`p-1.5 transition-all ${filterType === 'income' ? 'text-emerald-500' : 'text-slate-400'}`}><ArrowUpCircle size={16} /></button>
           <button onClick={() => { triggerHaptic(); setFilterType('transfer'); }} className={`p-1.5 transition-all ${filterType === 'transfer' ? 'text-indigo-500' : 'text-slate-400'}`}><ArrowRightLeft size={16} /></button>
           <button onClick={() => { triggerHaptic(); setFilterType('bill_payment'); }} className={`p-1.5 transition-all ${filterType === 'bill_payment' ? 'text-blue-600' : 'text-slate-400'}`}><CreditCard size={16} /></button>
           <button onClick={() => { triggerHaptic(); setFilterType('all'); setIsShowingAISuggestionsOnly(false); setSearchQuery(''); }} className={`p-1.5 transition-all ${filterType === 'all' && !isShowingAISuggestionsOnly && !searchQuery ? 'text-slate-900 dark:text-white' : 'text-slate-300'}`}><FilterX size={16} /></button>
        </div>
      </div>

      <div className="px-0.5">
        {isShowingAISuggestionsOnly && Object.keys(batchSuggestions).length > 0 && (
          <div className="mb-2 p-3 bg-indigo-600 rounded-2xl flex items-center justify-between shadow-lg animate-kick">
            <div className="flex items-center gap-2">
              <Sparkles className="text-white" size={16} />
              <p className="text-[9px] font-black text-white uppercase tracking-widest">Found {Object.keys(batchSuggestions).length} Smart Matches</p>
            </div>
            <button 
              onClick={handleApplyAllSuggestions}
              className="bg-white text-indigo-700 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-transform flex items-center gap-1.5"
            >
              <Check size={12} strokeWidth={4} /> Authorize All
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[20px] overflow-hidden shadow-sm min-h-[300px]">
          {viewMode === 'list' ? (
            filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <FilterX size={24} className="text-slate-200 mb-2" />
                <p className="text-slate-300 dark:text-slate-700 font-black text-[8px] uppercase tracking-[0.4em]">Registry Clear</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {filteredRecords.map((rec) => (
                  <SwipeableItem 
                    key={rec.id} 
                    item={rec} 
                    recordType={rec.recordType} 
                    currencySymbol={currencySymbol} 
                    onDelete={rec.recordType === 'income' ? onDeleteIncome : onDeleteExpense} 
                    onEdit={onEditRecord} 
                    onUpdateExpense={onUpdateExpense}
                    isSelectionMode={isSelectionMode}
                    isSelected={selectedIds.has(rec.id)}
                    onToggleSelect={handleToggleSelect}
                    aiSuggestion={batchSuggestions[rec.id]}
                    isDuplicate={duplicateIds.has(rec.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="p-4 animate-slide-up space-y-4">
               <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase mb-1">Inflow</p>
                    <h3 className="text-sm font-black text-emerald-500">{currencySymbol}{totals.incs.toLocaleString()}</h3>
                  </div>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/40">
                    <p className="text-[7px] font-black text-rose-600 dark:text-rose-400 uppercase mb-1">Outflow</p>
                    <h3 className="text-sm font-black text-rose-500">{currencySymbol}{totals.exps.toLocaleString()}</h3>
                  </div>
               </div>
               <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px' }} />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={40}>
                        {compareData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Ledger;