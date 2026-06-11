const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { inviteCode } = event;
  const currentOpenid = cloud.getWXContext().OPENID;

  // Step 1: Check if openid already in whitelist
  const openidRes = await db.collection('whitelist_openid')
    .where({ openid: currentOpenid })
    .count();
  if (openidRes.total > 0) {
    return { authorized: true, method: 'openid' };
  }

  // Step 2: If invite code provided, validate and bind
  if (inviteCode) {
    const codeRes = await db.collection('invite_codes')
      .where({
        code: inviteCode,
        status: db.RegExp({ regexp: '^(available|distributed)$' })
      })
      .get();

    if (codeRes.data.length === 0) {
      return { authorized: false, error: 'invalid_code', openid: currentOpenid };
    }

    const codeRecord = codeRes.data[0];

    // Bind openid to whitelist
    await db.collection('whitelist_openid').add({
      data: {
        openid: currentOpenid,
        createdAt: db.serverDate()
      }
    });

    // Mark code as used
    await db.collection('invite_codes').doc(codeRecord._id).update({
      data: {
        status: 'used',
        openid: currentOpenid,
        usedAt: db.serverDate()
      }
    });

    return { authorized: true, method: 'invite_code' };
  }

  return { authorized: false, openid: currentOpenid };
};
