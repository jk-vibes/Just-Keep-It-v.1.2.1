import React, { useState } from 'react';
import { UserSettings, WealthItem, Expense } from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Check, X, Compass, Loader2, Sparkles, AlertCircle, 
  ArrowRight, Landmark, MessageSquare, TrendingUp,
  BrainCircuit, ShieldCheck, Target
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';
import { getDecisionAdvice } from '../services/geminiService';

interface AskMeProps {
  settings: UserSettings;
  wealthItems: WealthItem[];
  expenses: Expense[];
  onCancel: () => void;
}

const AskMe: React.FC<AskMeProps> = ({ settings, wealthItems, expenses, onCancel }) => {
  const [itemName, setItemName] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [advice, setAdvice] = useState<any | null>(null);

  const currencySymbol = getCurrencySymbol(settings.currency);

  const handleRunAssessment = async () => {
    if (!itemName || !estimatedCost || isAssessing) return;
    triggerHaptic(30);
    setIsAssessing(true);
    setAdvice(null);
    try {
      const result = await getDecisionAdvice(
        expenses, 
        wealthItems, 
        settings, 
        'Affordability Check', 
        itemName, 
        parseFloat(estimatedCost)
      );
      setAdvice(result);
    } catch (e) {
      setAdvice({
        status: 'Caution',
        score: 50,
        reasoning: 'AI assessment system currently synchronizing. Please review manual liquidity buffers.',
        actionPlan: ['Check monthly discretionary budget', 'Validate upcoming bills'],
        waitTime: 'T+2 Days',
        impactPercentage: 5
      });
    } finally {
      setIsAssessing(false);
    }
  };

  const inputLabelClass = "text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 mb-2 block";
  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-[11px] font-black outline-none border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white transition-all focus:border-indigo-500/30";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up border border-white/5">
        
        {/* Portal Header */}
        <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
              <Compass size={20} />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.1em] dark:text-white">AskMe Portal</h3>
              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Tactical Decision Engine</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 transition-all active:scale-90 border border-slate-200 dark:border-slate-700">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
          {!advice ? (
            <div className="space-y-6 animate-kick">
              <div className="bg-indigo-50 dark:bg-indigo-950/20 p-4 rounded-[24px] border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-start gap-3">
                   <Sparkles className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-1" size={16} />
                   <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 leading-relaxed uppercase italic">
                     Planning a significant acquisition? Deploy our neural auditor to assess the strategic impact on your capital reserves.
                   </p>
                </div>
              </div>

              <div>
                <label className={inputLabelClass}>Strategic Goal / Item</label>
                <input 
                  autoFocus
                  type="text" 
                  value={itemName} 
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. RTX 4090, Japan Trip, Macbook Pro"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={inputLabelClass}>Estimated Outflow</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-300">{currencySymbol}</span>
                  <input 
                    type="number" 
                    value={estimatedCost} 
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>

              <button 
                onClick={handleRunAssessment}
                disabled={!itemName || !estimatedCost || isAssessing}
                className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isAssessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Assessing Capital Impact...
                  </>
                ) : (
                  <>
                    <BrainCircuit size={18} /> Authorize Neural Audit
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-kick pb-4">
              {/* Assessment Score Header */}
              <div className={`p-6 rounded-[32px] text-center border-2 transition-all shadow-xl relative overflow-hidden ${
                advice.status === 'Safe' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/20' : 
                advice.status === 'Caution' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-500/20' : 
                'bg-rose-50 dark:bg-rose-950/20 border-rose-500/20'
              }`}>
                <div className="relative z-10">
                   <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Strategy Score</p>
                   <h2 className={`text-6xl font-black tracking-tighter ${
                     advice.status === 'Safe' ? 'text-emerald-500' : 
                     advice.status === 'Caution' ? 'text-amber-500' : 
                     'text-rose-500'
                   }`}>{advice.score}%</h2>
                   <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-white dark:bg-slate-900 rounded-full border border-current opacity-80">
                      <span className="text-[10px] font-black uppercase tracking-widest">Protocol: {advice.status}</span>
                   </div>
                </div>
                <Compass className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12" size={140} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                   <MessageSquare size={14} className="text-brand-primary" />
                   <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reasoning</h4>
                </div>
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                  "{advice.reasoning}"
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Impact Level</p>
                    <p className="text-[11px] font-black dark:text-white">{advice.impactPercentage}% of Buffer</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Recommended Wait</p>
                    <p className="text-[11px] font-black dark:text-white">{advice.waitTime}</p>
                  </div>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-2 px-1">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Action Plan</h4>
                   </div>
                   <div className="space-y-2">
                      {advice.actionPlan.map((action: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">{action}</span>
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setAdvice(null)}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Recalibrate
                </button>
                <button 
                  onClick={onCancel}
                  className="flex-[2] py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check size={14} strokeWidth={4} /> Acknowledge
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Branding Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center shrink-0">
           <p className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em]">Authorized by JK Decision Cloud</p>
        </div>
      </div>
    </div>
  );
};

export default AskMe;