import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';
import { Tv, Lock, User, ArrowLeft, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await apiRequest<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginIdentifier: username.trim(), password }),
    });

    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/');
    } else {
      setError(res.message || 'فشل تسجيل الدخول. تحقق من اسم المستخدم وكلمة المرور');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      <div className="w-full max-w-md bg-[#141414] rounded-3xl border border-neutral-800/90 shadow-2xl p-8 space-y-6 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -end-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -start-24 w-48 h-48 bg-neutral-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-2 relative">
          <div className="bg-white px-4 py-2 rounded-2xl inline-block mx-auto shadow-xl shadow-red-950/40">
            <img src="/logo.png" alt="OMS Logo" className="h-10 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center justify-center gap-2">
            <span>OMS Media</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-[#DC2626] text-white">
              PORTAL
            </span>
          </h1>
          <p className="text-xs text-neutral-400 font-medium">
            بوابة تسجيل الدخول الخاصة بـ <span className="text-white font-bold">قسم الميديا والإعلانات</span>
          </p>
          <div className="inline-block px-3 py-1 bg-red-950/40 border border-red-800/40 rounded-full text-[10px] font-semibold text-red-300">
            Powered by : Matrix Data Egypt (MDE)
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-700 text-red-300 text-xs font-bold flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              اسم المستخدم (User Name) أو البريد
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute top-3.5 start-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="اسم المستخدم الخاص بك..."
                className="w-full ps-10 pe-4 py-2.5 bg-neutral-900/90 border border-neutral-700/80 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">كلمة المرور (Password)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute top-3.5 start-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full ps-10 pe-4 py-2.5 bg-neutral-900/90 border border-neutral-700/80 rounded-2xl text-white text-xs font-bold focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-800 text-white font-black rounded-2xl shadow-lg shadow-red-900/30 transition-all text-xs flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول إلى قسم الميديا'}</span>
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
