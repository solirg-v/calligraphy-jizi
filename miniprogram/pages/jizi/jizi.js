const { HISTORY_KEY_JIZI, MAX_HISTORY } = require('../../utils/config');

const COLS = 8;
const CELL_SIZE = 100;
const FONT_SIZE = 72;
const PUNCT_FONT_SIZE = 48;

Page({
  data: {
    inputValue: '',
    cells: [],
    history: [],
    lightboxVisible: false,
    gridStyle: 'fangge',
    fontReady: false
  },

  onLoad() {
    const app = getApp();
    if (app.fontLoaded) {
      this.setData({ fontReady: true });
    } else {
      app.onFontReady = () => {
        this.setData({ fontReady: true });
      };
    }
  },

  onShow() {
    this.loadHistory();
  },

  onInput(e) {
    this.setData({ inputValue: e.detail.value });
  },

  clearInput() {
    this.setData({ inputValue: '' });
  },

  doSearch() {
    const raw = this.data.inputValue.trim();
    if (!raw) return;

    const PUNCT = `，。！？、；：""''《》（）—……·`;
    const cells = raw.split('').map(ch => {
      if (/[一-鿿]/.test(ch)) return { char: ch, empty: false, punct: false };
      if (PUNCT.includes(ch)) return { char: ch, empty: false, punct: true };
      return null;
    }).filter(Boolean);

    if (cells.length === 0) {
      this.setData({ inputValue: '', cells: [] });
      return;
    }

    const remainder = cells.length % COLS;
    if (remainder > 0) {
      for (let i = 0; i < COLS - remainder; i++) {
        cells.push({ char: '', empty: true, punct: false });
      }
    }

    const hanziOnly = cells.filter(c => !c.empty && !c.punct).map(c => c.char).join('');
    this.setData({ cells, inputValue: raw });
    if (hanziOnly) this.saveHistory(hanziOnly);
  },

  onCellTap(e) {
    const char = e.currentTarget.dataset.char;
    const isPunct = e.currentTarget.dataset.punct;
    if (!char || isPunct === 'true') return;
    this.setData({ lightboxVisible: true });
    this.renderLightbox(char);
  },

  renderLightbox(text) {
    const query = wx.createSelectorQuery().in(this);
    query.select('#lightboxCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        const size = 600;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';

        const fontSize = text.length === 1 ? 480 :
                         text.length === 2 ? 320 :
                         text.length === 3 ? 240 : 192;
        ctx.font = `${fontSize}px JingXiaoPeng`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size / 2);
      });
  },

  closeLightbox() {
    this.setData({ lightboxVisible: false });
  },

  // Export grid as image
  exportImage() {
    const cells = this.data.cells.filter(c => !c.empty);
    if (cells.length === 0) return;

    if (!this.data.fontReady) {
      wx.showToast({ title: '字体加载中，请稍候', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '生成图片...' });

    const query = wx.createSelectorQuery().in(this);
    query.select('#exportCanvas')
      .fields({ node: true })
      .exec((res) => {
        if (!res[0]) {
          wx.hideLoading();
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        const rows = Math.ceil(cells.length / COLS);
        const w = COLS * CELL_SIZE;
        const h = rows * CELL_SIZE;
        const dpr = wx.getWindowInfo().pixelRatio;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);

        const gridStyle = this.data.gridStyle;

        cells.forEach((cell, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const x = col * CELL_SIZE;
          const y = row * CELL_SIZE;

          // Cell background
          if (gridStyle === 'fangge') {
            ctx.fillStyle = '#faf8f5';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#e0d8d0';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
          } else if (gridStyle === 'hengxian') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#bbb';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y + CELL_SIZE - 0.5);
            ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - 0.5);
            ctx.stroke();
          } else if (gridStyle === 'tianzi') {
            ctx.fillStyle = '#fff';
            ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#e8a0a0';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
            // Cross
            ctx.strokeStyle = '#e8a0a0';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x + CELL_SIZE / 2, y);
            ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE);
            ctx.moveTo(x, y + CELL_SIZE / 2);
            ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE / 2);
            ctx.stroke();
          }

          if (cell.char) {
            ctx.fillStyle = cell.punct ? '#999' : '#000';
            const fs = cell.punct ? PUNCT_FONT_SIZE : FONT_SIZE;
            const fontFamily = cell.punct ? 'sans-serif' : 'JingXiaoPeng';
            ctx.font = `${fs}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(cell.char, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
          }
        });

        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas,
            success: (res) => {
              wx.hideLoading();
              this.setData({
                lightboxVisible: true,
                lightboxImg: res.tempFilePath,
                lightboxCanvas: false
              });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: '生成失败', icon: 'none' });
            }
          });
        }, 100);
      });
  },

  saveToAlbum() {
    const src = this.data.lightboxImg;
    if (!src) return;

    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.writePhotosAlbum'] === false) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting();
            }
          });
          return;
        }
        wx.saveImageToPhotosAlbum({
          filePath: src,
          success: () => wx.showToast({ title: '已保存到相册' }),
          fail: () => wx.showToast({ title: '保存失败', icon: 'none' })
        });
      }
    });
  },

  // History
  loadHistory() {
    try {
      const list = wx.getStorageSync(HISTORY_KEY_JIZI) || [];
      this.setData({ history: list });
    } catch {
      this.setData({ history: [] });
    }
  },

  saveHistory(text) {
    let list;
    try {
      list = (wx.getStorageSync(HISTORY_KEY_JIZI) || []).filter(c => c !== text);
    } catch {
      list = [];
    }
    list.unshift(text);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    wx.setStorageSync(HISTORY_KEY_JIZI, list);
    this.setData({ history: list });
  },

  onHistoryTap(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputValue: text });
    this.doSearch();
  },

  clearAllHistory() {
    wx.removeStorageSync(HISTORY_KEY_JIZI);
    this.setData({ history: [] });
  },

  switchGridStyle(e) {
    this.setData({ gridStyle: e.currentTarget.dataset.style });
  },

  onShareAppMessage() {
    return {
      title: '老妖怪的集字站 — 荆霄鹏行楷集字',
      path: '/pages/jizi/jizi'
    };
  }
});
