'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Plus, Search, MapPin, Calendar, Package, X, Camera, Upload,
  Eye, CheckCircle, Trash2, ChevronDown, Printer, BarChart2, Settings,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

interface Category { id: number; name: string; isActive: boolean }
interface AllCategory extends Category { _count?: { items: number } }
interface LostItem {
  id: number; refNo: string | null; type: string; title: string;
  description: string | null; category: { id: number; name: string } | null;
  foundDate: string | null; foundLocation: string | null;
  image: string | null; gpsLat: string | null; gpsLng: string | null;
  status: 'found' | 'claimed' | 'archived';
  reporter: { id: number; name: string; department?: string };
  claimer: { id: number; name: string } | null;
  claimedAt: string | null; claimedByName: string | null;
  claimedPhone: string | null; claimedIdCard: string | null;
  claimedPhoto: string | null; note: string | null;
  createdAt: string;
}

const thDate = (iso: string | null) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

function Toast({ msg, err, onClose }: { msg: string; err?: boolean; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2 ${err ? 'bg-red-500' : 'bg-[#0d9068]'}`}>
      {msg}
      <button onClick={onClose}><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'claimed')  return <span className="badge-approved">มีเจ้าของแล้ว</span>;
  if (status === 'archived') return <span className="badge-cancelled">เก็บถาวร</span>;
  return <span className="badge-pending">รอเจ้าของ</span>;
}

export default function ManageLostFoundPage() {
  const [items, setItems]           = useState<LostItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [activeTab, setActiveTab]   = useState<'items' | 'categories'>('items');
  const [allCategories, setAllCats] = useState<AllCategory[]>([]);
  const [user, setUser]             = useState<{ role: string; id: number } | null>(null);

  // toast
  const [toast, setToast]   = useState('');
  const [toastErr, setToastErr] = useState('');
  const showToast = (msg: string, err = false) => {
    if (err) setToastErr(msg); else setToast(msg);
    setTimeout(() => { setToast(''); setToastErr(''); }, 3000);
  };

  // modals
  const [showAdd, setShowAdd]     = useState(false);
  const [showDetail, setShowDetail] = useState<LostItem | null>(null);
  const [showClaim, setShowClaim] = useState<LostItem | null>(null);

  // form: add item
  const [form, setForm] = useState({
    type: 'found', title: '', description: '', categoryId: '',
    foundDate: '', foundLocation: '', note: '',
  });
  const [formImage, setFormImage] = useState('');
  const [gpsLat, setGpsLat]   = useState('');
  const [gpsLng, setGpsLng]   = useState('');
  const [saving, setSaving]   = useState(false);

  // form: claim
  const [claimForm, setClaimForm] = useState({
    claimedByName: '', claimedPhone: '', claimedIdCard: '', note: '',
  });
  const [claimPhoto, setClaimPhoto] = useState('');
  const [claiming, setClaiming]     = useState(false);

  // category management
  const [catName, setCatName]   = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const imgRef  = useRef<HTMLInputElement>(null);
  const claimImgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('retc_user') || '{}');
      if (u.id) setUser(u);
    } catch { /* */ }
    fetchCategories();
  }, []);

  const fetchCategories = () =>
    api.get<{ success: boolean; data: AllCategory[] }>('/lostfound/categories')
      .then(r => {
        if (r.success) {
          setAllCats(r.data);
          setCategories(r.data.filter(c => c.isActive));
        }
      })
      .catch(() => {});

  const load = (s = search, c = catFilter, st = statusFilter) => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '60' });
    if (s) p.set('search', s);
    if (c) p.set('categoryId', c);
    if (st) p.set('status', st);
    api.get<{ success: boolean; data: LostItem[]; pagination: { total: number } }>(`/lostfound?${p}`)
      .then(r => { if (r.success) { setItems(r.data); setTotal(r.pagination?.total ?? r.data.length); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v, catFilter, statusFilter), 400);
  };

  // GPS
  const getGps = () =>
    navigator.geolocation.getCurrentPosition(
      pos => { setGpsLat(String(pos.coords.latitude)); setGpsLng(String(pos.coords.longitude)); },
      () => {}
    );

  // Image to base64
  const handleImage = (file: File, setter: (v: string) => void) => {
    const r = new FileReader();
    r.onload = e => setter(e.target?.result as string);
    r.readAsDataURL(file);
  };

  // Add item
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { showToast('กรุณาระบุชื่อของ', true); return; }
    setSaving(true);
    try {
      await api.post('/lostfound', {
        ...form,
        image: formImage || undefined,
        gpsLat: gpsLat || undefined,
        gpsLng: gpsLng || undefined,
        categoryId: form.categoryId || undefined,
      });
      showToast('บันทึกสำเร็จ');
      setShowAdd(false);
      resetAddForm();
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setSaving(false);
    }
  };

  const resetAddForm = () => {
    setForm({ type: 'found', title: '', description: '', categoryId: '', foundDate: '', foundLocation: '', note: '' });
    setFormImage(''); setGpsLat(''); setGpsLng('');
  };

  // Claim
  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showClaim) return;
    setClaiming(true);
    try {
      await api.put(`/lostfound/${showClaim.id}/claim`, {
        ...claimForm,
        claimedPhoto: claimPhoto || undefined,
      });
      showToast('บันทึกการรับของสำเร็จ');
      setShowClaim(null);
      setClaimForm({ claimedByName: '', claimedPhone: '', claimedIdCard: '', note: '' });
      setClaimPhoto('');
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setClaiming(false);
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    if (!confirm('ยืนยันการลบ?')) return;
    try {
      await api.delete(`/lostfound/${id}`);
      showToast('ลบสำเร็จ');
      load();
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  // Add category
  const handleAddCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      await api.post('/lostfound/categories', { name: catName.trim() });
      showToast('เพิ่มประเภทสำเร็จ');
      setCatName('');
      fetchCategories();
    } catch (e) {
      showToast((e as Error).message, true);
    } finally {
      setCatSaving(false);
    }
  };

  const toggleCat = async (cat: Category) => {
    try {
      await api.put(`/lostfound/categories/${cat.id}`, { isActive: !cat.isActive });
      fetchCategories();
    } catch (e) {
      showToast((e as Error).message, true);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'executive';

  const total_found   = items.filter(i => i.status === 'found').length;
  const total_claimed = items.filter(i => i.status === 'claimed').length;

  // Print receipt
  const printReceipt = (item: LostItem) => {
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>ใบรับของคืน</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; margin: 0; padding: 24px; font-size: 13px; }
        h2 { text-align: center; margin: 0 0 4px; }
        p.sub { text-align: center; color: #666; margin: 0 0 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        td { padding: 6px 8px; border: 1px solid #ddd; vertical-align: top; }
        td:first-child { width: 40%; background: #f8f8f8; font-weight: 600; }
        .sig { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig-box { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #333; padding-top: 4px; margin-top: 60px; }
        @media print { button { display: none; } }
      </style></head><body>
      <h2>วิทยาลัยเทคนิคร้อยเอ็ด</h2>
      <p class="sub">ใบรับของคืน (Lost &amp; Found Receipt)</p>
      <table>
        <tr><td>รหัสรายการ</td><td>${item.refNo || '-'}</td></tr>
        <tr><td>ชื่อสิ่งของ</td><td>${item.title}</td></tr>
        <tr><td>ประเภท</td><td>${item.category?.name || '-'}</td></tr>
        <tr><td>สถานที่พบ</td><td>${item.foundLocation || '-'}</td></tr>
        <tr><td>วันที่พบ</td><td>${thDate(item.foundDate || item.createdAt)}</td></tr>
        <tr><td>ผู้มารับ</td><td>${item.claimedByName || '-'}</td></tr>
        <tr><td>เบอร์โทร</td><td>${item.claimedPhone || '-'}</td></tr>
        <tr><td>เลขบัตรประชาชน</td><td>${item.claimedIdCard || '-'}</td></tr>
        <tr><td>วันที่รับ</td><td>${thDate(item.claimedAt)}</td></tr>
        ${item.note ? `<tr><td>หมายเหตุ</td><td>${item.note}</td></tr>` : ''}
      </table>
      <div class="sig">
        <div class="sig-box"><div class="sig-line">ลายเซ็นผู้มารับ</div></div>
        <div class="sig-box"><div class="sig-line">ลายเซ็นเจ้าหน้าที่</div></div>
      </div>
      <p style="text-align:center;margin-top:16px;font-size:11px;color:#999">พิมพ์วันที่: ${new Date().toLocaleDateString('th-TH')}</p>
      <script>window.onload=()=>window.print();</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div className="p-6 space-y-5">
      <Toast msg={toast || toastErr} err={!!toastErr} onClose={() => { setToast(''); setToastErr(''); }} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1a2744]">จัดการของหาย</h1>
          <p className="text-sm text-[#4a6080] mt-0.5">บันทึกและติดตามของที่พบในวิทยาลัย</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link href="/lost-found/report"
              className="btn-secondary flex items-center gap-1.5 text-sm">
              <BarChart2 className="w-4 h-4" /> รายงาน
            </Link>
          )}
          <button onClick={() => { setShowAdd(true); resetAddForm(); }}
            className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> บันทึกของที่พบ
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      {isAdmin && (
        <div className="flex gap-1 border-b border-[#dce6f9]">
          {([['items','รายการของหาย'],['categories','จัดการประเภท']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab ? '#1d6ae5' : '#94a3b8',
                borderBottom: activeTab === tab ? '2px solid #1d6ae5' : '2px solid transparent',
              }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'categories' && isAdmin ? (
        /* ── Category management ── */
        <div className="space-y-3">
          <form onSubmit={handleAddCat} className="flex gap-2">
            <input value={catName} onChange={e => setCatName(e.target.value)}
              placeholder="ชื่อประเภทใหม่..." className="input-field flex-1" />
            <button type="submit" disabled={catSaving || !catName.trim()} className="btn-primary flex-shrink-0">
              {catSaving ? 'กำลังเพิ่ม...' : '+ เพิ่มประเภท'}
            </button>
          </form>

          <div className="card p-0 overflow-hidden">
            {allCategories.length === 0 ? (
              <p className="text-center py-10 text-sm text-[#94a3b8]">ยังไม่มีประเภท</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080]">ชื่อประเภท</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-[#4a6080]">สถานะ</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#4a6080]">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategories.map(cat => (
                    <tr key={cat.id} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff]">
                      <td className="px-4 py-3 font-medium text-[#1a2744]">{cat.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={cat.isActive
                            ? { backgroundColor: '#e6f9f0', color: '#0d9068' }
                            : { backgroundColor: '#f1f5f9', color: '#94a3b8' }}>
                          {cat.isActive ? 'ใช้งาน' : 'ปิด'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleCat(cat)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50"
                            title={cat.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}>
                            {cat.isActive
                              ? <ToggleRight className="w-4 h-4 text-[#0d9068]" />
                              : <ToggleLeft  className="w-4 h-4 text-[#94a3b8]" />}
                          </button>
                          <button onClick={async () => {
                            if (!confirm(`ลบประเภท "${cat.name}"?`)) return;
                            try {
                              await api.delete(`/lostfound/categories/${cat.id}`);
                              showToast('ลบประเภทสำเร็จ');
                              fetchCategories();
                            } catch (e) { showToast((e as Error).message, true); }
                          }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50"
                            title="ลบ">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
      <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'ทั้งหมด',           value: total,         color: '#1d6ae5', bg: '#eff4ff' },
              { label: 'รอเจ้าของ',          value: total_found,   color: '#b45309', bg: '#fffbeb' },
              { label: 'มีเจ้าของแล้ว',      value: total_claimed, color: '#0d9068', bg: '#f0fdf4' },
            ].map(k => (
              <div key={k.label} className="card-sm" style={{ backgroundColor: k.bg, borderColor: k.color + '33' }}>
                <p className="text-xs font-medium mb-1" style={{ color: k.color }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="card-sm flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#94a3b8]" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="ค้นหาชื่อของ สถานที่..."
                className="input-field pl-9"
              />
            </div>
            <div className="relative">
              <select value={catFilter}
                onChange={e => { setCatFilter(e.target.value); load(search, e.target.value, statusFilter); }}
                className="input-field appearance-none pr-8 w-40">
                <option value="">ทุกประเภท</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
            </div>
            <div className="relative">
              <select value={statusFilter}
                onChange={e => { setStatus(e.target.value); load(search, catFilter, e.target.value); }}
                className="input-field appearance-none pr-8 w-40">
                <option value="">ทุกสถานะ</option>
                <option value="found">รอเจ้าของ</option>
                <option value="claimed">มีเจ้าของแล้ว</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 w-3.5 h-3.5 text-[#94a3b8] pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#dce6f9]" style={{ backgroundColor: '#f5f8ff' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080] w-36">รหัส</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080]">รูป</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080]">ชื่อของ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080] hidden md:table-cell">สถานที่</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080] hidden md:table-cell">วันที่พบ</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[#4a6080]">สถานะ</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[#4a6080]">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#dce6f9]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-[#94a3b8]">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    ไม่พบรายการ
                  </td></tr>
                ) : items.map(item => (
                  <tr key={item.id} className="border-b border-[#dce6f9] hover:bg-[#f5f8ff] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-[#4a6080]">{item.refNo || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#dce6f9]" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1a2744]">{item.title}</p>
                      {item.category && <p className="text-xs text-[#4a6080]">{item.category.name}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-[#4a6080]">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs">{item.foundLocation || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-[#4a6080]">
                        <Calendar className="w-3 h-3 flex-shrink-0" />
                        <span className="text-xs">{thDate(item.foundDate || item.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setShowDetail(item)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 text-[#1d6ae5]" title="ดูรายละเอียด">
                          <Eye className="w-4 h-4" />
                        </button>
                        {item.status === 'found' && (
                          <button onClick={() => { setShowClaim(item); setClaimForm({ claimedByName: '', claimedPhone: '', claimedIdCard: '', note: '' }); setClaimPhoto(''); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-green-50 text-[#0d9068]" title="บันทึกการรับของ">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'claimed' && (
                          <button onClick={() => printReceipt(item)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-50 text-[#4a6080]" title="พิมพ์ใบรับของ">
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDelete(item.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-red-500" title="ลบ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </>
      )}

      {/* ── Modal: Add Item ────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#dce6f9] sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-[#1a2744]">บันทึกของที่พบ</h2>
              <button onClick={() => !saving && setShowAdd(false)}><X className="w-4 h-4 text-[#94a3b8]" /></button>
            </div>
            <form onSubmit={handleAdd} className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#4a6080] mb-1">ประเภทรายการ</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                    <option value="found">ของที่พบ (Found)</option>
                    <option value="lost">ของหาย (Lost)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6080] mb-1">ประเภทของ</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))} className="input-field">
                    <option value="">-- เลือกประเภท --</option>
                    {categories.filter(c => c.isActive).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อของ <span className="text-red-500">*</span></label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="ระบุชื่อสิ่งของ..." required className="input-field" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">รายละเอียด</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="ลักษณะของสิ่งของ สี ยี่ห้อ ฯลฯ" rows={2}
                  className="input-field resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#4a6080] mb-1">สถานที่พบ</label>
                  <input value={form.foundLocation} onChange={e => setForm(p => ({ ...p, foundLocation: e.target.value }))}
                    placeholder="ห้อง / อาคาร..." className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#4a6080] mb-1">วันที่พบ</label>
                  <input type="date" value={form.foundDate} onChange={e => setForm(p => ({ ...p, foundDate: e.target.value }))}
                    className="input-field" />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">รูปภาพ</label>
                <input ref={imgRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f, setFormImage); }} />
                {formImage ? (
                  <div className="relative inline-block">
                    <img src={formImage} alt="preview" className="w-32 h-32 object-cover rounded-xl border border-[#dce6f9]" />
                    <button type="button" onClick={() => setFormImage('')}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 px-4 py-3 border-2 border-dashed border-[#dce6f9] rounded-xl cursor-pointer hover:border-[#1d6ae5] transition-colors">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => imgRef.current?.click()}
                        className="flex items-center gap-1.5 text-sm text-[#1d6ae5]">
                        <Upload className="w-4 h-4" /> อัปโหลด
                      </button>
                    </div>
                  </label>
                )}
              </div>

              {/* GPS */}
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">GPS</label>
                <div className="flex gap-2">
                  <input value={gpsLat} onChange={e => setGpsLat(e.target.value)} placeholder="Latitude" className="input-field text-xs" />
                  <input value={gpsLng} onChange={e => setGpsLng(e.target.value)} placeholder="Longitude" className="input-field text-xs" />
                  <button type="button" onClick={getGps}
                    className="flex-shrink-0 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100">
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>
                {gpsLat && gpsLng && (
                  <p className="text-xs text-green-600 mt-1">📍 {Number(gpsLat).toFixed(5)}, {Number(gpsLng).toFixed(5)}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">หมายเหตุ</label>
                <input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="หมายเหตุเพิ่มเติม..." className="input-field" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Detail ──────────────────────────────────────────────── */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#dce6f9] sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="font-bold text-[#1a2744]">{showDetail.title}</h2>
                {showDetail.refNo && <p className="text-xs text-[#94a3b8]">{showDetail.refNo}</p>}
              </div>
              <button onClick={() => setShowDetail(null)}><X className="w-4 h-4 text-[#94a3b8]" /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {showDetail.image && (
                <img src={showDetail.image} alt={showDetail.title}
                  className="w-full max-h-52 object-cover rounded-xl border border-[#dce6f9]" />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['ประเภท', showDetail.category?.name || '-'],
                  ['สถานะ', showDetail.status === 'found' ? 'รอเจ้าของ' : 'มีเจ้าของแล้ว'],
                  ['สถานที่พบ', showDetail.foundLocation || '-'],
                  ['วันที่พบ', thDate(showDetail.foundDate || showDetail.createdAt)],
                  ['บันทึกโดย', showDetail.reporter?.name || '-'],
                  ['วันที่บันทึก', thDate(showDetail.createdAt)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-[#94a3b8] mb-0.5">{k}</p>
                    <p className="font-medium text-[#1a2744]">{v}</p>
                  </div>
                ))}
              </div>
              {showDetail.description && (
                <div>
                  <p className="text-xs text-[#94a3b8] mb-0.5">รายละเอียด</p>
                  <p className="text-sm text-[#1a2744]">{showDetail.description}</p>
                </div>
              )}
              {showDetail.gpsLat && showDetail.gpsLng && (
                <div className="rounded-xl overflow-hidden border border-[#dce6f9]" style={{ height: 160 }}>
                  <iframe width="100%" height="160" style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${showDetail.gpsLat},${showDetail.gpsLng}&z=17&output=embed`}
                    allowFullScreen />
                </div>
              )}
              {showDetail.status === 'claimed' && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-200 space-y-1 text-sm">
                  <p className="font-semibold text-green-700">ข้อมูลการรับของ</p>
                  <p className="text-green-600">ผู้รับ: {showDetail.claimedByName || '-'}</p>
                  <p className="text-green-600">เบอร์: {showDetail.claimedPhone || '-'}</p>
                  <p className="text-green-600">เลขบัตร: {showDetail.claimedIdCard || '-'}</p>
                  <p className="text-green-600">วันที่รับ: {thDate(showDetail.claimedAt)}</p>
                  {showDetail.claimedPhoto && (
                    <img src={showDetail.claimedPhoto} alt="claimer"
                      className="w-24 h-24 object-cover rounded-lg border border-green-200 mt-2" />
                  )}
                </div>
              )}
              <div className="flex gap-2">
                {showDetail.status === 'claimed' && (
                  <button onClick={() => { setShowDetail(null); printReceipt(showDetail); }}
                    className="btn-secondary flex items-center gap-1.5 text-sm flex-1">
                    <Printer className="w-4 h-4" /> พิมพ์ใบรับของ
                  </button>
                )}
                <button onClick={() => setShowDetail(null)} className="btn-secondary flex-1">ปิด</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Claim ───────────────────────────────────────────────── */}
      {showClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#dce6f9] sticky top-0 bg-white rounded-t-2xl">
              <h2 className="font-bold text-[#1a2744]">บันทึกการรับของ</h2>
              <button onClick={() => !claiming && setShowClaim(null)}><X className="w-4 h-4 text-[#94a3b8]" /></button>
            </div>
            <form onSubmit={handleClaim} className="px-5 py-4 space-y-3">
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 border border-blue-200">
                <p className="font-medium">{showClaim.title}</p>
                <p className="text-xs text-blue-500">{showClaim.refNo}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">ชื่อ-นามสกุลผู้มารับ <span className="text-red-500">*</span></label>
                <input value={claimForm.claimedByName}
                  onChange={e => setClaimForm(p => ({ ...p, claimedByName: e.target.value }))}
                  required placeholder="ชื่อ นามสกุล" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">เบอร์โทร <span className="text-red-500">*</span></label>
                <input value={claimForm.claimedPhone}
                  onChange={e => setClaimForm(p => ({ ...p, claimedPhone: e.target.value }))}
                  required placeholder="08x-xxx-xxxx" type="tel" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">เลขบัตรประชาชน <span className="text-red-500">*</span></label>
                <input value={claimForm.claimedIdCard}
                  onChange={e => setClaimForm(p => ({ ...p, claimedIdCard: e.target.value }))}
                  required placeholder="x-xxxx-xxxxx-xx-x" maxLength={13} className="input-field" />
              </div>

              {/* Claim photo */}
              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">ถ่ายรูปผู้มารับ</label>
                <input ref={claimImgRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImage(f, setClaimPhoto); }} />
                {claimPhoto ? (
                  <div className="relative inline-block">
                    <img src={claimPhoto} alt="claimer" className="w-28 h-28 object-cover rounded-xl border border-[#dce6f9]" />
                    <button type="button" onClick={() => setClaimPhoto('')}
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => claimImgRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-[#dce6f9] text-sm text-[#4a6080] hover:bg-gray-100">
                      <Camera className="w-4 h-4" /> ถ่ายรูป / อัปโหลด
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4a6080] mb-1">หมายเหตุ</label>
                <input value={claimForm.note}
                  onChange={e => setClaimForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="หมายเหตุ..." className="input-field" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowClaim(null)} className="btn-secondary flex-1">ยกเลิก</button>
                <button type="submit" disabled={claiming} className="btn-primary flex-1">
                  {claiming ? 'กำลังบันทึก...' : 'ยืนยันการรับของ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
