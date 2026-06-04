const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

const intId = (s) => parseInt(s, 10);

// Module admin: system admin/executive OR has EQUIPMENT ModulePermission
async function canManage(u) {
  if (u.isSuperAdmin || u.role === 'admin' || u.role === 'executive') return true;
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: u.id, module: 'EQUIPMENT' },
  });
  return !!perm;
}

// Save base64 image to disk, return URL
function saveImage(base64) {
  const data  = base64.replace(/^data:image\/\w+;base64,/, '');
  const match = base64.match(/^data:image\/(\w+);/);
  const ext   = match ? `.${match[1]}` : '.jpg';
  const name  = `eq_${Date.now()}_${Math.random().toString(36).slice(2,6)}${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'equipment');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/equipment/${name}`;
}

// Accept single base64 or array of base64; return JSON-string of URL array
function processImages(images) {
  if (!images) return null;
  const arr = Array.isArray(images) ? images : [images];
  const urls = arr.map(img => {
    if (!img) return null;
    if (img.startsWith('/uploads/') || img.startsWith('http')) return img;
    if (img.startsWith('data:image/')) return saveImage(img);
    return null;
  }).filter(Boolean);
  return urls.length ? JSON.stringify(urls) : null;
}

const EQ_SELECT = {
  category:    { select: { id: true, name: true } },
};
const EQ_FULL = {
  category:    { select: { id: true, name: true } },
  borrows: {
    include: {
      borrower: { select: { id: true, name: true, employeeId: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  },
  inspections: {
    include: { inspector: { select: { id: true, name: true } } },
    orderBy: { inspectDate: 'desc' },
    take: 20,
  },
  repairTickets: {
    include: {
      reporter:    { select: { id: true, name: true } },
      assignments: { include: { technician: { select: { id: true, name: true } } }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  },
};

// ─── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', auth, async (req, res, next) => {
  try {
    const all = await canManage(req.user) || req.query.all === 'true';
    const cats = await prisma.equipmentCategory.findMany({
      where:   all ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { equipments: true } } },
    });
    res.json(success(cats));
  } catch (e) { next(e); }
});

router.post('/categories', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json(error('กรุณาระบุชื่อหมวดหมู่'));
    const cat = await prisma.equipmentCategory.create({
      data: { name: name.trim(), description: description || null },
      include: { _count: { select: { equipments: true } } },
    });
    res.status(201).json(success(cat, 'เพิ่มหมวดหมู่สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหมวดหมู่นี้มีอยู่แล้ว'));
    next(e);
  }
});

router.put('/categories/:id', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, description, isActive } = req.body;
    const cat = await prisma.equipmentCategory.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(name        !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description }),
        ...(isActive    !== undefined && { isActive }),
      },
      include: { _count: { select: { equipments: true } } },
    });
    res.json(success(cat, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบหมวดหมู่'));
    if (e.code === 'P2002') return res.status(409).json(error('ชื่อหมวดหมู่นี้มีอยู่แล้ว'));
    next(e);
  }
});

router.delete('/categories/:id', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const id = intId(req.params.id);
    const count = await prisma.equipment.count({ where: { categoryId: id } });
    if (count > 0) return res.status(400).json(error(`มีครุภัณฑ์ใช้หมวดหมู่นี้อยู่ ${count} รายการ`));
    await prisma.equipmentCategory.delete({ where: { id } });
    res.json(success(null, 'ลบหมวดหมู่สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบหมวดหมู่'));
    next(e);
  }
});

// ─── Borrows ──────────────────────────────────────────────────────────────────

router.get('/borrows', auth, async (req, res, next) => {
  try {
    const { status, userId, equipmentId, page = 1, limit = 30 } = req.query;
    const where = {};
    if (status)      where.status      = status;
    if (userId)      where.borrowerId  = intId(userId);
    if (equipmentId) where.equipmentId = intId(equipmentId);
    if (!await canManage(req.user)) where.borrowerId = req.user.id;

    const skip = (intId(page) - 1) * intId(limit);
    const [data, total] = await Promise.all([
      prisma.equipmentBorrow.findMany({
        where, skip, take: intId(limit),
        include: {
          equipment: { select: { id: true, code: true, name: true, department: true } },
          borrower:  { select: { id: true, name: true, employeeId: true } },
          approver:  { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.equipmentBorrow.count({ where }),
    ]);
    res.json(paginate(data, total, page, limit));
  } catch (e) { next(e); }
});

router.post('/borrows', auth, async (req, res, next) => {
  try {
    const { equipmentId, purpose, borrowDate, dueDate, note } = req.body;
    if (!equipmentId || !purpose?.trim() || !borrowDate || !dueDate) {
      return res.status(400).json(error('กรุณากรอกข้อมูลให้ครบ'));
    }
    const eq = await prisma.equipment.findUnique({ where: { id: intId(equipmentId) } });
    if (!eq)                   return res.status(404).json(error('ไม่พบครุภัณฑ์'));
    if (eq.status !== 'active') return res.status(400).json(error('ครุภัณฑ์นี้ไม่พร้อมให้ยืม'));

    const borrow = await prisma.equipmentBorrow.create({
      data: {
        equipmentId: intId(equipmentId),
        borrowerId:  req.user.id,
        purpose:     purpose.trim(),
        borrowDate:  new Date(borrowDate),
        dueDate:     new Date(dueDate),
        note:        note?.trim() || null,
        status:      'pending',
      },
    });
    res.status(201).json(success(borrow, 'ส่งคำขอยืมสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/borrows/:id/approve', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const borrow = await prisma.equipmentBorrow.findUnique({ where: { id: intId(req.params.id) } });
    if (!borrow)                  return res.status(404).json(error('ไม่พบรายการยืม'));
    if (borrow.status !== 'pending') return res.status(400).json(error('สถานะไม่ถูกต้อง'));

    await prisma.$transaction([
      prisma.equipmentBorrow.update({
        where: { id: intId(req.params.id) },
        data:  { status: 'approved', approverId: req.user.id },
      }),
      prisma.equipment.update({ where: { id: borrow.equipmentId }, data: { status: 'borrowed' } }),
    ]);
    res.json(success(null, 'อนุมัติสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/borrows/:id/reject', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { note } = req.body;
    const borrow = await prisma.equipmentBorrow.findUnique({ where: { id: intId(req.params.id) } });
    if (!borrow)                  return res.status(404).json(error('ไม่พบรายการยืม'));
    if (borrow.status !== 'pending') return res.status(400).json(error('สถานะไม่ถูกต้อง'));

    await prisma.equipmentBorrow.update({
      where: { id: intId(req.params.id) },
      data:  { status: 'rejected', approverId: req.user.id, note: note?.trim() || null },
    });
    res.json(success(null, 'ปฏิเสธสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/borrows/:id/return', auth, async (req, res, next) => {
  try {
    const { condition, note } = req.body;
    const borrow = await prisma.equipmentBorrow.findUnique({ where: { id: intId(req.params.id) } });
    if (!borrow) return res.status(404).json(error('ไม่พบรายการยืม'));
    if (!['approved', 'overdue'].includes(borrow.status)) return res.status(400).json(error('สถานะไม่ถูกต้อง'));
    if (borrow.borrowerId !== req.user.id && !await canManage(req.user)) return res.status(403).json(error('ไม่มีสิทธิ์'));

    await prisma.$transaction([
      prisma.equipmentBorrow.update({
        where: { id: intId(req.params.id) },
        data:  { status: 'returned', returnDate: new Date(), condition: condition || null, note: note?.trim() || null },
      }),
      prisma.equipment.update({ where: { id: borrow.equipmentId }, data: { status: 'active' } }),
    ]);
    res.json(success(null, 'บันทึกการคืนสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Inspections ──────────────────────────────────────────────────────────────

router.post('/inspections', auth, async (req, res, next) => {
  try {
    const { equipmentId, inspectDate, condition, note, image } = req.body;
    if (!equipmentId || !inspectDate || !condition) {
      return res.status(400).json(error('กรุณากรอกข้อมูลให้ครบ'));
    }
    const ins = await prisma.equipmentInspection.create({
      data: {
        equipmentId: intId(equipmentId),
        inspectorId: req.user.id,
        inspectDate: new Date(inspectDate),
        condition,
        note:  note?.trim() || null,
        image: image || null,
      },
    });
    if (condition === 'damaged')  await prisma.equipment.update({ where: { id: intId(equipmentId) }, data: { status: 'damaged'  } });
    if (condition === 'disposed') await prisma.equipment.update({ where: { id: intId(equipmentId) }, data: { status: 'disposed' } });
    res.status(201).json(success(ins, 'บันทึกการตรวจสอบสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── Summary ──────────────────────────────────────────────────────────────────

router.get('/summary', auth, async (req, res, next) => {
  try {
    const counts = await prisma.equipment.groupBy({ by: ['status'], _count: true });
    const total  = await prisma.equipment.count();
    const map    = Object.fromEntries(counts.map((c) => [c.status, c._count]));
    res.json(success({ total, ...map }));
  } catch (e) { next(e); }
});

// ─── Equipment CRUD ───────────────────────────────────────────────────────────

router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, status, search, department } = req.query;
    const skip  = (intId(page) - 1) * intId(limit);
    const where = {};
    if (category)   where.categoryId = intId(category);
    if (status)     where.status     = status;
    if (department) where.department = { contains: department };
    if (search) {
      where.OR = [
        { name:         { contains: search } },
        { code:         { contains: search } },
        { serialNumber: { contains: search } },
        { brand:        { contains: search } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.equipment.findMany({
        where, skip, take: intId(limit),
        include: EQ_SELECT,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.equipment.count({ where }),
    ]);
    res.json(paginate(data, total, page, limit));
  } catch (e) { next(e); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { code, name, categoryId, brand, model, serialNumber, department, room,
            price, acquiredDate, source, images, image, note } = req.body;
    if (!code?.trim() || !name?.trim() || !categoryId || !department?.trim()) {
      return res.status(400).json(error('กรุณากรอก รหัส ชื่อ หมวดหมู่ และแผนก'));
    }
    // images (array) takes priority over single image
    const imgJson = processImages(images ?? (image ? [image] : null));
    const item = await prisma.equipment.create({
      data: {
        code: code.trim(), name: name.trim(), categoryId: intId(categoryId),
        brand: brand || null, model: model || null, serialNumber: serialNumber || null,
        department: department.trim(), room: room || null,
        price:        price        ? String(price) : null,
        acquiredDate: acquiredDate ? new Date(acquiredDate) : null,
        source: source || null, image: imgJson, note: note || null,
      },
      include: EQ_SELECT,
    });
    res.status(201).json(success(item, 'เพิ่มครุภัณฑ์สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json(error('รหัสครุภัณฑ์ซ้ำ'));
    next(e);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const item = await prisma.equipment.findUnique({
      where:   { id: intId(req.params.id) },
      include: EQ_FULL,
    });
    if (!item) return res.status(404).json(error('ไม่พบครุภัณฑ์'));
    res.json(success(item));
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, categoryId, brand, model, serialNumber, department, room,
            price, acquiredDate, source, status, images, image, note } = req.body;
    const imgJson = (images !== undefined || image !== undefined)
      ? processImages(images ?? (image ? [image] : null))
      : undefined;
    const item = await prisma.equipment.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(name         && { name }),
        ...(categoryId   && { categoryId: intId(categoryId) }),
        ...(brand        !== undefined && { brand:        brand || null }),
        ...(model        !== undefined && { model:        model || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(department   && { department }),
        ...(room         !== undefined && { room:         room || null }),
        ...(price        !== undefined && { price:        price ? String(price) : null }),
        ...(acquiredDate !== undefined && { acquiredDate: acquiredDate ? new Date(acquiredDate) : null }),
        ...(source       !== undefined && { source:       source || null }),
        ...(status       && { status }),
        ...(imgJson      !== undefined && { image: imgJson }),
        ...(note         !== undefined && { note:  note || null }),
      },
      include: EQ_SELECT,
    });
    res.json(success(item, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบครุภัณฑ์'));
    next(e);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (!await canManage(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    await prisma.equipment.update({
      where: { id: intId(req.params.id) },
      data:  { status: 'disposed' },
    });
    res.json(success(null, 'ลบครุภัณฑ์สำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบครุภัณฑ์'));
    next(e);
  }
});

module.exports = router;
