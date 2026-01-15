import React, { useState } from 'react';
import { UserSettings, WealthItem } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, Wallet, Calendar, MessageSquare, ArrowRightLeft } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddTransferProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  onTransfer: (fromId: string, toId: string, amount: number, date: string, note: string) => void;
  onCancel: () => void;
}

const AddTransfer: React.FC<AddTransferProps> = ({ settings, wealthItems, onTransfer, onCancel }) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const currencySymbol = getCurrencySymbol(settings.currency);
  const liquidAccounts = wealthItems.filter(i => ['Savings', 'Cash', 'Card'].includes(i.category));

  const handleSubmit = () => {
    if (!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
    triggerHaptic(20);
    onTransfer(fromAccountId, toAccountId, Math.round(parseFloat(amount)), date, note);
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl text-[11px] font-bold outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-brand-primary/50 transition-colors";
  const inputLabelClass = "text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1 mb-1";

  // Fill logic: just a subtle pulse for transfer
  const fillPercentage = 40;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border border-white/10 overflow-hidden">
        
        {/* Header with JK Briefcase */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-indigo-500 transition-all duration-700">
                <path d="M6 10V20C6 21.1046 6.89543 22 8 22H16C17.1046 22 18 21.1046 18 20V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M4 8H20C20.5523 8 21 8.44772 21 9V11C21 11.5523 20.5523 12 20 12H4C3.44772 12 3 11.5523 3 11V9C3 8.44772 3.44772 8 4 8Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 8V6C9 4.89543 9.89543 4 11 4H13C14.1046 4 15 4.89543 15 6V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="7" y={20 - (10 * fillPercentage / 100)} width="10" height={10 * fillPercentage / 100} fill="currentColor" className="opacity-40" rx="1" />
              </svg>
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">
              Capital Transfer
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
          
          <div className="space-y-0">
             <span className={inputLabelClass}>Transfer Amount</span>
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

          <div className="space-y-0.5">
             <span className={inputLabelClass}><Calendar size={8} /> Execution Date</span>
             <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClasses} />
          </div>

          <div className="grid grid-cols-1 gap-3">
             <div className="space-y-0.5">
                <span className={inputLabelClass}><ArrowRightLeft size={8} /> Origin (From)</span>
                <div className="relative">
                  <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Select Source Account</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-0.5">
                <span className={inputLabelClass}><ArrowRightLeft size={8} /> Destination (To)</span>
                <div className="relative">
                  <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className={selectClasses}>
                    <option value="">Select Target Account</option>
                    {liquidAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.alias || acc.name}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="space-y-0.5">
            <span className={inputLabelClass}><MessageSquare size={8} /> Purpose</span>
            <input 
              type="text" 
              value={note} 
              onChange={(e) => setNote(e.target.value)} 
              placeholder="Internal rebalancing..." 
              className={selectClasses} 
            />
          </div>
        </div>

        <div className="p-4 border-t dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <button 
            onClick={handleSubmit} 
            disabled={!amount || !fromAccountId || !toAccountId || fromAccountId === toAccountId} 
            className="w-full py-3.5 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check size={16} strokeWidth={4} /> Authorize Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddTransfer;