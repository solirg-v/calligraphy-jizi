# 老妖怪的集字站

## 恢复上下文（给 AI 的指令）

新对话进入本项目时，**必须先执行以下步骤**：

1. 读取本文件 `CLAUDE.md`
2. 运行 `git log --oneline -10` 确认最新提交
3. 询问用户本次想修改什么
4. **创建或移动任何文件前，先对照 §4 文件结构约定**

需要时再按需检查：`public/images/teacher/{hand,annot}/` 文件数 / `public/js/words.js` 词库规模 / `public/fonts/jingxiaopeng.woff2` 大小（应约 2.4MB）。

## 1. 项目概述

- **用途**：书法教学工具，学员对比老妖怪手写范本与荆霄鹏行楷
- **当前版本**：demo 1.1 + 小程序版
- **部署地址**：https://calligraphy-jizi.vercel.app / https://yaoguaijizi.com
- **本地路径**：`/Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi/`

## 2. 技术栈

- **Web 前端**：HTML + CSS + JS（纯静态）
- **小程序**：微信原生（WXML + WXSS + JS）+ 微信云开发（云函数 + 云数据库）
- **字体**：荆霄鹏行楷 WOFF2 ~2.4MB（GB2312 全集 6763 字；原始 TTF 7.2MB）
- **Web 部署**：Vercel（免费版）
- **词库生成**：Python3 `tools/scripts/build_dict.py`

## 3. 双模式架构

| 模式 | 功能 |
|------|------|
| **集字模式** | 输入文字（最多200字），生成荆霄鹏行楷横向网格排版，点击单字查看高清大图 |
| **字组模式** | 输入单字/词组，展示三列对比：手写范本 / 标注范本 / 荆霄鹏行楷集字 |

两种模式历史记录相互独立。集字模式过滤非汉字、不足整行补空格、字号自适应；字组模式支持多格式图片自动探测（.png/.jpg/.jpeg）、首字模糊匹配相关词组、输入即搜索（已处理 IME）。

## 4. 文件结构约定

```
calligraphy-jizi/
├── public/                      # Web端生产源代码（Vercel Root Directory）
│   ├── index.html
│   ├── css/style.css
│   ├── js/{app.js, words.js}    # words.js 由 build_dict.py 生成
│   ├── fonts/jingxiaopeng.woff2 # ~2.4MB，GB2312 全集
│   ├── images/teacher/{hand,annot}/
│   └── vercel.json              # CORS + 字体 1年immutable 缓存
├── miniprogram/                 # 微信小程序
│   ├── app.{js,json,wxss}
│   ├── project.config.json
│   ├── images/tabbar/           # home/jizi/zizu，各含 active 版
│   ├── cloudfunctions/          # 需在微信开发者工具中上传部署
│   │   ├── checkAuth/           # 查白名单/验邀请码/绑定openid
│   │   ├── generateCodes/       # 批量生成邀请码
│   │   ├── adminOps/            # 管理员统一入口（密码 SHA256+盐 校验）
│   │   ├── getOpenId/
│   │   └── getFontUrl/          # 返回字体 tempFileURL（iOS用，绕过云存储权限）
│   ├── pages/
│   │   ├── index/               # 首页（TabBar）
│   │   ├── jizi/                # 集字模式（TabBar）
│   │   ├── zizu/                # 字组模式（TabBar）
│   │   ├── auth/                # 邀请码验证页（redirectTo 进入）
│   │   └── admin/               # 管理员页（长按首页标题5秒+密码进入）
│   └── utils/{config.js, words.js}
├── shared/words.js              # 词库源文件
├── tools/                       # 脚手架（不部署）
│   ├── scripts/{build_dict,subset_font,download_from_feishu}.py
│   └── assets/荆霄鹏行楷.ttf   # 原始字体备份（gitignored）
├── CLAUDE.md
└── .gitignore
```

### 4.1 小程序权限系统

- **数据库集合**：
  - `whitelist_openid`：已授权用户（openid + createdAt）
  - `invite_codes`：邀请码（code, status[available/distributed/used], openid, createdAt, usedAt）
- **流程**：auth 页输入邀请码 → checkAuth 查白名单或验码 → 通过后写白名单 + 本地缓存 authorized=true
- **管理**：长按首页标题5秒 → 密码弹窗 → admin 页（生成/复制/标记分发/查看绑定），所有操作经 adminOps 云函数，密码哈希写死在其 index.js

### 4.2 字体加载方案（小程序）

`wx.loadFontFace` 真机多重坑，按平台分流（见 `miniprogram/app.js`，详细踩坑记录见 memory `font-loading-lessons.md`）：

- **iOS**：云函数 `getFontUrl` 拿 tempFileURL，腾讯云国内CDN瞬时；失败 fallback Vercel CDN
- **Android**：直接 Vercel CDN（Android 上 `tcb.qcloud.la?sign=xxx` 签名URL 会瞬时报 network error）
- 重试 5 次，间隔 1.5/3/4.5/6/7.5 秒
- CSS 系统字兜底（`-apple-system, PingFang SC`），加载完成自动切换
- 首次加载：iOS 瞬时 / Android ~25 秒；后续走本地缓存瞬时

### 4.3 新增页面/云函数

- 页面注册到 `app.json` 的 `pages` 数组
- 云函数放 `miniprogram/cloudfunctions/` 下，含 `index.js` 和 `package.json`
- 一个页面只做一件事

## 5. 图片命名规范（关键！）

- **只能用纯汉字**，不能带标点、空格、数字
- 词组 = 文件名（如 `优秀.png`）
- 同一名称必须同时存在于 `hand/` 和 `annot/` 才能完整展示
- 当前 hand/ 约 557 张，annot/ 约 555 张

## 6. 常用脚本

```bash
cd /Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi

python3 tools/scripts/build_dict.py            # 扫描图片生成词库（→ shared/ + public/js/ + miniprogram/utils/）
python3 tools/scripts/subset_font.py           # TTF → GB2312 全集 WOFF2（依赖 fonttools+brotli；词库扩张后重跑）
python3 tools/scripts/download_from_feishu.py  # ⚠️ 约 50% 归错类，下载后人工抽查
```

## 7. 部署

```bash
git add -A && git commit -m "..."
vercel --prod
```

Vercel Root Directory 设为 `public/`。静态文件有浏览器缓存，必要时给 `index.html` 资源引用加 `?v=N`。

## 8. 待办清单

✅ 已完成：域名绑定 / 小程序基础版 / 集字导出图片 / 邀请码权限系统 / 邀请码管理页 / 字体GB2312子集化 / 真机字体加载方案

| 优先级 | 需求 | 说明 |
|--------|------|------|
| 🟡 中 | Web 端管理员入口 | 密码保护，一键扫描目录重新生成 words.js |
| 🟢 低 | 批量上传 | 网页端拖拽上传图片，自动归类并更新词典 |
| 🟢 低 | 缺失标注 | hand/ 比 annot/ 多 2 张 |
| 🟢 低 | 国内 CDN 加速 | Vercel 节点在美国，Android 首次约25秒；可迁移到 jsDelivr/七牛云 |
