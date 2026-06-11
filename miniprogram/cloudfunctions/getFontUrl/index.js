const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const FONT_FILE_ID = 'cloud://cloud1-d7gqmginffdcb6727.636c-cloud1-d7gqmginffdcb6727-1442347732/fonts/jingxiaopeng.woff2';

exports.main = async () => {
  const res = await cloud.getTempFileURL({ fileList: [FONT_FILE_ID] });
  const item = res.fileList && res.fileList[0];
  if (!item || !item.tempFileURL) {
    return { success: false, error: item && item.errMsg };
  }
  return { success: true, url: item.tempFileURL };
};
