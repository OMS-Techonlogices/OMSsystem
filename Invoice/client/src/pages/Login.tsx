import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
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
      body: JSON.stringify({ loginIdentifier: email, password }),
    });

    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/');
    } else {
      setError(res.message || 'فشل تسجيل الدخول. تحقق من البريد أو اسم المستخدم وكلمة المرور');
    }
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#171717] rounded-3xl border border-neutral-800 shadow-2xl p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="bg-white px-4 py-2 rounded-2xl inline-block mx-auto shadow-xl shadow-red-950/40">
            <img src="/logo.png" alt="OMS Logo" className="h-10 w-auto object-contain mx-auto" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide">OMS Invoice</h1>
          <p className="text-xs text-neutral-400 font-medium">
            بوابة تسجيل الدخول لنظام الفواتير والمحاسبة
          </p>
          <div className="inline-block px-3 py-1 bg-red-950/40 border border-red-800/40 rounded-full text-[11px] font-semibold text-red-300">
            Powered by : Matrix Data Egypt
          </div>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">
              اسم المستخدم أو البريد الإلكتروني
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute top-3.5 start-3.5" />
              <input
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="اسم المستخدم أو البريد..."
                className="w-full ps-10 pe-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute top-3.5 start-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full ps-10 pe-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-800 text-white font-extrabold rounded-xl shadow-lg shadow-red-900/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <span>جاري التحقق...</span>
            ) : (
              <>
                <span>تسجيل الدخول للنظام</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
