import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { LogIn, UserCircle, Sparkles, Fingerprint, Loader2, AlertCircle, Coins } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const GOOGLE_CLIENT_ID = '620152015803-umm0ekg7ori8geljjpdm3j8l4mgoubf6.apps.googleusercontent.com';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');
  const [tokenClient, setTokenClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGsi = () => {
      try {
        if (!(window as any).google) return;
        
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file openid profile email',
          callback: async (response: any) => {
            if (response.error) {
              setLoading(false);
              setAuthStatus('Handshake Interrupted');
              setError(`Auth Error: ${response.error_description || response.error}`);
              return;
            }

            setAuthStatus('Synchronizing Neural Identity...');
            try {
              const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const userInfo = await userInfoResponse.json();

              onLogin({
                id: userInfo.sub,
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.picture,
                accessToken: response.access_token
              });
            } catch (err) {
              setAuthStatus('Handshake Failure');
              setError('Failed to fetch user profile from Google.');
              setLoading(false);
            }
          },
        });
        setTokenClient(client);
      } catch (err) {
        console.error("GSI Init Error:", err);
      }
    };

    const scriptCheck = setInterval(() => {
      if ((window as any).google?.accounts?.oauth2) {
        initGsi();
        clearInterval(scriptCheck);
      }
    }, 100);

    return () => clearInterval(scriptCheck);
  }, [onLogin]);

  const handleGoogleSignIn = () => {
    setError(null);
    if (!tokenClient) {
      setAuthStatus('Identity Engine Offline. Retrying...');
      return;
    }
    triggerHaptic(20);
    setLoading(true);
    setAuthStatus('Opening Secure Gateway...');
    tokenClient.requestAccessToken();
  };

  const handleGuestSignIn = () => {
    setError(null);
    triggerHaptic();
    setGuestLoading(true);
    setAuthStatus('Initializing Local Sandbox...');
    
    setTimeout(() => {
      onLogin({
        id: 'guest-' + Math.random().toString(36).substring(7),
        name: 'Guest User',
        email: 'guest@local.host',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      });
      setGuestLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden transition-all duration-700">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] animate-pulse-slow pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

      {/* Main COMPACT Container: Vertically Centered (approx 50% height) */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center space-y-8 z-10 animate-slide-up">
        
        {/* GROUPED LOGO AND TITLE */}
        <div className="flex flex-col items-center w-full -space-y-4">
          {/* ANIMATED BRIEFCASE & COINS */}
          <div className="relative group h-40 flex items-center justify-center w-full">
            <style>{`
              @keyframes coinDropInto {
                0% { transform: translateY(-120px) scale(0.5); opacity: 0; }
                10% { opacity: 1; }
                60% { transform: translateY(-15px) scale(1); opacity: 1; }
                80% { transform: translateY(5px) scale(0.6); opacity: 0; }
                100% { transform: translateY(5px) scale(0.6); opacity: 0; }
              }
              .coin-into {
                position: absolute;
                animation: coinDropInto 2.5s infinite ease-in;
                color: #facc15;
                filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.6));
                z-index: 1;
              }
              .briefcase-float {
                animation: briefcaseFloat 4s infinite ease-in-out;
                z-index: 2;
              }
              @keyframes briefcaseFloat {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-6px); }
              }
              @keyframes fillingUp {
                0% { height: 0; transform: translateY(14px); }
                100% { height: 14.5px; transform: translateY(0); }
              }
              .animate-gold-fill {
                animation: fillingUp 10s infinite alternate ease-in-out;
              }
              .animate-gold-surface {
                animation: fillingUp 10s infinite alternate ease-in-out;
              }
            `}</style>
            
            {/* Falling Coins */}
            <div className="absolute top-0 w-full h-full pointer-events-none flex justify-center">
              <Coins className="coin-into" size={32} style={{ left: '38%', animationDelay: '0s' }} />
              <Coins className="coin-into" size={26} style={{ left: '56%', animationDelay: '0.9s' }} />
              <Coins className="coin-into" size={30} style={{ left: '46%', animationDelay: '1.6s' }} />
            </div>

            <div className="absolute inset-0 bg-yellow-400/10 blur-[80px] rounded-full scale-75 opacity-40"></div>
            
            <div className="relative briefcase-float">
              <svg width="140" height="140" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_40px_rgba(250,204,21,0.5)]">
                <defs>
                  <clipPath id="briefcase-body-clip">
                    <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" />
                  </clipPath>
                  <linearGradient id="gold-grad-realistic" x1="0.5" y1="0" x2="0.5" y2="1">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="40%" stopColor="#EAB308" />
                    <stop offset="100%" stopColor="#854D0E" />
                  </linearGradient>
                  <filter id="inner-shadow">
                    <feOffset dx="0" dy="1" />
                    <feGaussianBlur stdDeviation="1" result="offset-blur" />
                    <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                    <feFlood floodColor="black" floodOpacity="0.8" result="color" />
                    <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                    <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                  </filter>
                </defs>

                {/* Briefcase Handle */}
                <path 
                  d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
                  stroke="#FACC15" 
                  strokeWidth="2.2" 
                  strokeLinecap="round" 
                />
                
                {/* Briefcase Back Shell (Dark interior) */}
                <path 
                  d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
                  fill="#020617" 
                  filter="url(#inner-shadow)"
                />

                {/* LIQUID FILL - Blended with inner shadow */}
                <g clipPath="url(#briefcase-body-clip)">
                  <rect 
                    x="4" y="8" width="16" height="14" 
                    fill="url(#gold-grad-realistic)" 
                    className="animate-gold-fill"
                  />
                  {/* Liquid Surface Highlight (Meniscus) */}
                  <rect 
                    x="4" y="7.8" width="16" height="0.6" 
                    fill="#FFF" 
                    fillOpacity="0.4"
                    style={{ filter: 'blur(0.3px)' }}
                    className="animate-gold-surface"
                  />
                </g>

                {/* Briefcase Front Outline (Glassy Effect) */}
                <path 
                  d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
                  stroke="#FACC15" 
                  strokeWidth="0.8"
                  fill="rgba(250, 204, 21, 0.05)"
                />

                <text 
                  x="12" y="17" 
                  fontSize="4" fontWeight="900" 
                  textAnchor="middle" 
                  fill="white" 
                  style={{ fontFamily: 'Plus Jakarta Sans', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
                >
                  JK
                </text>
              </svg>
            </div>
            
            {/* AI ICON BADGE */}
            <div className="absolute top-4 right-14 bg-yellow-500 p-1.5 rounded-xl shadow-xl animate-bounce-slow z-30 border border-yellow-400/50">
              <Sparkles size={14} className="text-white" />
            </div>
          </div>
          
          {/* Title & Vision */}
          <div className="text-center w-full space-y-4 px-4">
            <div className="space-y-1">
              <h1 className="text-5xl font-black text-white tracking-tighter lowercase leading-none">just keep it</h1>
              <p className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] opacity-80">The Wealth Protocol</p>
            </div>

            <p className="text-slate-400 text-sm font-bold leading-relaxed italic max-w-[260px] mx-auto">
              "Small, consistent choices to <span className="text-white not-italic">"just keep it"</span> compound into lasting wealth."
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3 px-4">
          {loading || guestLoading ? (
            <div className="flex flex-col items-center gap-4 py-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-xl">
               <Loader2 className="text-yellow-500 animate-spin" size={32} />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{authStatus}</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogleSignIn}
                className="group w-full bg-white text-slate-950 font-black py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-[0_15px_40px_-10px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-95 transition-all duration-300 uppercase tracking-[0.2em] text-[11px]"
              >
                <LogIn size={18} strokeWidth={3} />
                Secure Login
              </button>

              <button
                onClick={handleGuestSignIn}
                className="w-full bg-white/5 backdrop-blur-xl text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 border border-white/10 hover:bg-white/10 active:scale-95 transition-all duration-300 uppercase tracking-[0.2em] text-[10px]"
              >
                <UserCircle size={18} strokeWidth={2} className="text-slate-400" />
                Guest Sandbox
              </button>
            </>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-[24px] flex items-start gap-3 animate-kick">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-slate-400 leading-tight">{error}</p>
            </div>
          )}
        </div>

        {/* Scaled-down footer build info */}
        <div className="flex items-center gap-3 opacity-30 pt-4">
          <Fingerprint size={14} className="text-yellow-500" />
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Build 1.2.1 • V1 Stable</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;