const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');
const { notifyRepairTicket } = require('../services/line');

const router = express.Router();
const prisma = new PrismaClient();

const intId    = (s)  => parseInt(s, 10);
const canAdmin = (u)  => u.isSuperAdmin || u.role === 'admin' || u.role === 'executive';
const canTech  = (u)  => canAdmin(u) || u.position === 'worker' || u.role === 'staff';

async function genTicketNo() {
  const now  = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end   = new Date(start.getTime() + 86400000);
  const count = await prisma.repairTicket.count({ where: { createdAt: { gte: start, lt: end } } });
  return `REPAIR-${date}-${String(count + 1).padStart(3, '0')}`;
}

const TICKET_INCLUDE = {
  reporter:  { select: { id: true, name: true, department: true, position: true } },
  equipment: { select: { id: true, code: true, name: true } },
  assignments: {
    include:  { technician: { select: { id: true, name: true } } },
    orderBy:  { assignedAt: 'desc' },
  },
};

// ─── PM (before /:id) ─────────────────────────────────────────────────────────

router.get('/pm', auth, async (req, res, next) => {
  try {
    const { status, month, technicianId } = req.query;
    const where = {};
    if (status)      where.status       = status;
    if (technicianId) where.technicianId = intId(technicianId);
    if (month) {
      const [y, m] = month.split('-').map(Number);
      where.scheduledDate = { gte: new Date(y, m-1, 1), lt: new Date(y, m, 1) };
    }
    const data = await prisma.pmSchedule.findMany({
      where,
      include: {
        equipment:  { select: { id: true, code: true, name: true, department: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    });
    res.json(success(data));
  } catch (e) { next(e); }
});

router.post('/pm', auth, async (req, res, next) => {
  try {
    if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { equipmentId, pmType, scheduledDate, technicianId, note } = req.body;
    if (!equipmentId || !pmType?.trim() || !scheduledDate) return res.status(400).json(error('กรุณากรอกข้อมูลให้ครบ'));
    const pm = await prisma.pmSchedule.create({
      data: {
        equipmentId:  intId(equipmentId),
        pmType:       pmType.trim(),
        scheduledDate: new Date(scheduledDate),
        technicianId: technicianId ? intId(technicianId) : null,
        note:         note?.trim() || null,
        status:       'scheduled',
      },
      include: {
        equipment:  { select: { id: true, code: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(success(pm, 'สร้าง PM สำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/pm/:id/done', auth, async (req, res, next) => {
  try {
    const { note } = req.body;
    const pm = await prisma.pmSchedule.update({
      where: { id: intId(req.params.id) },
      data:  { status: 'completed', completedAt: new Date(), note: note?.trim() || null },
    });
    res.json(success(pm, 'บันทึก PM เสร็จสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบ PM'));
    next(e);
  }
});

// ─── Report (before /:id) ─────────────────────────────────────────────────────

router.get('/report', auth, async (req, res, next) => {
  try {
    const { from, to, type, status } = req.query;
    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(new Date(to).setHours(23,59,59));
    }
    if (type)   where.type   = type;
    if (status) where.status = status;

    const tickets = await prisma.repairTicket.findMany({
      where,
      include: {
        reporter:    { select: { name: true } },
        assignments: { include: { technician: { select: { name: true } } }, orderBy: { assignedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const total     = tickets.length;
    const completed = tickets.filter((t) => t.status === 'completed').length;
    const totalCost = tickets.flatMap((t) => t.assignments).reduce((s, a) => s + (Number(a.cost) || 0), 0);

    // Monthly trend (last 6 months)
    const now = new Date();
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d    = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const [cnt, done] = await Promise.all([
        prisma.repairTicket.count({ where: { createdAt: { gte: d, lt: mEnd } } }),
        prisma.repairTicket.count({ where: { createdAt: { gte: d, lt: mEnd }, status: 'completed' } }),
      ]);
      trend.push({ month: `${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`, total: cnt, completed: done });
    }

    const byStatus = await prisma.repairTicket.groupBy({ by: ['status'], where, _count: true });

    res.json(success({
      total, completed, totalCost,
      trend,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      tickets:  tickets.map((t) => ({
        id: t.id, ticketNo: t.ticketNo, title: t.title, status: t.status, urgency: t.urgency,
        createdAt: t.createdAt, reporter: t.reporter.name,
        technician: t.assignments[0]?.technician.name ?? '-',
        cost: t.assignments[0]?.cost ?? 0,
      })),
    }));
  } catch (e) { next(e); }
});

// ─── KPI (before /:id) ────────────────────────────────────────────────────────

router.get('/kpi', auth, async (req, res, next) => {
  try {
    const today    = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const [pending, inProgress, critical, completedToday] = await Promise.all([
      prisma.repairTicket.count({ where: { status: 'pending' } }),
      prisma.repairTicket.count({ where: { status: { in: ['assigned','in_progress','waiting_parts'] } } }),
      prisma.repairTicket.count({ where: { urgency: 'critical', status: { notIn: ['completed','cancelled'] } } }),
      prisma.repairTicket.count({ where: { status: 'completed', updatedAt: { gte: today, lt: tomorrow } } }),
    ]);
    res.json(success({ pending, inProgress, critical, completedToday }));
  } catch (e) { next(e); }
});

// ─── Ticket List ──────────────────────────────────────────────────────────────

router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 40, status, urgency, type, search } = req.query;
    const skip  = (intId(page) - 1) * intId(limit);
    const where = {};
    if (status)  where.status  = status;
    if (urgency) where.urgency = urgency;
    if (type)    where.type    = type;
    if (search) {
      where.OR = [
        { title:    { contains: search } },
        { ticketNo: { contains: search } },
        { location: { contains: search } },
      ];
    }
    if (!canAdmin(req.user) && !canTech(req.user)) where.reporterId = req.user.id;

    const [data, total] = await Promise.all([
      prisma.repairTicket.findMany({
        where, skip, take: intId(limit),
        include:  TICKET_INCLUDE,
        orderBy:  [{ urgency: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.repairTicket.count({ where }),
    ]);
    res.json(paginate(data, total, page, limit));
  } catch (e) { next(e); }
});

// ─── Create Ticket ────────────────────────────────────────────────────────────

router.post('/', auth, async (req, res, next) => {
  try {
    const { equipmentId, type, location, urgency, title, description, image } = req.body;
    if (!type?.trim() || !location?.trim() || !title?.trim()) {
      return res.status(400).json(error('กรุณากรอก ประเภท สถานที่ และหัวข้อ'));
    }
    const ticketNo = await genTicketNo();
    const ticket = await prisma.repairTicket.create({
      data: {
        ticketNo,
        reporterId:  req.user.id,
        equipmentId: equipmentId ? intId(equipmentId) : null,
        type:        type.trim(),
        location:    location.trim(),
        urgency:     urgency || 'normal',
        title:       title.trim(),
        description: description?.trim() || '',
        image:       image || null,
        status:      'pending',
      },
      include: TICKET_INCLUDE,
    });
    notifyRepairTicket(ticket).catch(() => {});
    res.status(201).json(success(ticket, 'แจ้งซ่อมสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Get One Ticket ───────────────────────────────────────────────────────────

router.get('/:id', auth, async (req, res, next) => {
  try {
    const ticket = await prisma.repairTicket.findUnique({
      where:   { id: intId(req.params.id) },
      include: TICKET_INCLUDE,
    });
    if (!ticket) return res.status(404).json(error('ไม่พบใบแจ้งซ่อม'));
    res.json(success(ticket));
  } catch (e) { next(e); }
});

// ─── Assign ───────────────────────────────────────────────────────────────────

router.post('/:id/assign', auth, async (req, res, next) => {
  try {
    if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { technicianId, dueDate } = req.body;
    if (!technicianId) return res.status(400).json(error('กรุณาระบุช่าง'));
    const ticket = await prisma.repairTicket.findUnique({ where: { id: intId(req.params.id) } });
    if (!ticket) return res.status(404).json(error('ไม่พบใบแจ้งซ่อม'));
    await prisma.$transaction([
      prisma.repairAssignment.create({
        data: { ticketId: intId(req.params.id), technicianId: intId(technicianId), dueDate: dueDate ? new Date(dueDate) : null, status: 'assigned' },
      }),
      prisma.repairTicket.update({ where: { id: intId(req.params.id) }, data: { status: 'assigned' } }),
    ]);
    res.json(success(null, 'มอบหมายงานสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Progress ─────────────────────────────────────────────────────────────────

router.put('/:id/progress', auth, async (req, res, next) => {
  try {
    const { status, solution } = req.body;
    if (!['in_progress','waiting_parts'].includes(status)) return res.status(400).json(error('สถานะไม่ถูกต้อง'));
    const assignment = await prisma.repairAssignment.findFirst({
      where:   { ticketId: intId(req.params.id), status: { not: 'completed' } },
      orderBy: { assignedAt: 'desc' },
    });
    if (!assignment) return res.status(400).json(error('ยังไม่มีการมอบหมายงาน'));
    if (assignment.technicianId !== req.user.id && !canAdmin(req.user)) return res.status(403).json(error('ไม่มีสิทธิ์'));
    await prisma.$transaction([
      prisma.repairAssignment.update({ where: { id: assignment.id }, data: { status: 'in_progress', solution: solution || null } }),
      prisma.repairTicket.update({ where: { id: intId(req.params.id) }, data: { status } }),
    ]);
    res.json(success(null, 'อัปเดตสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Complete ─────────────────────────────────────────────────────────────────

router.put('/:id/complete', auth, async (req, res, next) => {
  try {
    const { solution, cost } = req.body;
    const assignment = await prisma.repairAssignment.findFirst({
      where:   { ticketId: intId(req.params.id), status: { not: 'completed' } },
      orderBy: { assignedAt: 'desc' },
    });
    if (!assignment) return res.status(400).json(error('ยังไม่มีการมอบหมายงาน'));
    if (assignment.technicianId !== req.user.id && !canAdmin(req.user)) return res.status(403).json(error('ไม่มีสิทธิ์'));
    await prisma.$transaction([
      prisma.repairAssignment.update({ where: { id: assignment.id }, data: { status: 'completed', solution: solution || null, cost: cost ? String(cost) : null, completedAt: new Date() } }),
      prisma.repairTicket.update({ where: { id: intId(req.params.id) }, data: { status: 'completed' } }),
    ]);
    res.json(success(null, 'ปิดงานสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Cancel ───────────────────────────────────────────────────────────────────

router.put('/:id/cancel', auth, async (req, res, next) => {
  try {
    if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    await prisma.repairTicket.update({ where: { id: intId(req.params.id) }, data: { status: 'cancelled' } });
    res.json(success(null, 'ยกเลิกสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบใบแจ้งซ่อม'));
    next(e);
  }
});

// ─── Delete (reporter + pending only, or admin) ────────────────────────────────

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const ticket = await prisma.repairTicket.findUnique({ where: { id: intId(req.params.id) } });
    if (!ticket) return res.status(404).json(error('ไม่พบใบแจ้งซ่อม'));

    const isReporter = ticket.reporterId === req.user.id;
    const isAdmin    = canAdmin(req.user);

    if (!isReporter && !isAdmin) return res.status(403).json(error('ไม่มีสิทธิ์'));

    // reporter can only delete if still pending (not yet assigned)
    if (isReporter && !isAdmin && ticket.status !== 'pending') {
      return res.status(400).json(error('ลบได้เฉพาะรายการที่ยังไม่ได้รับมอบหมาย'));
    }

    await prisma.repairTicket.delete({ where: { id: intId(req.params.id) } });
    res.json(success(null, 'ลบสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบใบแจ้งซ่อม'));
    next(e);
  }
});

module.exports = router;
