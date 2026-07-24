const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTelegramToken() {
  if (process.env.TELEGRAM_BOT_TOKEN) return process.env.TELEGRAM_BOT_TOKEN.trim();
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key: 'telegram_bot_token' } });
    return (row?.value ?? '').trim();
  } catch { return ''; }
}

let _botUsername = null;
async function getBotUsername() {
  if (_botUsername) return _botUsername;
  const token = await getTelegramToken();
  if (!token) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((x) => x.json());
    if (r?.ok) { _botUsername = r.result.username; return _botUsername; }
  } catch { /* */ }
  return null;
}

async function sendTelegram(chatId, text) {
  if (!chatId) return null;
  const token = await getTelegramToken();
  if (!token) { console.warn('[Telegram] no bot token configured'); return null; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    if (!res.ok) console.error('[Telegram] send failed:', res.status, await res.text());
    return res.ok;
  } catch (e) { console.error('[Telegram] send error:', e.message); return null; }
}

// โค้ดเชื่อมบัญชีชั่วคราว (in-memory, อายุ 15 นาที)
const linkCodes = new Map(); // code -> { userId, exp }
function createLinkCode(userId) {
  const code = Math.random().toString(36).slice(2, 10);
  linkCodes.set(code, { userId, exp: Date.now() + 15 * 60 * 1000 });
  return code;
}
function consumeLinkCode(code) {
  const e = linkCodes.get(code);
  if (!e) return null;
  linkCodes.delete(code);
  return Date.now() > e.exp ? null : e.userId;
}

module.exports = { getTelegramToken, getBotUsername, sendTelegram, createLinkCode, consumeLinkCode };
