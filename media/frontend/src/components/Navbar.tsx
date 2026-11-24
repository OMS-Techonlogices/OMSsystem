import React from 'react';
import { ExternalLink, FileSpreadsheet, User, LogOut, Shield, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user, isReadOnly, logout } = useAuth();

  return (
    <header className="bg-[#171717] text-white border-b border-neutral-800 sticky top-0 z-50 px-4 lg:px-8 py-3.5 shadow-md">
      <div className="flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-white px-2 py-1 rounded-xl flex items-center justify-center shadow-md">
            <img src="/logo.png" alt="OMS Logo" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wide text-white">OMS MEDIA</span>
              <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                قسم الميديا والإعلانات
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-medium">
              تطوير وتنفيذ: <span className="text-white font-semibold">MDE – Matrix Data Egypt</span>
            </p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-3">
          {isReadOnly && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>متابعة وعرض فقط (View Only)</span>
            </span>
          )}

          {user && (
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-neutral-900 border border-neutral-800">
              <div className="w-7 h-7 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626]">
                <User className="w-4 h-4" />
              </div>
              <div className="text-start">
                <div className="text-xs font-black text-white">{user.name}</div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  @{user.username || user.email}
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          {user && (
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold transition-all cursor-pointer"
              title="تسجيل الخروج من قسم الميديا"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>خروج</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
