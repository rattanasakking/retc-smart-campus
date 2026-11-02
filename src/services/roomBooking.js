// ─── กันการจองห้องประชุมซ้อน ─────────────────────────────────────────────────
// การจองที่ "ยังมีผล" (รออนุมัติ/อนุมัติแล้ว) ห้ามเวลาทับกันในห้องเดียวกัน — ต่อกันพอดีได้ (จบ 11:00 / เริ่ม 11:00)
const ACTIVE_BOOKING = ['pending', 'approved'];

class BookingConflict extends Error {
  constructor(conflict) {
    super(`ห้องถูกจองในช่วงเวลานี้แล้ว (${conflict.user.name})`);
    this.conflict = conflict;
  }
}

// ต้องเรียกภายใน prisma.$transaction(async (tx) => ...) เท่านั้น
// ล็อกแถวห้อง (SELECT … FOR UPDATE) ก่อนตรวจ → คำขอที่เข้ามาพร้อมกันสำหรับห้องเดียวกันจะถูกทำทีละรายการ
// ไม่งั้นสองคำขอจะผ่านการตรวจพร้อมกันแล้วบันทึกซ้อนได้
// against: สถานะที่นับว่าชน — จองใหม่/กลับเป็นรออนุมัติ = ACTIVE_BOOKING;
//          ตอนอนุมัติ = ['approved'] (ถ้ามีรายการรออนุมัติซ้อนกันจากข้อมูลเก่า อนุมัติได้รายการแรก รายการถัดไปจะติด)
async function assertRoomFree(tx, roomId, start, end, excludeId = null, against = ACTIVE_BOOKING) {
  await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId} FOR UPDATE`;
  const conflict = await tx.roomBooking.findFirst({
    where: {
      roomId,
      status: { in: against },
      startTime: { lt: end },
      endTime:   { gt: start },
      ...(excludeId && { id: { not: excludeId } }),
    },
    include: { user: { select: { name: true } } },
  });
  if (conflict) throw new BookingConflict(conflict);
}

module.exports = { ACTIVE_BOOKING, BookingConflict, assertRoomFree };
