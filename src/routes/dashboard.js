const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

// ─── safe query helper ────────────────────────────────────────────────────────
// ล็อก error จริงเสมอ แต่ return fallback แทน throw
// เหมาะสำหรับ query ที่อาจล้มเหลวเมื่อ table ว่างหรือ schema ยังไม่ sync
async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    const code = err.code ?? err.constructor?.name ?? 'ERR';
    // ใช้ split เพื่อตัด stack trace ออก แต่ยังเห็น message จริง
    console.error(`[dashboard/${label}] ${code}: ${(err.message ?? '').split('\n')[0]}`);
    return fallback;
  }
}

const s0  = (label, fn) => safe(label, fn, 0);
const sa  = (label, fn) => safe(label, fn, []);

// ─── GET /api/dashboard/ping ──────────────────────────────────────────────────
// ทดสอบว่า router mount ถูกต้อง (ไม่ต้อง auth)
router.get('/ping', (_req, res) => {
  res.json({ ok: true, route: 'dashboard', ts: new Date().toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/summary
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', auth, async (req, res, next) => {
  try {
    // ── วันเวลา ──────────────────────────────────────────────────────────────
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86_400_000);

    const OPEN_REPAIR = ['pending', 'assigned', 'in_progress', 'waiting_parts'];

    // ═════════════════════════════════════════════════════════════════════════
    // BATCH 1 — KPI counts  (ทั้งหมด parallel)
    // ═════════════════════════════════════════════════════════════════════════
    const [
      totalEquipment,
      openRepairs,
      pendingPM,
      criticalRepairs,
      todayDuty,
      todayBookings,
      todayWorkLogs,
      unclaimedLostFound,
      totalPersonnel,
      pendingLeaves,
      dutyLoggedSchedules,
    ] = await Promise.all([

      // ครุภัณฑ์ทั้งหมด (ยกเว้น disposed)
      s0('kpi.totalEquipment', () =>
        prisma.equipment.count({ where: { status: { not: 'disposed' } } })
      ),

      // แจ้งซ่อมค้างอยู่ (ยังไม่ completed / cancelled)
      s0('kpi.openRepairs', () =>
        prisma.repairTicket.count({ where: { status: { in: OPEN_REPAIR } } })
      ),

      // PM ที่ยังรอดำเนินการ (scheduled เท่านั้น)
      s0('kpi.pendingPM', () =>
        prisma.pmSchedule.count({ where: { status: 'scheduled' } })
      ),

      // งานซ่อมวิกฤต (critical + ยังค้าง)
      s0('kpi.criticalRepairs', () =>
        prisma.repairTicket.count({
          where: { urgency: 'critical', status: { in: OPEN_REPAIR } },
        })
      ),

      // ตารางเวรวันนี้ (นับจำนวน schedule ไม่ใช่ assignment)
      s0('kpi.todayDuty', () =>
        prisma.dutySchedule.count({
          where: { dutyDate: { gte: today, lt: tomorrow } },
        })
      ),

      // จองห้องวันนี้ที่อนุมัติแล้ว
      s0('kpi.todayBookings', () =>
        prisma.roomBooking.count({
          where: { startTime: { gte: today, lt: tomorrow }, status: 'approved' },
        })
      ),

      // บันทึกงานวันนี้
      s0('kpi.todayWorkLogs', () =>
        prisma.workLog.count({ where: { logDate: { gte: today, lt: tomorrow } } })
      ),

      // ของได้ที่ยังไม่มีเจ้าของมารับ (status = found)
      s0('kpi.unclaimedLostFound', () =>
        prisma.lostFoundItem.count({ where: { status: 'found' } })
      ),

      // บุคลากรทั้งหมด — นับเหมือนกับ GET /personnel (ไม่กรอง isActive)
      s0('kpi.totalPersonnel', () =>
        prisma.user.count()
      ),

      // ใบลารออนุมัติ (ทั้งระบบ)
      s0('kpi.pendingLeaves', () =>
        prisma.leaveRequest.count({ where: { status: 'PENDING' } })
      ),

      // เวรวันนี้ที่บันทึกแล้ว (มี DutyLog อย่างน้อย 1 รายการ)
      s0('kpi.dutyLoggedSchedules', () =>
        prisma.dutySchedule.count({
          where: {
            dutyDate: { gte: today, lt: tomorrow },
            logs: { some: {} },
          },
        })
      ),
    ]);

    // ═════════════════════════════════════════════════════════════════════════
    // BATCH 2 — ข้อมูลรายการ  (ทั้งหมด parallel)
    // ═════════════════════════════════════════════════════════════════════════
    const [
      rawRepairGroups,
      rawCatCounts,
      rawDutySchedules,
      rawBookingList,
      rawAlertRepairs,
      rawAlertLostFound,
      rawTrend,
      rawPersonnelTypes,
    ] = await Promise.all([

      // repairByStatus — groupBy
      sa('repairByStatus', () =>
        prisma.repairTicket.groupBy({
          by: ['status'],
          _count: { id: true },
        })
      ),

      // equipmentByCategory — category พร้อม count
      sa('equipmentByCategory', () =>
        prisma.equipmentCategory.findMany({
          where:  { isActive: true },
          select: { name: true, _count: { select: { equipments: true } } },
        })
      ),

      // today duty list — พร้อม assignments
      sa('todayDutyList', () =>
        prisma.dutySchedule.findMany({
          where:   { dutyDate: { gte: today, lt: tomorrow } },
          orderBy: { shiftType: 'asc' },
          select: {
            id: true, title: true, location: true, shiftType: true,
            assignments: {
              select: {
                status: true,
                teacher: { select: { name: true } },
              },
            },
          },
        })
      ),

      // today booking list
      sa('todayBookingList', () =>
        prisma.roomBooking.findMany({
          where: {
            startTime: { gte: today, lt: tomorrow },
            status:    'approved',
          },
          orderBy: { startTime: 'asc' },
          select: {
            id: true, title: true, startTime: true, endTime: true, status: true,
            room: { select: { name: true } },
          },
        })
      ),

      // alert source 1 — urgent/critical repairs
      sa('alerts.repairs', () =>
        prisma.repairTicket.findMany({
          where:   { urgency: { in: ['urgent', 'critical'] }, status: { in: OPEN_REPAIR } },
          take:    5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, ticketNo: true, title: true,
            urgency: true, location: true, createdAt: true,
            reporter: { select: { name: true } },
          },
        })
      ),

      // alert source 2 — ของได้ที่ยังไม่มีเจ้าของ (recent 5)
      sa('alerts.lostFound', () =>
        prisma.lostFoundItem.findMany({
          where:   { status: 'found' },
          take:    5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, title: true, foundLocation: true,
            createdAt: true,
            reporter: { select: { name: true } },
          },
        })
      ),

      // repair trend 6 เดือน — 6 count queries parallel ใน sub-array
      Promise.all(
        Array.from({ length: 6 }, async (_, i) => {
          const d     = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          const start = new Date(d.getFullYear(), d.getMonth(),     1);
          const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const count = await s0(`trend.${i}`, () =>
            prisma.repairTicket.count({ where: { createdAt: { gte: start, lt: end } } })
          );
          return { month: THAI_MONTHS[d.getMonth()], count };
        })
      ),

      // บุคลากรตามประเภท — groupBy users จาก user table (reliable กว่า _count select)
      sa('personnelByType', async () => {
        const [types, grouped] = await Promise.all([
          prisma.personnelType.findMany({
            where:   { isActive: true },
            select:  { id: true, name: true },
            orderBy: { name: 'asc' },
          }),
          prisma.user.groupBy({
            by:    ['personnelTypeId'],
            _count: { id: true },
            where: { personnelTypeId: { not: null } },
          }),
        ]);
        const countMap = new Map(grouped.map((g) => [g.personnelTypeId, g._count.id]));
        return types.map((t) => ({ name: t.name, count: countMap.get(t.id) ?? 0 }));
      }),
    ]);

    // ═════════════════════════════════════════════════════════════════════════
    // TRANSFORM — แปลงผลลัพธ์เป็น shape ที่ต้องการ
    // ═════════════════════════════════════════════════════════════════════════

    // repairByStatus → object { pending, assigned, in_progress, waiting_parts, completed, cancelled }
    const repairByStatus = {
      pending: 0, assigned: 0, in_progress: 0,
      waiting_parts: 0, completed: 0, cancelled: 0,
    };
    for (const g of rawRepairGroups) {
      if (g.status in repairByStatus) {
        repairByStatus[g.status] = g._count.id;
      }
    }

    // equipmentByCategory → [{ name, count }] top 6 เรียงมากสุดก่อน
    const equipmentByCategory = rawCatCounts
      .map((c) => ({ name: c.name, count: c._count.equipments }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // todayDutyList → [{ teacherName, location, shiftType, status }]
    const todayDutyList = rawDutySchedules.flatMap((s) =>
      s.assignments.length > 0
        ? s.assignments.map((a) => ({
            teacherName: a.teacher.name,
            location:    s.location,
            shiftType:   s.shiftType,
            status:      a.status,
          }))
        : [{
            teacherName: 'ยังไม่มอบหมาย',
            location:    s.location,
            shiftType:   s.shiftType,
            status:      'unassigned',
          }]
    );

    // todayBookingList → [{ roomName, title, startTime, endTime, status }]
    const todayBookingList = rawBookingList.map((b) => ({
      roomName:  b.room?.name ?? '-',
      title:     b.title,
      startTime: b.startTime,
      endTime:   b.endTime,
      status:    b.status,
    }));

    // recentAlerts → รวม repair alerts + lostFound alerts → เรียงตาม time → top 5
    const recentAlerts = [
      ...rawAlertRepairs.map((r) => ({
        type:     'repair',
        title:    r.title,
        subtitle: `${r.ticketNo} · ${r.location}`,
        urgency:  r.urgency,
        time:     r.createdAt,
        reporter: r.reporter?.name ?? '-',
      })),
      ...rawAlertLostFound.map((l) => ({
        type:     'lostfound',
        title:    l.title,
        subtitle: l.foundLocation ?? 'ไม่ระบุสถานที่',
        urgency:  'normal',
        time:     l.createdAt,
        reporter: l.reporter?.name ?? '-',
      })),
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 5);

    // repairTrend — rawTrend ได้จาก Promise.all ด้านบน
    const repairTrend = rawTrend;

    // personnelByType — query คืน [{ name, count }] ตรงๆ แล้ว เพิ่ม "ไม่ระบุ" ถ้ามี
    const personnelByType = rawPersonnelTypes.filter((t) => t.count > 0);
    const typedCount = personnelByType.reduce((s, t) => s + t.count, 0);
    if (totalPersonnel - typedCount > 0) {
      personnelByType.push({ name: 'ไม่ระบุประเภท', count: totalPersonnel - typedCount });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ═════════════════════════════════════════════════════════════════════════
    res.json(success({
      kpi: {
        totalEquipment,
        openRepairs,
        pendingPM,
        criticalRepairs,
        todayDuty,
        todayBookings,
        todayWorkLogs,
        unclaimedLostFound,
        totalPersonnel,
        pendingLeaves,
        dutyLoggedSchedules,
      },
      recentAlerts,
      repairTrend,
      repairByStatus,
      equipmentByCategory,
      todayDutyList,
      todayBookingList,
      personnelByType,
    }));

  } catch (err) {
    // error ระดับ route (ไม่ใช่ query) — log stack trace เต็มๆ
    console.error(`[dashboard/summary] UNHANDLED: ${err.message}`);
    console.error(err.stack);
    next(err);
  }
});

// ── backward-compat ───────────────────────────────────────────────────────────
router.get('/', auth, (_req, res) => {
  res.redirect(307, '/api/dashboard/summary');
});

module.exports = router;
