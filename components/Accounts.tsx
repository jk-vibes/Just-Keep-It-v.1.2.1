import React, { useMemo, useState } from 'react';
import { WealthItem, UserSettings, Expense, Income, WealthCategory } from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  ArrowRightLeft,
  PiggyBank, Briefcase, 
  TrendingUp, Coins, Home, Receipt, 
  ArrowUpCircle, ArrowDownCircle,
  BarChart3, Activity, PieChart as PieChartIcon,
  LayoutGrid, Info, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
    case 'Gold Loan': return <Coins size={10} />;
    case 'Overdraft': return <Activity size={10} />;
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
        <div className={`${item.type === 'Liability' ? 'text-rose-500' : 'text-emerald-500'} opacity-60`}>
          {getCategoryIcon(item.category)}
        </div>
        <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate uppercase tracking-tighter">
          {item.alias || item.name}
        </span>
      </div>
      <span className={`text-[9px] font-black tracking-tighter shrink-0 ${item.type === 'Liability' ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
        {item.value < 0 ? '-' : ''}{currencySymbol}{Math.abs(Math.round(item.value)).toLocaleString()}
      </span>
    </div>
  );
};

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, settings, onEditAccount, onAddAccountClick, onAddTransferClick
}) => {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const currencySymbol = getCurrencySymbol(settings.currency);
  
  const stats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const liquid = wealthItems.filter(i => i.type === 'Investment' && ['Savings', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);
    const solvencyRatio = assets > 0 ? ((assets - liabilities) / assets) * 100 : 0;
    const liquidityRatio = assets > 0 ? (liquid / assets) * 100 : 0;

    return { 
      totalAssets: Math.round(assets),
      totalLiabilities: Math.round(liabilities),
      netWorth: Math.round(assets - liabilities),
      liquid: Math.round(liquid),
      solvencyRatio,
      liquidityRatio
    };
  }, [wealthItems]);

  const assetDistribution = useMemo(() => {
    const data: Record<string, number> = {};
    wealthItems.filter(i => i.type === 'Investment').forEach(item => {
      const cat = item.category || 'Other';
      data[cat] = (data[cat] || 0) + item.value;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [wealthItems]);

  const assetGroups = useMemo(() => {
    const groups: Record<string, WealthItem[]> = {};
    wealthItems.filter(i => i.type === 'Investment').forEach(item => {
      const g = item.group || item.category || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [wealthItems]);

  const liabilityGroups = useMemo(() => {
    const groups: Record<string, WealthItem[]> = {};
    wealthItems.filter(i => i.type === 'Liability').forEach(item => {
      const g = item.group || item.category || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });
    return groups;
  }, [wealthItems]);

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

  return (
    <div className="h-full flex flex-col pb-20 animate-slide-up overflow-hidden">
      {/* Mini Header */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-4 py-2 shadow-md h-[48px] flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <h1 className="text-[12px] font-black text-white uppercase leading-none tracking-tight">Accounts</h1>
          <p className="text-[7px] font-bold text-white/50 uppercase tracking-[0.2em] mt-0.5">Registry Grid</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { triggerHaptic(); setShowAnalytics(!showAnalytics); }} className={`p-1.5 rounded-lg transition-all ${showAnalytics ? 'bg-white text-brand-primary' : 'bg-white/10 text-white'}`}>
            <PieChartIcon size={14} />
          </button>
          <button onClick={onAddTransferClick} className="p-1.5 bg-white/10 rounded-lg text-white active:scale-95 transition-all"><ArrowRightLeft size={14} /></button>
          <button onClick={onAddAccountClick} className="p-1.5 bg-white/20 rounded-lg text-white active:scale-95 transition-all"><Plus size={14} strokeWidth={4} /></button>
        </div>
      </div>

      {/* Simplified Net Worth Bar */}
      <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Net Equity</p>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none">
            {stats.netWorth < 0 ? '-' : ''}{currencySymbol}{Math.abs(stats.netWorth).toLocaleString()}
          </h2>
        </div>
        <div className="flex gap-2">
           <div className="flex flex-col items-end">
              <span className="text-[6px] font-black text-slate-400 uppercase">Solvency</span>
              <span className={`text-[10px] font-black ${stats.solvencyRatio > 50 ? 'text-emerald-500' : 'text-rose-500'}`}>{Math.round(stats.solvencyRatio)}%</span>
           </div>
           <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-brand-primary/40">
              <ShieldCheck size={18} />
           </div>
        </div>
      </div>

      {/* COLLAPSIBLE ANALYTICS SECTION */}
      {showAnalytics && (
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-200 dark:border-slate-800 animate-kick shrink-0">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden h-32">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 relative z-10">Asset Split</p>
                <div className="absolute inset-0 pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {assetDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ fontSize: '8px', borderRadius: '8px', backgroundColor: '#0f172a', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>

             <div className="space-y-2 flex flex-col justify-between">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Liquidity</p>
                      <Zap size={8} className="text-amber-500" />
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.liquidityRatio}%` }} />
                   </div>
                   <p className="text-[10px] font-black text-slate-900 dark:text-white mt-1.5">{Math.round(stats.liquidityRatio)}% Ready</p>
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                   <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Debt Burden</p>
                      <Activity size={8} className="text-rose-500" />
                   </div>
                   <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${100 - stats.solvencyRatio}%` }} />
                   </div>
                   <p className="text-[10px] font-black text-slate-900 dark:text-white mt-1.5">{Math.round(100 - stats.solvencyRatio)}% Usage</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Grid Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* DEBT NODES COLUMN (Previously Assets) */}
        <div className="flex-1 flex flex-col border-r border-slate-100 dark:border-slate-800">
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Debt</span>
            <BarChart3 size={9} className="text-slate-300" />
          </div>
          
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {Object.keys(assetGroups).sort().map(group => (
                <div key={group} className="border-b border-slate-50 dark:border-slate-800/20">
                  <div className="px-2 py-0.5 bg-slate-100/30 dark:bg-slate-800/30 flex justify-between items-center">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{group}</span>
                    <span className="text-[7px] font-bold text-slate-400">
                      {currencySymbol}{Math.round(assetGroups[group].reduce((s,i)=>s+i.value,0)).toLocaleString()}
                    </span>
                  </div>
                  {assetGroups[group].map(item => (
                    <UltraCompactRow key={item.id} item={item} currencySymbol={currencySymbol} onClick={() => onEditAccount(item)} />
                  ))}
                </div>
            ))}
          </div>

          <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30">
            <p className="text-[7px] font-black text-slate-400 uppercase">Sub total</p>
            <p className="text-[16px] font-black text-emerald-600 leading-tight">{currencySymbol}{stats.totalAssets.toLocaleString()}</p>
          </div>
        </div>

        {/* CREDIT NODES COLUMN (Previously Debt) */}
        <div className="flex-1 flex flex-col">
          <div className="px-2 py-1.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[8px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-[0.2em]">Credit</span>
            <Activity size={9} className="text-slate-300" />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {Object.keys(liabilityGroups).sort().map(group => (
                <div key={group} className="border-b border-slate-50 dark:border-slate-800/20">
                  <div className="px-2 py-0.5 bg-slate-100/30 dark:bg-slate-800/30 flex justify-between items-center">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{group}</span>
                    <span className="text-[7px] font-bold text-slate-400">
                      {currencySymbol}{Math.round(liabilityGroups[group].reduce((s,i)=>s+i.value,0)).toLocaleString()}
                    </span>
                  </div>
                  {liabilityGroups[group].map(item => (
                    <UltraCompactRow key={item.id} item={item} currencySymbol={currencySymbol} onClick={() => onEditAccount(item)} />
                  ))}
                </div>
            ))}
          </div>

          <div className="p-2.5 bg-rose-50/50 dark:bg-rose-950/20 border-t border-rose-100 dark:border-rose-900/30">
            <p className="text-[7px] font-black text-slate-400 uppercase">Sub total</p>
            <p className="text-[16px] font-black text-rose-600 leading-tight">{currencySymbol}{stats.totalLiabilities.toLocaleString()}</p>
          </div>
        </div>

      </div>

      {/* Portfolio Grand Summary Bar (Sticky Bottom) */}
      <div className="bg-slate-900 text-white px-4 py-2 shrink-0 flex items-center justify-center gap-4">
          <div className="flex items-center gap-1.5 opacity-50">
             <div className="w-1 h-1 rounded-full bg-indigo-400" />
             <span className="text-[8px] font-black uppercase tracking-widest">Active</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">
            Exposure: {currencySymbol}{(stats.totalAssets + stats.totalLiabilities).toLocaleString()}
          </span>
      </div>
    </div>
  );
};

export default Accounts;