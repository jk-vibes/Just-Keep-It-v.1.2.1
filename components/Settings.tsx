import React, { useState, useRef, useEffect } from 'react';
import { UserSettings, UserProfile, AppTheme, Category, WealthItem } from '../types';
import { 
  LogOut, Calculator, Moon, Sun, 
  Cloud, Database, Eraser,
  X, Download, Check, Upload, Palette, Zap, Loader2, FileSpreadsheet, Bomb,
  ShieldAlert, FolderOpen, Banknote, Shield, Heart
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { parseSmsLocally } from '../utils/smsParser';
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from '../constants';
import { NarutoIcon, SpiderIcon, CaptainAmericaIcon, BatmanIcon } from './ThemeSymbols';

interface SettingsProps {
  settings: UserSettings;
  user: UserProfile | null;
  onLogout: () => void;
  onReset: () => void;
  onToggleTheme: () => void;
  onUpdateAppTheme: (theme: AppTheme) => void;
  onUpdateCurrency: (code: string) => void;
  onUpdateSplit: (split: { Needs: number; Wants: number; Savings: number }) => void;
  onSync: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onAddBulk: (items: any[]) => void;
  isSyncing: boolean;
  onLoadMockData: () => void;
  onPurgeMockData: () => void;
  onPurgeAllData?: () => void;
  wealthItems?: WealthItem[];
  onUpdateDataFilter?: (filter: 'all' | 'user' | 'mock') => void;
  onUpdateBaseIncome?: (income: number) => void;
  onClearExpenses?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  settings, user, onLogout, onReset, onToggleTheme, onUpdateAppTheme, onUpdateCurrency, 
  onUpdateSplit, onSync, onExport, onImport, onAddBulk, isSyncing, onLoadMockData, onPurgeMockData, onPurgeAllData,
  onUpdateBaseIncome, wealthItems = []
}) => {
  const isDark = settings.theme === 'dark';
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [tempSplit, setTempSplit] = useState(settings.split);
  const [tempIncome, setTempIncome] = useState(settings.monthlyIncome);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSplitModal) {
      setTempSplit(settings.split);
      setTempIncome(settings.monthlyIncome);
    }
  }, [showSplitModal, settings.split, settings.monthlyIncome]);

  const themes: { id: AppTheme, icon: React.ReactNode }[] = [
    { id: 'Spiderman', icon: <SpiderIcon /> },
    { id: 'CaptainAmerica', icon: <CaptainAmericaIcon /> },
    { id: 'Naruto', icon: <NarutoIcon /> },
    { id: 'Batman', icon: <BatmanIcon /> }
  ];

  const handleUpdateTempSplit = (cat: Category, val: number) => {
    const categories = ['Needs', 'Wants', 'Savings'] as const;
    const others = categories.filter(c => c !== cat);
    const splitRest = (100 - val) / 2;
    setTempSplit({ 
      ...tempSplit, 
      [cat]: val, 
      [others[0]]: Math.round(splitRest), 
      [others[1]]: 100 - val - Math.round(splitRest) 
    });
  };

  const saveSplitSettings = () => { 
    triggerHaptic(); 
    onUpdateSplit(tempSplit); 
    if (onUpdateBaseIncome) onUpdateBaseIncome(tempIncome);
    setShowSplitModal(false); 
  };

  const handleImportClick = () => { triggerHaptic(); fileInputRef.current?.click(); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processRawText = async (text: string) => {
    if (!text || !text.trim()) return;
    triggerHaptic();
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const results = parseSmsLocally(text);
      if (results?.length > 0) {
        onAddBulk(results);
      } else {
        alert("No valid financial signals identified in the provided text.");
      }
    } catch (err) { 
      alert("An error occurred while processing the ledger data.");
    } finally { 
      setIsAnalyzing(false); 
    }
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    triggerHaptic();
    setIsReadingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setIsReadingFile(false);
      await processRawText(content);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl mb-3 overflow-hidden shadow-sm";
  const labelClass = "text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3 px-1";

  return (
    <div className="pb-4 pt-1 animate-slide-up relative">
      {(isReadingFile || isAnalyzing) && (
        <div className="fixed inset-0 z-[200] bg-brand-bg/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
            <Loader2 size={32} className="animate-spin text-brand-primary" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white">
              {isReadingFile ? 'Reading Ledger File...' : 'Analyzing Transactions...'}
            </p>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-2 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Settings</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Configuration Protocol</p>
          </div>
        </div>
      </div>
      
      <div className="px-1">
        <section className={sectionClass}>
          <div className="p-4 pb-6">
            <h3 className={labelClass}><Palette size={10} /> Visual Identity</h3>
            <div className="flex items-center justify-between px-2 pt-2">
              <button 
                onClick={() => { triggerHaptic(); onToggleTheme(); }} 
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 shrink-0 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-indigo-400 shadow-lg' : 'bg-slate-50 border-slate-200 text-amber-500 shadow-sm'
                }`}
              >
                {isDark ? <Moon size={24} strokeWidth={2.5} /> : <Sun size={24} strokeWidth={2.5} />}
              </button>
              <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 shrink-0"></div>
              {themes.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { triggerHaptic(); onUpdateAppTheme(t.id); }} 
                  className={`w-14 h-14 transition-all active:scale-90 flex items-center justify-center relative shrink-0 ${
                    settings.appTheme === t.id ? 'scale-125 z-10 opacity-100' : 'opacity-40 grayscale-[0.3] hover:opacity-100 hover:scale-110'
                  }`}
                >
                  <div className="w-full h-full p-0.5">{t.icon}</div>
                  {settings.appTheme === t.id && (
                    <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white p-0.5 rounded-full ring-2 ring-white dark:ring-slate-950 shadow-md">
                      <Check size={8} strokeWidth={5} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Calculator size={10} /> Core Logic</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => { triggerHaptic(); setShowSplitModal(true); }} className="flex flex-col items-start gap-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 active:bg-slate-100 transition-all text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase">Allocation</span>
                <span className="text-[11px] font-black dark:text-white">{settings.split.Needs}/{settings.split.Wants}/{settings.split.Savings}</span>
              </button>
              <button onClick={() => { triggerHaptic(); setShowCurrencyModal(true); }} className="flex flex-col items-start gap-1 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 active:bg-slate-100 transition-all text-left">
                <span className="text-[8px] font-black text-slate-400 uppercase">Currency</span>
                <span className="text-[11px] font-black dark:text-white uppercase">{settings.currency}</span>
              </button>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="p-4">
            <h3 className={labelClass}><Database size={10} /> Data Management</h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button onClick={onSync} disabled={isSyncing || !user?.accessToken} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-indigo-600 text-white shadow-md active:scale-95 transition-all disabled:opacity-50">
                {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
                <span className="text-[9px] font-black uppercase tracking-widest">{!user?.accessToken ? 'No Auth' : 'Vault Sync'}</span>
              </button>
              <button 
                onClick={() => { triggerHaptic(); csvFileInputRef.current?.click(); }} 
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white shadow-md active:scale-95 transition-all"
              >
                <FileSpreadsheet size={14} className="text-indigo-300" />
                <span className="text-[9px] font-black uppercase tracking-widest">Import CSV</span>
              </button>
              <input type="file" ref={csvFileInputRef} onChange={handleCsvFileChange} accept=".csv,text/csv,text/plain" className="sr-only" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={handleImportClick} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Upload size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Restore</span>
              </button>
              <button onClick={() => { triggerHaptic(); onLoadMockData(); }} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Zap size={14} className="text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Mock</span>
              </button>
              <button onClick={onExport} className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 active:scale-95 transition-all">
                <Download size={14} className="text-slate-400" />
                <span className="text-[9px] font-black uppercase tracking-widest dark:text-white">Backup</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          </div>
        </section>

        <section className="mt-4 mb-2">
          <div className="grid grid-cols-4 gap-2 px-3 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-sm">
            <button onClick={() => { triggerHaptic(20); onPurgeMockData(); }} className="flex flex-col items-center gap-2 group active:scale-90 transition-all">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-rose-500 rounded-2xl border border-slate-100 dark:border-slate-700"><Eraser size={18} /></div>
              <span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">Mock</span>
            </button>
            <button onClick={() => { triggerHaptic(30); onPurgeAllData?.(); }} className="flex flex-col items-center gap-2 group active:scale-90 transition-all">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-2xl border border-rose-100 dark:border-rose-900/30"><Bomb size={18} /></div>
              <span className="text-[7px] font-black uppercase text-rose-500 tracking-tighter">Purge</span>
            </button>
            <button onClick={() => { triggerHaptic(40); onReset(); }} className="flex flex-col items-center gap-2 group active:scale-90 transition-all">
              <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-amber-500 rounded-2xl border border-slate-100 dark:border-slate-700"><ShieldAlert size={18} /></div>
              <span className="text-[7px] font-black uppercase text-slate-400 tracking-tighter">Reset</span>
            </button>
            <button onClick={() => { triggerHaptic(20); onLogout(); }} className="flex flex-col items-center gap-2 group active:scale-90 transition-all">
              <div className="p-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl shadow-lg"><LogOut size={18} /></div>
              <span className="text-[7px] font-black uppercase text-slate-900 dark:text-white tracking-tighter">Exit</span>
            </button>
          </div>
        </section>
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] animate-slide-up shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Select Currency</h3>
              <button onClick={() => { triggerHaptic(); setShowCurrencyModal(false); }} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-400 active:scale-90 transition-transform"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto no-scrollbar">
              {SUPPORTED_CURRENCIES.map(curr => (
                <button key={curr.code} onClick={() => { triggerHaptic(); onUpdateCurrency(curr.code); setShowCurrencyModal(false); }} className={`w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-95 ${settings.currency === curr.code ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className="flex items-center gap-4"><p className="font-black text-[11px] dark:text-white">{curr.code}</p><p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{curr.name}</p></div>
                  {settings.currency === curr.code && <Check className="text-brand-primary" size={14} strokeWidth={4} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSplitModal && (
        <div className="fixed inset-0 bg-black/60 z-[130] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-950 w-full max-w-sm rounded-t-[32px] animate-slide-up shadow-2xl p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black uppercase dark:text-white tracking-widest">Allocation Protocols</h3>
                <button onClick={() => { triggerHaptic(); setShowSplitModal(false); }}>
                  <X size={16} className="text-slate-400 active:scale-90 transition-transform" />
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote size={14} className="text-indigo-500" />
                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Monthly Base Income</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">{getCurrencySymbol(settings.currency)}</span>
                  <input type="number" value={tempIncome === 0 ? '' : tempIncome} onChange={(e) => setTempIncome(Math.round(parseFloat(e.target.value) || 0))} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-900 pl-8 pr-4 py-4 rounded-2xl text-lg font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white focus:border-indigo-500/30 transition-all" />
                </div>
              </div>
              <div className="space-y-5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {(['Needs', 'Wants', 'Savings'] as Category[]).map(cat => (
                  <div key={cat} className="space-y-2">
                    <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-widest"><span>{cat}</span><span className="font-black text-slate-900 dark:text-white">{tempSplit[cat]}%</span></div>
                    <input type="range" min="0" max="100" value={tempSplit[cat]} onChange={(e) => handleUpdateTempSplit(cat, parseInt(e.target.value))} className="w-full accent-indigo-500 h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer" />
                  </div>
                ))}
              </div>
              <button onClick={saveSplitSettings} className="w-full py-4 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Check size={14} strokeWidth={4} /> Authorize Protocol Updates
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;