'use client';
import { useEffect, useRef, useState } from 'react';
import { Smartphone, GripVertical, Eye, EyeOff, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  ALL_QUICK_ITEMS, QuickMenuConfig, QuickMenuItem,
  loadQuickMenuConfig, saveQuickMenuConfig,
} from '@/lib/quickMenu';

interface ItemState extends QuickMenuConfig {
  item: QuickMenuItem;
}

export default function QuickMenuSettingsPage() {
  const [items, setItems]       = useState<ItemState[]>([]);
  const [saved, setSaved]       = useState(false);
  const dragIndex               = useRef<number | null>(null);
  const dragOverIndex           = useRef<number | null>(null);

  useEffect(() => {
    const config = loadQuickMenuConfig();
    const configMap = new Map(config.map((c) => [c.key, c.visible]));

    // Build ordered list: config-ordered items first, then any new items not in config
    const ordered: ItemState[] = [];
    config.forEach(({ key }) => {
      const found = ALL_QUICK_ITEMS.find((i) => i.key === key);
      if (found) ordered.push({ key, visible: configMap.get(key) ?? true, item: found });
    });
    ALL_QUICK_ITEMS.forEach((item) => {
      if (!ordered.find((o) => o.key === item.key)) {
        ordered.push({ key: item.key, visible: true, item });
      }
    });
    setItems(ordered);
  }, []);

  function save() {
    const config: QuickMenuConfig[] = items.map(({ key, visible }) => ({ key, visible }));
    saveQuickMenuConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reset() {
    const defaultConfig: QuickMenuConfig[] = ALL_QUICK_ITEMS.map((item, i) => ({
      key: item.key, visible: i < 8,
    }));
    saveQuickMenuConfig(defaultConfig);
    setItems(ALL_QUICK_ITEMS.map((item, i) => ({ key: item.key, visible: i < 8, item })));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleVisible(key: string) {
    setItems((prev) => prev.map((s) => s.key === key ? { ...s, visible: !s.visible } : s));
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    dragOverIndex.current = index;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const from = dragIndex.current;
    const to   = dragOverIndex.current;
    if (from === null || to === null || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragIndex.current     = null;
    dragOverIndex.current = null;
  }

  function handleDragEnd() {
    dragIndex.current     = null;
    dragOverIndex.current = null;
  }

  // ── Preview ────────────────────────────────────────────────────────────────

  const visibleItems = items.filter((s) => s.visible).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1a2744' }}>
          <Smartphone className="w-5 h-5" style={{ color: '#1d6ae5' }} />
          เมนูด่วน (มือถือ)
        </h1>
        <p className="text-sm mt-1" style={{ color: '#4a6080' }}>
          จัดลำดับและเลือกเมนูที่แสดงในหน้าหลัก (มือถือ) — แสดงได้สูงสุด 8 รายการ
        </p>
      </div>

      <div className="grid xl:grid-cols-2 gap-5 items-start">
        {/* ── Drag List ── */}
        <div className="card space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
            ลากเพื่อเรียงลำดับ
          </p>
          {items.map((state, index) => {
            const { item, visible } = state;
            return (
              <div
                key={item.key}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-colors"
                style={{
                  backgroundColor: visible ? '#f5f8ff' : '#f8fafc',
                  borderColor: visible ? '#dce6f9' : '#e2e8f0',
                  opacity: visible ? 1 : 0.6,
                }}>
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 flex-shrink-0" style={{ color: '#94a3b8' }} />

                {/* Icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: item.bg }}>
                  <item.Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: '#94a3b8' }}>{item.key}</p>
                </div>

                {/* Order badge */}
                {visible && (() => {
                  const visIdx = items.filter((s, i) => s.visible && i <= index).length - 1;
                  const inGrid = visIdx < 8;
                  return (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: inGrid ? '#e8f0fe' : '#f1f5f9',
                        color: inGrid ? '#1d6ae5' : '#94a3b8',
                      }}>
                      {inGrid ? `#${visIdx + 1}` : 'ซ่อน (เกิน 8)'}
                    </span>
                  );
                })()}

                {/* Toggle */}
                <button
                  onClick={() => toggleVisible(item.key)}
                  className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-white"
                  title={visible ? 'ซ่อนเมนูนี้' : 'แสดงเมนูนี้'}>
                  {visible
                    ? <Eye className="w-4 h-4" style={{ color: '#1d6ae5' }} />
                    : <EyeOff className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  }
                </button>
              </div>
            );
          })}
        </div>

        {/* ── Right: Preview + Actions ── */}
        <div className="space-y-4 xl:sticky xl:top-4">
          {/* Mobile preview */}
          <div className="card">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>
              ตัวอย่างการแสดงผล (มือถือ)
            </p>
            {visibleItems.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#94a3b8' }}>ไม่มีเมนูที่เปิดใช้งาน</p>
            ) : (
              <div className="mx-auto max-w-[280px]">
                <div className="rounded-2xl p-4 shadow-inner" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold" style={{ color: '#1a2744' }}>เมนูด่วน</p>
                    <span className="text-[10px]" style={{ color: '#1d6ae5' }}>ดูทั้งหมด →</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {visibleItems.map(({ item }) => (
                      <div key={item.key}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl"
                        style={{ backgroundColor: item.bg }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: item.bg }}>
                          <item.Icon className="w-4 h-4" style={{ color: item.color }} />
                        </div>
                        <span className="text-[9px] font-medium text-center leading-tight" style={{ color: '#1a2744' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[11px] text-center mt-3" style={{ color: '#94a3b8' }}>
              แสดง {visibleItems.length}/8 เมนู
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={save}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: saved ? '#10b981' : '#1d6ae5' }}>
              {saved
                ? <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว!</>
                : 'บันทึกการตั้งค่า'
              }
            </button>
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: '#f5f8ff', color: '#4a6080', border: '1px solid #dce6f9' }}>
              <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตเป็นค่าเริ่มต้น
            </button>
          </div>

          {/* Note */}
          <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: '#92400e' }}>
            <p className="font-semibold mb-1">หมายเหตุ</p>
            <ul className="space-y-1 list-disc pl-4">
              <li>การตั้งค่านี้จะบันทึกเฉพาะในเบราว์เซอร์นี้</li>
              <li>เมนูที่ไม่มีสิทธิ์ใช้งานจะถูกซ่อนอัตโนมัติ</li>
              <li>แสดงได้สูงสุด 8 เมนูในหน้าหลัก</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
