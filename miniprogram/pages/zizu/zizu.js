const { CDN_BASE, HISTORY_KEY_ZIZU, MAX_HISTORY } = require('../../utils/config');
const WORDS = require('../../utils/words');

function isChineseText(str) {
  return /^[一-鿿]+$/.test(str);
}

Page({
  data: {
    inputValue: '',
    currentText: '',
    relatedWords: [],
    relatedBaseChar: null,
    history: [],
    handImg: '',
    annotImg: '',
    handLoading: false,
    annotLoading: false,
    jxpClass: '',
    lightboxVisible: false,
    lightboxImg: '',
    lightboxCanvas: false,
    fontReady: false,
    fontLoaded: false
  },

  onLoad() {
    const authorized = wx.getStorageSync('authorized');
    if (!authorized) {
      wx.redirectTo({ url: '/pages/auth/auth' });
      return;
    }

    const app = getApp();
    app.onFontReady((loaded) => {
      this.setData({ fontReady: true, fontLoaded: loaded });
    });
  },

  onShow() {
    this.loadHistory();
    const app = getApp();
    if (app.fontLoadFinished && !this.data.fontReady) {
      this.setData({ fontReady: true, fontLoaded: app.fontLoaded });
    }
  },

  onInput(e) {
    const val = e.detail.value.trim();
    this.setData({ inputValue: e.detail.value });
    if (val && isChineseText(val)) {
      this.searchZizu(val);
    }
  },

  clearInput() {
    this.setData({ inputValue: '', currentText: '', relatedWords: [], handImg: '', annotImg: '' });
  },

  doSearch() {
    const val = this.data.inputValue.trim();
    if (val && isChineseText(val)) {
      this.searchZizu(val);
    }
  },

  searchZizu(text) {
    if (!isChineseText(text)) return;

    const relatedBaseChar = text.charAt(0);
    const related = WORDS.filter(w => w !== text && w.includes(relatedBaseChar));

    let jxpClass = '';
    if (text.length > 1) {
      jxpClass = 'multi-char';
      if (text.length === 3) jxpClass += ' len-3';
      if (text.length >= 4) jxpClass += ' len-4';
    }

    this.setData({
      inputValue: text,
      currentText: text,
      relatedWords: related,
      relatedBaseChar,
      jxpClass,
      handImg: '',
      annotImg: '',
      handLoading: true,
      annotLoading: true
    });

    const encoded = encodeURIComponent(text);
    this.setData({
      handImg: `${CDN_BASE}/images/teacher/hand/${encoded}.jpg`,
      annotImg: `${CDN_BASE}/images/teacher/annot/${encoded}.jpg`
    });

    this.saveHistory(text);
  },

  showZizuDetail(text) {
    let jxpClass = '';
    if (text.length > 1) {
      jxpClass = 'multi-char';
      if (text.length === 3) jxpClass += ' len-3';
      if (text.length >= 4) jxpClass += ' len-4';
    }

    this.setData({
      inputValue: text,
      currentText: text,
      jxpClass,
      handImg: '',
      annotImg: '',
      handLoading: true,
      annotLoading: true
    });

    const encoded = encodeURIComponent(text);
    this.setData({
      handImg: `${CDN_BASE}/images/teacher/hand/${encoded}.jpg`,
      annotImg: `${CDN_BASE}/images/teacher/annot/${encoded}.jpg`
    });
  },

  onHandImgError() {
    const text = this.data.currentText;
    if (!text) {
      this.setData({ handImg: '', handLoading: false });
      return;
    }
    const encoded = encodeURIComponent(text);
    const current = this.data.handImg;
    let next = '';
    if (current.endsWith('.jpg')) {
      next = `${CDN_BASE}/images/teacher/hand/${encoded}.jpeg`;
    } else if (current.endsWith('.jpeg')) {
      next = `${CDN_BASE}/images/teacher/hand/${encoded}.png`;
    }
    if (next) {
      this.setData({ handImg: next });
    } else {
      this.setData({ handImg: '', handLoading: false });
    }
  },

  onAnnotImgError() {
    const text = this.data.currentText;
    if (!text) {
      this.setData({ annotImg: '', annotLoading: false });
      return;
    }
    const encoded = encodeURIComponent(text);
    const current = this.data.annotImg;
    let next = '';
    if (current.endsWith('.jpg')) {
      next = `${CDN_BASE}/images/teacher/annot/${encoded}.jpeg`;
    } else if (current.endsWith('.jpeg')) {
      next = `${CDN_BASE}/images/teacher/annot/${encoded}.png`;
    }
    if (next) {
      this.setData({ annotImg: next });
    } else {
      this.setData({ annotImg: '', annotLoading: false });
    }
  },

  onRelatedTap(e) {
    const char = e.currentTarget.dataset.char;
    this.showZizuDetail(char);
  },

  onImageTap(e) {
    const type = e.currentTarget.dataset.type;
    const src = type === 'hand' ? this.data.handImg : this.data.annotImg;
    if (src) {
      this.setData({
        lightboxVisible: true,
        lightboxImg: src,
        lightboxCanvas: false
      });
    }
  },

  onJxpTap() {
    const text = this.data.currentText;
    if (!text) return;
    this.setData({
      lightboxVisible: true,
      lightboxImg: '',
      lightboxCanvas: true
    });
    setTimeout(() => this.renderLightbox(text), 100);
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
    this.setData({ lightboxVisible: false, lightboxImg: '', lightboxCanvas: false });
  },

  loadHistory() {
    try {
      const list = wx.getStorageSync(HISTORY_KEY_ZIZU) || [];
      this.setData({ history: list });
    } catch {
      this.setData({ history: [] });
    }
  },

  saveHistory(text) {
    let list;
    try {
      list = (wx.getStorageSync(HISTORY_KEY_ZIZU) || []).filter(c => c !== text);
    } catch {
      list = [];
    }
    list.unshift(text);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    wx.setStorageSync(HISTORY_KEY_ZIZU, list);
    this.setData({ history: list });
  },

  onHistoryTap(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputValue: text });
    this.searchZizu(text);
  },

  clearAllHistory() {
    wx.removeStorageSync(HISTORY_KEY_ZIZU);
    this.setData({ history: [] });
  },

  onShareAppMessage() {
    const text = this.data.currentText || '';
    return {
      title: text ? `「${text}」— 老妖怪的集字站` : '老妖怪的集字站',
      path: '/pages/zizu/zizu'
    };
  }
});
