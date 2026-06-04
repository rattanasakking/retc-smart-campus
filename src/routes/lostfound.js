const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');
const { notifyLostFound } = require('../services/line');

const router = express.Router();
const prisma = new PrismaClient();

// ── Save base64 image to disk, return URL ────────────────────────────────────
function saveImage(base64, prefix = 'lf') {
  if (!base64) return null;
  if (base64.startsWith('/uploads/') || base64.startsWith('http')) return base64;
  const data  = base64.replace(/^data:image\/\w+;base64,/, '');
  const match = base64.match(/^data:image\/(\w+);/);
  const ext   = match ? `.${match[1]}` : '.jpg';
  const name  = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'lostfound');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/lostfound/${name}`;
}

const canAdmin = (u) => u.isSuperAdmin || u.role === 'admin' || u.role === 'executive';

const INCLUDE_FULL = {
  reporter: { select: { id: true, name: true, employeeId: true, department: true } },
  claimer:  { select: { id: true, name: true, employeeId: true } },
  category: { select: { id: true, name: true } },
};

// optional auth — attaches req.user if token present but doesn't block
function optionalAuth(req, res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    const jwt = require('jsonwebtoken');
    try { req.user = jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lostfound/categories  — public (active only) | admin gets all
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const showAll = req.user && canAdmin(req.user);
    const cats = await prisma.lostFoundCategory.findMany({
      where:   showAll ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(success(cats));
  } catch (err) {
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lostfound/categories  — admin
// ─────────────────────────────────────────────────────────────────────────────
router.post('/categories', auth, async (req, res) => {
  if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อประเภท'));
    const cat = await prisma.lostFoundCategory.create({ data: { name: name.trim() } });
    res.status(201).json(success(cat, 'เพิ่มประเภทสำเร็จ'));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json(error('ชื่อประเภทนี้มีอยู่แล้ว'));
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/lostfound/categories/:id  — admin
// ─────────────────────────────────────────────────────────────────────────────
router.put('/categories/:id', auth, async (req, res) => {
  if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
  try {
    const { name, isActive } = req.body;
    const cat = await prisma.lostFoundCategory.update({
      where: { id: parseInt(req.params.id, 10) },
      data: {
        ...(name     !== undefined && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    res.json(success(cat, 'แก้ไขสำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบประเภท'));
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/lostfound/categories/:id  — admin
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/categories/:id', auth, async (req, res) => {
  if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
  try {
    await prisma.lostFoundCategory.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json(success(null, 'ลบประเภทสำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบประเภท'));
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lostfound/report  (admin)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/report', auth, async (req, res) => {
  if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
  try {
    const { month, year, categoryId } = req.query;

    const where = {};
    if (categoryId) where.categoryId = parseInt(categoryId, 10);
    if (year) {
      const y = parseInt(year, 10);
      const m = month ? parseInt(month, 10) - 1 : 0;
      if (month) {
        where.createdAt = { gte: new Date(y, m, 1), lt: new Date(y, m + 1, 1) };
      } else {
        where.createdAt = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    const [total, claimed, items, byCategory] = await Promise.all([
      prisma.lostFoundItem.count({ where }),
      prisma.lostFoundItem.count({ where: { ...where, status: 'claimed' } }),
      prisma.lostFoundItem.findMany({ where, orderBy: { createdAt: 'desc' }, include: INCLUDE_FULL }),
      prisma.lostFoundItem.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),
    ]);

    const currentYear = parseInt(year || new Date().getFullYear(), 10);
    const monthly = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        prisma.lostFoundItem.count({
          where: { createdAt: { gte: new Date(currentYear, i, 1), lt: new Date(currentYear, i + 1, 1) } },
        })
      )
    );

    res.json(success({ total, claimed, unclaimed: total - claimed, items, byCategory, monthly }));
  } catch (err) {
    console.error('[GET /lostfound/report]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lostfound  (public — optional auth)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
    const limit = Math.min(100, parseInt(req.query.limit || '20', 10));
    const skip  = (page - 1) * limit;

    const where = {
      ...(req.query.type       && { type:       req.query.type }),
      ...(req.query.status     && { status:     req.query.status }),
      ...(req.query.categoryId && { categoryId: parseInt(req.query.categoryId, 10) }),
      ...(req.query.search     && {
        OR: [
          { title:         { contains: req.query.search } },
          { description:   { contains: req.query.search } },
          { foundLocation: { contains: req.query.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.lostFoundItem.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: INCLUDE_FULL }),
      prisma.lostFoundItem.count({ where }),
    ]);

    res.json(paginate(items, total, page, limit));
  } catch (err) {
    console.error('[GET /lostfound]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lostfound/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const item = await prisma.lostFoundItem.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: INCLUDE_FULL,
    });
    if (!item) return res.status(404).json(error('ไม่พบรายการ'));
    res.json(success(item));
  } catch (err) {
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/lostfound  (auth)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { type, title, description, categoryId, foundDate, foundLocation,
            image, gpsLat, gpsLng, note } = req.body;

    if (!type || !['lost', 'found'].includes(type))
      return res.status(400).json(error('type ต้องเป็น lost หรือ found'));
    if (!title?.trim())
      return res.status(400).json(error('กรุณาระบุชื่อของ'));

    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${today.getFullYear()}${pad(today.getMonth()+1)}${pad(today.getDate())}`;
    const countToday = await prisma.lostFoundItem.count({
      where: {
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt:  new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        },
      },
    });
    const refNo = `LOST-${dateStr}-${String(countToday + 1).padStart(3, '0')}`;

    const item = await prisma.lostFoundItem.create({
      data: {
        refNo,
        type,
        title:         title.trim(),
        description:   description || null,
        categoryId:    categoryId  ? parseInt(categoryId, 10) : null,
        foundDate:     foundDate   ? new Date(foundDate)      : null,
        foundLocation: foundLocation || null,
        image:         saveImage(image),
        gpsLat:        gpsLat  || null,
        gpsLng:        gpsLng  || null,
        note:          note    || null,
        reporterId:    req.user.id,
        status:        'found',
      },
      include: INCLUDE_FULL,
    });

    notifyLostFound(item).catch(() => {});
    res.status(201).json(success(item, 'บันทึกสำเร็จ'));
  } catch (err) {
    console.error('[POST /lostfound]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/lostfound/:id/claim  — บันทึกการรับของคืน (auth)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/claim', auth, async (req, res) => {
  try {
    const id   = parseInt(req.params.id, 10);
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item)                   return res.status(404).json(error('ไม่พบรายการ'));
    if (item.status !== 'found') return res.status(400).json(error('รายการนี้ไม่สามารถรับคืนได้'));

    const { claimedByName, claimedPhone, claimedIdCard, claimedPhoto, note } = req.body;
    if (!claimedByName?.trim()) return res.status(400).json(error('กรุณาระบุชื่อผู้มารับ'));
    if (!claimedPhone?.trim())  return res.status(400).json(error('กรุณาระบุเบอร์โทร'));
    if (!claimedIdCard?.trim()) return res.status(400).json(error('กรุณาระบุเลขบัตรประชาชน'));

    const updated = await prisma.lostFoundItem.update({
      where: { id },
      data: {
        status:        'claimed',
        claimedBy:     req.user.id,
        claimedAt:     new Date(),
        claimedByName: claimedByName.trim(),
        claimedPhone:  claimedPhone.trim(),
        claimedIdCard: claimedIdCard.trim(),
        claimedPhoto:  saveImage(claimedPhoto, 'claim'),
        ...(note !== undefined && { note: note || null }),
      },
      include: INCLUDE_FULL,
    });

    res.json(success(updated, 'บันทึกการรับคืนสำเร็จ'));
  } catch (err) {
    console.error('[PUT /lostfound/:id/claim]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/lostfound/:id  — owner / admin แก้ไข
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const id   = parseInt(req.params.id, 10);
    const item = await prisma.lostFoundItem.findUnique({ where: { id } });
    if (!item) return res.status(404).json(error('ไม่พบรายการ'));

    const isOwner = item.reporterId === req.user.id;
    const isAdm   = canAdmin(req.user);
    if (!isOwner && !isAdm) return res.status(403).json(error('ไม่มีสิทธิ์แก้ไข'));

    const { title, description, categoryId, foundDate, foundLocation,
            image, gpsLat, gpsLng, status, note } = req.body;

    const updated = await prisma.lostFoundItem.update({
      where: { id },
      data: {
        ...(title         !== undefined && { title: title.trim() }),
        ...(description   !== undefined && { description: description || null }),
        ...(categoryId    !== undefined && { categoryId: categoryId ? parseInt(categoryId, 10) : null }),
        ...(foundDate     !== undefined && { foundDate: foundDate ? new Date(foundDate) : null }),
        ...(foundLocation !== undefined && { foundLocation: foundLocation || null }),
        ...(image         !== undefined && { image: saveImage(image) }),
        ...(gpsLat        !== undefined && { gpsLat: gpsLat || null }),
        ...(gpsLng        !== undefined && { gpsLng: gpsLng || null }),
        ...(note          !== undefined && { note: note || null }),
        ...(status        !== undefined && isAdm && { status }),
      },
      include: INCLUDE_FULL,
    });

    res.json(success(updated, 'แก้ไขสำเร็จ'));
  } catch (err) {
    console.error('[PUT /lostfound/:id]', err);
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/lostfound/:id  — admin
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  if (!canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.lostFoundItem.delete({ where: { id } });
    res.json(success(null, 'ลบสำเร็จ'));
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json(error('ไม่พบรายการ'));
    res.status(500).json(error('เกิดข้อผิดพลาดในระบบ', 500));
  }
});

module.exports = router;
