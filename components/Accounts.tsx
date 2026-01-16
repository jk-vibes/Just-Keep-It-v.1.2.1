import React, { useMemo, useRef } from 'react';
import { WealthItem, UserSettings, Expense, Income, WealthCategory } from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowRightLeft,
  PiggyBank, Briefcase, 
  TrendingUp, Coins, Home, Receipt, 
  ArrowUpCircle, ArrowDownCircle,
  BarChart3, Activity
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
    case 'Savings': return <PiggyBank size={10} />;
    case 'Pension': return <Briefcase size={10} />;
    case 'Gold': return <Coins size={10} />;
    case 'Investment': return <TrendingUp size={10} />;
    case 'Credit Card': return <CreditCard size={10} />;
    case 'Home Loan': return <Home size={10} />;
    case 'Personal Loan': return <Receipt size={10} />;
    default: return <Landmark size={10} />;
  }
};

const UltraCompactRow: React.FC<{
  item: WealthItem;
  currencySymbol: string;
  onClick: () => void;
}> = ({ item, currencySymbol, onClick }) => {
  return (
    <div 
      onClick={() => { triggerHaptic(); onClick(); }}
      className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800/40 cursor-pointer group"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div className={`${item.type === 'Liability' ? 'text-rose-500' : 'text-emerald-500'} opacity-70`}>
          {getCategoryIcon(item.category)}
        </div>
        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate uppercase tracking-tighter">
          {item.alias || item.name}
        </span>
      </div>
      <span className={`text-[10px] font-black tracking-tighter shrink-0 ${item.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
        {item.value < 0 ? '-' : ''}{currencySymbol}{Math.abs(Math.round(item.value)).toLocaleString()}
      </span>
    </div>
  );
};

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, settings, onEditAccount, onAddAccountClick, onAddTransferClick
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
    <div className="h-full flex flex-col pb-20 animate-slide-up overflow-hidden">
      {/* Mini Header */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 shadow-md h-[48px] flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[11px] font-black text-white uppercase leading-none">Accounts</h1>
          <p className="text-[6px] font-bold text-white/60 uppercase tracking-[0.2em]">High Density Grid</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onAddTransferClick} className="p-1.5 bg-white/10 rounded-lg text-white active:scale-95 transition-all"><ArrowRightLeft size={14} /></button>
          <button onClick={onAddAccountClick} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-95 transition-all"><Plus size={14} strokeWidth={4} /></button>
        </div>
      </div>

      {/* Ultra Compact Net Worth Bar */}
      <div className="bg-white dark:bg-slate-900 px-4 py-2 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[6px] font-black text-slate-400 uppercase tracking-widest">Net Worth</p>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              {currencySymbol}{stats.netWorth.toLocaleString()}
            </h2>
          </div>
          <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800" />
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <ArrowUpCircle size={10} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600">{currencySymbol}{stats.totalAssets.toLocaleString()}</span>
             </div>
             <div className="flex items-center gap-1.5">
                <ArrowDownCircle size={10} className="text-rose-500" />
                <span className="text-[9px] font-black text-rose-600">{currencySymbol}{stats.totalLiabilities.toLocaleString()}</span>
             </div>
          </div>
        </div>
        <ShieldCheck size={14} className="text-brand-primary/50" />
      </div>

      {/* Main High-Density Side-by-Side Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CAPITAL COLUMN */}
        <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-slate-800">
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Capital Assets</span>
            <BarChart3 size={8} className="text-slate-300" />
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {assetCategories.map(cat => (
              groupedAccounts[cat] && groupedAccounts[cat].length > 0 && (
                <div key={cat} className="border-b border-slate-50 dark:border-slate-800/20">
                  <div className="px-2 py-0.5 bg-slate-100/30 dark:bg-slate-800/30 flex justify-between items-center">
                    <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                    <span className="text-[6px] font-bold text-slate-400">{currencySymbol}{Math.round(groupedAccounts[cat].reduce((s,i)=>s+i.value,0)).toLocaleString()}</span>
                  </div>
                  {groupedAccounts[cat].map(item => (
                    <UltraCompactRow key={item.id} item={item} currencySymbol={currencySymbol} onClick={() => onEditAccount(item)} />
                  ))}
                </div>
              )
            ))}
          </div>

          <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[6px] font-black text-slate-400 uppercase">Total Assets</p>
            <p className="text-[11px] font-black text-emerald-600">{currencySymbol}{stats.totalAssets.toLocaleString()}</p>
          </div>
        </div>

        {/* DEBT COLUMN */}
        <div className="flex-1 flex flex-col">
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[7px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em]">Liability Nodes</span>
            <Activity size={8} className="text-slate-300" />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {liabilityCategories.map(cat => (
              groupedAccounts[cat] && groupedAccounts[cat].length > 0 && (
                <div key={cat} className="border-b border-slate-50 dark:border-slate-800/20">
                  <div className="px-2 py-0.5 bg-slate-100/30 dark:bg-slate-800/30 flex justify-between items-center">
                    <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                    <span className="text-[6px] font-bold text-slate-400">{currencySymbol}{Math.round(groupedAccounts[cat].reduce((s,i)=>s+i.value,0)).toLocaleString()}</span>
                  </div>
                  {groupedAccounts[cat].map(item => (
                    <UltraCompactRow key={item.id} item={item} currencySymbol={currencySymbol} onClick={() => onEditAccount(item)} />
                  ))}
                </div>
              )
            ))}
          </div>

          <div className="p-2 bg-rose-50/50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30">
            <p className="text-[6px] font-black text-slate-400 uppercase">Total Liabilities</p>
            <p className="text-[11px] font-black text-rose-600">{currencySymbol}{stats.totalLiabilities.toLocaleString()}</p>
          </div>
        </div>

      </div>

      {/* Portfolio Grand Summary Bar (Sticky Bottom) */}
      <div className="bg-slate-900 text-white px-4 py-2 shrink-0 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 opacity-60">
             <div className="w-1 h-1 rounded-full bg-indigo-400" />
             <span className="text-[7px] font-black uppercase tracking-widest">System Integrated</span>
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">
            Exposure: {currencySymbol}{(stats.totalAssets + stats.totalLiabilities).toLocaleString()}
          </span>
      </div>
    </div>
  );
};

export default Accounts;