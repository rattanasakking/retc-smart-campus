'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Plus, X, Eye, QrCode, Trash2, FileSpreadsheet,
  Loader2, Check, AlertTriangle, ChevronLeft, ChevronRight, Package, Tag, Pencil,
} from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category { id: number; name: string; isActive: boolean; description?: string | null; _count?: { equipments: number } }

interface Equipment {
  id: number;
  code: string;
  name: string;
  brand?: string;
  model?: string;
  department: string;
  room?: string;
  status: string;
  category: { id: number; name: string } | null;
  price?: string;
  acquiredDate?: string;
  image?: string;
}

interface Summary {
  total: number;
  active: number;
  damaged: number;
  disposed: number;
  borrowed: number;
}

interface ImportRow {
  code: string;
  name: string;
  categoryId: string;
  brand: string;
  model: string;
  department: string;
  price: string;
  acquiredDate: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; text: string }> = {
  active:   { label: '✅ ใช้งาน',   bg: '#e6f9f0', text: '#0d9068' },
  damaged:  { label: '🔧 ซ่อม',     bg: '#fffbeb', text: '#b45309' },
  disposed: { label: '🗑 จำหน่าย',  bg: '#f1f5f9', text: '#64748b' },
  borrowed: { label: '📦 ยืมออก',   bg: '#e8f0fe', text: '#1d6ae5' },
};

const CSV_HEADERS = 'รหัส,ชื่อ,หมวดหมู่ID,ยี่ห้อ,รุ่น,แผนก,ราคา,วันที่ซื้อ';
const CSV_EXAMPLE = 'EQ-001,โปรเจกเตอร์ Epson,1,Epson,EB-X41,สำนักงาน,25000,2024-01-15';

const LIMIT = 20;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EquipmentPage() {
  const router = useRouter();

  const [activeTab, setActiveTab]   = useState<'list' | 'categories'>('list');
  const [isAdmin, setIsAdmin]       = useState(false);

  // list state
  const [items, setItems]           = useState<Equipment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [summary, setSummary]       = useState<Summary>({ total: 0, active: 0, damaged: 0, disposed: 0, borrowed: 0 });

  // import modal state
  const [importOpen, setImportOpen]    = useState(false);
  const [importFile, setImportFile]    = useState<File | null>(null);
  const [importRows, setImportRows]    = useState<ImportRow[]>([]);
  const [importLoading, setImportLoad] = useState(false);

  // delete confirm
  const [delConfirm, setDelConfirm] = useState<number | null>(null);
  const [deleting, setDeleting]     = useState(false);

  // toast
  const [toast, setToast]       = useState('');
  const [toastErr, setToastErr] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const showToast = (msg: string, isErr = false) => {
    if (isErr) { setToastErr(msg); setToast(''); }
    else       { setToast(msg);    setToastErr(''); }
    setTimeout(() => { setToast(''); setToastErr(''); }, 3500);
  };

  // ─── Check admin ─────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
      setIsAdmin(u.isSuperAdmin || u.role === 'admin' || u.role === 'executive');
    } catch { /* */ }
  }, []);

  // ─── Load categories ──────────────────────────────────────────────────────

  const loadCategories = useCallback(() => {
    api.get<{ data: Category[] }>('/equipment/categories')
      .then((r) => setCategories(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  // ─── Load summary ─────────────────────────────────────────────────────────

  const loadSummary = useCallback(() => {
    api.get<{ data: Summary }>('/equipment/summary')
      .then((r) => setSummary(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // ─── Load list ────────────────────────────────────────────────────────────

  const loadItems = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (search)       params.set('search', search);
      if (catFilter)    params.set('category', catFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get<{ data: Equipment[]; pagination: { total: number } }>(
        `/equipment?${params}`
      );
      setItems(res.data ?? []);
      setTotal(res.pagination?.total ?? 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, statusFilter]);

  useEffect(() => { loadItems(page); }, [loadItems, page]);

  // ─── Search debounce ──────────────────────────────────────────────────────

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
    }, 400);
  };

  const handleCatChange    = (val: string) => { setCatFilter(val); setPage(1); };
  const handleStatusChange = (val: string) => { setStatus(val);    setPage(1); };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!delConfirm) return;
    setDeleting(true);
    try {
      await api.delete(`/equipment/${delConfirm}`);
      showToast('ลบครุภัณฑ์สำเร็จ');
      setDelConfirm(null);
      loadItems(page);
      loadSummary();
    } catch (e: unknown) {
      showToast((e as Error).message || 'เกิดข้อผิดพลาด', true);
    } finally {
      setDeleting(false);
    }
  };

  // ─── CSV Import ───────────────────────────────────────────────────────────

  const downloadTemplate = () => {
    const content = `${CSV_HEADERS}\n${CSV_EXAMPLE}`;
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'equipment_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    return lines.slice(1).map((line) => {
      const cols = line.split(',');
      return {
        code:         cols[0]?.trim() ?? '',
        name:         cols[1]?.trim() ?? '',
        categoryId:   cols[2]?.trim() ?? '',
        brand:        cols[3]?.trim() ?? '',
        model:        cols[4]?.trim() ?? '',
        department:   cols[5]?.trim() ?? '',
        price:        cols[6]?.trim() ?? '',
        acquiredDate: cols[7]?.trim() ?? '',
      };
    }).filter((r) => r.code && r.name);
  };

  const handleFileChange = (file: File | null) => {
    setImportFile(file);
    if (!file) { setImportRows([]); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportRows(parseCSV(text));
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (!importRows.length) return;
    setImportLoad(true);
    let successCount = 0;
    let failCount = 0;
    for (const row of importRows) {
      try {
        await api.post('/equipment', {
          code:         row.code,
          name:         row.name,
          categoryId:   row.categoryId ? Number(row.categoryId) : undefined,
          brand:        row.brand     || undefined,
          model:        row.model     || undefined,
          department:   row.department,
          price:        row.price     || undefined,
          acquiredDate: row.acquiredDate || undefined,
          status:       'active',
        });
        successCount++;
      } catch {
        failCount++;
      }
    }
    setImportLoad(false);
    setImportOpen(false);
    setImportFile(null);
    setImportRows([]);
    if (failCount === 0) {
      showToast(`นำเข้าสำเร็จ ${successCount} รายการ`);
    } else {
      showToast(
        `นำเข้าสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ`,
        successCount === 0,
      );
    }
    setPage(1);
    loadItems(1);
    loadSummary();
  };

  // ─── Pagination ───────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const pageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Toast */}
      {(toast || toastErr) && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm flex items-center gap-2 ${toastErr ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
          {toastErr ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast || toastErr}
        </div>
      )}

      {/* Delete confirm dialog */}
      {delConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26,39,68,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" style={{ border: '1px solid #dce6f9' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#fef2f2' }}>
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: '#1a2744' }}>ยืนยันการลบ</p>
                <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ครุภัณฑ์นี้จะถูกลบออกจากระบบถาวร</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDelConfirm(null)} className="btn-secondary text-sm">ยกเลิก</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: '#ef4444' }}
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(26,39,68,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl" style={{ border: '1px solid #dce6f9' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #dce6f9' }}>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" style={{ color: '#1d6ae5' }} />
                <h2 className="font-bold text-base" style={{ color: '#1a2744' }}>นำเข้าครุภัณฑ์จาก Excel / CSV</h2>
              </div>
              <button
                onClick={() => { setImportOpen(false); setImportFile(null); setImportRows([]); }}
                className="p-1.5 rounded-lg hover:bg-[#f5f8ff] transition-colors"
              >
                <X className="w-4 h-4" style={{ color: '#4a6080' }} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Download template */}
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" style={{ color: '#1d6ae5' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#1a2744' }}>ดาวน์โหลด Template</p>
                  <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>ไฟล์ CSV ตัวอย่างสำหรับกรอกข้อมูลครุภัณฑ์</p>
                </div>
                <button onClick={downloadTemplate} className="btn-secondary text-xs flex-shrink-0 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  ดาวน์โหลด Template
                </button>
              </div>

              {/* File input */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#4a6080' }}>เลือกไฟล์ CSV</label>
                <div
                  className="relative flex items-center gap-3 p-3 rounded-xl"
                  style={{ border: '2px dashed #dce6f9', backgroundColor: '#fafbff' }}
                >
                  <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  <FileSpreadsheet className="w-5 h-5 flex-shrink-0" style={{ color: '#1d6ae5' }} />
                  <span className="text-sm" style={{ color: importFile ? '#1a2744' : '#94a3b8' }}>
                    {importFile ? importFile.name : 'คลิกหรือลากไฟล์ .csv มาวางที่นี่'}
                  </span>
                  {importFile && (
                    <button
                      className="ml-auto p-1 rounded hover:bg-[#fef2f2] transition-colors z-10 relative"
                      onClick={(e) => { e.stopPropagation(); handleFileChange(null); }}
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Preview table */}
              {importRows.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: '#4a6080' }}>
                    ตัวอย่างข้อมูล (แสดง {Math.min(5, importRows.length)} จาก {importRows.length} รายการ)
                  </p>
                  <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid #dce6f9' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ backgroundColor: '#f8faff', borderBottom: '1px solid #dce6f9' }}>
                          {['รหัส', 'ชื่อ', 'หมวดหมู่ID', 'ยี่ห้อ', 'รุ่น', 'แผนก', 'ราคา', 'วันที่ซื้อ'].map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff]">
                            <td className="px-3 py-2 font-mono" style={{ color: '#1d6ae5' }}>{row.code}</td>
                            <td className="px-3 py-2" style={{ color: '#1a2744' }}>{row.name}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.categoryId}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.brand}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.model}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.department}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.price}</td>
                            <td className="px-3 py-2" style={{ color: '#4a6080' }}>{row.acquiredDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setImportOpen(false); setImportFile(null); setImportRows([]); }}
                  className="btn-secondary text-sm"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleImport}
                  disabled={importRows.length === 0 || importLoading}
                  className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                  {importRows.length > 0 ? `นำเข้า ${importRows.length} รายการ` : 'นำเข้า'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>ครุภัณฑ์</h1>
            <p className="text-xs mt-0.5" style={{ color: '#4a6080' }}>จัดการและติดตามครุภัณฑ์ทั้งหมดในหน่วยงาน</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'list' && (
            <>
              <button onClick={() => setImportOpen(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
                <FileSpreadsheet className="w-3.5 h-3.5" /> นำเข้า Excel
              </button>
              <button onClick={() => router.push('/equipment/new')} className="btn-primary flex items-center gap-1.5 text-sm">
                <Plus className="w-3.5 h-3.5" /> เพิ่มใหม่
              </button>
            </>
          )}
          {isAdmin && (
            <button onClick={() => setActiveTab(activeTab === 'categories' ? 'list' : 'categories')}
              className="btn-secondary flex items-center gap-1.5 text-sm">
              <Tag className="w-3.5 h-3.5" />
              {activeTab === 'categories' ? 'รายการครุภัณฑ์' : 'หมวดหมู่'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Categories Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'categories' && (
        <CategoriesPanel
          categories={categories}
          onRefresh={loadCategories}
          showToast={showToast}
        />
      )}

      {/* ─── List Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'list' && <>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { key: 'total',    label: 'ทั้งหมด',  color: '#1a2744', bg: '#f5f8ff' },
          { key: 'active',   label: 'ใช้งาน',   color: '#0d9068', bg: '#e6f9f0' },
          { key: 'damaged',  label: 'ซ่อม',     color: '#b45309', bg: '#fffbeb' },
          { key: 'disposed', label: 'จำหน่าย',  color: '#64748b', bg: '#f1f5f9' },
        ] as { key: keyof Summary; label: string; color: string; bg: string }[]).map(({ key, label, color, bg }) => (
          <div key={key} className="bg-white rounded-xl p-4 flex items-center gap-3" style={{ border: '1px solid #dce6f9' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
              <Package className="w-4 h-4" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold leading-none" style={{ color }}>{summary[key]}</p>
              <p className="text-xs mt-1" style={{ color: '#4a6080' }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #dce6f9' }}>
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#94a3b8' }} />
            <input
              className="input-field pl-9 text-sm"
              placeholder="ค้นหารหัส ชื่อ ยี่ห้อ รุ่น..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" style={{ color: '#94a3b8' }} />
              </button>
            )}
          </div>

          {/* Category filter */}
          <select
            className="input-field text-sm py-2 w-auto min-w-[140px]"
            value={catFilter}
            onChange={(e) => handleCatChange(e.target.value)}
          >
            <option value="">หมวดหมู่ทั้งหมด</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="input-field text-sm py-2 w-auto min-w-[130px]"
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">สถานะทั้งหมด</option>
            {Object.entries(STATUS_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(search || catFilter || statusFilter) && (
            <button
              onClick={() => { setSearch(''); setCatFilter(''); setStatus(''); setPage(1); }}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg transition-colors"
              style={{ color: '#1d6ae5', backgroundColor: '#e8f0fe' }}
            >
              <X className="w-3 h-3" /> ล้างตัวกรอง
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #dce6f9' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: '#94a3b8' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลด...
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f4ff', backgroundColor: '#f8faff' }}>
                {['#', 'รหัส', 'ชื่อครุภัณฑ์', 'หมวดหมู่', 'ยี่ห้อ / รุ่น', 'แผนก', 'สถานะ', 'จัดการ'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap" style={{ color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-8 h-8" style={{ color: '#dce6f9' }} />
                      <span className="text-sm" style={{ color: '#94a3b8' }}>ไม่พบครุภัณฑ์</span>
                    </div>
                  </td>
                </tr>
              ) : items.map((item, idx) => {
                const meta = STATUS_META[item.status] ?? { label: item.status, bg: '#f1f5f9', text: '#64748b' };
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f5f8ff' }} className="hover:bg-[#fafbff] transition-colors">
                    {/* # */}
                    <td className="px-4 py-3 text-xs" style={{ color: '#94a3b8' }}>
                      {(page - 1) * LIMIT + idx + 1}
                    </td>
                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: '#1d6ae5' }}>{item.code}</span>
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: '#1a2744' }}>{item.name}</p>
                      {item.room && <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>ห้อง {item.room}</p>}
                    </td>
                    {/* Category chip */}
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{ backgroundColor: '#e8f0fe', color: '#1d6ae5' }}
                        >
                          {item.category.name}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    {/* Brand / Model */}
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>
                      {item.brand || item.model ? (
                        <>
                          {item.brand && <span>{item.brand}</span>}
                          {item.brand && item.model && <span className="mx-1" style={{ color: '#dce6f9' }}>|</span>}
                          {item.model && <span>{item.model}</span>}
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    {/* Department */}
                    <td className="px-4 py-3 text-xs" style={{ color: '#4a6080' }}>{item.department}</td>
                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                        style={{ backgroundColor: meta.bg, color: meta.text }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="pr-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => router.push(`/equipment/${item.id}`)}
                          className="p-1.5 rounded hover:bg-[#e8f0fe] transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-3.5 h-3.5" style={{ color: '#1d6ae5' }} />
                        </button>
                        <button
                          onClick={() => router.push(`/equipment/${item.id}/qr`)}
                          className="p-1.5 rounded hover:bg-[#f3e8ff] transition-colors"
                          title="QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" style={{ color: '#7c3aed' }} />
                        </button>
                        <button
                          onClick={() => setDelConfirm(item.id)}
                          className="p-1.5 rounded hover:bg-red-50 transition-colors"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
          <p className="text-xs" style={{ color: '#4a6080' }}>
            แสดง {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} จาก {total} รายการ
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f8ff]"
              style={{ border: '1px solid #dce6f9' }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: '#4a6080' }} />
            </button>
            {pageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="px-2 text-xs" style={{ color: '#94a3b8' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className="w-8 h-8 rounded-lg text-xs font-medium transition-colors"
                  style={
                    page === p
                      ? { backgroundColor: '#1d6ae5', color: '#fff' }
                      : { border: '1px solid #dce6f9', color: '#4a6080', backgroundColor: '#fff' }
                  }
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5f8ff]"
              style={{ border: '1px solid #dce6f9' }}
            >
              <ChevronRight className="w-4 h-4" style={{ color: '#4a6080' }} />
            </button>
          </div>
        </div>
      )}

      </> /* end activeTab === 'list' */}
    </div>
  );
}

// ─── CategoriesPanel ──────────────────────────────────────────────────────────

interface CatPanelProps {
  categories: Category[];
  onRefresh: () => void;
  showToast: (msg: string, err?: boolean) => void;
}

function CategoriesPanel({ categories, onRefresh, showToast }: CatPanelProps) {
  const [catName, setCatName]           = useState('');
  const [catDesc, setCatDesc]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [editItem, setEditItem]         = useState<Category | null>(null);
  const [editForm, setEditForm]         = useState({ name: '', description: '' });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSaving(true);
    try {
      await api.post('/equipment/categories', { name: catName.trim(), description: catDesc.trim() || undefined });
      showToast('เพิ่มหมวดหมู่สำเร็จ');
      setCatName(''); setCatDesc('');
      onRefresh();
    } catch (e) { showToast((e as Error).message, true); }
    finally { setSaving(false); }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      await api.put(`/equipment/categories/${editItem.id}`, {
        name: editForm.name.trim(), description: editForm.description.trim() || undefined,
      });
      showToast('แก้ไขสำเร็จ');
      setEditItem(null);
      onRefresh();
    } catch (e) { showToast((e as Error).message, true); }
    finally { setSaving(false); }
  };

  const handleToggle = async (cat: Category) => {
    try {
      await api.put(`/equipment/categories/${cat.id}`, { isActive: !cat.isActive });
      onRefresh();
    } catch (e) { showToast((e as Error).message, true); }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`ลบหมวดหมู่ "${cat.name}" ?`)) return;
    try {
      await api.delete(`/equipment/categories/${cat.id}`);
      showToast('ลบสำเร็จ');
      onRefresh();
    } catch (e) { showToast((e as Error).message, true); }
  };

  return (
    <div className="space-y-4 max-w-xl">
      {/* Add form */}
      <form onSubmit={handleAdd} className="card space-y-3">
        <h3 className="font-semibold text-[#1a2744] text-sm">เพิ่มหมวดหมู่ใหม่</h3>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อหมวดหมู่ *</label>
          <input value={catName} onChange={e => setCatName(e.target.value)}
            placeholder="เช่น คอมพิวเตอร์, เครื่องเสียง..." required className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#4a6080] mb-1">คำอธิบาย</label>
          <input value={catDesc} onChange={e => setCatDesc(e.target.value)}
            placeholder="คำอธิบายหมวดหมู่..." className="input-field" />
        </div>
        <button type="submit" disabled={saving} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {saving ? 'กำลังบันทึก...' : 'เพิ่มหมวดหมู่'}
        </button>
      </form>

      {/* Edit modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#1a2744]">แก้ไขหมวดหมู่</h3>
              <button onClick={() => setEditItem(null)}><X className="w-4 h-4 text-[#94a3b8]" /></button>
            </div>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อ *</label>
                <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  required className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">คำอธิบาย</label>
                <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  className="input-field" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditItem(null)} className="btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
              {['ชื่อหมวดหมู่','คำอธิบาย','จำนวน','สถานะ',''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-[#94a3b8]">ยังไม่มีหมวดหมู่</td></tr>
            ) : categories.map(cat => (
              <tr key={cat.id} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                <td className="px-4 py-3 font-medium text-[#1a2744]">{cat.name}</td>
                <td className="px-4 py-3 text-[#4a6080] text-xs">{cat.description || '-'}</td>
                <td className="px-4 py-3 text-[#4a6080]">{cat._count?.equipments ?? 0}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggle(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {cat.isActive ? 'เปิดใช้' : 'ปิด'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setEditItem(cat); setEditForm({ name: cat.name, description: cat.description ?? '' }); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-blue-50">
                      <Pencil className="w-3.5 h-3.5 text-[#1d6ae5]" />
                    </button>
                    {(cat._count?.equipments ?? 0) === 0 && (
                      <button onClick={() => handleDelete(cat)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
