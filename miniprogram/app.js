App({
  fontLoaded: false,
  cloudReady: false,

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    wx.cloud.init({
      env: 'cloud1-d7gqmginffdcb6727',
      traceUser: true
    });

    this.cloudReady = true;

    const platform = (wx.getDeviceInfo && wx.getDeviceInfo().platform) ||
                     wx.getSystemInfoSync().platform;
    console.log('设备平台:', platform);

    if (platform === 'ios') {
      this.loadFontFromCloud();
    } else {
      this.loadFontFromCdn(0);
    }
  },

  loadFontFromCloud(retry = 0) {
    console.log('请求字体URL（云函数）retry=', retry);
    wx.cloud.callFunction({
      name: 'getFontUrl',
      success: (res) => {
        const data = res.result || {};
        if (!data.success || !data.url) {
          console.error('云函数返回无效URL', JSON.stringify(data));
          this.loadFontFromCdn(0);
          return;
        }
        this._doLoad(data.url, 'cloud', retry, () => this.loadFontFromCloud(retry + 1), 2);
      },
      fail: (err) => {
        console.error('云函数调用失败', JSON.stringify(err));
        this.loadFontFromCdn(0);
      }
    });
  },

  loadFontFromCdn(retry) {
    const fontUrl = 'https://yaoguaijizi.com/fonts/jingxiaopeng.woff2';
    console.log('加载字体(CDN) retry=', retry);
    this._doLoad(fontUrl, 'cdn', retry, () => this.loadFontFromCdn(retry + 1), 5);
  },

  _doLoad(fontUrl, source, retry, retryFn, maxRetry) {
    wx.loadFontFace({
      family: 'JingXiaoPeng',
      source: `url("${fontUrl}")`,
      global: true,
      scopes: ['webview', 'native'],
      success: (r) => {
        this.fontLoaded = true;
        console.log(`字体加载成功(${source})`, r.status);
        if (this.onFontReady) this.onFontReady();
      },
      fail: (err) => {
        console.error(`字体加载失败(${source})`, JSON.stringify(err));
        if (retry < maxRetry) {
          const delay = (retry + 1) * 1500;
          console.log(`${delay}ms 后重试 ${retry + 1}/${maxRetry} (${source})`);
          setTimeout(retryFn, delay);
        } else if (source === 'cloud') {
          console.log('云存储重试用尽，fallback CDN');
          this.loadFontFromCdn(0);
        } else {
          console.error('字体加载彻底失败');
        }
      }
    });
  }
});
