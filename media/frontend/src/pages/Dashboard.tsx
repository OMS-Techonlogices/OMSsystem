
import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiRequest } from '../services/api.js';
import { MediaRecord, FilterFacets } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import {
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Tv,
  Users,
  Truck,
  FileVideo,
  Calendar,
  CheckCircle2,
  Receipt,
  Download,
  Upload,
  FileDown,
  Eye,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { isReadOnly, user } = useAuth();

  const [records, setRecords] = useState<MediaRecord[]>([]);
  const [facets, setFacets] = useState<FilterFacets | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedContent, setSelectedContent] = useState('');
  const [monthFilterMode, setMonthFilterMode] = useState<'single' | 'multi' | 'range' | 'dateRange'>('single');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    clientId: '',
    supplierId: '',
    channelId: '',
    contentId: '',
    month: (() => {
      const now = new Date();
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    })(),
    startDate: '',
    endDate: '',
    netToChannel: 0,
    netToClient: 0,
    notes: '',
    status: 'PLANNED',
  });

  const ARABIC_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const getArabicMonthYear = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const month = ARABIC_MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${month} ${year}`;
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // Calculate financial totals
  const totalNetToClient = records.reduce(
    (total, record) =>
      total + Number(record.netToClient ?? record.cost ?? 0),
    0
  );

  const totalNetToChannel = records.reduce(
    (total, record) =>
      total + Number(record.netToChannel ?? 0),
    0
  );

  const totalNetDifference = totalNetToClient - totalNetToChannel;
  const profitMarginPercent =
    totalNetToClient > 0
      ? ((totalNetDifference / totalNetToClient) * 100).toFixed(1)
      : '0';

  // Fetch filter facets
  const fetchFacets = async () => {
    const res = await apiRequest<FilterFacets>('/records/filter-facets');

    if (res.success && res.data) {
      setFacets(res.data);
    }
  };

  // Fetch records with query params
  const fetchRecords = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (selectedClient) params.append('clientId', selectedClient);
      if (selectedSupplier) params.append('supplierId', selectedSupplier);
      if (selectedChannel) params.append('channelId', selectedChannel);
      if (selectedContent) params.append('contentId', selectedContent);

      if (monthFilterMode === 'single' && selectedMonth) {
        params.append('month', selectedMonth);
      } else if (monthFilterMode === 'multi' && selectedMonths.length > 0) {
        params.append('months', selectedMonths.join(','));
      } else if (monthFilterMode === 'range') {
        if (fromMonth) params.append('fromMonth', fromMonth);
        if (toMonth) params.append('toMonth', toMonth);
      } else if (monthFilterMode === 'dateRange') {
        if (fromDate) params.append('fromMonth', getArabicMonthYear(fromDate) || fromDate);
        if (toDate) params.append('toMonth', getArabicMonthYear(toDate) || toDate);
      }

      const query = params.toString();
      const res = await apiRequest<MediaRecord[]>(
        `/records${query ? `?${query}` : ''}`
      );

      if (res.success && res.data) {
        setRecords(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch media records:', error);
      setMessage({
        text: 'حدث خطأ أثناء تحميل سجلات الميديا',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacets();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [
    selectedClient,
    selectedSupplier,
    selectedChannel,
    selectedContent,
    selectedMonth,
    selectedMonths,
    fromMonth,
    toMonth,
    fromDate,
    toDate,
    monthFilterMode,
  ]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSelectedClient('');
    setSelectedSupplier('');
    setSelectedChannel('');
    setSelectedContent('');
    setSelectedMonth('');
    setSelectedMonths([]);
    setFromMonth('');
    setToMonth('');
    setFromDate('');
    setToDate('');
    setSearchTerm('');
    setMonthFilterMode('single');
  };

  const activeFiltersCount = [
    selectedClient,
    selectedSupplier,
    selectedChannel,
    selectedContent,
    monthFilterMode === 'single' && selectedMonth ? selectedMonth : null,
    monthFilterMode === 'multi' && selectedMonths.length > 0
      ? `${selectedMonths.length} شهور`
      : null,
    monthFilterMode === 'range' && (fromMonth || toMonth) ? 'range' : null,
    monthFilterMode === 'dateRange' && (fromDate || toDate) ? 'dateRange' : null,
  ].filter(Boolean).length;

  // Build export query parameters
  const buildFilterParams = () => {
    const params = new URLSearchParams();

    if (searchTerm.trim()) params.append('search', searchTerm.trim());
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedSupplier) params.append('supplierId', selectedSupplier);
    if (selectedChannel) params.append('channelId', selectedChannel);
    if (selectedContent) params.append('contentId', selectedContent);

    if (monthFilterMode === 'single' && selectedMonth) {
      params.append('month', selectedMonth);
    } else if (monthFilterMode === 'multi' && selectedMonths.length > 0) {
      params.append('months', selectedMonths.join(','));
    } else if (monthFilterMode === 'range') {
      if (fromMonth) params.append('fromMonth', fromMonth);
      if (toMonth) params.append('toMonth', toMonth);
    }

    return params;
  };

  // Helper to extract From Date and To Date reliably
  const extractRecordDates = (record: MediaRecord) => {
    let start = record.startDate || '';
    let end = record.endDate || '';
    if ((!start || !end) && record.notes) {
      const match = record.notes.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g);
      if (match && match.length >= 2) {
        start = start || match[0];
        end = end || match[1];
      }
    }
    return {
      start: start || '-',
      end: end || '-',
    };
  };

  // Export Data to CSV
  const handleExport = () => {
    const params = buildFilterParams();
    const query = params.toString();

    window.open(
      `https://oms-media-api.vercel.app/api/records/export${query ? `?${query}` : ''}`,
      '_blank'
    );
  };

  // Export Data to Excel (.xlsx)
  const handleExportExcel = () => {
    if (records.length === 0) {
      setMessage({ text: 'لا توجد بيانات حالية لتصديرها كملف Excel', type: 'error' });
      return;
    }

    const exportRows = records.map((record) => {
      const dates = extractRecordDates(record);
      const clientNet = Number(record.netToClient ?? record.cost ?? 0);
      const channelNet = Number(record.netToChannel || 0);
      const margin = clientNet - channelNet;

      return {
        'العميل (Client)': record.client?.name || '',
        'السجل الضريبي (Tax Number)': record.client?.taxNumber || '',
        'المورد (Supplier)': record.supplier?.name || '',
        'القناة (Channel)': record.channel?.name || '',
        'نوع المحتوى (Content Type)': record.content?.contentType?.name || 'عام',
        'المحتوى (Content)': record.content?.name || '',
        'من تاريخ (From Date)': dates.start,
        'إلى تاريخ (To Date)': dates.end,
        'الشهر (Month)': record.month,
        'مصاريف القناة (Net to Channel)': channelNet,
        'فلوس العميل (Net to Client)': clientNet,
        'معادلة الفرق (Client - Channel)': margin,
        'الملاحظات (Notes)': record.notes || '',
        'الحالة المحاسبية': record.invoiceId ? 'مفوترة' : 'جاهزة للفوترة',
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'سجلات_الميديا');
    XLSX.writeFile(wb, `OMS_Media_Campaigns_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Download Empty Template CSV
  const handleDownloadTemplate = () => {
    window.open(
      'https://oms-media-api.vercel.app/api/records/template',
      '_blank'
    );
  };

  // Download Empty Template Excel (.xlsx)
  const handleDownloadExcelTemplate = () => {
    const headers = [
      'Client',
      'supplier',
      'Channel',
      'Content Type',
      'Content',
      'From Date',
      'To Date',
      'Month',
      'Net to Channel',
      'Net to Client',
      'Notes',
    ];

    const sampleRows = [
      {
        Client: 'شركة النيل للاستثمار العقاري',
        supplier: 'Meta Platforms (Facebook & Instagram Ads)',
        Channel: 'Facebook',
        'Content Type': 'فيديو إعلاني سينمائي',
        Content: 'فيديو إطلاق المرحلة الأولى للمشروع العقاري',
        'From Date': '2026-01-01',
        'To Date': '2026-01-31',
        Month: 'يناير 2026',
        'Net to Channel': 25000,
        'Net to Client': 32000,
        Notes: 'حملة مستهدفة للتجمع والشيخ زايد',
      },
      {
        Client: 'مطاعم برجر شوب مصر',
        supplier: 'TikTok Ads MENA',
        Channel: 'TikTok',
        'Content Type': 'ريلز ومقاطع قصيرة',
        Content: 'ريلز عرض التخفيضات الأسبوعية 30%',
        'From Date': '2026-02-01',
        'To Date': '2026-02-28',
        Month: 'فبراير 2026',
        'Net to Channel': 12000,
        'Net to Client': 16500,
        Notes: 'فيديوهات ريلز مع فود بلوجرز',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'OMS_Media_Template');
    XLSX.writeFile(wb, 'OMS_Media_Template.xlsx');
  };

  // Parse Excel (.xlsx, .xls) or CSV File
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setMessage({
            text: 'ملف الإكسل فارغ أو لا يحتوي على صفوف بيانات صالحة',
            type: 'error',
          });
          return;
        }

        const parsedRows = rawJson.map((row) => {
          const rowObj: Record<string, any> = {};
          Object.keys(row).forEach((k) => {
            rowObj[k.trim()] = row[k];
          });
          return rowObj;
        });

        setImportPreview(parsedRows);
      } else {
        const text = await file.text();
        parseCSVText(text);
      }
    } catch (error) {
      console.error('File parse error:', error);
      setMessage({
        text: 'تعذر قراءة ملف الإكسل أو CSV المحدد',
        type: 'error',
      });
    }
  };

  // Update specific row in import preview (for quick easy editing of Net Client & Net Channel)
  const handleUpdatePreviewRow = (index: number, field: string, value: any) => {
    setImportPreview((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // CSV Parser supporting commas within quotes
  const parseCSVText = (text: string) => {
    const lines = text
      .split(/\r\n|\n/)
      .filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      setMessage({
        text: 'الملف لا يحتوي على صفوف بيانات كافية',
        type: 'error',
      });
      return;
    }

    const splitLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());

      return result;
    };

    const headers = splitLine(lines[0]);
    const parsedRows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitLine(lines[i]);

      if (values.length >= 4) {
        const rowObject: Record<string, string> = {};

        headers.forEach((header, index) => {
          rowObject[header] = values[index] || '';
        });

        parsedRows.push(rowObject);
      }
    }

    setImportPreview(parsedRows);
  };

  // Execute Import
  const handleExecuteImport = async () => {
    if (importPreview.length === 0) return;

    setImporting(true);
    setMessage(null);

    try {
      const res = await apiRequest('/records/import', {
        method: 'POST',
        body: JSON.stringify({
          rows: importPreview,
        }),
      });

      if (res.success) {
        setShowImportModal(false);
        setImportFile(null);
        setImportPreview([]);

        setMessage({
          text:
            res.message ||
            `تم استيراد ${res.data?.importedCount ?? 0} سجل بنجاح!`,
          type: 'success',
        });

        await fetchRecords();
        await fetchFacets();
      } else {
        setMessage({
          text: res.message || 'فشل استيراد البيانات',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage({
        text: 'حدث خطأ أثناء استيراد البيانات',
        type: 'error',
      });
    } finally {
      setImporting(false);
    }
  };

  // Add single campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    setActionLoading(true);
    setMessage(null);

    const formattedNotes = [
      newCampaign.notes,
      newCampaign.startDate && newCampaign.endDate
        ? `تاريخ الحملة: من ${newCampaign.startDate} إلى ${newCampaign.endDate}`
        : '',
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const res = await apiRequest('/records', {
        method: 'POST',
        body: JSON.stringify({
          ...newCampaign,
          notes: formattedNotes,
          netToChannel: Number(newCampaign.netToChannel),
          netToClient: Number(newCampaign.netToClient),
          cost: Number(
            newCampaign.netToClient || newCampaign.netToChannel
          ),
        }),
      });

      if (res.success) {
        setShowAddModal(false);

        setMessage({
          text: 'تمت إضافة حملة الميديا بنجاح',
          type: 'success',
        });

        setNewCampaign({
          title: '',
          clientId: '',
          supplierId: '',
          channelId: '',
          contentId: '',
          month: (() => {
      const now = new Date();
      const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      return `${months[now.getMonth()]} ${now.getFullYear()}`;
    })(),
          startDate: '',
          endDate: '',
          netToChannel: 0,
          netToClient: 0,
          notes: '',
          status: 'PLANNED',
        });

        await fetchRecords();
        await fetchFacets();
      } else {
        setMessage({
          text: res.message || 'فشل حفظ الحملة',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Create campaign error:', error);
      setMessage({
        text: 'حدث خطأ أثناء حفظ الحملة',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Issue invoice in accounting department
  const handleIssueInvoice = async (recordId: string) => {
    if (isReadOnly) return;

    setActionLoading(true);
    setMessage(null);

    try {
      const res = await apiRequest(
        '/accounting/create-invoice-from-media',
        {
          method: 'POST',
          body: JSON.stringify({
            mediaRecordId: recordId,
          }),
        }
      );

      if (res.success && res.data) {
        setMessage({
          text: `تم إصدار الفاتورة المحاسبية رقم (${res.data.invoiceNumber}) بمبلغ ${res.data.totalAmount} ج.م وربطها بنظام المحاسبة!`,
          type: 'success',
        });

        await fetchRecords();
      } else {
        setMessage({
          text: res.message || 'فشل إصدار الفاتورة',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Issue invoice error:', error);
      setMessage({
        text: 'حدث خطأ أثناء إصدار الفاتورة',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#171717] via-[#222222] to-[#171717] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-neutral-800">
        <div className="absolute top-0 end-0 -mt-8 -me-8 w-48 h-48 bg-[#DC2626]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
              <span className="text-xs font-bold text-red-400">
                لوحة تحكم قسم الميديا وتخطيط الحملات
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              سجلات الميديا والبيانات المالية
            </h1>

            <p className="text-xs text-neutral-400 mt-1 max-w-xl">
              إدخال واستخراج البيانات (Import & Export)، تصفية ذكية على نظام
              Kaggle، وربط المحاسبة
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {!isReadOnly && (
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700 shadow-md transition-all"
                title="استيراد بيانات من ملف Excel (.xlsx) أو CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>استيراد ملف Excel / CSV</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold border border-neutral-700 shadow-md transition-all"
              title="تصدير البيانات كملف Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold border border-neutral-700 shadow-md transition-all"
              title="تصدير البيانات الحالية كملف CSV"
            >
              <Download className="w-3.5 h-3.5 text-neutral-400" />
              <span>CSV</span>
            </button>

            {!isReadOnly ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-black shadow-lg shadow-red-900/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حملة جديدة</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>وضع المراقبة: استعراض وتصدير التقارير فقط</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Only Alert */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200/80 text-amber-950 p-4 rounded-3xl flex items-center gap-3 text-xs font-bold shadow-sm">
          <div className="w-9 h-9 rounded-2xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0 font-black">
            <Eye className="w-4 h-4" />
          </div>

          <div>
            <span className="font-black text-sm block">
              مرحباً بك {user?.name || 'يا مدير'} (حساب متابعة وعرض فقط)
            </span>

            <span className="text-amber-800 text-[11px] font-medium">
              أنت الآن في وضع المشاهدة لقسم الميديا: يمكنك تصفح كافة الحملات
              والبيانات والفلترة المتقدمة للشهور وتصدير التقارير دون إمكانية
              إجراء أي تعديل أو حذف.
            </span>
          </div>
        </div>
      )}

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-500">
            إجمالي سجلات الحملات
          </span>
          <div className="text-2xl font-black text-neutral-900">
            {records.length}
          </div>
          <div className="text-[11px] text-neutral-400">
            سجل إعلاني موثق
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-500">
            إجمالي Net to Client (ج.م)
          </span>
          <div className="text-2xl font-black text-[#DC2626]">
            {totalNetToClient.toLocaleString('en-US')} ج.م
          </div>
          <div className="text-[11px] text-neutral-400">
            القيمة الصافية المستحقة على العملاء
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-2">
          <span className="text-xs font-bold text-neutral-500">
            إجمالي Net to Channel (ج.م)
          </span>
          <div className="text-2xl font-black text-blue-600">
            {totalNetToChannel.toLocaleString('en-US')} ج.م
          </div>
          <div className="text-[11px] text-neutral-400">
            التكلفة الصافية للقنوات والموردين
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500">
              الفرق (Net Client - Net Channel)
            </span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                totalNetDifference >= 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {totalNetDifference >= 0 ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`}
            </span>
          </div>
          <div
            className={`text-2xl font-black ${
              totalNetDifference >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalNetDifference.toLocaleString('en-US')} ج.م
          </div>
          <div className="text-[11px] text-neutral-400">
            صافي الفرق المالي بين العميل والقناة
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 w-full"
          >
            <Search className="w-4 h-4 text-neutral-400 absolute top-3.5 start-3.5" />

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم أو العميل أو المورد أو القناة أو المحتوى أو الشهر أو الملاحظات..."
              className="w-full ps-10 pe-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#DC2626] transition-colors"
            />
          </form>

          <button
            type="button"
            onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-extrabold transition-all shrink-0 ${
              filterDrawerOpen || activeFiltersCount > 0
                ? 'bg-[#171717] text-white border-neutral-900 shadow-md'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#DC2626]" />
            <span>الفلاتر المتقدمة (Filters)</span>

            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#DC2626] text-white text-[10px] flex items-center justify-center font-black">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {filterDrawerOpen && facets && (
          <div className="pt-4 border-t border-neutral-100 space-y-3 bg-neutral-50/70 p-4 rounded-2xl border border-neutral-200/60 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Client */}
              <div>
                <label className="block font-black text-neutral-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-neutral-500" />
                  <span>العميل (Client)</span>
                </label>

                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:border-[#DC2626]"
                >
                  <option value="">جميع العملاء</option>
                  {facets.clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block font-black text-neutral-700 mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-neutral-500" />
                  <span>المورد (Supplier)</span>
                </label>

                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:border-[#DC2626]"
                >
                  <option value="">جميع الموردين</option>
                  {facets.suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Channel */}
              <div>
                <label className="block font-black text-neutral-700 mb-1 flex items-center gap-1">
                  <Tv className="w-3.5 h-3.5 text-neutral-500" />
                  <span>القناة (Channel)</span>
                </label>

                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:border-[#DC2626]"
                >
                  <option value="">جميع القنوات</option>
                  {facets.channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="block font-black text-neutral-700 mb-1 flex items-center gap-1">
                  <FileVideo className="w-3.5 h-3.5 text-neutral-500" />
                  <span>المحتوى (Content)</span>
                </label>

                <select
                  value={selectedContent}
                  onChange={(e) => setSelectedContent(e.target.value)}
                  className="w-full p-2 bg-white border border-neutral-200 rounded-xl text-xs font-medium focus:border-[#DC2626]"
                >
                  <option value="">جميع المحتويات</option>
                  {facets.contents.map((content) => (
                    <option key={content.id} value={content.id}>
                      {content.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Month Filters */}
            <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/90 shadow-sm space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center font-black">
                    <Calendar className="w-4 h-4" />
                  </div>

                  <div>
                    <span className="font-black text-neutral-800 text-xs">
                      فلترة الشهور (Month Filtering)
                    </span>
                    <p className="text-[10px] text-neutral-400 font-semibold">
                      اختر شهر محدد، أو عدة شهور معاً، أو حدد نطاقاً زمنياً
                    </p>
                  </div>
                </div>

                {/* Mode Switcher */}
                <div className="inline-flex p-1 bg-neutral-100 rounded-xl gap-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setMonthFilterMode('single');
                      setSelectedMonths([]);
                      setFromMonth('');
                      setToMonth('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      monthFilterMode === 'single'
                        ? 'bg-white text-neutral-900 shadow-sm font-black'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    شهر واحد
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMonthFilterMode('multi');
                      setSelectedMonth('');
                      setFromMonth('');
                      setToMonth('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      monthFilterMode === 'multi'
                        ? 'bg-white text-neutral-900 shadow-sm font-black'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    عدة أشهر {selectedMonths.length > 0 && `(${selectedMonths.length})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMonthFilterMode('range');
                      setSelectedMonth('');
                      setSelectedMonths([]);
                      setFromDate('');
                      setToDate('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      monthFilterMode === 'range'
                        ? 'bg-white text-neutral-900 shadow-sm font-black'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    من شهر إلى شهر (نطاق)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMonthFilterMode('dateRange');
                      setSelectedMonth('');
                      setSelectedMonths([]);
                      setFromMonth('');
                      setToMonth('');
                    }}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      monthFilterMode === 'dateRange'
                        ? 'bg-white text-neutral-900 shadow-sm font-black'
                        : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    تحديد باليوم والشهر والسنة
                  </button>
                </div>
              </div>

              {/* Single Month */}
              {monthFilterMode === 'single' && (
                <div className="max-w-xs pt-1">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-[#DC2626]"
                  >
                    <option value="">جميع الشهور</option>
                    {facets.months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Multiple Months */}
              {monthFilterMode === 'multi' && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-neutral-500 font-bold">
                      انقر على الشهور التي تريد تصفية البيانات بها:
                    </span>

                    {selectedMonths.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedMonths([])}
                        className="text-[#DC2626] hover:underline font-bold"
                      >
                        إلغاء تحديد الكل ({selectedMonths.length})
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-neutral-50/50 rounded-xl border border-neutral-100">
                    {facets.months.map((month) => {
                      const isSelected = selectedMonths.includes(month);

                      return (
                        <button
                          key={month}
                          type="button"
                          onClick={() => {
                            setSelectedMonths((previous) =>
                              isSelected
                                ? previous.filter((item) => item !== month)
                                : [...previous, month]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#171717] text-white border-neutral-900 shadow-sm'
                              : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          {isSelected ? '✓ ' : ''}
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Month Range */}
              {monthFilterMode === 'range' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      من شهر (بداية الفترة):
                    </label>

                    <select
                      value={fromMonth}
                      onChange={(e) => setFromMonth(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-[#DC2626]"
                    >
                      <option value="">-- من البداية --</option>
                      {facets.months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      إلى شهر (نهاية الفترة):
                    </label>

                    <select
                      value={toMonth}
                      onChange={(e) => setToMonth(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-[#DC2626]"
                    >
                      <option value="">-- حتى النهاية --</option>
                      {facets.months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Date Range with Day, Month, Year */}
              {monthFilterMode === 'dateRange' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      بداية الحملة (من يوم / شهر / سنة):
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-[#DC2626]"
                    />
                    {fromDate && (
                      <span className="text-[10px] text-neutral-500 mt-1 block font-semibold">
                        الشهر: {getArabicMonthYear(fromDate)}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      نهاية الحملة (حتى يوم / شهر / سنة):
                    </label>
                    <input
                      type="date"
                      min={fromDate || undefined}
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-semibold focus:border-[#DC2626]"
                    />
                    {toDate && (
                      <span className="text-[10px] text-neutral-500 mt-1 block font-semibold">
                        الشهر: {getArabicMonthYear(toDate)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFiltersCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-bold text-neutral-400">
              الفلاتر المطبقة:
            </span>

            {selectedClient && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>
                  العميل: {facets?.clients.find((item) => item.id === selectedClient)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClient('')}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {selectedSupplier && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>
                  المورد: {facets?.suppliers.find((item) => item.id === selectedSupplier)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSupplier('')}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {selectedChannel && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>
                  القناة: {facets?.channels.find((item) => item.id === selectedChannel)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedChannel('')}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {selectedContent && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>
                  المحتوى: {facets?.contents.find((item) => item.id === selectedContent)?.name}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedContent('')}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {monthFilterMode === 'single' && selectedMonth && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>الشهر: {selectedMonth}</span>
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {monthFilterMode === 'multi' &&
              selectedMonths.map((month) => (
                <span
                  key={month}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800"
                >
                  <span>شهر: {month}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedMonths((previous) =>
                        previous.filter((item) => item !== month)
                      )
                    }
                    className="hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}

            {monthFilterMode === 'range' && (fromMonth || toMonth) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-300 text-xs font-bold text-neutral-800">
                <span>
                  الفترة: من {fromMonth || 'البداية'} إلى {toMonth || 'النهاية'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFromMonth('');
                    setToMonth('');
                  }}
                  className="hover:text-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            {monthFilterMode === 'dateRange' && (fromDate || toDate) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-xs font-bold text-[#DC2626]">
                <span>
                  تاريخ الحملة: من {fromDate || 'البداية'} إلى {toDate || 'النهاية'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="hover:text-red-800"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#DC2626] hover:underline ms-2"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-neutral-900">
              جدول حملات الميديا وتفاصيل التكاليف
            </span>

            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 font-bold text-neutral-600">
              {records.length} صف
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="text-xs font-bold text-[#DC2626] hover:underline flex items-center gap-1 px-2 py-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </button>
          </div>
        </div>

        {/* Quick Date Filter Bar: From Date & To Date directly above table */}
        <div className="p-3.5 bg-neutral-50/80 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-100 text-[#DC2626] flex items-center justify-center font-black">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-neutral-800 text-xs">
                تصفية سريعة بالتواريخ:
              </span>
              <span className="text-[10px] text-neutral-400 ms-1 font-semibold">
                (من تاريخ الحملة وإلى تاريخ الحملة)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="font-bold text-neutral-500 text-[11px]">من تاريخ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setMonthFilterMode('dateRange');
                }}
                className="font-bold text-neutral-800 text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-sm">
              <span className="font-bold text-neutral-500 text-[11px]">إلى تاريخ:</span>
              <input
                type="date"
                min={fromDate || undefined}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setMonthFilterMode('dateRange');
                }}
                className="font-bold text-neutral-800 text-xs focus:outline-none"
              />
            </div>

            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                  setMonthFilterMode('single');
                }}
                className="text-[11px] font-bold text-[#DC2626] hover:underline px-2 py-1"
              >
                مسح التواريخ
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-[#171717] text-white font-black">
              <tr>
                <th className="p-3.5 text-start">Client</th>
                <th className="p-3.5 text-start">السجل الضريبي</th>
                <th className="p-3.5 text-start">supplier</th>
                <th className="p-3.5 text-start">Channel</th>
                <th className="p-3.5 text-start">Content Type</th>
                <th className="p-3.5 text-start">Content</th>
                <th className="p-3.5 text-start bg-red-950/60 text-red-200 border-x border-neutral-800">من تاريخ (Start)</th>
                <th className="p-3.5 text-start bg-red-950/60 text-red-200 border-x border-neutral-800">إلى تاريخ (End)</th>
                <th className="p-3.5 text-start">الشهر (Month)</th>
                <th className="p-3.5 text-start">Net to Channel</th>
                <th className="p-3.5 text-start">Net to Client</th>
                <th className="p-3.5 text-start">معادلة الفرق (Client - Channel)</th>
                <th className="p-3.5 text-start">Notes</th>
                <th className="p-3.5 text-end">إجراء المحاسبة</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-neutral-400 font-bold">
                    جاري تحميل البيانات...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={14} className="p-12 text-center text-neutral-400 font-bold">
                    لا توجد بيانات مطابقة. يمكنك استخدام زر Import لاستيراد ملف البيانات أو إضافة حملة يدوياً.
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const dates = extractRecordDates(record);
                  const clientNet = Number(record.netToClient ?? record.cost ?? 0);
                  const channelNet = Number(record.netToChannel || 0);
                  const rowDiff = clientNet - channelNet;

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-neutral-50/70 transition-colors"
                    >
                      <td className="p-3.5 font-black text-neutral-900 text-sm whitespace-nowrap">
                        {record.client?.name || '-'}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        {record.client?.taxNumber ? (
                          <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                            {record.client.taxNumber}
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-xs">-</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold text-neutral-700 whitespace-nowrap">
                        {record.supplier?.name || '-'}
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-red-50 text-[#DC2626] font-extrabold border border-red-100">
                          {record.channel?.name || '-'}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-semibold border border-purple-100 text-[11px]">
                          {record.content?.contentType?.name || 'عام'}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-neutral-800">
                        {record.content?.name || '-'}
                      </td>

                      <td className="p-3.5 font-bold text-neutral-800 whitespace-nowrap bg-red-50/20 border-x border-neutral-100">
                        <span className="font-mono text-xs text-red-900 bg-red-100/70 px-2 py-0.5 rounded-md font-bold">
                          {dates.start}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-neutral-800 whitespace-nowrap bg-red-50/20 border-x border-neutral-100">
                        <span className="font-mono text-xs text-red-900 bg-red-100/70 px-2 py-0.5 rounded-md font-bold">
                          {dates.end}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-neutral-700 whitespace-nowrap">
                        {record.month}
                      </td>

                      <td className="p-3.5 font-black text-blue-700 whitespace-nowrap">
                        {channelNet.toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-3.5 font-black text-[#DC2626] whitespace-nowrap">
                        {clientNet.toLocaleString('en-US')} ج.م
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span
                            className={`px-2.5 py-1 rounded-xl font-black text-xs inline-flex items-center gap-1 ${
                              rowDiff >= 0
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-red-50 text-red-700 border border-red-100'
                            }`}
                          >
                            {rowDiff >= 0 ? `+${rowDiff.toLocaleString('en-US')}` : rowDiff.toLocaleString('en-US')} ج.م
                          </span>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {clientNet.toLocaleString('en-US')} - {channelNet.toLocaleString('en-US')}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-neutral-500 max-w-xs truncate">
                        {record.notes || '-'}
                      </td>

                      <td className="p-3.5 text-end whitespace-nowrap">
                        {record.invoiceId ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>مفوترة ✓</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleIssueInvoice(record.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-400 text-white font-bold rounded-xl text-[10px] transition-all inline-flex items-center gap-1 shadow-sm"
                            title="إصدار فاتورة رسمية في نظام المحاسبة"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>إصدار فاتورة</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-4xl shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-black text-neutral-900 text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>استيراد بيانات الميديا (Excel / CSV Import)</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  قم بتحميل ملف إكسل عادي (.xlsx / .xls) أو ملف CSV بالأعمدة المعتمدة، مع إمكانية تعديل الأرقام واحتساب المعادلة تلقائياً
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download (Excel & CSV) */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-neutral-800 flex items-center gap-1.5">
                  <FileDown className="w-4 h-4 text-[#DC2626]" />
                  <span>تحميل القوالب النموذجية الفارغة:</span>
                </div>
                <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                  Client, supplier, Channel, Content Type, Content, From Date, To Date, Month, Net to Channel, Net to Client, Notes
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadExcelTemplate}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تحميل قالب Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-neutral-300" />
                  <span>قالب CSV</span>
                </button>
              </div>
            </div>

            {/* File Upload Zone */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-[#DC2626] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-red-50/20 space-y-2"
              >
                <FileSpreadsheet className="w-8 h-8 text-emerald-600 mx-auto" />

                <div className="text-xs font-bold text-neutral-700">
                  {importFile
                    ? importFile.name
                    : 'اضغط هنا لاختيار ملف Excel (.xlsx / .xls) أو CSV من جهازك'}
                </div>

                <div className="text-[10px] text-neutral-400">
                  يدعم ملفات الإكسل العادية و CSV وترميز UTF-8 والأرقام والمعادلات المالية
                </div>
              </div>
            </div>

            {/* Import Preview with interactive formula calculation and live editing */}
            {importPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-800">
                      معاينة البيانات وتعديل الأرقام ({importPreview.length} صف تم التعرف عليه):
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full">
                      المعادلة مفعلة: (فلوس Client - مصاريف Channel)
                    </span>
                  </div>
                  <span className="text-emerald-600 font-bold">
                    جاهز للاستيراد
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto border border-neutral-200 rounded-xl overflow-x-auto text-[11px]">
                  <table className="w-full text-start">
                    <thead className="bg-neutral-100 font-bold sticky top-0 z-10">
                      <tr>
                        <th className="p-2 text-start">Client</th>
                        <th className="p-2 text-start">Supplier</th>
                        <th className="p-2 text-start">Channel</th>
                        <th className="p-2 text-start">Content Type</th>
                        <th className="p-2 text-start">Content</th>
                        <th className="p-2 text-start bg-red-100/60 text-red-900">من تاريخ</th>
                        <th className="p-2 text-start bg-red-100/60 text-red-900">إلى تاريخ</th>
                        <th className="p-2 text-start">Month</th>
                        <th className="p-2 text-start text-blue-700">Net to Channel (تعديل)</th>
                        <th className="p-2 text-start text-[#DC2626]">Net to Client (تعديل)</th>
                        <th className="p-2 text-start bg-emerald-50 text-emerald-800">معادلة الفرق</th>
                        <th className="p-2 text-start">Notes</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-neutral-100">
                      {importPreview.map((row, index) => {
                        const channelVal = parseFloat(String(row['Net to Channel'] ?? row['netToChannel'] ?? 0)) || 0;
                        const clientVal = parseFloat(String(row['Net to Client'] ?? row['netToClient'] ?? 0)) || 0;
                        const diff = clientVal - channelVal;

                        return (
                          <tr key={index} className="hover:bg-neutral-50/80">
                            <td className="p-2 font-bold whitespace-nowrap">
                              {row['Client'] || row['client'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {row['supplier'] || row['Supplier'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {row['Channel'] || row['channel'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {row['Content Type'] || row['content_type'] || 'عام'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {row['Content'] || row['content'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap font-mono bg-red-50/30">
                              {row['From Date'] || row['fromDate'] || row['من تاريخ'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap font-mono bg-red-50/30">
                              {row['To Date'] || row['toDate'] || row['إلى تاريخ'] || '-'}
                            </td>
                            <td className="p-2 whitespace-nowrap">
                              {row['Month'] || row['month'] || '-'}
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={channelVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleUpdatePreviewRow(index, 'Net to Channel', val);
                                  handleUpdatePreviewRow(index, 'netToChannel', val);
                                }}
                                className="w-24 p-1 border border-neutral-300 rounded font-black text-blue-700 bg-white text-xs"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={clientVal}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  handleUpdatePreviewRow(index, 'Net to Client', val);
                                  handleUpdatePreviewRow(index, 'netToClient', val);
                                }}
                                className="w-24 p-1 border border-neutral-300 rounded font-black text-[#DC2626] bg-white text-xs"
                              />
                            </td>
                            <td className="p-2 whitespace-nowrap bg-emerald-50/40">
                              <span className={`px-2 py-0.5 rounded font-black text-xs ${
                                diff >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {diff >= 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} ج.م
                              </span>
                            </td>
                            <td className="p-2 text-neutral-400 max-w-xs truncate">
                              {row['Notes'] || row['notes'] || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing || importPreview.length === 0}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-300 text-white font-bold rounded-xl text-xs transition-colors"
              >
                {importing
                  ? 'جاري الاستيراد والحفظ في قاعدة البيانات...'
                  : 'تأكيد وحفظ البيانات في النظام'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Modal */}
      {showAddModal && facets && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="font-black text-neutral-900 text-base">
              تسجيل حملة ميديا جديدة
            </h3>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    العميل (Client) *
                  </label>

                  <select
                    required
                    value={newCampaign.clientId}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        clientId: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                  >
                    <option value="">-- اختر العميل --</option>
                    {facets.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    المورد (Supplier) *
                  </label>

                  <select
                    required
                    value={newCampaign.supplierId}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        supplierId: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                  >
                    <option value="">-- اختر المورد --</option>
                    {facets.suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    القناة (Channel) *
                  </label>

                  <select
                    required
                    value={newCampaign.channelId}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        channelId: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                  >
                    <option value="">-- اختر القناة --</option>
                    {facets.channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">
                    المحتوى (Content) *
                  </label>

                  <select
                    required
                    value={newCampaign.contentId}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        contentId: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-bold"
                  >
                    <option value="">-- اختر المحتوى --</option>
                    {facets.contents.map((content) => (
                      <option key={content.id} value={content.id}>
                        {content.name} ({content.contentType?.name || 'نوع مخصص'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campaign Dates Selection: Start Day/Month/Year to End Day/Month/Year */}
              <div className="bg-neutral-50/80 p-3.5 rounded-2xl border border-neutral-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-neutral-800 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#DC2626]" />
                    <span>تاريخ الحملة الإعلانية (Campaign Dates) *</span>
                  </span>
                  {newCampaign.startDate && newCampaign.endDate && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100/80 text-[#DC2626]">
                      من {newCampaign.startDate} إلى {newCampaign.endDate}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      بداية الحملة (يوم / شهر / سنة) *
                    </label>
                    <input
                      type="date"
                      required
                      value={newCampaign.startDate}
                      onChange={(e) => {
                        const sDate = e.target.value;
                        const autoMonth = getArabicMonthYear(sDate);
                        setNewCampaign({
                          ...newCampaign,
                          startDate: sDate,
                          month: autoMonth || newCampaign.month,
                        });
                      }}
                      className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl font-semibold text-xs focus:border-[#DC2626]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                      نهاية الحملة (يوم / شهر / سنة) *
                    </label>
                    <input
                      type="date"
                      required
                      min={newCampaign.startDate || undefined}
                      value={newCampaign.endDate}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          endDate: e.target.value,
                        })
                      }
                      className="w-full p-2.5 bg-white border border-neutral-200 rounded-xl font-semibold text-xs focus:border-[#DC2626]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-600 mb-1">
                    الشهر المحاسبي التابع له *
                  </label>
                  <select
                    required
                    value={newCampaign.month}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, month: e.target.value })
                    }
                    className="w-full p-2 bg-white border border-neutral-200 rounded-xl font-bold text-xs focus:border-[#DC2626] cursor-pointer"
                  >
                    <option value="" disabled>اختر الشهر المحاسبي...</option>
                    {(() => {
                      const opts: JSX.Element[] = [];
                      const currentYear = new Date().getFullYear();
                      for (let y = currentYear - 2; y <= currentYear + 2; y++) {
                        ARABIC_MONTHS.forEach((m) => {
                          const val = `${m} ${y}`;
                          opts.push(
                            <option key={val} value={val}>{val}</option>
                          );
                        });
                      }
                      return opts;
                    })()}
                  </select>
                </div>
              </div>

              {/* Financial Inputs & Interactive Formula Box */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      مصاريف القناة (Net to Channel) *
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={newCampaign.netToChannel}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          netToChannel: Number(e.target.value),
                        })
                      }
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-black text-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">
                      فلوس العميل (Net to Client) *
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={newCampaign.netToClient}
                      onChange={(e) =>
                        setNewCampaign({
                          ...newCampaign,
                          netToClient: Number(e.target.value),
                        })
                      }
                      className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl font-black text-[#DC2626]"
                    />
                  </div>
                </div>

                {/* Live Formula Box (Client - Channel) with Quick Margin Adjusters */}
                <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/90 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-neutral-700 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-[#DC2626]" />
                      <span>المعادلة التلقائية: (فلوس Client - مصاريف Channel)</span>
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        Number(newCampaign.netToClient) - Number(newCampaign.netToChannel) >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      الفرق: {(Number(newCampaign.netToClient) - Number(newCampaign.netToChannel)).toLocaleString('en-US')} ج.م
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-neutral-600 bg-white p-2 rounded-xl border border-neutral-200 flex items-center justify-between">
                    <span>
                      {Number(newCampaign.netToClient || 0).toLocaleString()} (Client) - {Number(newCampaign.netToChannel || 0).toLocaleString()} (Channel)
                    </span>
                    <span className="font-bold text-emerald-700">
                      = {(Number(newCampaign.netToClient || 0) - Number(newCampaign.netToChannel || 0)).toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Fast Margin Adjustment Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-neutral-200/60">
                    <span className="text-[10px] font-bold text-neutral-500">
                      تعديل سريع لفلوس العميل بنسبة ربح:
                    </span>
                    {[10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const cost = Number(newCampaign.netToChannel) || 0;
                          const calculatedClient = Math.round(cost * (1 + pct / 100));
                          setNewCampaign({
                            ...newCampaign,
                            netToClient: calculatedClient,
                          });
                        }}
                        className="px-2 py-1 rounded-lg bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300 text-[10px] font-bold transition-all shadow-sm"
                      >
                        +{pct}% ({Math.round((Number(newCampaign.netToChannel) || 0) * (pct / 100))} ج.م)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">
                  Notes (ملاحظات)
                </label>

                <textarea
                  rows={2}
                  value={newCampaign.notes}
                  onChange={(e) =>
                    setNewCampaign({
                      ...newCampaign,
                      notes: e.target.value,
                    })
                  }
                  placeholder="ملاحظات حول الحملة أو الاستهداف أو الاتفاق..."
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-neutral-400 text-white font-bold rounded-xl"
                >
                  {actionLoading ? 'جاري الحفظ...' : 'حفظ الحملة'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
