const express  = require('express');
const crypto   = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendLeaveStatusNotify, sendLeaveRequestFlex, sendRoomBookingStatusFlex, sendWorkLogStatusFlex, pushMessage } = require('../services/line');
const { sendRoomBookingApprovedEmail, sendRoomBookingRejectedEmail } = require('../services/email');

const router = express.Router();
const prisma  = new PrismaClient();

function verifyLineSignature(rawBody, signature, secret) {
  try {
    const hash    = crypto.createHmac('SHA256', secret).update(rawBody).digest('base64');
    const bufHash = Buffer.from(hash);
    const bufSig  = Buffer.from(signature);
    if (bufHash.length !== bufSig.length) return false;
    return crypto.timingSafeEqual(bufHash, bufSig);
  } catch { return false; }
}

async function getChannelSecret() {
  if (process.env.LINE_CHANNEL_SECRET) return process.env.LINE_CHANNEL_SECRET;
  try {
    // ใช้เฉพาะ line_messaging_secret เท่านั้น (ไม่ fallback line_channel_secret ซึ่งเป็นของ LINE Login คนละ channel)
    const row = await prisma.systemSettings.findUnique({ where: { key: 'line_messaging_secret' } });
    return row?.value ?? '';
  } catch { return ''; }
}

// LINE Webhook Diagnostic — GET /api/webhook/line/debug
router.get('/line/debug', async (req, res) => {
  try {
    const [secretRow, tokenRow, lastEventRow] = await Promise.all([
      prisma.systemSettings.findUnique({ where: { key: 'line_messaging_secret' } }),
      prisma.systemSettings.findUnique({ where: { key: 'line_messaging_token'  } }),
      prisma.systemSettings.findUnique({ where: { key: '_webhook_last_event'   } }),
    ]);

    // role-based admins
    const roleAdmins = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['admin', 'executive'] } },
      select: { id: true, name: true, role: true, lineUserId: true },
    });

    // module admins for ROOM_BOOKING
    const modulePerms = await prisma.modulePermission.findMany({
      where: { module: 'ROOM_BOOKING' },
      include: { user: { select: { id: true, name: true, role: true, lineUserId: true, isActive: true } } },
    });
    const moduleAdmins = modulePerms
      .filter(p => p.user?.isActive)
      .map(p => ({ id: p.user.id, name: p.user.name, role: p.user.role, hasLineUserId: !!(p.user.lineUserId), lineUserId: p.user.lineUserId, via: 'MODULE_PERMISSION' }));

    const allAdmins = [
      ...roleAdmins.map(a => ({ id: a.id, name: a.name, role: a.role, hasLineUserId: !!(a.lineUserId), lineUserId: a.lineUserId, via: 'ROLE' })),
      ...moduleAdmins.filter(m => !roleAdmins.find(r => r.id === m.id)),
    ];

    const pendingBookings = await prisma.roomBooking.findMany({
      where: { status: 'pending' },
      select: { id: true, title: true, startTime: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    res.json({
      messaging_secret_set: !!(secretRow?.value),
      messaging_token_set:  !!(tokenRow?.value),
      env_secret_set: !!(process.env.LINE_CHANNEL_SECRET),
      env_token_set:  !!(process.env.LINE_CHANNEL_ACCESS_TOKEN),
      last_webhook_event: lastEventRow?.value ? JSON.parse(lastEventRow.value) : null,
      admins: allAdmins,
      pending_bookings: pendingBookings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LINE Webhook — POST /api/webhook/line
router.post('/line', async (req, res) => {
  const signature = req.headers['x-line-signature'];
  const rawBody   = req.rawBody;

  // ต้อง return 200 เสมอ ไม่งั้น LINE จะหยุดส่ง event
  res.status(200).json({ success: true });

  const events = req.body?.events ?? [];
  const secret = await getChannelSecret();
  const sigOk  = !secret || verifyLineSignature(rawBody ?? '', signature ?? '', secret);

  // บันทึก event ทุกครั้งก่อน check signature เพื่อ debug
  if (events.length > 0) {
    const logData = JSON.stringify({
      receivedAt: new Date().toISOString(),
      signatureOk: sigOk,
      secretConfigured: !!secret,
      events: events.map(e => ({
        type: e.type,
        userId: e.source?.userId,
        postbackData: e.postback?.data,
      })),
    });
    prisma.systemSettings.upsert({
      where: { key: '_webhook_last_event' },
      update: { value: logData },
      create: { key: '_webhook_last_event', value: logData },
    }).catch(() => {});
    console.log(`[Webhook] received ${events.length} event(s), sigOk=${sigOk}`);
  }

  if (!sigOk) {
    console.warn('[Webhook] invalid LINE signature — skipping event processing');
    return;
  }

  for (const event of events) {
    try {
      if (event.type === 'postback') {
        await handlePostback(event);
      }
    } catch (err) {
      console.error('[Webhook] event error:', err.message, err.stack);
    }
  }
});

async function handlePostback(event) {
  const params     = new URLSearchParams(event.postback?.data ?? '');
  const action     = params.get('action');
  const lineUserId = event.source?.userId;

  if (!action || !lineUserId) return;

  // ─── Room booking approve/reject ────────────────────────────────────────────
  if (action === 'room_approve' || action === 'room_reject') {
    const bookingId = parseInt(params.get('bookingId') ?? '0', 10);
    if (!bookingId) return;

    const approver = await prisma.user.findFirst({ where: { lineUserId, isActive: true } });
    if (!approver) {
      console.warn('[Webhook] room postback: approver not found for lineUserId', lineUserId);
      pushMessage(lineUserId, [{ type: 'text', text: '❌ ไม่พบบัญชีผู้ใช้ในระบบ กรุณาเชื่อมต่อ LINE กับบัญชีของคุณก่อน' }]).catch(() => {});
      return;
    }

    const isRoomAdmin = approver.isSuperAdmin || ['admin', 'executive'].includes(approver.role)
      || !!(await prisma.modulePermission.findFirst({ where: { userId: approver.id, module: 'ROOM_BOOKING' } }));
    if (!isRoomAdmin) {
      pushMessage(lineUserId, [{ type: 'text', text: '❌ คุณไม่มีสิทธิ์อนุมัติการจองห้องประชุม' }]).catch(() => {});
      return;
    }

    const booking = await prisma.roomBooking.findUnique({
      where: { id: bookingId },
      include: {
        room: { select: { id: true, name: true, capacity: true, requireApproval: true, image: true } },
        user: { select: { id: true, name: true, department: true, lineUserId: true, email: true } },
      },
    });
    if (!booking) {
      pushMessage(lineUserId, [{ type: 'text', text: '❌ ไม่พบข้อมูลการจอง' }]).catch(() => {});
      return;
    }
    if (booking.status !== 'pending') {
      const already = booking.status === 'approved' ? 'อนุมัติแล้ว' : booking.status === 'rejected' ? 'ปฏิเสธแล้ว' : 'ยกเลิกแล้ว';
      pushMessage(lineUserId, [{ type: 'text', text: `ℹ️ การจองนี้ถูก${already} ไม่สามารถดำเนินการซ้ำได้` }]).catch(() => {});
      return;
    }

    const newStatus = action === 'room_approve' ? 'approved' : 'rejected';
    await prisma.$transaction([
      prisma.roomBooking.update({ where: { id: bookingId }, data: { status: newStatus } }),
      prisma.roomBookingApproval.create({ data: { bookingId, approverId: approver.id, status: newStatus, note: null } }),
    ]);

    // แจ้ง admin ว่าดำเนินการสำเร็จ
    const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    const dt = new Date(booking.startTime);
    const dateStr = `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear() + 543}`;
    const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    const confirmText = newStatus === 'approved'
      ? `✅ อนุมัติสำเร็จ\n🏢 ${booking.room?.name}\n👤 ${booking.user?.name}\n📅 ${dateStr} ${timeStr} น.`
      : `❌ ปฏิเสธสำเร็จ\n🏢 ${booking.room?.name}\n👤 ${booking.user?.name}\n📅 ${dateStr} ${timeStr} น.`;
    pushMessage(lineUserId, [{ type: 'text', text: confirmText }]).catch(() => {});

    // แจ้งผู้จอง
    const bookerLine  = booking.user?.lineUserId;
    const bookerEmail = booking.user?.email;
    if (bookerLine)  sendRoomBookingStatusFlex(bookerLine, booking, newStatus, null).catch(() => {});
    if (bookerEmail) {
      const emailFn = newStatus === 'approved' ? sendRoomBookingApprovedEmail : sendRoomBookingRejectedEmail;
      emailFn({ to: bookerEmail, booking }).catch(() => {});
    }
    return;
  }

  // ─── WorkLog approve / reject / return ─────────────────────────────────────
  if (action === 'worklog_approve' || action === 'worklog_reject' || action === 'worklog_return') {
    const logId = parseInt(params.get('logId') ?? '0', 10);
    if (!logId) return;

    const approver = await prisma.user.findFirst({ where: { lineUserId, isActive: true } });
    if (!approver) {
      pushMessage(lineUserId, [{ type: 'text', text: '❌ ไม่พบบัญชีผู้ใช้ในระบบ กรุณาเชื่อมต่อ LINE กับบัญชีของคุณก่อน' }]).catch(() => {});
      return;
    }

    const log = await prisma.workLog.findUnique({
      where: { id: logId },
      include: {
        user: { select: { id: true, name: true, lineUserId: true, workUnitId: true } },
        workType: { select: { name: true } },
      },
    });
    if (!log) {
      pushMessage(lineUserId, [{ type: 'text', text: '❌ ไม่พบบันทึกปฏิบัติงาน' }]).catch(() => {});
      return;
    }

    // ตรวจสิทธิ์: ต้องเป็นหัวหน้างานของผู้บันทึก หรือ admin/superAdmin
    let canAct = approver.isSuperAdmin || ['admin', 'executive'].includes(approver.role);
    if (!canAct && log.user?.workUnitId) {
      const unit = await prisma.workUnit.findUnique({
        where: { id: log.user.workUnitId },
        select: { headId: true },
      });
      canAct = unit?.headId === approver.id;
    }
    if (!canAct) {
      pushMessage(lineUserId, [{ type: 'text', text: '❌ คุณไม่มีสิทธิ์อนุมัติบันทึกปฏิบัติงานนี้' }]).catch(() => {});
      return;
    }

    if (log.status !== 'submitted') {
      const statusTh = { approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธแล้ว', returned: 'ส่งคืนแล้ว', draft: 'ยังเป็นร่าง' }[log.status] ?? log.status;
      pushMessage(lineUserId, [{ type: 'text', text: `ℹ️ บันทึกนี้${statusTh} ไม่สามารถดำเนินการซ้ำได้` }]).catch(() => {});
      return;
    }

    const newStatus = action === 'worklog_approve' ? 'approved' : action === 'worklog_reject' ? 'rejected' : 'returned';
    const defaultComment = action === 'worklog_return' ? 'กรุณาแก้ไขและส่งใหม่' : null;

    await prisma.$transaction([
      prisma.workLog.update({ where: { id: logId }, data: { status: newStatus } }),
      prisma.workLogApproval.create({
        data: { logId, approverId: approver.id, status: newStatus, comment: defaultComment },
      }),
    ]);

    // แจ้ง approver ว่าดำเนินการสำเร็จ
    const actionTh = newStatus === 'approved' ? '✅ อนุมัติสำเร็จ' : newStatus === 'rejected' ? '❌ ปฏิเสธสำเร็จ' : '🔄 ส่งคืนสำเร็จ';
    pushMessage(lineUserId, [{ type: 'text', text: `${actionTh}\n📝 ${log.title}\n👤 ${log.user?.name ?? '-'}` }]).catch(() => {});

    // แจ้ง user
    if (log.user?.lineUserId) {
      sendWorkLogStatusFlex(log.user.lineUserId, log, newStatus, defaultComment, approver.name).catch(() => {});
    }
    return;
  }

  // ─── Leave request approve/reject ────────────────────────────────────────────
  const requestId = parseInt(params.get('requestId') ?? '0', 10);
  if (!requestId) return;

  const approver = await prisma.user.findFirst({ where: { lineUserId, isActive: true } });
  if (!approver || !['admin', 'executive'].includes(approver.role)) return;

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { leaveType: true, user: true },
  });

  if (!request || request.status !== 'PENDING') return;

  if (action === 'approve') {
    await prisma.leaveApproval.updateMany({
      where: { requestId, status: 'PENDING' },
      data: { status: 'APPROVED', approverId: approver.id },
    });
    await prisma.leaveRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });

    // อัปเดต balance
    if (request.leaveType.maxDaysPerYear) {
      const currentYear = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
      const year = currentYear?.year ?? new Date().getFullYear() + 543;
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: request.userId, leaveTypeId: request.leaveTypeId, year } },
        update: { used: { increment: request.totalDays } },
        create: { userId: request.userId, leaveTypeId: request.leaveTypeId, year, quota: request.leaveType.maxDaysPerYear, used: request.totalDays },
      });
    }

    if (request.user.lineUserId) {
      await sendLeaveStatusNotify(request.user.lineUserId, request, 'APPROVED');
    }

  } else if (action === 'reject') {
    await prisma.leaveApproval.updateMany({
      where: { requestId, status: 'PENDING' },
      data: { status: 'REJECTED', approverId: approver.id },
    });
    await prisma.leaveRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });

    if (request.user.lineUserId) {
      await sendLeaveStatusNotify(request.user.lineUserId, request, 'REJECTED');
    }
  }
}

module.exports = router;
