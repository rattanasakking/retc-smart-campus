/**
 * Email service (Nodemailer)
 * ตั้งค่าใน .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT ?? '587', 10),
    secure: parseInt(SMTP_PORT ?? '587', 10) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t || !to) return null;
  try {
    return await t.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
      text,
    });
  } catch (err) {
    console.error('[Email] send error:', err.message);
    return null;
  }
}

function fmt(date) {
  const d = new Date(date);
  const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function fmtTime(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/** แจ้งเตือนผู้ดูแลระบบเมื่อมีคำขอจองห้องใหม่ */
async function sendRoomBookingRequestEmail({ to, adminName, booking, approveUrl, rejectUrl }) {
  const dateStr = fmt(booking.startTime);
  const timeStr = `${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)} น.`;

  const html = `
<div style="font-family:Sarabun,sans-serif;max-width:560px;margin:0 auto;border:1px solid #dce6f9;border-radius:12px;overflow:hidden">
  <div style="background:#1565C0;padding:20px 24px">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">🚪 คำขอจองห้องประชุม</p>
    <p style="margin:4px 0 0;color:#BBDEFB;font-size:13px">กรุณาตรวจสอบและดำเนินการ</p>
  </div>
  <div style="padding:20px 24px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="color:#888;padding:6px 0;width:100px">ห้องประชุม</td><td style="color:#111;font-weight:bold">${booking.room?.name ?? '-'}</td></tr>
      <tr><td style="color:#888;padding:6px 0">ผู้จอง</td><td style="color:#111">${booking.user?.name ?? '-'}</td></tr>
      ${booking.user?.department ? `<tr><td style="color:#888;padding:6px 0">ฝ่าย/งาน</td><td style="color:#111">${booking.user.department}</td></tr>` : ''}
      <tr><td style="color:#888;padding:6px 0">วันที่</td><td style="color:#111">${dateStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">เวลา</td><td style="color:#111">${timeStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">หัวข้อ</td><td style="color:#111">${booking.title}</td></tr>
      ${booking.attendees ? `<tr><td style="color:#888;padding:6px 0">จำนวนผู้เข้าร่วม</td><td style="color:#111">${booking.attendees} คน</td></tr>` : ''}
      ${booking.purpose ? `<tr><td style="color:#888;padding:6px 0">วัตถุประสงค์</td><td style="color:#111">${booking.purpose}</td></tr>` : ''}
    </table>
  </div>
  <div style="padding:16px 24px;background:#f8faff;display:flex;gap:12px">
    <a href="${approveUrl}" style="display:inline-block;padding:10px 24px;background:#2E7D32;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold">✅ อนุมัติ</a>
    <a href="${rejectUrl}"  style="display:inline-block;padding:10px 24px;background:#C62828;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:bold;margin-left:8px">❌ ไม่อนุมัติ</a>
  </div>
  <div style="padding:12px 24px;background:#f0f4ff;font-size:12px;color:#888">
    หรือเข้าระบบที่ <a href="${process.env.FRONTEND_URL ?? 'https://app.retc.ac.th'}/room" style="color:#1565C0">app.retc.ac.th/room</a> เพื่อดำเนินการ
  </div>
</div>`;

  return sendMail({
    to,
    subject: `[คำขอจองห้อง] ${booking.room?.name ?? ''} – ${booking.user?.name ?? ''} (${dateStr})`,
    html,
    text: `คำขอจองห้องประชุม\nห้อง: ${booking.room?.name}\nผู้จอง: ${booking.user?.name}\nวันที่: ${dateStr} เวลา: ${timeStr}\nหัวข้อ: ${booking.title}\n\nอนุมัติ: ${approveUrl}\nไม่อนุมัติ: ${rejectUrl}`,
  });
}

/** แจ้งผู้จองเมื่อได้รับการอนุมัติ */
async function sendRoomBookingApprovedEmail({ to, booking }) {
  const dateStr = fmt(booking.startTime);
  const timeStr = `${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)} น.`;

  const html = `
<div style="font-family:Sarabun,sans-serif;max-width:560px;margin:0 auto;border:1px solid #dce6f9;border-radius:12px;overflow:hidden">
  <div style="background:#1B5E20;padding:20px 24px">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✅ การจองห้องประชุมได้รับการอนุมัติ</p>
    <p style="margin:4px 0 0;color:#A5D6A7;font-size:13px">${booking.room?.name ?? ''}</p>
  </div>
  <div style="padding:20px 24px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="color:#888;padding:6px 0;width:100px">ห้องประชุม</td><td style="color:#111;font-weight:bold">${booking.room?.name ?? '-'}</td></tr>
      <tr><td style="color:#888;padding:6px 0">วันที่</td><td style="color:#111">${dateStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">เวลา</td><td style="color:#111">${timeStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">หัวข้อ</td><td style="color:#111">${booking.title}</td></tr>
      ${booking.attendees ? `<tr><td style="color:#888;padding:6px 0">จำนวนผู้เข้าร่วม</td><td style="color:#111">${booking.attendees} คน</td></tr>` : ''}
    </table>
  </div>
  <div style="padding:12px 24px;background:#f0f4ff;font-size:12px;color:#888">
    ดูการจองของคุณได้ที่ <a href="${process.env.FRONTEND_URL ?? 'https://app.retc.ac.th'}/room" style="color:#1565C0">app.retc.ac.th/room</a>
  </div>
</div>`;

  return sendMail({
    to,
    subject: `[อนุมัติ] การจองห้อง ${booking.room?.name ?? ''} วันที่ ${dateStr}`,
    html,
    text: `การจองห้องประชุมได้รับการอนุมัติ\nห้อง: ${booking.room?.name}\nวันที่: ${dateStr} เวลา: ${timeStr}\nหัวข้อ: ${booking.title}`,
  });
}

/** แจ้งผู้จองเมื่อถูกปฏิเสธ */
async function sendRoomBookingRejectedEmail({ to, booking, note }) {
  const dateStr = fmt(booking.startTime);
  const timeStr = `${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)} น.`;

  const html = `
<div style="font-family:Sarabun,sans-serif;max-width:560px;margin:0 auto;border:1px solid #dce6f9;border-radius:12px;overflow:hidden">
  <div style="background:#B71C1C;padding:20px 24px">
    <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">❌ การจองห้องประชุมถูกปฏิเสธ</p>
    <p style="margin:4px 0 0;color:#FFCDD2;font-size:13px">${booking.room?.name ?? ''}</p>
  </div>
  <div style="padding:20px 24px;background:#fff">
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="color:#888;padding:6px 0;width:100px">ห้องประชุม</td><td style="color:#111;font-weight:bold">${booking.room?.name ?? '-'}</td></tr>
      <tr><td style="color:#888;padding:6px 0">วันที่</td><td style="color:#111">${dateStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">เวลา</td><td style="color:#111">${timeStr}</td></tr>
      <tr><td style="color:#888;padding:6px 0">หัวข้อ</td><td style="color:#111">${booking.title}</td></tr>
      ${note ? `<tr><td style="color:#888;padding:6px 0">หมายเหตุ</td><td style="color:#C62828">${note}</td></tr>` : ''}
    </table>
  </div>
  <div style="padding:12px 24px;background:#f0f4ff;font-size:12px;color:#888">
    ติดต่อผู้ดูแลระบบหรือจองใหม่ได้ที่ <a href="${process.env.FRONTEND_URL ?? 'https://app.retc.ac.th'}/room" style="color:#1565C0">app.retc.ac.th/room</a>
  </div>
</div>`;

  return sendMail({
    to,
    subject: `[ไม่อนุมัติ] การจองห้อง ${booking.room?.name ?? ''} วันที่ ${dateStr}`,
    html,
    text: `การจองห้องประชุมถูกปฏิเสธ\nห้อง: ${booking.room?.name}\nวันที่: ${dateStr} เวลา: ${timeStr}\n${note ? `หมายเหตุ: ${note}` : ''}`,
  });
}

module.exports = {
  sendMail,
  sendRoomBookingRequestEmail,
  sendRoomBookingApprovedEmail,
  sendRoomBookingRejectedEmail,
};
