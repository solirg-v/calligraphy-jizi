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
    codeKeyword: '',
    filterStatus: 'all',
    codePage: 1,
    codeTotalPages: 1,
    pageSize: 20,
    statusText: {
      available: '可用',
      distributed: '已分发',
      used: '已使用',
      revoked: '已销毁'
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

  onCodeKeywordInput(e) {
    this.setData({ codeKeyword: e.detail.value });
  },

  searchCodes() {
    this.setData({ codePage: 1 });
    this.loadCodes();
  },

  clearCodeKeyword() {
    this.setData({ codeKeyword: '', codePage: 1 });
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
          keyword: this.data.codeKeyword,
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
    const codeId = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;
    const shouldMarkDistributed = status === 'available' && codeId;

    wx.setClipboardData({
      data: code,
      success: async () => {
        if (shouldMarkDistributed) {
          try {
            await wx.cloud.callFunction({
              name: 'adminOps',
              data: { action: 'markDistributed', password: this.data.password, codeId }
            });
            wx.showToast({ title: '已复制并标记分发', icon: 'success' });
            this.loadCodes();
          } catch (err) {
            wx.showToast({ title: '已复制（标记失败）', icon: 'none' });
          }
        } else {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      }
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

  clearStudentKeyword() {
    this.setData({ studentKeyword: '', stuPage: 1 });
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

    const content = inviteCode
      ? `确认取消该学员权限？绑定的邀请码 ${inviteCode} 将被销毁，无法再使用。`
      : '确认取消该学员的权限？';

    wx.showModal({
      title: '取消权限',
      content,
      confirmText: '确认取消',
      confirmColor: '#c04040',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const result = await wx.cloud.callFunction({
            name: 'adminOps',
            data: { action: 'revokeStudent', password: this.data.password, studentId }
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
