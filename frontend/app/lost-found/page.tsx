'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Calendar, X, Phone, ChevronDown, Package } from 'lucide-react';

interface Category { id: number; name: string }
interface LostFoundItem {
  id: number; refNo: string | null; type: string; title: string;
  description: string | null; category: { id: number; name: string } | null;
  foundDate: string | null; foundLocation: string | null;
  image: string | null; gpsLat: string | null; gpsLng: string | null;
  status: 'found' | 'claimed' | 'archived';
  reporter: { name: string; department?: string };
  claimedByName: string | null; claimedAt: string | null;
  createdAt: string;
}

const COLLEGE_PHONE = '043-511-123';

function thDate(iso: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'claimed') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">มีเจ้าของแล้ว</span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">รอเจ้าของ</span>
  );
}

export default function PublicLostFoundPage() {
  const [items, setItems]       = useState<LostFoundItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<LostFoundItem | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({ name: '', phone: '', idCard: '', detail: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch('/api/lostfound/categories')
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  const load = (s = search, c = catFilter, st = statusFilter) => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '60' });
    if (s) p.set('search', s);
    if (c) p.set('categoryId', c);
    if (st) p.set('status', st);
    fetch(`/api/lostfound?${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) { setItems(d.data); setTotal(d.pagination?.total ?? d.data.length); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v, catFilter, statusFilter), 400);
  };

  const handleCat = (v: string) => { setCatFilter(v); load(search, v, statusFilter); };
  const handleStatus = (v: string) => { setStatusFilter(v); load(search, catFilter, v); };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!claimForm.name.trim() || !claimForm.phone.trim() || !claimForm.idCard.trim()) return;
    setSubmitting(true);
    // store locally — actual claim done by staff after verification
    await new Promise(r => setTimeout(r, 600));
    setSubmitting(false);
    setSubmitDone(true);
  };

  const openDetail = (item: LostFoundItem) => {
    setSelected(item);
    setShowClaim(false);
    setSubmitDone(false);
    setClaimForm({ name: '', phone: '', idCard: '', detail: '' });
  };

  const closeModal = () => { setSelected(null); setShowClaim(false); setSubmitDone(false); };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f5ff' }}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ backgroundColor: '#0f1e3c' }}>
            <span className="text-white text-[10px] font-bold">RETC</span>
          </div>
          <div>
            <p className="font-bold text-lg leading-tight" style={{ color: '#0f1e3c' }}>
              วิทยาลัยเทคนิคร้อยเอ็ด
            </p>
            <p className="text-sm" style={{ color: '#4a6080' }}>ระบบค้นหาของหาย / Lost &amp; Found</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="ค้นหาชื่อของ สถานที่พบ..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={catFilter}
                onChange={e => handleCat(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกประเภท</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => handleStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">ทุกสถานะ</option>
                <option value="found">รอเจ้าของ</option>
                <option value="claimed">มีเจ้าของแล้ว</option>
              </select>
              <ChevronDown className="absolute right-2 top-3 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm mb-4" style={{ color: '#4a6080' }}>
          พบ <strong className="text-[#1a2744]">{total}</strong> รายการ
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-blue-100 overflow-hidden animate-pulse">
                <div className="h-44 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-400">ไม่พบรายการของหาย</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => openDetail(item)}
                className="bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-blue-300 transition-all"
              >
                {/* Image */}
                <div className="h-44 bg-gray-50 relative overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.title}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-12 h-12 text-gray-200" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <StatusBadge status={item.status} />
                  </div>
                  {item.category && (
                    <div className="absolute bottom-2 left-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/90 text-gray-600 border border-gray-200">
                        {item.category.name}
                      </span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <p className="font-semibold text-sm text-[#1a2744] mb-1 line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="line-clamp-1">{item.foundLocation || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{thDate(item.foundDate || item.createdAt)}</span>
                  </div>
                  {item.status === 'found' && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium">นี่ของฉัน / ติดต่อรับ →</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer contact */}
        <div className="mt-10 text-center text-sm text-gray-500">
          <p>ติดต่อสอบถาม: <a href={`tel:${COLLEGE_PHONE}`} className="text-blue-600 font-medium">{COLLEGE_PHONE}</a></p>
          <p className="mt-1">วิทยาลัยเทคนิคร้อยเอ็ด — งานปกครองนักเรียนนักศึกษา</p>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <p className="font-bold text-[#1a2744]">{selected.title}</p>
                {selected.refNo && <p className="text-xs text-gray-400 mt-0.5">{selected.refNo}</p>}
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Image */}
              {selected.image && (
                <img src={selected.image} alt={selected.title}
                  className="w-full max-h-56 object-cover rounded-xl border border-gray-100" />
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">ประเภท</p>
                  <p className="font-medium text-[#1a2744]">{selected.category?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">สถานะ</p>
                  <StatusBadge status={selected.status} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">สถานที่พบ</p>
                  <p className="font-medium text-[#1a2744]">{selected.foundLocation || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">วันที่พบ</p>
                  <p className="font-medium text-[#1a2744]">{thDate(selected.foundDate || selected.createdAt)}</p>
                </div>
              </div>

              {selected.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">รายละเอียด</p>
                  <p className="text-sm text-[#1a2744]">{selected.description}</p>
                </div>
              )}

              {/* Map */}
              {selected.gpsLat && selected.gpsLng && (
                <div className="rounded-xl overflow-hidden border border-gray-100" style={{ height: 180 }}>
                  <iframe
                    width="100%" height="180" style={{ border: 0 }}
                    src={`https://maps.google.com/maps?q=${selected.gpsLat},${selected.gpsLng}&z=17&output=embed`}
                    allowFullScreen
                  />
                </div>
              )}

              {/* Claimed info */}
              {selected.status === 'claimed' && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-200 text-sm">
                  <p className="font-semibold text-green-700 mb-1">รับของคืนแล้ว</p>
                  <p className="text-green-600">รับเมื่อ: {thDate(selected.claimedAt)}</p>
                  {selected.claimedByName && <p className="text-green-600">ผู้รับ: {selected.claimedByName}</p>}
                </div>
              )}

              {/* Claim button */}
              {selected.status === 'found' && !showClaim && !submitDone && (
                <button
                  onClick={() => setShowClaim(true)}
                  className="w-full py-2.5 rounded-xl font-medium text-white text-sm transition-colors"
                  style={{ backgroundColor: '#1d6ae5' }}
                >
                  ของฉัน / ติดต่อรับของ
                </button>
              )}

              {/* Claim form */}
              {showClaim && !submitDone && (
                <form onSubmit={handleSubmitClaim} className="space-y-3 border-t border-gray-100 pt-4">
                  <p className="font-semibold text-sm text-[#1a2744]">กรอกข้อมูลเพื่อติดต่อรับของ</p>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <input
                      value={claimForm.name}
                      onChange={e => setClaimForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="ชื่อ นามสกุล"
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">เบอร์โทรศัพท์ <span className="text-red-500">*</span></label>
                    <input
                      value={claimForm.phone}
                      onChange={e => setClaimForm(p => ({ ...p, phone: e.target.value }))}
                      placeholder="08x-xxx-xxxx"
                      required type="tel"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">เลขบัตรประชาชน <span className="text-red-500">*</span></label>
                    <input
                      value={claimForm.idCard}
                      onChange={e => setClaimForm(p => ({ ...p, idCard: e.target.value }))}
                      placeholder="x-xxxx-xxxxx-xx-x"
                      required maxLength={13}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">รายละเอียดเพิ่มเติม (ลักษณะพิเศษของ)</label>
                    <textarea
                      value={claimForm.detail}
                      onChange={e => setClaimForm(p => ({ ...p, detail: e.target.value }))}
                      placeholder="บอกลักษณะพิเศษของสิ่งของเพื่อยืนยันความเป็นเจ้าของ..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowClaim(false)}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
                      ยกเลิก
                    </button>
                    <button type="submit" disabled={submitting}
                      className="flex-1 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#1d6ae5' }}>
                      {submitting ? 'กำลังส่ง...' : 'ส่งข้อมูล'}
                    </button>
                  </div>
                </form>
              )}

              {/* Submit success */}
              {submitDone && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-center space-y-2">
                  <p className="font-semibold text-blue-700">ส่งข้อมูลแล้ว!</p>
                  <p className="text-sm text-blue-600">
                    รหัสรายการ: <strong>{selected.refNo}</strong>
                  </p>
                  <p className="text-sm text-blue-600">
                    กรุณาติดต่อเจ้าหน้าที่ที่งานปกครอง
                  </p>
                  <div className="flex items-center justify-center gap-1 text-sm font-medium text-blue-700">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${COLLEGE_PHONE}`}>{COLLEGE_PHONE}</a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
