const success = (data = null, message = 'สำเร็จ', statusCode = 200) => ({
  success: true,
  message,
  data,
  statusCode,
});

const error = (message = 'เกิดข้อผิดพลาด', statusCode = 400) => ({
  success: false,
  message,
  data: null,
  statusCode,
});

const paginate = (data, total, page, limit) => ({
  success: true,
  message: 'สำเร็จ',
  data,
  pagination: {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / limit),
  },
});

module.exports = { success, error, paginate };
