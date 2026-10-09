import React, { useState } from 'react';
import { Tag, Shield, Sliders } from 'lucide-react';
import { SettingsPrivacyView } from './SettingsPrivacyView';
import { CategoriesView } from './CategoriesView';

export const SettingsView: React.FC = () => {
  const [subTab, setSubTab] = useState<'profile_privacy' | 'categories'>('categories');

  return (
    <div className="space-y-6">
      {/* Subtab navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-[#E0DDDA]/40 dark:bg-slate-900 rounded-2xl max-w-md border border-[#E0DDDA] dark:border-slate-800">
        <button
          type="button"
          onClick={() => setSubTab('categories')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'categories'
              ? 'bg-[#0B6121] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Category & Emojis</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('profile_privacy')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            subTab === 'profile_privacy'
              ? 'bg-[#0B6121] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preferences & Data</span>
        </button>
      </div>

      {subTab === 'categories' && <CategoriesView />}
      {subTab === 'profile_privacy' && <SettingsPrivacyView />}
    </div>
  );
};
