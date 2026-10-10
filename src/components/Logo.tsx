import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  showImageOnly?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showTagline = false,
  showImageOnly = false,
  className = ''
}) => {
  const imageSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl font-extrabold'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* BrokeCode Monkey & Boba Mascot Image */}
      <div
        className={`${imageSizes[size]} relative rounded-2xl overflow-hidden shadow-xs ring-1 ring-black/10 shrink-0 bg-[#E0DDDA] flex items-center justify-center`}
      >
        <img
          src="/logo.jpeg"
          alt="BrokeCode Mascot Logo"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>

      {!showImageOnly && (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`${textSizes[size]} font-black tracking-wider text-[#2B2B2B] leading-none uppercase`}>
              BROKEC
            </span>
            {/* Peace sign stylized 'O' in BROKECODE */}
            <span
              className={`inline-flex items-center justify-center font-bold text-[#0B6121] leading-none ${
                size === 'sm' ? 'w-3.5 h-3.5 text-xs' : size === 'md' ? 'w-4 h-4 text-sm' : 'w-5 h-5 text-base'
              }`}
            >
              ☮
            </span>
            <span className={`${textSizes[size]} font-black tracking-wider text-[#2B2B2B] leading-none uppercase`}>
              DE
            </span>
          </div>

          {showTagline && (
            <span className="text-[10px] tracking-widest text-[#0B6121] font-extrabold uppercase mt-1">
              DECODE THE DOUGH
            </span>
          )}
        </div>
      )}
    </div>
  );
};
