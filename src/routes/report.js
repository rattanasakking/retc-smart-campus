const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

const THAI_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

async function safe(label, fn, fallback = 0) {
  try { return await fn(); }
  catch (err) {
    console.error(`[report/${label}]`, (err.message || '').split('\n')[0]);
    return fallback;
  }
}

/** ปรับ date range จาก query params */
function getRange(query) {
  if (query.startDate && query.endDate) {
    const end = new Date(query.endDate);
    end.setHours(23, 59, 59, 999);
    return { start: new Date(query.startDate), end };
  }
  const year = parseInt(query.year || new Date().getFullYear(), 10);
  if (query.semester === '1') {
    return { start: new Date(year, 4, 1), end: new Date(year, 9, 31, 23, 59, 59) };
  }
  if (query.semester === '2') {
    return { start: new Date(year, 10, 1), end: new Date(year + 1, 3, 30, 23, 59, 59) };
  }
  if (query.month) {
    const m = parseInt(query.month, 10) - 1;
    return { start: new Date(year, m, 1), end: new Date(year, m + 1, 0, 23, 59, 59) };
  }
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/report/overview
// Query: year, semester, month, startDate, endDate
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', auth, async (req, res) => {
  try {
    const { start, end } = getRange(req.query);
    const trendYear      = parseInt(req.query.year || new Date().getFullYear(), 10);
    const catRange       = { gte: start, lte: end };
    const dutyRange      = { gte: start, lte: end };  // for dutyDate (Date field)

    // ── DUTY ──────────────────────────────────────────────────────────────────
    const [dutyTotal, dutyPresent, dutyAbsent, dutyByDeptRaw] = await Promise.all([
      safe('duty.total',   () => prisma.dutySchedule.count({ where: { dutyDate: dutyRange } })),
      safe('duty.present', () => prisma.dutyLog.count({ where: { schedule: { dutyDate: dutyRange }, status: 'PRESENT' } })),
      safe('duty.absent',  () => prisma.dutyLog.count({ where: { schedule: { dutyDate: dutyRange }, status: 'ABSENT' } })),
      safe('duty.byDept',  () => prisma.dutySchedule.groupBy({
        by: ['departmentName'],
        where: { dutyDate: dutyRange },
        _count: { _all: true },
      }), []),
    ]);
    const dutyByDept = dutyByDeptRaw
      .map(d => ({ name: d.departmentName || 'ไม่ระบุ', count: d._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── WORKLOG ───────────────────────────────────────────────────────────────
    const [wlTotal, wlApproved, wlPending, wlByTypeRaw] = await Promise.all([
      safe('wl.total',    () => prisma.workLog.count({ where: { logDate: dutyRange } })),
      safe('wl.approved', () => prisma.workLog.count({ where: { logDate: dutyRange, status: 'approved' } })),
      safe('wl.pending',  () => prisma.workLog.count({ where: { logDate: dutyRange, status: { in: ['draft', 'submitted'] } } })),
      safe('wl.byType',   () => prisma.workLog.groupBy({
        by: ['workTypeId'],
        where: { logDate: dutyRange },
        _count: { _all: true },
      }), []),
    ]);
    let wlByType = [];
    if (wlByTypeRaw.length > 0) {
      const typeIds  = wlByTypeRaw.map(w => w.workTypeId).filter(Boolean);
      const wlTypes  = typeIds.length > 0
        ? await safe('wl.types', () => prisma.workType.findMany({ where: { id: { in: typeIds } }, select: { id: true, name: true } }), [])
        : [];
      wlByType = wlByTypeRaw
        .map(w => ({ name: wlTypes.find(t => t.id === w.workTypeId)?.name ?? 'ไม่ระบุ', count: w._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    // ── EQUIPMENT ─────────────────────────────────────────────────────────────
    const [eqTotal, eqActive, eqDamaged, eqDisposed, eqBorrowed] = await Promise.all([
      safe('eq.total',    () => prisma.equipment.count()),
      safe('eq.active',   () => prisma.equipment.count({ where: { status: 'active' } })),
      safe('eq.damaged',  () => prisma.equipment.count({ where: { status: 'damaged' } })),
      safe('eq.disposed', () => prisma.equipment.count({ where: { status: 'disposed' } })),
      safe('eq.borrowed', () => prisma.equipment.count({ where: { status: 'borrowed' } })),
    ]);

    // ── HELPDESK ──────────────────────────────────────────────────────────────
    const [hdTotal, hdCompleted, hdPending, hdCancelled, hdByTypeRaw, hdTickets, hdTrend] = await Promise.all([
      safe('hd.total',     () => prisma.repairTicket.count({ where: { createdAt: catRange } })),
      safe('hd.completed', () => prisma.repairTicket.count({ where: { createdAt: catRange, status: 'completed' } })),
      safe('hd.pending',   () => prisma.repairTicket.count({ where: { createdAt: catRange, status: { in: ['pending','assigned','in_progress','waiting_parts'] } } })),
      safe('hd.cancelled', () => prisma.repairTicket.count({ where: { createdAt: catRange, status: 'cancelled' } })),
      safe('hd.byType',    () => prisma.repairTicket.groupBy({
        by: ['type'],
        where: { createdAt: catRange },
        _count: { _all: true },
      }), []),
      safe('hd.tickets',   () => prisma.repairTicket.findMany({
        where: { createdAt: catRange, status: 'completed' },
        select: { createdAt: true, assignments: { select: { completedAt: true, cost: true }, where: { status: 'completed' } } },
      }), []),
      Promise.all(THAI_MONTHS.map(async (m, i) => {
        const count = await safe(`hd.trend.${i}`, () => prisma.repairTicket.count({
          where: { createdAt: { gte: new Date(trendYear, i, 1), lt: new Date(trendYear, i + 1, 1) } },
        }));
        return { month: m, count };
      })),
    ]);

    const hdByType = hdByTypeRaw
      .map(h => ({ name: h.type || 'ไม่ระบุ', count: h._count._all }))
      .sort((a, b) => b.count - a.count);

    let totalDays = 0, daysCount = 0, hdTotalCost = 0;
    for (const t of hdTickets) {
      for (const a of t.assignments) {
        hdTotalCost += Number(a.cost ?? 0);
        if (a.completedAt) {
          totalDays += (new Date(a.completedAt) - new Date(t.createdAt)) / 86_400_000;
          daysCount++;
        }
      }
    }
    const hdAvgDays = daysCount > 0 ? parseFloat((totalDays / daysCount).toFixed(1)) : 0;

    // ── ROOM ──────────────────────────────────────────────────────────────────
    const [rmTotal, rmApproved, rmGroupRaw, rmForHours, rmInfos] = await Promise.all([
      safe('rm.total',    () => prisma.roomBooking.count({ where: { startTime: catRange } })),
      safe('rm.approved', () => prisma.roomBooking.count({ where: { startTime: catRange, status: 'approved' } })),
      safe('rm.byRoom',   () => prisma.roomBooking.groupBy({
        by: ['roomId'],
        where: { startTime: catRange, status: 'approved' },
        _count: { _all: true },
      }), []),
      safe('rm.hours',    () => prisma.roomBooking.findMany({
        where: { startTime: catRange, status: 'approved' },
        select: { startTime: true, endTime: true },
      }), []),
      safe('rm.infos',    () => prisma.room.findMany({ select: { id: true, name: true } }), []),
    ]);

    const rmTotalHours = parseFloat(
      rmForHours.reduce((s, b) => s + (new Date(b.endTime) - new Date(b.startTime)) / 3_600_000, 0).toFixed(1)
    );
    const rmByRoom = rmGroupRaw
      .map(r => ({ name: rmInfos.find(rm => rm.id === r.roomId)?.name ?? 'ไม่ระบุ', count: r._count._all }))
      .sort((a, b) => b.count - a.count);

    // ── LOST FOUND ────────────────────────────────────────────────────────────
    const [lfTotal, lfClaimed] = await Promise.all([
      safe('lf.total',   () => prisma.lostFoundItem.count({ where: { createdAt: catRange } })),
      safe('lf.claimed', () => prisma.lostFoundItem.count({ where: { createdAt: catRange, status: 'claimed' } })),
    ]);

    res.json(success({
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      duty:      { total: dutyTotal, present: dutyPresent, absent: dutyAbsent, byDept: dutyByDept },
      worklog:   { total: wlTotal, approved: wlApproved, pending: wlPending, byType: wlByType },
      equipment: { total: eqTotal, active: eqActive, damaged: eqDamaged, disposed: eqDisposed, borrowed: eqBorrowed },
      helpdesk:  { total: hdTotal, completed: hdCompleted, pending: hdPending, cancelled: hdCancelled, avgDays: hdAvgDays, totalCost: hdTotalCost, byType: hdByType, trend: hdTrend },
      room:      { totalBookings: rmTotal, approved: rmApproved, totalHours: rmTotalHours, byRoom: rmByRoom },
      lostfound: { total: lfTotal, claimed: lfClaimed, unclaimed: lfTotal - lfClaimed },
    }));
  } catch (err) {
    console.error('[report/overview] UNHANDLED:', err.message);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

module.exports = router;
