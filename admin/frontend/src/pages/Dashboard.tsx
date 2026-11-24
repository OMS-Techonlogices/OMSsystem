import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { apiRequest } from '../services/api.js';
import { AdminUser, SystemStats } from '../types/index.js';
import {
  ShieldCheck,
  Users,
  FileSpreadsheet,
  Tv,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  ExternalLink,
  LogOut,
  KeyRound,
  Trash2,
  Edit,
  Shield,
  Lock,
  User,
  Mail,
  Phone,
  Layers,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAccess, setFilterAccess] = useState<'ALL_FILTER' | 'INVOICE' | 'MEDIA' | 'ALL'>('ALL_FILTER');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<AdminUser | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState<AdminUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'ACCOUNTANT',
    systemAccess: 'INVOICE' as 'INVOICE' | 'MEDIA' | 'ALL',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'ACCOUNTANT',
    systemAccess: 'INVOICE' as 'INVOICE' | 'MEDIA' | 'ALL',
    isActive: true,
  });

  const [newPassword, setNewPassword] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [usersRes, statsRes] = await Promise.all([
      apiRequest<AdminUser[]>('/users'),
      apiRequest<SystemStats>('/stats'),
    ]);

    if (usersRes.success && usersRes.data) {
      setUsers(usersRes.data);
    }
    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);

    const res = await apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(formData),
    });

    setActionLoading(false);

    if (res.success) {
      setMessage({ text: res.message || 'تمت إضافة المستخدم بنجاح', type: 'success' });
      setShowAddModal(false);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        role: 'ACCOUNTANT',
        systemAccess: 'INVOICE',
      });
      fetchData();
    } else {
      setMessage({ text: res.message || 'فشل إنشاء المستخدم', type: 'error' });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    setActionLoading(true);
    setMessage(null);

    const res = await apiRequest(`/users/${showEditModal.id}`, {
      method: 'PUT',
      body: JSON.stringify(editFormData),
    });

    setActionLoading(false);

    if (res.success) {
      setMessage({ text: res.message || 'تم تحديث بيانات المستخدم بنجاح', type: 'success' });
      setShowEditModal(null);
      fetchData();
    } else {
      setMessage({ text: res.message || 'فشل تحديث المستخدم', type: 'error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPasswordModal || !newPassword) return;

    setActionLoading(true);
    const res = await apiRequest(`/users/${showPasswordModal.id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
    setActionLoading(false);

    if (res.success) {
      setMessage({ text: res.message || 'تم تغيير كلمة المرور بنجاح', type: 'success' });
      setShowPasswordModal(null);
      setNewPassword('');
    } else {
      setMessage({ text: res.message || 'فشل تغيير كلمة المرور', type: 'error' });
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const nextState = !user.isActive;
    const res = await apiRequest(`/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: nextState }),
    });

    if (res.success) {
      setMessage({
        text: `تم ${nextState ? 'تفعيل' : 'تعطيل'} حساب المستخدم (${user.name}) بنجاح`,
        type: 'success',
      });
      fetchData();
    } else {
      setMessage({ text: res.message || 'فشل تعديل حالة الحساب', type: 'error' });
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد تماماً من حذف المستخدم (${name})؟`)) return;

    const res = await apiRequest(`/users/${id}`, { method: 'DELETE' });
    if (res.success) {
      setMessage({ text: res.message || 'تم حذف المستخدم بنجاح', type: 'success' });
      fetchData();
    } else {
      setMessage({ text: res.message || 'فشل حذف المستخدم', type: 'error' });
    }
  };

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.username && u.username.toLowerCase().includes(term)) ||
      (u.phone && u.phone.includes(term));

    if (!matchesSearch) return false;
    if (filterAccess === 'ALL_FILTER') return true;
    return u.systemAccess === filterAccess;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Top Main Navbar */}
      <header className="bg-[#111827] text-white border-b border-neutral-800 sticky top-0 z-40 px-4 sm:px-8 py-3.5 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-2 py-1 rounded-xl flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="OMS Logo" className="h-7 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white">OMS ADMIN HUB</span>
                <span className="text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
                  بوابة إدارة المستخدمين والأنظمة
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Matrix Data Egypt (MDE) | نظام الفصل والربط المركزي
              </p>
            </div>
          </div>

          {/* Admin Profile & Logout */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-neutral-300">
              {admin?.name}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 text-xs font-bold transition-all cursor-pointer"
              title="تسجيل الخروج من لوحة الإدارة"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-6">
        {/* Banner Announcement */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900">
                لوحة التحكم المركزية بصلاحيات موظفي OMS
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                يمكنك هنا إضافة وتعيين الموظفين وتحديد اختصاصهم بدقة (قسم الفواتير فقط، أو قسم الميديا فقط، أو كلاهما).
                النظام يمنع تلقائياً دخول موظفي الفواتير إلى الميديا والعكس، مع بقاء قواعد البيانات متكاملة.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black shadow-lg shadow-red-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل مستخدم جديد</span>
          </button>
        </div>

        {/* Feedback message */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs font-black opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">إجمالي المستخدمين</span>
              <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-neutral-900">{stats?.total || users.length}</div>
            <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
              <span>{stats?.active || 0} حساب مفعّل حالياً</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">قسم الفواتير والمحاسبة</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-[#DC2626] flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#DC2626]">{stats?.invoiceUsers || 0}</div>
            <div className="text-[11px] text-neutral-400 font-bold">مصرح لهم بدخول الفواتير فقط</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">قسم الميديا والإعلانات</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Tv className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-blue-600">{stats?.mediaUsers || 0}</div>
            <div className="text-[11px] text-neutral-400 font-bold">مصرح لهم بدخول الميديا فقط</div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-neutral-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-500">كافة الأنظمة (Admins)</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600">{stats?.allAccessUsers || 0}</div>
            <div className="text-[11px] text-neutral-400 font-bold">صلاحية شاملة لجميع البوابات</div>
          </div>
        </div>

        {/* Users Management Section */}
        <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden space-y-4">
          {/* Section Header with Search and Filter Tabs */}
          <div className="p-5 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-neutral-900">سجل المستخدمين وصلاحيات الدخول للأنظمة</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                تحديد أي موقع يمكن للموظف تسجيل الدخول إليه (الفواتير أو الميديا أو الإدارة)
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-2xl self-start">
              <button
                onClick={() => setFilterAccess('ALL_FILTER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  filterAccess === 'ALL_FILTER' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                الكل ({users.length})
              </button>
              <button
                onClick={() => setFilterAccess('INVOICE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  filterAccess === 'INVOICE' ? 'bg-[#DC2626] text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                الفواتير فقط
              </button>
              <button
                onClick={() => setFilterAccess('MEDIA')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  filterAccess === 'MEDIA' ? 'bg-blue-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                الميديا فقط
              </button>
              <button
                onClick={() => setFilterAccess('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  filterAccess === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                كافة الأنظمة
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="px-5">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-400 absolute top-3.5 start-3.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم الكامل، اسم المستخدم، البريد، أو رقم الهاتف..."
                className="w-full ps-10 pe-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626] transition-colors"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-[#111827] text-white">
                <tr>
                  <th className="p-4 text-start">المستخدم</th>
                  <th className="p-4 text-start">اسم الدخول (Username)</th>
                  <th className="p-4 text-start">البريد والهاتف</th>
                  <th className="p-4 text-center">النظام المصرح بالدخول إليه</th>
                  <th className="p-4 text-center">الدور الوظيفي</th>
                  <th className="p-4 text-center">حالة الحساب</th>
                  <th className="p-4 text-end">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-neutral-400 font-bold">
                      جاري تحميل بيانات المستخدمين...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-neutral-400 font-bold">
                      لا يوجد مستخدمين يطابقون خيارات البحث والفلتر.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-50/70">
                      {/* Name */}
                      <td className="p-4">
                        <div className="font-black text-neutral-900 text-sm">{u.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          ID: {u.id.substring(0, 8)}...
                        </div>
                      </td>

                      {/* Username */}
                      <td className="p-4">
                        <span className="font-mono text-xs font-bold text-neutral-800 bg-neutral-100 px-2.5 py-1 rounded-xl border border-neutral-200">
                          @{u.username || 'بدون اسم مستخدم'}
                        </span>
                      </td>

                      {/* Email & Phone */}
                      <td className="p-4 text-neutral-600">
                        <div className="text-xs font-bold text-neutral-800">{u.email}</div>
                        <div className="text-[11px] text-neutral-400">{u.phone || 'لا يوجد هاتف'}</div>
                      </td>

                      {/* System Access Badge */}
                      <td className="p-4 text-center">
                        {u.systemAccess === 'INVOICE' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-red-50 text-[#DC2626] border border-red-200">
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>قسم الفواتير فقط</span>
                          </span>
                        )}
                        {u.systemAccess === 'MEDIA' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            <Tv className="w-3.5 h-3.5" />
                            <span>قسم الميديا فقط</span>
                          </span>
                        )}
                        {u.systemAccess === 'ALL' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>كافة الأنظمة (شامل)</span>
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {u.role === 'ADMIN' && 'مدير نظام (Admin)'}
                          {u.role === 'FINANCE_MANAGER' && 'مدير مالي'}
                          {u.role === 'ACCOUNTANT' && 'محاسب'}
                          {u.role === 'SALES' && 'مبيعات / ميديا'}
                        </span>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                            u.isActive
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200 border border-neutral-300'
                          }`}
                          title="انقر لتفعيل أو تعطيل الحساب"
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>مفعّل</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-neutral-400" />
                              <span>معطّل</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Details */}
                          <button
                            onClick={() => {
                              setShowEditModal(u);
                              setEditFormData({
                                name: u.name,
                                username: u.username || '',
                                email: u.email,
                                phone: u.phone || '',
                                role: u.role,
                                systemAccess: u.systemAccess,
                                isActive: u.isActive,
                              });
                            }}
                            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                            title="تعديل بيانات المستخدم والصلاحيات"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setShowPasswordModal(u);
                              setNewPassword('');
                            }}
                            className="p-2 text-neutral-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
                            title="تغيير كلمة المرور"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={admin?.id === u.id}
                            className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 rounded-xl transition-colors cursor-pointer"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ================= MODAL 1: ADD USER ================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-[#DC2626] flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">تسجيل مستخدم جديد في النظام</h3>
                  <p className="text-xs text-neutral-400">تحديد اسم الدخول وكلمة المرور والنظام المصرح به</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-800 text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">الاسم الكامل للموظف *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: علي أحمد علي"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    اسم الدخول (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ali_media أو ali.ahmed"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@oms.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">كلمة المرور *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الهاتف (اختياري)</label>
                  <input
                    type="text"
                    placeholder="01000000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">الدور الوظيفي</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="ACCOUNTANT">محاسب (Accountant)</option>
                    <option value="FINANCE_MANAGER">مدير مالي (Finance Manager)</option>
                    <option value="SALES">مبيعات / ميديا (Sales / Media)</option>
                    <option value="ADMIN">مدير نظام (Admin)</option>
                  </select>
                </div>
              </div>

              {/* Crucial: System Access Selection */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black text-neutral-900">
                  🔒 النظام المصرح له بالدخول إليه (اختصاص الموظف لمنع التداخل):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.systemAccess === 'INVOICE'
                        ? 'border-[#DC2626] bg-red-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileSpreadsheet className="w-5 h-5 text-[#DC2626]" />
                      <input
                        type="radio"
                        name="systemAccess"
                        value="INVOICE"
                        checked={formData.systemAccess === 'INVOICE'}
                        onChange={() => setFormData({ ...formData, systemAccess: 'INVOICE' })}
                        className="accent-[#DC2626]"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">قسم الفواتير فقط</div>
                    <div className="text-[10px] text-neutral-500 mt-1">ممنوع من دخول قسم الميديا</div>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.systemAccess === 'MEDIA'
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Tv className="w-5 h-5 text-blue-600" />
                      <input
                        type="radio"
                        name="systemAccess"
                        value="MEDIA"
                        checked={formData.systemAccess === 'MEDIA'}
                        onChange={() => setFormData({ ...formData, systemAccess: 'MEDIA' })}
                        className="accent-blue-600"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">قسم الميديا فقط</div>
                    <div className="text-[10px] text-neutral-500 mt-1">ممنوع من دخول نظام الفواتير</div>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      formData.systemAccess === 'ALL'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <input
                        type="radio"
                        name="systemAccess"
                        value="ALL"
                        checked={formData.systemAccess === 'ALL'}
                        onChange={() => setFormData({ ...formData, systemAccess: 'ALL' })}
                        className="accent-emerald-600"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">كافة الأنظمة (شامل)</div>
                    <div className="text-[10px] text-neutral-500 mt-1">فواتير وميديا ولوحة الإدارة</div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-300 text-white text-xs font-black shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  {actionLoading ? 'جاري الإنشاء...' : 'حفظ المستخدم وتفعيل الصلاحيات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: EDIT USER ================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  تعديل بيانات وصلاحيات ({showEditModal.name})
                </h3>
                <p className="text-xs text-neutral-400">تحديث اختصاص النظام أو بيانات الحساب</p>
              </div>
              <button
                onClick={() => setShowEditModal(null)}
                className="text-neutral-400 hover:text-neutral-800 text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">اسم الدخول (Username) *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold font-mono focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">الدور الوظيفي</label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="ACCOUNTANT">محاسب (Accountant)</option>
                    <option value="FINANCE_MANAGER">مدير مالي (Finance Manager)</option>
                    <option value="SALES">مبيعات / ميديا (Sales / Media)</option>
                    <option value="ADMIN">مدير نظام (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">حالة الحساب</label>
                  <select
                    value={editFormData.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.value === 'true' })}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-[#DC2626]"
                  >
                    <option value="true">مفعّل (يمكنه الدخول)</option>
                    <option value="false">معطّل (محظور مؤقتاً)</option>
                  </select>
                </div>
              </div>

              {/* System Access Selection */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-black text-neutral-900">
                  🔒 النظام المصرح له بالدخول إليه:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      editFormData.systemAccess === 'INVOICE'
                        ? 'border-[#DC2626] bg-red-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileSpreadsheet className="w-5 h-5 text-[#DC2626]" />
                      <input
                        type="radio"
                        name="editSystemAccess"
                        value="INVOICE"
                        checked={editFormData.systemAccess === 'INVOICE'}
                        onChange={() => setEditFormData({ ...editFormData, systemAccess: 'INVOICE' })}
                        className="accent-[#DC2626]"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">قسم الفواتير فقط</div>
                    <div className="text-[10px] text-neutral-500 mt-1">ممنوع من دخول قسم الميديا</div>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      editFormData.systemAccess === 'MEDIA'
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Tv className="w-5 h-5 text-blue-600" />
                      <input
                        type="radio"
                        name="editSystemAccess"
                        value="MEDIA"
                        checked={editFormData.systemAccess === 'MEDIA'}
                        onChange={() => setEditFormData({ ...editFormData, systemAccess: 'MEDIA' })}
                        className="accent-blue-600"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">قسم الميديا فقط</div>
                    <div className="text-[10px] text-neutral-500 mt-1">ممنوع من دخول نظام الفواتير</div>
                  </label>

                  <label
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      editFormData.systemAccess === 'ALL'
                        ? 'border-emerald-600 bg-emerald-50/50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <input
                        type="radio"
                        name="editSystemAccess"
                        value="ALL"
                        checked={editFormData.systemAccess === 'ALL'}
                        onChange={() => setEditFormData({ ...editFormData, systemAccess: 'ALL' })}
                        className="accent-emerald-600"
                      />
                    </div>
                    <div className="font-black text-xs text-neutral-900">كافة الأنظمة (شامل)</div>
                    <div className="text-[10px] text-neutral-500 mt-1">فواتير وميديا ولوحة الإدارة</div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-5 py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-300 text-white text-xs font-black shadow-lg shadow-red-600/20 transition-all cursor-pointer"
                >
                  {actionLoading ? 'جاري الحفظ...' : 'تحديث البيانات والصلاحيات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RESET PASSWORD ================= */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-2xl w-full max-w-md p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">إعادة تعيين كلمة المرور</h3>
                  <p className="text-xs text-neutral-400">للمستخدم: {showPasswordModal.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(null)}
                className="text-neutral-400 hover:text-neutral-800 text-lg font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  كلمة المرور الجديدة (6 أحرف على الأقل) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-bold focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(null)}
                  className="px-5 py-2.5 rounded-2xl border border-neutral-200 text-xs font-bold text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:bg-neutral-300 text-white text-xs font-black shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
                >
                  {actionLoading ? 'جاري التغيير...' : 'تأكيد كلمة المرور الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
