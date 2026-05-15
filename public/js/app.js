(function () {
  // Mode
  const modeSelect = document.getElementById('modeSelect');
  const appWrapper = document.getElementById('appWrapper');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');

  // Search
  const charInput = document.getElementById('charInput');
  const clearInput = document.getElementById('clearInput');
  const searchBtn = document.getElementById('searchBtn');
  const pageSubtitle = document.getElementById('pageSubtitle');

  // Jizi mode
  const jiziArea = document.getElementById('jiziArea');
  const jiziGrid = document.getElementById('jiziGrid');

  // Zizu mode
  const zizuArea = document.getElementById('zizuArea');
  const compareArea = document.getElementById('compareArea');
  const currentText = document.getElementById('currentText');
  const teacherHand = document.getElementById('teacherHand');
  const teacherAnnot = document.getElementById('teacherAnnot');
  const jxpChar = document.getElementById('jxpChar');
  const relatedSection = document.getElementById('relatedSection');
  const relatedTags = document.getElementById('relatedTags');

  // Shared
  const historySection = document.getElementById('historySection');
  const historyTags = document.getElementById('historyTags');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxClose = document.getElementById('lightboxClose');

  const HISTORY_KEY_JIZI = 'jizi_search_history_jizi';
  const HISTORY_KEY_ZIZU = 'jizi_search_history_zizu';
  const MAX_HISTORY = 20;

  let currentMode = null;
  let fontLoaded = false;

  function loadFont() {
    if (fontLoaded) return;
    fontLoaded = true;
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.href = '../fonts/jingxiaopeng.woff2';
    preload.as = 'font';
    preload.type = 'font/woff2';
    preload.crossOrigin = 'anonymous';
    document.head.appendChild(preload);
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: 'JingXiaoPeng';
        src: url('../fonts/jingxiaopeng.woff2') format('woff2');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
    `;
    document.head.appendChild(style);
  }

  // ========== Mode Management ==========

  function enterMode(mode) {
    currentMode = mode;
    loadFont();
    modeSelect.style.display = 'none';
    appWrapper.style.display = 'flex';
    updateTabState();
    updateUIForMode();
    renderHistory();
    charInput.focus();
  }

  function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    updateTabState();
    updateUIForMode();
    clearResults();
    charInput.value = '';
    renderHistory();
    charInput.focus();
  }

  function updateTabState() {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
  }

  function updateUIForMode() {
    if (currentMode === 'jizi') {
      searchBtn.textContent = '生成集字';
      pageSubtitle.textContent = '输入文字，生成荆霄鹏行楷集字排版';
      charInput.placeholder = '输入汉字（最多200字）...';
      zizuArea.style.display = 'none';
      jiziArea.style.display = 'none';
    } else {
      searchBtn.textContent = '搜索';
      pageSubtitle.textContent = '输入字/词，生成老妖怪手写范本及荆霄鹏行楷集字范本';
      charInput.placeholder = '输入汉字或词组...';
      zizuArea.style.display = 'block';
      jiziArea.style.display = 'none';
      compareArea.style.display = 'none';
      relatedSection.style.display = 'none';
    }
  }

  function clearResults() {
    jiziArea.style.display = 'none';
    jiziGrid.innerHTML = '';
    compareArea.style.display = 'none';
    currentText.innerHTML = '';
    teacherHand.innerHTML = '<span class="placeholder-text">暂未收录</span>';
    teacherAnnot.innerHTML = '<span class="placeholder-text">暂未收录</span>';
    jxpChar.textContent = '';
    jxpChar.className = 'char-display jxp-char';
    relatedSection.style.display = 'none';
    relatedTags.innerHTML = '';
  }

  // ========== History ==========

  function getHistoryKey() {
    return currentMode === 'jizi' ? HISTORY_KEY_JIZI : HISTORY_KEY_ZIZU;
  }

  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(getHistoryKey())) || [];
    } catch {
      return [];
    }
  }

  function saveHistory(text) {
    const list = getHistory().filter(c => c !== text);
    list.unshift(text);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    localStorage.setItem(getHistoryKey(), JSON.stringify(list));
  }

  function renderHistory() {
    const list = getHistory();
    if (list.length === 0) {
      historySection.style.display = 'none';
      return;
    }
    historySection.style.display = 'block';
    historyTags.innerHTML = list
      .map(c => `<span data-char="${c}">${c}</span>`)
      .join('');
  }

  function clearAllHistory() {
    localStorage.removeItem(getHistoryKey());
    renderHistory();
  }

  // ========== Validation ==========

  function isChineseText(str) {
    return /^[一-鿿]+$/.test(str);
  }

  function filterChinese(str) {
    return str.split('').filter(ch => isChineseText(ch)).join('');
  }

  // ========== Image Loader ==========

  function loadImage(container, baseSrc, alt) {
    container.innerHTML = '<span class="loading-text">加载中...</span>';
    const img = document.createElement('img');
    img.alt = alt;

    const formats = ['.jpg', '.jpeg', '.png'];
    const srcWithoutExt = baseSrc.replace(/\.(png|jpg|jpeg)$/i, '');
    let formatIndex = 0;

    function tryNextFormat() {
      if (formatIndex >= formats.length) {
        container.innerHTML = '<span class="placeholder-text">暂未收录</span>';
        return;
      }
      img.src = srcWithoutExt + formats[formatIndex];
    }

    img.onerror = function () {
      formatIndex++;
      tryNextFormat();
    };

    img.onload = function () {
      container.innerHTML = '';
      container.appendChild(img);
    };

    tryNextFormat();
  }

  // ========== JIZI Mode ==========

  function searchJizi(rawText) {
    const text = filterChinese(rawText);
    if (!text) {
      charInput.value = '';
      return;
    }

    charInput.value = rawText;
    jiziArea.style.display = 'block';
    jiziGrid.innerHTML = '';

    text.split('').forEach(ch => {
      const cell = document.createElement('div');
      cell.className = 'jizi-cell';
      cell.textContent = ch;
      cell.addEventListener('click', () => openJxpLightbox(ch));
      jiziGrid.appendChild(cell);
    });

    // Pad to multiple of 20 for neat grid (optional)
    const remainder = text.length % 20;
    if (remainder > 0) {
      for (let i = 0; i < 20 - remainder; i++) {
        const empty = document.createElement('div');
        empty.className = 'jizi-cell empty';
        jiziGrid.appendChild(empty);
      }
    }

    saveHistory(text);
    renderHistory();
  }

  // ========== ZIZU Mode ==========

  function searchZizu(text) {
    text = text.trim();
    if (!isChineseText(text)) {
      charInput.value = '';
      return;
    }

    charInput.value = text;
    compareArea.style.display = 'block';
    currentText.innerHTML = `<span>${text}</span>`;

    // Teacher handwritten
    loadImage(teacherHand, `images/teacher/hand/${text}`, text);

    // Teacher annotated
    loadImage(teacherAnnot, `images/teacher/annot/${text}`, text);

    // Jing Xiaopeng
    jxpChar.textContent = text;
    jxpChar.className = 'char-display jxp-char';
    if (text.length > 1) {
      jxpChar.classList.add('multi-char');
      if (text.length === 3) jxpChar.classList.add('len-3');
      if (text.length >= 4) jxpChar.classList.add('len-4');
    }

    // Related words — always based on first character so they persist when switching words
    renderRelated(text.charAt(0));

    saveHistory(text);
    renderHistory();
  }

  function renderRelated(text) {
    if (typeof WORDS === 'undefined') {
      relatedSection.style.display = 'none';
      return;
    }

    const related = WORDS.filter(w => w !== text && w.includes(text));
    if (related.length === 0) {
      relatedSection.style.display = 'none';
      return;
    }

    relatedSection.style.display = 'block';
    relatedTags.innerHTML = related
      .map(w => `<span data-char="${w}">${w}</span>`)
      .join('');
  }

  // ========== Lightbox ==========

  function openLightbox(src) {
    lightboxImg.src = src;
    lightbox.classList.add('active');
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
  }

  function openJxpLightbox(text) {
    if (!text) return;
    const canvas = document.createElement('canvas');
    const size = 800;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';

    const fontSize = text.length === 1 ? 600 :
                     text.length === 2 ? 400 :
                     text.length === 3 ? 300 : 240;
    ctx.font = `${fontSize}px JingXiaoPeng`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2);
    openLightbox(canvas.toDataURL('image/png'));
  }

  // ========== Event: Mode Selection ==========

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => enterMode(btn.dataset.mode));
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchMode(btn.dataset.mode));
  });

  // ========== Event: Search ==========

  function doSearch() {
    const val = charInput.value;
    if (currentMode === 'jizi') {
      searchJizi(val);
    } else {
      searchZizu(val);
    }
  }

  searchBtn.addEventListener('click', doSearch);
  charInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // Event: clear input
  clearInput.addEventListener('click', () => {
    charInput.value = '';
    charInput.focus();
    clearInput.classList.remove('visible');
  });

  charInput.addEventListener('input', () => {
    if (charInput.value.length > 0) {
      clearInput.classList.add('visible');
    } else {
      clearInput.classList.remove('visible');
    }
  });

  // Handle IME composition
  let composing = false;
  charInput.addEventListener('compositionstart', () => { composing = true; });
  charInput.addEventListener('compositionend', () => {
    composing = false;
    const val = charInput.value.trim();
    if (val) doSearch();
  });
  charInput.addEventListener('input', () => {
    if (!composing) {
      const val = charInput.value.trim();
      if (val && currentMode === 'zizu' && isChineseText(val)) {
        // In zizu mode, auto-search on input if valid text
        searchZizu(val);
      }
    }
    // Show/hide clear button based on input
    clearInput.classList.toggle('visible', charInput.value.length > 0);
  });

  // ========== Event: Teacher Images Zoom ==========

  teacherHand.addEventListener('click', () => {
    const img = teacherHand.querySelector('img');
    if (img) openLightbox(img.src);
  });

  teacherAnnot.addEventListener('click', () => {
    const img = teacherAnnot.querySelector('img');
    if (img) openLightbox(img.src);
  });

  // ========== Event: JXP Char Zoom ==========

  jxpChar.addEventListener('click', () => {
    const text = jxpChar.textContent;
    openJxpLightbox(text);
  });

  // ========== Event: Related Tags ==========

  relatedTags.addEventListener('click', (e) => {
    const tag = e.target.closest('span[data-char]');
    if (tag) searchZizu(tag.dataset.char);
  });

  // ========== Event: History ==========

  historyTags.addEventListener('click', (e) => {
    const tag = e.target.closest('span[data-char]');
    if (!tag) return;
    const text = tag.dataset.char;
    charInput.value = text;
    if (currentMode === 'jizi') {
      searchJizi(text);
    } else {
      searchZizu(text);
    }
  });
  clearHistory.addEventListener('click', clearAllHistory);

  // ========== Event: Lightbox ==========

  lightboxClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });

})();
