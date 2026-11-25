import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/api.js';
import { Invoice, ApprovalStep } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Printer,
  Send,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Mail,
  MessageSquare,
  FileText,
  RotateCw,
} from 'lucide-react';

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'ONLINE'>('BANK_TRANSFER');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<'EMAIL' | 'WHATSAPP'>('EMAIL');
  const [deliveryRecipient, setDeliveryRecipient] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');

  const fetchInvoice = async () => {
    setLoading(true);
    const res = await apiRequest<Invoice>(`/invoices/${id}`);
    if (res.success && res.data) {
      setInvoice(res.data);
      setPaymentAmount(Number(res.data.remainingBalance));
      setDeliveryRecipient(
        deliveryChannel === 'WHATSAPP'
          ? res.data.client?.whatsappNumber || res.data.client?.phone || ''
          : res.data.client?.email || ''
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!invoice) return;
    setActionLoading(true);
    const res = await apiRequest(`/approvals/${invoice.id}/submit`, { method: 'POST' });
    setActionLoading(false);
    if (res.success) {
      setMessage({ text: res.message || 'تم إرسال الفاتورة للاعتماد', type: 'success' });
      fetchInvoice();
    } else {
      setMessage({ text: res.message || 'فشل إرسال الفاتورة', type: 'error' });
    }
  };

  // Approve
  const handleApprove = async () => {
    if (!invoice) return;
    setActionLoading(true);
    const res = await apiRequest(`/approvals/${invoice.id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments: 'معتمدة نظامياً ومطابقة للشروط' }),
    });
    setActionLoading(false);
    if (res.success) {
      setMessage({ text: res.message || 'تم اعتماد الفاتورة وتجميد الضرائب بنجاح', type: 'success' });
      fetchInvoice();
    } else {
      setMessage({ text: res.message || 'فشل اعتماد الفاتورة', type: 'error' });
    }
  };

  // Reject
  const handleReject = async () => {
    if (!invoice || !rejectComment.trim()) return;
    setActionLoading(true);
    const res = await apiRequest(`/approvals/${invoice.id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments: rejectComment }),
    });
    setActionLoading(false);
    setShowRejectModal(false);
    if (res.success) {
      setMessage({ text: res.message || 'تم رفض الفاتورة وإعادتها لمسودة', type: 'success' });
      fetchInvoice();
    } else {
      setMessage({ text: res.message || 'فشل رفض الفاتورة', type: 'error' });
    }
  };

  // Record Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setActionLoading(true);
    const res = await apiRequest('/payments', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: invoice.id,
        amount: Number(paymentAmount),
        paymentMethod,
        referenceNumber: paymentRef,
        notes: paymentNotes,
      }),
    });
    setActionLoading(false);
    setShowPaymentModal(false);
    if (res.success) {
      setMessage({ text: res.message || 'تم تسجيل الدفعة بنجاح', type: 'success' });
      fetchInvoice();
    } else {
      setMessage({ text: res.message || 'فشل تسجيل الدفعة', type: 'error' });
    }
  };

  // Format phone number for wa.me (digits only, auto-prepend Egypt country code 20 for 01xxxxxxxxx)
  const formatWhatsAppPhone = (raw: string): string => {
    let digits = raw.replace(/[^\d]/g, '');
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.length === 11 && digits.startsWith('01')) {
      digits = `2${digits}`;
    }
    return digits;
  };

  // Send Invoice
  const handleSendInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    if (deliveryChannel === 'WHATSAPP') {
      const cleanPhone = formatWhatsAppPhone(deliveryRecipient);
      if (!cleanPhone) {
        setMessage({ text: 'يرجى إدخال رقم واتساب صحيح', type: 'error' });
        return;
      }

      const clientName = invoice.client?.name || 'العميل العزيز';
      const totalFormatted = Number(invoice.totalAmount || 0).toLocaleString('ar-EG');
      const dueDateFormatted = invoice.dueDate
        ? new Date(invoice.dueDate).toLocaleDateString('ar-EG')
        : '-';

      const whatsappMessage = [
        `مرحباً ${clientName}،`,
        `نرفق لحضراتكم تفاصيل الفاتورة الضريبية الصادرة من شركة OMS:`,
        `• رقم الفاتورة: ${invoice.invoiceNumber}`,
        `• المبلغ الإجمالي: ${totalFormatted} ج.م`,
        `• تاريخ الاستحقاق: ${dueDateFormatted}`,
        `شكراً لتعاملكم معنا.`,
      ].join('\n');

      const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }

    setActionLoading(true);
    const res = await apiRequest('/delivery/send', {
      method: 'POST',
      body: JSON.stringify({
        invoiceId: invoice.id,
        channel: deliveryChannel,
        recipient: deliveryRecipient,
      }),
    });
    setActionLoading(false);
    setShowDeliveryModal(false);
    if (res.success) {
      setMessage({
        text:
          deliveryChannel === 'WHATSAPP'
            ? 'تم فتح واتساب برسالة الفاتورة وتوثيق العملية في سجل التسليم'
            : res.message || 'تم إرسال الفاتورة بنجاح',
        type: 'success',
      });
      fetchInvoice();
    } else {
      setMessage({ text: res.message || 'فشل إرسال الفاتورة', type: 'error' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="p-12 text-center text-neutral-400 font-bold">جاري تحميل الفاتورة...</div>;
  }

  if (!invoice) {
    return <div className="p-12 text-center text-red-500 font-bold">الفاتورة غير موجودة</div>;
  }

  const isCreator = user?.id === invoice.createdById;
  const canApproveRole = hasRole(['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']);
  const canSelfApproveBlocked = isCreator && invoice.status === 'PENDING_APPROVAL';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-neutral-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors"
            title="عودة للقائمة"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-neutral-900">{invoice.invoiceNumber}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-neutral-100 text-neutral-800">
                {invoice.status}
              </span>
              {invoice.isOverdue && (
                <span className="text-[11px] px-2.5 py-1 rounded-full font-extrabold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>متأخرة ({invoice.daysOverdue} يوم)</span>
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              أنشئت بواسطة: <span className="font-semibold text-neutral-700">{invoice.createdBy?.name}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة / PDF</span>
          </button>

          {/* DRAFT -> Submit for approval */}
          {invoice.status === 'DRAFT' && hasRole(['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']) && (
            <button
              onClick={handleSubmitForApproval}
              disabled={actionLoading}
              className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-red-600/20 transition-all"
            >
              <Send className="w-4 h-4" />
              <span>إرسال للاعتماد المالي</span>
            </button>
          )}

          {/* PENDING APPROVAL -> Approve / Reject */}
          {invoice.status === 'PENDING_APPROVAL' && canApproveRole && !isCreator && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
              >
                <CheckCircle className="w-4 h-4" />
                <span>اعتماد وإصدار</span>
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-rose-200"
              >
                <XCircle className="w-4 h-4" />
                <span>رفض</span>
              </button>
            </>
          )}

          {/* ISSUED / PARTIALLY PAID -> Send & Record Payment */}
          {(invoice.status === 'ISSUED' || invoice.status === 'PARTIALLY_PAID') && (
            <>
              <button
                onClick={() => setShowDeliveryModal(true)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200"
              >
                <Send className="w-4 h-4" />
                <span>إرسال للعميل</span>
              </button>
              {hasRole(['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT']) && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>تسجيل دفعة</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Separation of Duties Warning */}
      {canSelfApproveBlocked && (
        <div className="no-print p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>
            ضابط فصل المهام: أنت من قمت بإنشاء هذه الفاتورة، وبالتالي لا يحق لك اعتمادها بنفسك نظامياً. يجب أن يراجعها ويعتمدها مسؤول آخر مخوّل.
          </span>
        </div>
      )}

      {message && (
        <div
          className={`no-print p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* INVOICE PAPER (PRINTABLE) */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-lg p-8 sm:p-12 space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b-2 border-neutral-900 pb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#DC2626] flex items-center justify-center font-black text-2xl text-white shadow-md">
                OMS
              </div>
              <div>
                <h2 className="text-2xl font-black text-neutral-900 tracking-tight">شركة OMS</h2>
                <div className="text-xs text-neutral-500 font-semibold">
                  تسويق وتصميم وبرمجيات متقدمة | Cairo, Egypt
                </div>
              </div>
            </div>
          </div>

          <div className="text-start sm:text-end space-y-1">
            <div className="text-2xl font-black text-[#DC2626] tracking-wider uppercase">فاتورة ضريبية</div>
            <div className="text-sm font-black text-neutral-800">{invoice.invoiceNumber}</div>
            <div className="text-xs text-neutral-500">
              تاريخ الإصدار: {new Date(invoice.issueDate).toLocaleDateString('ar-EG')}
            </div>
            <div className="text-xs text-neutral-700 font-bold">
              تاريخ الاستحقاق: {new Date(invoice.dueDate).toLocaleDateString('ar-EG')}
            </div>
          </div>
        </div>

        {/* Client & Company Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5 rounded-2xl bg-neutral-50 border border-neutral-100 text-xs">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">فاتورة إلى العميل:</span>
            <div className="font-black text-sm text-neutral-900">{invoice.client?.name}</div>
            {invoice.client?.companyName && (
              <div className="font-bold text-neutral-700 mt-0.5">{invoice.client.companyName}</div>
            )}
            <div className="text-neutral-500 mt-1">
              السجل الضريبي للعميل: <span className="font-bold text-neutral-800">{invoice.client?.taxNumber || 'غير مسجل'}</span>
            </div>
            {invoice.client?.address && <div className="text-neutral-500 mt-0.5">{invoice.client.address}</div>}
          </div>

          <div className="sm:text-end">
            <span className="text-[11px] font-bold text-neutral-400 block mb-1">بيانات الشركة المصدرة:</span>
            <div className="font-bold text-neutral-900">شركة OMS للدعاية والإعلان والبرمجيات</div>
            <div className="text-neutral-500 mt-1">الرقم الضريبي: 450-891-230</div>
            <div className="text-neutral-500 mt-0.5">تطوير النظام: MDE – Matrix Data Egypt</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#171717] text-white">
              <tr>
                <th className="p-3 text-start rounded-s-xl">#</th>
                <th className="p-3 text-start">البيان / الخدمة</th>
                <th className="p-3 text-center">الكمية</th>
                <th className="p-3 text-end">سعر الوحدة</th>
                <th className="p-3 text-end rounded-e-xl">الإجمالي (ج.م)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {invoice.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/60">
                  <td className="p-3 font-bold text-neutral-400">{idx + 1}</td>
                  <td className="p-3 font-semibold text-neutral-900">{item.description}</td>
                  <td className="p-3 text-center font-bold text-neutral-700">{item.quantity}</td>
                  <td className="p-3 text-end text-neutral-700">{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="p-3 text-end font-black text-neutral-900">
                    {Number(item.total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Breakdown & Taxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
          <div className="space-y-3 text-xs text-neutral-600">
            <div>
              <span className="font-bold text-neutral-900 block mb-1">الملاحظات:</span>
              <p className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px]">
                {invoice.notes || 'لا توجد ملاحظات إضافية.'}
              </p>
            </div>
            <div>
              <span className="font-bold text-neutral-900 block mb-1">الشروط والأحكام:</span>
              <p className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-[11px]">
                {invoice.terms || 'يتم السداد بالجنيه المصري عبر تحويل بنكي.'}
              </p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-neutral-700 bg-neutral-50 p-5 rounded-2xl border border-neutral-100">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-bold">{Number(invoice.subtotal).toLocaleString()} ج.م</span>
            </div>

            {Number(invoice.discountAmount) > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>خصم تجاري:</span>
                <span className="font-bold">-{Number(invoice.discountAmount).toLocaleString()} ج.م</span>
              </div>
            )}

            {/* Frozen Taxes Breakdown */}
            {invoice.taxes && invoice.taxes.length > 0 ? (
              invoice.taxes.map((tax) => (
                <div key={tax.id} className="flex justify-between text-neutral-800">
                  <span>{tax.taxName} (مجمدة عند الإصدار):</span>
                  <span className="font-bold">+{Number(tax.taxAmount).toLocaleString()} ج.م</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between">
                <span>ضريبة القيمة المضافة (VAT 14%):</span>
                <span className="font-bold">+{Number(invoice.taxAmount).toLocaleString()} ج.م</span>
              </div>
            )}

            <div className="border-t-2 border-neutral-900 pt-3 flex justify-between items-center text-sm">
              <span className="font-black text-neutral-900">إجمالي الفاتورة:</span>
              <span className="font-black text-xl text-[#DC2626]">
                {Number(invoice.totalAmount).toLocaleString()} ج.م
              </span>
            </div>

            <div className="flex justify-between text-xs text-emerald-600 border-t border-neutral-200 pt-2">
              <span>المبلغ المسدد:</span>
              <span className="font-bold">{Number(invoice.paidAmount).toLocaleString()} ج.م</span>
            </div>

            <div className="flex justify-between text-xs text-red-600 font-black">
              <span>الرصيد المتبقي المطلوب:</span>
              <span>{Number(invoice.remainingBalance).toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>

        {/* Footer Audit Signatures */}
        <div className="pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-4">
          <div>
            تم الإنشاء بواسطة: <span className="font-bold text-neutral-700">{invoice.createdBy?.name}</span>
          </div>
          <div>
            الحالة الاعتمادية: <span className="font-bold text-neutral-700">{invoice.status}</span>
          </div>
          <div className="text-center sm:text-end">
            <span>نظام OMS Invoice | تطوير </span>
            <span className="font-bold text-[#DC2626]">MDE – Matrix Data Egypt</span>
          </div>
        </div>
      </div>

      {/* History & Decoupled Tables Tabs (no-print) */}
      <div className="no-print bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-sm space-y-6">
        <h3 className="font-extrabold text-sm text-neutral-900 border-b border-neutral-100 pb-3">
          سجلات الفاتورة المنفصلة (الاعتمادات، المدفوعات، وإرسال الرسائل)
        </h3>

        {/* Approvals Step Log */}
        <div>
          <div className="text-xs font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-[#DC2626]" />
            <span>سجل خطوات الاعتماد (approval_steps):</span>
          </div>
          <div className="space-y-2">
            {invoice.approvalSteps?.length === 0 ? (
              <div className="text-xs text-neutral-400 p-3 bg-neutral-50 rounded-xl">
                لم يتم إرسال الفاتورة للاعتماد بعد.
              </div>
            ) : (
              invoice.approvalSteps?.map((step) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-neutral-900">
                      المستوى {step.levelOrder} - الحالة: {step.status}
                    </div>
                    {step.comments && <div className="text-neutral-500 mt-0.5">{step.comments}</div>}
                  </div>
                  <div className="text-end">
                    <div className="font-bold text-neutral-700">
                      {step.approver ? step.approver.name : 'قيد الانتظار'}
                    </div>
                    {step.actionDate && (
                      <div className="text-[10px] text-neutral-400">
                        {new Date(step.actionDate).toLocaleString('ar-EG')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Delivery Logs */}
        <div>
          <div className="text-xs font-bold text-neutral-700 mb-2 flex items-center gap-1.5">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>سجل محاولات الإرسال (delivery_logs):</span>
          </div>
          <div className="space-y-2">
            {invoice.deliveryLogs?.length === 0 ? (
              <div className="text-xs text-neutral-400 p-3 bg-neutral-50 rounded-xl">
                لم يتم تسجيل أي محاولات إرسال للعميل بعد.
              </div>
            ) : (
              invoice.deliveryLogs?.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/70 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800">{log.channel}</span>
                    <span className="text-neutral-500">إلى: {log.recipient}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? 'تم الإرسال' : 'فشل'}
                    </span>
                    {log.sentAt && (
                      <span className="text-[10px] text-neutral-400">
                        {new Date(log.sentAt).toLocaleString('ar-EG')}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-black text-neutral-900 text-base">تسجيل دفعة نقدية أو بنكية</h3>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">المبلغ (ج.م)</label>
                <input
                  type="number"
                  min="1"
                  max={Number(invoice.remainingBalance)}
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                />
                <span className="text-[10px] text-neutral-400">
                  المتبقي الحالي: {Number(invoice.remainingBalance).toLocaleString()} ج.م
                </span>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                >
                  <option value="BANK_TRANSFER">تحويل بنكي (Bank Transfer)</option>
                  <option value="CASH">نقدي (Cash)</option>
                  <option value="CHEQUE">شيك (Cheque)</option>
                  <option value="ONLINE">دفع إلكتروني (Online)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">رقم الإيصال / الحوالة</label>
                <input
                  type="text"
                  placeholder="مثال: REF-99214"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">ملاحظات</label>
                <textarea
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  تأكيد وحفظ الدفعة
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-black text-neutral-900 text-base">إرسال الفاتورة إلى العميل</h3>
            <form onSubmit={handleSendInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">قناة الإرسال</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryChannel('EMAIL');
                      setDeliveryRecipient(invoice.client?.email || '');
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                      deliveryChannel === 'EMAIL'
                        ? 'border-[#DC2626] bg-red-50 text-[#DC2626]'
                        : 'border-neutral-200'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    <span>بريد إلكتروني (Email)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryChannel('WHATSAPP');
                      setDeliveryRecipient(
                        invoice.client?.whatsappNumber || invoice.client?.phone || ''
                      );
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold ${
                      deliveryChannel === 'WHATSAPP'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                        : 'border-neutral-200'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>واتساب (WhatsApp)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  {deliveryChannel === 'WHATSAPP' ? 'رقم الواتساب مع كود الدولة' : 'البريد الإلكتروني'}
                </label>
                <input
                  type="text"
                  required
                  value={deliveryRecipient}
                  onChange={(e) => setDeliveryRecipient(e.target.value)}
                  placeholder={deliveryChannel === 'WHATSAPP' ? '+2010xxxxxxxx' : 'client@company.com'}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                />
              </div>

              {deliveryChannel === 'WHATSAPP' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                  سيتم فتح محادثة واتساب (WhatsApp Web / Desktop) على رقم العميل برسالة جاهزة تحتوي على رقم الفاتورة والمبلغ وتاريخ الاستحقاق، مع إمكانية إرفاق ملف الـ PDF وتوثيق العملية في السجل.
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold rounded-xl"
                >
                  {deliveryChannel === 'WHATSAPP' ? 'فتح واتساب وتوثيق الإرسال' : 'إرسال وتوثيق المحاولة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-black text-neutral-900 text-base">رفض الفاتورة وإعادتها لمسودة</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  سبب الرفض والملاحظات <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                  placeholder="حدد سبب الرفض أو التعديلات المطلوبة من المنشئ..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading || !rejectComment.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-300 text-white font-bold rounded-xl"
                >
                  تأكيد الرفض
                </button>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
