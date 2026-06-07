'use client';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Building2, ChevronDown, ChevronRight, Users, Network, List } from 'lucide-react';
import { api, USER_KEY } from '@/lib/api';
import OrgStructureManager, { Division, WorkUnit, Department } from '@/components/organization/OrgStructureManager';

type ViewMode = 'tree' | 'list';

interface Personnel {
  id: number; name: string; position?: string; avatar?: string; role: string;
  divisionId?: number; workUnitId?: number; departmentId?: number;
}

export default function PersonnelOrgPage() {
  const [isAdmin, setIsAdmin]   = useState(false);
  const [view, setView]         = useState<ViewMode>('tree');
  const [loading, setLoading]   = useState(true);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnit[]>([]);
  const [departments, setDepts] = useState<Department[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const p = JSON.parse(u);
      setIsAdmin(p.isSuperAdmin || p.role === 'admin');
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dr, wr, dpr, pr] = await Promise.all([
        api.get<{ data: Division[] }>('/settings/divisions'),
        api.get<{ data: WorkUnit[] }>('/settings/workunits'),
        api.get<{ data: Department[] }>('/settings/departments'),
        api.get<{ data: Personnel[] }>('/personnel?limit=500'),
      ]);
      setDivisions(dr.data);
      setWorkUnits(wr.data);
      setDepts(dpr.data);
      setPersonnel(pr.data ?? []);
      // expand all by default
      const keys = new Set<string>();
      dr.data.forEach((d) => keys.add(`div-${d.id}`));
      setExpanded(keys);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const ROLE_LABEL: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ', executive: 'ผู้บริหาร', staff: 'บุคลากร',
  };
  const ROLE_COLOR: Record<string, string> = {
    admin: '#7c3aed', executive: '#dc2626', staff: '#1d6ae5',
  };

  // ── Personnel card ─────────────────────────────────────────────────────────
  function PersonCard({ p }: { p: Personnel }) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-blue-50 transition-colors">
        {p.avatar
          ? <img src={p.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: ROLE_COLOR[p.role] ?? '#64748b' }}>
              {p.name[0]}
            </div>
        }
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
          <p className="text-[10px] text-gray-400 truncate">{p.position ?? ROLE_LABEL[p.role] ?? p.role}</p>
        </div>
      </div>
    );
  }

  // ── Org Tree ───────────────────────────────────────────────────────────────
  function OrgTree() {
    const unassigned = personnel.filter((p) => !p.divisionId && !p.departmentId);

    return (
      <div className="space-y-3">
        {/* School root node */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white text-center shadow-md">
          <Building2 className="mx-auto mb-1" size={22} />
          <p className="font-bold text-sm">วิทยาลัยเทคนิคร้อยเอ็ด</p>
          <p className="text-[11px] text-blue-100 mt-0.5">บุคลากรทั้งหมด {personnel.length} คน</p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {/* ── Divisions + WorkUnits ── */}
          {divisions.map((div) => {
            const divKey   = `div-${div.id}`;
            const isOpen   = expanded.has(divKey);
            const divWUs   = workUnits.filter((w) => w.divisionId === div.id);
            const divStaff = personnel.filter((p) => p.divisionId === div.id && !p.workUnitId);

            return (
              <div key={div.id} className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
                {/* Division header */}
                <button
                  onClick={() => toggleExpand(divKey)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-blue-50 transition-colors"
                  style={{ borderBottom: isOpen ? '1px solid #dce6f9' : 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#e8f0fe' }}>
                    <span className="text-xs font-bold" style={{ color: '#1d6ae5' }}>{div.code}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{div.name}</p>
                    <p className="text-[11px] text-gray-400">{div._count.workUnits} งาน · {div._count.users} คน</p>
                  </div>
                  {isOpen ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                           : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-2 space-y-2">
                    {/* Direct staff of division (no workUnit) */}
                    {divStaff.length > 0 && (
                      <div className="pl-2 grid grid-cols-1 gap-0.5">
                        {divStaff.map((p) => <PersonCard key={p.id} p={p} />)}
                      </div>
                    )}

                    {/* Work units */}
                    {divWUs.map((wu) => {
                      const wuKey   = `wu-${wu.id}`;
                      const isWuOpen = expanded.has(wuKey);
                      const wuStaff = personnel.filter((p) => p.workUnitId === wu.id);
                      return (
                        <div key={wu.id} className="rounded-lg border border-gray-100 overflow-hidden">
                          <button
                            onClick={() => toggleExpand(wuKey)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors bg-gray-50/50">
                            <Users size={13} className="text-gray-400 flex-shrink-0" />
                            <span className="flex-1 text-xs font-medium text-gray-700 truncate">{wu.name}</span>
                            <span className="text-[10px] text-gray-400 flex-shrink-0">{wuStaff.length} คน</span>
                            {isWuOpen ? <ChevronDown size={12} className="text-gray-400" />
                                      : <ChevronRight size={12} className="text-gray-400" />}
                          </button>
                          {isWuOpen && wuStaff.length > 0 && (
                            <div className="px-2 py-1 grid grid-cols-1 gap-0.5 bg-white">
                              {wuStaff.map((p) => <PersonCard key={p.id} p={p} />)}
                            </div>
                          )}
                          {isWuOpen && wuStaff.length === 0 && (
                            <p className="px-4 py-2 text-[11px] text-gray-400 bg-white">ยังไม่มีบุคลากร</p>
                          )}
                        </div>
                      );
                    })}

                    {divWUs.length === 0 && divStaff.length === 0 && (
                      <p className="text-xs text-gray-400 pl-2">ยังไม่มีบุคลากร</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Departments (แผนกวิชา) ── */}
        {departments.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">แผนกวิชา</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {departments.map((dept) => {
                const deptKey  = `dept-${dept.id}`;
                const isOpen   = expanded.has(deptKey);
                const deptStaff = personnel.filter((p) => p.departmentId === dept.id);
                return (
                  <div key={dept.id} className="bg-white rounded-xl border border-purple-100 overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleExpand(deptKey)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-purple-50 transition-colors"
                      style={{ borderBottom: isOpen ? '1px solid #e9d5ff' : 'none' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#f5f3ff' }}>
                        <span className="text-xs font-bold" style={{ color: '#7c3aed' }}>{dept.code}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{dept.name}</p>
                        <p className="text-[11px] text-gray-400">{dept._count.users} คน</p>
                      </div>
                      {isOpen ? <ChevronDown size={15} className="text-gray-400" />
                               : <ChevronRight size={15} className="text-gray-400" />}
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 pt-2">
                        {deptStaff.length > 0
                          ? <div className="grid grid-cols-1 gap-0.5">{deptStaff.map((p) => <PersonCard key={p.id} p={p} />)}</div>
                          : <p className="text-xs text-gray-400 pl-2">ยังไม่มีบุคลากร</p>
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <button
              onClick={() => toggleExpand('unassigned')}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              style={{ borderBottom: expanded.has('unassigned') ? '1px solid #f0f0f0' : 'none' }}>
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-600">ยังไม่ได้กำหนดสังกัด</p>
                <p className="text-[11px] text-gray-400">{unassigned.length} คน</p>
              </div>
              {expanded.has('unassigned') ? <ChevronDown size={15} className="text-gray-400" />
                                          : <ChevronRight size={15} className="text-gray-400" />}
            </button>
            {expanded.has('unassigned') && (
              <div className="px-3 pb-3 pt-2 grid grid-cols-1 gap-0.5">
                {unassigned.map((p) => <PersonCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Page ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Network size={22} /> โครงสร้างองค์กร
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">แผนผังหน่วยงานและบุคลากร</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView('tree')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'tree' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Network size={14} /> แผนผัง
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <List size={14} /> รายการ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> กำลังโหลด...
        </div>
      ) : view === 'tree' ? (
        <OrgTree />
      ) : (
        <OrgStructureManager isAdmin={isAdmin} />
      )}
    </div>
  );
}
