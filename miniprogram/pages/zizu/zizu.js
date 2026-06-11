const { CDN_BASE, HISTORY_KEY_ZIZU, FAVORITES_KEY, MAX_HISTORY } = require('../../utils/config');
const { WORDS } = require('../../utils/words');

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
    isFavorited: false,
    favorites: []
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
    this.loadFavorites();
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

    // Update favorite state
    try {
      const favs = wx.getStorageSync(FAVORITES_KEY) || [];
      this.setData({ isFavorited: favs.includes(text) });
    } catch {
      this.setData({ isFavorited: false });
    }

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
    const encoded = encodeURIComponent(text);
    const current = this.data.handImg;
    let next = '';
    if (current.endsWith('.jpg')) {
      next = `${CDN_BASE}/images/teacher/hand/${encoded}.jpeg`;
    } else if (current.endsWith('.jpeg')) {
      next = `${CDN_BASE}/images/teacher/annot/${encoded}.png`;
    }
    if (next) {
      this.setData({ handImg: next });
    } else {
      this.setData({ handImg: '', handLoading: false });
    }
  },

  onAnnotImgError() {
    const text = this.data.currentText;
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

  // Export comparison as image
  exportImage() {
    const text = this.data.currentText;
    if (!text) return;

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
        const dpr = wx.getWindowInfo().pixelRatio;

        const cardW = 260;
        const gap = 20;
        const titleH = 50;
        const labelH = 30;
        const totalW = cardW * 3 + gap * 2;
        const totalH = titleH + labelH + cardW + labelH;
        canvas.width = totalW * dpr;
        canvas.height = totalH * dpr;
        ctx.scale(dpr, dpr);

        // Background
        ctx.fillStyle = '#f5f0eb';
        ctx.fillRect(0, 0, totalW, totalH);

        // Title
        ctx.fillStyle = '#2c2c2c';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`「${text}」字组对比`, totalW / 2, titleH / 2);

        const y = titleH;
        const cards = [
          { label: '老妖怪手写范本', img: this.data.handImg },
          { label: '手写范本标注', img: this.data.annotImg },
          { label: '荆霄鹏行楷集字', img: null }
        ];

        let loaded = 0;
        const total = cards.length;
        const checkDone = () => {
          loaded++;
          if (loaded < total) return;

          // Draw all cards
          cards.forEach((card, i) => {
            const cx = i * (cardW + gap);

            // Card background
            ctx.fillStyle = '#fff';
            ctx.fillRect(cx, y, cardW, labelH + cardW);

            // Label
            ctx.fillStyle = '#888';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(card.label, cx + cardW / 2, y + labelH / 2);

            if (card.imgObj) {
              // Draw image
              const img = card.imgObj;
              const scale = Math.min(cardW / img.width, cardW / img.height);
              const dw = img.width * scale;
              const dh = img.height * scale;
              ctx.drawImage(img, cx + (cardW - dw) / 2, y + labelH + (cardW - dh) / 2, dw, dh);
            } else if (card.label.includes('荆霄鹏')) {
              // Draw JXP text
              ctx.fillStyle = '#000';
              const fontSize = text.length === 1 ? 180 :
                               text.length === 2 ? 120 :
                               text.length === 3 ? 90 : 72;
              ctx.font = `${fontSize}px JingXiaoPeng`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(text, cx + cardW / 2, y + labelH + cardW / 2);
            } else {
              ctx.fillStyle = '#ccc';
              ctx.font = '20px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('暂未收录', cx + cardW / 2, y + labelH + cardW / 2);
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
        };

        // Load images
        cards.forEach((card) => {
          if (card.img) {
            const img = canvas.createImage();
            img.onload = () => {
              card.imgObj = img;
              checkDone();
            };
            img.onerror = () => {
              card.imgObj = null;
              checkDone();
            };
            img.src = card.img;
          } else {
            card.imgObj = null;
            checkDone();
          }
        });
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

  // Share
  onShareAppMessage() {
    const text = this.data.currentText || '';
    return {
      title: text ? `「${text}」— 老妖怪的集字站` : '老妖怪的集字站',
      path: `/pages/zizu/zizu`
    };
  },

  // Favorites
  loadFavorites() {
    try {
      const list = wx.getStorageSync(FAVORITES_KEY) || [];
      const isFav = this.data.currentText ? list.includes(this.data.currentText) : false;
      this.setData({ favorites: list, isFavorited: isFav });
    } catch {
      this.setData({ favorites: [], isFavorited: false });
    }
  },

  toggleFavorite() {
    const text = this.data.currentText;
    if (!text) return;

    let list;
    try {
      list = (wx.getStorageSync(FAVORITES_KEY) || []);
    } catch {
      list = [];
    }

    if (list.includes(text)) {
      list = list.filter(c => c !== text);
      this.setData({ isFavorited: false });
      wx.showToast({ title: '已取消收藏', icon: 'none' });
    } else {
      list.unshift(text);
      this.setData({ isFavorited: true });
      wx.showToast({ title: '已收藏', icon: 'none' });
    }

    wx.setStorageSync(FAVORITES_KEY, list);
    this.setData({ favorites: list });
  },

  onFavoriteTap(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({ inputValue: text });
    this.searchZizu(text);
  }
});
