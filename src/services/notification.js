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

  // 2) Telegram + Email (ฟรี ไม่กินโควตา LINE)
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, telegramChatId: true, notifyByEmail: true },
    });
    const url = link ? `${FRONTEND}${link}` : null;
    for (const u of users) {
      if (u.telegramChatId) {
        sendTelegram(u.telegramChatId, `<b>${escapeHtml(title)}</b>\n${escapeHtml(message)}${url ? `\n\n🔗 ${url}` : ''}`).catch(() => {});
      }
      if (u.email && u.notifyByEmail) {
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

module.exports = { notifyUsers };
