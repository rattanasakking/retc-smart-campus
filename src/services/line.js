/**
 * LINE Notify service
 * ต้องตั้งค่า LINE_NOTIFY_TOKEN ใน .env
 * รับ token ได้จาก https://notify-bot.line.me/
 */

const NOTIFY_URL = 'https://notify-api.line.me/api/notify';

/**
 * ส่ง LINE Notify message
 * @param {string} token  — LINE Notify token
 * @param {string} message
 * @param {object} [opts] — { stickerId?, stickerPackageId?, imageThumbnail?, imageFullsize? }
 * @returns {Promise<{status:number,message:string}|null>}
 */
async function sendLineNotify(token, message, opts = {}) {
  if (!token) return null;

  const params = new URLSearchParams({ message, ...opts });

  try {
    const res = await fetch(NOTIFY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    return res.json();
  } catch (err) {
    console.error('[LINE Notify] send error:', err.message);
    return null;
  }
}

/** ส่งด้วย default token จาก env */
async function notify(message, opts = {}) {
  const token = process.env.LINE_NOTIFY_TOKEN;
  if (!token) return null;
  return sendLineNotify(token, message, opts);
}

/** แจ้งเตือนซ่อมใหม่ */
async function notifyRepairTicket(ticket) {
  const urgencyLabel = { normal: 'ปกติ', urgent: '⚠️ เร่งด่วน', critical: '🚨 วิกฤต' };
  const msg = [
    '\n🔧 แจ้งซ่อมใหม่',
    `เลขที่: ${ticket.ticketNo}`,
    `หัวข้อ: ${ticket.title}`,
    `ความเร่งด่วน: ${urgencyLabel[ticket.urgency] ?? ticket.urgency}`,
    `สถานที่: ${ticket.location}`,
    `ผู้แจ้ง: ${ticket.reporter?.name ?? '-'}`,
  ].join('\n');
  return notify(msg);
}

/** แจ้งเตือนของหาย/ของได้ */
async function notifyLostFound(item) {
  const typeLabel = item.type === 'lost' ? '🔍 แจ้งของหาย' : '📦 แจ้งของได้';
  const msg = [
    `\n${typeLabel}`,
    `หัวข้อ: ${item.title}`,
    `สถานที่: ${item.foundLocation ?? '-'}`,
    `วันที่: ${item.foundDate ? new Date(item.foundDate).toLocaleDateString('th-TH') : '-'}`,
    `ผู้แจ้ง: ${item.reporter?.name ?? '-'}`,
  ].join('\n');
  return notify(msg);
}

/** แจ้งเตือนการจองห้อง (pending → approved/rejected) */
async function notifyRoomBooking(booking, status) {
  const statusLabel = { approved: '✅ อนุมัติ', rejected: '❌ ปฏิเสธ' };
  const msg = [
    `\n🏫 การจองห้องประชุม: ${statusLabel[status] ?? status}`,
    `ห้อง: ${booking.room?.name ?? '-'}`,
    `ผู้จอง: ${booking.user?.name ?? '-'}`,
    `วันเวลา: ${new Date(booking.startTime).toLocaleString('th-TH')}`,
  ].join('\n');
  return notify(msg);
}

module.exports = { sendLineNotify, notify, notifyRepairTicket, notifyLostFound, notifyRoomBooking };
