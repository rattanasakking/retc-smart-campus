const express  = require('express');
const crypto   = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendLeaveStatusNotify, sendLeaveRequestFlex, sendRoomBookingStatusFlex } = require('../services/line');
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

// LINE Webhook — POST /api/webhook/line
router.post('/line', async (req, res) => {
  const signature = req.headers['x-line-signature'];
  const rawBody   = req.rawBody;

  const secret = await getChannelSecret();
  if (secret) {
    if (!signature || !rawBody || !verifyLineSignature(rawBody, signature, secret)) {
      console.warn('[Webhook] invalid LINE signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } else {
    console.warn('[Webhook] LINE_CHANNEL_SECRET not set — skipping signature verification');
  }

  res.status(200).json({ success: true });

  const events = req.body?.events ?? [];
  for (const event of events) {
    try {
      if (event.type === 'postback') {
        await handlePostback(event);
      }
    } catch (err) {
      console.error('[Webhook] event error:', err.message);
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
    if (!approver) return;

    const isRoomAdmin = approver.isSuperAdmin || ['admin', 'executive'].includes(approver.role)
      || !!(await prisma.modulePermission.findFirst({ where: { userId: approver.id, module: 'ROOM_BOOKING' } }));
    if (!isRoomAdmin) return;

    const booking = await prisma.roomBooking.findUnique({
      where: { id: bookingId },
      include: {
        room: { select: { id: true, name: true, capacity: true, requireApproval: true, image: true } },
        user: { select: { id: true, name: true, department: true, lineUserId: true, email: true } },
      },
    });
    if (!booking || booking.status !== 'pending') return;

    const newStatus = action === 'room_approve' ? 'approved' : 'rejected';
    await prisma.$transaction([
      prisma.roomBooking.update({ where: { id: bookingId }, data: { status: newStatus } }),
      prisma.roomBookingApproval.create({ data: { bookingId, approverId: approver.id, status: newStatus, note: null } }),
    ]);

    const bookerLine  = booking.user?.lineUserId;
    const bookerEmail = booking.user?.email;
    if (bookerLine)  sendRoomBookingStatusFlex(bookerLine, booking, newStatus, null).catch(() => {});
    if (bookerEmail) {
      const emailFn = newStatus === 'approved' ? sendRoomBookingApprovedEmail : sendRoomBookingRejectedEmail;
      emailFn({ to: bookerEmail, booking }).catch(() => {});
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
