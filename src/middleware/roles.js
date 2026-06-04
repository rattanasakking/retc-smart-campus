const { error } = require('../utils/response');

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('กรุณาเข้าสู่ระบบก่อน', 401));
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้', 403));
    }
    next();
  };
};

const requireAdmin = requireRoles('admin');
const requireAdminOrExecutive = requireRoles('admin', 'executive');

module.exports = { requireRoles, requireAdmin, requireAdminOrExecutive };
