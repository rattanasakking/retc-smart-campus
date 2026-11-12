// บันทึกรูปโปรไฟล์ → /uploads/avatars/... (PNG / JPG / WebP / GIF, ≤ 5 MB) — ดูเหตุผลใน utils/upload.js
const { saveDataUrl, UploadError } = require('./upload');

const saveAvatarImage = (dataUrl) => saveDataUrl(dataUrl, { folder: 'avatars', prefix: 'avatar', label: 'รูปโปรไฟล์' });

module.exports = { saveAvatarImage, AvatarError: UploadError };
