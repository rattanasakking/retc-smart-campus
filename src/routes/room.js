const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');
const { notify } = require('../services/line');

const router = express.Router();
const prisma = new PrismaClient();

function saveRoomImage(base64) {
  const data  = base64.replace(/^data:image\/\w+;base64,/, '');
  const match = base64.match(/^data:image\/(\w+);/);
  const ext   = match ? `.${match[1]}` : '.jpg';
  const name  = `room_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'rooms');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/rooms/${name}`;
}

function processRoomImage(image) {
  if (!image) return null;
  if (image.startsWith('/uploads/') || image.startsWith('http')) return image;
  if (image.startsWith('data:image/')) return saveRoomImage(image);
  return image; // assume URL
}

const intId    = (s) => parseInt(s, 10);
async function canAdmin(u) {
  if (u.isSuperAdmin || u.role === 'admin' || u.role === 'executive') return true;
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: u.id, module: 'ROOM_BOOKING' },
  });
  return !!perm;
}

const BOOKING_INC = {
  room:      { select: { id: true, name: true, capacity: true, requireApproval: true, image: true } },
  user:      { select: { id: true, name: true, department: true } },
  approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
};

function lineMsg(booking, type) {
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dt     = new Date(booking.startTime);
  const de     = new Date(booking.endTime);
  const dateS  = `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
  const timeS  = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')} - ${String(de.getHours()).padStart(2,'0')}:${String(de.getMinutes()).padStart(2,'0')} น.`;

  if (type === 'request') {
    return [
      '\n🚪 ขอจองห้องประชุม',
      '━━━━━━━━━━━━━━',
      `🏢 ห้อง: ${booking.room?.name ?? '-'}`,
      `📅 วันที่: ${dateS}`,
      `⏰ เวลา: ${timeS}`,
      `👤 ผู้จอง: ${booking.user?.name ?? '-'}`,
      `📝 หัวข้อ: ${booking.title}`,
      booking.attendees ? `👥 จำนวน: ${booking.attendees} คน` : null,
      '━━━━━━━━━━━━━━',
      '👉 กรุณาอนุมัติการจอง',
      `🔗 https://app.retc.ac.th/room`,
    ].filter(Boolean).join('\n');
  }
  if (type === 'approved') {
    return `\n✅ อนุมัติการจองห้องประชุม\n🏢 ห้อง: ${booking.room?.name}\n📅 ${dateS}  ⏰ ${timeS}\n👤 ${booking.user?.name}`;
  }
  if (type === 'rejected') {
    return `\n❌ ปฏิเสธการจองห้องประชุม\n🏢 ห้อง: ${booking.room?.name}\n📅 ${dateS}  ⏰ ${timeS}\n👤 ${booking.user?.name}`;
  }
  return '';
}

// ─── Room Status ─────────────────────────────────────────────────────────────

// GET /api/room/status  — all rooms with busy flag + upcoming bookings
router.get('/status', auth, async (req, res, next) => {
  try {
    const now   = new Date();
    const limit = new Date(now); limit.setDate(limit.getDate() + 14);

    const rooms = await prisma.room.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });

    const upcoming = await prisma.roomBooking.findMany({
      where: {
        status:    { in: ['pending', 'approved'] },
        endTime:   { gt: now },
        startTime: { lte: limit },
      },
      orderBy: { startTime: 'asc' },
      include: { room: { select: { id: true } } },
    });

    const data = rooms.map((room) => {
      const roomBookings = upcoming.filter((b) => b.roomId === room.id);
      const isBusy = roomBookings.some((b) => b.startTime <= now && b.endTime >= now && b.status === 'approved');
      return {
        ...room,
        isBusy,
        upcomingBookings: roomBookings.slice(0, 5).map((b) => ({
          id: b.id, title: b.title, startTime: b.startTime, endTime: b.endTime, status: b.status,
        })),
      };
    });

    res.json(success(data));
  } catch (e) { next(e); }
});

// ─── Rooms ────────────────────────────────────────────────────────────────────

router.get('/rooms', auth, async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } });
    res.json(success(rooms));
  } catch (e) { next(e); }
});

router.get('/rooms/all', auth, async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } });
    res.json(success(rooms));
  } catch (e) { next(e); }
});

router.post('/rooms', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, capacity, facilities, image, requireApproval, note } = req.body;
    if (!name?.trim() || !capacity) return res.status(400).json(error('กรุณากรอกชื่อและความจุ'));
    const room = await prisma.room.create({
      data: {
        name:            name.trim(),
        capacity:        intId(capacity),
        facilities:      facilities ? JSON.stringify(Array.isArray(facilities) ? facilities : [facilities]) : null,
        image:           processRoomImage(image),
        requireApproval: !!requireApproval,
        note:            note?.trim() || null,
        status:          'active',
      },
    });
    res.status(201).json(success(room, 'เพิ่มห้องสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/rooms/:id', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, capacity, facilities, image, requireApproval, status, note } = req.body;
    const room = await prisma.room.update({
      where: { id: intId(req.params.id) },
      data: {
        ...(name            !== undefined && { name: name.trim() }),
        ...(capacity        !== undefined && { capacity: intId(capacity) }),
        ...(facilities      !== undefined && { facilities: facilities ? JSON.stringify(Array.isArray(facilities) ? facilities : [facilities]) : null }),
        ...(image           !== undefined && { image: processRoomImage(image) }),
        ...(requireApproval !== undefined && { requireApproval: !!requireApproval }),
        ...(status          !== undefined && { status }),
        ...(note            !== undefined && { note: note?.trim() || null }),
      },
    });
    res.json(success(room, 'แก้ไขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบห้อง'));
    next(e);
  }
});

router.delete('/rooms/:id', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const id = intId(req.params.id);
    const bookingCount = await prisma.roomBooking.count({
      where: { roomId: id, status: { in: ['pending', 'approved'] } },
    });
    if (bookingCount > 0) {
      return res.status(400).json(error(`มีการจองที่ยังค้างอยู่ ${bookingCount} รายการ ไม่สามารถลบได้`));
    }
    await prisma.room.delete({ where: { id } });
    res.json(success(null, 'ลบห้องสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบห้อง'));
    next(e);
  }
});

// ─── Calendar ─────────────────────────────────────────────────────────────────

router.get('/calendar', auth, async (req, res, next) => {
  try {
    const { roomId, startDate, endDate } = req.query;
    const where = {
      status:    { in: ['pending', 'approved'] },
      startTime: { gte: new Date(startDate || new Date()) },
      endTime:   { lte: new Date(endDate   || new Date(Date.now() + 7 * 86400000)) },
    };
    if (roomId) where.roomId = intId(roomId);
    const bookings = await prisma.roomBooking.findMany({
      where,
      include: { user: { select: { id: true, name: true } }, room: { select: { id: true, name: true } } },
      orderBy: { startTime: 'asc' },
    });
    res.json(success(bookings));
  } catch (e) { next(e); }
});

// ─── Report ───────────────────────────────────────────────────────────────────

router.get('/report', auth, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const y = year  ? intId(year)  - 543 : new Date().getFullYear();
    const m = month ? intId(month) - 1   : new Date().getMonth();
    const start = new Date(y, m, 1);
    const end   = new Date(y, m + 1, 0, 23, 59, 59);

    const rooms = await prisma.room.findMany({ where: { status: 'active' }, orderBy: { name: 'asc' } });
    const results = [];
    let totalBookings = 0, totalHours = 0;

    for (const room of rooms) {
      const bks = await prisma.roomBooking.findMany({
        where: { roomId: room.id, startTime: { gte: start }, endTime: { lte: end }, status: { in: ['approved', 'completed'] } },
      });
      const hrs = bks.reduce((s, b) => s + (new Date(b.endTime) - new Date(b.startTime)) / 3600000, 0);
      totalBookings += bks.length;
      totalHours    += hrs;
      results.push({ id: room.id, name: room.name, capacity: room.capacity, bookings: bks.length, hours: Math.round(hrs * 10) / 10 });
    }

    // Estimate available hours: Mon-Fri, 8-18 = 10h/day
    let workDays = 0;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const day = new Date(y, m, d).getDay();
      if (day !== 0 && day !== 6) workDays++;
    }
    const availableHoursPerRoom = workDays * 10;

    res.json(success({
      period: { year: y + 543, month: m + 1 },
      rooms:  results.map((r) => ({ ...r, utilization: availableHoursPerRoom > 0 ? Math.round((r.hours / availableHoursPerRoom) * 100) : 0 })),
      total:  { bookings: totalBookings, hours: Math.round(totalHours * 10) / 10 },
    }));
  } catch (e) { next(e); }
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.get('/bookings', auth, async (req, res, next) => {
  try {
    const { date, roomId, userId, status, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (roomId) where.roomId = intId(roomId);
    if (userId) where.userId = intId(userId);
    if (!await canAdmin(req.user)) where.userId = req.user.id;
    if (date) {
      const d = new Date(date);
      where.startTime = { gte: d, lt: new Date(d.getTime() + 86400000) };
    }
    const skip = (intId(page) - 1) * intId(limit);
    const [data, total] = await Promise.all([
      prisma.roomBooking.findMany({ where, skip, take: intId(limit), include: BOOKING_INC, orderBy: { startTime: 'desc' } }),
      prisma.roomBooking.count({ where }),
    ]);
    res.json(paginate(data, total, page, limit));
  } catch (e) { next(e); }
});

router.post('/bookings', auth, async (req, res, next) => {
  try {
    const { roomId, title, attendees, startTime, endTime, equipmentNeeded, purpose } = req.body;
    if (!roomId || !title?.trim() || !startTime || !endTime) {
      return res.status(400).json(error('กรุณากรอก ห้อง หัวข้อ เวลาเริ่ม-สิ้นสุด'));
    }
    const room = await prisma.room.findUnique({ where: { id: intId(roomId) } });
    if (!room)                  return res.status(404).json(error('ไม่พบห้อง'));
    if (room.status !== 'active') return res.status(400).json(error('ห้องไม่พร้อมใช้งาน'));

    const start = new Date(startTime);
    const end   = new Date(endTime);
    if (end <= start) return res.status(400).json(error('เวลาสิ้นสุดต้องหลังเวลาเริ่ม'));

    const conflict = await prisma.roomBooking.findFirst({
      where: { roomId: intId(roomId), status: { in: ['pending','approved'] }, AND: [{ startTime: { lt: end } }, { endTime: { gt: start } }] },
      include: { user: { select: { name: true } } },
    });
    if (conflict) return res.status(409).json(error(`ห้องถูกจองในช่วงเวลานี้แล้ว (${conflict.user.name})`));

    const status  = room.requireApproval ? 'pending' : 'approved';
    const booking = await prisma.roomBooking.create({
      data: {
        roomId:          intId(roomId), userId: req.user.id, title: title.trim(),
        attendees:       attendees ? intId(attendees) : null,
        startTime: start, endTime: end,
        equipmentNeeded: equipmentNeeded?.length ? JSON.stringify(equipmentNeeded) : null,
        purpose:         purpose?.trim() || null,
        status,
      },
      include: BOOKING_INC,
    });

    if (room.requireApproval) notify(lineMsg(booking, 'request')).catch(() => {});
    res.status(201).json(success(booking, room.requireApproval ? 'ส่งคำขอจองสำเร็จ รอการอนุมัติ' : 'จองห้องสำเร็จ'));
  } catch (e) { next(e); }
});

router.get('/bookings/:id', auth, async (req, res, next) => {
  try {
    const b = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) }, include: BOOKING_INC });
    if (!b) return res.status(404).json(error('ไม่พบการจอง'));
    res.json(success(b));
  } catch (e) { next(e); }
});

router.put('/bookings/:id/cancel', auth, async (req, res, next) => {
  try {
    const b = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) } });
    if (!b) return res.status(404).json(error('ไม่พบการจอง'));
    if (b.userId !== req.user.id && !await canAdmin(req.user)) return res.status(403).json(error('ไม่มีสิทธิ์'));
    if (!['pending','approved'].includes(b.status)) return res.status(400).json(error('ไม่สามารถยกเลิกได้'));
    await prisma.roomBooking.update({ where: { id: intId(req.params.id) }, data: { status: 'cancelled' } });
    res.json(success(null, 'ยกเลิกการจองสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/bookings/:id/approve', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { note } = req.body;
    const b = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) } });
    if (!b) return res.status(404).json(error('ไม่พบการจอง'));
    if (b.status !== 'pending') return res.status(400).json(error('สถานะไม่ถูกต้อง'));
    await prisma.$transaction([
      prisma.roomBooking.update({ where: { id: intId(req.params.id) }, data: { status: 'approved' } }),
      prisma.roomBookingApproval.create({ data: { bookingId: intId(req.params.id), approverId: req.user.id, status: 'approved', note: note?.trim() || null } }),
    ]);
    const updated = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) }, include: BOOKING_INC });
    notify(lineMsg(updated, 'approved')).catch(() => {});
    res.json(success(null, 'อนุมัติสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/bookings/:id/reject', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { note } = req.body;
    const b = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) } });
    if (!b) return res.status(404).json(error('ไม่พบการจอง'));
    if (b.status !== 'pending') return res.status(400).json(error('สถานะไม่ถูกต้อง'));
    await prisma.$transaction([
      prisma.roomBooking.update({ where: { id: intId(req.params.id) }, data: { status: 'rejected' } }),
      prisma.roomBookingApproval.create({ data: { bookingId: intId(req.params.id), approverId: req.user.id, status: 'rejected', note: note?.trim() || null } }),
    ]);
    const updated = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) }, include: BOOKING_INC });
    notify(lineMsg(updated, 'rejected')).catch(() => {});
    res.json(success(null, 'ปฏิเสธสำเร็จ'));
  } catch (e) { next(e); }
});

module.exports = router;
