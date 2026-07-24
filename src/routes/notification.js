const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications — รายการแจ้งเตือนของฉัน + จำนวนที่ยังไม่อ่าน
router.get('/', auth, async (req, res, next) => {
  try {
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
    ]);
    res.json(success({ items, unread }));
  } catch (e) { next(e); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', auth, async (req, res, next) => {
  try {
    const unread = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json(success({ unread }));
  } catch (e) { next(e); }
});

// PUT /api/notifications/read-all
router.put('/read-all', auth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json(success(null, 'อ่านทั้งหมดแล้ว'));
  } catch (e) { next(e); }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id, 10), userId: req.user.id },
      data: { isRead: true },
    });
    res.json(success(null));
  } catch (e) { next(e); }
});

// DELETE /api/notifications/:id
router.delete('/:id', auth, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({ where: { id: parseInt(req.params.id, 10), userId: req.user.id } });
    res.json(success(null, 'ลบแล้ว'));
  } catch (e) { next(e); }
});

module.exports = router;
