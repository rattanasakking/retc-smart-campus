const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const intId = (s) => parseInt(s, 10);

async function isDutyAdmin(user) {
  if (user.isSuperAdmin) return true;
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: user.id, module: 'DUTY' },
  });
  return !!perm;
}

const dutyAdmin = [
  auth,
  async (req, res, next) => {
    try {
      if (await isDutyAdmin(req.user)) return next();
      res.status(403).json(error('ต้องการสิทธิ์ Duty Admin'));
    } catch (e) { next(e); }
  },
];

function savePhoto(base64, fileName) {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  const buf  = Buffer.from(data, 'base64');
  const ext  = (fileName && path.extname(fileName)) || '.jpg';
  const name = `duty_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
  const dir  = path.join(__dirname, '..', '..', 'uploads', 'duty');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), buf);
  return `/uploads/duty/${name}`;
}

// ─── GET /api/duty/today ──────────────────────────────────────────────────────
// ตรวจว่า user มีเวรวันนี้หรือไม่
router.get('/today', auth, async (req, res, next) => {
  try {
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const isAdmin = await isDutyAdmin(req.user);
    const isExec  = req.user.role === 'executive';
    const me = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { departmentId: true, department: true },
    });

    const deptFilter = (!isAdmin && !isExec)
      ? (me?.departmentId
          ? { departmentId: me.departmentId }
          : me?.department
          ? { departmentName: me.department }
          : { id: -1 }) // no dept → no results
      : {};

    const schedules = await prisma.dutySchedule.findMany({
      where: {
        dutyDate: { gte: today, lt: tomorrow },
        ...deptFilter,
      },
      include: {
        logs: { where: { teacherId: req.user.id } },
      },
    });

    res.json(success(schedules.map((s) => ({ ...s, myLog: s.logs[0] ?? null }))));
  } catch (e) { next(e); }
});

// ─── GET /api/duty/schedules ──────────────────────────────────────────────────
router.get('/schedules', auth, async (req, res, next) => {
  try {
    const { semester, month, year } = req.query;
    // เฉพาะ superAdmin และ executive เท่านั้นที่เห็นทุกแผนก
    const isGlobalAdmin = req.user.isSuperAdmin || req.user.role === 'executive';

    const where = {};
    if (semester) where.semester = semester;

    if (year || month) {
      const yAD = year ? intId(year) - 543 : new Date().getFullYear();
      if (month) {
        const m = intId(month) - 1;
        where.dutyDate = { gte: new Date(yAD, m, 1), lte: new Date(yAD, m + 1, 0) };
      } else {
        where.dutyDate = { gte: new Date(yAD, 0, 1), lte: new Date(yAD, 11, 31) };
      }
    }

    // ── Visibility filter — ดึงจาก DB เสมอ (ไม่ใช้ JWT ที่อาจเก่า) ──────────────
    if (!isGlobalAdmin) {
      const userDb = await prisma.user.findUnique({
        where:  { id: req.user.id },
        select: { departmentId: true, department: true },
      });
      if (userDb?.departmentId) {
        where.departmentId = userDb.departmentId;
      } else if (userDb?.department) {
        where.departmentName = userDb.department;
      } else {
        where.id = -1; // ไม่มีแผนก — ไม่แสดงเวรใด ๆ
      }
    }

    const rows = await prisma.dutySchedule.findMany({
      where,
      orderBy: [{ dutyDate: 'asc' }, { departmentName: 'asc' }],
      include: {
        logs:      { select: { status: true, teacherId: true } },
        createdBy: { select: { name: true } },
      },
    });

    res.json(success(rows.map((s) => ({
      id:             s.id,
      semester:       s.semester,
      dutyDate:       s.dutyDate,
      departmentId:   s.departmentId,
      departmentName: s.departmentName,
      note:           s.note,
      createdBy:      s.createdBy.name,
      presentCount:   s.logs.filter((l) => l.status === 'PRESENT').length,
      loggedCount:    s.logs.length,
      myLogged:       s.logs.some((l) => l.teacherId === req.user.id),
    }))));
  } catch (e) { next(e); }
});

// ─── POST /api/duty/schedules ─────────────────────────────────────────────────
// Body single/array: { dutyDate, semester, departmentId?, departmentName, note? }
// OR weekly repeat:  { repeatWeekly: true, weekday(0-6), startDate, endDate, semester, departmentId?, departmentName, note? }
router.post('/schedules', dutyAdmin, async (req, res, next) => {
  try {
    let items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length) return res.status(400).json(error('ไม่มีข้อมูล'));

    // Expand repeat-weekly into individual dates
    const expanded = [];
    for (const item of items) {
      if (item.repeatWeekly) {
        const { weekday, startDate, endDate, semester, departmentId, departmentName, note } = item;
        if (!startDate || !endDate || !semester || !departmentName)
          return res.status(400).json(error('กรุณากรอก startDate, endDate, semester, departmentName'));
        const wd = intId(weekday ?? 1);
        const cur = new Date(startDate);
        // advance to first occurrence of weekday
        while (cur.getDay() !== wd) cur.setDate(cur.getDate() + 1);
        const finish = new Date(endDate);
        while (cur <= finish) {
          expanded.push({ dutyDate: cur.toISOString().slice(0, 10), semester, departmentId, departmentName, note });
          cur.setDate(cur.getDate() + 7);
        }
      } else {
        expanded.push(item);
      }
    }
    items = expanded;

    const created = [];
    for (const item of items) {
      const { dutyDate, semester, departmentId, departmentName, note } = item;
      if (!dutyDate || !semester || !departmentName)
        return res.status(400).json(error('กรุณากรอก dutyDate, semester, departmentName'));

      const exists = await prisma.dutySchedule.findFirst({
        where: { dutyDate: new Date(dutyDate), semester, departmentName },
      });
      if (exists) continue;

      const s = await prisma.dutySchedule.create({
        data: {
          dutyDate:     new Date(dutyDate),
          semester,
          departmentId: departmentId ? intId(departmentId) : null,
          departmentName,
          note:         note || null,
          createdById:  req.user.id,
        },
      });
      created.push(s);
    }

    res.status(201).json(success(created, `สร้างตารางเวร ${created.length} รายการ`));
  } catch (e) { next(e); }
});

// ─── PUT /api/duty/schedules/:id ─────────────────────────────────────────────
router.put('/schedules/:id', dutyAdmin, async (req, res, next) => {
  try {
    const { departmentName, departmentId, dutyDate, semester, note } = req.body;
    const updated = await prisma.dutySchedule.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(departmentName !== undefined && { departmentName }),
        ...(departmentId   !== undefined && { departmentId: departmentId ? intId(departmentId) : null }),
        ...(dutyDate       !== undefined && { dutyDate: new Date(dutyDate) }),
        ...(semester       !== undefined && { semester }),
        ...(note           !== undefined && { note: note || null }),
      },
    });
    res.json(success(updated, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบตารางเวร'));
    next(e);
  }
});

// ─── DELETE /api/duty/schedules/:id ──────────────────────────────────────────
router.delete('/schedules/:id', dutyAdmin, async (req, res, next) => {
  try {
    await prisma.dutySchedule.delete({ where: { id: intId(req.params.id) } });
    res.json(success(null, 'ลบตารางเวรสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบตารางเวร'));
    next(e);
  }
});

// ─── GET /api/duty/schedules/:id/teachers ────────────────────────────────────
// คืน schedule + รายชื่อครูในแผนก + สถานะการบันทึก
router.get('/schedules/:id/teachers', auth, async (req, res, next) => {
  try {
    const schedule = await prisma.dutySchedule.findUnique({
      where:   { id: intId(req.params.id) },
      include: { logs: true, createdBy: { select: { name: true } } },
    });
    if (!schedule) return res.status(404).json(error('ไม่พบตารางเวร'));

    const teachers = await prisma.user.findMany({
      where: {
        isActive: true,
        role:     { in: ['teacher', 'staff'] },
        ...(schedule.departmentId ? { departmentId: schedule.departmentId } : {}),
      },
      select: {
        id: true, name: true, employeeId: true, nickname: true,
        position: true, avatar: true,
      },
      orderBy: { name: 'asc' },
    });

    const logMap = new Map(schedule.logs.map((l) => [l.teacherId, l]));
    res.json(success({
      schedule: { ...schedule, logs: undefined },
      teachers: teachers.map((t) => ({ ...t, log: logMap.get(t.id) ?? null })),
    }));
  } catch (e) { next(e); }
});

// ─── POST /api/duty/logs/batch ────────────────────────────────────────────────
// (อยู่ก่อน /logs เพื่อ routing ถูก)
router.post('/logs/batch', auth, async (req, res, next) => {
  try {
    if (!(await isDutyAdmin(req.user)) && req.user.role !== 'executive') {
      return res.status(403).json(error('ต้องการสิทธิ์ Duty Admin'));
    }
    const items = req.body;
    if (!Array.isArray(items) || !items.length) return res.status(400).json(error('ไม่มีข้อมูล'));

    const results = [];
    for (const item of items) {
      const { scheduleId, teacherId, status, photo, photoFileName, note } = item;
      if (!scheduleId || !teacherId || !status) continue;

      let photoUrl = null;
      if (photo && status === 'PRESENT') photoUrl = savePhoto(photo, photoFileName);

      const log = await prisma.dutyLog.upsert({
        where:  { scheduleId_teacherId: { scheduleId: intId(scheduleId), teacherId: intId(teacherId) } },
        create: { scheduleId: intId(scheduleId), teacherId: intId(teacherId), status, photo: photoUrl, note: note || null, recordedById: req.user.id },
        update: { status, ...(photoUrl && { photo: photoUrl }), ...(note !== undefined && { note }), recordedById: req.user.id },
      });
      results.push(log);
    }
    res.json(success(results, `บันทึก ${results.length} รายการสำเร็จ`));
  } catch (e) { next(e); }
});

// ─── POST /api/duty/logs ──────────────────────────────────────────────────────
// ครูบันทึกตัวเอง
router.post('/logs', auth, async (req, res, next) => {
  try {
    const { scheduleId, status, photo, photoFileName, note } = req.body;
    if (!scheduleId || !status) return res.status(400).json(error('กรุณาระบุ scheduleId และ status'));
    if (!['PRESENT', 'ABSENT'].includes(status)) return res.status(400).json(error('status ไม่ถูกต้อง'));

    let photoUrl = null;
    if (photo && status === 'PRESENT') photoUrl = savePhoto(photo, photoFileName);

    const log = await prisma.dutyLog.upsert({
      where:  { scheduleId_teacherId: { scheduleId: intId(scheduleId), teacherId: req.user.id } },
      create: { scheduleId: intId(scheduleId), teacherId: req.user.id, status, photo: photoUrl, note: note || null, recordedById: req.user.id },
      update: { status, ...(photoUrl && { photo: photoUrl }), ...(note !== undefined && { note }), recordedById: req.user.id },
    });
    res.json(success(log, 'บันทึกสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── GET /api/duty/logs/my ────────────────────────────────────────────────────
router.get('/logs/my', auth, async (req, res, next) => {
  try {
    const { semester } = req.query;
    const logs = await prisma.dutyLog.findMany({
      where: {
        teacherId: req.user.id,
        ...(semester ? { schedule: { semester } } : {}),
      },
      include: { schedule: true },
      orderBy: { schedule: { dutyDate: 'desc' } },
    });
    res.json(success(logs));
  } catch (e) { next(e); }
});

// ─── GET /api/duty/report ─────────────────────────────────────────────────────
router.get('/report', auth, async (req, res, next) => {
  try {
    const isAdmin = req.user.isSuperAdmin || req.user.role === 'executive' || await isDutyAdmin(req.user);
    if (!isAdmin) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));

    const { semester, department: deptId } = req.query;
    const schedWhere = {};
    if (semester) schedWhere.semester     = semester;
    if (deptId)   schedWhere.departmentId = intId(deptId);

    const schedules = await prisma.dutySchedule.findMany({
      where:   schedWhere,
      include: {
        logs: {
          include: {
            teacher: { select: { id: true, name: true, employeeId: true, position: true } },
          },
        },
      },
    });

    const teacherMap = new Map();
    const deptMap    = new Map(); // departmentName → { total, present, scheduleCount }
    const dailyMap   = new Map(); // dutyDate(ISO) → { date, depts: Map<name, {present,total}> }

    for (const s of schedules) {
      // per-dept
      if (!deptMap.has(s.departmentName)) {
        deptMap.set(s.departmentName, { departmentName: s.departmentName, scheduleCount: 0, totalLogs: 0, presentLogs: 0 });
      }
      const dm = deptMap.get(s.departmentName);
      dm.scheduleCount++;

      // per-day
      const dayKey = s.dutyDate.toISOString().slice(0, 10);
      if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, { date: s.dutyDate, depts: new Map() });
      const dayEntry = dailyMap.get(dayKey);
      if (!dayEntry.depts.has(s.departmentName)) dayEntry.depts.set(s.departmentName, { present: 0, total: 0 });
      const dayDept = dayEntry.depts.get(s.departmentName);

      for (const l of s.logs) {
        if (!teacherMap.has(l.teacherId)) {
          teacherMap.set(l.teacherId, { teacher: l.teacher, total: 0, present: 0, absent: 0, photos: [], department: s.departmentName });
        }
        const t = teacherMap.get(l.teacherId);
        t.total++; dm.totalLogs++; dayDept.total++;

        if (l.status === 'PRESENT') {
          t.present++; dm.presentLogs++; dayDept.present++;
          if (l.photo) t.photos.push({ url: l.photo, date: s.dutyDate, dept: s.departmentName });
        } else {
          t.absent++;
        }
      }
    }

    const teachers = Array.from(teacherMap.values())
      .map((t) => ({ ...t, rate: t.total > 0 ? Math.round((t.present / t.total) * 100) : 0 }))
      .sort((a, b) => a.teacher.name.localeCompare(b.teacher.name, 'th'));

    const byDept = Array.from(deptMap.values())
      .map((d) => ({ ...d, rate: d.totalLogs > 0 ? Math.round((d.presentLogs / d.totalLogs) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);

    const daily = Array.from(dailyMap.values())
      .map(({ date, depts }) => ({
        date,
        depts: Array.from(depts.entries()).map(([name, s]) => ({ name, ...s })),
        totalPresent: Array.from(depts.values()).reduce((a, v) => a + v.present, 0),
        totalLogs:    Array.from(depts.values()).reduce((a, v) => a + v.total,   0),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json(success({ semester: semester || 'ทั้งหมด', totalSchedules: schedules.length, teachers, byDept, daily }));
  } catch (e) { next(e); }
});

module.exports = router;
