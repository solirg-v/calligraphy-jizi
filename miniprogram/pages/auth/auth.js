Page({
  data: {
    inputCode: '',
    checking: false,
    authorized: false,
    errMsg: '',
    userCode: ''
  },

  onLoad() {
    this.checkAuth();
  },

  checkAuth() {
    this.setData({ checking: true });

    wx.cloud.callFunction({
      name: 'checkAuth',
      data: {}
    }).then(res => {
      this.setData({ checking: false });
      if (res.result && res.result.authorized) {
        wx.setStorageSync('authorized', true);
        this.setData({ authorized: true });
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        const openid = (res.result && res.result.openid) || '';
        const code = openid ? openid.substring(0, 8).toUpperCase() : '';
        this.setData({ userCode: code });
      }
    }).catch(err => {
      this.setData({ checking: false, errMsg: '网络错误，请重试' });
    });
  },

  onInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase(), errMsg: '' });
  },

  doVerify() {
    const code = this.data.inputCode.trim();
    if (!code) {
      this.setData({ errMsg: '请输入邀请码' });
      return;
    }

    this.setData({ checking: true, errMsg: '' });

    wx.cloud.callFunction({
      name: 'checkAuth',
      data: { inviteCode: code }
    }).then(res => {
      this.setData({ checking: false });
      if (res.result && res.result.authorized) {
        wx.setStorageSync('authorized', true);
        this.setData({ authorized: true });
        wx.switchTab({ url: '/pages/index/index' });
      } else if (res.result && res.result.error === 'invalid_code') {
        this.setData({ errMsg: '邀请码无效或已被使用' });
      } else {
        this.setData({ errMsg: '验证失败，请重试' });
      }
    }).catch(err => {
      this.setData({ checking: false, errMsg: '网络错误，请重试' });
    });
  },

  copyUserCode() {
    if (this.data.userCode) {
      wx.setClipboardData({
        data: this.data.userCode,
        success: () => wx.showToast({ title: '识别码已复制', icon: 'success' })
      });
    }
  }
});
