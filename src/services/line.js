/**
 * LINE Notify service
 * ต้องตั้งค่า LINE_NOTIFY_TOKEN ใน .env
 * รับ token ได้จาก https://notify-bot.line.me/
 */
const { PrismaClient } = require('@prisma/client');
const _prisma = new PrismaClient();

const NOTIFY_URL = 'https://notify-api.line.me/api/notify';

/** ตรวจสอบว่าโมดูลนั้นเปิดการแจ้งเตือน LINE หรือไม่ (default: เปิด) */
async function isModuleNotifyEnabled(module) {
  try {
    const row = await _prisma.systemSettings.findUnique({ where: { key: `notify_line_${module}` } });
    return row ? row.value === 'true' : true;
  } catch { return true; }
}

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
  if (!await isModuleNotifyEnabled('HELPDESK')) return null;
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
  if (!await isModuleNotifyEnabled('LOST_FOUND')) return null;
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
  if (!await isModuleNotifyEnabled('ROOM_BOOKING')) return null;
  const statusLabel = { approved: '✅ อนุมัติ', rejected: '❌ ปฏิเสธ' };
  const msg = [
    `\n🏫 การจองห้องประชุม: ${statusLabel[status] ?? status}`,
    `ห้อง: ${booking.room?.name ?? '-'}`,
    `ผู้จอง: ${booking.user?.name ?? '-'}`,
    `วันเวลา: ${new Date(booking.startTime).toLocaleString('th-TH')}`,
  ].join('\n');
  return notify(msg);
}

// ─── LINE Messaging API (Bot) ─────────────────────────────────────────────────
const MESSAGING_API = 'https://api.line.me/v2/bot/message/push';

async function getChannelAccessToken() {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) return process.env.LINE_CHANNEL_ACCESS_TOKEN;
  try {
    // ใช้ key เดียวกับที่ general/page.tsx บันทึก
    const row = await _prisma.systemSettings.findUnique({ where: { key: 'line_messaging_token' } });
    return row?.value ?? '';
  } catch { return ''; }
}

async function pushMessage(lineUserId, messages) {
  const token = await getChannelAccessToken();
  if (!token || !lineUserId) return null;
  try {
    const res = await fetch(MESSAGING_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: lineUserId, messages }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[LINE Bot] push failed:', res.status, body);
    }
    return res.ok;
  } catch (err) {
    console.error('[LINE Bot] push error:', err.message);
    return null;
  }
}

function formatThaiDate(date) {
  const d = new Date(date);
  const buddhistYear = d.getFullYear() + 543;
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(d.getFullYear().toString(), buddhistYear.toString());
}

function formatDateTime(date) {
  const d = new Date(date);
  return d.toLocaleString('th-TH', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).replace(d.getFullYear().toString(), (d.getFullYear() + 543).toString());
}

async function sendLeaveRequestFlex(approverLineId, request) {
  if (!await isModuleNotifyEnabled('LEAVE')) return null;
  const { id, user, leaveType, startDate, endDate, totalDays, isHalfDay, halfDayPeriod, reason } = request;
  const typeIcon = leaveType?.icon || '📋';
  const daysText = isHalfDay ? `ครึ่งวัน (${halfDayPeriod})` : `${totalDays} วันทำงาน`;
  const dateText = isHalfDay || startDate === endDate
    ? formatThaiDate(startDate)
    : `${formatThaiDate(startDate)} – ${formatThaiDate(endDate)}`;

  const flex = {
    type: 'flex',
    altText: `${user?.name ?? 'บุคลากร'} ขอลา${leaveType?.name ?? ''} ${daysText}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#1565C0', paddingAll: '16px',
        contents: [
          { type: 'text', text: `${typeIcon} คำขอใบลา`, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: leaveType?.name ?? 'ไม่ระบุประเภท', color: '#BBDEFB', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ผู้ขอลา', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: user?.name ?? '-', color: '#111111', size: 'sm', flex: 4, wrap: true },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'ฝ่าย/งาน', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: user?.department ?? '-', color: '#111111', size: 'sm', flex: 4, wrap: true },
            ],
          },
          { type: 'separator' },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'วันที่', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: dateText, color: '#111111', size: 'sm', flex: 4, wrap: true },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'จำนวน', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: daysText, color: '#1565C0', size: 'sm', flex: 4, weight: 'bold' },
            ],
          },
          { type: 'separator' },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'เหตุผล', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: reason ?? '-', color: '#333333', size: 'sm', flex: 4, wrap: true },
            ],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm', paddingAll: '12px',
        contents: [
          {
            type: 'button', style: 'primary', color: '#2E7D32', height: 'sm', flex: 1,
            action: { type: 'postback', label: '✅ อนุมัติ', data: `action=approve&requestId=${id}` },
          },
          {
            type: 'button', style: 'primary', color: '#C62828', height: 'sm', flex: 1,
            action: { type: 'postback', label: '❌ ไม่อนุมัติ', data: `action=reject&requestId=${id}` },
          },
        ],
      },
    },
  };

  return pushMessage(approverLineId, [flex]);
}

async function sendLeaveStatusNotify(lineUserId, request, status, comment) {
  if (!await isModuleNotifyEnabled('LEAVE')) return null;
  const { leaveType, startDate, endDate, totalDays, isHalfDay } = request;
  const statusText = status === 'APPROVED' ? '✅ อนุมัติแล้ว' : '❌ ไม่อนุมัติ';
  const color = status === 'APPROVED' ? '#1B5E20' : '#B71C1C';
  const daysText = isHalfDay ? 'ครึ่งวัน' : `${totalDays} วัน`;

  const flex = {
    type: 'flex',
    altText: `ใบลา${leaveType?.name ?? ''}: ${statusText}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: color, paddingAll: '16px',
        contents: [
          { type: 'text', text: statusText, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: `ใบลา${leaveType?.name ?? ''}`, color: '#ffffffaa', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'วันที่ลา', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: `${formatThaiDate(startDate)} – ${formatThaiDate(endDate)}`, color: '#111111', size: 'sm', flex: 4, wrap: true },
            ],
          },
          {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'จำนวน', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: daysText, color: '#111111', size: 'sm', flex: 4 },
            ],
          },
          ...(comment ? [{
            type: 'separator',
          }, {
            type: 'box', layout: 'horizontal', spacing: 'sm',
            contents: [
              { type: 'text', text: 'หมายเหตุ', color: '#888888', size: 'sm', flex: 2 },
              { type: 'text', text: comment, color: '#333333', size: 'sm', flex: 4, wrap: true },
            ],
          }] : []),
        ],
      },
    },
  };

  return pushMessage(lineUserId, [flex]);
}

// ─── Room Booking Flex messages ───────────────────────────────────────────────

function buildRoomImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const base = (process.env.FRONTEND_URL ?? 'https://app.retc.ac.th').replace(/\/$/, '');
  return `${base}${imagePath}`;
}

/** ส่ง Flex ให้ admin เมื่อมีคำขอจองห้องใหม่ (พร้อมปุ่มอนุมัติ/ไม่อนุมัติ) */
async function sendRoomBookingRequestFlex(adminLineId, booking) {
  if (!await isModuleNotifyEnabled('ROOM_BOOKING')) return null;
  const { id, title, startTime, endTime, attendees, purpose, room, user } = booking;
  const dateText = formatThaiDate(startTime);
  const timeText = `${new Date(startTime).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} – ${new Date(endTime).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.`;

  const roomImageUrl = buildRoomImageUrl(room?.image);

  const flex = {
    type: 'flex',
    altText: `${user?.name ?? 'บุคลากร'} ขอจองห้อง ${room?.name ?? ''}`,
    contents: {
      type: 'bubble',
      size: 'kilo',
      ...(roomImageUrl ? {
        hero: {
          type: 'image',
          url: roomImageUrl,
          size: 'full',
          aspectRatio: '20:9',
          aspectMode: 'cover',
        },
      } : {}),
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#1565C0', paddingAll: '16px',
        contents: [
          { type: 'text', text: '🚪 คำขอจองห้องประชุม', color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: room?.name ?? '', color: '#BBDEFB', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ผู้จอง', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: user?.name ?? '-', color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]},
          ...(user?.department ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ฝ่าย/งาน', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: user.department, color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]}] : []),
          { type: 'separator' },
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'วันที่', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: dateText, color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'เวลา', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: timeText, color: '#111111', size: 'sm', flex: 4 },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'หัวข้อ', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: title, color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]},
          ...(attendees ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ผู้เข้าร่วม', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: `${attendees} คน`, color: '#1565C0', size: 'sm', flex: 4, weight: 'bold' },
          ]}] : []),
          ...(purpose ? [{ type: 'separator' }, { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'วัตถุประสงค์', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: purpose, color: '#333333', size: 'sm', flex: 4, wrap: true },
          ]}] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm', paddingAll: '12px',
        contents: [
          { type: 'button', style: 'primary', color: '#2E7D32', height: 'sm', flex: 1,
            action: { type: 'postback', label: '✅ อนุมัติ', data: `action=room_approve&bookingId=${id}` } },
          { type: 'button', style: 'primary', color: '#C62828', height: 'sm', flex: 1,
            action: { type: 'postback', label: '❌ ไม่อนุมัติ', data: `action=room_reject&bookingId=${id}` } },
        ],
      },
    },
  };

  return pushMessage(adminLineId, [flex]);
}

/** แจ้งผู้จองเมื่อได้รับการอนุมัติหรือปฏิเสธ */
async function sendRoomBookingStatusFlex(lineUserId, booking, status, note) {
  if (!await isModuleNotifyEnabled('ROOM_BOOKING')) return null;
  const { title, startTime, endTime, room } = booking;
  const approved   = status === 'approved';
  const color      = approved ? '#1B5E20' : '#B71C1C';
  const labelColor = approved ? '#A5D6A7' : '#FFCDD2';
  const statusText = approved ? '✅ การจองได้รับการอนุมัติ' : '❌ การจองถูกปฏิเสธ';
  const dateText   = formatThaiDate(startTime);
  const timeText   = `${new Date(startTime).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} – ${new Date(endTime).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} น.`;

  const bodyContents = [
    { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'text', text: 'ห้องประชุม', color: '#888888', size: 'sm', flex: 3 },
      { type: 'text', text: room?.name ?? '-', color: '#111111', size: 'sm', flex: 4, wrap: true, weight: 'bold' },
    ]},
    { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'text', text: 'วันที่', color: '#888888', size: 'sm', flex: 3 },
      { type: 'text', text: dateText, color: '#111111', size: 'sm', flex: 4, wrap: true },
    ]},
    { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'text', text: 'เวลา', color: '#888888', size: 'sm', flex: 3 },
      { type: 'text', text: timeText, color: '#111111', size: 'sm', flex: 4 },
    ]},
    { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'text', text: 'หัวข้อ', color: '#888888', size: 'sm', flex: 3 },
      { type: 'text', text: title, color: '#111111', size: 'sm', flex: 4, wrap: true },
    ]},
    ...(note ? [{ type: 'separator' }, { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
      { type: 'text', text: 'หมายเหตุ', color: '#888888', size: 'sm', flex: 3 },
      { type: 'text', text: note, color: approved ? '#333' : '#C62828', size: 'sm', flex: 4, wrap: true },
    ]}] : []),
  ];

  const flex = {
    type: 'flex',
    altText: `${statusText}: ${room?.name ?? ''}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: color, paddingAll: '16px',
        contents: [
          { type: 'text', text: statusText, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: room?.name ?? '', color: labelColor, size: 'sm' },
        ],
      },
      body: { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px', contents: bodyContents },
    },
  };

  return pushMessage(lineUserId, [flex]);
}

// ─── WorkLog Flex messages ─────────────────────────────────────────────────────

function buildWorkLogImageUrl(imagePath) {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  const base = (process.env.FRONTEND_URL ?? 'https://app.retc.ac.th').replace(/\/$/, '');
  return `${base}${imagePath}`;
}

const WL_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function wlDateStr(logDate) {
  const d = new Date(logDate);
  return `${d.getDate()} ${WL_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

/** ส่ง Flex พร้อมปุ่ม อนุมัติ/ปฏิเสธ/ส่งคืน ให้หัวหน้างาน เมื่อ user ส่งบันทึกปฏิบัติงาน */
async function sendWorkLogFlex(supervisorLineId, log) {
  if (!await isModuleNotifyEnabled('WORKLOG')) return null;
  const base = (process.env.FRONTEND_URL ?? 'https://app.retc.ac.th').replace(/\/$/, '');
  const { id, title, detail, logDate, workType, user } = log;

  let attachments = [];
  try { attachments = typeof log.attachments === 'string' ? JSON.parse(log.attachments) : (log.attachments ?? []); } catch { /* */ }
  const firstImage = attachments.length > 0 ? buildWorkLogImageUrl(attachments[0]) : null;

  const flex = {
    type: 'flex',
    altText: `${user?.name ?? 'บุคลากร'} ส่งบันทึกปฏิบัติงาน: ${title}`,
    contents: {
      type: 'bubble', size: 'kilo',
      ...(firstImage ? { hero: { type: 'image', url: firstImage, size: 'full', aspectRatio: '20:9', aspectMode: 'cover' } } : {}),
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#E65100', paddingAll: '16px',
        contents: [
          { type: 'text', text: '📋 บันทึกปฏิบัติงาน', color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: 'รอการอนุมัติจากหัวหน้างาน', color: '#FFCCBC', size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ผู้บันทึก', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: user?.name ?? '-', color: '#111111', size: 'sm', flex: 4, wrap: true, weight: 'bold' },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'วันที่', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: wlDateStr(logDate), color: '#111111', size: 'sm', flex: 4 },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ประเภทงาน', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: workType?.name ?? '-', color: '#E65100', size: 'sm', flex: 4, weight: 'bold' },
          ]},
          { type: 'separator' },
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'หัวข้อ', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: title, color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]},
          ...(detail ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'รายละเอียด', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: detail.length > 80 ? detail.slice(0, 80) + '…' : detail, color: '#333333', size: 'sm', flex: 4, wrap: true },
          ]}] : []),
          ...(attachments.length > 0 ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'รูปภาพ', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: `${attachments.length} รูป`, color: '#1565C0', size: 'sm', flex: 4 },
          ]}] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px',
        contents: [
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'button', style: 'primary', color: '#2E7D32', height: 'sm', flex: 1,
              action: { type: 'postback', label: '✅ อนุมัติ', data: `action=worklog_approve&logId=${id}` } },
            { type: 'button', style: 'primary', color: '#C62828', height: 'sm', flex: 1,
              action: { type: 'postback', label: '❌ ปฏิเสธ', data: `action=worklog_reject&logId=${id}` } },
          ]},
          { type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'postback', label: '🔄 ส่งคืนเพื่อแก้ไข', data: `action=worklog_return&logId=${id}` } },
          { type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: '🔗 ดูรายละเอียด', uri: `${base}/worklog/${id}` } },
        ],
      },
    },
  };
  return pushMessage(supervisorLineId, [flex]);
}

/** แจ้งผู้บันทึกเมื่อหัวหน้าเปลี่ยนสถานะ */
async function sendWorkLogStatusFlex(userLineId, log, status, comment, approverName) {
  if (!await isModuleNotifyEnabled('WORKLOG')) return null;
  const base = (process.env.FRONTEND_URL ?? 'https://app.retc.ac.th').replace(/\/$/, '');
  const { id, title, logDate, workType } = log;

  const configs = {
    approved: { color: '#1B5E20', labelColor: '#A5D6A7', text: '✅ บันทึกปฏิบัติงานได้รับอนุมัติ', sub: 'อนุมัติแล้ว' },
    rejected: { color: '#B71C1C', labelColor: '#FFCDD2', text: '❌ บันทึกปฏิบัติงานถูกปฏิเสธ', sub: 'ปฏิเสธแล้ว' },
    returned: { color: '#E65100', labelColor: '#FFE0B2', text: '🔄 บันทึกปฏิบัติงานถูกส่งคืน', sub: 'ส่งคืนเพื่อแก้ไข' },
  };
  const cfg = configs[status] ?? configs.returned;

  const flex = {
    type: 'flex',
    altText: cfg.text,
    contents: {
      type: 'bubble', size: 'kilo',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: cfg.color, paddingAll: '16px',
        contents: [
          { type: 'text', text: cfg.text, color: '#ffffff', size: 'md', weight: 'bold' },
          { type: 'text', text: cfg.sub, color: cfg.labelColor, size: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '16px',
        contents: [
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'หัวข้อ', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: title, color: '#111111', size: 'sm', flex: 4, wrap: true, weight: 'bold' },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'วันที่', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: wlDateStr(logDate), color: '#111111', size: 'sm', flex: 4 },
          ]},
          { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ประเภทงาน', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: workType?.name ?? '-', color: '#111111', size: 'sm', flex: 4 },
          ]},
          ...(approverName ? [{ type: 'separator' }, { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'โดย', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: approverName, color: '#111111', size: 'sm', flex: 4, wrap: true },
          ]}] : []),
          ...(comment ? [{ type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
            { type: 'text', text: 'ความเห็น', color: '#888888', size: 'sm', flex: 2 },
            { type: 'text', text: comment, color: cfg.color, size: 'sm', flex: 4, wrap: true },
          ]}] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', paddingAll: '12px',
        contents: [
          { type: 'button', style: 'link', height: 'sm',
            action: { type: 'uri', label: '🔗 ดูรายละเอียด', uri: `${base}/worklog/${id}` } },
        ],
      },
    },
  };
  return pushMessage(userLineId, [flex]);
}

module.exports = {
  sendLineNotify, notify, notifyRepairTicket, notifyLostFound, notifyRoomBooking,
  sendLeaveRequestFlex, sendLeaveStatusNotify,
  sendRoomBookingRequestFlex, sendRoomBookingStatusFlex,
  sendWorkLogFlex, sendWorkLogStatusFlex,
  pushMessage,
  formatThaiDate, formatDateTime,
  isModuleNotifyEnabled,
};
