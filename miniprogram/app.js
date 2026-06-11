App({
  fontLoaded: false,

  onLaunch() {
    wx.loadFontFace({
      family: 'JingXiaoPeng',
      source: 'url("https://yaoguaijizi.com/fonts/jingxiaopeng.woff2")',
      global: true,
      success: (res) => {
        this.fontLoaded = true;
        console.log('字体加载成功', res.status);
        if (this.onFontReady) this.onFontReady();
      },
      fail: (err) => {
        console.error('字体加载失败', err);
      }
    });
  }
});
