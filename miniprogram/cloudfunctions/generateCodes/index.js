const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'JZ';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

exports.main = async (event) => {
  const count = event.count || 10;
  const codes = [];

  for (let i = 0; i < count; i++) {
    let code;
    let exists = true;

    // Ensure uniqueness
    while (exists) {
      code = generateCode();
      const res = await db.collection('invite_codes')
        .where({ code: code })
        .count();
      exists = res.total > 0;
    }

    await db.collection('invite_codes').add({
      data: {
        code: code,
        status: 'available',
        openid: '',
        createdAt: db.serverDate(),
        usedAt: null
      }
    });

    codes.push(code);
  }

  return { codes: codes };
};
