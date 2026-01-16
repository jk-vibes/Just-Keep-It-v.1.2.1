
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, BarChart, Bar,
  Tooltip, Legend, LineChart, Line, CartesianGrid
} from 'recharts';
import { Expense, UserSettings, Category, Income, WealthItem, UserProfile } from '../types';
import { CATEGORY_COLORS, getCurrencySymbol } from '../constants';
import { 
  TrendingUp, Activity, PieChart as PieChartIcon, 
  Sparkles, ShieldCheck, Zap, 
  Loader2, RefreshCcw, 
  Target, BarChart3, ListOrdered, 
  Clock, Flame, Droplets, ArrowRight, CalendarDays,
  LineChart as LineChartIcon, ArrowLeftRight, Layers, BarChart as BarChartIcon,
  ArrowDownCircle, ArrowUpCircle, AlignLeft, BarChart2, BrainCircuit, AlertCircle,
  MessageCircleQuestion, Gem, Compass, Rocket, Calendar, TrendingDown,
  ShoppingBag, Landmark, ArrowRightCircle
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface DashboardProps {
  expenses: Expense[];
  incomes: Income[];
  wealthItems: WealthItem[];
  settings: UserSettings;
  user: UserProfile | null;
  onCategorizeClick: () => void;
  onConfirmExpense: (id: string, category: Category) => void;
  onSmartAdd: () => void;
  onAffordabilityCheck: () => void;
  viewDate: Date;
  onMonthChange: (direction: number) => void;
  onGoToDate: (year: number, month: number) => void;
  onInsightsReceived?: (insights: { tip: string, impact: string }[]) => void;
}

const StatMiniCard = ({ label, value, subValue, icon: Icon, colorClass }: any) => (
  <div className="bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-24">
    <div className="flex items-center justify-between opacity-60">
       <div className={`p-1.5 rounded-lg ${colorClass || 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          <Icon size={12} />
       </div>
       <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">{label}</span>
    </div>
    <div className="mt-2">
      <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none tracking-tight">{value}</h4>
      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-1">{subValue}</p>
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, incomes, wealthItems, settings, viewDate, user, onCategorizeClick
}) => {
  const [trendChartStyle, setTrendChartStyle] = useState<'area' | 'bar'>('area');
  const currencySymbol = getCurrencySymbol(settings.currency);

  const pendingCount = useMemo(() => expenses.filter(e => !e.isConfirmed).length, [expenses]);

  const wealthStats = useMemo(() => {
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const liquid = wealthItems.filter(i => ['Savings', 'Cash'].includes(i.category)).reduce((sum, i) => sum + i.value, 0);
    return { assets: Math.round(assets), liabilities: Math.round(liabilities), netWorth: Math.round(assets - liabilities), liquid: Math.round(liquid) };
  }, [wealthItems]);

  const stats = useMemo(() => {
    const m = viewDate.getMonth();
    const y = viewDate.getFullYear();
    const currentExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
    const spent = currentExps.reduce((sum, e) => sum + e.amount, 0);
    const monthlyIncomes = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y);
    const totalIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome;
    
    const byCat = currentExps.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + e.amount; return acc; }, {} as Record<Category, number>);
    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - spent) / totalIncome) * 100) : 0;
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === m && today.getFullYear() === y;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
    
    const dailyAvg = Math.round(spent / currentDay);
    const projectedEOM = Math.round(dailyAvg * daysInMonth);
    const burnDays = dailyAvg > 0 ? Math.round(wealthStats.liquid / dailyAvg) : Infinity;

    // Top Merchants
    const merchantMap = currentExps.reduce((acc, e) => {
      const mName = e.merchant || 'General';
      acc[mName] = (acc[mName] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);
    const topMerchants = Object.entries(merchantMap)
      // Fix: Ensure values are treated as numbers for the sort operation to satisfy TS requirements in all environments
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3)
      .map(([name, amount]) => ({ name, amount }));

    return { 
      spent: Math.round(spent), 
      income: Math.round(totalIncome), 
      byCat, 
      savingsRate, 
      dailyAvg, 
      burnDays, 
      projectedEOM,
      topMerchants
    };
  }, [expenses, incomes, settings.monthlyIncome, viewDate, wealthStats.liquid]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
      const monthIncs = incomes.filter(i => new Date(i.date).getMonth() === m && new Date(i.date).getFullYear() === y);
      data.push({
        month: d.toLocaleDateString(undefined, { month: 'short' }),
        Needs: Math.round(monthExps.filter(e => e.category === 'Needs').reduce((s, e) => s + e.amount, 0)),
        Wants: Math.round(monthExps.filter(e => e.category === 'Wants').reduce((s, e) => s + e.amount, 0)),
        In: Math.round(monthIncs.reduce((s, i) => s + i.amount, 0)) || settings.monthlyIncome
      });
    }
    return data;
  }, [expenses, incomes, viewDate, settings.monthlyIncome]);

  const hasData = stats.spent > 0 || stats.income > 0;
  const sectionClass = `glass premium-card p-3 rounded-[24px] mb-2 relative overflow-hidden transition-all duration-300`;

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      {/* Dynamic Header */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-3 rounded-xl mb-2 mx-0.5 shadow-md h-[55px] flex items-center shrink-0">
        <div className="flex justify-between items-center w-full relative z-10 px-1">
          <div>
            <h1 className="text-[14px] font-black text-white uppercase leading-none tracking-tight">Dashboard</h1>
            <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-1">Operation Command</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[7px] font-black text-white uppercase tracking-widest">Active System</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-0.5 space-y-2">
        {/* Urgent Action */}
        {pendingCount > 0 && (
          <button 
            onClick={() => { triggerHaptic(); onCategorizeClick(); }}
            className="w-full bg-indigo-600 rounded-[22px] p-3 flex items-center justify-between shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/10">
                 <BrainCircuit size={18} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black text-indigo-100 uppercase tracking-[0.2em] leading-none">Registry Audit Required</p>
                <h3 className="text-[11px] font-black text-white mt-1 uppercase">{pendingCount} Unresolved Signatures</h3>
              </div>
            </div>
            <ArrowRight size={14} className="text-white group-hover:translate-x-1 transition-transform" />
          </button>
        )}

        {/* Global Net Worth Monitor */}
        <section className={`${sectionClass} group !p-4 border-l-4 border-l-brand-primary`}>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Portfolio Equity</p>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-xs opacity-40 mr-1.5 font-bold">{currencySymbol}</span>
                {wealthStats.netWorth.toLocaleString()}
              </h2>
              <div className="flex items-center gap-2 mt-3">
                 <div className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[7px] font-black text-emerald-600 dark:text-emerald-400 uppercase">Secure</span>
                 </div>
                 <span className="text-[7px] font-bold text-slate-400 uppercase">Vault Registry Stable</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Asset Base</p>
                <p className="text-[10px] font-black text-emerald-500">+{currencySymbol}{wealthStats.assets.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Liabilities</p>
                <p className="text-[10px] font-black text-rose-500">-{currencySymbol}{wealthStats.liabilities.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Statistics Grid */}
        <div className="grid grid-cols-2 gap-2">
           <StatMiniCard 
             label="Daily Velocity" 
             value={`${currencySymbol}${stats.dailyAvg.toLocaleString()}`} 
             subValue="Avg 24h Outflow"
             icon={Rocket}
             colorClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500"
           />
           <StatMiniCard 
             label="Month Projection" 
             value={`${currencySymbol}${stats.projectedEOM.toLocaleString()}`} 
             subValue="Est. Total Spend"
             icon={Calendar}
             colorClass="bg-amber-50 dark:bg-amber-900/30 text-amber-500"
           />
           <StatMiniCard 
             label="Runway" 
             value={`${stats.burnDays === Infinity ? '∞' : stats.burnDays} Days`} 
             subValue="Liquid Exhaustion"
             icon={Flame}
             colorClass="bg-rose-50 dark:bg-rose-900/30 text-rose-500"
           />
           <StatMiniCard 
             label="Retention" 
             value={`${stats.savingsRate}%`} 
             subValue="Capital Saved"
             icon={ShieldCheck}
             colorClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500"
           />
        </div>

        {/* Tactical Registry Nodes (Top Merchants) */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">High Impact Registry Nodes</h3>
             <ListOrdered size={12} className="text-slate-300" />
          </div>
          <div className="space-y-3">
             {stats.topMerchants.length > 0 ? stats.topMerchants.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between animate-kick">
                   <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <ShoppingBag size={12} />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase truncate w-32">{m.name}</span>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-900 dark:text-white leading-none">{currencySymbol}{m.amount.toLocaleString()}</p>
                      <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                         <div 
                           className="h-full bg-brand-primary rounded-full transition-all duration-1000" 
                           style={{ width: `${(m.amount / stats.spent) * 100}%` }} 
                         />
                      </div>
                   </div>
                </div>
             )) : (
               <p className="text-[8px] text-slate-400 uppercase tracking-widest text-center py-4">No active signatures for {viewDate.toLocaleDateString(undefined, { month: 'long' })}</p>
             )}
          </div>
        </section>

        {/* Growth Momentum & Charts */}
        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-4 px-1">
             <div>
               <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Growth Momentum</h3>
               <p className="text-[10px] font-black text-slate-900 dark:text-white mt-1">Registry Flow: {monthLabel(viewDate)}</p>
             </div>
             <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
               <button onClick={() => setTrendChartStyle('bar')} className={`p-1.5 rounded-lg transition-all ${trendChartStyle === 'bar' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm' : 'text-slate-400'}`}><BarChartIcon size={12} /></button>
               <button onClick={() => setTrendChartStyle('area')} className={`p-1.5 rounded-lg transition-all ${trendChartStyle === 'area' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm' : 'text-slate-400'}`}><TrendingUp size={12} /></button>
            </div>
          </div>
          <div className="h-40 w-full mt-2">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                {trendChartStyle === 'bar' ? (
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: -40, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '9px' }}
                      cursor={{ fill: 'transparent' }}
                    />
                    <Bar dataKey="In" fill="#10b981" radius={[3, 3, 0, 0]} barSize={8} />
                    <Bar dataKey="Needs" fill={CATEGORY_COLORS.Needs} radius={[3, 3, 0, 0]} barSize={8} />
                    <Bar dataKey="Wants" fill={CATEGORY_COLORS.Wants} radius={[3, 3, 0, 0]} barSize={8} />
                  </BarChart>
                ) : (
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -40, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '9px' }} />
                    <Area type="monotone" dataKey="In" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="Needs" stackId="1" stroke={CATEGORY_COLORS.Needs} strokeWidth={2} fill={CATEGORY_COLORS.Needs} fillOpacity={0.2} />
                    <Area type="monotone" dataKey="Wants" stackId="1" stroke={CATEGORY_COLORS.Wants} strokeWidth={2} fill={CATEGORY_COLORS.Wants} fillOpacity={0.2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center opacity-20"><Activity size={24} /></div>}
          </div>
          <div className="flex justify-between mt-4 px-2">
             {trendData.map(t => (
               <div key={t.month} className="flex flex-col items-center">
                  <span className="text-[7px] font-black text-slate-400 uppercase">{t.month}</span>
               </div>
             ))}
          </div>
        </section>

        {/* Month Summary Bar */}
        <section className={sectionClass}>
          <div className="flex justify-between items-center mb-3 px-1">
             <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monthly Allocation Strategy</h3>
             <span className="text-[9px] font-black text-brand-primary uppercase">{Math.round((stats.spent / stats.income) * 100)}% Used</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden border border-slate-200 dark:border-slate-700">
             {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
                const val = stats.byCat[cat] || 0;
                const perc = stats.income > 0 ? (val / stats.income) * 100 : 0;
                return perc > 0 ? (
                  <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} className="transition-all duration-1000" />
                ) : null;
             })}
          </div>
          <div className="flex justify-between mt-3 px-1">
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.Needs }} />
                <span className="text-[7px] font-black uppercase text-slate-400">Needs</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.Wants }} />
                <span className="text-[7px] font-black uppercase text-slate-400">Wants</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS.Savings }} />
                <span className="text-[7px] font-black uppercase text-slate-400">Safe Capital</span>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const monthLabel = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }).toUpperCase();
};

export default Dashboard;
