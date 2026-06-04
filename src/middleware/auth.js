const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error('กรุณาเข้าสู่ระบบก่อน', 401));
  }

  const token = authHeader.slice(7); // ตัด "Bearer "
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json(error('Token ไม่ถูกต้องหรือหมดอายุ', 401));
  }
};

module.exports = authMiddleware;
