const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * สร้างการแจ้งเตือนในระบบ (กระดิ่ง) ให้ผู้ใช้หลายคน
 * @param {number[]} userIds
 * @param {{ title: string, message: string, type?: string, link?: string|null }} data
 */
async function notifyUsers(userIds, { title, message, type = 'general', link = null }) {
  const ids = [...new Set((userIds || []).filter((v) => Number.isInteger(v)))];
  if (!ids.length) return;
  try {
    await prisma.notification.createMany({
      data: ids.map((userId) => ({ userId, title, message, type, link })),
    });
  } catch (e) {
    console.error('[notifyUsers] error:', e.message);
  }
}

module.exports = { notifyUsers };
