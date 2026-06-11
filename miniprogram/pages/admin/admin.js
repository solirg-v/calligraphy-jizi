const app = getApp();

Page({
  data: {
    password: '',
    activeTab: 'codes',

    // 邀请码
    genCount: 10,
    generating: false,
    newCodes: [],
    records: [],
    filterStatus: 'all',
    codePage: 1,
    codeTotalPages: 1,
    pageSize: 20,
    statusText: {
      available: '可用',
      distributed: '已分发',
      used: '已使用'
    },

    // 学员
    students: [],
    studentKeyword: '',
    stuPage: 1,
    stuTotalPages: 1
  },

  onLoad() {
    const password = app.adminPassword || '';
    if (!password) {
      wx.navigateBack();
      return;
    }
    this.setData({ password });
    this.loadCodes();
  },

  // Tab 切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    if (tab === 'codes') {
      this.loadCodes();
    } else {
      this.loadStudents();
    }
  },

  // ===== 邀请码 =====

  onGenCountInput(e) {
    this.setData({ genCount: e.detail.value });
  },

  async generateCodes() {
    const count = parseInt(this.data.genCount) || 10;
    if (count < 1 || count > 50) {
      wx.showToast({ title: '1-50之间', icon: 'none' });
      return;
    }

    this.setData({ generating: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOps',
        data: { action: 'generate', password: this.data.password, count }
      });

      if (res.result.error) {
        wx.showToast({ title: '操作失败', icon: 'none' });
        return;
      }

      this.setData({ newCodes: res.result.codes });
      wx.showToast({ title: `已生成${res.result.codes.length}个码`, icon: 'success' });
      this.loadCodes();
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      this.setData({ generating: false });
    }
  },

  copyAllCodes() {
    const text = this.data.newCodes.join('\n');
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制全部码', icon: 'success' })
    });
  },

  setFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status, codePage: 1 });
    this.loadCodes();
  },

  async loadCodes() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOps',
        data: {
          action: 'list',
          password: this.data.password,
          status: this.data.filterStatus,
          page: this.data.codePage,
          pageSize: this.data.pageSize
        }
      });

      if (res.result.error) {
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }

      const { total, page, pageSize, records } = res.result;
      this.setData({
        records,
        codePage: page,
        codeTotalPages: Math.ceil(total / pageSize)
      });
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  async markDistributed(e) {
    const codeId = e.currentTarget.dataset.id;
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOps',
        data: { action: 'markDistributed', password: this.data.password, codeId }
      });

      if (res.result.error) {
        wx.showToast({ title: res.result.message || '操作失败', icon: 'none' });
        return;
      }

      wx.showToast({ title: '已标记分发', icon: 'success' });
      this.loadCodes();
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  copyCode(e) {
    const code = e.currentTarget.dataset.code;
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  codePrevPage() {
    if (this.data.codePage > 1) {
      this.setData({ codePage: this.data.codePage - 1 });
      this.loadCodes();
    }
  },

  codeNextPage() {
    if (this.data.codePage < this.data.codeTotalPages) {
      this.setData({ codePage: this.data.codePage + 1 });
      this.loadCodes();
    }
  },

  // ===== 学员 =====

  onStudentKeywordInput(e) {
    this.setData({ studentKeyword: e.detail.value });
  },

  searchStudents() {
    this.setData({ stuPage: 1 });
    this.loadStudents();
  },

  async loadStudents() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminOps',
        data: {
          action: 'listStudents',
          password: this.data.password,
          keyword: this.data.studentKeyword,
          page: this.data.stuPage,
          pageSize: this.data.pageSize
        }
      });

      if (res.result.error) {
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }

      const { total, page, pageSize, records } = res.result;
      this.setData({
        students: records,
        stuPage: page,
        stuTotalPages: Math.ceil(total / pageSize)
      });
    } catch (err) {
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  },

  revokeStudent(e) {
    const studentId = e.currentTarget.dataset.id;
    const inviteCode = e.currentTarget.dataset.code;

    wx.showModal({
      title: '取消权限',
      content: inviteCode
        ? '是否同时释放该学员绑定的邀请码？'
        : '确认取消该学员的权限？',
      confirmText: '仅取消权限',
      cancelText: '取消',
      editable: false,
      success: async (res) => {
        if (!res.confirm) return;

        // If has code, ask if also release
        if (inviteCode) {
          wx.showModal({
            title: '释放邀请码',
            content: `是否同时释放邀请码 ${inviteCode}？释放后码变回可用。`,
            confirmText: '取消并释放',
            cancelText: '仅取消权限',
            success: async (res2) => {
              const releaseCode = !!res2.confirm;
              try {
                const result = await wx.cloud.callFunction({
                  name: 'adminOps',
                  data: { action: 'revokeStudent', password: this.data.password, studentId, releaseCode }
                });
                if (result.result.error) {
                  wx.showToast({ title: '操作失败', icon: 'none' });
                  return;
                }
                const msg = releaseCode ? '已取消权限并释放码' : '已取消权限';
                wx.showToast({ title: msg, icon: 'success' });
                this.loadStudents();
              } catch (err) {
                wx.showToast({ title: '网络错误', icon: 'none' });
              }
            }
          });
        } else {
          try {
            const result = await wx.cloud.callFunction({
              name: 'adminOps',
              data: { action: 'revokeStudent', password: this.data.password, studentId, releaseCode: false }
            });
            if (result.result.error) {
              wx.showToast({ title: '操作失败', icon: 'none' });
              return;
            }
            wx.showToast({ title: '已取消权限', icon: 'success' });
            this.loadStudents();
          } catch (err) {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        }
      }
    });
  },

  async releaseCode(e) {
    const codeId = e.currentTarget.dataset.id;

    wx.showModal({
      title: '释放邀请码',
      content: '释放后码变回可用，学员将失去权限。确认？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await wx.cloud.callFunction({
            name: 'adminOps',
            data: { action: 'releaseCode', password: this.data.password, codeId }
          });
          if (result.result.error) {
            wx.showToast({ title: '操作失败', icon: 'none' });
            return;
          }
          wx.showToast({ title: '码已释放', icon: 'success' });
          this.loadStudents();
        } catch (err) {
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  stuPrevPage() {
    if (this.data.stuPage > 1) {
      this.setData({ stuPage: this.data.stuPage - 1 });
      this.loadStudents();
    }
  },

  stuNextPage() {
    if (this.data.stuPage < this.data.stuTotalPages) {
      this.setData({ stuPage: this.data.stuPage + 1 });
      this.loadStudents();
    }
  }
});
