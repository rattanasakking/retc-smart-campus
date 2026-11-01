'use client';
import { useEffect, useState } from 'react';
import {
  LayoutGrid, Plus, Trash2, Pencil, CheckCircle2, Loader2, X, ExternalLink, FolderPlus, ChevronUp, ChevronDown, Upload, Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  APP_ROLE_LABEL, INTERNAL_GROUP_ID, glyphOf, resizeIcon, type ExternalApp, type ExternalAppGroup, type ExternalAppsData,
} from '@/lib/launcher';

const COLORS = ['#1d6ae5', '#0369a1', '#0d9068', '#16a34a', '#b45309', '#c2410c', '#dc2626', '#b91c1c', '#7c3aed', '#db2777', '#4a6080', '#0f1e3c'];

const newId = () => Math.random().toString(36).slice(2, 10);
const EMPTY_APP: ExternalApp = { id: '', name: '', desc: '', url: 'https://', color: '#1d6ae5', glyph: '', groupId: null, roles: [] };

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {COLORS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-label={c}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: c, outline: value === c ? '2px solid #1a2744' : 'none', outlineOffset: 2 }}>
          {value === c && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

function AppIcon({ app, size = 9 }: { app: ExternalApp; size?: number }) {
  const px = size * 4;
  return app.icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={app.icon} alt="" className="rounded-lg object-cover flex-shrink-0 bg-white" style={{ width: px, height: px, border: '1px solid #dce6f9' }} />
  ) : (
    <div className="rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold" style={{ width: px, height: px, backgroundColor: app.color }}>
      {glyphOf(app.name || 'App', app.glyph)}
    </div>
  );
}

function AppForm({ initial, groups, onCancel, onSave }: {
  initial: ExternalApp; groups: ExternalAppGroup[];
  onCancel: () => void; onSave: (a: ExternalApp) => void;
}) {
  const [a, setA] = useState<ExternalApp>(initial);
  const [err, setErr] = useState('');
  const set = <K extends keyof ExternalApp>(k: K, v: ExternalApp[K]) => setA((p) => ({ ...p, [k]: v }));
  const [uploading, setUploading] = useState(false);

  async function pickIcon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setErr('กรุณาเลือกไฟล์รูปภาพ');
    setUploading(true); setErr('');
    try {
      const imageData = await resizeIcon(file);
      const r = await api.post<{ data: { url: string } }>('/settings/external-apps/upload-icon', { imageData });
      set('icon', r.data.url);
    } catch (ex: any) { setErr(ex.message || 'อัปโหลดไอคอนไม่สำเร็จ'); } finally { setUploading(false); }
  }

  function submit() {
    if (!a.name.trim()) return setErr('กรุณากรอกชื่อแอป');
    try {
      const u = new URL(a.url.trim());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    } catch { return setErr('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://'); }
    onSave({ ...a, id: a.id || newId(), name: a.name.trim(), url: a.url.trim(), desc: a.desc.trim(), glyph: a.glyph.trim() });
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
      {/* Icon */}
      <div className="flex items-center gap-3">
        <AppIcon app={a} size={14} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {a.icon ? 'เปลี่ยนไอคอน' : 'อัปโหลดไอคอน'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={pickIcon} disabled={uploading} />
          </label>
          {a.icon && (
            <button type="button" onClick={() => set('icon', '')} className="text-xs" style={{ color: '#dc2626' }}>ใช้ตัวย่อแทน</button>
          )}
          <p className="w-full text-[11px]" style={{ color: '#94a3b8' }}>รูปจะถูกย่อเป็นสี่เหลี่ยมจัตุรัส 128×128 px อัตโนมัติ · ถ้าไม่ใส่ จะใช้ตัวย่อบนพื้นสี</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>ชื่อแอป *</span>
          <input value={a.name} onChange={(e) => set('name', e.target.value)} className="input-field mt-1" maxLength={80} placeholder="เช่น ศธ.02 ออนไลน์" />
        </label>
        <label className="block">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>ตัวย่อบนไอคอน (ไม่เกิน 4 ตัว)</span>
          <input value={a.glyph} onChange={(e) => set('glyph', e.target.value)} className="input-field mt-1" maxLength={4} placeholder={glyphOf(a.name || 'App')} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>ลิงก์ *</span>
          <input value={a.url} onChange={(e) => set('url', e.target.value)} className="input-field mt-1" inputMode="url" maxLength={500} />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>คำอธิบาย</span>
          <input value={a.desc} onChange={(e) => set('desc', e.target.value)} className="input-field mt-1" maxLength={200} />
        </label>
        <label className="block">
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>กลุ่ม</span>
          <select value={a.groupId ?? ''} onChange={(e) => set('groupId', e.target.value || null)} className="input-field mt-1">
            <option value="">ระบบอื่น ๆ (ไม่มีกลุ่ม)</option>
            {groups.filter((g) => g.id !== INTERNAL_GROUP_ID).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </label>
        <div>
          <span className="text-xs font-medium" style={{ color: '#4a6080' }}>ใครเห็นแอปนี้ (ไม่เลือก = ทุกคน)</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(APP_ROLE_LABEL).map(([r, label]) => {
              const on = a.roles.includes(r);
              return (
                <button key={r} type="button"
                  onClick={() => set('roles', on ? a.roles.filter((x) => x !== r) : [...a.roles, r])}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium"
                  style={on ? { backgroundColor: '#1d6ae5', color: '#fff' } : { backgroundColor: '#fff', color: '#4a6080', border: '1px solid #dce6f9' }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div>
        <span className="text-xs font-medium" style={{ color: '#4a6080' }}>สีไอคอน</span>
        <div className="mt-1.5"><ColorPicker value={a.color} onChange={(c) => set('color', c)} /></div>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="btn-secondary text-sm">ยกเลิก</button>
        <button onClick={submit} className="btn-primary text-sm">ตกลง</button>
      </div>
    </div>
  );
}

export default function AppsSettingsPage() {
  const [data, setData]       = useState<ExternalAppsData>({ groups: [], apps: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [error, setError]     = useState('');
  const [editingId, setEditingId] = useState<string | null>(null); // '' = แอปใหม่

  useEffect(() => {
    api.get<{ data: ExternalAppsData }>('/settings/external-apps?all=1')
      .then((r) => setData(r.data ?? { groups: [], apps: [] }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const change = (next: ExternalAppsData) => { setData(next); setDirty(true); };

  async function save() {
    setSaving(true); setError('');
    try {
      const r = await api.put<{ data: ExternalAppsData }>('/settings/external-apps', data);
      setData(r.data); setDirty(false);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }

  // ─── groups ───
  const addGroup = () => change({ ...data, groups: [...data.groups, { id: newId(), name: 'กลุ่มใหม่', color: '#1d6ae5' }] });
  const updateGroup = (id: string, patch: Partial<ExternalAppGroup>) =>
    change({ ...data, groups: data.groups.map((g) => g.id === id ? { ...g, ...patch } : g) });
  const moveGroup = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= data.groups.length) return;
    const groups = [...data.groups]; [groups[i], groups[j]] = [groups[j], groups[i]];
    change({ ...data, groups });
  };
  const removeGroup = (id: string) => {
    if (!confirm('ลบกลุ่มนี้? แอปในกลุ่มจะย้ายไป "ระบบอื่น ๆ"')) return;
    change({ groups: data.groups.filter((g) => g.id !== id), apps: data.apps.map((a) => a.groupId === id ? { ...a, groupId: null } : a) });
  };

  // ─── apps ───
  const saveApp = (a: ExternalApp) => {
    const exists = data.apps.some((x) => x.id === a.id);
    change({ ...data, apps: exists ? data.apps.map((x) => x.id === a.id ? a : x) : [...data.apps, a] });
    setEditingId(null);
  };
  const removeApp = (id: string) => {
    if (!confirm('ลบแอปนี้?')) return;
    change({ ...data, apps: data.apps.filter((a) => a.id !== id) });
  };
  const moveApp = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= data.apps.length) return;
    const apps = [...data.apps]; [apps[i], apps[j]] = [apps[j], apps[i]];
    change({ ...data, apps });
  };

  const groupName = (id: string | null) => data.groups.find((g) => g.id === id)?.name ?? 'ระบบอื่น ๆ';

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#1a2744' }}>
          <LayoutGrid className="w-5 h-5" style={{ color: '#1d6ae5' }} /> แอปและระบบภายนอก
        </h1>
        <p className="text-sm mt-1" style={{ color: '#4a6080' }}>
          ลิงก์ระบบอื่นที่จะแสดงในหน้า &quot;แอปทั้งหมด&quot; ส่วนโมดูลในระบบนี้จะแสดงให้อัตโนมัติตามสิทธิ์ของผู้ใช้
        </p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-10" style={{ color: '#94a3b8' }}><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <>
          {/* Groups */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: '#1a2744' }}>กลุ่มแอป และลำดับการแสดง</h2>
                <p className="text-[11px] mt-0.5" style={{ color: '#94a3b8' }}>เรียงตามลำดับที่จะแสดงในหน้า &quot;แอปทั้งหมด&quot; · &quot;ระบบอื่น ๆ&quot; อยู่ท้ายสุดเสมอ</p>
              </div>
              <button onClick={addGroup} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#1d6ae5' }}>
                <FolderPlus className="w-3.5 h-3.5" /> เพิ่มกลุ่ม
              </button>
            </div>
            {data.groups.length === 0 && <p className="text-xs" style={{ color: '#94a3b8' }}>ยังไม่มีกลุ่ม</p>}
            {data.groups.map((g, i) => {
              const internal = g.id === INTERNAL_GROUP_ID;
              return (
              <div key={g.id} className="rounded-lg p-3 space-y-2" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold w-4 text-center flex-shrink-0" style={{ color: '#94a3b8' }}>{i + 1}</span>
                  <span className="w-1.5 h-6 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <input value={g.name} onChange={(e) => updateGroup(g.id, { name: e.target.value })} className="input-field flex-1 min-w-0" maxLength={80} />
                  <div className="flex flex-col flex-shrink-0">
                    <button onClick={() => moveGroup(i, -1)} disabled={i === 0} className="p-0.5 rounded hover:bg-white disabled:opacity-30" aria-label="เลื่อนกลุ่มขึ้น">
                      <ChevronUp className="w-4 h-4" style={{ color: '#4a6080' }} />
                    </button>
                    <button onClick={() => moveGroup(i, 1)} disabled={i === data.groups.length - 1} className="p-0.5 rounded hover:bg-white disabled:opacity-30" aria-label="เลื่อนกลุ่มลง">
                      <ChevronDown className="w-4 h-4" style={{ color: '#4a6080' }} />
                    </button>
                  </div>
                  {internal ? (
                    <span className="p-2 flex-shrink-0" title="ส่วนโมดูลในระบบ — ลบไม่ได้"><Lock className="w-4 h-4" style={{ color: '#94a3b8' }} /></span>
                  ) : (
                    <button onClick={() => removeGroup(g.id)} className="p-2 rounded-lg hover:bg-red-50 flex-shrink-0" aria-label="ลบกลุ่ม">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
                {internal && <p className="text-[11px] pl-6" style={{ color: '#94a3b8' }}>โมดูลในระบบนี้ (เวร, แจ้งซ่อม, การลา ฯลฯ) — แสดงตามสิทธิ์ผู้ใช้อัตโนมัติ</p>}
                <ColorPicker value={g.color} onChange={(c) => updateGroup(g.id, { color: c })} />
              </div>
              );
            })}
          </div>

          {/* Apps */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h2 className="text-sm font-semibold" style={{ color: '#1a2744' }}>รายการแอป ({data.apps.length})</h2>
              {editingId === null && (
                <button onClick={() => setEditingId('')} className="flex items-center gap-1 text-xs font-medium" style={{ color: '#1d6ae5' }}>
                  <Plus className="w-3.5 h-3.5" /> เพิ่มแอป
                </button>
              )}
            </div>

            {editingId === '' && (
              <AppForm initial={EMPTY_APP} groups={data.groups} onCancel={() => setEditingId(null)} onSave={saveApp} />
            )}

            {data.apps.length === 0 && editingId !== '' && (
              <p className="text-xs py-4 text-center" style={{ color: '#94a3b8' }}>ยังไม่มีแอปภายนอก</p>
            )}

            {data.apps.map((a, i) => editingId === a.id ? (
              <AppForm key={a.id} initial={a} groups={data.groups} onCancel={() => setEditingId(null)} onSave={saveApp} />
            ) : (
              <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ backgroundColor: '#f5f8ff', border: '1px solid #dce6f9' }}>
                <AppIcon app={a} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: '#1a2744' }}>{a.name}</p>
                  <p className="text-[11px] truncate" style={{ color: '#94a3b8' }}>
                    {groupName(a.groupId)} · {a.roles.length ? a.roles.map((r) => APP_ROLE_LABEL[r]).join(', ') : 'ทุกคน'}
                  </p>
                </div>
                <div className="flex flex-col flex-shrink-0">
                  <button onClick={() => moveApp(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none text-xs px-1" aria-label="เลื่อนขึ้น">▲</button>
                  <button onClick={() => moveApp(i, 1)} disabled={i === data.apps.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30 leading-none text-xs px-1" aria-label="เลื่อนลง">▼</button>
                </div>
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white flex-shrink-0 hidden sm:block" aria-label="เปิดลิงก์">
                  <ExternalLink className="w-4 h-4" style={{ color: '#4a6080' }} />
                </a>
                <button onClick={() => setEditingId(a.id)} className="p-1.5 rounded-lg hover:bg-white flex-shrink-0" aria-label="แก้ไข">
                  <Pencil className="w-4 h-4" style={{ color: '#1d6ae5' }} />
                </button>
                <button onClick={() => removeApp(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0" aria-label="ลบ">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 md:bottom-2 flex items-center gap-2.5 py-2">
            <button onClick={save} disabled={saving || (!dirty && !saved)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: saved ? '#10b981' : '#1d6ae5' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><CheckCircle2 className="w-4 h-4" /> บันทึกแล้ว!</> : dirty ? 'บันทึกการเปลี่ยนแปลง' : 'ไม่มีการเปลี่ยนแปลง'}
            </button>
            {dirty && (
              <button onClick={() => location.reload()} className="flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ backgroundColor: '#fff', color: '#4a6080', border: '1px solid #dce6f9' }}>
                <X className="w-3.5 h-3.5" /> ยกเลิก
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
