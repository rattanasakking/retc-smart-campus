const express  = require('express');
const crypto   = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendLeaveStatusNotify, sendLeaveRequestFlex } = require('../services/line');

const router = express.Router();
const prisma  = new PrismaClient();

function verifyLineSignature(rawBody, signature) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(rawBody)
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// LINE Webhook — POST /api/webhook/line
router.post('/line', async (req, res) => {
  const signature = req.headers['x-line-signature'];
  const rawBody   = req.rawBody;

  if (!signature || !rawBody || !verifyLineSignature(rawBody, signature)) {
    console.warn('[Webhook] invalid LINE signature');
    return res.status(401).json({ error: 'Invalid signature' });
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
  const params    = new URLSearchParams(event.postback?.data ?? '');
  const action    = params.get('action');
  const requestId = parseInt(params.get('requestId') ?? '0', 10);
  const lineUserId = event.source?.userId;

  if (!action || !requestId || !lineUserId) return;

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
