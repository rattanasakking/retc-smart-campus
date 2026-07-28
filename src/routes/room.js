const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');
const { sendRoomBookingRequestFlex, sendRoomBookingStatusFlex, pushMessage } = require('../services/line');
const { sendRoomBookingRequestEmail, sendRoomBookingApprovedEmail, sendRoomBookingRejectedEmail, sendMail } = require('../services/email');
const { notifyUsers, isEventEnabled } = require('../services/notification');

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
const intOrNull = (v) => (v !== undefined && v !== null && v !== '') ? parseInt(v, 10) : null;

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function bookingWhen(b) {
  const dt = new Date(b.startTime), de = new Date(b.endTime);
  const p = (n) => String(n).padStart(2, '0');
  return {
    dateS: `${dt.getDate()} ${MONTHS_TH[dt.getMonth()]} ${dt.getFullYear() + 543}`,
    timeS: `${p(dt.getHours())}:${p(dt.getMinutes())} - ${p(de.getHours())}:${p(de.getMinutes())} น.`,
  };
}

/** แจ้งเตือนผู้ดูแลห้อง (ถ้ากำหนดไว้) เมื่อมีการจอง */
async function notifyRoomManager(booking) {
  if (!await isEventEnabled('room.manager')) return;
  const managerId = booking.room?.managerId;
  if (!managerId) return;
  const mgr = await prisma.user.findUnique({ where: { id: managerId }, select: { name: true, lineUserId: true } });
  if (!mgr) return;
  const { dateS, timeS } = bookingWhen(booking);
  const statusTh = booking.status === 'approved' ? 'อนุมัติแล้ว' : 'รออนุมัติ';
  const text = [
    '\n🏢 มีการจองห้องที่คุณดูแล',
    '━━━━━━━━━━━━━━',
    `🏠 ห้อง: ${booking.room?.name ?? '-'}`,
    `📅 ${dateS}`,
    `⏰ ${timeS}`,
    `👤 ผู้จอง: ${booking.user?.name ?? '-'}${booking.user?.department ? ` (${booking.user.department})` : ''}`,
    `📝 ${booking.title}`,
    booking.attendees ? `👥 ${booking.attendees} คน` : null,
    `📌 สถานะ: ${statusTh}`,
  ].filter(Boolean).join('\n');
  if (mgr.lineUserId) pushMessage(mgr.lineUserId, [{ type: 'text', text }]).catch(() => {});
  notifyUsers([managerId], {
    title: `🏢 มีการจองห้องที่คุณดูแล (${booking.room?.name ?? ''})`,
    message: `${booking.title} — ${booking.user?.name ?? ''} (${dateS} ${timeS})`,
    type: 'room', link: '/room/manage/bookings', module: 'ROOM_BOOKING',
  });
}

const STATUS_TH = {
  pending: 'รออนุมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ',
  cancelled: 'ยกเลิก', completed: 'เสร็จสิ้น',
};
const STATUS_ICON = {
  pending: '⏳', approved: '✅', rejected: '❌', cancelled: '🚫', completed: '🏁',
};

/** แจ้งผู้ดูแลห้อง + admin โมดูลจองห้องประชุม เมื่อสถานะการจองเปลี่ยน */
async function notifyStaffStatusChange(booking, status, note, actorId) {
  if (!booking) return;
  if (!await isEventEnabled('room.status_staff')) return;
  const { dateS, timeS } = bookingWhen(booking);
  const text = [
    `\n${STATUS_ICON[status] ?? '🔔'} อัปเดตสถานะการจองห้องประชุม`,
    '━━━━━━━━━━━━━━',
    `🏠 ห้อง: ${booking.room?.name ?? '-'}`,
    `📅 ${dateS}`,
    `⏰ ${timeS}`,
    `👤 ผู้จอง: ${booking.user?.name ?? '-'}${booking.user?.department ? ` (${booking.user.department})` : ''}`,
    `📝 ${booking.title}`,
    `📌 สถานะ: ${STATUS_TH[status] ?? status}`,
    note ? `💬 หมายเหตุ: ${note}` : null,
  ].filter(Boolean).join('\n');

  // รวมผู้รับแบบไม่ซ้ำ: ผู้ดูแลห้อง + admin โมดูล (เก็บ lineUserId ไว้ด้วยถ้ามี)
  const recipients = new Map(); // id -> lineUserId|null
  if (booking.room?.managerId) {
    const mgr = await prisma.user.findUnique({ where: { id: booking.room.managerId }, select: { id: true, lineUserId: true } });
    if (mgr) recipients.set(mgr.id, mgr.lineUserId);
  }
  for (const a of await getRoomAdmins()) recipients.set(a.id, a.lineUserId);
  recipients.delete(actorId);         // คนที่กดเปลี่ยนสถานะเอง ไม่ต้องแจ้งซ้ำ
  recipients.delete(booking.userId);  // ผู้จองได้รับจาก notifyBookerStatus แล้ว

  // LINE (เฉพาะผู้ที่เชื่อม LINE)
  for (const lineUserId of recipients.values()) {
    if (lineUserId) pushMessage(lineUserId, [{ type: 'text', text }]).catch(() => {});
  }
  // แจ้งเตือนในระบบ (กระดิ่ง) — ทุกคนไม่ว่าจะเชื่อม LINE หรือไม่
  notifyUsers([...recipients.keys()], {
    title: `${STATUS_ICON[status] ?? '🔔'} การจอง${booking.room?.name ?? ''} · ${STATUS_TH[status] ?? status}`,
    message: `${booking.title} — ${booking.user?.name ?? ''} (${dateS} ${timeS})`,
    type: 'room', link: '/room/manage/bookings', module: 'ROOM_BOOKING',
  });
}

/** แจ้งเตือนหัวหน้างานอาคารสถานที่เมื่อมีการขอจัดโต๊ะ (LINE + อีเมลสำรอง) */
async function notifyFacilitiesHead(booking) {
  if (!await isEventEnabled('room.table')) return;
  if (!booking.tableLayout) {
    console.log(`[facilitiesHead] booking#${booking.id}: ไม่มีการจัดโต๊ะ → ข้าม`);
    return;
  }
  const row = await prisma.systemSettings.findUnique({ where: { key: 'room_facilities_head_id' } });
  const headId = row?.value ? parseInt(row.value, 10) : null;
  if (!headId) {
    console.warn('[facilitiesHead] ยังไม่ได้ตั้งค่าหัวหน้างานอาคารสถานที่ (ตั้งได้ที่หน้าจัดการห้องประชุม)');
    return;
  }
  const head = await prisma.user.findUnique({ where: { id: headId }, select: { name: true, lineUserId: true, email: true } });
  if (!head) { console.warn(`[facilitiesHead] ไม่พบผู้ใช้ id=${headId}`); return; }

  const { dateS, timeS } = bookingWhen(booking);
  const text = [
    '\n🪑 คำร้องขอจัดโต๊ะห้องประชุม',
    '━━━━━━━━━━━━━━',
    `🏠 ห้อง: ${booking.room?.name ?? '-'}`,
    `📅 ${dateS}`,
    `⏰ ${timeS}`,
    `🪑 รูปแบบการจัดโต๊ะ: ${booking.tableLayout}`,
    `👤 ผู้ขอ: ${booking.user?.name ?? '-'}${booking.user?.department ? ` (${booking.user.department})` : ''}`,
    `📝 งาน: ${booking.title}`,
    booking.attendees ? `👥 ${booking.attendees} คน` : null,
    '━━━━━━━━━━━━━━',
    '👉 กรุณาจัดเตรียมโต๊ะตามรูปแบบที่ขอ',
  ].filter(Boolean).join('\n');

  console.log(`[facilitiesHead] booking#${booking.id} layout="${booking.tableLayout}" → ${head.name} (LINE:${head.lineUserId ? 'yes' : 'no'}, email:${head.email ? 'yes' : 'no'})`);

  if (head.lineUserId) {
    pushMessage(head.lineUserId, [{ type: 'text', text }])
      .then((r) => console.log('[facilitiesHead] LINE ส่งสำเร็จ', JSON.stringify(r)))
      .catch((e) => console.error('[facilitiesHead] LINE error:', e.message));
  } else {
    console.warn(`[facilitiesHead] ${head.name} ยังไม่ได้เชื่อม LINE — ส่งทางอีเมลแทน`);
  }

  if (head.email) {
    sendMail({
      to: head.email,
      subject: `🪑 คำร้องขอจัดโต๊ะห้องประชุม — ${booking.room?.name ?? ''} (${dateS})`,
      text,
      html: `<div style="font-family:sans-serif;line-height:1.7">${text.replace(/\n/g, '<br>')}</div>`,
    }).catch((e) => console.error('[facilitiesHead] email error:', e.message));
  }
  notifyUsers([headId], {
    title: `🪑 คำร้องขอจัดโต๊ะ — ${booking.room?.name ?? ''}`,
    message: `${booking.tableLayout} · ${booking.title} — ${booking.user?.name ?? ''} (${dateS} ${timeS})`,
    type: 'room', link: '/room/manage/bookings', module: 'ROOM_BOOKING',
  });
}

async function canAdmin(u) {
  if (u.isSuperAdmin || u.role === 'admin' || u.role === 'executive') return true;
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: u.id, module: 'ROOM_BOOKING' },
  });
  return !!perm;
}

const BOOKING_INC = {
  room:      { select: { id: true, name: true, capacity: true, requireApproval: true, image: true, managerId: true } },
  user:      { select: { id: true, name: true, department: true, email: true, lineUserId: true } },
  approvals: { include: { approver: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
};

/** หา admins ที่มีสิทธิ์จัดการ ROOM_BOOKING ทั้งหมด */
async function getRoomAdmins() {
  const [sysAdmins, moduleAdmins] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, role: { in: ['admin', 'executive'] } },
      select: { id: true, name: true, email: true, lineUserId: true },
    }),
    prisma.modulePermission.findMany({
      where: { module: 'ROOM_BOOKING' },
      include: { user: { select: { id: true, name: true, email: true, lineUserId: true, isActive: true } } },
    }),
  ]);
  const map = new Map();
  for (const u of sysAdmins) map.set(u.id, u);
  for (const p of moduleAdmins) if (p.user?.isActive) map.set(p.user.id, p.user);
  return [...map.values()];
}

/** ส่งแจ้งเตือนไปหา admin ทุกคนเมื่อมีการจองใหม่ */
async function notifyAdminsNewBooking(booking) {
  if (!await isEventEnabled('room.new')) return;
  const frontendUrl = process.env.FRONTEND_URL ?? 'https://app.retc.ac.th';
  const admins = await getRoomAdmins();
  for (const admin of admins) {
    if (admin.lineUserId) sendRoomBookingRequestFlex(admin.lineUserId, booking).catch(() => {});
    if (admin.email) {
      sendRoomBookingRequestEmail({
        to: admin.email, adminName: admin.name, booking,
        approveUrl: `${frontendUrl}/api/room/bookings/${booking.id}/approve-link?token=${Buffer.from(`${booking.id}:approve`).toString('base64')}`,
        rejectUrl:  `${frontendUrl}/api/room/bookings/${booking.id}/approve-link?token=${Buffer.from(`${booking.id}:reject`).toString('base64')}`,
      }).catch(() => {});
    }
  }
  const { dateS, timeS } = bookingWhen(booking);
  notifyUsers(admins.map((a) => a.id), {
    title: `🚪 มีคำขอจองห้อง ${booking.room?.name ?? ''} (รออนุมัติ)`,
    message: `${booking.title} — ${booking.user?.name ?? ''} (${dateS} ${timeS})`,
    type: 'room', link: '/room/manage/bookings', module: 'ROOM_BOOKING',
  });
}

/** ส่งแจ้งเตือนไปหาผู้จองเมื่อสถานะเปลี่ยน */
async function notifyBookerStatus(booking, status, note) {
  if (!await isEventEnabled('room.status_user')) return;
  const bookerLine  = booking.user?.lineUserId;
  const bookerEmail = booking.user?.email;
  console.log(`[notifyBookerStatus] bookingId=${booking.id} status=${status} lineUserId=${bookerLine ?? 'MISSING'} email=${bookerEmail ?? 'MISSING'}`);
  if (bookerLine) {
    sendRoomBookingStatusFlex(bookerLine, booking, status, note)
      .then(r => console.log(`[notifyBookerStatus] LINE sent ok, result:`, JSON.stringify(r)))
      .catch(e => console.error('[notifyBookerStatus] LINE error:', e.message));
  }
  if (bookerEmail) {
    const emailFn = status === 'approved' ? sendRoomBookingApprovedEmail : sendRoomBookingRejectedEmail;
    emailFn({ to: bookerEmail, booking, note }).catch(e => console.error('[notifyBookerStatus] email error:', e.message));
  }
  if (booking.userId) {
    const { dateS, timeS } = bookingWhen(booking);
    notifyUsers([booking.userId], {
      title: `${status === 'approved' ? '✅ อนุมัติ' : '❌ ปฏิเสธ'}การจอง ${booking.room?.name ?? ''}`,
      message: `${booking.title} (${dateS} ${timeS})${note ? ` — ${note}` : ''}`,
      type: 'room', link: '/room', module: 'ROOM_BOOKING',
    });
  }
}

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

// ═══ PUBLIC (ไม่ต้อง login) — ตารางการใช้ห้องประชุมสาธารณะ ═══════════════════

// GET /api/room/public/rooms
router.get('/public/rooms', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { status: 'active' },
      select: { id: true, name: true, capacity: true, image: true },
      orderBy: { name: 'asc' },
    });
    res.json(success(rooms));
  } catch (e) { next(e); }
});

// GET /api/room/public/bookings?date=&dateFrom=&dateTo=&roomId=
router.get('/public/bookings', async (req, res, next) => {
  try {
    const { date, dateFrom, dateTo, roomId } = req.query;
    const where = { status: { in: ['pending', 'approved'] } };
    if (roomId) where.roomId = intId(roomId);
    if (date) {
      const d = new Date(date);
      where.startTime = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setDate(d.getDate() + 1); where.startTime.lt = d; }
    } else {
      // ค่าเริ่มต้น: ตั้งแต่วันนี้ไปอีก 30 วัน
      const now = new Date(); now.setHours(0, 0, 0, 0);
      where.startTime = { gte: now, lt: new Date(now.getTime() + 30 * 86400000) };
    }
    const bookings = await prisma.roomBooking.findMany({
      where,
      select: {
        id: true, title: true, startTime: true, endTime: true, status: true, attendees: true,
        room: { select: { id: true, name: true } },
        user: { select: { name: true, department: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 500,
    });
    res.json(success(bookings.map((b) => ({
      id: b.id, title: b.title, startTime: b.startTime, endTime: b.endTime,
      status: b.status, attendees: b.attendees,
      roomId: b.room?.id, roomName: b.room?.name ?? '-',
      bookerName: b.user?.name ?? '-', department: b.user?.department ?? null,
    }))));
  } catch (e) { next(e); }
});

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
    const rooms = await prisma.room.findMany({
      orderBy: { name: 'asc' },
      include: { manager: { select: { id: true, name: true } } },
    });
    res.json(success(rooms));
  } catch (e) { next(e); }
});

// ตั้งค่าโมดูล: หัวหน้างานอาคารสถานที่ (ผู้รับคำร้องจัดโต๊ะ)
router.get('/settings', auth, async (req, res, next) => {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key: 'room_facilities_head_id' } });
    const id  = row?.value ? parseInt(row.value, 10) : null;
    const head = id ? await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, department: true } }) : null;
    res.json(success({ facilitiesHeadId: id, facilitiesHead: head }));
  } catch (e) { next(e); }
});

router.put('/settings', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const id = intOrNull(req.body.facilitiesHeadId);
    await prisma.systemSettings.upsert({
      where:  { key: 'room_facilities_head_id' },
      update: { value: id ? String(id) : '' },
      create: { key: 'room_facilities_head_id', value: id ? String(id) : '', group: 'room' },
    });
    res.json(success(null, 'บันทึกการตั้งค่าสำเร็จ'));
  } catch (e) { next(e); }
});

router.post('/rooms', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, capacity, facilities, image, requireApproval, note, managerId } = req.body;
    if (!name?.trim() || !capacity) return res.status(400).json(error('กรุณากรอกชื่อและความจุ'));
    const room = await prisma.room.create({
      data: {
        name:            name.trim(),
        capacity:        intId(capacity),
        facilities:      facilities ? JSON.stringify(Array.isArray(facilities) ? facilities : [facilities]) : null,
        image:           processRoomImage(image),
        requireApproval: !!requireApproval,
        note:            note?.trim() || null,
        managerId:       intOrNull(managerId),
        status:          'active',
      },
    });
    res.status(201).json(success(room, 'เพิ่มห้องสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/rooms/:id', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const { name, capacity, facilities, image, requireApproval, status, note, managerId } = req.body;
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
        ...(managerId       !== undefined && { managerId: intOrNull(managerId) }),
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

    // status breakdown สำหรับกราฟ
    const allBookings = await prisma.roomBooking.findMany({
      where: { startTime: { gte: start }, endTime: { lte: end } },
      select: { status: true },
    });
    const statusBreakdown = { approved: 0, pending: 0, rejected: 0, cancelled: 0, completed: 0 };
    for (const b of allBookings) { if (b.status in statusBreakdown) statusBreakdown[b.status]++; }

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
      statusBreakdown,
    }));
  } catch (e) { next(e); }
});

// ─── Bookings ─────────────────────────────────────────────────────────────────

router.get('/bookings', auth, async (req, res, next) => {
  try {
    const { date, dateFrom, dateTo, roomId, userId, status, search, mine, page = 1, limit = 50 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (roomId) where.roomId = intId(roomId);
    if (mine === 'true') {
      where.userId = req.user.id;
    } else {
      if (userId) where.userId = intId(userId);
      if (!await canAdmin(req.user)) where.userId = req.user.id;
    }
    if (search) where.user = { name: { contains: search } };
    if (date) {
      const d = new Date(date);
      where.startTime = { gte: d, lt: new Date(d.getTime() + 86400000) };
    } else if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setDate(d.getDate() + 1);
        where.startTime.lt = d;
      }
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
    const { roomId, title, attendees, startTime, endTime, equipmentNeeded, purpose, tableLayout } = req.body;
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
        tableLayout:     tableLayout?.trim() || null,
        purpose:         purpose?.trim() || null,
        status,
      },
      include: BOOKING_INC,
    });

    if (room.requireApproval) notifyAdminsNewBooking(booking).catch(() => {});
    notifyRoomManager(booking).catch(() => {});     // แจ้งผู้ดูแลห้อง
    notifyFacilitiesHead(booking).catch(() => {});  // แจ้งหัวหน้างานอาคารสถานที่ (ถ้าขอจัดโต๊ะ)
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
    const updated = await prisma.roomBooking.findUnique({ where: { id: intId(req.params.id) }, include: BOOKING_INC });
    notifyStaffStatusChange(updated, 'cancelled', null, req.user.id).catch(() => {});
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
    notifyBookerStatus(updated, 'approved', note?.trim() || null).catch(() => {});
    notifyStaffStatusChange(updated, 'approved', note?.trim() || null, req.user.id).catch(() => {});
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
    notifyBookerStatus(updated, 'rejected', note?.trim() || null).catch(() => {});
    notifyStaffStatusChange(updated, 'rejected', note?.trim() || null, req.user.id).catch(() => {});
    res.json(success(null, 'ปฏิเสธสำเร็จ'));
  } catch (e) { next(e); }
});

// เปลี่ยนสถานะการจองโดยตรง (admin) — ใช้จากหน้าจัดการการจอง
const VALID_BOOKING_STATUS = ['pending', 'approved', 'rejected', 'cancelled', 'completed'];
router.put('/bookings/:id/status', auth, async (req, res, next) => {
  try {
    if (!await canAdmin(req.user)) return res.status(403).json(error('ต้องการสิทธิ์ Admin'));
    const id = intId(req.params.id);
    const { status, note } = req.body;
    if (!VALID_BOOKING_STATUS.includes(status)) return res.status(400).json(error('สถานะไม่ถูกต้อง'));

    const b = await prisma.roomBooking.findUnique({ where: { id } });
    if (!b) return res.status(404).json(error('ไม่พบการจอง'));
    if (b.status === status) return res.json(success(null, 'เป็นสถานะนี้อยู่แล้ว'));

    await prisma.roomBooking.update({ where: { id }, data: { status } });

    // บันทึกประวัติ เฉพาะอนุมัติ/ปฏิเสธ
    if (status === 'approved' || status === 'rejected') {
      await prisma.roomBookingApproval.create({
        data: { bookingId: id, approverId: req.user.id, status, note: note?.trim() || null },
      });
    }
    const updated = await prisma.roomBooking.findUnique({ where: { id }, include: BOOKING_INC });
    // แจ้งผู้จอง เฉพาะอนุมัติ/ปฏิเสธ | แจ้งผู้ดูแลห้อง + admin ทุกการเปลี่ยนสถานะ
    if (status === 'approved' || status === 'rejected') {
      notifyBookerStatus(updated, status, note?.trim() || null).catch(() => {});
    }
    notifyStaffStatusChange(updated, status, note?.trim() || null, req.user.id).catch(() => {});
    res.json(success(null, 'เปลี่ยนสถานะสำเร็จ'));
  } catch (e) { next(e); }
});

// ลบการจอง (admin เท่านั้น)
router.delete('/bookings/:id', auth, async (req, res, next) => {
  try {
    const isAdminUser = await canAdmin(req.user);
    if (!isAdminUser) return res.status(403).json(error('ไม่มีสิทธิ์'));
    const id = intId(req.params.id);
    const booking = await prisma.roomBooking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json(error('ไม่พบการจอง'));
    // ห้ามลบการจองที่อนุมัติแล้ว — ต้องเปลี่ยนสถานะ (เช่น ยกเลิก) ก่อน
    if (booking.status === 'approved') {
      return res.status(400).json(error('ไม่สามารถลบการจองที่อนุมัติแล้วได้ กรุณาเปลี่ยนสถานะเป็น "ยกเลิก" ก่อน'));
    }
    await prisma.roomBookingApproval.deleteMany({ where: { bookingId: id } });
    await prisma.roomBooking.delete({ where: { id } });
    res.json(success(null, 'ลบการจองสำเร็จ'));
  } catch (e) { next(e); }
});

module.exports = router;
