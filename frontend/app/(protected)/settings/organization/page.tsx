'use client';
import { useEffect, useState } from 'react';
import { USER_KEY } from '@/lib/api';
import OrgStructureManager from '@/components/organization/OrgStructureManager';

export default function OrganizationPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const p = JSON.parse(u);
      setIsAdmin(p.isSuperAdmin || p.role === 'admin');
    }
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1a2744' }}>โครงสร้างองค์กร</h1>
        <p className="text-xs mt-0.5" style={{ color: '#374151' }}>จัดการฝ่าย งาน และแผนกวิชา</p>
      </div>
      <OrgStructureManager isAdmin={isAdmin} />
    </div>
  );
}
