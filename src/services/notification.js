const { PrismaClient } = require('@prisma/client');
const { sendTelegram } = require('./telegram');
const { sendMail } = require('./email');
const prisma = new PrismaClient();

const FRONTEND = process.env.FRONTEND_URL ?? 'https://app.retc.ac.th';

/**
 * สร้างการแจ้งเตือนหลายช่องทาง: ในระบบ (กระดิ่ง) + Telegram + Email
 * @param {number[]} userIds
 * @param {{ title: string, message: string, type?: string, link?: string|null }} data
 */
async function notifyUsers(userIds, { title, message, type = 'general', link = null }) {
  const ids = [...new Set((userIds || []).filter((v) => Number.isInteger(v)))];
  if (!ids.length) return;

  // 1) แจ้งเตือนในระบบ (กระดิ่ง) — ฟรีเสมอ
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, title, message, type, link })),
    });
  } catch (e) { console.error('[notifyUsers] in-app error:', e.message); }

  // 2) Telegram + Email (ฟรี ไม่กินโควตา LINE) — เคารพสวิตช์เปิด/ปิดช่องทาง
  try {
    const [telegramOn, emailOn] = await Promise.all([
      isChannelEnabled('telegram'),
      isChannelEnabled('email'),
    ]);
    if (!telegramOn && !emailOn) return;

    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, telegramChatId: true, notifyByEmail: true },
    });
    const url = link ? `${FRONTEND}${link}` : null;
    for (const u of users) {
      if (telegramOn && u.telegramChatId) {
        sendTelegram(u.telegramChatId, `<b>${escapeHtml(title)}</b>\n${escapeHtml(message)}${url ? `\n\n🔗 ${url}` : ''}`).catch(() => {});
      }
      if (emailOn && u.email && u.notifyByEmail) {
        sendMail({
          to: u.email,
          subject: title,
          text: `${title}\n\n${message}${url ? `\n\n${url}` : ''}`,
          html: `<div style="font-family:sans-serif;line-height:1.7"><h3 style="margin:0 0 8px">${escapeHtml(title)}</h3><p style="margin:0">${escapeHtml(message).replace(/\n/g, '<br>')}</p>${url ? `<p style="margin-top:12px"><a href="${url}">เปิดในระบบ RETC Smart Campus</a></p>` : ''}</div>`,
        }).catch(() => {});
      }
    }
  } catch (e) { console.error('[notifyUsers] telegram/email error:', e.message); }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** ช่องทางแจ้งเตือนเปิดอยู่ไหม (line/telegram/email) — default: เปิด */
async function isChannelEnabled(channel) {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key: `notify_channel_${channel}` } });
    return row ? row.value === 'true' : true;
  } catch { return true; }
}

/** รายชื่อ userId ของ admin ที่ดูแลโมดูลนั้น (admin/executive ของระบบ + ผู้มีสิทธิ์โมดูล) */
async function getModuleAdminIds(module) {
  try {
    const [sysAdmins, moduleAdmins] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, role: { in: ['admin', 'executive'] } },
        select: { id: true },
      }),
      prisma.modulePermission.findMany({
        where: { module },
        include: { user: { select: { id: true, isActive: true } } },
      }),
    ]);
    const ids = new Set(sysAdmins.map((u) => u.id));
    for (const p of moduleAdmins) if (p.user?.isActive) ids.add(p.user.id);
    return [...ids];
  } catch (e) {
    console.error('[getModuleAdminIds] error:', e.message);
    return [];
  }
}

module.exports = { notifyUsers, getModuleAdminIds, isChannelEnabled };
