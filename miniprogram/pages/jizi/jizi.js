const { HISTORY_KEY_JIZI, MAX_HISTORY } = require('../../utils/config');

Page({
  data: {
    inputValue: '',
    cells: [],
    history: [],
    lightboxVisible: false,
    gridStyle: 'fangge' // 'fangge' | 'hengxian' | 'tianzi'
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

    // Allow Chinese + common punctuation
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

    // Pad to multiple of 8 (mobile grid)
    const remainder = cells.length % 8;
    if (remainder > 0) {
      for (let i = 0; i < 8 - remainder; i++) {
        cells.push({ char: '', empty: true, punct: false });
      }
    }

    // Save history with Chinese-only text
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
        const size = 300;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = '#000';

        const fontSize = text.length === 1 ? 240 :
                         text.length === 2 ? 160 :
                         text.length === 3 ? 120 : 96;
        ctx.font = `${fontSize}px JingXiaoPeng`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, size / 2, size / 2);
      });
  },

  closeLightbox() {
    this.setData({ lightboxVisible: false });
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

  // Grid style switcher
  switchGridStyle(e) {
    this.setData({ gridStyle: e.currentTarget.dataset.style });
  }
});
