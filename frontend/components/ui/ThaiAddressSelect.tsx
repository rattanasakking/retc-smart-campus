'use client';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// โครงสร้างข้อมูลจาก /thai-geography.json (nested: จังหวัด > อำเภอ > ตำบล)
interface Sub      { n: string; z: string }
interface District { n: string; s: Sub[] }
interface Province { n: string; d: District[] }

export interface ThaiAddressValue {
  province: string;      // จังหวัด
  district: string;      // อำเภอ/เขต
  subdistrict: string;   // ตำบล/แขวง
  postalCode: string;    // รหัสไปรษณีย์
}

interface Props {
  value: ThaiAddressValue;
  onChange: (v: ThaiAddressValue) => void;
  disabled?: boolean;
}

// cache แชร์ทั้งแอป (โหลดครั้งเดียว)
let GEO_CACHE: Province[] | null = null;
let GEO_PROMISE: Promise<Province[]> | null = null;

function loadGeography(): Promise<Province[]> {
  if (GEO_CACHE) return Promise.resolve(GEO_CACHE);
  if (!GEO_PROMISE) {
    GEO_PROMISE = fetch('/thai-geography.json')
      .then((r) => r.json())
      .then((data: Province[]) => { GEO_CACHE = data; return data; })
      .catch(() => { GEO_PROMISE = null; return []; });
  }
  return GEO_PROMISE;
}

export default function ThaiAddressSelect({ value, onChange, disabled = false }: Props) {
  const [geo, setGeo]         = useState<Province[]>(GEO_CACHE ?? []);
  const [loading, setLoading] = useState(!GEO_CACHE);

  useEffect(() => {
    if (GEO_CACHE) { setGeo(GEO_CACHE); setLoading(false); return; }
    let alive = true;
    loadGeography().then((data) => { if (alive) { setGeo(data); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const provinceObj = useMemo(() => geo.find((p) => p.n === value.province) ?? null, [geo, value.province]);
  const districtObj = useMemo(() => provinceObj?.d.find((d) => d.n === value.district) ?? null, [provinceObj, value.district]);
  const subObj      = useMemo(() => districtObj?.s.find((s) => s.n === value.subdistrict) ?? null, [districtObj, value.subdistrict]);

  const setProvince = (province: string) => {
    onChange({ province, district: '', subdistrict: '', postalCode: '' });
  };
  const setDistrict = (district: string) => {
    onChange({ ...value, district, subdistrict: '', postalCode: '' });
  };
  const setSubdistrict = (subName: string) => {
    const s = districtObj?.s.find((x) => x.n === subName);
    onChange({ ...value, subdistrict: subName, postalCode: s?.z ?? '' });
  };

  const sel = 'border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed';

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Loader2 size={15} className="animate-spin" /> กำลังโหลดข้อมูลจังหวัด...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* จังหวัด */}
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <MapPin size={12} /> จังหวัด
          </label>
          <select value={value.province} onChange={(e) => setProvince(e.target.value)} disabled={disabled} className={sel}>
            <option value="">-- เลือกจังหวัด --</option>
            {geo.map((p) => <option key={p.n} value={p.n}>{p.n}</option>)}
          </select>
        </div>

        {/* อำเภอ/เขต */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">อำเภอ / เขต</label>
          <select value={value.district} onChange={(e) => setDistrict(e.target.value)} disabled={disabled || !provinceObj} className={sel}>
            <option value="">-- เลือกอำเภอ/เขต --</option>
            {provinceObj?.d.map((d) => <option key={d.n} value={d.n}>{d.n}</option>)}
          </select>
        </div>

        {/* ตำบล/แขวง */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">ตำบล / แขวง</label>
          <select value={value.subdistrict} onChange={(e) => setSubdistrict(e.target.value)} disabled={disabled || !districtObj} className={sel}>
            <option value="">-- เลือกตำบล/แขวง --</option>
            {districtObj?.s.map((s) => <option key={s.n} value={s.n}>{s.n}</option>)}
          </select>
        </div>

        {/* รหัสไปรษณีย์ (auto) */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">รหัสไปรษณีย์</label>
          <input
            value={value.postalCode}
            onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, '').slice(0, 5) })}
            placeholder="อัตโนมัติ"
            inputMode="numeric"
            disabled={disabled}
            className="border rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-100"
          />
        </div>
      </div>
      {subObj && (
        <p className="text-[11px] text-gray-400">
          รหัสไปรษณีย์เติมอัตโนมัติจากตำบลที่เลือก (แก้ไขได้หากจำเป็น)
        </p>
      )}
    </div>
  );
}
