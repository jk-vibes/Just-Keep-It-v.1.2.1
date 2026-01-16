import React, { useState } from 'react';
import { WealthItem, WealthType, WealthCategory, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { Check, X, ChevronDown, Wallet, Landmark, CreditCard, Trash2, ShieldCheck, Tag, Folder } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AddAccountProps {
  settings: UserSettings;
  onSave: (item: Omit<WealthItem, 'id'>) => void;
  onUpdate?: (id: string, updates: Partial<WealthItem>) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WealthItem | null;
}

const ASSET_CATEGORIES: WealthCategory[] = ['Savings', 'Pension', 'Gold', 'Investment', 'Cash', 'Other'];
const LIABILITY_CATEGORIES: WealthCategory[] = ['Credit Card', 'Personal Loan', 'Home Loan', 'Overdraft', 'Gold Loan', 'Other'];

const AddAccount: React.FC<AddAccountProps> = ({ settings, onSave, onUpdate, onDelete, onCancel, initialData }) => {
  const isEditing = !!(initialData && initialData.id);
  const [type, setType] = useState<WealthType>(initialData?.type || 'Investment');
  const [category, setCategory] = useState<WealthCategory>(initialData?.category || 'Savings');
  const [groupName, setGroupName] = useState(initialData?.group || '');
  const [name, setName] = useState(initialData?.name || '');
  const [alias, setAlias] = useState(initialData?.alias || '');
  const [value, setValue] = useState(initialData ? initialData.value.toString() : '');
  const [limit, setLimit] = useState(initialData?.limit ? Math.round(initialData.limit).toString() : '');

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleSubmit = () => {
    if (!name || value === '') return;
    triggerHaptic(20);
    const payload: Omit<WealthItem, 'id'> = {
      type, 
      category, 
      group: groupName.trim() || category, // Default to category if group is empty
      name: name.trim(), 
      alias: (alias || name).trim(),
      value: Math.round(parseFloat(value) || 0),
      date: new Date().toISOString()
    };
    if (category === 'Credit Card' && limit) payload.limit = Math.round(parseFloat(limit) || 0);

    if (isEditing && onUpdate && initialData?.id) onUpdate(initialData.id, payload);
    else onSave(payload);
  };

  const selectClasses = "w-full bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-[13px] font-bold outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer focus:border-brand-primary/50 transition-colors";
  const inputLabelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1 mb-1.5";

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] animate-slide-up border border-white/5 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
              <Landmark size={18} />
            </div>
            <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-900 dark:text-white">
              {isEditing ? 'Update Account' : 'Add Account'}
            </h3>
          </div>
          <button onClick={onCancel} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-400 active:scale-90 transition-all"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
          
          <div className="space-y-1">
             <span className={inputLabelClass}>Account Balance</span>
             <div className="relative border-b-2 border-slate-100 dark:border-slate-800/60 pb-1.5">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 dark:text-slate-700">{currencySymbol}</span>
                <input
                  autoFocus
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                  className="w-full pl-7 py-1 text-4xl font-black border-none outline-none focus:ring-0 placeholder-slate-100 bg-transparent text-slate-900 dark:text-white tracking-tighter"
                />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
             <div className="space-y-1">
                <span className={inputLabelClass}><ShieldCheck size={10} /> Protocol Type</span>
                <div className="relative">
                  <select 
                    value={type} 
                    onChange={(e) => {
                      const newType = e.target.value as WealthType;
                      setType(newType);
                      setCategory(newType === 'Investment' ? 'Savings' : 'Credit Card');
                    }} 
                    className={selectClasses}
                  >
                    <option value="Investment">Debt</option>
                    <option value="Liability">Credit</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
             <div className="space-y-1">
                <span className={inputLabelClass}><CreditCard size={10} /> Classification</span>
                <div className="relative">
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value as WealthCategory)} 
                    className={selectClasses}
                  >
                    {(type === 'Investment' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
             </div>
          </div>

          <div className="space-y-1">
            <span className={inputLabelClass}><Folder size={10}/> Display Group</span>
            <input 
              type="text" 
              value={groupName} 
              onChange={(e) => setGroupName(e.target.value)} 
              placeholder="e.g. Gold, Savings, Home Loan" 
              className={selectClasses} 
            />
          </div>

          <div className="space-y-1">
            <span className={inputLabelClass}><Wallet size={10}/> Friendly Alias</span>
            <input 
              type="text" 
              value={alias} 
              onChange={(e) => setAlias(e.target.value)} 
              placeholder="e.g. Primary Bank" 
              className={selectClasses} 
            />
          </div>

          <div className="space-y-1">
            <span className={inputLabelClass}><Tag size={10}/> Registry Label</span>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Internal Identifier" 
              className={selectClasses} 
            />
          </div>

          {category === 'Credit Card' && (
            <div className="space-y-1 animate-kick">
              <span className={inputLabelClass}>Credit Limit</span>
              <input 
                type="number" 
                value={limit} 
                onChange={(e) => setLimit(e.target.value)} 
                placeholder="0" 
                className={selectClasses} 
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800/60 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex gap-2.5">
             {isEditing && onDelete && (
               <button onClick={() => { triggerHaptic(); if(window.confirm('Decommission this account?')) onDelete(initialData!.id); }} className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-xl active:scale-90 transition-all">
                  <Trash2 size={20} />
               </button>
             )}
             <button onClick={handleSubmit} disabled={!name || value === ''} className="flex-1 py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-xl text-[12px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
               <Check size={18} strokeWidth={4} /> {isEditing ? 'Update Registry' : 'Provision Account'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccount;