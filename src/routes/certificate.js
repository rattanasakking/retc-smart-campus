const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { PrismaClient } = require('@prisma/client');
const auth    = require('../middleware/auth');
const { success, error, paginate } = require('../utils/response');

const router = express.Router();
const prisma = new PrismaClient();

// ─── helpers ────────────────────────────────────────────────────────────────
const intOrNull = (v) => (v !== undefined && v !== '' && v !== null) ? parseInt(v, 10) : null;

function saveCertTemplate(base64) {
  const data  = base64.replace(/^data:[\w/+-]+;base64,/, '');
  const match = base64.match(/^data:([\w/+-]+);base64,/);
  const mime  = match?.[1] ?? 'image/png';
  const ext   = mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';
  const name  = `cert_tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const dir   = path.join(__dirname, '..', '..', 'uploads', 'certificates');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), Buffer.from(data, 'base64'));
  return `/uploads/certificates/${name}`;
}

function removeUpload(url) {
  if (!url || !url.startsWith('/uploads/')) return;
  const p = path.join(__dirname, '..', '..', url.replace(/^\//, ''));
  fs.promises.unlink(p).catch(() => {});
}

// ค่าเริ่มต้นของการจัดวางข้อความบนเกียรติบัตร (เทียบเท่า parseTextSettings ใน PHP)
function normalizeTextSettings(raw) {
  let ts = {};
  try { ts = typeof raw === 'string' ? JSON.parse(raw) : (raw ?? {}); } catch { ts = {}; }
  if (!ts || typeof ts !== 'object') ts = {};

  const F = 'Prompt';
  const def = {
    name: { show: true,  x: 50, y: 45, fontSize: 30, color: '#000000', font: F },
    pos:  { show: false, x: 50, y: 55, fontSize: 22, color: '#000000', font: F },
    awd:  { show: false, x: 50, y: 65, fontSize: 25, color: '#000000', font: F },
    cert: { show: false, x: 85, y: 10, fontSize: 15, color: '#000000', font: F },
    qr:   { show: true,  x: 85, y: 80, size: 100 },
  };

  const out = {};
  for (const k of ['name', 'pos', 'awd', 'cert']) {
    const s = (ts[k] && typeof ts[k] === 'object') ? ts[k] : {};
    out[k] = {
      show: s.show ?? def[k].show,
      x: Number(s.x ?? def[k].x),
      y: Number(s.y ?? def[k].y),
      fontSize: Number(s.fontSize ?? def[k].fontSize),
      color: s.color ?? def[k].color,
      font: s.font ?? def[k].font,
    };
  }
  const q = (ts.qr && typeof ts.qr === 'object') ? ts.qr : {};
  out.qr = {
    show: q.show ?? def.qr.show,
    x: Number(q.x ?? def.qr.x),
    y: Number(q.y ?? def.qr.y),
    size: Number(q.size ?? def.qr.size),
  };

  // ลายเซ็น 3 ช่อง (สำหรับผู้ลงนาม 3 คน)
  const SIG_DEF = [{ x: 25, y: 82 }, { x: 50, y: 82 }, { x: 75, y: 82 }];
  const sigArr = Array.isArray(ts.signatures) ? ts.signatures : [];
  out.signatures = [0, 1, 2].map((i) => {
    const s = (sigArr[i] && typeof sigArr[i] === 'object') ? sigArr[i] : {};
    return {
      show: s.show ?? false,
      url: typeof s.url === 'string' ? s.url : '',
      x: Number(s.x ?? SIG_DEF[i].x),
      y: Number(s.y ?? SIG_DEF[i].y),
      size: Number(s.size ?? 140),
      name: typeof s.name === 'string' ? s.name : '',
      position: typeof s.position === 'string' ? s.position : '',
    };
  });
  return out;
}

// บันทึกรูปลายเซ็นที่อัปโหลดใหม่ (base64) แล้วใส่ url ลงใน settings
function applySignatureImages(tsObj, signatureImages) {
  const imgs = signatureImages || {};
  for (let i = 0; i < tsObj.signatures.length; i++) {
    const b64 = imgs[i] ?? imgs[String(i)];
    if (typeof b64 === 'string' && b64.startsWith('data:')) {
      if (tsObj.signatures[i].url) removeUpload(tsObj.signatures[i].url);
      tsObj.signatures[i].url = saveCertTemplate(b64);
    }
  }
}

// ─── permission helpers ─────────────────────────────────────────────────────
// ผู้ดูแลเกียรติบัตร = superadmin / role admin / ได้รับสิทธิ์โมดูล CERTIFICATE (ทุก level)
// สร้าง/แก้ไข/ลบ โครงการและเลขชุดได้ทั้งหมด — ส่วนสิทธิ์จำกัดเฉพาะบางโครงการใช้ตาราง cert_project_access
async function isCertAdmin(user) {
  if (user.isSuperAdmin || user.role === 'admin') return true;
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: user.id, module: 'CERTIFICATE' },
  });
  return !!perm;
}

async function hasCertModule(user) {
  const perm = await prisma.modulePermission.findFirst({
    where: { userId: user.id, module: 'CERTIFICATE' },
  });
  return !!perm;
}

async function hasProjectAccess(user) {
  const cnt = await prisma.certProjectAccess.count({ where: { userId: user.id } });
  return cnt > 0;
}

// ใช้งานโมดูลได้ = admin / มีสิทธิ์โมดูล / ได้รับสิทธิ์เข้าถึงโครงการอย่างน้อย 1 โครงการ
async function canUseCert(user) {
  return (await isCertAdmin(user)) || (await hasCertModule(user)) || (await hasProjectAccess(user));
}

// คืน null = เข้าถึงได้ทุกโครงการ (admin), หรือ array ของ projectId ที่เข้าถึงได้
async function allowedProjectIds(user) {
  if (await isCertAdmin(user)) return null;
  const rows = await prisma.certProjectAccess.findMany({
    where: { userId: user.id }, select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

// middleware: เข้าถึงโมดูลได้ (admin / สิทธิ์โมดูล / สิทธิ์เข้าถึงโครงการ)
async function requireCert(req, res, next) {
  try {
    if (await canUseCert(req.user)) return next();
    return res.status(403).json(error('ไม่มีสิทธิ์เข้าถึงโมดูลเกียรติบัตร'));
  } catch (e) { next(e); }
}

// middleware: ต้องเป็นผู้ดูแล (admin) ของโมดูล
async function requireCertAdmin(req, res, next) {
  try {
    if (await isCertAdmin(req.user)) return next();
    return res.status(403).json(error('เฉพาะผู้ดูแลระบบเกียรติบัตรเท่านั้น'));
  } catch (e) { next(e); }
}

// ตรวจว่าเข้าถึง projectId นี้ได้ไหม
async function canAccessProject(user, projectId) {
  const allowed = await allowedProjectIds(user);
  if (allowed === null) return true;
  return allowed.includes(Number(projectId));
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (ไม่ต้อง login) — ต้องมาก่อน auth middleware
// ═══════════════════════════════════════════════════════════════════════════

const PUBLIC_CERT_SELECT = {
  id: true, certNo: true, firstname: true, lastname: true,
  idCard: true, position: true, award: true, issueDate: true,
  project: { select: { name: true, templateUrl: true, textSettings: true } },
};

function shapePublicCert(c) {
  return {
    id: c.id,
    certNo: c.certNo,
    firstname: c.firstname,
    lastname: c.lastname,
    idCard: c.idCard,
    position: c.position,
    award: c.award,
    issueDate: c.issueDate,
    projectName: c.project?.name ?? null,
    templateUrl: c.project?.templateUrl ?? null,
    textSettings: normalizeTextSettings(c.project?.textSettings),
  };
}

// GET /api/certificate/public/search?keyword=
router.get('/public/search', async (req, res, next) => {
  try {
    const keyword = (req.query.keyword ?? '').toString().trim();
    if (!keyword) return res.json(success([]));

    const certs = await prisma.cert.findMany({
      where: {
        AND: [
          { NOT: { firstname: '-' } }, // ไม่แสดงใบที่ยังว่าง (รอระบุชื่อ)
          {
            OR: [
              { firstname: { contains: keyword } },
              { lastname:  { contains: keyword } },
              { idCard: keyword },
              { certNo: keyword },
            ],
          },
        ],
      },
      select: PUBLIC_CERT_SELECT,
      orderBy: { id: 'desc' },
      take: 60,
    });
    res.json(success(certs.map(shapePublicCert)));
  } catch (e) { next(e); }
});

// GET /api/certificate/qr?text=...&size=...  — proxy QR ให้เป็น same-origin (สำหรับดาวน์โหลดรูปภาพ/แคนวาส)
router.get('/qr', async (req, res) => {
  const text = (req.query.text ?? '').toString();
  const size = Math.min(1000, Math.max(50, parseInt(req.query.size ?? '150', 10) || 150));
  const primary  = `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=${size}&margin=1`;
  const fallback = `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(text)}`;
  for (const url of [primary, fallback]) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      res.set('Content-Type', r.headers.get('content-type') || 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buf);
    } catch { /* ลอง fallback */ }
  }
  res.status(502).json(error('ไม่สามารถสร้าง QR ได้'));
});

// GET /api/certificate/public/certs?ids=1,2,3  (ใช้หน้าพิมพ์)
router.get('/public/certs', async (req, res, next) => {
  try {
    const ids = (req.query.ids ?? '').toString().split(',').map((x) => parseInt(x, 10)).filter(Boolean);
    if (ids.length === 0) return res.json(success([]));
    const certs = await prisma.cert.findMany({
      where: { id: { in: ids } },
      select: PUBLIC_CERT_SELECT,
    });
    // เรียงตามลำดับ ids ที่ส่งมา
    const map = new Map(certs.map((c) => [c.id, c]));
    const ordered = ids.map((id) => map.get(id)).filter(Boolean).map(shapePublicCert);
    res.json(success(ordered));
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════════════════════════
// ตั้งแต่นี้ไปต้อง login
// ═══════════════════════════════════════════════════════════════════════════
router.use(auth);

// GET /api/certificate/me — สิทธิ์ของผู้ใช้ปัจจุบันในโมดูลนี้
router.get('/me', async (req, res, next) => {
  try {
    const admin = await isCertAdmin(req.user);
    res.json(success({ isCertAdmin: admin, canAccess: await canUseCert(req.user) }));
  } catch (e) { next(e); }
});

// GET /api/certificate/access-candidates — รายชื่อผู้ใช้สำหรับมอบสิทธิ์เข้าถึงโครงการ
router.get('/access-candidates', requireCertAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, department: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(success(users));
  } catch (e) { next(e); }
});

// ─── PROJECTS ────────────────────────────────────────────────────────────────

// GET /api/certificate/projects
router.get('/projects', requireCert, async (req, res, next) => {
  try {
    const allowed = await allowedProjectIds(req.user);
    const where = allowed === null ? {} : { id: { in: allowed.length ? allowed : [0] } };
    const projects = await prisma.certProject.findMany({
      where,
      orderBy: { id: 'desc' },
      include: { _count: { select: { certs: true } } },
    });
    res.json(success(projects.map((p) => ({
      id: p.id, name: p.name, templateUrl: p.templateUrl,
      textSettings: normalizeTextSettings(p.textSettings),
      certCount: p._count.certs,
      createdAt: p.createdAt,
    }))));
  } catch (e) { next(e); }
});

// GET /api/certificate/projects/:id
router.get('/projects/:id', requireCert, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!await canAccessProject(req.user, id)) return res.status(403).json(error('ไม่มีสิทธิ์เข้าถึงโครงการนี้'));
    const p = await prisma.certProject.findUnique({
      where: { id },
      include: { access: { select: { userId: true } } },
    });
    if (!p) return res.status(404).json(error('ไม่พบโครงการ'));
    res.json(success({
      id: p.id, name: p.name, templateUrl: p.templateUrl,
      textSettings: normalizeTextSettings(p.textSettings),
      accessUserIds: p.access.map((a) => a.userId),
      createdAt: p.createdAt,
    }));
  } catch (e) { next(e); }
});

// POST /api/certificate/projects  (admin)
router.post('/projects', requireCertAdmin, async (req, res, next) => {
  try {
    const { name, templateBase64, textSettings, accessUserIds } = req.body;
    if (!name) return res.status(400).json(error('กรุณาระบุชื่อโครงการ'));

    let templateUrl = '';
    if (templateBase64 && typeof templateBase64 === 'string' && templateBase64.startsWith('data:')) {
      templateUrl = saveCertTemplate(templateBase64);
    }
    if (!templateUrl) return res.status(400).json(error('กรุณาอัปโหลดรูปแบบเกียรติบัตร (template)'));

    const tsObj = normalizeTextSettings(textSettings);
    applySignatureImages(tsObj, req.body.signatureImages);
    const project = await prisma.certProject.create({
      data: { name: name.trim(), templateUrl, textSettings: JSON.stringify(tsObj) },
    });

    if (Array.isArray(accessUserIds) && accessUserIds.length) {
      await prisma.certProjectAccess.createMany({
        data: accessUserIds.map((uid) => ({ userId: parseInt(uid, 10), projectId: project.id })),
        skipDuplicates: true,
      });
    }
    res.status(201).json(success({ id: project.id }, 'สร้างโครงการสำเร็จ'));
  } catch (e) { next(e); }
});

// PUT /api/certificate/projects/:id  (แก้ไขได้ = admin หรือผู้มีสิทธิ์เข้าถึงโครงการ)
router.put('/projects/:id', requireCert, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.certProject.findUnique({ where: { id } });
    if (!existing) return res.status(404).json(error('ไม่พบโครงการ'));
    if (!await canAccessProject(req.user, id)) return res.status(403).json(error('ไม่มีสิทธิ์แก้ไขโครงการนี้'));

    const { name, templateBase64, textSettings, accessUserIds } = req.body;

    let templateUrl = existing.templateUrl;
    if (templateBase64 && typeof templateBase64 === 'string' && templateBase64.startsWith('data:')) {
      templateUrl = saveCertTemplate(templateBase64);
      removeUpload(existing.templateUrl);
    }

    const tsObj = normalizeTextSettings(textSettings ?? existing.textSettings);
    applySignatureImages(tsObj, req.body.signatureImages);

    await prisma.certProject.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        templateUrl,
        textSettings: JSON.stringify(tsObj),
      },
    });

    // เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขรายชื่อผู้มีสิทธิ์เข้าถึงได้
    if (Array.isArray(accessUserIds) && await isCertAdmin(req.user)) {
      await prisma.certProjectAccess.deleteMany({ where: { projectId: id } });
      if (accessUserIds.length) {
        await prisma.certProjectAccess.createMany({
          data: accessUserIds.map((uid) => ({ userId: parseInt(uid, 10), projectId: id })),
          skipDuplicates: true,
        });
      }
    }
    res.json(success({ id }, 'บันทึกโครงการสำเร็จ'));
  } catch (e) { next(e); }
});

// DELETE /api/certificate/projects/:id  (admin)
router.delete('/projects/:id', requireCertAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const p = await prisma.certProject.findUnique({ where: { id } });
    if (!p) return res.status(404).json(error('ไม่พบโครงการ'));
    await prisma.certProject.delete({ where: { id } });
    removeUpload(p.templateUrl);
    res.json(success(null, 'ลบโครงการสำเร็จ'));
  } catch (e) { next(e); }
});

// ─── SERIES (admin) ────────────────────────────────────────────────────────

router.get('/series', requireCert, async (req, res, next) => {
  try {
    const allowed = await allowedProjectIds(req.user);
    const where = allowed === null ? {} : { projectId: { in: allowed.length ? allowed : [0] } };
    const list = await prisma.certSeries.findMany({
      where,
      orderBy: { id: 'desc' },
      // _count.certs = จำนวนใบที่ออกจากชุดนี้จริง (รวมที่นำเข้าจาก CSV) ใช้เป็นตัวเลข "ใช้ไปแล้ว"
      include: { project: { select: { name: true } }, _count: { select: { certs: true } } },
    });
    res.json(success(list.map((s) => ({
      id: s.id, projectId: s.projectId, projectName: s.project?.name ?? null,
      prefix: s.prefix, year: s.year, startNum: s.startNum,
      quantity: s.quantity,
      // ใช้จำนวนจริงเป็นหลัก (กันกรณีตัวนับกับข้อมูลจริงไม่ตรงกัน)
      lastNum: Math.max(s.lastNum, s._count.certs),
      issuedCount: s._count.certs,
      reqFirstname: s.reqFirstname, reqLastname: s.reqLastname, reqDepartment: s.reqDepartment,
      createdAt: s.createdAt,
    }))));
  } catch (e) { next(e); }
});

router.post('/series', requireCertAdmin, async (req, res, next) => {
  try {
    const { projectId, prefix, year, startNum, quantity, reqFirstname, reqLastname, reqDepartment } = req.body;
    if (!projectId || !prefix) return res.status(400).json(error('กรุณาเลือกโครงการและระบุคำนำหน้ารหัส'));
    const s = await prisma.certSeries.create({
      data: {
        projectId: intOrNull(projectId),
        prefix: prefix.trim(),
        year: (year ?? '').toString().trim() || null,
        startNum: parseInt(startNum, 10) || 1,
        quantity: parseInt(quantity, 10) || 1,
        lastNum: 0,
        reqFirstname: (reqFirstname ?? '').trim() || null,
        reqLastname: (reqLastname ?? '').trim() || null,
        reqDepartment: (reqDepartment ?? '').trim() || null,
      },
    });
    res.status(201).json(success({ id: s.id }, 'สร้างชุดเลขสำเร็จ'));
  } catch (e) { next(e); }
});

router.put('/series/:id', requireCertAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const old = await prisma.certSeries.findUnique({ where: { id } });
    if (!old) return res.status(404).json(error('ไม่พบชุดเลข'));

    const { projectId, prefix, year, startNum, quantity, reqFirstname, reqLastname, reqDepartment } = req.body;
    const newPrefix = (prefix ?? old.prefix).trim();
    const newYear = ((year ?? old.year) ?? '').toString().trim() || null;

    await prisma.certSeries.update({
      where: { id },
      data: {
        projectId: projectId !== undefined ? intOrNull(projectId) : old.projectId,
        prefix: newPrefix,
        year: newYear,
        startNum: startNum !== undefined ? (parseInt(startNum, 10) || 1) : old.startNum,
        quantity: quantity !== undefined ? (parseInt(quantity, 10) || 1) : old.quantity,
        reqFirstname: reqFirstname !== undefined ? ((reqFirstname ?? '').trim() || null) : old.reqFirstname,
        reqLastname: reqLastname !== undefined ? ((reqLastname ?? '').trim() || null) : old.reqLastname,
        reqDepartment: reqDepartment !== undefined ? ((reqDepartment ?? '').trim() || null) : old.reqDepartment,
      },
    });

    // ถ้าเปลี่ยน prefix/year → อัปเดตเลขที่ของเกียรติบัตรในชุดนี้ให้สอดคล้อง (เหมือน PHP)
    if (old.prefix !== newPrefix || (old.year ?? '') !== (newYear ?? '')) {
      const certs = await prisma.cert.findMany({ where: { seriesId: id }, select: { id: true, certNo: true } });
      for (const c of certs) {
        let mid = c.certNo;
        if (old.prefix) mid = mid.replace(new RegExp('^' + escapeReg(old.prefix)), '');
        if (old.year) mid = mid.replace(new RegExp(escapeReg(old.year) + '$'), '');
        const newCertNo = `${newPrefix}${mid}${newYear ?? ''}`;
        await prisma.cert.update({ where: { id: c.id }, data: { certNo: newCertNo } });
      }
    }
    res.json(success({ id }, 'บันทึกชุดเลขสำเร็จ'));
  } catch (e) { next(e); }
});

router.delete('/series/:id', requireCertAdmin, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.certSeries.delete({ where: { id } });
    res.json(success(null, 'ลบชุดเลขสำเร็จ'));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json(error('ไม่พบชุดเลข'));
    next(e);
  }
});

function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ─── CERTS ─────────────────────────────────────────────────────────────────

const CERT_SELECT = {
  id: true, projectId: true, seriesId: true, certNo: true,
  firstname: true, lastname: true, idCard: true, position: true, award: true,
  issueDate: true, createdAt: true,
  project: { select: { name: true } },
  issuedBy: { select: { name: true } },
};

function shapeCert(c) {
  return {
    id: c.id, projectId: c.projectId, seriesId: c.seriesId, certNo: c.certNo,
    firstname: c.firstname, lastname: c.lastname, idCard: c.idCard,
    position: c.position, award: c.award, issueDate: c.issueDate,
    projectName: c.project?.name ?? null,
    issuerName: c.issuedBy?.name ?? null,
    createdAt: c.createdAt,
  };
}

// GET /api/certificate/certs?search=&projectId=&year=&month=&page=&limit=
router.get('/certs', requireCert, async (req, res, next) => {
  try {
    const { search, projectId, year, month } = req.query;
    const page  = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(500, parseInt(req.query.limit || '100', 10));

    const allowed = await allowedProjectIds(req.user);
    const where = { AND: [] };
    if (allowed !== null) where.AND.push({ projectId: { in: allowed.length ? allowed : [0] } });
    if (projectId) where.AND.push({ projectId: parseInt(projectId, 10) });
    if (search) {
      const s = search.toString();
      where.AND.push({ OR: [
        { firstname: { contains: s } }, { lastname: { contains: s } },
        { certNo: { contains: s } }, { idCard: { contains: s } },
      ] });
    }
    if (year)  where.AND.push({ certNo: { contains: year.toString() } });
    if (month) { /* month filter applies to reports; handled there via issueDate */ }

    const [rows, total] = await Promise.all([
      // เรียงจากน้อยไปมาก (ลำดับการนำเข้า/ออกเลข = แถวบนสุดของไฟล์ได้เลขแรก)
      prisma.cert.findMany({ where, select: CERT_SELECT, orderBy: { id: 'asc' }, skip: (page - 1) * limit, take: limit }),
      prisma.cert.count({ where }),
    ]);
    res.json(paginate(rows.map(shapeCert), total, page, limit));
  } catch (e) { next(e); }
});

// GET /api/certificate/certs/:id
router.get('/certs/:id', requireCert, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const c = await prisma.cert.findUnique({ where: { id }, select: CERT_SELECT });
    if (!c) return res.status(404).json(error('ไม่พบเกียรติบัตร'));
    if (!await canAccessProject(req.user, c.projectId)) return res.status(403).json(error('ไม่มีสิทธิ์'));
    res.json(success(shapeCert(c)));
  } catch (e) { next(e); }
});

// POST /api/certificate/certs — ออกเกียรติบัตร (เดี่ยว)
router.post('/certs', requireCert, async (req, res, next) => {
  try {
    const { projectId, seriesId, certNo, firstname, lastname, idCard, position, award, issueDate } = req.body;
    const pid = parseInt(projectId, 10);
    if (!pid) return res.status(400).json(error('กรุณาเลือกโครงการ'));
    if (!await canAccessProject(req.user, pid)) return res.status(403).json(error('ไม่มีสิทธิ์ออกเกียรติบัตรในโครงการนี้'));

    const sid = seriesId ? parseInt(seriesId, 10) : null;
    let finalCertNo = (certNo ?? '').toString().trim();

    const result = await prisma.$transaction(async (tx) => {
      if (sid) {
        const series = await tx.certSeries.findUnique({ where: { id: sid } });
        if (!series) throw httpError(404, 'ไม่พบชุดเลขที่เลือก');
        if (series.lastNum >= series.quantity) throw httpError(400, `ชุดเลขนี้ออกครบจำนวนแล้ว (${series.quantity} ใบ)`);
        const currentNum = series.startNum + series.lastNum;
        finalCertNo = `${series.prefix}${String(currentNum).padStart(3, '0')}${series.year ?? ''}`;
        await tx.certSeries.update({ where: { id: sid }, data: { lastNum: { increment: 1 } } });
      }
      if (!finalCertNo) throw httpError(400, 'กรุณากรอกรหัสเกียรติบัตร หรือเลือกชุดเลขอัตโนมัติ');

      return tx.cert.create({
        data: {
          projectId: pid, seriesId: sid, certNo: finalCertNo,
          firstname: (firstname ?? '').trim() || '-',
          lastname: (lastname ?? '').trim() || '-',
          idCard: (idCard ?? '').trim() || null,
          position: (position ?? '').trim() || null,
          award: (award ?? '').trim() || null,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          issuedById: req.user.id,
        },
      });
    });
    res.status(201).json(success({ id: result.id, certNo: result.certNo }, 'ออกเกียรติบัตรสำเร็จ'));
  } catch (e) {
    if (e.httpStatus) return res.status(e.httpStatus).json(error(e.message));
    next(e);
  }
});

// PUT /api/certificate/certs/:id — แก้ไขข้อมูล (ไม่แตะเลขชุด)
router.put('/certs/:id', requireCert, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.cert.findUnique({ where: { id } });
    if (!existing) return res.status(404).json(error('ไม่พบเกียรติบัตร'));
    if (!await canAccessProject(req.user, existing.projectId)) return res.status(403).json(error('ไม่มีสิทธิ์'));

    const { projectId, certNo, firstname, lastname, idCard, position, award } = req.body;
    await prisma.cert.update({
      where: { id },
      data: {
        ...(projectId !== undefined && { projectId: parseInt(projectId, 10) }),
        ...(certNo !== undefined && certNo !== '' && { certNo: certNo.trim() }),
        ...(firstname !== undefined && { firstname: (firstname ?? '').trim() || '-' }),
        ...(lastname !== undefined && { lastname: (lastname ?? '').trim() || '-' }),
        ...(idCard !== undefined && { idCard: (idCard ?? '').trim() || null }),
        ...(position !== undefined && { position: (position ?? '').trim() || null }),
        ...(award !== undefined && { award: (award ?? '').trim() || null }),
      },
    });
    res.json(success({ id }, 'บันทึกข้อมูลสำเร็จ'));
  } catch (e) { next(e); }
});

// DELETE /api/certificate/certs/:id
router.delete('/certs/:id', requireCert, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const c = await prisma.cert.findUnique({ where: { id } });
    if (!c) return res.status(404).json(error('ไม่พบเกียรติบัตร'));
    if (!await canAccessProject(req.user, c.projectId)) return res.status(403).json(error('ไม่มีสิทธิ์'));

    await prisma.cert.delete({ where: { id } });
    if (c.seriesId) {
      await prisma.certSeries.updateMany({
        where: { id: c.seriesId, lastNum: { gt: 0 } },
        data: { lastNum: { decrement: 1 } },
      });
    }
    res.json(success(null, 'ลบเกียรติบัตรสำเร็จ'));
  } catch (e) { next(e); }
});

// POST /api/certificate/certs/bulk-delete  { ids: [] }
router.post('/certs/bulk-delete', requireCert, async (req, res, next) => {
  try {
    const ids = (req.body.ids ?? []).map((x) => parseInt(x, 10)).filter(Boolean);
    if (!ids.length) return res.status(400).json(error('ไม่มีรายการที่เลือก'));

    const allowed = await allowedProjectIds(req.user);
    const where = { id: { in: ids } };
    if (allowed !== null) where.projectId = { in: allowed.length ? allowed : [0] };

    // คืนเลขชุด (last_num) ตามจำนวนที่ลบต่อชุด
    const grouped = await prisma.cert.groupBy({
      by: ['seriesId'], where: { ...where, seriesId: { not: null } }, _count: { _all: true },
    });
    const targets = await prisma.cert.findMany({ where, select: { id: true } });
    const delIds = targets.map((t) => t.id);
    await prisma.cert.deleteMany({ where: { id: { in: delIds } } });
    for (const g of grouped) {
      if (g.seriesId) {
        await prisma.certSeries.update({
          where: { id: g.seriesId },
          data: { lastNum: { decrement: g._count._all } },
        }).catch(() => {});
        // กัน lastNum ติดลบ
        await prisma.certSeries.updateMany({ where: { id: g.seriesId, lastNum: { lt: 0 } }, data: { lastNum: 0 } });
      }
    }
    res.json(success({ deleted: delIds.length }, `ลบ ${delIds.length} รายการสำเร็จ`));
  } catch (e) { next(e); }
});

// POST /api/certificate/certs/import — นำเข้าจาก CSV (frontend แปลงเป็น array มาแล้ว)
// body: { projectId, seriesId?, issueDate?, rows: [{firstname,lastname,idCard,position,award,certNo}] }
router.post('/certs/import', requireCert, async (req, res, next) => {
  try {
    const pid = parseInt(req.body.projectId, 10);
    if (!pid) return res.status(400).json(error('กรุณาเลือกโครงการ'));
    if (!await canAccessProject(req.user, pid)) return res.status(403).json(error('ไม่มีสิทธิ์'));

    const sid = req.body.seriesId ? parseInt(req.body.seriesId, 10) : null;
    const issueDate = req.body.issueDate ? new Date(req.body.issueDate) : new Date();
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json(error('ไม่มีข้อมูลในไฟล์'));

    let count = 0, skipped = 0;
    await prisma.$transaction(async (tx) => {
      let series = null;
      if (sid) {
        series = await tx.certSeries.findUnique({ where: { id: sid } });
      }
      for (const r of rows) {
        const firstname = (r.firstname ?? '').toString().trim();
        const lastname  = (r.lastname ?? '').toString().trim();
        if (!firstname && !lastname) continue;

        let certNo = (r.certNo ?? '').toString().trim();
        if (series) {
          if (series.lastNum >= series.quantity) { skipped++; continue; }
          const currentNum = series.startNum + series.lastNum;
          certNo = `${series.prefix}${String(currentNum).padStart(3, '0')}${series.year ?? ''}`;
          series.lastNum++;
          await tx.certSeries.update({ where: { id: sid }, data: { lastNum: series.lastNum } });
        }
        if (!certNo) { skipped++; continue; }

        await tx.cert.create({
          data: {
            projectId: pid, seriesId: sid, certNo,
            firstname: firstname || '-', lastname: lastname || '-',
            idCard: (r.idCard ?? '').toString().trim() || null,
            position: (r.position ?? '').toString().trim() || null,
            award: (r.award ?? '').toString().trim() || null,
            issueDate, issuedById: req.user.id,
          },
        });
        count++;
      }
    });

    // ปรับตัวนับของชุดให้ตรงกับจำนวนใบจริงเสมอ (จำนวนคงเหลือจะลดลงถูกต้องหลังนำเข้า)
    if (sid) {
      const actual = await prisma.cert.count({ where: { seriesId: sid } });
      await prisma.certSeries.update({ where: { id: sid }, data: { lastNum: actual } }).catch(() => {});
    }

    res.json(success({ count, skipped }, `นำเข้า ${count} รายการสำเร็จ${skipped ? ` (ข้าม ${skipped} รายการ)` : ''}`));
  } catch (e) { next(e); }
});

// ─── STATS (Dashboard) ───────────────────────────────────────────────────────
router.get('/stats', requireCert, async (req, res, next) => {
  try {
    const allowed = await allowedProjectIds(req.user);
    const projWhere = allowed === null ? {} : { id: { in: allowed.length ? allowed : [0] } };
    const certWhere = { NOT: { firstname: '-' } };
    if (allowed !== null) certWhere.projectId = { in: allowed.length ? allowed : [0] };

    const [projectCount, certCount] = await Promise.all([
      prisma.certProject.count({ where: projWhere }),
      prisma.cert.count({ where: certWhere }),
    ]);

    // กราฟ: จำนวนเกียรติบัตรที่ออกรายเดือน (ปีปัจจุบัน)
    const year = new Date().getFullYear();
    const yearCerts = await prisma.cert.findMany({
      where: { ...certWhere, issueDate: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      select: { issueDate: true },
    });
    const monthly = Array(12).fill(0);
    for (const c of yearCerts) monthly[new Date(c.issueDate).getMonth()]++;

    res.json(success({ projectCount, certCount, year, monthly }));
  } catch (e) { next(e); }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

// GET /api/certificate/reports/certs?month=&year=&projectId=
router.get('/reports/certs', requireCert, async (req, res, next) => {
  try {
    const { month, year, projectId } = req.query;
    const allowed = await allowedProjectIds(req.user);

    const where = { AND: [{ NOT: { firstname: '-' } }] };
    if (allowed !== null) where.AND.push({ projectId: { in: allowed.length ? allowed : [0] } });
    if (projectId && projectId !== 'all') where.AND.push({ projectId: parseInt(projectId, 10) });
    if (year && year !== 'all') {
      const y = parseInt(year, 10);
      if (month && month !== 'all') {
        const m = parseInt(month, 10);
        where.AND.push({ issueDate: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } });
      } else {
        where.AND.push({ issueDate: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } });
      }
    }

    const rows = await prisma.cert.findMany({ where, select: CERT_SELECT, orderBy: [{ issueDate: 'desc' }, { id: 'desc' }] });
    // ปีที่มีข้อมูล (สำหรับ dropdown)
    const years = await availableYears('cert', allowed);
    res.json(success({ rows: rows.map(shapeCert), years }));
  } catch (e) { next(e); }
});

// GET /api/certificate/reports/series?month=&year=  (admin)
router.get('/reports/series', requireCertAdmin, async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const where = { AND: [] };
    if (year && year !== 'all') {
      const y = parseInt(year, 10);
      if (month && month !== 'all') {
        const m = parseInt(month, 10);
        where.AND.push({ createdAt: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } });
      } else {
        where.AND.push({ createdAt: { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) } });
      }
    }
    const list = await prisma.certSeries.findMany({
      where, orderBy: { createdAt: 'desc' }, include: { project: { select: { name: true } } },
    });
    const years = await availableYears('series');
    res.json(success({
      rows: list.map((s) => ({
        id: s.id, projectName: s.project?.name ?? null,
        prefix: s.prefix, year: s.year, startNum: s.startNum, quantity: s.quantity,
        reqFirstname: s.reqFirstname, reqLastname: s.reqLastname, reqDepartment: s.reqDepartment,
        createdAt: s.createdAt,
      })),
      years,
    }));
  } catch (e) { next(e); }
});

async function availableYears(kind, allowed) {
  if (kind === 'series') {
    const rows = await prisma.certSeries.findMany({ select: { createdAt: true } });
    const ys = new Set(rows.map((r) => new Date(r.createdAt).getFullYear()));
    return [...ys].sort((a, b) => b - a);
  }
  const where = { NOT: { firstname: '-' } };
  if (allowed !== null && allowed !== undefined) where.projectId = { in: allowed.length ? allowed : [0] };
  const rows = await prisma.cert.findMany({ where, select: { issueDate: true } });
  const ys = new Set(rows.map((r) => new Date(r.issueDate).getFullYear()));
  return [...ys].sort((a, b) => b - a);
}

function httpError(status, message) {
  const e = new Error(message);
  e.httpStatus = status;
  return e;
}

module.exports = router;
