
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Expense, BudgetRule, UserSettings, Category, UserProfile, Frequency, RecurringItem, Income, IncomeType, AppTheme, Notification, WealthItem, WealthType, WealthCategory, DensityLevel, BudgetItem, Bill } from './types';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import AddRecord from './components/AddRecord';
import AddAccount from './components/AddAccount';
import AddTransfer from './components/AddTransfer';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import CategorizationModal from './components/CategorizationModal';
import NotificationPane from './components/NotificationPane';
import AuthScreen from './components/AuthScreen';
import Accounts from './components/Accounts';
import VersionLog from './components/VersionLog';
import BudgetPlanner from './components/BudgetPlanner';
import SmartAlert from './components/SmartAlert';
import Footer from './components/Footer';
import RulesEngine from './components/RulesEngine';
import ImportReviewModal from './components/ImportReviewModal';
import AskMe from './components/AskMe';
import { Loader2, LayoutDashboard, List, Settings as SettingsIcon, Bell, Wallet, Target, Cpu, X, Sparkles, FolderOpen, CheckCircle2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { DEFAULT_SPLIT, getCurrencySymbol } from './constants';
import { syncToGoogleDrive, restoreFromGoogleDrive, BackupData } from './services/cloudSync';
import { triggerHaptic } from './utils/haptics';
import { parseSmsLocally } from './utils/smsParser';
import { NarutoIcon, SpiderIcon, CaptainAmericaIcon, BatmanIcon } from './components/ThemeSymbols';

const STORAGE_KEY = 'jk_budget_data_whole_num_v12';

const INITIAL_SETTINGS: UserSettings = {
  monthlyIncome: 0,
  split: DEFAULT_SPLIT,
  isOnboarded: true, 
  theme: 'system',
  appTheme: 'Spiderman',
  isCloudSyncEnabled: false,
  currency: 'INR',
  dataFilter: 'all',
  density: 'Compact',
  hasLoadedMockData: false
};

const Toast: React.FC<{ message: string; type?: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 8000); // Extended to 8s for readability
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-32 left-6 z-[300] animate-slide-up px-5 py-4 rounded-[24px] shadow-2xl backdrop-blur-2xl border border-white/10 flex items-center gap-3 max-w-[85vw] bg-slate-900/95 text-white">
      <div className="shrink-0">
        {type === 'success' ? <CheckCircle2 className="text-emerald-400" size={18} /> : type === 'error' ? <AlertCircle className="text-rose-400" size={18} /> : <Sparkles className="text-indigo-400 animate-pulse" size={18} />}
      </div>
      <span className="text-[12px] font-bold leading-tight flex-1">
        {message}
      </span>
      <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors ml-2"><X size={14} /></button>
    </div>
  );
};

const ThemeBackground: React.FC<{ theme: AppTheme }> = ({ theme }) => {
  const Icon = useMemo(() => {
    if (theme === 'Naruto') return NarutoIcon;
    if (theme === 'CaptainAmerica') return CaptainAmericaIcon;
    if (theme === 'Batman') return BatmanIcon;
    return SpiderIcon;
  }, [theme]);

  const isSpider = theme === 'Spiderman';

  return (
    <div className="fixed bottom-0 right-0 pointer-events-none z-0 overflow-visible transition-all duration-700">
      <div 
        className={`w-[55vw] h-[55vw] sm:w-[38vh] sm:h-[38vh] transition-all duration-1000 origin-center flex items-center justify-center opacity-[0.22] dark:opacity-[0.14]
          ${isSpider 
            ? 'rotate-[-22deg] translate-x-[2%] translate-y-[2%] scale-x-[-1]' 
            : 'rotate-[-10deg] translate-x-[2%] translate-y-[2%] scale-x-[-1]'
          }
        `}
        style={{
          filter: 'drop-shadow(10px 10px 20px rgba(0,0,0,0.1))'
        }}
      >
        <Icon />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(INITIAL_SETTINGS);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [wealthItems, setWealthItems] = useState<WealthItem[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<View>('Dashboard');
  const [isAddingRecord, setIsAddingRecord] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [isAddingTransfer, setIsAddingTransfer] = useState(false);
  const [isShowingAskMe, setIsShowingAskMe] = useState(false);
  const [isReviewingImport, setIsReviewingImport] = useState(false);
  const [stagedImportItems, setStagedImportItems] = useState<any[]>([]);
  const [accountToEdit, setAccountToEdit] = useState<WealthItem | null>(null);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [isShowingVersionLog, setIsShowingVersionLog] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<any | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => { setToast({ message, type }); }, []);

  const globalMetrics = useMemo(() => {
    const m = viewDate.getMonth(); const y = viewDate.getFullYear();
    const assets = wealthItems.filter(i => i.type === 'Investment').reduce((sum, i) => sum + i.value, 0);
    const liabilities = wealthItems.filter(i => i.type === 'Liability').reduce((sum, i) => sum + i.value, 0);
    const netWorth = assets - liabilities;
    const currentExps = expenses.filter(e => {
      if (!e.date) return false;
      const parts = e.date.split('-');
      const ey = parseInt(parts[0]); const em = parseInt(parts[1]) - 1;
      return em === m && ey === y && e.subCategory !== 'Transfer';
    });
    const totals = { Needs: 0, Wants: 0, Savings: 0 };
    currentExps.forEach(e => { if (totals[e.category as keyof typeof totals] !== undefined) totals[e.category as keyof typeof totals] += e.amount; });
    const monthlyIncome = incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === m && d.getFullYear() === y; }).reduce((sum, i) => sum + i.amount, 0) || settings.monthlyIncome || 1;
    const caps = { Needs: (monthlyIncome * settings.split.Needs) / 100 || 1, Wants: (monthlyIncome * settings.split.Wants) / 100 || 1, Savings: (monthlyIncome * settings.split.Savings) / 100 || 1 };
    const categoryPercentages = { Needs: Math.min(100, (totals.Needs / caps.Needs) * 100), Wants: Math.min(100, (totals.Wants / caps.Wants) * 100), Savings: Math.min(100, (totals.Savings / caps.Savings) * 100) };
    const totalSpent = totals.Needs + totals.Wants + totals.Savings;
    const remainingPercentage = Math.max(0, ((monthlyIncome - totalSpent) / monthlyIncome) * 100);
    return { categoryPercentages, remainingPercentage, netWorth };
  }, [expenses, incomes, wealthItems, settings, viewDate]);

  const addNotification = useCallback((notif: Omit<Notification, 'timestamp' | 'read'> & { id?: string }) => {
    const id = notif.id || Math.random().toString(36).substring(2, 11);
    const newNotif: Notification = { ...notif, id, timestamp: new Date().toISOString(), read: false };
    setNotifications(prev => {
      const index = prev.findIndex(n => n.id === id);
      if (index !== -1) { const updated = [...prev]; updated[index] = { ...updated[index], ...newNotif }; return updated; }
      return [newNotif, ...prev].slice(0, 50);
    });
  }, []);

  const onUpdateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setExpenses(prev => {
      const original = prev.find(e => e.id === id);
      if (!original) return prev;
      const newExpenses = prev.map(e => e.id === id ? { ...e, ...updates } : e);
      if (updates.category || updates.subCategory) {
        const merchantToMatch = updates.merchant || original.merchant;
        if (merchantToMatch && merchantToMatch !== 'General' && merchantToMatch !== 'Transfer' && merchantToMatch !== 'Unknown') {
          return newExpenses.map(e => {
            if (e.id !== id && e.merchant === merchantToMatch) return { ...e, category: updates.category ?? e.category, subCategory: updates.subCategory ?? e.subCategory, isConfirmed: true, isAIUpgraded: true };
            return e;
          });
        }
      }
      return newExpenses;
    });
    showToast("Ledger record updated");
  }, [showToast]);

  const handleDeleteAccount = useCallback((id: string) => {
    triggerHaptic(40);
    setWealthItems(prev => prev.filter(w => w.id !== id));
    setExpenses(prev => prev.filter(e => e.sourceAccountId !== id));
    setIncomes(prev => prev.filter(i => i.targetAccountId !== id));
    addNotification({ type: 'Activity', title: 'Instrument Purged', message: 'Account and associated statement entries removed.', severity: 'error' });
    showToast("Account & Statement Deleted", "error");
    setAccountToEdit(null); setIsAddingAccount(false);
  }, [addNotification, showToast]);

  const handleDeleteExpense = useCallback((id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (exp?.sourceAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === exp.sourceAccountId) return { ...w, value: w.type === 'Liability' ? w.value - exp.amount : w.value + exp.amount };
        return w;
      }));
    }
    setExpenses(prev => prev.filter(e => e.id !== id));
    showToast("Outflow record removed", "info");
  }, [expenses, showToast]);

  const handleDeleteIncome = useCallback((id: string) => {
    const inc = incomes.find(i => i.id === id);
    if (inc?.targetAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === inc.targetAccountId) return { ...w, value: w.type === 'Liability' ? w.value + inc.amount : w.value - inc.amount };
        return w;
      }));
    }
    setIncomes(prev => prev.filter(i => i.id !== id));
    showToast("Inflow record removed", "info");
  }, [incomes, showToast]);

  const handleAddRule = (rule: Omit<BudgetRule, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setRules(prev => [...prev, { ...rule, id }]);
    showToast("Rule provisioned successfully");
    addNotification({ type: 'Activity', title: 'Rule Provisioned', message: `Keyword "${rule.keyword}" mapped to ${rule.category}.`, severity: 'success' });
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    showToast("Automation rule decommissioned", "info");
    addNotification({ type: 'Activity', title: 'Rule Decommissioned', message: `Automation logic removed.`, severity: 'info' });
  };

  const handleAddRecurring = (item: Omit<RecurringItem, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setRecurringItems(prev => [...prev, { ...item, id }]);
    showToast("Recurring cycle authorized");
    addNotification({ type: 'Activity', title: 'Cycle Provisioned', message: `${item.merchant || item.note} added to schedules.`, severity: 'success' });
  };

  const handleDeleteRecurring = (id: string) => {
    setRecurringItems(prev => prev.filter(i => i.id !== id));
    showToast("Recurring cycle terminated", "info");
  };

  const handleAddBill = (bill: Omit<Bill, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    setBills(prev => [...prev, { ...bill, id }]);
    showToast("Bill registry updated");
  };

  const handleUpdateBill = (id: string, updates: Partial<Bill>) => {
    setBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    showToast("Bill protocol updated");
  };

  const handleDeleteBill = (id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
    showToast("Bill removed", "info");
  };

  const handleViewRule = (ruleId: string) => { triggerHaptic(); setHighlightedRuleId(ruleId); setCurrentView('Rules'); };

  const handleLoadMockData = useCallback(() => {
    triggerHaptic(40);
    const mockAccounts: WealthItem[] = [
      { id: 'acc-1', type: 'Investment', category: 'Savings', name: 'Global Standard', alias: 'Primary Vault', value: 850000, date: new Date().toISOString(), isMock: true },
      // Fixed: Replaced 'Card' with 'Credit Card' to match WealthCategory type
      { id: 'acc-2', type: 'Liability', category: 'Credit Card', name: 'Titanium Edge', alias: 'Edge Credit', value: 45000, limit: 1500000, date: new Date().toISOString(), isMock: true },
      { id: 'acc-3', type: 'Investment', category: 'Investment', name: 'BlackRock Funds', alias: 'S&P 500 ETF', value: 2400000, date: new Date().toISOString(), isMock: true },
      { id: 'acc-4', type: 'Investment', category: 'Cash', name: 'Physical Ledger', alias: 'Emergency Cash', value: 50000, date: new Date().toISOString(), isMock: true }
    ];

    const mockIncomes: Income[] = [];
    const mockExpenses: Expense[] = [];
    const now = new Date();

    const merchants = {
      Needs: ['Reliance Fresh', 'TATA Power', 'Urban Rent', 'HP Petrol', 'Airtel Broadband', 'MedPlus Pharmacy', 'Swiggy Instamart', 'Society Maintenance', 'Water Corp', 'Insurance Premium'],
      Wants: ['Starbucks', 'Netflix', 'Amazon Prime', 'Zomato Dining', 'H&M Fashion', 'PVR Cinemas', 'Steam Games', 'Apple Music', 'Udemy Courses', 'Weekend Getaway'],
      Savings: ['Vanguard SIP', 'HDFC Mutual Fund', 'Digital Gold', 'Crypto Deposit', 'Fixed Income Saver', 'NPS Contribution', 'Public Provident', 'Stock Dividend']
    };

    // Generate 12 months of high-density performance data
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dateKey = monthDate.toISOString().split('T')[0];
      
      // Steady Monthly Income (Scaling up slightly each month for positive trend)
      const baseSalary = 250000 + (11-i) * 5000;
      mockIncomes.push({ 
        id: `inc-salary-${i}`, 
        amount: baseSalary, 
        date: dateKey, 
        type: 'Salary', 
        note: `Monthly Corporate Remuneration - ${year}`, 
        targetAccountId: 'acc-1', 
        isMock: true 
      });

      // Occasional Dividends/Bonuses
      if (i % 3 === 0) {
        mockIncomes.push({ 
          id: `inc-div-${i}`, 
          amount: 15000, 
          date: new Date(year, month, 15).toISOString().split('T')[0], 
          type: 'Investment', 
          note: 'Equity Portfolio Dividends', 
          targetAccountId: 'acc-3', 
          isMock: true 
        });
      }

      // Generate 100 diverse transactions per month to stress test UI performance
      for (let j = 0; j < 100; j++) {
        const day = Math.floor(Math.random() * daysInMonth) + 1;
        const catKeys = Object.keys(merchants) as (keyof typeof merchants)[];
        const category = catKeys[Math.floor(Math.random() * catKeys.length)];
        const merchantList = merchants[category];
        const merchant = merchantList[Math.floor(Math.random() * merchantList.length)];
        
        let amount = 0;
        if (category === 'Needs') amount = Math.floor(Math.random() * 1800) + 200;
        else if (category === 'Wants') amount = Math.floor(Math.random() * 1200) + 100;
        else amount = Math.floor(Math.random() * 4500) + 1500;

        mockExpenses.push({
          id: `exp-${i}-${j}`,
          amount: Math.round(amount),
          date: new Date(year, month, day).toISOString().split('T')[0],
          category: category as Category,
          subCategory: merchant,
          merchant: merchant,
          isConfirmed: true,
          sourceAccountId: Math.random() > 0.3 ? 'acc-1' : 'acc-2',
          isMock: true
        });
      }
    }

    const mockRules: BudgetRule[] = [
      { id: 'rule-1', keyword: 'Starbucks', category: 'Wants', subCategory: 'Dining' },
      { id: 'rule-2', keyword: 'Amazon', category: 'Wants', subCategory: 'Shopping' },
      { id: 'rule-3', keyword: 'Reliance', category: 'Needs', subCategory: 'Groceries' },
      { id: 'rule-4', keyword: 'Vanguard', category: 'Savings', subCategory: 'SIP/Mutual Fund' }
    ];

    const mockBudgets: BudgetItem[] = [
      { id: 'bud-1', name: 'Housing Protocol', amount: 65000, category: 'Needs', subCategory: 'Rent/Mortgage', isMock: true },
      { id: 'bud-2', name: 'Groceries Cap', amount: 25000, category: 'Needs', subCategory: 'Groceries', isMock: true },
      { id: 'bud-3', name: 'Entertainment Allowance', amount: 15000, category: 'Wants', subCategory: 'Entertainment', isMock: true },
      { id: 'bud-4', name: 'Growth SIP', amount: 45000, category: 'Savings', subCategory: 'SIP/Mutual Fund', isMock: true }
    ];

    setWealthItems(mockAccounts);
    setIncomes(mockIncomes);
    setExpenses(mockExpenses);
    setRules(mockRules);
    setBudgetItems(mockBudgets);
    setBills([
      { id: 'bill-1', merchant: 'Airtel Xstream', amount: 1199, dueDate: new Date(now.getFullYear(), now.getMonth(), 20).toISOString().split('T')[0], category: 'Needs', frequency: 'Monthly', isPaid: false },
      { id: 'bill-2', merchant: 'BESCOM', amount: 4500, dueDate: new Date(now.getFullYear(), now.getMonth(), 25).toISOString().split('T')[0], category: 'Needs', frequency: 'Monthly', isPaid: false }
    ]);
    setRecurringItems([
        { id: 'rec-1', amount: 1499, category: 'Wants', subCategory: 'Subscription', note: 'Netflix 4K', merchant: 'Netflix', frequency: 'Monthly', nextDueDate: new Date(now.getFullYear(), now.getMonth(), 28).toISOString().split('T')[0], isMock: true },
        { id: 'rec-2', amount: 65000, category: 'Needs', subCategory: 'Rent/Mortgage', note: 'Villa Lease', merchant: 'Prestige Group', frequency: 'Monthly', nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0], isMock: true }
    ]);
    
    setSettings(prev => ({ ...prev, monthlyIncome: 250000, hasLoadedMockData: true }));
    showToast("1,200+ Performance Signals Ingested");
  }, [showToast]);

  const handleAddBulk = useCallback((items: any[]) => {
    let expCount = 0;
    let incCount = 0;
    let accCount = 0;

    const newExpenses: Expense[] = [];
    const newIncomes: Income[] = [];
    const newWealth: WealthItem[] = [];

    items.forEach(item => {
      if (item.entryType === 'Account') {
        newWealth.push({
          id: Math.random().toString(36).substring(2, 11),
          type: item.wealthType,
          category: item.wealthCategory,
          name: item.name,
          alias: item.name,
          value: item.value,
          date: item.date
        });
        accCount++;
      } else if (item.entryType === 'Income') {
        newIncomes.push({
          id: Math.random().toString(36).substring(2, 11),
          amount: item.amount,
          date: item.date,
          type: item.incomeType || 'Other',
          note: item.merchant,
          targetAccountId: item.targetAccountId
        });
        incCount++;
      } else {
        newExpenses.push({
          id: Math.random().toString(36).substring(2, 11),
          amount: item.amount,
          date: item.date,
          category: item.category,
          subCategory: item.subCategory,
          merchant: item.merchant,
          note: item.rawContent,
          isConfirmed: true,
          sourceAccountId: item.targetAccountId
        });
        expCount++;
      }
    });

    setWealthItems(prev => [...prev, ...newWealth]);
    setIncomes(prev => [...prev, ...newIncomes]);
    setExpenses(prev => [...prev, ...newExpenses]);

    showToast(`Ingested ${expCount + incCount + accCount} records`);
    addNotification({ type: 'Activity', title: 'Ledger Batch Ingested', message: `Successfully mapped ${expCount} outflows, ${incCount} inflows, and ${accCount} accounts.`, severity: 'success' });
  }, [showToast, addNotification]);

  const handlePurgeAllMockData = useCallback(() => {
    triggerHaptic(40);
    setExpenses(prev => prev.filter(e => !e.isMock));
    setIncomes(prev => prev.filter(i => !i.isMock));
    setWealthItems(prev => prev.filter(w => !w.isMock));
    setBudgetItems(prev => prev.filter(b => !b.isMock));
    setRecurringItems(prev => prev.filter(i => !i.isMock));
    setBills(prev => prev.filter(b => !('isMock' in b && (b as any).isMock)));
    setSettings(prev => ({ ...prev, hasLoadedMockData: true }));
    showToast("Simulated dataset scrubbed", "info");
  }, [showToast]);

  const handlePurgeAllData = useCallback(() => {
    triggerHaptic(50);
    if (!window.confirm("Nuclear Protocol: Are you sure you want to delete ALL transactions, accounts, bills, rules and budgets?")) return;
    setExpenses([]); setIncomes([]); setWealthItems([]); setBudgetItems([]); setBills([]); setRules([]); setNotifications([]); setRecurringItems([]);
    showToast("Entire ledger cleared", "error");
  }, [showToast]);

  const handleExportData = () => {
    triggerHaptic();
    const data = { settings, expenses, incomes, wealthItems, bills, budgetItems, notifications, rules, recurringItems };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `jk_vault_snapshot_${new Date().toISOString().split('T')[0]}.json`; a.click();
    URL.revokeObjectURL(url); showToast("Full vault snapshot exported");
  };

  const handleImportData = (file: File) => {
    triggerHaptic();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(parsed.expenses.map((e: any) => ({ ...e, id: e.id || Math.random().toString(36).substring(2, 11), isConfirmed: e.isConfirmed ?? true })));
        if (parsed.incomes) setIncomes(parsed.incomes);
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills);
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.recurringItems) setRecurringItems(parsed.recurringItems);
        showToast("Historical vault data restored");
      } catch (err) { showToast("Vault restoration failed", "error"); }
    };
    reader.readAsText(file);
  };

  const handleSyncToCloud = async () => {
    if (!user?.accessToken) return;
    triggerHaptic(); setIsSyncing(true);
    try {
      const lastSynced = await syncToGoogleDrive(user.accessToken, { expenses, incomes, wealthItems, budgetItems, bills, notifications, settings, rules, recurringItems });
      setSettings(prev => ({ ...prev, lastSynced }));
      showToast("Cloud vault synchronized");
    } catch (e) { showToast("Cloud handshake failed", "error"); } finally { setIsSyncing(false); }
  };

  const handleLogin = async (profile: UserProfile) => { 
    setUser(profile); setSettings(prev => ({ ...prev, isOnboarded: true })); setIsAuthenticated(true); 
    if (profile.accessToken) {
      setIsSyncing(true);
      try {
        const restored = await restoreFromGoogleDrive(profile.accessToken);
        if (restored) {
          setExpenses(restored.expenses.map((e: any) => ({ ...e, isConfirmed: e.isConfirmed ?? true })));
          setIncomes(restored.incomes); setWealthItems(restored.wealthItems || []); 
          setBudgetItems(restored.budgetItems || []); setBills(restored.bills || []); 
          setNotifications(restored.notifications || []); setRules(restored.rules || []);
          setRecurringItems(restored.recurringItems || []);
          setSettings(prev => ({ ...prev, ...restored.settings, lastSynced: restored.timestamp }));
          showToast(`Vault restored for ${profile.name.split(' ')[0]}`);
        }
      } catch (e) { showToast("Session limited to local sandbox", "info"); } finally { setIsSyncing(false); }
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.settings) setSettings(prev => ({ ...INITIAL_SETTINGS, ...parsed.settings }));
        if (parsed.expenses) setExpenses(parsed.expenses.map((e: any) => ({ ...e, id: e.id || Math.random().toString(36).substring(2, 11), isConfirmed: e.isConfirmed ?? true })));
        if (parsed.incomes) setIncomes(parsed.incomes); 
        if (parsed.wealthItems) setWealthItems(parsed.wealthItems);
        if (parsed.bills) setBills(parsed.bills); 
        if (parsed.budgetItems) setBudgetItems(parsed.budgetItems);
        if (parsed.notifications) setNotifications(parsed.notifications); 
        if (parsed.rules) setRules(parsed.rules);
        if (parsed.recurringItems) setRecurringItems(parsed.recurringItems);
        if (parsed.user) { setUser(parsed.user); setIsAuthenticated(true); }
      } catch (e) {}
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { if (!isLoading) localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules, recurringItems })); }, [settings, expenses, incomes, wealthItems, bills, user, budgetItems, notifications, rules, recurringItems, isLoading]);

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
    root.setAttribute('data-theme', settings.appTheme || 'Spiderman');
  }, [settings.theme, settings.appTheme]);

  const handleLogout = () => { triggerHaptic(20); setUser(null); setIsAuthenticated(false); showToast("Authenticated session ended", "info"); };

  const handleTransfer = (fromId: string, toId: string, amount: number, date: string, note: string) => {
    setWealthItems(prev => prev.map(w => {
      if (w.id === fromId) return { ...w, value: w.type === 'Liability' ? w.value + amount : w.value - amount };
      if (w.id === toId) return { ...w, value: w.type === 'Liability' ? w.value - amount : w.value + amount };
      return w;
    }));
    const transferId = Math.random().toString(36).substring(2, 11);
    setExpenses(prev => [...prev, { id: transferId, amount, date, category: 'Uncategorized', subCategory: 'Transfer', merchant: `Transfer`, note: note || 'Internal', isConfirmed: true, sourceAccountId: fromId }]);
    showToast("Transfer completed"); setIsAddingTransfer(false);
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>, frequency: Frequency) => {
    const id = Math.random().toString(36).substring(2, 11);
    const roundedAmt = Math.round(expense.amount); if (roundedAmt === 0) return;
    setExpenses(prev => [...prev, { ...expense, id, amount: roundedAmt }]);
    
    // If it's a recurring expense, add to recurring list
    if (frequency !== 'None') {
        const nextDate = new Date(expense.date);
        if (frequency === 'Weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (frequency === 'Monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        else if (frequency === 'Yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
        
        handleAddRecurring({
            amount: roundedAmt,
            category: expense.category,
            subCategory: expense.subCategory,
            note: expense.note || '',
            merchant: expense.merchant,
            frequency,
            nextDueDate: nextDate.toISOString().split('T')[0]
        });
    }

    if (expense.sourceAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === expense.sourceAccountId) return { ...w, value: w.type === 'Liability' ? w.value - roundedAmt : w.value + roundedAmt };
        return w;
      }));
    }
    showToast("Outflow logged"); setIsAddingRecord(false);
  };

  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    const roundedAmt = Math.round(income.amount); if (roundedAmt === 0) return;
    setIncomes(prev => [...prev, { ...income, amount: roundedAmt, id: Math.random().toString(36).substring(2, 11) }]);
    if (income.targetAccountId) {
      setWealthItems(prev => prev.map(w => {
        if (w.id === income.targetAccountId) return { ...w, value: w.type === 'Liability' ? w.value - roundedAmt : w.value + roundedAmt };
        return w;
      }));
    }
    showToast("Inflow recorded"); setIsAddingRecord(false);
  };

  const handlePayBill = (bill: Bill) => {
    triggerHaptic(30);
    setBills(prev => prev.map(b => b.id === bill.id ? { ...b, isPaid: true } : b));
    handleAddExpense({ amount: bill.amount, date: new Date().toISOString().split('T')[0], category: bill.category, merchant: bill.merchant, note: bill.note || `Settled bill: ${bill.merchant}`, isConfirmed: true, subCategory: 'Bill Payment', billId: bill.id }, 'None');
    addNotification({ type: 'Bill', title: 'Bill Settled', message: `${bill.merchant} of ${getCurrencySymbol(settings.currency)}${Math.round(bill.amount).toLocaleString()} has been logged as paid.`, severity: 'success' });
  };

  const handleViewAction = (view: View) => {
    if (view === 'Add') { 
      triggerHaptic(); 
      if (currentView === 'Accounts' || currentView === 'Rules') { setAccountToEdit(null); setIsAddingAccount(true); } 
      else { setRecordToEdit({ mode: currentView === 'Budget' ? 'Bill' : 'Expense' }); setIsAddingRecord(true); }
    } 
    else if (view === 'Affordability') {
        triggerHaptic();
        setIsShowingAskMe(true);
    }
    else setCurrentView(view);
  };

  const handleFullReset = () => { triggerHaptic(50); if (!window.confirm("Nuclear Alert: This will wipe your profile and history. Proceed?")) return; localStorage.removeItem(STORAGE_KEY); window.location.reload(); };

  const handleToggleOverview = () => {
    triggerHaptic();
    if (currentView === 'Dashboard') setCurrentView('Budget');
    else setCurrentView('Dashboard');
  };

  const handleToggleManagement = () => {
    triggerHaptic();
    if (currentView === 'Accounts') setCurrentView('Rules');
    else setCurrentView('Accounts');
  };

  if (isLoading) return <div className="w-full h-screen bg-brand-bg flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={32} /></div>;
  if (!isAuthenticated) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="h-screen overflow-hidden bg-brand-bg flex flex-col transition-all duration-700 relative text-brand-text">
      <div className="mesh-bg"><div className="mesh-blob"></div></div>
      <ThemeBackground theme={settings.appTheme || 'Spiderman'} />
      
      <header className="flex-none bg-brand-surface/95 px-2 py-3 border-b border-brand-border z-50 backdrop-blur-md transition-colors duration-500">
        <div className="max-w-2xl mx-auto flex justify-between items-center w-full">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-primary"><path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" fill="currentColor" /><path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><text x="12" y="17" fontSize="6" fontWeight="900" textAnchor="middle" fill="white">JK</text></svg>
              <button onClick={() => { triggerHaptic(); setIsShowingVersionLog(true); }} className="bg-brand-bg/50 px-1.5 py-0.5 rounded-full border border-brand-border active:scale-95 transition-transform mt-1"><span className="text-[8px] font-black text-brand-text/50">v1.2.1</span></button>
            </div>
            <h1 className="text-[9px] font-bold text-brand-text lowercase tracking-tight mt-0.5 ml-1">just keep it</h1>
          </div>
          <nav className="flex items-center gap-0.5">
            <button 
              onClick={handleToggleOverview} 
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                (currentView === 'Dashboard' || currentView === 'Budget') 
                  ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                  : 'border-transparent text-brand-text/40'
              }`}
            >
              {currentView === 'Budget' ? <Target size={16} strokeWidth={2.5} /> : <LayoutDashboard size={16} strokeWidth={2.5} />}
            </button>
            <button 
              onClick={handleToggleManagement} 
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${
                (currentView === 'Accounts' || currentView === 'Rules') 
                  ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' 
                  : 'border-transparent text-brand-text/40'
              }`}
            >
              {currentView === 'Rules' ? <Cpu size={16} strokeWidth={2.5} /> : <Wallet size={16} strokeWidth={2.5} />}
            </button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Ledger'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 ${currentView === 'Ledger' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><List size={16} strokeWidth={2.5} /></button>
            <button onClick={() => { triggerHaptic(); setIsShowingNotifications(true); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 relative ${isShowingNotifications ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-transparent text-brand-text/40'}`}><Bell size={16} strokeWidth={2.5} />{notifications.filter(n=>!n.read).length > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-primary text-brand-accent text-[7px] font-black flex items-center justify-center rounded-full border-2 border-brand-bg">{notifications.filter(n=>!n.read).length}</span>}</button>
            <button onClick={() => { triggerHaptic(); setCurrentView('Profile'); }} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 overflow-hidden border-2 ${currentView === 'Profile' ? 'border-brand-primary' : 'border-transparent'}`}>{user?.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="Profile" /> : <SettingsIcon size={16} />}</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
        <div className="max-w-2xl mx-auto w-full px-2 min-h-full flex flex-col">
          <div className="flex-1">
            {currentView === 'Dashboard' && <Dashboard expenses={expenses} incomes={incomes} wealthItems={wealthItems} settings={settings} user={user} onCategorizeClick={() => setIsCategorizing(true)} onConfirmExpense={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onSmartAdd={() => {}} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} onInsightsReceived={() => {}} onAffordabilityCheck={() => handleViewAction('Affordability')} />}
            {currentView === 'Budget' && <BudgetPlanner budgetItems={budgetItems} recurringItems={recurringItems} expenses={expenses} bills={bills} settings={settings} onAddBudget={(b) => setBudgetItems(p => [...p, { ...b, id: Math.random().toString(36).substring(2, 11) }])} onUpdateBudget={(id, u) => setBudgetItems(p => p.map(b => b.id === id ? { ...b, ...u } : b))} onDeleteBudget={(id) => { setBudgetItems(p => p.filter(b => b.id !== id)); showToast("Budget node decommissioned", "info"); }} onPayBill={handlePayBill} onDeleteBill={handleDeleteBill} onEditBill={(b) => { triggerHaptic(); setRecordToEdit(b); setIsAddingRecord(true); }} onSmartAddBill={() => { triggerHaptic(); setRecordToEdit({ mode: 'Bill' }); setIsAddingRecord(true); }} viewDate={viewDate} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Accounts' && <Accounts wealthItems={wealthItems} expenses={expenses} incomes={incomes} settings={settings} onUpdateWealth={(id, u) => { setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w)); showToast("Account registry updated"); }} onDeleteWealth={handleDeleteAccount} onAddWealth={(w) => { setWealthItems(p => [...p, { ...w, id: Math.random().toString(36).substring(2, 11) }]); showToast("New instrument provisioned"); setAccountToEdit(null); setIsAddingAccount(false); } } onEditAccount={(acc) => { setAccountToEdit(acc); setIsAddingAccount(true); }} onAddAccountClick={() => { setAccountToEdit(null); setIsAddingAccount(true); }} onAddIncomeClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Income' }); setIsAddingRecord(true); }} onAddTransferClick={() => { triggerHaptic(); setIsAddingTransfer(true); }} onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} externalShowAdd={false} onAddClose={() => {}} />}
            {currentView === 'Rules' && <RulesEngine rules={rules} highlightRuleId={highlightedRuleId} onClearHighlight={() => setHighlightedRuleId(null)} recurringItems={recurringItems} settings={settings} onAddRule={handleAddRule} onDeleteRule={handleDeleteRule} onDeleteRecurring={handleDeleteRecurring} onAddRecurringClick={() => { triggerHaptic(); setRecordToEdit({ mode: 'Recurring' }); setIsAddingRecord(true); }} />}
            {currentView === 'Ledger' && <Ledger expenses={expenses} incomes={incomes} wealthItems={wealthItems} rules={rules} settings={settings} onDeleteExpense={handleDeleteExpense} onDeleteIncome={handleDeleteIncome} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onUpdateExpense={onUpdateExpense} onEditRecord={(r) => { triggerHaptic(); setRecordToEdit(r); setIsAddingRecord(true); }} onAddBulk={(items) => { setStagedImportItems(items); setIsReviewingImport(true); }} onViewRule={handleViewRule} viewDate={viewDate} onMonthChange={(d) => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + d, 1))} onGoToDate={(y, m) => setViewDate(new Date(y, m, 1))} addNotification={addNotification} showToast={showToast} />}
            {currentView === 'Profile' && <Settings settings={settings} user={user} onLogout={handleLogout} onReset={handleFullReset} onToggleTheme={() => { setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' })); showToast("Interface polarity toggled", "info"); }} onUpdateAppTheme={(t) => { setSettings(s => ({ ...s, appTheme: t })); showToast(`Visual ID: ${t}`); }} onUpdateCurrency={(c) => { setSettings(s => ({ ...s, currency: c })); showToast(`Currency: ${c}`); }} onUpdateDataFilter={(f) => { setSettings(s => ({ ...s, dataFilter: f })); showToast(`View scope: ${f}`); }} onUpdateSplit={(split) => { setSettings(s => ({ ...s, split })); showToast("Allocation logic updated"); }} onUpdateBaseIncome={(income) => { setSettings(s => ({ ...s, monthlyIncome: Math.round(income) })); showToast("Income baseline updated"); }} onSync={handleSyncToCloud} onExport={handleExportData} onImport={handleImportData} onAddBulk={handleAddBulk} isSyncing={isSyncing} onLoadMockData={handleLoadMockData} onPurgeMockData={handlePurgeAllMockData} onPurgeAllData={handlePurgeAllData} onClearExpenses={() => { setExpenses([]); showToast("Ledger records purged", "error"); }} wealthItems={wealthItems} />}
          </div>
          <Footer />
        </div>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Navbar currentView={currentView} remainingPercentage={globalMetrics.remainingPercentage} netWorth={globalMetrics.netWorth} categoryPercentages={globalMetrics.categoryPercentages} onViewChange={handleViewAction} />
      {isReviewingImport && <ImportReviewModal stagedItems={stagedImportItems} wealthItems={wealthItems} settings={settings} onConfirm={(final) => { handleAddBulk(final); setIsReviewingImport(false); }} onCancel={() => setIsReviewingImport(false)} />}
      {isAddingAccount && <AddAccount settings={settings} initialData={accountToEdit} onSave={(acc) => { setWealthItems(p => [...p, { ...acc, id: Math.random().toString(36).substring(2, 11) }]); setIsAddingAccount(false); }} onUpdate={(id, u) => { setWealthItems(p => p.map(w => w.id === id ? { ...w, ...u } : w)); setIsAddingAccount(false); }} onDelete={handleDeleteAccount} onCancel={() => setIsAddingAccount(false)} />}
      {isAddingTransfer && <AddTransfer settings={settings} wealthItems={wealthItems} onTransfer={handleTransfer} onCancel={() => setIsAddingTransfer(false)} />}
      {isAddingRecord && <AddRecord 
        settings={settings} 
        wealthItems={wealthItems} 
        expenses={expenses}
        onAdd={handleAddExpense} 
        onAddIncome={handleAddIncome} 
        onAddBill={handleAddBill}
        onUpdateBill={handleUpdateBill}
        onUpdateExpense={onUpdateExpense} 
        onUpdateIncome={(id, u) => { setIncomes(p => p.map(i => i.id === id ? { ...i, ...u } : i)); }} 
        onDelete={() => {
            if (!recordToEdit?.id) return;
            if (recordToEdit.dueDate) handleDeleteBill(recordToEdit.id);
            else if (recordToEdit.type) handleDeleteIncome(recordToEdit.id);
            else handleDeleteExpense(recordToEdit.id);
            setIsAddingRecord(false);
        }} 
        onCancel={() => setIsAddingRecord(false)} 
        initialData={recordToEdit} 
      />}
      {isShowingAskMe && <AskMe settings={settings} wealthItems={wealthItems} expenses={expenses} onCancel={() => setIsShowingAskMe(false)} />}
      {isCategorizing && <CategorizationModal settings={settings} expenses={expenses.filter(e => !e.isConfirmed)} onConfirm={(id, cat) => onUpdateExpense(id, { category: cat, isConfirmed: true })} onClose={() => setIsCategorizing(false)} />}
      {isShowingNotifications && <NotificationPane notifications={notifications} onClose={() => setIsShowingNotifications(false)} onClear={() => setNotifications([])} />}
      {isShowingVersionLog && <VersionLog onClose={() => setIsShowingVersionLog(false)} />}
    </div>
  );
};

export default App;
