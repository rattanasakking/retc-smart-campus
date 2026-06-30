const express = require('express');
const bcrypt  = require('bcrypt');
const fs      = require('fs');
const path    = require('path');
const { PrismaClient } = require('@prisma/client');
const auth    = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');
const { sendLeaveRequestFlex, sendLeaveStatusNotify } = require('../services/line');

const router = express.Router();
const prisma  = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────
const intOrNull = (v) => (v !== undefined && v !== '' && v !== null) ? parseInt(v, 10) : null;

function saveLeaveDoc(base64) {
  const data  = base64.replace(/^data:[\w/+-]+;base64,/, '');
  const match = base64.match(/^data:([\w/+-]+);base64,/);
  const mime  = match?.[1] ?? 'image/jpeg';
  const ext   = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const name  = `leave_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'leave');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/leave/${name}`;
}

function handleLeaveAttachment(attachments) {
  if (!attachments) return null;
  if (typeof attachments === 'string' && attachments.startsWith('data:')) return saveLeaveDoc(attachments);
  return attachments || null;
}

function saveAvatarBase64(base64) {
  const data  = base64.replace(/^data:[\w/+-]+;base64,/, '');
  const match = base64.match(/^data:([\w/+-]+);base64,/);
  const mime  = match?.[1] ?? 'image/jpeg';
  const ext   = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const name  = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/avatars/${name}`;
}

async function hasPersonnelPermission(userId) {
  const perm = await prisma.modulePermission.findFirst({
    where: { userId, module: 'PERSONNEL' },
  });
  return !!perm;
}

async function requireSuperAdmin(req, res, next) {
  if (req.user.isSuperAdmin || req.user.role === 'admin') return next();
  if (await hasPersonnelPermission(req.user.id)) return next();
  return res.status(403).json(error('เฉพาะผู้ดูแลระบบหรือผู้มีสิทธิ์โมดูลบุคลากรเท่านั้น'));
}

async function requireApprover(req, res, next) {
  if (['admin', 'executive'].includes(req.user.role) || req.user.isSuperAdmin) return next();
  if (await hasPersonnelPermission(req.user.id)) return next();
  return res.status(403).json(error('ไม่มีสิทธิ์อนุมัติ'));
}

/** นับวันทำงาน (ไม่รวมเสาร์-อาทิตย์) */
function calcWorkdays(start, end, isHalfDay = false) {
  if (isHalfDay) return 0.5;
  let count = 0;
  const cur  = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur <= endD) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** ค้นหาผู้บังคับบัญชาระดับ 1 (หัวหน้างาน/ฝ่าย) สำหรับส่ง LINE แจ้ง */
async function findApproverForUser(user) {
  return prisma.user.findFirst({
    where: {
      role: { in: ['admin', 'executive'] },
      isActive: true,
      lineUserId: { not: null },
    },
    orderBy: { id: 'asc' },
  });
}

const PERSONNEL_SELECT = {
  id: true, nationalId: true, name: true, email: true, phone: true,
  role: true, position: true, isSuperAdmin: true, isActive: true,
  department: true, nickname: true, birthDate: true, startDate: true,
  avatar: true,
  personnelTypeId: true, employmentType: true, educationLevel: true,
  emergencyContact: true, emergencyPhone: true, address: true,
  lineUserId: true,
  personnelType: { select: { id: true, name: true } },
  division:  { select: { id: true, name: true, code: true } },
  workUnit:  { select: { id: true, name: true, code: true } },
  deptGroup: { select: { id: true, name: true, code: true } },
  divisionId: true, workUnitId: true, departmentId: true,
  createdAt: true,
};

// ═════════════════════════════════════════════════════════════════════════════
// PERSONNEL TYPES
// ═════════════════════════════════════════════════════════════════════════════

router.get('/types', auth, async (req, res) => {
  try {
    const types = await prisma.personnelType.findMany({
      where: req.query.active === 'true' ? { isActive: true } : {},
      orderBy: { id: 'asc' },
    });
    res.json(success(types));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.post('/types', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, leaveQuota } = req.body;
    if (!name) return res.status(400).json(error('กรุณาระบุชื่อประเภทบุคลากร'));
    const t = await prisma.personnelType.create({ data: { name, description, leaveQuota } });
    res.status(201).json(success(t, 'เพิ่มประเภทบุคลากรสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อประเภทนี้มีอยู่แล้ว'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.put('/types/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, description, leaveQuota, isActive } = req.body;
    const t = await prisma.personnelType.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(leaveQuota  !== undefined && { leaveQuota }),
        ...(isActive    !== undefined && { isActive }),
      },
    });
    res.json(success(t, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบประเภทบุคลากร'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.delete('/types/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usedBy = await prisma.user.count({ where: { personnelTypeId: id } });
    if (usedBy > 0) return res.status(409).json(error(`มีบุคลากรใช้ประเภทนี้อยู่ ${usedBy} คน ไม่สามารถลบได้`));
    await prisma.personnelType.delete({ where: { id } });
    res.json(success(null, 'ลบสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบประเภทบุคลากร'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// LEAVE TYPES
// ═════════════════════════════════════════════════════════════════════════════

router.get('/leave-types', auth, async (req, res) => {
  try {
    const hasPermission = req.user.isSuperAdmin || req.user.role === 'admin' || await hasPersonnelPermission(req.user.id);
    const showAll = req.query.all === 'true' && hasPermission;
    const types = await prisma.leaveType.findMany({
      where: showAll ? {} : { isActive: true },
      orderBy: { id: 'asc' },
    });
    res.json(success(types));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.post('/leave-types', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, icon, maxDaysPerYear, requireDocument, requireApprovalLevel, allowHalfDay } = req.body;
    if (!name) return res.status(400).json(error('กรุณาระบุชื่อประเภทการลา'));
    const t = await prisma.leaveType.create({
      data: { name, icon, maxDaysPerYear: maxDaysPerYear ? parseFloat(maxDaysPerYear) : null,
              requireDocument: !!requireDocument, requireApprovalLevel: requireApprovalLevel || 1,
              allowHalfDay: allowHalfDay !== false },
    });
    res.status(201).json(success(t, 'เพิ่มประเภทการลาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อประเภทนี้มีอยู่แล้ว'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.put('/leave-types/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const { name, icon, maxDaysPerYear, requireDocument, requireApprovalLevel, allowHalfDay, isActive } = req.body;
    const t = await prisma.leaveType.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name                !== undefined && { name }),
        ...(icon                !== undefined && { icon }),
        ...(maxDaysPerYear      !== undefined && { maxDaysPerYear: maxDaysPerYear ? parseFloat(maxDaysPerYear) : null }),
        ...(requireDocument     !== undefined && { requireDocument: !!requireDocument }),
        ...(requireApprovalLevel!== undefined && { requireApprovalLevel }),
        ...(allowHalfDay        !== undefined && { allowHalfDay: !!allowHalfDay }),
        ...(isActive            !== undefined && { isActive }),
      },
    });
    res.json(success(t, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบประเภทการลา'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// LEAVE REQUESTS  (must be defined BEFORE /:id to avoid route shadowing)
// ═════════════════════════════════════════════════════════════════════════════

const LEAVE_INCLUDE = {
  user:      { select: { id: true, name: true, email: true, department: true, avatar: true, lineUserId: true, notifyByLine: true } },
  leaveType: true,
  substitute:{ select: { id: true, name: true } },
  approvals: {
    include: {
      approver: { select: { id: true, name: true, position: true, avatar: true } },
    },
    orderBy: { level: 'asc' },
  },
};

router.get('/leaves/pending-approvals', auth, requireApprover, async (req, res) => {
  try {
    const requests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: LEAVE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(success(requests));
  } catch (e) {
    console.error('[GET /leaves/pending-approvals]', e.message);
    if (e.code === 'P2021') return res.json(success([]));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.get('/leaves/report', auth, requireApprover, async (req, res) => {
  try {
    const { year, month, departmentId, leaveTypeId } = req.query;
    const where = {
      status: { not: 'CANCELLED' },
      ...(leaveTypeId && { leaveTypeId: parseInt(leaveTypeId) }),
    };
    if (year || month) {
      const y = year ? parseInt(year) - 543 : new Date().getFullYear();
      if (month) {
        const m = parseInt(month) - 1;
        where.startDate = { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59) };
      } else {
        where.startDate = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
      }
    }
    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        user:      { select: { id: true, name: true, department: true, personnelType: { select: { name: true } } } },
        leaveType: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { startDate: 'desc' },
    });
    const byType = {};
    const byPerson = {};
    for (const r of requests) {
      if (departmentId && r.user.department !== departmentId) continue;
      const lt = r.leaveType.name;
      const pName = r.user.name;
      byType[lt]   = (byType[lt]   || 0) + r.totalDays;
      if (!byPerson[pName]) byPerson[pName] = { user: r.user, total: 0, byType: {} };
      byPerson[pName].total += r.totalDays;
      byPerson[pName].byType[lt] = (byPerson[pName].byType[lt] || 0) + r.totalDays;
    }
    res.json(success({
      requests,
      summary: {
        totalRequests: requests.length,
        totalDays:     requests.reduce((s, r) => s + r.totalDays, 0),
        byType,
        byPerson: Object.values(byPerson),
      },
    }));
  } catch (e) {
    console.error('[GET /leaves/report]', e.message);
    if (e.code === 'P2021') return res.json(success({ requests: [], summary: { totalRequests: 0, totalDays: 0, byType: {}, byPerson: [] } }));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.get('/leaves', auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;
    const isApprover = req.user.isSuperAdmin || ['admin', 'executive'].includes(req.user.role) || await hasPersonnelPermission(req.user.id);
    const targetUserId = req.query.userId && isApprover ? parseInt(req.query.userId) : req.user.id;
    const where = {
      userId: targetUserId,
      ...(req.query.status && { status: req.query.status }),
    };
    if (req.query.year) {
      const y = parseInt(req.query.year) - 543;
      where.startDate = { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
    }
    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({ where, include: LEAVE_INCLUDE, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.leaveRequest.count({ where }),
    ]);
    res.json(paginate(requests, total, page, limit));
  } catch (e) {
    console.error('[GET /leaves]', e.message);
    if (e.code === 'P2021') return res.json(paginate([], 0, 1, 20));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.post('/leaves', auth, async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, isHalfDay, halfDayPeriod, reason, attachments, substituteId } = req.body;
    if (!leaveTypeId || !startDate || !reason) return res.status(400).json(error('กรุณากรอกข้อมูลให้ครบ'));
    const leaveType = await prisma.leaveType.findUnique({ where: { id: parseInt(leaveTypeId) } });
    if (!leaveType) return res.status(404).json(error('ไม่พบประเภทการลา'));
    const sDate = new Date(startDate);
    const eDate = isHalfDay ? new Date(startDate) : new Date(endDate || startDate);
    const totalDays = calcWorkdays(sDate, eDate, !!isHalfDay);
    if (totalDays <= 0) return res.status(400).json(error('วันลาต้องมากกว่า 0 วัน'));
    if (leaveType.maxDaysPerYear) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      const year = currentYear?.year ?? new Date().getFullYear() + 543;
      const bal = await prisma.leaveBalance.findUnique({
        where: { userId_leaveTypeId_year: { userId: req.user.id, leaveTypeId: parseInt(leaveTypeId), year } },
      });
      const used = bal?.used ?? 0;
      const quota = bal?.quota ?? leaveType.maxDaysPerYear;
      if (used + totalDays > quota) {
        return res.status(400).json(error(`วันลาคงเหลือไม่เพียงพอ (คงเหลือ ${quota - used} วัน)`));
      }
    }
    const attachmentUrl = handleLeaveAttachment(attachments);
    const request = await prisma.leaveRequest.create({
      data: {
        userId: req.user.id, leaveTypeId: parseInt(leaveTypeId),
        startDate: sDate, endDate: eDate, totalDays,
        isHalfDay: !!isHalfDay, halfDayPeriod: halfDayPeriod || 'เต็มวัน',
        reason, attachments: attachmentUrl,
        substituteId: substituteId ? parseInt(substituteId) : null,
        approvals: { create: { approverId: req.user.id, level: 1 } },
      },
      include: LEAVE_INCLUDE,
    });
    try {
      const approver = await findApproverForUser(req.user);
      if (approver?.lineUserId) {
        await prisma.leaveApproval.updateMany({ where: { requestId: request.id }, data: { approverId: approver.id } });
        await sendLeaveRequestFlex(approver.lineUserId, { ...request, user: await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, department: true } }) });
      }
    } catch (lineErr) { console.warn('[Leave] LINE notify failed:', lineErr.message); }
    res.status(201).json(success(request, 'ยื่นคำขอลาสำเร็จ'));
  } catch (e) { console.error('[POST /leaves]', e); res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.get('/leaves/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = await prisma.leaveRequest.findUnique({ where: { id }, include: LEAVE_INCLUDE });
    if (!request) return res.status(404).json(error('ไม่พบคำขอลา'));
    const canView = request.userId === req.user.id || req.user.isSuperAdmin
      || ['admin', 'executive'].includes(req.user.role)
      || await hasPersonnelPermission(req.user.id);
    if (!canView) return res.status(403).json(error('ไม่มีสิทธิ์เข้าถึง'));
    res.json(success(request));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.delete('/leaves/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json(error('ไม่พบคำขอลา'));
    if (request.userId !== req.user.id) return res.status(403).json(error('ไม่ใช่คำขอของคุณ'));
    if (request.status !== 'PENDING') return res.status(400).json(error('ลบได้เฉพาะคำขอที่รออนุมัติเท่านั้น'));
    await prisma.leaveApproval.deleteMany({ where: { requestId: id } });
    await prisma.leaveRequest.delete({ where: { id } });
    res.json(success(null, 'ลบคำขอลาสำเร็จ'));
  } catch (e) { console.error('[DELETE /leaves/:id]', e); res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.put('/leaves/:id/cancel', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const request = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json(error('ไม่พบคำขอลา'));
    if (request.userId !== req.user.id) return res.status(403).json(error('ไม่ใช่คำขอของคุณ'));
    if (request.status !== 'PENDING') return res.status(400).json(error('ยกเลิกได้เฉพาะคำขอที่รออนุมัติเท่านั้น'));
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' }, include: LEAVE_INCLUDE });
    res.json(success(updated, 'ยกเลิกคำขอลาสำเร็จ'));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.put('/leaves/:id/approve', auth, requireApprover, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { leaveType: true, user: true, approvals: true } });
    if (!request) return res.status(404).json(error('ไม่พบคำขอลา'));
    if (request.status !== 'PENDING') return res.status(400).json(error('คำขอนี้ไม่อยู่ในสถานะรออนุมัติ'));
    await prisma.leaveApproval.updateMany({
      where: { requestId: id, status: 'PENDING' },
      data: { status: 'APPROVED', comment, approverId: req.user.id },
    });
    let newStatus = 'APPROVED';
    if (request.leaveType.requireApprovalLevel >= 2) {
      const level1Done = request.approvals.some((a) => a.level === 1);
      if (!level1Done) {
        newStatus = 'PENDING';
        const director = await prisma.user.findFirst({ where: { position: 'director', isActive: true } });
        if (director) {
          await prisma.leaveApproval.create({ data: { requestId: id, approverId: director.id, level: 2 } });
          if (director.lineUserId) { await sendLeaveRequestFlex(director.lineUserId, request).catch(() => {}); }
        }
      }
    }
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: newStatus }, include: LEAVE_INCLUDE });
    if (newStatus === 'APPROVED' && request.leaveType.maxDaysPerYear) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      const year = currentYear?.year ?? new Date().getFullYear() + 543;
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: request.userId, leaveTypeId: request.leaveTypeId, year } },
        update: { used: { increment: request.totalDays } },
        create: { userId: request.userId, leaveTypeId: request.leaveTypeId, year, quota: request.leaveType.maxDaysPerYear, used: request.totalDays },
      });
    }
    if (request.user.lineUserId && request.user.notifyByLine !== false) { sendLeaveStatusNotify(request.user.lineUserId, request, 'APPROVED', comment).catch(() => {}); }
    res.json(success(updated, 'อนุมัติคำขอลาสำเร็จ'));
  } catch (e) { console.error('[approve]', e); res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.put('/leaves/:id/reject', auth, requireApprover, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { comment } = req.body;
    if (!comment) return res.status(400).json(error('กรุณาระบุเหตุผลที่ไม่อนุมัติ'));
    const request = await prisma.leaveRequest.findUnique({ where: { id }, include: { user: true } });
    if (!request) return res.status(404).json(error('ไม่พบคำขอลา'));
    if (request.status !== 'PENDING') return res.status(400).json(error('คำขอนี้ไม่อยู่ในสถานะรออนุมัติ'));
    await prisma.leaveApproval.updateMany({
      where: { requestId: id, status: 'PENDING' },
      data: { status: 'REJECTED', comment, approverId: req.user.id },
    });
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: 'REJECTED' }, include: LEAVE_INCLUDE });
    if (request.user.lineUserId && request.user.notifyByLine !== false) { sendLeaveStatusNotify(request.user.lineUserId, request, 'REJECTED', comment).catch(() => {}); }
    res.json(success(updated, 'ปฏิเสธคำขอลาสำเร็จ'));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

// ═════════════════════════════════════════════════════════════════════════════
// PERSONNEL (USERS)  — /:id routes MUST come after all /leaves/* routes
// ═════════════════════════════════════════════════════════════════════════════

router.get('/', auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const where = {
      ...(req.query.search && {
        OR: [
          { name:       { contains: req.query.search } },
          { email:      { contains: req.query.search } },
          { nationalId: { contains: req.query.search } },
          { nationalId: { contains: req.query.search } },
          { phone:      { contains: req.query.search } },
        ],
      }),
      ...(req.query.personnelTypeId && { personnelTypeId: intOrNull(req.query.personnelTypeId) }),
      ...(req.query.role            && { role:             req.query.role }),
      ...(req.query.divisionId      && { divisionId:       intOrNull(req.query.divisionId) }),
      ...(req.query.workUnitId      && { workUnitId:       intOrNull(req.query.workUnitId) }),
      ...(req.query.departmentId    && { departmentId:     intOrNull(req.query.departmentId) }),
      ...(req.query.isActive !== undefined && req.query.isActive !== '' && {
        isActive: req.query.isActive === 'true',
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: PERSONNEL_SELECT, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);

    res.json(paginate(users, total, page, limit));
  } catch (e) { console.error('[GET /personnel]', e); res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.get('/leave-balance/:userId', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    const year = currentYear?.year ?? new Date().getFullYear() + 543;

    const [leaveTypes, balances] = await Promise.all([
      prisma.leaveType.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } }),
      prisma.leaveBalance.findMany({ where: { userId, year } }),
    ]);

    const result = leaveTypes.map((lt) => {
      const bal = balances.find((b) => b.leaveTypeId === lt.id);
      return {
        leaveType: { id: lt.id, name: lt.name, icon: lt.icon },
        quota:     bal?.quota ?? lt.maxDaysPerYear ?? 0,
        used:      bal?.used  ?? 0,
        remaining: (bal?.quota ?? lt.maxDaysPerYear ?? 0) - (bal?.used ?? 0),
      };
    });

    res.json(success({ year, balances: result }));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: PERSONNEL_SELECT });
    if (!user) return res.status(404).json(error('ไม่พบบุคลากร'));

    const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
    const year = currentYear?.year ?? new Date().getFullYear() + 543;
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: { userId: id, year },
      include: { leaveType: true },
    });

    res.json(success({ ...user, leaveBalances }));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.post('/', auth, requireSuperAdmin, async (req, res) => {
  try {
    const {
      employeeId, nationalId, name, email, password, role, position, isSuperAdmin,
      personnelTypeId, educationLevel,
      divisionId, workUnitId, departmentId,
      phone, nickname, birthDate, startDate,
      emergencyContact, emergencyPhone, address, avatar,
    } = req.body;

    if (!name || !email || !password || !role)
      return res.status(400).json(error('กรุณากรอกข้อมูลที่จำเป็น: name, email, password, role'));
    if (password.length < 8)
      return res.status(400).json(error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'));

    // Auto-generate employeeId if not provided
    let empId = employeeId?.trim() || null;
    if (!empId) {
      const last = await prisma.user.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
      empId = `EMP${String((last?.id ?? 0) + 1).padStart(3, '0')}`;
    }

    let avatarUrl = null;
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
      try { avatarUrl = saveAvatarBase64(avatar); } catch (e) { console.warn('[avatar save]', e.message); }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        employeeId:      empId,
        nationalId:      nationalId || null,
        name:            name.trim(),
        email:           email.trim().toLowerCase(),
        password:        hashed,
        role,
        position:        position || null,
        isSuperAdmin:    isSuperAdmin === true || isSuperAdmin === 'true',
        personnelTypeId: intOrNull(personnelTypeId),
        educationLevel:  educationLevel || null,
        divisionId:      intOrNull(divisionId),
        workUnitId:      intOrNull(workUnitId),
        departmentId:    intOrNull(departmentId),
        phone:           phone || null,
        nickname:        nickname || null,
        birthDate:       birthDate ? new Date(birthDate) : null,
        startDate:       startDate ? new Date(startDate) : null,
        emergencyContact: emergencyContact || null,
        emergencyPhone:  emergencyPhone || null,
        address:         address || null,
        avatar:          avatarUrl,
      },
      select: PERSONNEL_SELECT,
    });

    res.status(201).json(success(user, 'เพิ่มบุคลากรสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('อีเมลหรือเลขบัตรประชาชนนี้มีในระบบแล้ว'));
    console.error('[POST /personnel]', e);
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.put('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      nationalId, name, email, role, position, isSuperAdmin,
      personnelTypeId, educationLevel,
      divisionId, workUnitId, departmentId,
      phone, nickname, birthDate, startDate,
      emergencyContact, emergencyPhone, address, avatar,
    } = req.body;

    let avatarUrl;
    if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
      try { avatarUrl = saveAvatarBase64(avatar); } catch (e) { console.warn('[avatar save]', e.message); }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(nationalId       !== undefined && { nationalId: nationalId || null }),
        ...(name             !== undefined && { name: name.trim() }),
        ...(email            !== undefined && { email: email.trim().toLowerCase() }),
        ...(role             !== undefined && { role }),
        ...(position         !== undefined && { position: position || null }),
        ...(isSuperAdmin     !== undefined && { isSuperAdmin: isSuperAdmin === true || isSuperAdmin === 'true' }),
        ...(personnelTypeId  !== undefined && { personnelTypeId: intOrNull(personnelTypeId) }),
        ...(educationLevel   !== undefined && { educationLevel }),
        ...(divisionId       !== undefined && { divisionId: intOrNull(divisionId) }),
        ...(workUnitId       !== undefined && { workUnitId: intOrNull(workUnitId) }),
        ...(departmentId     !== undefined && { departmentId: intOrNull(departmentId) }),
        ...(phone            !== undefined && { phone }),
        ...(nickname         !== undefined && { nickname }),
        ...(birthDate        !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(startDate        !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(emergencyContact !== undefined && { emergencyContact }),
        ...(emergencyPhone   !== undefined && { emergencyPhone }),
        ...(address          !== undefined && { address }),
        ...(avatarUrl        !== undefined && { avatar: avatarUrl }),
      },
      select: PERSONNEL_SELECT,
    });

    res.json(success(user, 'แก้ไขข้อมูลสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบบุคลากร'));
    if (e.code === 'P2002') return res.status(409).json(error('อีเมลหรือเลขบัตรประชาชนนี้มีในระบบแล้ว'));
    console.error('[PUT /personnel/:id]', e.code ?? e.constructor?.name, e.message);
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.delete('/:id', auth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json(error('ID ไม่ถูกต้อง'));

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!user) return res.status(404).json(error('ไม่พบบุคลากร'));

    await prisma.user.delete({ where: { id } });
    res.json(success(null, `ลบบุคลากร "${user.name}" สำเร็จ`));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบบุคลากร'));
    if (e.code === 'P2003') return res.status(409).json(error('ไม่สามารถลบได้ เนื่องจากมีข้อมูลที่เชื่อมโยงในระบบ (ใบลา / งานซ่อม / บันทึกงาน)'));
    console.error('[DELETE /personnel/:id]', e.code ?? e.constructor?.name, e.message);
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

router.put('/:id/toggle', auth, requireSuperAdmin, async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id }, select: { isActive: true } });
    if (!user) return res.status(404).json(error('ไม่พบบุคลากร'));
    const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive }, select: { id: true, isActive: true } });
    res.json(success(updated, updated.isActive ? 'เปิดใช้งานสำเร็จ' : 'ปิดใช้งานสำเร็จ'));
  } catch (e) { res.status(500).json(error('เกิดข้อผิดพลาด')); }
});

router.put('/:id/reset-password', auth, requireSuperAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json(error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'));
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json(success(null, 'รีเซ็ตรหัสผ่านสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบบุคลากร'));
    res.status(500).json(error('เกิดข้อผิดพลาด'));
  }
});

module.exports = router;
