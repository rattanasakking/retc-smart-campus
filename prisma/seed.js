const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ─── helpers ─────────────────────────────────────────────────────────────────
const upsertByName = (model, name, data) =>
  model.upsert({ where: { name }, update: {}, create: data });

const upsertByCode = (model, code, data) =>
  model.upsert({ where: { code }, update: {}, create: data });

const upsertByKey = (model, key, data) =>
  model.upsert({ where: { key }, update: {}, create: { key, ...data } });

async function main() {
  console.log('🌱 เริ่ม Seed ข้อมูล RETC Smart Campus...\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. โครงสร้างองค์กร
  // ═══════════════════════════════════════════════════════════════════════════

  // ── 4 ฝ่าย ──────────────────────────────────────────────────────────────
  const [divADM, divAC, divPL, divST] = await Promise.all([
    upsertByCode(prisma.division, 'ADM', { name: 'ฝ่ายบริหารทรัพยากร',                 code: 'ADM' }),
    upsertByCode(prisma.division, 'AC',  { name: 'ฝ่ายวิชาการ',                          code: 'AC'  }),
    upsertByCode(prisma.division, 'PL',  { name: 'ฝ่ายแผนงานและความร่วมมือ',            code: 'PL'  }),
    upsertByCode(prisma.division, 'ST',  { name: 'ฝ่ายพัฒนากิจการนักเรียนนักศึกษา',   code: 'ST'  }),
  ]);
  console.log('✓ Divisions: 4 ฝ่าย');

  // ── 24 งาน (6 ต่อฝ่าย) ──────────────────────────────────────────────────
  const workUnitDefs = [
    // ฝ่ายบริหารทรัพยากร
    { code: 'ADM-GEN', name: 'งานบริหารทั่วไป',                           divisionId: divADM.id },
    { code: 'ADM-HR',  name: 'งานบุคลากร',                                divisionId: divADM.id },
    { code: 'ADM-FIN', name: 'งานการเงินและบัญชี',                       divisionId: divADM.id },
    { code: 'ADM-PRO', name: 'งานพัสดุ',                                  divisionId: divADM.id },
    { code: 'ADM-FAC', name: 'งานอาคารสถานที่และสิ่งแวดล้อม',          divisionId: divADM.id },
    { code: 'ADM-REG', name: 'งานทะเบียน',                               divisionId: divADM.id },
    // ฝ่ายวิชาการ
    { code: 'AC-CUR',  name: 'งานพัฒนาหลักสูตรการเรียนการสอน',         divisionId: divAC.id  },
    { code: 'AC-EVA',  name: 'งานวัดผลและประเมินผล',                    divisionId: divAC.id  },
    { code: 'AC-LIB',  name: 'งานวิทยบริการและห้องสมุด',               divisionId: divAC.id  },
    { code: 'AC-DUA',  name: 'งานอาชีวศึกษาระบบทวิภาคี',               divisionId: divAC.id  },
    { code: 'AC-MED',  name: 'งานสื่อการเรียนการสอน',                   divisionId: divAC.id  },
    { code: 'AC-QA',   name: 'งานประกันคุณภาพและมาตรฐานการศึกษา',     divisionId: divAC.id  },
    // ฝ่ายแผนงานและความร่วมมือ
    { code: 'PL-BUD',  name: 'งานวางแผนและงบประมาณ',                    divisionId: divPL.id  },
    { code: 'PL-IT',   name: 'งานศูนย์ข้อมูลสารสนเทศ',                 divisionId: divPL.id  },
    { code: 'PL-COP',  name: 'งานความร่วมมือ',                           divisionId: divPL.id  },
    { code: 'PL-RES',  name: 'งานวิจัยพัฒนานวัตกรรมและสิ่งประดิษฐ์', divisionId: divPL.id  },
    { code: 'PL-PR',   name: 'งานประชาสัมพันธ์',                         divisionId: divPL.id  },
    { code: 'PL-SPJ',  name: 'งานโครงการพิเศษ',                          divisionId: divPL.id  },
    // ฝ่ายพัฒนากิจการนักเรียนนักศึกษา
    { code: 'ST-ACT',  name: 'งานกิจกรรมนักเรียนนักศึกษา',             divisionId: divST.id  },
    { code: 'ST-ADV',  name: 'งานครูที่ปรึกษา',                          divisionId: divST.id  },
    { code: 'ST-DIS',  name: 'งานปกครองและรักษาความปลอดภัย',          divisionId: divST.id  },
    { code: 'ST-CAR',  name: 'งานแนะแนวอาชีพและจัดหางาน',             divisionId: divST.id  },
    { code: 'ST-WEL',  name: 'งานสวัสดิการนักเรียนนักศึกษา',          divisionId: divST.id  },
    { code: 'ST-BIO',  name: 'งานชีววิถีเพื่อการพัฒนาอย่างยั่งยืน',  divisionId: divST.id  },
  ];

  const workUnits = {};
  for (const wu of workUnitDefs) {
    const r = await upsertByCode(prisma.workUnit, wu.code, wu);
    workUnits[wu.code] = r;
  }
  console.log(`✓ WorkUnits: ${workUnitDefs.length} งาน`);

  // ── 12 แผนกวิชา ─────────────────────────────────────────────────────────
  const deptDefs = [
    { code: 'AUTO', name: 'แผนกวิชาช่างยนต์'             },
    { code: 'MCH',  name: 'แผนกวิชาช่างกลโรงงาน'         },
    { code: 'WLD',  name: 'แผนกวิชาช่างเชื่อมโลหะ'       },
    { code: 'EEP',  name: 'แผนกวิชาช่างไฟฟ้ากำลัง'       },
    { code: 'ELE',  name: 'แผนกวิชาช่างอิเล็กทรอนิกส์'  },
    { code: 'CON',  name: 'แผนกวิชาช่างก่อสร้าง'          },
    { code: 'SRV',  name: 'แผนกวิชาช่างสำรวจ'             },
    { code: 'ACC',  name: 'แผนกวิชาการบัญชี'              },
    { code: 'MKT',  name: 'แผนกวิชาการตลาด'              },
    { code: 'CBT',  name: 'แผนกวิชาคอมพิวเตอร์ธุรกิจ'   },
    { code: 'TOU',  name: 'แผนกวิชาการท่องเที่ยว'        },
    { code: 'GEN',  name: 'แผนกวิชาสามัญสัมพันธ์'        },
  ];

  const depts = {};
  for (const d of deptDefs) {
    const r = await upsertByCode(prisma.department, d.code, d);
    depts[d.code] = r;
  }
  console.log(`✓ Departments: ${deptDefs.length} แผนกวิชา`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Users
  // ═══════════════════════════════════════════════════════════════════════════
  const hash = await bcrypt.hash('password1234', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { employeeId: 'EMP001' },
      update: {
        divisionId:  divPL.id,
        workUnitId:  workUnits['PL-IT'].id,
        position:    'officer',
        isSuperAdmin: true,
      },
      create: {
        employeeId:   'EMP001',
        name:         'ผู้ดูแลระบบ',
        email:        'admin@retc.ac.th',
        password:     hash,
        role:         'admin',
        position:     'officer',
        isSuperAdmin: true,
        department:   'ฝ่ายแผนงานและความร่วมมือ',
        divisionId:   divPL.id,
        workUnitId:   workUnits['PL-IT'].id,
        phone:        '043-000001',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP002' },
      update: { position: 'director' },
      create: {
        employeeId: 'EMP002',
        name:       'นายสมชาย ใจดี',
        email:      'director@retc.ac.th',
        password:   hash,
        role:       'executive',
        position:   'director',
        department: 'ฝ่ายบริหาร',
        phone:      '043-000002',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP003' },
      update: {
        divisionId:  divAC.id,
        departmentId: depts['CBT'].id,
        position:    'teacher',
      },
      create: {
        employeeId:   'EMP003',
        name:         'นางสาวสมหญิง รักดี',
        email:        'teacher1@retc.ac.th',
        password:     hash,
        role:         'teacher',
        position:     'teacher',
        department:   'แผนกวิชาคอมพิวเตอร์ธุรกิจ',
        divisionId:   divAC.id,
        departmentId: depts['CBT'].id,
        phone:        '043-000003',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP004' },
      update: {
        divisionId:   divAC.id,
        departmentId: depts['EEP'].id,
        position:     'teacher',
      },
      create: {
        employeeId:   'EMP004',
        name:         'นายประสิทธิ์ มีสุข',
        email:        'teacher2@retc.ac.th',
        password:     hash,
        role:         'teacher',
        position:     'teacher',
        department:   'แผนกวิชาช่างไฟฟ้ากำลัง',
        divisionId:   divAC.id,
        departmentId: depts['EEP'].id,
        phone:        '043-000004',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP005' },
      update: {
        divisionId: divADM.id,
        workUnitId: workUnits['ADM-FAC'].id,
        position:   'worker',
      },
      create: {
        employeeId: 'EMP005',
        name:       'นายวิชัย ช่างซ่อม',
        email:      'technician@retc.ac.th',
        password:   hash,
        role:       'staff',
        position:   'worker',
        department: 'ฝ่ายบริหารทรัพยากร',
        divisionId: divADM.id,
        workUnitId: workUnits['ADM-FAC'].id,
        phone:      '043-000005',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP006' },
      update: {
        divisionId: divADM.id,
        workUnitId: workUnits['ADM-HR'].id,
        position:   'officer',
      },
      create: {
        employeeId: 'EMP006',
        name:       'นางมาลี สุขสบาย',
        email:      'staff@retc.ac.th',
        password:   hash,
        role:       'staff',
        position:   'officer',
        department: 'ฝ่ายบริหารทรัพยากร',
        divisionId: divADM.id,
        workUnitId: workUnits['ADM-HR'].id,
        phone:      '043-000006',
      },
    }),
    // ─── รองผู้อำนวยการ (ตัวอย่างแต่ละฝ่าย) ─────────────────────────────────
    prisma.user.upsert({
      where: { employeeId: 'EMP007' },
      update: {},
      create: {
        employeeId: 'EMP007',
        name:       'นายวรวิทย์ แสงทอง',
        email:      'deputy1@retc.ac.th',
        password:   hash,
        role:       'executive',
        position:   'deputy_director',
        department: 'ฝ่ายบริหารทรัพยากร',
        divisionId: divADM.id,
        phone:      '043-000007',
      },
    }),
    prisma.user.upsert({
      where: { employeeId: 'EMP008' },
      update: {},
      create: {
        employeeId: 'EMP008',
        name:       'นางสาวพัชรา เพชรงาม',
        email:      'deputy2@retc.ac.th',
        password:   hash,
        role:       'executive',
        position:   'deputy_director',
        department: 'ฝ่ายวิชาการ',
        divisionId: divAC.id,
        phone:      '043-000008',
      },
    }),
  ]);
  console.log(`✓ Users: ${users.length} รายการ (พร้อมโครงสร้างองค์กร)`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Work Types
  // ═══════════════════════════════════════════════════════════════════════════
  const workTypeData = [
    { name: 'สอนตามตาราง',         category: 'การสอน',         color: '#4CAF50' },
    { name: 'สอนชดเชย',            category: 'การสอน',         color: '#8BC34A' },
    { name: 'นิเทศการสอน',         category: 'การสอน',         color: '#CDDC39' },
    { name: 'ประชุม',               category: 'บริหาร',         color: '#2196F3' },
    { name: 'อบรม/สัมมนา',        category: 'พัฒนาตนเอง',     color: '#9C27B0' },
    { name: 'ดูแลนักเรียน',        category: 'ดูแลนักเรียน',   color: '#FF9800' },
    { name: 'เวรรับ-ส่งนักเรียน', category: 'ดูแลนักเรียน',   color: '#FF5722' },
    { name: 'พัฒนาหลักสูตร',       category: 'วิชาการ',        color: '#00BCD4' },
    { name: 'วิจัยในชั้นเรียน',    category: 'วิจัย',           color: '#E91E63' },
    { name: 'งานธุรการ/เอกสาร',   category: 'ธุรการ',          color: '#607D8B' },
    { name: 'บริการชุมชน',         category: 'บริการวิชาการ',  color: '#795548' },
    { name: 'อื่นๆ',               category: 'ทั่วไป',          color: '#9E9E9E' },
  ];
  for (const wt of workTypeData) {
    await upsertByName(prisma.workType, wt.name, wt);
  }
  console.log(`✓ Work Types: ${workTypeData.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Equipment Categories
  // ═══════════════════════════════════════════════════════════════════════════
  const categoryData = [
    { name: 'คอมพิวเตอร์และอุปกรณ์',     description: 'คอมพิวเตอร์ โน้ตบุ๊ก แท็บเล็ต อุปกรณ์ต่อพ่วง' },
    { name: 'เครื่องใช้สำนักงาน',         description: 'เครื่องพิมพ์ เครื่องถ่ายเอกสาร เครื่องโทรสาร'  },
    { name: 'โสตทัศนูปกรณ์',              description: 'โปรเจกเตอร์ จอภาพ ลำโพง กล้อง'                  },
    { name: 'เครื่องมือช่าง',              description: 'อุปกรณ์ฝึกปฏิบัติงาน เครื่องมือช่างต่างๆ'       },
    { name: 'เฟอร์นิเจอร์',               description: 'โต๊ะ เก้าอี้ ตู้ ชั้นวาง'                        },
    { name: 'ยานพาหนะ',                   description: 'รถยนต์ รถจักรยานยนต์ รถกระบะ'                    },
    { name: 'ครุภัณฑ์ห้องปฏิบัติการ',    description: 'อุปกรณ์ห้องแล็บวิทยาศาสตร์ และงานช่าง'         },
  ];
  const catMap = {};
  for (const cat of categoryData) {
    const r = await upsertByName(prisma.equipmentCategory, cat.name, cat);
    catMap[cat.name] = r;
  }
  console.log(`✓ Equipment Categories: ${categoryData.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Equipments
  // ═══════════════════════════════════════════════════════════════════════════
  const equipmentData = [
    { code:'IT-COM-001', name:'คอมพิวเตอร์ตั้งโต๊ะ Dell OptiPlex', catName:'คอมพิวเตอร์และอุปกรณ์', brand:'Dell',  model:'OptiPlex 3090',      dept:'แผนกวิชาคอมพิวเตอร์ธุรกิจ', room:'ห้อง 211', price:25000, acquired:'2022-05-15', source:'งบประมาณแผ่นดิน 2565' },
    { code:'IT-NTB-001', name:'โน้ตบุ๊ก ASUS VivoBook',             catName:'คอมพิวเตอร์และอุปกรณ์', brand:'ASUS',  model:'VivoBook 15',        dept:'ฝ่ายบริหาร',                room:'ห้องผู้อำนวยการ', price:22000, acquired:'2023-01-20', source:'งบประมาณแผ่นดิน 2566' },
    { code:'AV-PRJ-001', name:'โปรเจกเตอร์ Epson EB-X51',           catName:'โสตทัศนูปกรณ์',          brand:'Epson', model:'EB-X51',             dept:'ฝ่ายวิชาการ',               room:'ห้องประชุมใหญ่', price:18000, acquired:'2021-09-10', source:'งบประมาณแผ่นดิน 2564' },
    { code:'OF-PRT-001', name:'เครื่องพิมพ์ HP LaserJet',           catName:'เครื่องใช้สำนักงาน',     brand:'HP',    model:'LaserJet Pro M404dn',dept:'ฝ่ายธุรการ',                room:'สำนักงาน',       price:8500,  acquired:'2022-03-01', source:'เงินนอกงบประมาณ' },
    { code:'IT-COM-002', name:'คอมพิวเตอร์ตั้งโต๊ะ Acer Veriton',  catName:'คอมพิวเตอร์และอุปกรณ์', brand:'Acer',  model:'Veriton M2640G',     dept:'แผนกวิชาคอมพิวเตอร์ธุรกิจ', room:'ห้อง 212', price:23000, acquired:'2023-06-01', source:'งบประมาณแผ่นดิน 2566' },
  ];
  for (const eq of equipmentData) {
    await prisma.equipment.upsert({
      where: { code: eq.code },
      update: {},
      create: {
        code: eq.code, name: eq.name,
        categoryId: catMap[eq.catName].id,
        brand: eq.brand, model: eq.model,
        department: eq.dept, room: eq.room,
        price: String(eq.price),
        acquiredDate: new Date(eq.acquired),
        source: eq.source,
        status: 'active',
      },
    });
  }
  console.log(`✓ Equipments: ${equipmentData.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. Rooms
  // ═══════════════════════════════════════════════════════════════════════════
  const roomData = [
    { name:'ห้องประชุมใหญ่',             capacity:100, facilities:['โปรเจกเตอร์','ไมโครโฟน','แอร์','เวที','ระบบเสียง'],  requireApproval:true,  note:'ใช้สำหรับกิจกรรมขนาดใหญ่และพิธีการ' },
    { name:'ห้องประชุมสำนักงาน',         capacity:20,  facilities:['TV 55 นิ้ว','ไวท์บอร์ด','แอร์'],                    requireApproval:false, note:'ใช้สำหรับประชุมย่อย และสัมภาษณ์' },
    { name:'ห้องอบรมคอมพิวเตอร์',       capacity:40,  facilities:['โปรเจกเตอร์','คอมพิวเตอร์ 40 เครื่อง','แอร์','อินเทอร์เน็ต'], requireApproval:true, note:'ห้องปฏิบัติการคอมพิวเตอร์ อาคาร 2 ชั้น 1' },
    { name:'ห้องประชุม 3 (อาคาร 3)',    capacity:30,  facilities:['โปรเจกเตอร์','ไวท์บอร์ด','แอร์'],                    requireApproval:false },
  ];
  for (const room of roomData) {
    const exists = await prisma.room.findFirst({ where: { name: room.name } });
    if (!exists) {
      await prisma.room.create({
        data: { ...room, facilities: JSON.stringify(room.facilities), status: 'active' },
      });
    }
  }
  console.log(`✓ Rooms: ${roomData.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ปีการศึกษา (AcademicYear)
  // ═══════════════════════════════════════════════════════════════════════════
  await prisma.academicYear.upsert({
    where: { year: 2567 },
    update: {},
    create: {
      year:      2567,
      semester:  1,
      startDate: new Date('2024-05-14'),
      endDate:   new Date('2024-10-04'),
      isCurrent: true,
    },
  });
  await prisma.academicYear.upsert({
    where: { year: 2568 },
    update: {},
    create: {
      year:      2568,
      semester:  1,
      startDate: new Date('2025-05-13'),
      endDate:   new Date('2025-10-03'),
      isCurrent: false,
    },
  });
  console.log('✓ Academic Years: 2 รายการ (2567, 2568)');

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. System Settings
  // ═══════════════════════════════════════════════════════════════════════════
  const settings = [
    { key:'school_name',         value:'วิทยาลัยเทคนิคร้อยเอ็ด',               group:'school',  label:'ชื่อสถานศึกษา' },
    { key:'school_name_en',      value:'Roi Et Technical College',              group:'school',  label:'ชื่อสถานศึกษา (ภาษาอังกฤษ)' },
    { key:'school_address',      value:'106 ถ.สุริยเดช ต.ในเมือง อ.เมือง จ.ร้อยเอ็ด 45000', group:'school', label:'ที่อยู่' },
    { key:'school_phone',        value:'043-511-296',                           group:'school',  label:'เบอร์โทรศัพท์' },
    { key:'director_name',       value:'นายสมชาย ใจดี',                        group:'school',  label:'ชื่อผู้อำนวยการ' },
    { key:'current_academic_year',value:'2567',                                 group:'academic',label:'ปีการศึกษาปัจจุบัน' },
    { key:'current_semester',    value:'1',                                     group:'academic',label:'ภาคเรียนปัจจุบัน' },
    { key:'line_notify_enabled', value:'false',                                 group:'notify',  label:'เปิดใช้ LINE Notify' },
    { key:'line_notify_token',   value:'',                                      group:'notify',  label:'LINE Notify Token' },
    { key:'app_version',         value:'1.0.0',                                group:'system',  label:'เวอร์ชันระบบ' },
  ];
  for (const s of settings) {
    await upsertByKey(prisma.systemSettings, s.key, { value: s.value, group: s.group, label: s.label });
  }
  console.log(`✓ System Settings: ${settings.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Lost Found Categories
  // ═══════════════════════════════════════════════════════════════════════════
  const lfCats = ['กระเป๋า / กระเป๋าเงิน', 'เอกสาร / บัตรประชาชน / บัตรนักเรียน',
    'โทรศัพท์ / อุปกรณ์อิเล็กทรอนิกส์', 'เครื่องแต่งกาย / เครื่องประดับ',
    'กุญแจ / อุปกรณ์', 'อื่นๆ'];
  for (const name of lfCats) {
    await upsertByName(prisma.lostFoundCategory, name, { name });
  }
  console.log(`✓ LostFound Categories: ${lfCats.length} รายการ`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ตัวอย่างข้อมูล (idempotent — skip ถ้ามีแล้ว)
  // ═══════════════════════════════════════════════════════════════════════════
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const [admin,,teacher1,teacher2] = users;

  // Duty schedule
  const existingSchedule = await prisma.dutySchedule.findFirst({
    where: {
      dutyDate:       new Date('2026-06-03'),
      departmentName: 'แผนกวิชาเทคโนโลยีคอมพิวเตอร์',
    },
  });
  if (!existingSchedule) {
    await prisma.dutySchedule.create({
      data: {
        semester:       '1/2568',
        dutyDate:       new Date('2026-06-03'),
        departmentId:   2,
        departmentName: 'แผนกวิชาเทคโนโลยีคอมพิวเตอร์',
        note:           'เวรรับนักเรียนประจำวัน',
        createdById:    admin.id,
      },
    });
  }
  console.log('✓ Duty Schedules (idempotent)');

  // Work log
  const workType = await prisma.workType.findFirst({ where: { name: 'สอนตามตาราง' } });
  const existingLog = await prisma.workLog.findFirst({
    where: { userId: teacher1.id, logDate: today, title: 'สอนวิชาคอมพิวเตอร์เบื้องต้น ม.1/1' },
  });
  if (!existingLog) {
    await prisma.workLog.create({
      data: { userId: teacher1.id, workTypeId: workType.id, logDate: today,
              title: 'สอนวิชาคอมพิวเตอร์เบื้องต้น ม.1/1',
              detail: 'สอนเรื่องระบบปฏิบัติการ Windows 11 และการจัดการไฟล์',
              startTime: '09:00', endTime: '11:00', status: 'submitted' },
    });
  }

  // Repair ticket
  const ticketNo = `REPAIR-${today.toISOString().slice(0,10).replace(/-/g,'')}-001`;
  const existingTicket = await prisma.repairTicket.findFirst({ where: { ticketNo } });
  if (!existingTicket) {
    await prisma.repairTicket.create({
      data: { ticketNo, reporterId: teacher1.id, type: 'คอมพิวเตอร์', location: 'ห้อง 211',
              urgency: 'normal', title: 'คอมพิวเตอร์เปิดไม่ติด',
              description: 'เครื่องหมายเลข IT-COM-001 เปิดสวิตช์แล้วไม่มีไฟ', status: 'pending' },
    });
  }
  console.log('✓ ตัวอย่างข้อมูล Duty/WorkLog/RepairTicket (idempotent)');

  // ─── summary ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed สำเร็จ!');
  console.log('─'.repeat(50));
  console.log('บัญชีผู้ใช้ (password: password1234)');
  console.log('  admin@retc.ac.th       → Admin (Super)  — ฝ่ายแผนงานฯ / งานสารสนเทศ');
  console.log('  director@retc.ac.th    → Executive       — ผู้อำนวยการ');
  console.log('  deputy1@retc.ac.th     → Executive       — รองผู้อำนวยการ ฝ่ายบริหาร');
  console.log('  deputy2@retc.ac.th     → Executive       — รองผู้อำนวยการ ฝ่ายวิชาการ');
  console.log('  teacher1@retc.ac.th    → Teacher         — แผนกคอมพิวเตอร์ธุรกิจ');
  console.log('  teacher2@retc.ac.th    → Teacher         — แผนกช่างไฟฟ้า');
  console.log('  technician@retc.ac.th  → Staff           — งานอาคารสถานที่');
  console.log('  staff@retc.ac.th       → Staff           — งานบุคลากร');
}

main()
  .catch((e) => { console.error('❌ Seed ล้มเหลว:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
