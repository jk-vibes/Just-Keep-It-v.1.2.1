import React, { useMemo, useState, useRef } from 'react';
import { WealthItem, UserSettings, Expense, Income, WealthCategory } from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowRightLeft,
  Wallet, PiggyBank, Briefcase, Trash2,
  TrendingUp, Coins, Home, Receipt, 
  ArrowUpCircle, ArrowDownCircle,
  BarChart3,
  // Fix: Added Activity to lucide-react imports
  Activity
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AccountsProps {
  wealthItems: WealthItem[];
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
  onUpdateWealth: (id: string, updates: Partial<WealthItem>) => void;
  onDeleteWealth: (id: string) => void;
  onAddWealth: (item: Omit<WealthItem, 'id'>) => void;
  onEditAccount: (account: WealthItem) => void;
  onAddAccountClick: () => void;
  onAddIncomeClick?: () => void;
  onAddTransferClick?: () => void;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const getCategoryIcon = (category: WealthCategory) => {
  switch (category) {
    case 'Savings': return <PiggyBank size={12} />;
    case 'Pension': return <Briefcase size={12} />;
    case 'Gold': return <Coins size={12} />;
    case 'Investment': return <TrendingUp size={12} />;
    case 'Credit Card': return <CreditCard size={12} />;
    case 'Home Loan': return <Home size={12} />;
    case 'Personal Loan': return <Receipt size={12} />;
    default: return <Landmark size={12} />;
  }
};

const CompactAccountCard: React.FC<{
  item: WealthItem;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: WealthItem) => void;
}> = ({ item, currencySymbol, onDelete, onEdit }) => {
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
    if (offsetX < -50) { 
      if (window.confirm(`Decommission ${item.alias || item.name}?`)) {
        triggerHaptic(30); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); 
      } else { setOffsetX(0); }
    } else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 rounded-xl mb-1.5 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[80px] opacity-100'}`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-3">
        <Trash2 className="text-white" size={12} />
      </div>
      <div 
        onClick={() => { triggerHaptic(); onEdit(item); }}
        className="relative z-10 py-2 px-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800 transition-all rounded-xl shadow-sm cursor-pointer group"
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
               <div className={`${item.type === 'Liability' ? 'text-rose-500' : 'text-indigo-500'}`}>
                 {getCategoryIcon(item.category)}
               </div>
               <h4 className="font-bold text-slate-800 dark:text-slate-200 text-[9px] truncate uppercase tracking-tight">{item.alias || item.name}</h4>
            </div>
            <Edit3 size={8} className="text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />
          </div>
          <p className={`text-[11px] font-black tracking-tighter ${item.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
            {currencySymbol}{Math.round(item.value).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, settings, onDeleteWealth, onEditAccount, onAddAccountClick, onAddTransferClick
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const stats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    return { 
      totalAssets: Math.round(assets),
      totalLiabilities: Math.round(liabilities),
      netWorth: Math.round(assets - liabilities) 
    };
  }, [wealthItems]);

  const groupedAccounts = useMemo(() => {
    const groups: Record<WealthCategory, WealthItem[]> = {} as any;
    wealthItems.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [wealthItems]);

  const assetCategories: WealthCategory[] = ['Savings', 'Pension', 'Gold', 'Investment', 'Cash', 'Other'];
  const liabilityCategories: WealthCategory[] = ['Credit Card', 'Personal Loan', 'Home Loan', 'Overdraft', 'Other'];

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-3 rounded-xl mb-1 mx-0.5 shadow-md h-[55px] flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-xs font-black text-white uppercase leading-none tracking-tight">Accounts</h1>
          <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Wealth Protocol</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddTransferClick} className="p-2 bg-white/10 rounded-xl text-white active:scale-95 transition-all"><ArrowRightLeft size={16} /></button>
          <button onClick={onAddAccountClick} className="p-2 bg-white/20 rounded-xl text-white active:scale-95 transition-all"><Plus size={16} strokeWidth={4} /></button>
        </div>
      </div>

      <div className="px-1 space-y-1.5">
        {/* Net Worth Dashboard Card */}
        <section className="glass premium-card p-3 rounded-[24px] shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-center relative z-10">
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Equity</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-30 mr-1 font-bold">{currencySymbol}</span>
                {stats.netWorth.toLocaleString()}
              </h2>
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-brand-primary rounded-xl">
               <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-slate-800 pt-3">
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-lg"><ArrowUpCircle size={12} /></div>
                <div className="min-w-0">
                  <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Asset Base</p>
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">{currencySymbol}{stats.totalAssets.toLocaleString()}</p>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-lg"><ArrowDownCircle size={12} /></div>
                <div className="min-w-0">
                  <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Liability Load</p>
                  <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">{currencySymbol}{stats.totalLiabilities.toLocaleString()}</p>
                </div>
             </div>
          </div>
        </section>

        {/* SIDE-BY-SIDE GRID SYSTEM */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          
          {/* CAPITAL ASSETS COLUMN */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  Capital
               </h3>
               <BarChart3 size={10} className="text-slate-300" />
            </div>
            
            <div className="space-y-3">
              {assetCategories.map(cat => (
                groupedAccounts[cat] && groupedAccounts[cat].length > 0 && (
                  <div key={cat} className="animate-kick">
                    <div className="flex justify-between items-center mb-1 px-1 opacity-60">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                      <span className="text-[7px] font-bold text-slate-400">{currencySymbol}{Math.round(groupedAccounts[cat].reduce((s,i)=>s+i.value,0)).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      {groupedAccounts[cat].map(item => (
                        <CompactAccountCard key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={onEditAccount} />
                      ))}
                    </div>
                  </div>
                )
              ))}
              
              {/* Asset Column Total */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-1 mt-2">
                 <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Asset Sum</p>
                 <p className="text-xs font-black text-emerald-600 dark:text-emerald-500">{currencySymbol}{stats.totalAssets.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* LIABILITY COLUMN */}
          <div className="space-y-4 border-l border-slate-100 dark:border-slate-800/60 pl-2">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  Debt
               </h3>
               <Activity size={10} className="text-slate-300" />
            </div>

            <div className="space-y-3">
              {liabilityCategories.map(cat => (
                groupedAccounts[cat] && groupedAccounts[cat].length > 0 && (
                  <div key={cat} className="animate-kick">
                    <div className="flex justify-between items-center mb-1 px-1 opacity-60">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                      <span className="text-[7px] font-bold text-slate-400">{currencySymbol}{Math.round(groupedAccounts[cat].reduce((s,i)=>s+i.value,0)).toLocaleString()}</span>
                    </div>
                    <div className="space-y-1">
                      {groupedAccounts[cat].map(item => (
                        <CompactAccountCard key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={onEditAccount} />
                      ))}
                    </div>
                  </div>
                )
              ))}
              
              {/* Liability Column Total */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 px-1 mt-2">
                 <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Liability Sum</p>
                 <p className="text-xs font-black text-rose-600 dark:text-rose-500">{currencySymbol}{stats.totalLiabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Portfolio Grand Total Summary Overlay (Fixed Bottom if needed, but here simple footer) */}
      <div className="mt-8 px-4 flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity pb-8">
          <div className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700 mb-2"></div>
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">
             Registry Integrity: {(stats.totalAssets + stats.totalLiabilities).toLocaleString()} Total Exposure
          </p>
      </div>
    </div>
  );
};

export default Accounts;