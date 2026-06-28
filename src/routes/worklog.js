const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/response');
const { notify } = require('../services/line');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const intId = (s) => parseInt(s, 10);

const APPROVER_POSITIONS = [
  'director', 'deputy_director', 'division_chief',
  'work_unit_chief', 'department_chief',
];

function canApprove(user) {
  return user.isSuperAdmin
    || user.role === 'admin'
    || user.role === 'executive'
    || APPROVER_POSITIONS.includes(user.position);
}

function saveAttachments(items) {
  const dir = path.join(__dirname, '..', '..', 'uploads', 'worklog');
  fs.mkdirSync(dir, { recursive: true });
  return items.map((item) => {
    if (!item) return null;
    if (item.startsWith('/uploads/')) return item;
    const b64  = item.replace(/^data:image\/\w+;base64,/, '');
    const match = item.match(/^data:image\/(\w+);/);
    const ext  = match ? `.${match[1]}` : '.jpg';
    const name = `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64'));
    return `/uploads/worklog/${name}`;
  }).filter(Boolean);
}

async function notifyWorkLog(log, type, approverName = '', comment = '') {
  const MONTH_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dt      = new Date(log.logDate);
  const dateStr = `${dt.getDate()} ${MONTH_TH[dt.getMonth()]} ${dt.getFullYear() + 543}`;

  let msg;
  if (type === 'submit') {
    msg = [
      '\n📋 บันทึกปฏิบัติงาน',
      '━━━━━━━━━━━━━━',
      `👤 ผู้บันทึก: ${log.user?.name ?? '-'}`,
      `📅 วันที่: ${dateStr}`,
      `🏷️ ประเภท: ${log.workType?.name ?? '-'}`,
      `📝 หัวข้อ: ${log.title}`,
      '━━━━━━━━━━━━━━',
      '👉 กรุณาตรวจสอบและอนุมัติ',
      `🔗 https://app.retc.ac.th/worklog/${log.id}`,
    ].join('\n');
  } else if (type === 'approve') {
    msg = [
      '\n✅ บันทึกปฏิบัติงานได้รับอนุมัติ',
      `📝 หัวข้อ: ${log.title}`,
      `👤 อนุมัติโดย: ${approverName}`,
      comment ? `💬 ความเห็น: ${comment}` : null,
      `🔗 https://app.retc.ac.th/worklog/${log.id}`,
    ].filter(Boolean).join('\n');
  } else if (type === 'return') {
    msg = [
      '\n🔄 บันทึกปฏิบัติงานถูกส่งคืน',
      `📝 หัวข้อ: ${log.title}`,
      `👤 ส่งคืนโดย: ${approverName}`,
      comment ? `💬 เหตุผล: ${comment}` : null,
      `🔗 https://app.retc.ac.th/worklog/${log.id}`,
    ].filter(Boolean).join('\n');
  }
  if (msg) await notify(msg).catch(() => {});
}

const WORK_LOG_INCLUDE = {
  workType:  { select: { id: true, name: true, color: true, category: true } },
  approvals: {
    include: { approver: { select: { id: true, name: true, position: true } } },
    orderBy: { createdAt: 'asc' },
  },
};

// ─── WorkTypes ────────────────────────────────────────────────────────────────

// GET /api/worklog/types
router.get('/types', auth, async (req, res, next) => {
  try {
    const all = req.query.all === 'true';
    const types = await prisma.workType.findMany({
      where:   all ? {} : { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(success(types));
  } catch (e) { next(e); }
});

// POST /api/worklog/types
router.post('/types', auth, async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin && req.user.role !== 'admin') {
      return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    }
    const { name, category, color } = req.body;
    if (!name?.trim() || !category?.trim() || !color?.trim()) {
      return res.status(400).json(error('กรุณากรอก name, category, color'));
    }
    const t = await prisma.workType.create({
      data: { name: name.trim(), category: category.trim(), color: color.trim() },
    });
    res.status(201).json(success(t, 'เพิ่มประเภทงานสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อประเภทงานซ้ำ'));
    next(e);
  }
});

// PUT /api/worklog/types/:id
router.put('/types/:id', auth, async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin && req.user.role !== 'admin') {
      return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    }
    const { name, category, color, isActive } = req.body;
    const t = await prisma.workType.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(name     !== undefined && { name:     name.trim() }),
        ...(category !== undefined && { category: category.trim() }),
        ...(color    !== undefined && { color:    color.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(success(t, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบประเภทงาน'));
    next(e);
  }
});

// DELETE /api/worklog/types/:id
router.delete('/types/:id', auth, async (req, res, next) => {
  try {
    if (!req.user.isSuperAdmin && req.user.role !== 'admin') {
      return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    }
    const id    = intId(req.params.id);
    const count = await prisma.workLog.count({ where: { workTypeId: id } });
    if (count > 0) {
      return res.status(400).json(error(`มีบันทึกใช้อยู่ ${count} รายการ ไม่สามารถลบได้`));
    }
    await prisma.workType.delete({ where: { id } });
    res.json(success(null, 'ลบสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบประเภทงาน'));
    next(e);
  }
});

// ─── Pending Approvals ────────────────────────────────────────────────────────

// GET /api/worklog/pending-approvals
router.get('/pending-approvals', auth, async (req, res, next) => {
  try {
    if (!canApprove(req.user)) return res.json(success([]));

    let userIdFilter = null;
    if (!req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'executive') {
      const subWhere = { isActive: true, id: { not: req.user.id } };
      if      (req.user.workUnitId)   subWhere.workUnitId   = req.user.workUnitId;
      else if (req.user.departmentId) subWhere.departmentId = req.user.departmentId;
      else if (req.user.divisionId)   subWhere.divisionId   = req.user.divisionId;
      const subs = await prisma.user.findMany({ where: subWhere, select: { id: true } });
      userIdFilter = { in: subs.map((s) => s.id) };
    }

    const logs = await prisma.workLog.findMany({
      where: {
        status: 'submitted',
        ...(userIdFilter ? { userId: userIdFilter } : {}),
      },
      include: {
        user:     { select: { id: true, name: true, employeeId: true, position: true } },
        workType: { select: { id: true, name: true, color: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
    });

    res.json(success(logs.map((l) => ({
      ...l,
      attachments: l.attachments ? JSON.parse(l.attachments) : [],
    }))));
  } catch (e) { next(e); }
});

// ─── My PDF ──────────────────────────────────────────────────────────────────

// GET /api/worklog/my-pdf?month=&year=  — logs ของตัวเองสำหรับสร้าง PDF
router.get('/my-pdf', auth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const y = year  ? parseInt(year,  10) - 543 : new Date().getFullYear();
    const m = month ? parseInt(month, 10) - 1   : new Date().getMonth();
    const where = {
      userId: req.user.id,
      logDate: { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0) },
    };
    const [logs, user] = await Promise.all([
      prisma.workLog.findMany({
        where,
        include: {
          workType: { select: { name: true, color: true, category: true } },
          approvals: {
            include: { approver: { select: { name: true, position: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { logDate: 'asc' },
      }),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          name: true, position: true, employeeId: true, nationalId: true,
          division:      { select: { name: true } },
          workUnit:      { select: { name: true } },
          deptGroup:     { select: { name: true } },
          personnelType: { select: { name: true } },
        },
      }),
    ]);
    res.json(success({
      user,
      logs: logs.map((l) => ({ ...l, attachments: l.attachments ? JSON.parse(l.attachments) : [] })),
      month: parseInt(month || String(new Date().getMonth() + 1), 10),
      year:  y + 543,
    }));
  } catch (e) { next(e); }
});

// ─── Report ───────────────────────────────────────────────────────────────────

// GET /api/worklog/report?period=month&month=&year=&workTypeId=&status=&divisionId=&workUnitId=
router.get('/report', auth, async (req, res, next) => {
  try {
    const { period = 'month', month, year, workTypeId, status, divisionId, workUnitId } = req.query;

    const now = new Date();
    const y   = year  ? intId(year)  - 543 : now.getFullYear();
    const m   = month ? intId(month) - 1   : now.getMonth();

    const where = {};
    if (period === 'week') {
      const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0);
      const e = new Date(s); e.setDate(s.getDate() + 6);
      where.logDate = { gte: s, lte: e };
    } else if (period === 'month') {
      where.logDate = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0) };
    } else if (period === 'year') {
      where.logDate = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };
    }
    if (workTypeId) where.workTypeId = intId(workTypeId);
    if (status)     where.status     = status;

    // Org scope
    if (workUnitId || divisionId) {
      const uWhere = { isActive: true };
      if (workUnitId) uWhere.workUnitId = intId(workUnitId);
      else            uWhere.divisionId = intId(divisionId);
      const users = await prisma.user.findMany({ where: uWhere, select: { id: true } });
      where.userId = { in: users.map((u) => u.id) };
    } else if (!req.user.isSuperAdmin && req.user.role !== 'admin' && req.user.role !== 'executive') {
      where.userId = req.user.id;
    }

    const logs = await prisma.workLog.findMany({
      where,
      include: {
        user:     { select: { id: true, name: true, employeeId: true, position: true } },
        workType: { select: { name: true, color: true } },
      },
      orderBy: { logDate: 'desc' },
    });

    const userMap     = new Map();
    const typeCount   = new Map();

    for (const l of logs) {
      if (!userMap.has(l.userId)) {
        userMap.set(l.userId, { user: l.user, total: 0, approved: 0, submitted: 0, returned: 0, draft: 0 });
      }
      const u = userMap.get(l.userId);
      u.total++;
      u[l.status] = (u[l.status] ?? 0) + 1;
      const wt = l.workType?.name ?? 'ไม่ระบุ';
      typeCount.set(wt, (typeCount.get(wt) ?? 0) + 1);
    }

    res.json(success({
      total:      logs.length,
      approved:   logs.filter((l) => l.status === 'approved').length,
      submitted:  logs.filter((l) => l.status === 'submitted').length,
      returned:   logs.filter((l) => l.status === 'returned').length,
      byUser:     Array.from(userMap.values())
        .map((u) => ({ ...u, rate: u.total > 0 ? Math.round((u.approved / u.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total),
      byWorkType: Array.from(typeCount.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
    }));
  } catch (e) { next(e); }
});

// GET /api/worklog/monthly-chart?year=2568
router.get('/monthly-chart', auth, async (req, res, next) => {
  try {
    const { year } = req.query;
    const ceYear = year ? intId(year) - 543 : new Date().getFullYear();

    const canSeeAll = req.user.isSuperAdmin || ['admin', 'executive'].includes(req.user.role);
    const where = {
      logDate: { gte: new Date(ceYear, 0, 1), lte: new Date(ceYear, 11, 31, 23, 59, 59) },
    };
    if (!canSeeAll) where.userId = req.user.id;

    const logs = await prisma.workLog.findMany({
      where, select: { logDate: true, status: true },
    });

    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      total: 0, approved: 0, submitted: 0, draft: 0, returned: 0, rejected: 0,
    }));

    for (const l of logs) {
      const m = new Date(l.logDate).getMonth(); // 0-based
      months[m].total++;
      if (months[m][l.status] !== undefined) months[m][l.status]++;
    }

    res.json(success(months));
  } catch (e) { next(e); }
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// GET /api/worklog
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, month, year, status, userId: qUserId } = req.query;
    const skip = (intId(page) - 1) * intId(limit);

    // ── Visibility ────────────────────────────────────────────────────────────
    const canSeeAll = req.user.isSuperAdmin || ['admin', 'executive'].includes(req.user.role);
    const isDeptHead = req.user.departmentId
      && ['department_chief', 'division_chief', 'work_unit_chief'].includes(req.user.position);

    const where = {};
    if (canSeeAll) {
      if (qUserId) where.userId = intId(qUserId);
    } else if (isDeptHead) {
      const deptUsers = await prisma.user.findMany({
        where: { departmentId: req.user.departmentId, isActive: true },
        select: { id: true },
      });
      where.userId = { in: deptUsers.map((u) => u.id) };
    } else {
      where.userId = req.user.id;
    }

    if (status) where.status = status;
    if (month || year) {
      const y = year  ? intId(year)  - 543 : new Date().getFullYear();
      const m = month ? intId(month) - 1   : new Date().getMonth();
      where.logDate = month
        ? { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0) }
        : { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) };
    }

    // Summary always based on same visibility scope (no status filter)
    const summaryWhere = { ...where };
    delete summaryWhere.status;

    const [logs, total, summary] = await Promise.all([
      prisma.workLog.findMany({
        where, skip, take: intId(limit), orderBy: { logDate: 'desc' },
        include: {
          ...WORK_LOG_INCLUDE,
          user: { select: { id: true, name: true, department: true } },
        },
      }),
      prisma.workLog.count({ where }),
      prisma.workLog.groupBy({ by: ['status'], where: summaryWhere, _count: true }),
    ]);

    res.json(success({
      logs: logs.map((l) => ({ ...l, attachments: l.attachments ? JSON.parse(l.attachments) : [] })),
      total, page: intId(page), limit: intId(limit),
      summary: Object.fromEntries(summary.map((s) => [s.status, s._count])),
    }));
  } catch (e) { next(e); }
});

// POST /api/worklog
router.post('/', auth, async (req, res, next) => {
  try {
    const { logDate, workTypeId, title, detail, startTime, endTime, gpsLat, gpsLng, attachments } = req.body;
    if (!logDate || !workTypeId || !title?.trim()) {
      return res.status(400).json(error('กรุณากรอก logDate, workTypeId, title'));
    }
    const paths = attachments?.length ? saveAttachments(attachments) : [];
    const log = await prisma.workLog.create({
      data: {
        userId:      req.user.id, workTypeId: intId(workTypeId),
        logDate:     new Date(logDate), title: title.trim(),
        detail:      detail?.trim() || null, startTime: startTime || null,
        endTime:     endTime || null, gpsLat: gpsLat || null, gpsLng: gpsLng || null,
        attachments: paths.length ? JSON.stringify(paths) : null, status: 'draft',
      },
      include: WORK_LOG_INCLUDE,
    });
    res.status(201).json(success({ ...log, attachments: paths }, 'สร้างบันทึกสำเร็จ'));
  } catch (e) { next(e); }
});

// GET /api/worklog/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const log = await prisma.workLog.findUnique({
      where:   { id: intId(req.params.id) },
      include: {
        ...WORK_LOG_INCLUDE,
        user: { select: { id: true, name: true, employeeId: true, position: true } },
      },
    });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    if (log.userId !== req.user.id && !canApprove(req.user)) {
      return res.status(403).json(error('ไม่มีสิทธิ์'));
    }
    res.json(success({ ...log, attachments: log.attachments ? JSON.parse(log.attachments) : [] }));
  } catch (e) { next(e); }
});

// PUT /api/worklog/:id
router.put('/:id', auth, async (req, res, next) => {
  try {
    const log = await prisma.workLog.findUnique({ where: { id: intId(req.params.id) } });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    if (log.userId !== req.user.id) return res.status(403).json(error('ไม่มีสิทธิ์'));
    if (log.status === 'approved') {
      return res.status(400).json(error('ไม่สามารถแก้ไขบันทึกที่อนุมัติแล้ว'));
    }
    const { logDate, workTypeId, title, detail, startTime, endTime, gpsLat, gpsLng, attachments } = req.body;
    const paths = attachments !== undefined ? saveAttachments(attachments ?? []) : undefined;
    const updated = await prisma.workLog.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(logDate    && { logDate:    new Date(logDate) }),
        ...(workTypeId && { workTypeId: intId(workTypeId) }),
        ...(title      && { title:      title.trim() }),
        ...(detail     !== undefined && { detail:    detail?.trim() || null }),
        ...(startTime  !== undefined && { startTime: startTime || null }),
        ...(endTime    !== undefined && { endTime:   endTime   || null }),
        ...(gpsLat     !== undefined && { gpsLat:    gpsLat    || null }),
        ...(gpsLng     !== undefined && { gpsLng:    gpsLng    || null }),
        ...(paths      !== undefined && { attachments: paths.length ? JSON.stringify(paths) : null }),
      },
      include: WORK_LOG_INCLUDE,
    });
    res.json(success({ ...updated, attachments: updated.attachments ? JSON.parse(updated.attachments) : [] }, 'แก้ไขสำเร็จ'));
  } catch (e) { next(e); }
});

// DELETE /api/worklog/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const log = await prisma.workLog.findUnique({ where: { id: intId(req.params.id) } });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    const isOwner = log.userId === req.user.id;
    const isAdmin = req.user.isSuperAdmin || req.user.role === 'admin';
    if (!isOwner && !isAdmin) return res.status(403).json(error('ไม่มีสิทธิ์'));
    if (log.status === 'approved') return res.status(400).json(error('ไม่สามารถลบบันทึกที่อนุมัติแล้ว'));
    await prisma.workLog.delete({ where: { id: intId(req.params.id) } });
    res.json(success(null, 'ลบสำเร็จ'));
  } catch (e) { next(e); }
});

// POST /api/worklog/:id/submit
router.post('/:id/submit', auth, async (req, res, next) => {
  try {
    const log = await prisma.workLog.findUnique({
      where:   { id: intId(req.params.id) },
      include: { user: true, workType: true },
    });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    if (log.userId !== req.user.id) return res.status(403).json(error('ไม่มีสิทธิ์'));
    if (!['draft', 'returned'].includes(log.status)) {
      return res.status(400).json(error('ส่งได้เฉพาะ ร่าง / ส่งคืน'));
    }
    const updated = await prisma.workLog.update({
      where: { id: intId(req.params.id) }, data: { status: 'submitted' },
    });
    await notifyWorkLog({ ...log, id: intId(req.params.id) }, 'submit');
    res.json(success(updated, 'ส่งขออนุมัติสำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/worklog/:id/approve
router.put('/:id/approve', auth, async (req, res, next) => {
  try {
    if (!canApprove(req.user)) return res.status(403).json(error('ต้องการสิทธิ์อนุมัติ'));
    const { comment } = req.body;
    const log = await prisma.workLog.findUnique({ where: { id: intId(req.params.id) } });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    if (log.status !== 'submitted') return res.status(400).json(error('อนุมัติได้เฉพาะ รออนุมัติ'));
    await prisma.$transaction([
      prisma.workLog.update({ where: { id: intId(req.params.id) }, data: { status: 'approved' } }),
      prisma.workLogApproval.create({
        data: { logId: intId(req.params.id), approverId: req.user.id, status: 'approved', comment: comment || null },
      }),
    ]);
    await notifyWorkLog(log, 'approve', req.user.name, comment);
    res.json(success(null, 'อนุมัติสำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/worklog/:id/return
router.put('/:id/return', auth, async (req, res, next) => {
  try {
    if (!canApprove(req.user)) return res.status(403).json(error('ต้องการสิทธิ์อนุมัติ'));
    const { comment } = req.body;
    if (!comment?.trim()) return res.status(400).json(error('กรุณาระบุเหตุผลการส่งคืน'));
    const log = await prisma.workLog.findUnique({ where: { id: intId(req.params.id) } });
    if (!log) return res.status(404).json(error('ไม่พบบันทึก'));
    if (log.status !== 'submitted') return res.status(400).json(error('ส่งคืนได้เฉพาะ รออนุมัติ'));
    await prisma.$transaction([
      prisma.workLog.update({ where: { id: intId(req.params.id) }, data: { status: 'returned' } }),
      prisma.workLogApproval.create({
        data: { logId: intId(req.params.id), approverId: req.user.id, status: 'returned', comment: comment.trim() },
      }),
    ]);
    await notifyWorkLog(log, 'return', req.user.name, comment);
    res.json(success(null, 'ส่งคืนสำเร็จ'));
  } catch (e) { next(e); }
});

module.exports = router;
