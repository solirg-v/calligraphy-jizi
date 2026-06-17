const cloud = require('wx-server-sdk');
const crypto = require('crypto');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const PASSWORD_HASH = process.env.PASSWORD_HASH;
const PASSWORD_SALT = process.env.PASSWORD_SALT;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + PASSWORD_SALT).digest('hex');
}

function verifyPassword(password) {
  if (!PASSWORD_HASH || !PASSWORD_SALT) return false;
  return hashPassword(password) === PASSWORD_HASH;
}

async function handleGenerate(event) {
  const count = Math.min(Math.max(event.count || 10, 1), 50);
  const codes = [];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  for (let i = 0; i < count; i++) {
    let code;
    let exists = true;
    while (exists) {
      code = 'JZ';
      for (let j = 0; j < 6; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const res = await db.collection('invite_codes').where({ code }).count();
      exists = res.total > 0;
    }

    await db.collection('invite_codes').add({
      data: {
        code,
        status: 'available',
        openid: '',
        createdAt: db.serverDate(),
        usedAt: null
      }
    });
    codes.push(code);
  }

  return { codes };
}

async function handleList(event) {
  const { status, keyword, page = 1, pageSize = 20 } = event;
  const where = {};
  if (status && status !== 'all') {
    where.status = status;
  }
  if (keyword) {
    where.code = db.RegExp({ regexp: keyword, options: 'i' });
  }

  const totalRes = await db.collection('invite_codes').where(where).count();
  const total = totalRes.total;

  const records = await db.collection('invite_codes')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return { total, page, pageSize, records: records.data };
}

async function handleMarkDistributed(event) {
  const { codeId } = event;
  if (!codeId) return { error: 'missing_codeId' };

  const record = await db.collection('invite_codes').doc(codeId).get();
  if (!record.data || record.data.status !== 'available') {
    return { error: 'invalid_status', message: '只能标记可用的码' };
  }

  await db.collection('invite_codes').doc(codeId).update({
    data: { status: 'distributed' }
  });

  return { success: true };
}

async function handleListStudents(event) {
  const { keyword, page = 1, pageSize = 20 } = event;

  if (keyword) {
    // Search by invite code, then find the bound student
    const codeRes = await db.collection('invite_codes')
      .where({ code: db.RegExp({ regexp: keyword, options: 'i' }) })
      .limit(100)
      .get();

    const records = [];
    for (const codeRecord of codeRes.data) {
      if (!codeRecord.openid) continue;
      const stuRes = await db.collection('whitelist_openid')
        .where({ openid: codeRecord.openid })
        .limit(1)
        .get();

      if (stuRes.data.length > 0) {
        records.push({
          _id: stuRes.data[0]._id,
          openid: stuRes.data[0].openid,
          createdAt: stuRes.data[0].createdAt,
          inviteCode: codeRecord.code,
          codeId: codeRecord._id
        });
      }
    }

    return { total: records.length, page: 1, pageSize: records.length, records };
  }

  // No keyword: list all students
  const totalRes = await db.collection('whitelist_openid').count();
  const total = totalRes.total;

  const students = await db.collection('whitelist_openid')
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const records = [];
  for (const stu of students.data) {
    const codeRes = await db.collection('invite_codes')
      .where({ openid: stu.openid })
      .limit(1)
      .get();

    records.push({
      _id: stu._id,
      openid: stu.openid,
      createdAt: stu.createdAt,
      inviteCode: codeRes.data.length > 0 ? codeRes.data[0].code : '',
      codeId: codeRes.data.length > 0 ? codeRes.data[0]._id : ''
    });
  }

  return { total, page, pageSize, records };
}

async function handleRevokeStudent(event) {
  const { studentId } = event;
  if (!studentId) return { error: 'missing_studentId' };

  const student = await db.collection('whitelist_openid').doc(studentId).get();
  if (!student.data) return { error: 'student_not_found' };

  // Find bound invite code
  const codeRes = await db.collection('invite_codes')
    .where({ openid: student.data.openid })
    .limit(1)
    .get();

  // Remove from whitelist
  await db.collection('whitelist_openid').doc(studentId).remove();

  // Revoke the bound code (永久销毁，不流回可用池)
  if (codeRes.data.length > 0) {
    await db.collection('invite_codes').doc(codeRes.data[0]._id).update({
      data: { status: 'revoked' }
    });
    return { success: true, revokedCode: codeRes.data[0].code };
  }

  return { success: true };
}

exports.main = async (event) => {
  const { action, password } = event;

  if (!verifyPassword(password)) {
    return { error: 'auth_failed' };
  }

  switch (action) {
    case 'verify':
      return { success: true };
    case 'generate':
      return await handleGenerate(event);
    case 'list':
      return await handleList(event);
    case 'markDistributed':
      return await handleMarkDistributed(event);
    case 'listStudents':
      return await handleListStudents(event);
    case 'revokeStudent':
      return await handleRevokeStudent(event);
    default:
      return { error: 'unknown_action' };
  }
};
