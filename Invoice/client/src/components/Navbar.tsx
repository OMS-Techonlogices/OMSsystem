import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { Globe, LogOut, ShieldCheck, User as UserIcon } from 'lucide-react';

const roleLabels: Record<string, { ar: string; en: string }> = {
  ADMIN: { ar: 'مدير النظام (Admin)', en: 'System Admin' },
  FINANCE_MANAGER: { ar: 'مدير مالي (Finance Manager)', en: 'Finance Manager' },
  ACCOUNTANT: { ar: 'محاسب (Accountant)', en: 'Accountant' },
  SALES: { ar: 'مسؤول مبيعات (Sales)', en: 'Sales Rep' },
};

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="bg-[#171717] text-white border-b border-neutral-800 sticky top-0 z-50 px-4 lg:px-8 py-3.5 shadow-md">
      <div className="flex items-center justify-between">
        {/* Brand & MDE Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-2 py-1 rounded-xl flex items-center justify-center shadow-md">
            <img src="/logo.png" alt="OMS Logo" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wide text-white">OMS INVOICE</span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              power by: <span className="text-white font-semibold">  Matrix Data Egypt</span>
            </p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 transition-colors border border-neutral-700"
            title="تبديل اللغة / Toggle Language"
          >
            <Globe className="w-4 h-4 text-red-500" />
            <span className="font-bold">{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* User Info */}
          {user && (
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700">
              <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-red-400">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-neutral-100">{user.name}</div>
                <div className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {roleLabels[user.role]?.[language] || user.role}
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-200 text-xs font-semibold transition-colors border border-red-800/50"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">{t('logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
