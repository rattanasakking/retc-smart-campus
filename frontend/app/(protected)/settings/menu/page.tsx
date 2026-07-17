'use client';
import { useEffect, useRef, useState } from 'react';
import { ListOrdered, GripVertical, Eye, EyeOff, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { MAIN_NAV, type MenuOrderCfg, type MainNavItem } from '@/lib/mainMenu';
import { api } from '@/lib/api';

interface ItemState { href: string; visible: boolean; item: MainNavItem }

function buildOrdered(config: MenuOrderCfg[]): ItemState[] {
  const byHref = new Map(MAIN_NAV.map((n) => [n.href, n]));
  const seen = new Set<string>();
  const out: ItemState[] = [];
  for (const c of config) {
    const item = byHref.get(c.href);
    if (item) { out.push({ href: c.href, visible: c.visible !== false, item }); seen.add(c.href); }
  }
  for (const n of MAIN_NAV) if (!seen.has(n.href)) out.push({ href: n.href, visible: true, item: n });
  return out;
}

export default function MenuSettingsPage() {
  const [items, setItems]   = useState<ItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const dragIndex     = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    api.get<{ data: MenuOrderCfg[] }>('/settings/menu-order')
      .then((r) => setItems(buildOrdered(r.data ?? [])))
      .catch(() => setItems(buildOrdered([])))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put('/settings/menu-order', { order: items.map(({ href, visible }) => ({ href, visible })) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch { /* */ } finally { setSaving(false); }
  }

  async function reset() {
    const def = MAIN_NAV.map((item) => ({ href: item.href, visible: true, item }));
    setItems(def);
    setSaving(true);
    try { await api.put('/settings/menu-order', { order: def.map(({ href, visible }) => ({ href, visible })) }); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch { /* */ } finally { setSaving(false); }
  }

  const toggleVisible = (href: string) =>
    setItems((prev) => prev.map((s) => s.href === href ? { ...s, visible: !s.visible } : s));

  function handleDragStart(_e: React.DragEvent, i: number) { dragIndex.current = i; }
  function handleDragOver(e: React.DragEvent, i: number) { e.preventDefault(); dragOverIndex.current = i; }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndex.current, to = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    setItems((prev) => { const next = [...prev]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; });
    dragIndex.current = null; dragOverIndex.current = null;
  }

  const move = (i: number, dir: -1 | 1) => setItems((prev) => {
    const j = i + dir; if (j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1a2744' }}>
          <ListOrdered className="w-5 h-5" style={{ color: '#1d6ae5' }} /> จัดลำดับเมนูหลัก
        </h1>
        <p className="text-sm mt-1" style={{ color: '#4a6080' }}>
          ลากเพื่อเรียงลำดับ และเปิด/ปิดการแสดงเมนูในแถบด้านซ้าย — มีผลกับผู้ใช้ทุกคน
        </p>
      </div>

      <div className="card space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-10" style={{ color: '#94a3b8' }}><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : items.map((state, index) => {
          const { item, visible, href } = state;
          return (
            <div key={href}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={handleDrop}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border select-none transition-colors"
              style={{ backgroundColor: visible ? '#f5f8ff' : '#f8fafc', borderColor: visible ? '#dce6f9' : '#e2e8f0', opacity: visible ? 1 : 0.55 }}>
              <GripVertical className="w-4 h-4 flex-shrink-0 cursor-grab" style={{ color: '#94a3b8' }} />
              <span className="text-[11px] font-bold w-5 text-center flex-shrink-0" style={{ color: '#94a3b8' }}>{index + 1}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e8f0fe' }}>
                <item.Icon className="w-4 h-4" style={{ color: '#1d6ae5' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{item.label}</p>
                <p className="text-[11px]" style={{ color: '#94a3b8' }}>{href}</p>
              </div>
              {/* up/down for touch */}
              <div className="flex flex-col flex-shrink-0">
                <button onClick={() => move(index, -1)} disabled={index === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none text-xs">▲</button>
                <button onClick={() => move(index, 1)} disabled={index === items.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none text-xs">▼</button>
              </div>
              <button onClick={() => toggleVisible(href)} className="flex-shrink-0 p-1 rounded-lg hover:bg-white" title={visible ? 'ซ่อนเมนูนี้' : 'แสดงเมนูนี้'}>
                {visible ? <Eye className="w-4 h-4" style={{ color: '#1d6ae5' }} /> : <EyeOff className="w-4 h-4" style={{ color: '#94a3b8' }} />}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2.5">
        <button onClick={save} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-70"
          style={{ backgroundColor: saved ? '#10b981' : '#1d6ae5' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว!</> : 'บันทึกลำดับเมนู'}
        </button>
        <button onClick={reset} disabled={saving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
          <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ต
        </button>
      </div>

      <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e' }}>
        <p className="font-semibold mb-1">หมายเหตุ</p>
        <ul className="space-y-1 list-disc pl-4">
          <li>ลำดับนี้ใช้กับผู้ใช้ทุกคน (บันทึกที่เซิร์ฟเวอร์)</li>
          <li>เมนูที่ผู้ใช้ไม่มีสิทธิ์เข้าถึงจะถูกซ่อนอัตโนมัติอยู่แล้ว</li>
          <li>หลังบันทึก ผู้ใช้อาจต้องรีเฟรชหน้าเพื่อเห็นลำดับใหม่</li>
        </ul>
      </div>
    </div>
  );
}
