import React, { useState, useMemo } from 'react';
import { BudgetItem, RecurringItem, UserSettings, Category, Expense, Bill } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  Plus, Clock, Check, 
  ArrowRight, ShieldCheck, Target, 
  LayoutGrid, List, Layers, PieChart,
  ChevronRight, AlertTriangle, Activity,
  Shield, Star, Trophy, ArrowDownCircle,
  History, Fingerprint, Edit2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BudgetPlannerProps {
  budgetItems: BudgetItem[];
  recurringItems: RecurringItem[];
  expenses: Expense[];
  bills: Bill[];
  settings: UserSettings;
  onAddBudget: (item: Omit<BudgetItem, 'id'>) => void;
  onUpdateBudget: (id: string, updates: Partial<BudgetItem>) => void;
  onDeleteBudget: (id: string) => void;
  onPayBill: (bill: Bill) => void;
  onDeleteBill: (id: string) => void;
  onEditBill: (bill: Bill) => void;
  onSmartAddBill: () => void;
  viewDate: Date;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const CategoryStatCard = ({ 
  label, 
  percentage, 
  spent, 
  color, 
  icon: Icon,
  currencySymbol,
  isActive,
  onClick
}: { 
  label: string, 
  percentage: number, 
  spent: number, 
  color: string, 
  icon: any,
  currencySymbol: string,
  isActive: boolean,
  onClick: () => void
}) => {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 p-2 rounded-xl border-l-4 transition-all duration-300 text-left active:scale-95 ${
        isActive 
          ? 'bg-white dark:bg-slate-800 shadow-md scale-[1.02] border-slate-200 dark:border-slate-700' 
          : 'bg-white/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 opacity-70 grayscale-[0.3]'
      }`}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-1 mb-1 opacity-60">
        <Icon size={10} style={{ color: isActive ? color : undefined }} />
        <span className="text-[7px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <h4 className="text-sm font-black text-slate-900 dark:text-white tracking-tighter leading-none">
          {Math.round(percentage)}%
        </h4>
      </div>
      <p className="text-[6px] font-bold text-slate-400 uppercase tracking-tight mt-1 truncate">
        {currencySymbol}{Math.round(spent).toLocaleString()}
      </p>
    </button>
  );
};

// Fixed: Using React.FC to ensure 'key' prop is recognized correctly in TypeScript for list rendering
const MiniTransactionItem: React.FC<{ exp: Expense, currencySymbol: string }> = ({ exp, currencySymbol }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/40 last:border-0 animate-kick">
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
        <ArrowDownCircle size={12} className="text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black text-slate-800 dark:text-slate-200 truncate uppercase leading-none">{exp.merchant || 'General'}</p>
        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          {new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {exp.subCategory}
        </p>
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-900 dark:text-white shrink-0 ml-2">-{currencySymbol}{Math.round(exp.amount).toLocaleString()}</p>
  </div>
);

interface SubCategoryCardProps {
  item: BudgetItem;
  spent: number;
  currencySymbol: string;
}

const SubCategoryCard: React.FC<SubCategoryCardProps> = ({ 
    item, 
    spent, 
    currencySymbol 
}) => {
    const percentage = item.amount > 0 ? (spent / item.amount) * 100 : 0;
    const isOver = spent > item.amount;
    const color = CATEGORY_COLORS[item.category];

    return (
        <div className="bg-white dark:bg-slate-900/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-2 transition-all active:scale-[0.98]">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400">
                        <Layers size={12} />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white uppercase leading-none truncate w-32">{item.name}</h4>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">{item.subCategory || 'General'}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-[10px] font-black ${isOver ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                        {currencySymbol}{Math.round(spent).toLocaleString()}
                    </p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                        of {currencySymbol}{Math.round(item.amount).toLocaleString()}
                    </p>
                </div>
            </div>
            <div className="relative pt-1">
                <div className="flex justify-between mb-1">
                    <span className={`text-[7px] font-black uppercase tracking-widest ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isOver ? 'Limit Exceeded' : `${Math.round(100 - percentage)}% Headroom`}
                    </span>
                    <span className="text-[7px] font-black text-slate-900 dark:text-white">{Math.round(percentage)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                        className={`h-full transition-all duration-1000 ${isOver ? 'bg-rose-500' : ''}`}
                        style={{ 
                            width: `${Math.min(100, percentage)}%`, 
                            backgroundColor: isOver ? undefined : color 
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  budgetItems, expenses, bills, settings, onAddBudget, onPayBill, onEditBill, viewDate
}) => {
  const [activeView, setActiveView] = useState<'Budgets' | 'Bills'>('Budgets');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const currencySymbol = getCurrencySymbol(settings.currency);

  const stats = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const curExps = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y && e.subCategory !== 'Transfer';
    });

    const categories: Category[] = ['Needs', 'Wants', 'Savings'];
    const utilByCat = categories.reduce((acc, cat) => {
      const catPlanned = budgetItems.filter(i => i.category === cat).reduce((s, i) => s + i.amount, 0);
      const catRealized = curExps.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
      acc[cat] = {
        planned: catPlanned,
        realized: catRealized,
        percentage: catPlanned > 0 ? (catRealized / catPlanned) * 100 : 0
      };
      return acc;
    }, {} as Record<string, { planned: number, realized: number, percentage: number }>);

    const subCatUsage = budgetItems.reduce((acc, item) => {
        const spent = curExps
            .filter(e => e.category === item.category && e.subCategory === item.subCategory)
            .reduce((s, e) => s + e.amount, 0);
        acc[item.id] = spent;
        return acc;
    }, {} as Record<string, number>);

    const totalPlanned = budgetItems.reduce((s, i) => s + i.amount, 0);
    const totalRealized = curExps.reduce((s, e) => s + e.amount, 0);

    return { totalPlanned, totalRealized, utilByCat, subCatUsage, curExps };
  }, [budgetItems, expenses, viewDate]);

  const filteredBudgetItems = useMemo(() => {
    if (!selectedCategory) return budgetItems;
    return budgetItems.filter(item => item.category === selectedCategory);
  }, [budgetItems, selectedCategory]);

  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return [];
    return stats.curExps.filter(e => e.category === selectedCategory)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [stats.curExps, selectedCategory]);

  const handleCategoryToggle = (cat: Category) => {
    triggerHaptic();
    setSelectedCategory(prev => prev === cat ? null : cat);
  };

  const totalUtilizationPerc = stats.totalPlanned > 0 ? Math.round((stats.totalRealized / stats.totalPlanned) * 100) : 0;
  const sectionClass = `glass premium-card p-2.5 rounded-[20px] mb-2 relative overflow-hidden transition-all duration-300 shadow-sm`;

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-3 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center">
        <div className="flex flex-col">
          <h1 className="text-[14px] font-black text-white uppercase leading-none tracking-tight">Budget Planner</h1>
          <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Architect Protocol</p>
        </div>
      </div>

      <div className="flex glass p-1 rounded-2xl mb-2 mx-0.5 border-white/10 shadow-sm h-[44px] items-center">
        <button onClick={() => setActiveView('Budgets')} className={`flex-1 h-full flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-xl transition-all ${activeView === 'Budgets' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>
          <LayoutGrid size={14} /> Goals
        </button>
        <button onClick={() => setActiveView('Bills')} className={`flex-1 h-full flex items-center justify-center gap-2 text-[9px] font-black uppercase rounded-xl transition-all ${activeView === 'Bills' ? 'bg-white dark:bg-slate-700 text-brand-primary shadow-sm' : 'text-slate-400'}`}>
          <List size={14} /> Bills
        </button>
      </div>

      <div className="px-0.5 space-y-2">
        {activeView === 'Budgets' ? (
          <>
            <section className={sectionClass}>
              <div className="flex flex-col gap-4">
                {/* Total Utilization Bar (ABOVE) */}
                <div>
                  <div className="flex justify-between items-end mb-2 px-1">
                    <div>
                      <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Global Utilization</h3>
                      <p className="text-[10px] font-black text-slate-900 dark:text-white mt-1">
                        {currencySymbol}{stats.totalRealized.toLocaleString()} <span className="text-[7px] opacity-40 font-bold uppercase tracking-widest">/ {currencySymbol}{stats.totalPlanned.toLocaleString()}</span>
                      </p>
                    </div>
                    <span className={`text-[9px] font-black ${totalUtilizationPerc > 100 ? 'text-rose-500' : 'text-brand-primary'}`}>
                      {totalUtilizationPerc}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                    <div 
                      style={{ 
                        width: `${Math.min(100, totalUtilizationPerc)}%`, 
                        backgroundColor: totalUtilizationPerc > 100 ? '#ef4444' : 'var(--brand-primary)' 
                      }} 
                      className="h-full rounded-full transition-all duration-1000 ease-out" 
                    />
                  </div>
                </div>

                {/* Breakdown Stats Cards (Filter Enabled) */}
                <div className="flex gap-1.5">
                  <CategoryStatCard 
                    label="Needs" 
                    percentage={stats.utilByCat.Needs.percentage} 
                    spent={stats.utilByCat.Needs.realized} 
                    color={CATEGORY_COLORS.Needs} 
                    icon={Shield}
                    currencySymbol={currencySymbol}
                    isActive={selectedCategory === 'Needs'}
                    onClick={() => handleCategoryToggle('Needs')}
                  />
                  <CategoryStatCard 
                    label="Wants" 
                    percentage={stats.utilByCat.Wants.percentage} 
                    spent={stats.utilByCat.Wants.realized} 
                    color={CATEGORY_COLORS.Wants} 
                    icon={Star}
                    currencySymbol={currencySymbol}
                    isActive={selectedCategory === 'Wants'}
                    onClick={() => handleCategoryToggle('Wants')}
                  />
                  <CategoryStatCard 
                    label="Savings" 
                    percentage={stats.utilByCat.Savings.percentage} 
                    spent={stats.utilByCat.Savings.realized} 
                    color={CATEGORY_COLORS.Savings} 
                    icon={Trophy}
                    currencySymbol={currencySymbol}
                    isActive={selectedCategory === 'Savings'}
                    onClick={() => handleCategoryToggle('Savings')}
                  />
                </div>
              </div>
            </section>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-2.5 ml-1.5 pr-1.5">
                   <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     {selectedCategory ? `${selectedCategory} Registry` : 'Registry Nodes'}
                   </h3>
                   <div className="flex items-center gap-1 opacity-40">
                      <Activity size={10} />
                      <span className="text-[7px] font-black uppercase">Live Track</span>
                   </div>
                </div>

                {/* Targets Section */}
                <div className="space-y-1.5">
                  {filteredBudgetItems.length > 0 ? (
                      filteredBudgetItems.map(item => (
                          <SubCategoryCard 
                              key={item.id} 
                              item={item} 
                              spent={stats.subCatUsage[item.id] || 0} 
                              currencySymbol={currencySymbol} 
                          />
                      ))
                  ) : (
                      !selectedCategory && (
                        <div className="text-center py-12 opacity-30">
                            <PieChart size={32} className="mx-auto mb-2" />
                            <p className="text-[8px] font-black uppercase tracking-[0.3em]">No targets provisioned</p>
                        </div>
                      )
                  )}
                </div>

                {/* Detailed Transactions Section (Only when filtered) */}
                {selectedCategory && (
                  <div className="mt-4 animate-slide-up">
                    <div className="flex items-center gap-2 mb-3 ml-1.5">
                       <History size={10} className="text-slate-400" />
                       <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actual Transactions</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-3 shadow-sm">
                      {filteredExpenses.length > 0 ? (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                          {filteredExpenses.slice(0, 15).map(exp => (
                            <MiniTransactionItem key={exp.id} exp={exp} currencySymbol={currencySymbol} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6">
                           <Fingerprint size={20} className="mx-auto text-slate-200 mb-2" />
                           <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">No matching signatures found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            </div>
          </>
        ) : (
          <div className="space-y-1">
             {bills.map(bill => (
                <div key={bill.id} className={`${sectionClass} !p-2.5 flex justify-between items-center group active:scale-[0.98]`}>
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400">
                        <Clock size={14} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">{bill.merchant}</h4>
                        <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-1">Due {new Date(bill.dueDate).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <p className="text-xs font-black text-slate-900 dark:text-white">{currencySymbol}{bill.amount.toLocaleString()}</p>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEditBill(bill); }}
                          className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-500 transition-all"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button 
                          onClick={() => { triggerHaptic(); onPayBill(bill); }} 
                          className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-transform"
                        >
                          Settle
                        </button>
                      </div>
                   </div>
                </div>
             ))}
             {bills.length === 0 && (
               <div className="flex flex-col items-center justify-center py-24 text-center opacity-40">
                 <ShieldCheck size={40} strokeWidth={1} className="text-slate-300 mb-4" />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em]">Protocol Clear</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPlanner;