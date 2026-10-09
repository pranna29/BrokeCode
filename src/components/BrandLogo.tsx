import React, { useState } from 'react';
import { ShieldAlert, TrendingDown } from 'lucide-react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'md', showSubtitle = true }) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'h-9 w-9 sm:h-10 sm:w-10',
    md: 'h-11 w-11',
    lg: 'h-14 w-14',
  };

  const textClasses = {
    sm: 'text-sm font-black',
    md: 'text-base font-black',
    lg: 'text-xl font-black',
  };

  return (
    <div className="flex items-center gap-3">
      {/* Container preserving aspect ratio of custom logo.jpg */}
      <div
        className={`${sizeClasses[size]} relative flex items-center justify-center rounded-xl bg-[#2B2B2B] border border-[#0B6121]/40 shadow-sm shadow-[#0B6121]/20 overflow-hidden shrink-0 transition-all hover:border-[#0B6121]`}
      >
        {!imageError ? (
          <img
            src="/BROKECODE.jpg"
            alt="BrokeCode Logo"
            className="w-full h-full object-cover rounded-lg transition-transform duration-200 hover:scale-105"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.endsWith('/BROKECODE.jpg')) {
                target.src = '/logo.jpg';
              } else {
                setImageError(true);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-[#2B2B2B] text-[#0B6121]">
            <ShieldAlert className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className={`${textClasses[size]} tracking-tight text-[#2B2B2B] dark:text-white font-extrabold`}>
            BrokeCode
          </span>
          <span className="rounded bg-[#0B6121]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#0B6121] uppercase tracking-wider">
            Finance
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] text-slate-500 leading-tight">
            Personal Expense & Anomaly Manager
          </span>
        )}
      </div>
    </div>
  );
};
