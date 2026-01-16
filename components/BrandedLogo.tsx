import React from 'react';
import { Coins } from 'lucide-react';

interface BrandedLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BrandedLogo: React.FC<BrandedLogoProps> = ({ size = 'sm', className = '' }) => {
  const isSm = size === 'sm';
  const isLg = size === 'lg';
  
  const dim = isSm ? 32 : isLg ? 140 : 64;
  const coinSize = isSm ? 10 : isLg ? 28 : 18;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: dim, height: dim }}>
      {/* Falling Coins */}
      <div className="absolute inset-0 pointer-events-none flex justify-center">
        <Coins className="coin-into absolute" size={coinSize} style={{ left: '15%', animationDelay: '0s' }} />
        <Coins className="coin-into absolute" size={coinSize * 0.8} style={{ left: '65%', animationDelay: '0.9s' }} />
        <Coins className="coin-into absolute" size={coinSize * 0.9} style={{ left: '40%', animationDelay: '1.6s' }} />
      </div>

      {/* Briefcase Wrapper */}
      <div className="relative briefcase-float w-full h-full flex items-center justify-center">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 24 24" 
          fill="none" 
          className={`${isLg ? 'drop-shadow-[0_0_30px_rgba(250,204,21,0.4)]' : 'drop-shadow-md'}`}
        >
          <defs>
            <clipPath id="logo-briefcase-body-clip">
              <path d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" />
            </clipPath>
            <linearGradient id="gold-grad-logo" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="40%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#854D0E" />
            </linearGradient>
            <linearGradient id="briefcase-shell-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>
          </defs>

          {/* Briefcase Handle */}
          <path 
            d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
            stroke="#FACC15" 
            strokeWidth="2.2" 
            strokeLinecap="round" 
          />
          
          {/* Main Case Shell (Now in a darker Gold/Brown) */}
          <path 
            d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
            fill="url(#briefcase-shell-grad)"
            stroke="#FACC15"
            strokeWidth="0.5"
          />

          {/* Liquid Gold Fill */}
          <g clipPath="url(#logo-briefcase-body-clip)">
            <rect 
              x="4" y="8" width="16" height="14" 
              fill="url(#gold-grad-logo)" 
              className="animate-gold-fill"
            />
          </g>

          {/* Shiny Glass Overlay */}
          <path 
            d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
            fill="rgba(255,255,255,0.05)"
          />

          {/* Initials */}
          <text 
            x="12" y="17" 
            fontSize="4.5" fontWeight="900" 
            textAnchor="middle" 
            fill="white" 
            style={{ fontFamily: '"Plus Jakarta Sans"', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          >
            JK
          </text>
        </svg>
      </div>
    </div>
  );
};

export default BrandedLogo;