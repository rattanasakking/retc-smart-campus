'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { EquipmentForm } from '../../_components/EquipmentForm';

export default function EquipmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]     = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ data: Record<string, unknown> }>(`/equipment/${id}`);
      setData(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3" style={{ color: '#94a3b8' }}>
      <Loader2 className="w-6 h-6 animate-spin" /> กำลังโหลด...
    </div>
  );
  if (!data) return <div className="text-center py-20" style={{ color: '#94a3b8' }}>ไม่พบครุภัณฑ์</div>;

  const flat: Record<string, string | number | null> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === 'category')    { flat['categoryId'] = (v as { id: number } | null)?.id ?? null; continue; }
    if (typeof v === 'object' && v !== null) continue;
    flat[k] = v as string | number | null;
  }

  return <EquipmentForm mode="edit" initialData={flat} equipmentId={id} />;
}
