import React, { useState } from 'react';
import { 
  Category, Expense, UserSettings, Frequency, 
  Income, WealthItem, PaymentMethod 
} from '../types';
import { getCurrencySymbol, SUB_CATEGORIES } from '../constants';
import { 
  Check, X, ChevronDown, Wallet, Calendar, Tag, Layers, MessageSquare, Trash2
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddExpenseProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onAdd: (expense: Omit<Expense, 'id'>, frequency: Frequency) => void;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => void;
  onUpdateIncome?: (id: string, updates: Partial<Income>) => void;
  onDelete?: () => void;
  onCancel: () => void;
  initialData?: any | null;
}

const AddExpense: React.FC<AddExpenseProps> = ({ 
  settings, wealthItems, onAdd, onAddIncome, onUpdateExpense, onUpdateIncome, onDelete, onCancel, initialData
}) => {
  const isEditing = !!(initialData && initialData.id);
  const [mode] = useState<'Expense' | 'Income'>(
    initialData?.mode === 'Income' || initialData?.type ? 'Income' : 'Expense'
  );

  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [details, setDetails] = useState(initialData?.merchant || initialData?.note || '');
  const [bucket, setBucket] = useState<Category>(initialData?.category || 'Needs');
  const [category, setCategory] = useState(initialData?.subCategory || SUB_CATEGORIES['Needs'][0]);
  const [sourceWealthId, setSourceWealthId] = useState<string>(initialData?.sourceAccountId || initialData?.targetAccountId || '');

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Card'].includes(i.category));

  const handleInternalSubmit = () => {
    if (!amount) return;
    triggerHaptic(20);
    const roundedAmount = Math.round(parseFloat(amount) || 0);
    
    if (mode === 'Expense') {
      const payload = { 
        amount: roundedAmount, 
        date, 
        category: bucket, 
        subCategory: category, 
        note: details, 
        merchant: details, 
        paymentMethod: 'UPI' as PaymentMethod, 
        sourceAccountId: sourceWealthId, 
        isConfirmed: true 
      };
      if (isEditing && onUpdateExpense) onUpdateExpense(initialData.id, payload);
      else onAdd(payload, 'None');
    } else if (mode === 'Income') {
      const payload = { 
        amount: roundedAmount, 
        date, 
        type: 'Other' as any, 
        note: details, 
        targetAccountId: sourceWealthId 
      };
      if (isEditing && onUpdateIncome) onUpdateIncome(initialData.id, payload);
      else onAddIncome(payload);
    }
    onCancel();
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-[11px] font-bold outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-brand-primary/50 transition-colors";
  const inputLabelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1 mb-1";

  // Briefcase Fill Logic: Percentage of a hypothetical "Daily Budget" (Monthly Income / 30)
  const dailyBudget = settings.monthlyIncome / 30 || 1000;
  const fillPercentage = Math.max(5, Math.min(100, (parseFloat(amount || '0') / dailyBudget) * 100));

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border border-white/10 overflow-hidden">
        
        {/* Header with JK Briefcase */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-brand-primary transition-all duration-700">
                <path d="M6 10V20C6 21.1046 6.89543 22 8 22H16C17.1046 22 18 21.1046 18 20V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4 8H20C20.5523 8 21 8.44772 21 9V11C21 11.5523 20.5523 12 20 12H4C3.44772 12 3 11.5523 3 11V9C3 8.44772 3.44772 8 4 8Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 8V6C9 4.89543 9.89543 4 11 4H13C14.1046 4 15 4.89543 15 6V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                {/* Dynamic Fill Rect */}
                <rect x="7" y={20 - (10 * fillPercentage / 100)} width="10" height={10 * fillPercentage / 100} fill="currentColor" className="transition-all duration-700" rx="1" />
              </svg>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">
              {isEditing ? 'Update Entry' : 'Add Expense'}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        {/* Form Body - Reduced Padding */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          
          {/* Amount Section */}
          <div className="space-y-0">
             <span className={inputLabelClass}>Capital Outflow</span>
             <div className="relative border-b border-slate-100 dark:border-slate-800/60 pb-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full pl-6 py-1 text-3xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-transparent text-slate-900 dark:text-white tracking-tighter"
                />
             </div>
          </div>

          {/* Grid: Date & Account */}
          <div className="grid grid-cols-2 gap-3">
             <div className="space-y-0.5">
                <span className={inputLabelClass}><Calendar size={8} /> Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
             </div>
             <div className="space-y-0.5">
                <span className={inputLabelClass}><Wallet size={8} /> Account</span>
                <div className="relative">
                  <select value={sourceWealthId} onChange={(e) => setSourceWealthId(e.target.value)} className={selectClasses}>
                    <option value="">Unbound</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          {/* Grid: Bucket & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0.5">
              <span className={inputLabelClass}><Layers size={8} /> Bucket</span>
              <div className="relative">
                <select 
                  value={bucket} 
                  onChange={(e) => { 
                    const b = e.target.value as Category;
                    setBucket(b); 
                    setCategory(SUB_CATEGORIES[b][0]); 
                  }} 
                  className={selectClasses}
                >
                  {(['Needs', 'Wants', 'Savings'] as Category[]).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className={inputLabelClass}><Tag size={8} /> Category</span>
              <div className="relative">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClasses}>
                  {SUB_CATEGORIES[bucket].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-0.5">
            <span className={inputLabelClass}><MessageSquare size={8} /> Details</span>
            <input 
              type="text" 
              value={details} 
              onChange={(e) => setDetails(e.target.value)} 
              placeholder="Merchant or context..." 
              className={selectClasses} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex gap-2">
             {isEditing && (
               <button onClick={onDelete} className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={18} />
               </button>
             )}
             <button onClick={handleInternalSubmit} disabled={!amount} className="flex-1 py-3.5 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
               <Check size={16} strokeWidth={4} /> {isEditing ? 'Update' : 'Confirm Entry'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpense;