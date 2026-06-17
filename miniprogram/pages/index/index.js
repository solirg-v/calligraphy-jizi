const app = getApp();

Page({
  titleTimer: null,

  onLoad() {
    const authorized = wx.getStorageSync('authorized');
    if (!authorized) {
      wx.redirectTo({ url: '/pages/auth/auth' });
    }
  },

  goJizi() {
    wx.switchTab({ url: '/pages/jizi/jizi' });
  },

  goZizu() {
    wx.switchTab({ url: '/pages/zizu/zizu' });
  },

  onTitleTouchStart() {
    if (this.titleTimer) clearTimeout(this.titleTimer);
    this.titleTimer = setTimeout(() => {
      this.titleTimer = null;
      this.showAdminAuth();
    }, 5000);
  },

  onTitleTouchEnd() {
    if (this.titleTimer) {
      clearTimeout(this.titleTimer);
      this.titleTimer = null;
    }
  },

  onTitleTouchCancel() {
    if (this.titleTimer) {
      clearTimeout(this.titleTimer);
      this.titleTimer = null;
    }
  },

  onShareAppMessage() {
    return {
      title: '老妖怪的集字站',
      path: '/pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: '老妖怪的集字站'
    };
  },

  showAdminAuth() {
    const lockUntil = wx.getStorageSync('admin_lock_until') || 0;
    if (Date.now() < lockUntil) {
      const remain = Math.ceil((lockUntil - Date.now()) / 60000);
      wx.showToast({ title: `请${remain}分钟后再试`, icon: 'none' });
      return;
    }

    wx.showModal({
      title: '管理员验证',
      editable: true,
      placeholderText: '请输入管理密码',
      success: async (res) => {
        if (!res.confirm || !res.content) return;

        wx.showLoading({ title: '验证中' });
        try {
          const result = await wx.cloud.callFunction({
            name: 'adminOps',
            data: { action: 'verify', password: res.content }
          });

          if (result.result && result.result.success === true) {
            wx.hideLoading();
            wx.setStorageSync('admin_fail_count', 0);
            app.adminPassword = res.content;
            wx.navigateTo({ url: '/pages/admin/admin' });
            return;
          }
        } catch (err) {
          wx.hideLoading();
          wx.showToast({ title: '网络错误', icon: 'none' });
          return;
        }

        wx.hideLoading();
        const failCount = wx.getStorageSync('admin_fail_count') || 0;
        const newFail = failCount + 1;
        wx.setStorageSync('admin_fail_count', newFail);

        if (newFail >= 3) {
          wx.setStorageSync('admin_lock_until', Date.now() + 5 * 60 * 1000);
          wx.setStorageSync('admin_fail_count', 0);
          wx.showToast({ title: '错误次数过多，锁定5分钟', icon: 'none' });
        } else {
          wx.showToast({ title: `密码错误(${newFail}/3)`, icon: 'none' });
        }
      }
    });
  }
});
