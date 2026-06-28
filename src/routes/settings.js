const express = require('express');
const bcrypt  = require('bcrypt');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Super Admin middleware ────────────────────────────────────────────────────
// ตรวจสอบจาก DB เสมอ (ไม่ใช่จาก token) เพื่อให้ revoke ได้ทันที
const superAdmin = [
  auth,
  async (req, res, next) => {
    try {
      const u = await prisma.user.findUnique({
        where:  { id: req.user.id },
        select: { isSuperAdmin: true, isActive: true },
      });
      if (!u?.isSuperAdmin || !u?.isActive) {
        return res.status(403).json(error('ต้องการสิทธิ์ Super Admin'));
      }
      next();
    } catch (e) { next(e); }
  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
const intId = (s) => parseInt(s, 10);

// ═══════════════════════════════════════════════════════════════════════════════
// ฝ่าย (Divisions)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings/divisions
router.get('/divisions', auth, async (req, res, next) => {
  try {
    const rows = await prisma.division.findMany({
      orderBy: { id: 'asc' },
      include: { _count: { select: { workUnits: true, users: true } } },
    });
    res.json(success(rows));
  } catch (e) { next(e); }
});

// POST /api/settings/divisions
router.post('/divisions', superAdmin, async (req, res, next) => {
  try {
    const { name, code, isActive = true } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณากรอกชื่อฝ่าย'));
    if (!code?.trim()) return res.status(400).json(error('กรุณากรอกรหัสฝ่าย'));

    const row = await prisma.division.create({
      data: { name: name.trim(), code: code.trim().toUpperCase(), isActive },
      include: { _count: { select: { workUnits: true, users: true } } },
    });
    res.status(201).json(success(row, 'เพิ่มฝ่ายสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหรือรหัสฝ่ายซ้ำกับที่มีอยู่แล้ว'));
    next(e);
  }
});

// PUT /api/settings/divisions/:id
router.put('/divisions/:id', superAdmin, async (req, res, next) => {
  try {
    const { name, code, isActive } = req.body;
    const row = await prisma.division.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(name     !== undefined && { name: name.trim() }),
        ...(code     !== undefined && { code: code.trim().toUpperCase() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { _count: { select: { workUnits: true, users: true } } },
    });
    res.json(success(row, 'แก้ไขฝ่ายสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบฝ่ายที่ต้องการแก้ไข'));
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหรือรหัสฝ่ายซ้ำ'));
    next(e);
  }
});

// DELETE /api/settings/divisions/:id
router.delete('/divisions/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const wuCount = await prisma.workUnit.count({ where: { divisionId: id } });
    if (wuCount > 0) {
      return res.status(400).json(error(`มีงานสังกัดอยู่ ${wuCount} งาน ไม่สามารถลบได้`));
    }
    const userCount = await prisma.user.count({ where: { divisionId: id } });
    if (userCount > 0) {
      return res.status(400).json(error(`มีผู้ใช้สังกัดอยู่ ${userCount} คน ไม่สามารถลบได้`));
    }
    await prisma.division.delete({ where: { id } });
    res.json(success(null, 'ลบฝ่ายสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบฝ่ายที่ต้องการลบ'));
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// งาน (Work Units)
// ═══════════════════════════════════════════════════════════════════════════════

const HEAD_SELECT = { id: true, name: true, position: true, employeeId: true };

const DEPUTIES_INCLUDE = { deputies: { include: { user: { select: HEAD_SELECT } } } };

// GET /api/settings/workunits?divisionId=
router.get('/workunits', auth, async (req, res, next) => {
  try {
    const where = req.query.divisionId
      ? { divisionId: intId(req.query.divisionId) }
      : {};
    const rows = await prisma.workUnit.findMany({
      where,
      orderBy: [{ divisionId: 'asc' }, { id: 'asc' }],
      include: {
        division: { select: { id: true, name: true, code: true } },
        head:     { select: HEAD_SELECT },
        ...DEPUTIES_INCLUDE,
        _count:   { select: { users: true } },
      },
    });
    res.json(success(rows));
  } catch (e) { next(e); }
});

// POST /api/settings/workunits
router.post('/workunits', superAdmin, async (req, res, next) => {
  try {
    const { name, code, divisionId, isActive = true } = req.body;
    if (!name?.trim())  return res.status(400).json(error('กรุณากรอกชื่องาน'));
    if (!code?.trim())  return res.status(400).json(error('กรุณากรอกรหัสงาน'));
    if (!divisionId)    return res.status(400).json(error('กรุณาเลือกฝ่าย'));

    const row = await prisma.workUnit.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        divisionId: intId(divisionId),
        isActive,
      },
      include: {
        division: { select: { id: true, name: true, code: true } },
        _count:   { select: { users: true } },
      },
    });
    res.status(201).json(success(row, 'เพิ่มงานสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('รหัสงานซ้ำกับที่มีอยู่แล้ว'));
    if (e.code === 'P2003') return res.status(400).json(error('ไม่พบฝ่ายที่เลือก'));
    next(e);
  }
});

// PUT /api/settings/workunits/:id
router.put('/workunits/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const { name, code, divisionId, isActive, headId, deputyIds } = req.body;

    if (name !== undefined) {
      const old = await prisma.workUnit.findUnique({ where: { id }, select: { name: true } });
      if (old && old.name !== name.trim()) {
        await prisma.user.updateMany({ where: { workUnitId: id }, data: { department: name.trim() } });
      }
    }

    const [row] = await prisma.$transaction([
      prisma.workUnit.update({
        where: { id },
        data: {
          ...(name       !== undefined && { name: name.trim() }),
          ...(code       !== undefined && { code: code.trim().toUpperCase() }),
          ...(divisionId !== undefined && { divisionId: intId(divisionId) }),
          ...(isActive   !== undefined && { isActive }),
          ...(headId     !== undefined && { headId: headId ? intId(headId) : null }),
          ...(Array.isArray(deputyIds) && {
            deputies: {
              deleteMany: {},
              create: deputyIds.filter(Boolean).map((uid) => ({ userId: intId(uid) })),
            },
          }),
        },
        include: {
          division: { select: { id: true, name: true, code: true } },
          head:     { select: HEAD_SELECT },
          ...DEPUTIES_INCLUDE,
          _count:   { select: { users: true } },
        },
      }),
    ]);
    res.json(success(row, 'แก้ไขงานสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบงานที่ต้องการแก้ไข'));
    if (e.code === 'P2002') return res.status(409).json(error('รหัสงานซ้ำ'));
    next(e);
  }
});

// DELETE /api/settings/workunits/:id
router.delete('/workunits/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const userCount = await prisma.user.count({ where: { workUnitId: id } });
    if (userCount > 0) {
      return res.status(400).json(error(`มีผู้ใช้สังกัดอยู่ ${userCount} คน ไม่สามารถลบได้`));
    }
    await prisma.workUnit.delete({ where: { id } });
    res.json(success(null, 'ลบงานสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบงานที่ต้องการลบ'));
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// แผนกวิชา (Departments)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings/departments
router.get('/departments', auth, async (req, res, next) => {
  try {
    const rows = await prisma.department.findMany({
      orderBy: { id: 'asc' },
      include: {
        head: { select: HEAD_SELECT },
        deputies: { include: { user: { select: HEAD_SELECT } } },
        _count: { select: { users: true } },
      },
    });
    res.json(success(rows));
  } catch (e) { next(e); }
});

// POST /api/settings/departments
router.post('/departments', superAdmin, async (req, res, next) => {
  try {
    const { name, code, isActive = true } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณากรอกชื่อแผนกวิชา'));
    if (!code?.trim()) return res.status(400).json(error('กรุณากรอกรหัสแผนกวิชา'));

    const row = await prisma.department.create({
      data: { name: name.trim(), code: code.trim().toUpperCase(), isActive },
      include: { _count: { select: { users: true } } },
    });
    res.status(201).json(success(row, 'เพิ่มแผนกวิชาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหรือรหัสแผนกซ้ำกับที่มีอยู่แล้ว'));
    next(e);
  }
});

// PUT /api/settings/departments/:id
router.put('/departments/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const { name, code, isActive, headId, deputyIds } = req.body;

    // Cascade: update user.department string for all users in this department
    if (name !== undefined) {
      const old = await prisma.department.findUnique({ where: { id }, select: { name: true } });
      if (old && old.name !== name.trim()) {
        await prisma.user.updateMany({
          where: { departmentId: id },
          data:  { department: name.trim() },
        });
        // Also update DutySchedule.departmentName
        await prisma.dutySchedule.updateMany({
          where: { departmentId: id },
          data:  { departmentName: name.trim() },
        });
      }
    }
    const [row] = await prisma.$transaction([
      prisma.department.update({
        where: { id },
        data: {
          ...(name     !== undefined && { name: name.trim() }),
          ...(code     !== undefined && { code: code.trim().toUpperCase() }),
          ...(isActive !== undefined && { isActive }),
          ...(headId   !== undefined && { headId: headId ? intId(headId) : null }),
          ...(Array.isArray(deputyIds) && {
            deputies: {
              deleteMany: {},
              create: deputyIds.filter(Boolean).map((uid) => ({ userId: intId(uid) })),
            },
          }),
        },
        include: {
          head:     { select: HEAD_SELECT },
          deputies: { include: { user: { select: HEAD_SELECT } } },
          _count:   { select: { users: true } },
        },
      }),
    ]);
    res.json(success(row, 'แก้ไขแผนกวิชาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบแผนกวิชาที่ต้องการแก้ไข'));
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหรือรหัสแผนกซ้ำ'));
    next(e);
  }
});

// DELETE /api/settings/departments/:id
router.delete('/departments/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const userCount = await prisma.user.count({ where: { departmentId: id } });
    if (userCount > 0) {
      return res.status(400).json(error(`มีผู้ใช้สังกัดอยู่ ${userCount} คน ไม่สามารถลบได้`));
    }
    await prisma.department.delete({ where: { id } });
    res.json(success(null, 'ลบแผนกวิชาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบแผนกวิชาที่ต้องการลบ'));
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ตั้งค่าทั่วไป (System Settings)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings/logo  — public, returns logo_url and school_name
router.get('/logo', async (_req, res, next) => {
  try {
    const rows = await prisma.systemSettings.findMany({
      where: { key: { in: ['logo_url', 'school_name', 'school_name_en'] } },
    });
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    res.json({ success: true, data: { logo_url: map.logo_url || null, school_name: map.school_name || 'RETC', school_name_en: map.school_name_en || '' } });
  } catch (e) { next(e); }
});

// GET /api/settings/general  — คืนเป็น { key: value } object
router.get('/general', auth, async (req, res, next) => {
  try {
    const rows = await prisma.systemSettings.findMany({
      orderBy: [{ group: 'asc' }, { id: 'asc' }],
    });
    const obj = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(success(obj));
  } catch (e) { next(e); }
});

// POST /api/settings/general/upload-logo (isSuperAdmin)
// Body: { imageData: 'data:image/...;base64,...', fileName: 'logo.png' }
router.post('/general/upload-logo', superAdmin, async (req, res, next) => {
  try {
    const { imageData, fileName } = req.body;
    if (!imageData) return res.status(400).json(error('ไม่พบข้อมูลรูปภาพ'));

    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const ext    = (fileName && path.extname(fileName)) || '.png';
    const name   = `logo_${Date.now()}${ext}`;
    const dir    = path.join(__dirname, '..', '..', 'uploads', 'logo');

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);

    const logo_url = `/uploads/logo/${name}`;
    await prisma.systemSettings.upsert({
      where:  { key: 'logo_url' },
      update: { value: logo_url },
      create: { key: 'logo_url', value: logo_url, group: 'general' },
    });

    res.json(success({ logo_url }, 'อัปโหลด Logo สำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/settings/general  — batch upsert, Body: { key: value, ... }
router.put('/general', superAdmin, async (req, res, next) => {
  try {
    const updates = req.body;
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json(error('Body ต้องเป็น object { key: value }'));
    }
    const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return res.status(400).json(error('ไม่มีข้อมูลที่จะอัปเดต'));

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.systemSettings.upsert({
          where:  { key },
          update: { value: String(value) },
          create: { key, value: String(value), group: 'general' },
        })
      )
    );

    const rows    = await prisma.systemSettings.findMany({ orderBy: [{ group: 'asc' }, { id: 'asc' }] });
    const obj     = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    res.json(success(obj, 'บันทึกการตั้งค่าสำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ปีการศึกษา (Academic Years)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/settings/academic-years
router.get('/academic-years', auth, async (req, res, next) => {
  try {
    const rows = await prisma.academicYear.findMany({
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });
    res.json(success(rows));
  } catch (e) { next(e); }
});

// POST /api/settings/academic-years
router.post('/academic-years', superAdmin, async (req, res, next) => {
  try {
    const { year, semester, startDate, endDate } = req.body;
    if (!year || !semester || !startDate || !endDate) {
      return res.status(400).json(error('กรุณากรอกข้อมูลให้ครบถ้วน'));
    }
    const row = await prisma.academicYear.create({
      data: {
        year:      parseInt(year, 10),
        semester:  parseInt(semester, 10),
        startDate: new Date(startDate),
        endDate:   new Date(endDate),
        isCurrent: false,
      },
    });
    res.status(201).json(success(row, 'เพิ่มปีการศึกษาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ปีการศึกษานี้มีอยู่แล้ว'));
    next(e);
  }
});

// PUT /api/settings/academic-years/:id
router.put('/academic-years/:id', superAdmin, async (req, res, next) => {
  try {
    const { year, semester, startDate, endDate } = req.body;
    const row = await prisma.academicYear.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(year      !== undefined && { year:      parseInt(year, 10)  }),
        ...(semester  !== undefined && { semester:  parseInt(semester, 10) }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate   !== undefined && { endDate:   new Date(endDate)   }),
      },
    });
    res.json(success(row, 'แก้ไขปีการศึกษาสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบปีการศึกษา'));
    next(e);
  }
});

// PUT /api/settings/academic-years/:id/set-current
router.put('/academic-years/:id/set-current', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    await prisma.$transaction([
      prisma.academicYear.updateMany({ data: { isCurrent: false } }),
      prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);
    const rows = await prisma.academicYear.findMany({
      orderBy: [{ year: 'desc' }, { semester: 'asc' }],
    });
    res.json(success(rows, 'ตั้งปีการศึกษาปัจจุบันสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบปีการศึกษา'));
    next(e);
  }
});

// DELETE /api/settings/academic-years/:id
router.delete('/academic-years/:id', superAdmin, async (req, res, next) => {
  try {
    const id  = intId(req.params.id);
    const row = await prisma.academicYear.findUnique({ where: { id } });
    if (!row)           return res.status(404).json(error('ไม่พบปีการศึกษา'));
    if (row.isCurrent)  return res.status(400).json(error('ไม่สามารถลบปีการศึกษาปัจจุบันได้'));
    await prisma.academicYear.delete({ where: { id } });
    res.json(success(null, 'ลบปีการศึกษาสำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// การแจ้งเตือน (Notification Settings)
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFY_MODULES = ['DUTY', 'WORK_LOG', 'EQUIPMENT', 'HELPDESK', 'ROOM_BOOKING', 'LOST_FOUND', 'PERSONNEL', 'LEAVE'];
const NOTIFY_KEY = (m) => `notify_line_${m}`;

// GET /api/settings/notifications
router.get('/notifications', auth, async (req, res, next) => {
  try {
    const rows = await prisma.systemSettings.findMany({
      where: { key: { startsWith: 'notify_line_' } },
    });
    const result = {};
    for (const m of NOTIFY_MODULES) {
      const row = rows.find((r) => r.key === NOTIFY_KEY(m));
      result[m] = row ? row.value === 'true' : true; // default on
    }
    res.json(success(result));
  } catch (e) { next(e); }
});

// PUT /api/settings/notifications  — body: { DUTY: true, HELPDESK: false, ... }
router.put('/notifications', superAdmin, async (req, res, next) => {
  try {
    const updates = req.body;
    if (typeof updates !== 'object' || Array.isArray(updates)) {
      return res.status(400).json(error('Body ต้องเป็น object'));
    }
    const entries = Object.entries(updates).filter(([k]) => NOTIFY_MODULES.includes(k));
    if (entries.length === 0) return res.status(400).json(error('ไม่มีข้อมูลที่จะอัปเดต'));

    await prisma.$transaction(
      entries.map(([module, enabled]) =>
        prisma.systemSettings.upsert({
          where:  { key: NOTIFY_KEY(module) },
          update: { value: String(Boolean(enabled)) },
          create: { key: NOTIFY_KEY(module), value: String(Boolean(enabled)), group: 'notifications' },
        })
      )
    );
    res.json(success(null, 'บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/settings/me/notifications  — any user updates their own preferences
router.put('/me/notifications', auth, async (req, res, next) => {
  try {
    const { notifyByLine, notifyByEmail } = req.body;
    const data = {};
    if (notifyByLine  !== undefined) data.notifyByLine  = Boolean(notifyByLine);
    if (notifyByEmail !== undefined) data.notifyByEmail = Boolean(notifyByEmail);
    if (Object.keys(data).length === 0) return res.status(400).json(error('ไม่มีข้อมูลที่จะอัปเดต'));

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, notifyByLine: true, notifyByEmail: true },
    });
    res.json(success(user, 'บันทึกการตั้งค่าการแจ้งเตือนสำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ทดสอบ LINE Notify
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/settings/test-line
// Body: { token?, message? }
router.post('/test-line', superAdmin, async (req, res, next) => {
  try {
    const { token, message } = req.body;
    const lineToken = token || process.env.LINE_NOTIFY_TOKEN;
    if (!lineToken) return res.status(400).json(error('ไม่พบ LINE Notify Token'));

    const text = message?.trim()
      ? `\n${message.trim()}`
      : `\n✅ ทดสอบ LINE Notify จาก RETC Smart Campus\nเวลา: ${new Date().toLocaleString('th-TH')}`;

    const params = new URLSearchParams({ message: text });
    const resp = await fetch('https://notify-api.line.me/api/notify', {
      method:  'POST',
      headers: { Authorization: `Bearer ${lineToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });
    const data = await resp.json();
    if (data.status === 200) {
      res.json(success(null, 'ส่ง LINE Notify สำเร็จ'));
    } else {
      res.status(400).json(error(data.message ?? 'ส่ง LINE Notify ไม่สำเร็จ'));
    }
  } catch (e) { next(e); }
});

// POST /api/settings/test-email  — ทดสอบส่ง Email
router.post('/test-email', superAdmin, async (req, res, next) => {
  try {
    const { to, provider, resend_api_key, email_from, smtp_host, smtp_port, smtp_user, smtp_pass } = req.body;
    if (!to) return res.status(400).json(error('กรุณาระบุอีเมลปลายทาง'));

    const subject = '✅ ทดสอบการส่ง Email จาก RETC Smart Campus';
    const html    = `<p>ทดสอบส่ง Email สำเร็จ 🎉</p><p style="color:#888;font-size:12px">${new Date().toLocaleString('th-TH')}</p>`;
    const text    = `ทดสอบส่ง Email สำเร็จ — ${new Date().toLocaleString('th-TH')}`;

    const { sendViaResend, sendViaSmtp } = require('../services/email');
    let result;

    if (provider === 'resend') {
      if (!resend_api_key) return res.status(400).json(error('กรุณากรอก Resend API Key'));
      result = await sendViaResend({ apiKey: resend_api_key, from: email_from || 'Smart Campus <onboarding@resend.dev>', to, subject, html, text });
    } else if (provider === 'smtp') {
      if (!smtp_host || !smtp_user || !smtp_pass) return res.status(400).json(error('กรุณากรอก SMTP Host, User, และ Password'));
      result = await sendViaSmtp({ host: smtp_host, port: parseInt(smtp_port ?? '587', 10), user: smtp_user, pass: smtp_pass, from: email_from || smtp_user, to, subject, html, text });
    } else {
      return res.status(400).json(error('กรุณาเลือก Email Provider'));
    }

    if (result) {
      res.json(success(null, 'ส่ง Email ทดสอบสำเร็จ ✅ ตรวจสอบใน Inbox ของคุณ'));
    } else {
      res.status(400).json(error('ส่ง Email ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า'));
    }
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ระบบจัดการผู้ใช้งาน
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_ROLES = ['admin', 'executive', 'teacher', 'staff'];
const VALID_POS   = ['director','deputy_director','division_chief','work_unit_chief','department_chief','teacher','specialist','officer','worker'];

function modulePermissions(user) {
  const p = [];
  if (user.isSuperAdmin) p.push({ module: 'ตั้งค่าระบบ / จัดการผู้ใช้', level: 'SuperAdmin' });
  switch (user.role) {
    case 'admin':
      p.push({ module: 'ระบบทั้งหมด', level: 'Admin' }); break;
    case 'executive':
      ['บันทึกปฏิบัติงาน','เวรรับนักเรียน','จองห้องประชุม','ยืมครุภัณฑ์','แจ้งซ่อม']
        .forEach(m => p.push({ module: m, level: 'Approver' })); break;
    case 'teacher':
      ['บันทึกปฏิบัติงาน','เวรรับนักเรียน','จองห้องประชุม','ยืมครุภัณฑ์','ของหาย-ของได้']
        .forEach(m => p.push({ module: m, level: 'User' })); break;
    default:
      ['แจ้งซ่อม','จองห้องประชุม','ยืมครุภัณฑ์','ของหาย-ของได้']
        .forEach(m => p.push({ module: m, level: 'User' }));
  }
  return p;
}

const USER_COLS = {
  id:true, employeeId:true, name:true, nickname:true, email:true,
  role:true, position:true, isSuperAdmin:true, isActive:true,
  phone:true, avatar:true, department:true,
  divisionId:true, workUnitId:true, departmentId:true,
  birthDate:true, startDate:true, lineUserId:true, createdAt:true,
  division:  { select:{ id:true, name:true, code:true } },
  workUnit:  { select:{ id:true, name:true, code:true } },
  deptGroup: { select:{ id:true, name:true, code:true } },
};

// GET /api/settings/users
router.get('/users', auth, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const where = {
      ...(req.query.role         && { role:         req.query.role }),
      ...(req.query.divisionId   && { divisionId:   intId(req.query.divisionId)   }),
      ...(req.query.workUnitId   && { workUnitId:   intId(req.query.workUnitId)   }),
      ...(req.query.departmentId && { departmentId: intId(req.query.departmentId) }),
      ...(req.query.isActive !== undefined && req.query.isActive !== '' && {
        isActive: req.query.isActive === 'true',
      }),
      ...(req.query.search && {
        OR: [
          { name:       { contains: req.query.search } },
          { nickname:   { contains: req.query.search } },
          { email:      { contains: req.query.search } },
          { employeeId: { contains: req.query.search } },
          { department: { contains: req.query.search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, select: USER_COLS, orderBy: { employeeId: 'asc' }, skip, take: limit }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users.map(u => ({ ...u, modulePermissions: modulePermissions(u) })),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) { next(e); }
});

// GET /api/settings/users/:id
router.get('/users/:id', auth, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id },
      select: { ...USER_COLS, nationalId:true, signature:true, googleId:true, updatedAt:true },
    });
    if (!user) return res.status(404).json(error('ไม่พบผู้ใช้'));

    const [wlCount, rtCount, daCount, rbCount] = await Promise.all([
      prisma.workLog.count({ where: { userId: id } }),
      prisma.repairTicket.count({ where: { reporterId: id } }),
      prisma.dutyAssignment.count({ where: { teacherId: id } }),
      prisma.roomBooking.count({ where: { userId: id } }),
    ]);

    res.json(success({
      ...user,
      modulePermissions: modulePermissions(user),
      stats: { workLogs: wlCount, repairTickets: rtCount, dutyAssignments: daCount, roomBookings: rbCount },
    }));
  } catch (e) { next(e); }
});

// POST /api/settings/users/import  (ก่อน /:id เพื่อ routing ถูกต้อง)
router.post('/users/import', superAdmin, async (req, res, next) => {
  try {
    const { users: rows } = req.body;
    if (!Array.isArray(rows) || !rows.length) return res.status(400).json(error('ไม่มีข้อมูล'));
    if (rows.length > 500) return res.status(400).json(error('นำเข้าได้ครั้งละไม่เกิน 500 รายการ'));

    const [divs, wus, depts] = await Promise.all([
      prisma.division.findMany({ select: { id:true, code:true } }),
      prisma.workUnit.findMany({ select: { id:true, code:true } }),
      prisma.department.findMany({ select: { id:true, code:true } }),
    ]);
    const divMap  = new Map(divs.map(d => [d.code,  d.id]));
    const wuMap   = new Map(wus.map(w  => [w.code,  w.id]));
    const deptMap = new Map(depts.map(d => [d.code, d.id]));

    const defaultHash = await bcrypt.hash('password1234', 10);
    const results = { created: 0, updated: 0, errors: [] };

    for (const row of rows) {
      const empId = String(row.employeeId ?? '').trim();
      const email = String(row.email ?? '').trim().toLowerCase();
      if (!empId || !row.name || !email) {
        results.errors.push({ row: empId || '?', reason: 'ขาด employeeId / name / email' });
        continue;
      }
      const role = VALID_ROLES.includes(row.role) ? row.role : 'staff';
      const data = {
        name:        String(row.name).trim(),
        nickname:    row.nickname    || null,
        role,
        position:    VALID_POS.includes(row.position) ? row.position : null,
        department:  row.department  || null,
        phone:       row.phone       || null,
        divisionId:  divMap.get(row.divisionCode)  ?? null,
        workUnitId:  wuMap.get(row.workUnitCode)   ?? null,
        departmentId: deptMap.get(row.departmentCode) ?? null,
        startDate:   row.startDate ? new Date(row.startDate) : null,
      };
      try {
        const exists = await prisma.user.findUnique({ where: { employeeId: empId } });
        if (exists) {
          await prisma.user.update({ where: { employeeId: empId }, data });
          results.updated++;
        } else {
          const pwdHash = row.password ? await bcrypt.hash(String(row.password), 10) : defaultHash;
          await prisma.user.create({ data: { employeeId: empId, email, password: pwdHash, ...data } });
          results.created++;
        }
      } catch (e) {
        results.errors.push({ row: empId, reason: e.message?.split('\n')[0] ?? 'error' });
      }
    }
    res.json(success(results, `สร้าง ${results.created} | อัปเดต ${results.updated} | ผิดพลาด ${results.errors.length}`));
  } catch (e) { next(e); }
});

// POST /api/settings/users
router.post('/users', superAdmin, async (req, res, next) => {
  try {
    const { employeeId, name, nickname, email, password, role, position, isSuperAdmin,
            divisionId, workUnitId, departmentId, department, phone, birthDate, nationalId, startDate } = req.body;

    if (!employeeId?.trim() || !name?.trim() || !email?.trim() || !password || !role)
      return res.status(400).json(error('กรุณากรอกข้อมูลที่จำเป็น: รหัสพนักงาน, ชื่อ, email, รหัสผ่าน, role'));
    if (!VALID_ROLES.includes(role)) return res.status(400).json(error('role ไม่ถูกต้อง'));
    if (password.length < 8) return res.status(400).json(error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'));

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        employeeId:  employeeId.trim(),
        name:        name.trim(),
        nickname:    nickname    || null,
        email:       email.trim().toLowerCase(),
        password:    hashed,
        role,
        position:    position    || null,
        isSuperAdmin: Boolean(isSuperAdmin),
        divisionId:  divisionId  ? intId(divisionId)  : null,
        workUnitId:  workUnitId  ? intId(workUnitId)  : null,
        departmentId: departmentId ? intId(departmentId) : null,
        department:  department  || null,
        phone:       phone       || null,
        birthDate:   birthDate   ? new Date(birthDate)  : null,
        nationalId:  nationalId  || null,
        startDate:   startDate   ? new Date(startDate)  : null,
      },
      select: USER_COLS,
    });
    res.status(201).json(success({ ...user, modulePermissions: modulePermissions(user) }, 'สร้างผู้ใช้สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') {
      const f = e.meta?.target?.includes('email') ? 'อีเมล' : 'รหัสพนักงาน';
      return res.status(409).json(error(`${f}นี้มีในระบบแล้ว`));
    }
    next(e);
  }
});

// PUT /api/settings/users/:id/toggle
router.put('/users/:id/toggle', superAdmin, async (req, res, next) => {
  try {
    const id  = intId(req.params.id);
    const cur = await prisma.user.findUnique({ where: { id }, select: { isActive:true } });
    if (!cur) return res.status(404).json(error('ไม่พบผู้ใช้'));
    const u = await prisma.user.update({ where: { id }, data: { isActive: !cur.isActive }, select: { id:true, isActive:true } });
    res.json(success(u, `${u.isActive ? 'เปิด' : 'ปิด'}การใช้งานสำเร็จ`));
  } catch (e) { next(e); }
});

// PUT /api/settings/users/:id/reset-password
router.put('/users/:id/reset-password', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8)
      return res.status(400).json(error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'));
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json(success(null, 'รีเซ็ตรหัสผ่านสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบผู้ใช้'));
    next(e);
  }
});

// PUT /api/settings/users/:id
router.put('/users/:id', superAdmin, async (req, res, next) => {
  try {
    const id = intId(req.params.id);
    const { name, nickname, email, role, position, isSuperAdmin, isActive,
            divisionId, workUnitId, departmentId, department, phone, birthDate, nationalId, startDate } = req.body;

    if (role && !VALID_ROLES.includes(role)) return res.status(400).json(error('role ไม่ถูกต้อง'));

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name:         name.trim()                          }),
        ...(nickname     !== undefined && { nickname:     nickname     || null                 }),
        ...(email        !== undefined && { email:        email.trim().toLowerCase()           }),
        ...(role         !== undefined && { role                                               }),
        ...(position     !== undefined && { position:     position     || null                 }),
        ...(isSuperAdmin !== undefined && { isSuperAdmin: Boolean(isSuperAdmin)               }),
        ...(isActive     !== undefined && { isActive                                           }),
        ...(divisionId   !== undefined && { divisionId:  divisionId   ? intId(divisionId)  : null }),
        ...(workUnitId   !== undefined && { workUnitId:  workUnitId   ? intId(workUnitId)  : null }),
        ...(departmentId !== undefined && { departmentId: departmentId ? intId(departmentId): null }),
        ...(department   !== undefined && { department:  department   || null                 }),
        ...(phone        !== undefined && { phone:       phone        || null                 }),
        ...(birthDate    !== undefined && { birthDate:   birthDate    ? new Date(birthDate)  : null }),
        ...(nationalId   !== undefined && { nationalId:  nationalId   || null                 }),
        ...(startDate    !== undefined && { startDate:   startDate    ? new Date(startDate)  : null }),
      },
      select: USER_COLS,
    });
    res.json(success({ ...user, modulePermissions: modulePermissions(user) }, 'อัปเดตข้อมูลสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบผู้ใช้'));
    if (e.code === 'P2002') return res.status(409).json(error('อีเมลนี้มีในระบบแล้ว'));
    next(e);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Module Permissions
// ═══════════════════════════════════════════════════════════════════════════════

const VALID_MODULES = ['DUTY', 'WORK_LOG', 'EQUIPMENT', 'HELPDESK', 'ROOM_BOOKING', 'LOST_FOUND', 'PERSONNEL', 'LEAVE'];
const ALL_ROLES     = ['admin', 'executive', 'teacher', 'staff'];
const MODULE_KEY    = (m) => `MODULE_ROLES_${m}`;

// GET /api/settings/permissions/matrix  (route ต้องอยู่ก่อน /:userId/:module)
router.get('/permissions/matrix', auth, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id:       true,
        name:     true,
        email:    true,
        role:     true,
        position: true,
        department: true,
        workUnit: { select: { name: true } },
        modulePermissions: { select: { module: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json(success(users.map((u) => ({
      userId:     u.id,
      name:       u.name,
      email:      u.email,
      role:       u.role,
      position:   u.position,
      department: u.department,
      workUnit:   u.workUnit,
      modules:    u.modulePermissions.map((p) => p.module),
    }))));
  } catch (e) { next(e); }
});

// GET /api/settings/permissions — grouped by module, split into admins and users
router.get('/permissions', auth, async (req, res, next) => {
  try {
    const perms = await prisma.modulePermission.findMany({
      include: {
        user: {
          select: {
            id: true, name: true, email: true, role: true, position: true,
            department: true,
            workUnit: { select: { name: true } },
          },
        },
      },
      orderBy: [{ module: 'asc' }, { user: { name: 'asc' } }],
    });

    // Return { MODULE: { admins: [...], users: [...] } }
    const grouped = {};
    for (const p of perms) {
      if (!grouped[p.module]) grouped[p.module] = { admins: [], users: [] };
      const entry = { ...p.user, level: p.level };
      if (p.level === 'USER') {
        grouped[p.module].users.push(entry);
      } else {
        grouped[p.module].admins.push(entry);
      }
    }
    res.json(success(grouped));
  } catch (e) { next(e); }
});

// POST /api/settings/permissions — upsert (level: ADMIN | USER)
router.post('/permissions', superAdmin, async (req, res, next) => {
  try {
    const { userId, module, level = 'ADMIN' } = req.body;
    if (!userId || !module) return res.status(400).json(error('กรุณาระบุ userId และ module'));
    if (!VALID_MODULES.includes(module)) return res.status(400).json(error('module ไม่ถูกต้อง'));
    if (!['ADMIN', 'USER'].includes(level)) return res.status(400).json(error('level ต้องเป็น ADMIN หรือ USER'));

    await prisma.modulePermission.upsert({
      where:  { userId_module: { userId: intId(userId), module } },
      create: { userId: intId(userId), module, level },
      update: { level },
    });
    res.json(success(null, 'เพิ่มสิทธิ์สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2003') return res.status(404).json(error('ไม่พบผู้ใช้'));
    next(e);
  }
});

// DELETE /api/settings/permissions/:userId/:module
router.delete('/permissions/:userId/:module', superAdmin, async (req, res, next) => {
  try {
    const userId = intId(req.params.userId);
    const { module } = req.params;
    if (!VALID_MODULES.includes(module)) return res.status(400).json(error('module ไม่ถูกต้อง'));

    const deleted = await prisma.modulePermission.deleteMany({ where: { userId, module } });
    if (deleted.count === 0) return res.status(404).json(error('ไม่พบสิทธิ์ที่ต้องการลบ'));
    res.json(success(null, 'ลบสิทธิ์สำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Module Access (role-based: who can USE each module)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /settings/module-access  — any authenticated user (used by sidebar)
router.get('/module-access', auth, async (req, res, next) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      where: { key: { startsWith: 'MODULE_ROLES_' } },
    });
    const result = {};
    for (const mod of VALID_MODULES) {
      const s = settings.find((x) => x.key === MODULE_KEY(mod));
      // no setting → all roles allowed (open access)
      result[mod] = s ? JSON.parse(s.value) : ALL_ROLES;
    }
    res.json(success(result));
  } catch (e) { next(e); }
});

// PUT /settings/module-access/:module  — superAdmin
router.put('/module-access/:module', superAdmin, async (req, res, next) => {
  try {
    const { module } = req.params;
    if (!VALID_MODULES.includes(module)) return res.status(400).json(error('module ไม่ถูกต้อง'));
    const { roles } = req.body;
    if (!Array.isArray(roles)) return res.status(400).json(error('roles ต้องเป็น array'));
    const validRoles = roles.filter((r) => ALL_ROLES.includes(r));
    await prisma.systemSettings.upsert({
      where:  { key: MODULE_KEY(module) },
      create: { key: MODULE_KEY(module), value: JSON.stringify(validRoles), group: 'permissions' },
      update: { value: JSON.stringify(validRoles) },
    });
    res.json(success(null, 'บันทึกสิทธิ์สำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ตำแหน่ง (Positions) — เก็บใน SystemSettings key='positions' เป็น JSON array
// ═══════════════════════════════════════════════════════════════════════════════
const POSITIONS_KEY = 'positions';

async function getPositions() {
  const row = await prisma.systemSettings.findUnique({ where: { key: POSITIONS_KEY } });
  try { return JSON.parse(row?.value || '[]'); } catch { return []; }
}

// GET /api/settings/positions
router.get('/positions', auth, async (req, res, next) => {
  try { res.json(success(await getPositions())); } catch (e) { next(e); }
});

// POST /api/settings/positions  — เพิ่มตำแหน่ง
router.post('/positions', superAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อตำแหน่ง'));
    const list = await getPositions();
    if (list.includes(name.trim())) return res.status(409).json(error('มีตำแหน่งนี้แล้ว'));
    list.push(name.trim());
    await prisma.systemSettings.upsert({
      where: { key: POSITIONS_KEY }, update: { value: JSON.stringify(list) },
      create: { key: POSITIONS_KEY, value: JSON.stringify(list), group: 'general' },
    });
    res.json(success(list, 'เพิ่มตำแหน่งสำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/settings/positions/:index  — แก้ไขตำแหน่ง
router.put('/positions/:index', superAdmin, async (req, res, next) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อตำแหน่ง'));
    const list = await getPositions();
    if (idx < 0 || idx >= list.length) return res.status(404).json(error('ไม่พบตำแหน่ง'));
    const old = list[idx];
    list[idx] = name.trim();
    await prisma.systemSettings.update({ where: { key: POSITIONS_KEY }, data: { value: JSON.stringify(list) } });
    // อัปเดต user ที่ใช้ตำแหน่งเดิม
    await prisma.user.updateMany({ where: { position: old }, data: { position: name.trim() } });
    res.json(success(list, 'แก้ไขตำแหน่งสำเร็จ'));
  } catch (e) { next(e); }
});

// DELETE /api/settings/positions/:index  — ลบตำแหน่ง
router.delete('/positions/:index', superAdmin, async (req, res, next) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const list = await getPositions();
    if (idx < 0 || idx >= list.length) return res.status(404).json(error('ไม่พบตำแหน่ง'));
    list.splice(idx, 1);
    await prisma.systemSettings.update({ where: { key: POSITIONS_KEY }, data: { value: JSON.stringify(list) } });
    res.json(success(list, 'ลบตำแหน่งสำเร็จ'));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// หมวดหมู่การปฏิบัติงาน — เก็บใน SystemSettings key='work_categories'
// ═══════════════════════════════════════════════════════════════════════════════
const WCATS_KEY = 'work_categories';
const WCATS_DEFAULT = ['การสอน', 'การประชุม', 'การพัฒนา', 'งานธุรการ', 'อื่นๆ'];

async function getWorkCategories() {
  const row = await prisma.systemSettings.findUnique({ where: { key: WCATS_KEY } });
  if (!row) return [...WCATS_DEFAULT];
  try { return JSON.parse(row.value || '[]'); } catch { return [...WCATS_DEFAULT]; }
}

router.get('/work-categories', auth, async (req, res, next) => {
  try { res.json(success(await getWorkCategories())); } catch (e) { next(e); }
});

router.post('/work-categories', superAdmin, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อหมวดหมู่'));
    const list = await getWorkCategories();
    if (list.includes(name.trim())) return res.status(409).json(error('มีหมวดหมู่นี้แล้ว'));
    list.push(name.trim());
    await prisma.systemSettings.upsert({
      where: { key: WCATS_KEY }, update: { value: JSON.stringify(list) },
      create: { key: WCATS_KEY, value: JSON.stringify(list), group: 'general' },
    });
    res.json(success(list, 'เพิ่มหมวดหมู่สำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/work-categories/:index', superAdmin, async (req, res, next) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อหมวดหมู่'));
    const list = await getWorkCategories();
    if (idx < 0 || idx >= list.length) return res.status(404).json(error('ไม่พบหมวดหมู่'));
    const old = list[idx];
    list[idx] = name.trim();
    await prisma.systemSettings.upsert({
      where: { key: WCATS_KEY }, update: { value: JSON.stringify(list) },
      create: { key: WCATS_KEY, value: JSON.stringify(list), group: 'general' },
    });
    // อัปเดต WorkType ที่ใช้หมวดหมู่เดิม
    await prisma.workType.updateMany({ where: { category: old }, data: { category: name.trim() } });
    res.json(success(list, 'แก้ไขหมวดหมู่สำเร็จ'));
  } catch (e) { next(e); }
});

router.delete('/work-categories/:index', superAdmin, async (req, res, next) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const list = await getWorkCategories();
    if (idx < 0 || idx >= list.length) return res.status(404).json(error('ไม่พบหมวดหมู่'));
    const cat = list[idx];
    const used = await prisma.workType.count({ where: { category: cat } });
    if (used > 0) return res.status(400).json(error(`มีประเภทงานใช้หมวดหมู่นี้ ${used} รายการ`));
    list.splice(idx, 1);
    await prisma.systemSettings.update({ where: { key: WCATS_KEY }, data: { value: JSON.stringify(list) } });
    res.json(success(list, 'ลบหมวดหมู่สำเร็จ'));
  } catch (e) { next(e); }
});

module.exports = router;
