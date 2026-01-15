import React, { useMemo, useState, useEffect, useRef } from 'react';
import { WealthItem, UserSettings, Expense, Income } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowUpRight, ArrowDownRight, TrendingUp,
  ArrowLeft, ArrowRight, History, ArrowUpCircle, ArrowRightLeft,
  Wallet, PiggyBank, Briefcase, Trash2
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

const SwipeableAccountItem: React.FC<{
  item: WealthItem;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: WealthItem, e: React.MouseEvent) => void;
  onClick: () => void;
}> = ({ item, currencySymbol, onDelete, onEdit, onClick }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const totalMovementRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; totalMovementRef.current = 0; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(diff));
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -60) { 
      if (window.confirm(`Permanently decommission "${item.alias || item.name}"?`)) {
        triggerHaptic(30); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); 
      } else { setOffsetX(0); }
    } else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[80px] opacity-100'}`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-4">
        <Trash2 className="text-white" size={14} />
      </div>
      <div 
        onClick={() => totalMovementRef.current < 10 && (triggerHaptic(), onClick())}
        className={`relative z-10 py-2 flex items-center justify-between group cursor-pointer bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800 transition-all px-2`}
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'Liability' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-500' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500'}`}>
            <Wallet size={14} />
          </div>
          <div className="min-w-0">
            <h4 className="font-black text-slate-800 dark:text-slate-200 text-[11px] leading-tight truncate tracking-tight">{item.alias || item.name}</h4>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <p className={`text-[12px] font-black tracking-tight ${item.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
          <button onClick={(e) => onEdit(item, e)} className="p-1.5 text-slate-300 hover:text-indigo-500 active:scale-90 transition-all"><Edit3 size={12} /></button>
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
    return { netWorth: Math.round(assets - liabilities) };
  }, [wealthItems]);

  const sectionClass = `glass premium-card p-3 rounded-[20px] mb-2 relative overflow-hidden shadow-sm`;

  return (
    <div className="pb-32 pt-0 animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-3 py-3 rounded-xl mb-1 mx-0.5 shadow-md h-[50px] flex items-center justify-between">
        <div>
          <h1 className="text-xs font-black text-white uppercase leading-none tracking-tight">Accounts</h1>
          <p className="text-[7px] font-bold text-white/60 uppercase tracking-[0.2em] mt-0.5">Vault Protocol</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onAddTransferClick} className="p-2 bg-white/10 rounded-xl text-white active:scale-95"><ArrowRightLeft size={16} /></button>
          <button onClick={onAddAccountClick} className="p-2 bg-white/20 rounded-xl text-white active:scale-95"><Plus size={16} strokeWidth={3} /></button>
        </div>
      </div>

      <div className="px-0.5">
        <section className={sectionClass}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Equity</p>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                <span className="text-sm opacity-30 mr-1 font-bold">{currencySymbol}</span>
                {stats.netWorth.toLocaleString()}
              </h2>
            </div>
            <ShieldCheck size={20} className="text-emerald-500" />
          </div>
        </section>

        <div className="space-y-2 mt-1">
          <section className={sectionClass}>
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5 pl-0.5">Capital Assets</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 -mx-3">
              {wealthItems.filter(i => i.type === 'Investment').map(item => (
                <SwipeableAccountItem key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={onEditAccount} onClick={() => {}} />
              ))}
            </div>
          </section>

          <section className={sectionClass}>
            <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2.5 pl-0.5">Liability Nodes</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60 -mx-3">
              {wealthItems.filter(i => i.type === 'Liability').map(item => (
                <SwipeableAccountItem key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={onEditAccount} onClick={() => {}} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Accounts;