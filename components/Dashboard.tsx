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
  MessageCircleQuestion, Gem, Compass
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getBudgetInsights, getExpensesHash } from '../services/geminiService';

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

const Dashboard: React.FC<DashboardProps> = ({ 
  expenses, incomes, wealthItems, settings, viewDate, onInsightsReceived, user, onCategorizeClick, onAffordabilityCheck
}) => {
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insights, setInsights] = useState<{ tip: string, impact: string }[] | null>(null);
  const [trendChartStyle, setTrendChartStyle] = useState<'area' | 'bar'>('area');
  
  const initialFetchRef = useRef(false);
  const lastHashRef = useRef<string>("");
  const currencySymbol = getCurrencySymbol(settings.currency);

  const pendingCount = useMemo(() => expenses.filter(e => !e.isConfirmed).length, [expenses]);

  const triggerInsightsFetch = async (force = false) => {
    if (force) triggerHaptic();
    const currentHash = getExpensesHash(expenses, settings);
    if (!force && currentHash === lastHashRef.current && insights) return;
    setLoadingInsights(true);
    try {
      const results = await getBudgetInsights(expenses, settings);
      if (results && results.length > 0) {
        setInsights(results);
        lastHashRef.current = currentHash;
        if (onInsightsReceived) onInsightsReceived(results);
      }
    } catch (err) { }
    finally { setLoadingInsights(false); }
  };

  useEffect(() => {
    if (!initialFetchRef.current) {
      initialFetchRef.current = true;
      const timer = setTimeout(() => triggerInsightsFetch(), 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
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
    const dayOfMonth = isCurrentMonth ? today.getDate() : new Date(y, m + 1, 0).getDate();
    const dailyAvg = Math.round(spent / dayOfMonth);
    const burnDays = dailyAvg > 0 ? Math.round(wealthStats.liquid / dailyAvg) : Infinity;
    return { spent: Math.round(spent), income: Math.round(totalIncome), byCat, savingsRate, dailyAvg, burnDays };
  }, [expenses, incomes, settings.monthlyIncome, viewDate, wealthStats.liquid]);

  const ytdStats = useMemo(() => {
    const y = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();
    const ytdExps = expenses.filter(e => {
      const d = new Date(e.date);
      return e.isConfirmed && d.getFullYear() === y && d.getMonth() <= currentMonth;
    });
    const total = ytdExps.reduce((sum, e) => sum + e.amount, 0);
    const monthsElapsed = currentMonth + 1;
    const monthlyAvg = Math.round(total / monthsElapsed);
    const byCat = ytdExps.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<Category, number>);
    return { total: Math.round(total), monthlyAvg, byCat };
  }, [expenses, viewDate]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthExps = expenses.filter(e => e.isConfirmed && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y);
      data.push({
        month: d.toLocaleDateString(undefined, { month: 'short' }),
        Needs: Math.round(monthExps.filter(e => e.category === 'Needs').reduce((s, e) => s + e.amount, 0)),
        Wants: Math.round(monthExps.filter(e => e.category === 'Wants').reduce((s, e) => s + e.amount, 0)),
      });
    }
    return data;
  }, [expenses, viewDate]);

  const hasData = stats.spent > 0 || stats.income > 0;
  const sectionClass = `glass premium-card p-2.5 rounded-[20px] mb-2 relative overflow-hidden transition-all duration-300`;

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-2.5 py-2 rounded-xl mb-2 mx-0.5 shadow-md h-[50px] flex items-center shrink-0">
        <div className="flex justify-between items-center w-full relative z-10">
          <div>
            <h1 className="text-[11px] font-black text-white uppercase leading-none tracking-tight">Dashboard</h1>
            <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Real-time Intelligence</p>
          </div>
          <div className="flex items-center gap-1.5">
            {user?.accessToken && (
              <div className="flex items-center gap-1 bg-white/10 px-1.5 py-0.5 rounded-lg border border-white/10">
                <ShieldCheck size={8} className="text-emerald-400" />
                <span className="text-[6px] font-black text-white uppercase tracking-widest">Secured</span>
              </div>
            )}
            <button onClick={() => triggerInsightsFetch(true)} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md active:scale-90 border border-white/10">
              {loadingInsights ? <Loader2 size={10} className="animate-spin" /> : <RefreshCcw size={10} />}
            </button>
          </div>
        </div>
      </div>

      <div className="px-0.5 space-y-2">
        {pendingCount > 0 && (
          <button 
            onClick={() => { triggerHaptic(); onCategorizeClick(); }}
            className="w-full bg-indigo-600 rounded-[20px] p-2.5 flex items-center justify-between shadow-md active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-white backdrop-blur-md border border-white/10">
                 <BrainCircuit size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
              </div>
              <div className="text-left">
                <p className="text-[7px] font-black text-indigo-100 uppercase tracking-[0.2em] leading-none">Audit Required</p>
                <h3 className="text-[10px] font-black text-white mt-1 uppercase">{pendingCount} Entries Pending</h3>
              </div>
            </div>
            <ArrowRight size={12} className="text-white/60" />
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className={`${sectionClass} !mb-0 border-l-4 border-l-brand-primary`}>
            <div className="flex items-center gap-1.5 mb-1">
               <Flame size={10} className="text-brand-primary" />
               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Burn Runway</p>
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">
              {stats.burnDays === Infinity ? '∞' : stats.burnDays} <span className="text-[8px] opacity-40 uppercase">Days</span>
            </h4>
          </div>
          <div className={`${sectionClass} !mb-0 border-l-4 border-l-emerald-500`}>
            <div className="flex items-center gap-1.5 mb-1">
               <Droplets size={10} className="text-emerald-500" />
               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Retention</p>
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">
              {stats.savingsRate}% <span className="text-[8px] opacity-40 uppercase">Safe</span>
            </h4>
          </div>
        </div>

        <section className={`${sectionClass} group !p-2.5`}>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Net Worth</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-xs opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {wealthStats.netWorth.toLocaleString()}
              </h2>
            </div>
            <div className="flex gap-3">
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

        <section className={sectionClass}>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">YTD Velocity</p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-10px] opacity-30 mr-0.5">{currencySymbol}</span>
                {ytdStats.total.toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">30d Avg Out</p>
              <p className="text-[10px] font-black text-slate-600 dark:text-slate-300">{currencySymbol}{ytdStats.monthlyAvg.toLocaleString()}</p>
            </div>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full flex overflow-hidden border border-slate-200 dark:border-slate-700">
            {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => {
              const val = ytdStats.byCat[cat] || 0;
              const perc = ytdStats.total > 0 ? (val / ytdStats.total) * 100 : 0;
              return perc > 0 ? (
                <div key={cat} style={{ width: `${perc}%`, backgroundColor: CATEGORY_COLORS[cat] }} />
              ) : null;
            })}
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-2 px-1">
             <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Growth Momentum</h3>
             <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
               <button onClick={() => setTrendChartStyle('bar')} className={`p-1 rounded-md transition-all ${trendChartStyle === 'bar' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm' : 'text-slate-400'}`}><BarChartIcon size={10} /></button>
               <button onClick={() => setTrendChartStyle('area')} className={`p-1 rounded-md transition-all ${trendChartStyle === 'area' ? 'bg-white dark:bg-slate-600 text-brand-primary shadow-sm' : 'text-slate-400'}`}><TrendingUp size={10} /></button>
            </div>
          </div>
          <div className="h-32 w-full">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                {trendChartStyle === 'bar' ? (
                  <BarChart data={trendData} margin={{ top: 5, right: 10, left: -40, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '8px' }} />
                    <Bar dataKey="Needs" fill={CATEGORY_COLORS.Needs} radius={[2, 2, 0, 0]} barSize={6} />
                    <Bar dataKey="Wants" fill={CATEGORY_COLORS.Wants} radius={[2, 2, 0, 0]} barSize={6} />
                  </BarChart>
                ) : (
                  <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -40, bottom: 0 }}>
                    <XAxis dataKey="month" hide />
                    <YAxis hide />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '8px' }} />
                    <Area type="monotone" dataKey="Needs" stackId="1" stroke={CATEGORY_COLORS.Needs} strokeWidth={2} fill={CATEGORY_COLORS.Needs} fillOpacity={0.2} />
                    <Area type="monotone" dataKey="Wants" stackId="1" stroke={CATEGORY_COLORS.Wants} strokeWidth={2} fill={CATEGORY_COLORS.Wants} fillOpacity={0.2} />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center opacity-20"><Activity size={24} /></div>}
          </div>
          <div className="flex justify-between mt-2 px-1">
             {trendData.map(t => <span key={t.month} className="text-[7px] font-black text-slate-400 uppercase">{t.month}</span>)}
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tactical Analysis</h3>
          <div className="flex overflow-x-auto no-scrollbar gap-2 px-1 pb-1">
            {insights ? insights.map((insight, idx) => (
              <div key={idx} className="flex-none w-[130px] bg-white dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between h-24">
                <p className="text-[8px] font-bold text-slate-800 dark:text-slate-200 leading-tight line-clamp-4 italic">"{insight.tip}"</p>
                <span className="text-[6px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-800 self-start mt-1">{insight.impact}</span>
              </div>
            )) : <div className="w-full text-center py-4 text-[8px] uppercase tracking-widest text-slate-300 animate-pulse">Scanning Registry...</div>}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;