const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth             = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { success, error, paginate } = require('../utils/response');

const router = express.Router();
const prisma  = new PrismaClient();

function saveAvatar(base64) {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  const match = base64.match(/^data:image\/(\w+);/);
  const ext   = match ? `.${match[1]}` : '.jpg';
  const name  = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/avatars/${name}`;
}

const VALID_ROLES = ['admin', 'executive', 'teacher', 'staff'];

// ─── Select sets ─────────────────────────────────────────────────────────────
const USER_SELECT = {
  id: true, employeeId: true, name: true, email: true,
  role: true, position: true, isSuperAdmin: true,
  department: true, divisionId: true, workUnitId: true, departmentId: true,
  phone: true, avatar: true, isActive: true, createdAt: true,
  notifyByLine: true, notifyByEmail: true,
};

// List view — เพิ่ม relation names + personal fields
const LIST_SELECT = {
  ...USER_SELECT,
  nickname:  true,
  startDate: true,
  birthDate: true,
  division:  { select: { id: true, name: true, code: true } },
  workUnit:  { select: { id: true, name: true, code: true } },
  deptGroup: { select: { id: true, name: true, code: true } },
};

// Detail view — ทุก field ยกเว้น password / sensitive auth fields
const DETAIL_SELECT = { ...LIST_SELECT, nationalId: true, signature: true };

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json(error('กรุณากรอกอีเมลและรหัสผ่าน'));

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.isActive) return res.status(401).json(error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(error('อีเมลหรือรหัสผ่านไม่ถูกต้อง'));

    const payload = {
      id: user.id, employeeId: user.employeeId, email: user.email,
      name: user.name, role: user.role, isSuperAdmin: user.isSuperAdmin,
      // org fields needed for duty visibility and other module filters
      departmentId: user.departmentId,
      department:   user.department,
      divisionId:   user.divisionId,
      workUnitId:   user.workUnitId,
      position:     user.position,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    });

    const { password: _pw, ...userOut } = user;
    res.json(success({ token, user: userOut }, 'เข้าสู่ระบบสำเร็จ'));
  } catch (err) {
    console.error('[POST /login]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

const ALL_MODULES = ['DUTY', 'WORK_LOG', 'EQUIPMENT', 'HELPDESK', 'ROOM_BOOKING', 'LOST_FOUND', 'PERSONNEL', 'LEAVE'];

// GET /api/auth/my-modules  — returns modules this user can access (role + admin)
router.get('/my-modules', auth, async (req, res) => {
  try {
    if (req.user.isSuperAdmin || ['admin', 'executive'].includes(req.user.role)) {
      return res.json(success({ modules: ALL_MODULES }));
    }
    const [roleSettings, adminPerms] = await Promise.all([
      prisma.systemSettings.findMany({ where: { key: { startsWith: 'MODULE_ROLES_' } } }),
      prisma.modulePermission.findMany({ where: { userId: req.user.id }, select: { module: true } }),
    ]);
    const adminSet = new Set(adminPerms.map((p) => p.module));
    const accessible = ALL_MODULES.filter((mod) => {
      const s = roleSettings.find((r) => r.key === `MODULE_ROLES_${mod}`);
      const allowed = s ? JSON.parse(s.value) : ['admin', 'executive', 'teacher', 'staff'];
      return allowed.includes(req.user.role) || adminSet.has(mod);
    });
    res.json(success({ modules: accessible }));
  } catch (err) {
    res.status(500).json(error('เกิดข้อผิดพลาด', 500));
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: LIST_SELECT });
    if (!user) return res.status(404).json(error('ไม่พบผู้ใช้'));
    res.json(success(user));
  } catch (err) {
    console.error('[GET /me]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, department, phone, nickname, avatar } = req.body;

    let avatarUrl;
    if (avatar && avatar.startsWith('data:image/')) {
      avatarUrl = saveAvatar(avatar);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name       && { name: name.trim() }),
        ...(department !== undefined && { department }),
        ...(phone      !== undefined && { phone }),
        ...(nickname   !== undefined && { nickname }),
        ...(avatarUrl  && { avatar: avatarUrl }),
      },
      select: USER_SELECT,
    });
    res.json(success(user, 'อัปเดตโปรไฟล์สำเร็จ'));
  } catch (err) {
    console.error('[PUT /profile]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// PUT /api/auth/change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json(error('กรุณากรอกรหัสผ่านให้ครบ'));
    if (newPassword.length < 8) return res.status(400).json(error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'));

    const user  = await prisma.user.findUnique({ where: { id: req.user.id } });
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json(error('รหัสผ่านปัจจุบันไม่ถูกต้อง'));

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json(success(null, 'เปลี่ยนรหัสผ่านสำเร็จ'));
  } catch (err) {
    console.error('[PUT /change-password]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT  (admin)
// ═════════════════════════════════════════════════════════════════════════════

const intOrNull = (v) => (v !== undefined && v !== '' && v !== null) ? parseInt(v, 10) : null;
const strOrNull = (v) => (v !== undefined && v !== '') ? v : null;
const dateOrNull = (v) => (v) ? new Date(v) : null;

// ─── GET /api/auth/users ──────────────────────────────────────────────────────
// Query: page, limit, role, active, divisionId, workUnitId, search
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const where = {
      ...(req.query.role       && { role:       req.query.role }),
      ...(req.query.divisionId && { divisionId: intOrNull(req.query.divisionId) }),
      ...(req.query.workUnitId && { workUnitId: intOrNull(req.query.workUnitId) }),
      ...(req.query.active !== undefined && req.query.active !== '' && {
        isActive: req.query.active === 'true',
      }),
      ...(req.query.search && {
        OR: [
          { name:       { contains: req.query.search } },
          { email:      { contains: req.query.search } },
          { employeeId: { contains: req.query.search } },
          { department: { contains: req.query.search } },
          { nickname:   { contains: req.query.search } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { employeeId: 'asc' },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(paginate(users, total, page, limit));
  } catch (err) {
    console.error('[GET /users]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── GET /api/auth/users/:id  (detail with all org relations) ────────────────
router.get('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      select: DETAIL_SELECT,
    });
    if (!user) return res.status(404).json(error('ไม่พบผู้ใช้'));
    res.json(success(user));
  } catch (err) {
    console.error('[GET /users/:id]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── POST /api/auth/users  — สร้างผู้ใช้ใหม่ ─────────────────────────────────
router.post('/users', auth, requireAdmin, async (req, res) => {
  try {
    const {
      employeeId, name, email, password, role,
      position, isSuperAdmin,
      divisionId, workUnitId, departmentId,
      department, phone, nickname,
      birthDate, startDate,
    } = req.body;

    if (!employeeId || !name || !email || !password || !role)
      return res.status(400).json(error('กรุณากรอกข้อมูลที่จำเป็น: employeeId, name, email, password, role'));
    if (!VALID_ROLES.includes(role)) return res.status(400).json(error('role ไม่ถูกต้อง'));
    if (password.length < 8)        return res.status(400).json(error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'));

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        employeeId:  employeeId.trim(),
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        password:    hashed,
        role,
        position:    position    || null,
        isSuperAdmin: isSuperAdmin === true || isSuperAdmin === 'true',
        divisionId:  intOrNull(divisionId),
        workUnitId:  intOrNull(workUnitId),
        departmentId: intOrNull(departmentId),
        department:  strOrNull(department),
        phone:       strOrNull(phone),
        nickname:    strOrNull(nickname),
        birthDate:   dateOrNull(birthDate),
        startDate:   dateOrNull(startDate),
      },
      select: LIST_SELECT,
    });

    res.status(201).json(success(user, 'สร้างผู้ใช้สำเร็จ'));
  } catch (err) {
    if (err.code === 'P2002') {
      const field = err.meta?.target?.includes('email') ? 'อีเมล' : 'รหัสพนักงาน';
      return res.status(409).json(error(`${field}นี้มีในระบบแล้ว`));
    }
    console.error('[POST /users]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── POST /api/auth/users/import  — นำเข้าจาก Excel (frontend-parsed JSON) ───
// Body: { users: [{ employeeId, name, email, role, position, department, phone, nickname }] }
// Default password: "password1234"
router.post('/users/import', auth, requireAdmin, async (req, res) => {
  try {
    const { users: rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0)
      return res.status(400).json(error('ไม่มีข้อมูลที่จะนำเข้า'));
    if (rows.length > 500)
      return res.status(400).json(error('นำเข้าได้ครั้งละไม่เกิน 500 รายการ'));

    const defaultHash = await bcrypt.hash('password1234', 10);
    const results = { success: 0, updated: 0, errors: [] };

    for (const row of rows) {
      const empId = String(row.employeeId ?? '').trim();
      const email = String(row.email ?? '').trim().toLowerCase();
      if (!empId || !row.name || !email) {
        results.errors.push({ row: empId || '?', reason: 'ขาด employeeId / name / email' });
        continue;
      }
      const role = VALID_ROLES.includes(row.role) ? row.role : 'staff';

      try {
        const existing = await prisma.user.findUnique({ where: { employeeId: empId } });
        if (existing) {
          await prisma.user.update({
            where: { employeeId: empId },
            data: {
              name:       String(row.name).trim(),
              role,
              position:   strOrNull(row.position),
              department: strOrNull(row.department),
              phone:      strOrNull(row.phone),
              nickname:   strOrNull(row.nickname),
            },
          });
          results.updated++;
        } else {
          await prisma.user.create({
            data: {
              employeeId: empId,
              name:       String(row.name).trim(),
              email,
              password:   defaultHash,
              role,
              position:   strOrNull(row.position),
              department: strOrNull(row.department),
              phone:      strOrNull(row.phone),
              nickname:   strOrNull(row.nickname),
            },
          });
          results.success++;
        }
      } catch (e) {
        results.errors.push({ row: empId, reason: e.message?.split('\n')[0] ?? 'error' });
      }
    }

    const msg = `นำเข้าสำเร็จ ${results.success} รายการ, อัปเดต ${results.updated} รายการ, ผิดพลาด ${results.errors.length} รายการ`;
    res.json(success(results, msg));
  } catch (err) {
    console.error('[POST /users/import]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── PUT /api/auth/users/:id  — แก้ไข (รับทุก field) ────────────────────────
router.put('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      name, email, role, position, isSuperAdmin, isActive,
      divisionId, workUnitId, departmentId,
      department, phone, nickname, birthDate, startDate,
    } = req.body;

    if (role && !VALID_ROLES.includes(role)) return res.status(400).json(error('role ไม่ถูกต้อง'));

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name         !== undefined && { name:         name.trim()                  }),
        ...(email        !== undefined && { email:        email.trim().toLowerCase()   }),
        ...(role         !== undefined && { role                                       }),
        ...(position     !== undefined && { position:     position || null             }),
        ...(isSuperAdmin !== undefined && { isSuperAdmin: isSuperAdmin === true || isSuperAdmin === 'true' }),
        ...(isActive     !== undefined && { isActive                                   }),
        ...(divisionId   !== undefined && { divisionId:  intOrNull(divisionId)        }),
        ...(workUnitId   !== undefined && { workUnitId:  intOrNull(workUnitId)        }),
        ...(departmentId !== undefined && { departmentId: intOrNull(departmentId)     }),
        ...(department   !== undefined && { department:  strOrNull(department)        }),
        ...(phone        !== undefined && { phone:       strOrNull(phone)             }),
        ...(nickname     !== undefined && { nickname:    strOrNull(nickname)          }),
        ...(birthDate    !== undefined && { birthDate:   dateOrNull(birthDate)        }),
        ...(startDate    !== undefined && { startDate:   dateOrNull(startDate)        }),
      },
      select: LIST_SELECT,
    });
    res.json(success(user, 'อัปเดตข้อมูลผู้ใช้สำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบผู้ใช้'));
    if (err.code === 'P2002') return res.status(409).json(error('อีเมลนี้มีในระบบแล้ว'));
    console.error('[PUT /users/:id]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── DELETE /api/auth/users/:id  — soft delete ───────────────────────────────
router.delete('/users/:id', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.id) return res.status(400).json(error('ไม่สามารถปิดการใช้งานบัญชีของตัวเองได้'));
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    res.json(success(null, 'ปิดการใช้งานผู้ใช้สำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบผู้ใช้'));
    console.error('[DELETE /users/:id]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─── PUT /api/auth/users/:id/reset-password ──────────────────────────────────
router.put('/users/:id/reset-password', auth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json(error('รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'));
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashed } });
    res.json(success(null, 'รีเซ็ตรหัสผ่านสำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบผู้ใช้'));
    console.error('[PUT /users/:id/reset-password]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// OAuth — LINE + Google
// ═════════════════════════════════════════════════════════════════════════════

const passport = require('../config/passport');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function oauthCallback(strategy) {
  return (req, res, next) => {
    passport.authenticate(strategy, { session: true }, (err, userInfo, info) => {
      if (err || !userInfo) {
        const code = info?.message || 'server_error';
        return res.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(code)}`);
      }
      res.redirect(`${FRONTEND_URL}/dashboard?token=${encodeURIComponent(userInfo.token)}`);
    })(req, res, next);
  };
}

// LINE
router.get('/line', passport.authenticate('line'));
router.get('/line/callback', oauthCallback('line'));

// Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', oauthCallback('google'));

module.exports = router;
