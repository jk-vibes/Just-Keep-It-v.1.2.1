import React, { useState, useEffect } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, IncomeType, WealthItem, PaymentMethod, Bill, BudgetRule, RecurringItem 
} from '../types';
import { CATEGORY_COLORS, getCurrencySymbol, SUB_CATEGORIES, PAYMENT_METHODS } from '../constants';
import { 
  Check, X, Calendar as CalendarIcon, Tag, 
  MessageSquare, Sparkles, Loader2, Landmark, 
  Trash2, ArrowRightLeft, CreditCard,
  MessageCircleQuestion, Compass, Repeat, Layers, ChevronDown, Wallet
} from 'lucide-react';
import { parseTransactionText, getDecisionAdvice } from '../services/geminiService';
import { triggerHaptic } from '../utils/haptics';

interface AddRecordProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  expenses?: Expense[];
  rules?: BudgetRule[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onAddBill?: (bill: Omit<Bill, 'id'>) => void;
  onUpdateBill?: (id: string, updates: Partial<Bill>) => void;
  onAddRecurring?: (item: Omit<RecurringItem, 'id'>) => void;
  onAddRule?: (rule: Omit<BudgetRule, 'id'>) => void;
  onTransfer?: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  onOpenBulkImport?: () => void;
  initialData?: Expense | Income | any | null;
}

const AddRecord: React.FC<AddRecordProps> = ({ 
  settings, wealthItems, rules = [], onAddRule, onAdd, onAddIncome, onAddBill, onUpdateBill, onAddRecurring, onTransfer, onUpdateExpense, onUpdateIncome, onDelete, onCancel, initialData, expenses = []
}) => {
  const isEditing = !!(initialData && initialData.id);
  const isAffordabilityInitial = initialData?.mode === 'Affordability';
  
  const getInitialMode = () => {
    if (initialData?.mode === 'Affordability') return 'Expense';
    if (initialData?.mode) return initialData.mode;
    if (initialData?.subCategory === 'Transfer' || initialData?.recordType === 'transfer') return 'Transfer';
    if (initialData?.type && ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'].includes(initialData.type)) return 'Income';
    if (initialData?.dueDate || ('isPaid' in (initialData || {}))) return 'Bill';
    return 'Expense';
  };

  const [mode, setMode] = useState<'Expense' | 'Income' | 'Transfer' | 'Bill' | 'Recurring'>(getInitialMode());
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || initialData?.dueDate || new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState(initialData?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'UPI');
  const [category, setCategory] = useState<Category>(initialData?.category || 'Needs');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || 'General');
  const [merchant, setMerchant] = useState(initialData?.merchant || '');
  const [frequency, setFrequency] = useState<Frequency>(initialData?.frequency || 'None');
  const [targetWealthId, setTargetWealthId] = useState<string>(initialData?.targetAccountId || '');
  const [sourceWealthId, setSourceWealthId] = useState<string>(initialData?.sourceAccountId || '');
  const [incomeType, setIncomeType] = useState<IncomeType>(initialData?.type || 'Salary');
  const [isAssessing, setIsAssessing] = useState(false);
  const [isAnalyzingSms, setIsAnalyzingSms] = useState(false);
  const [decisionAdvice, setDecisionAdvice] = useState<any | null>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Card'].includes(i.category));
  const isModeLocked = !!(initialData?.mode || isEditing);

  const handleRunAssessment = async () => {
    if (!amount || !merchant || isAssessing) return;
    triggerHaptic(); setIsAssessing(true);
    try {
      const advice = await getDecisionAdvice(expenses || [], wealthItems, settings, 'Purchase', merchant, Math.round(parseFloat(amount)));
      setDecisionAdvice(advice);
    } catch (e) {} finally { setIsAssessing(false); }
  };

  const handlePasteSMS = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setIsAnalyzingSms(true);
      const result = await parseTransactionText(text, settings.currency);
      if (result) {
        setAmount(result.amount.toString());
        setMerchant(result.merchant);
        setCategory(result.category);
        setSubCategory(result.subCategory);
        setDate(result.date);
        if (result.entryType === 'Income') setMode('Income');
        else setMode('Expense');
      }
    } catch (e) {} finally { setIsAnalyzingSms(false); }
  };

  const handleInternalSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const roundedAmount = Math.round(parseFloat(amount) || 0);
    if (mode === 'Expense') {
      const payload = { amount: roundedAmount, date, category, subCategory, note, merchant: merchant || note, paymentMethod, sourceAccountId: sourceWealthId, isConfirmed: true };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, frequency);
    } else if (mode === 'Income') {
      const payload = { amount: roundedAmount, date, type: incomeType, note, paymentMethod, targetAccountId: targetWealthId };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    } else if (mode === 'Bill') {
      const payload = { amount: roundedAmount, dueDate: date, merchant: merchant || note, category, isPaid: initialData?.isPaid || false, note, frequency };
      if (isEditing && onUpdateBill) onUpdateBill(initialData.id, payload);
      else if (onAddBill) onAddBill(payload);
    } else if (mode === 'Recurring' && onAddRecurring) {
        onAddRecurring({ amount: roundedAmount, nextDueDate: date, merchant: merchant || note, category, subCategory, note, frequency: frequency === 'None' ? 'Monthly' : frequency });
    } else if (mode === 'Transfer' && onTransfer) {
      if (sourceWealthId && targetWealthId) onTransfer(sourceWealthId, targetWealthId, roundedAmount, date, note);
    }
    onCancel();
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-[11px] font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-brand-primary/50 transition-colors";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onCancel} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-[32px] shadow-2xl flex flex-col max-h-[85vh] animate-slide-up border border-white/5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b dark:border-slate-800/60 bg-white dark:bg-slate-950 z-20 shrink-0">
          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white leading-none">
              {isAffordabilityInitial ? 'Assessment' : isEditing ? 'Update Registry' : 'Provision Entry'}
            </h3>
            <p className="text-[7px] font-black text-slate-400 uppercase mt-1.5 tracking-widest opacity-60">Wealth Protocol 4.0</p>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditing && !isAffordabilityInitial && (
              <button onClick={handlePasteSMS} disabled={isAnalyzingSms} className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl active:scale-90 transition-transform">
                {isAnalyzingSms ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
            )}
            <button onClick={onCancel} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400 active:scale-90 transition-all"><X size={18} strokeWidth={3} /></button>
          </div>
        </div>

        {/* Mode Selector Dropdown */}
        {!isModeLocked && !isAffordabilityInitial && (
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/40 border-b dark:border-slate-800/40 shrink-0">
             <div className="relative">
                <select 
                  value={mode}
                  onChange={(e) => { triggerHaptic(); setMode(e.target.value as any); }}
                  className="w-full bg-white dark:bg-slate-800 p-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                >
                  {(['Expense', 'Income', 'Bill', 'Transfer', 'Recurring'] as const).map(m => (
                    <option key={m} value={m}>{m} Module</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
             </div>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 pb-12">
          
          {/* Amount Section */}
          <div className="space-y-1">
             <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Capital Value</span>
             <div className="relative border-b-2 border-slate-100 dark:border-slate-800/60 pb-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 py-2 text-4xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-transparent text-slate-900 dark:text-white tracking-tighter"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-1.5">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {mode === 'Recurring' ? 'Renewal Date' : mode === 'Bill' ? 'Due Date' : 'Event Date'}
                </span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl text-[10px] font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white" />
             </div>
             <div className="space-y-1.5">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Counterparty</span>
                <input type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Uber, Salary, etc." className="w-full bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white" />
             </div>
          </div>

          {isAffordabilityInitial && (
            <button onClick={handleRunAssessment} disabled={!amount || !merchant || isAssessing} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-[0.98] transition-all text-[10px] font-black uppercase tracking-widest">
              {isAssessing ? <Loader2 size={14} className="animate-spin" /> : <Compass size={16} />}
              Compute Strategy
            </button>
          )}

          {decisionAdvice && (
            <div className="p-5 bg-indigo-600 rounded-[28px] text-white space-y-2 shadow-2xl animate-kick relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12"><Compass size={60} /></div>
               <div className="flex justify-between items-center relative z-10">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-80">Audit Results</span>
                  <span className="text-[9px] font-black bg-white/20 px-2 py-0.5 rounded-lg">{decisionAdvice.score}% Strategy Score</span>
               </div>
               <p className="text-[11px] font-bold leading-snug italic relative z-10">"{decisionAdvice.reasoning}"</p>
            </div>
          )}

          <div className="space-y-6">
            {(mode === 'Expense' || mode === 'Bill' || mode === 'Recurring') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Layers size={8} /> Category</span>
                  <div className="relative">
                    <select 
                      value={category} 
                      onChange={(e) => { 
                        const newCat = e.target.value as Category;
                        setCategory(newCat); 
                        setSubCategory(SUB_CATEGORIES[newCat][0]); 
                      }} 
                      className={selectClasses}
                    >
                      {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Tag size={8} /> Label</span>
                  <div className="relative">
                    <select 
                      value={subCategory} 
                      onChange={(e) => setSubCategory(e.target.value)} 
                      className={selectClasses}
                    >
                      {SUB_CATEGORIES[category].map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {mode === 'Income' && (
              <div className="space-y-1.5">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Landmark size={8} /> Source Type</span>
                <div className="relative">
                  <select 
                    value={incomeType} 
                    onChange={(e) => setIncomeType(e.target.value as IncomeType)} 
                    className={selectClasses}
                  >
                    {(['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as IncomeType[]).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
               {mode !== 'Transfer' && mode !== 'Recurring' && (
                 <div className="space-y-1.5">
                   <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Wallet size={8} /> Account Binding</span>
                   <div className="relative">
                     <select 
                       value={mode === 'Income' ? targetWealthId : sourceWealthId} 
                       onChange={(e) => mode === 'Income' ? setTargetWealthId(e.target.value) : setSourceWealthId(e.target.value)}
                       className={selectClasses}
                     >
                       <option value="">Vault Unbound</option>
                       {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                     </select>
                     <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                   </div>
                 </div>
               )}

               {mode === 'Transfer' ? (
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">From Source</span>
                     <div className="relative">
                       <select value={sourceWealthId} onChange={(e) => setSourceWealthId(e.target.value)} className={selectClasses}>
                         <option value="">Select Account</option>
                         {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                       </select>
                       <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                     </div>
                   </div>
                   <div className="space-y-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">To Destination</span>
                     <div className="relative">
                       <select value={targetWealthId} onChange={(e) => setTargetWealthId(e.target.value)} className={selectClasses}>
                         <option value="">Select Account</option>
                         {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                       </select>
                       <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        {mode === 'Income' ? <CreditCard size={8} /> : <Repeat size={8} />}
                        {mode === 'Income' ? 'Protocol' : 'Cycle'}
                     </span>
                     <div className="relative">
                       {mode === 'Income' ? (
                          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={selectClasses}>
                              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                       ) : (
                          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={selectClasses}>
                              <option value="None">One-time</option>
                              <option value="Weekly">Weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Yearly">Yearly</option>
                          </select>
                       )}
                       <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                     </div>
                   </div>
                   
                   {/* Method or Extra info based on mode */}
                   <div className="space-y-1.5">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrument</span>
                     <div className="relative">
                        <select 
                          value={paymentMethod} 
                          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                          className={selectClasses}
                        >
                          {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                     </div>
                   </div>
                 </div>
               )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MessageSquare size={8} /> Context Note</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Entry documentation..." className="w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-[10px] font-bold outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white resize-none h-16" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0 z-30">
          <div className="flex gap-2.5">
             {isEditing && (
               <button onClick={onDelete} className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl active:scale-90 transition-transform">
                  <Trash2 size={20} />
               </button>
             )}
             <button onClick={handleInternalSubmit} disabled={!amount} className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
               <Check size={16} strokeWidth={4} /> {isEditing ? 'Update Entry' : 'Authorize Entry'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddRecord;