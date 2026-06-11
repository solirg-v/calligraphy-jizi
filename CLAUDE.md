# 老妖怪的集字站

## 恢复上下文（给 AI 的指令）

新对话进入本项目时，**必须先执行以下步骤**：

1. **读取本文件** `CLAUDE.md`
2. 运行 `git log --oneline -10` 确认最新提交
3. 检查 `public/images/teacher/hand/` 和 `public/images/teacher/annot/` 的文件数量
4. 读取 `public/js/words.js` 开头确认词库规模
5. 检查 `public/fonts/jingxiaopeng.woff2` 大小确认字体版本（应约 2.4MB GB2312 全集）
6. 询问用户本次想修改什么
7. **创建或移动任何文件前，先对照本文件 §4 文件结构约定，确认目标路径符合约定**

## 1. 项目概述

- **名称**：老妖怪的集字站
- **用途**：书法教学工具，学员对比老妖怪手写范本与荆霄鹏行楷
- **当前版本**：demo 1.1 + 小程序版
- **部署地址**：https://calligraphy-jizi.vercel.app / https://yaoguaijizi.com / https://www.yaoguaijizi.com
- **本地路径**：`/Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi/`

## 2. 技术栈

- **Web 前端**：HTML + CSS + JS（纯静态，无框架）
- **小程序前端**：微信小程序原生（WXML + WXSS + JS）
- **小程序后端**：微信云开发（云函数 + 云数据库）
- **字体**：荆霄鹏行楷（WOFF2 ~2.4MB，GB2312 全集 6763 字；原始 TTF 7.2MB）
- **Web 部署**：Vercel（免费版）
- **图片存储**：本地文件夹（Web）/ CDN（小程序）
- **词库生成**：Python3 `build_dict.py`

## 3. 双模式架构

用户进入首页后二选一：

| 模式 | 功能 |
|------|------|
| **集字模式** | 输入文字（最多200字），生成荆霄鹏行楷横向网格排版，点击单字可查看高清大图 |
| **字组模式** | 输入单字/词组，展示三列对比：手写范本 / 标注范本 / 荆霄鹏行楷集字 |

**两种模式的历史记录相互独立。**

- **集字模式**：过滤非汉字字符，不足整行补空格，字号根据字数自适应
- **字组模式**：支持多格式图片自动探测（.png/.jpg/.jpeg），缺失时显示「暂未收录」；相关词组基于首字模糊匹配；输入即搜索（已处理 IME）

## 4. 文件结构约定

```
calligraphy-jizi/
├── public/                      # Web端生产源代码（Vercel Root Directory）
│   ├── index.html               # 主页面（模式选择 + 双模式 UI）
│   ├── css/style.css            # 全部样式（含移动端响应式）
│   ├── js/
│   │   ├── app.js               # 核心逻辑
│   │   └── words.js             # 词库（由 build_dict.py 自动生成）
│   ├── fonts/
│   │   └── jingxiaopeng.woff2   # 荆霄鹏行楷字体（~2.4MB，GB2312全集）
│   ├── images/teacher/
│   │   ├── hand/                # 手写范本图片
│   │   └── annot/               # 标注范本图片
│   └── vercel.json              # Vercel 路由/CORS/字体缓存策略（1年immutable）
├── miniprogram/                 # 微信小程序
│   ├── app.js / app.json / app.wxss
│   ├── project.config.json      # 小程序项目配置
│   ├── images/tabbar/           # TabBar 图标（home/jizi/zizu，各含 active 版）
│   ├── cloudfunctions/          # 云函数（需在微信开发者工具中上传部署）
│   │   ├── checkAuth/           # 权限验证：查白名单/验邀请码/绑定openid
│   │   ├── generateCodes/       # 批量生成邀请码（JZ开头8位）
│   │   ├── adminOps/            # 管理员操作（密码SHA256+盐 校验/邀请码管理）
│   │   ├── getOpenId/           # 获取用户openid
│   │   └── getFontUrl/          # 返回字体云存储tempFileURL（iOS用，绕过权限限制）
│   ├── pages/
│   │   ├── index/               # 首页（模块选择，TabBar页）
│   │   ├── jizi/                # 集字模式页（TabBar页）
│   │   ├── zizu/                # 字组模式页（TabBar页）
│   │   ├── auth/                # 邀请码验证页（非TabBar，redirectTo进入）
│   │   └── admin/               # 管理员页（邀请码管理，长按首页标题5秒+密码进入）
│   └── utils/
│       ├── config.js            # CDN_BASE、历史记录key等常量
│       └── words.js             # 词库（由 build_dict.py 复制）
├── shared/                      # 共享资源
│   └── words.js                 # 词库源文件（build_dict.py 生成）
├── tools/                       # 脚手架（不部署）
│   ├── scripts/                 # 开发脚本
│   │   ├── build_dict.py        # 词库生成（扫描 hand/+annot/ → shared/words.js → 同步到Web/小程序）
│   │   ├── subset_font.py       # 字体子集化（TTF → GB2312全集 WOFF2）
│   │   └── download_from_feishu.py  # 飞书批量下载脚本
│   └── assets/                  # 资源备份
│       └── 荆霄鹏行楷.ttf       # 原始字体备份（7.2MB，gitignored）
├── CLAUDE.md                    # 本文件
└── .gitignore
```

### 4.1 小程序架构

- **技术栈**：微信小程序原生（WXML + WXSS + JS）+ 微信云开发
- **导航**：底部 TabBar 3个（首页 / 集字 / 字组），首页选择模块后跳转
- **字体**：按平台分流加载（详见 §4.4），CSS font-family 配 -apple-system / PingFang SC 系统字兜底
- **图片**：从 CDN 加载，支持多格式自动回退
- **导出**：集字模式支持 Canvas 绘制后保存到相册（字组模式不支持）
- **分享**：自定义标题和路径

### 4.2 小程序权限系统

- **验证页** auth：输入邀请码验证，通过后 openid 写入白名单，本地缓存 authorized=true
- **云函数** checkAuth：先查 `whitelist_openid` 集合，再验 `invite_codes` 集合，验证通过后绑定
- **云函数** generateCodes：批量生成 JZ 开头8位码，写入 `invite_codes` 集合（status=available）
- **云函数** adminOps：管理员所有操作的统一入口，密码 SHA256+盐 哈希校验（密码哈希写死在 index.js）
- **云函数** getOpenId：返回当前用户 openid
- **数据库集合**：
  - `whitelist_openid`：已授权用户（openid + createdAt）
  - `invite_codes`：邀请码（code, status[available/distributed/used], openid, createdAt, usedAt）
- **管理页** admin：长按首页标题5秒 → 密码弹窗 → 进入邀请码管理（生成/复制/标记分发/查看绑定）

### 4.3 新增页面/云函数规范

新建页面或云函数时：
- 页面注册到 `app.json` 的 `pages` 数组
- 云函数放在 `miniprogram/cloudfunctions/` 下，含 `index.js` 和 `package.json`
- 样式和逻辑尽量精简，一个页面只做一件事

### 4.4 字体加载方案（小程序）

`wx.loadFontFace` 真机存在多重坑，最终方案按平台分流（见 `miniprogram/app.js`）：

- **iOS**：先调云函数 `getFontUrl` 拿云存储 `tempFileURL`，腾讯云国内CDN瞬时加载；失败 fallback 到 Vercel CDN
- **Android**：直接走 Vercel CDN — 实测 Android 上 `loadFontFace` 加载 `tcb.qcloud.la?sign=xxx` 签名URL 会瞬时报 network error，云函数路径无效
- 重试 5 次，间隔 1.5/3/4.5/6/7.5 秒
- 字体加载期间 CSS 系统字兜底（`-apple-system, PingFang SC`），用户始终可见文字，加载完成自动切换

**字体规模**：GB2312 全集 6763 字（约 2.4MB），覆盖 99% 日常用字，含「妖、集、荆」等常用字。词库扩张后需重跑 `tools/scripts/subset_font.py`。

**为什么不更小**：之前 994 字版本（339KB）导致用户输入常用字时大量字符回退到系统字，体验割裂。

**首次加载预期**：iOS 瞬时；Android ~25 秒（先显示系统字，加载完切换行楷）。后续走本地缓存瞬时，缓存有效期数天到数周（Vercel `Cache-Control: max-age=31536000, immutable`）。

**云存储字体**：`cloud://.../fonts/jingxiaopeng.woff2`，权限默认"仅创建者可读"（非付费版无法修改），所以 getFontUrl 云函数必须以管理员身份返回 tempFileURL。

## 5. 图片命名规范（关键！）

- **只能用纯汉字**，不能带标点、空格、数字
- 词组 = 文件名（如 `优秀.png`、`政策.png`）
- `build_dict.py` 会过滤掉文件名中的非汉字字符
- 同一名称必须同时存在于 `hand/` 和 `annot/` 才能完整展示
- 当前 hand/ 约 557 张，annot/ 约 555 张

## 6. 词库生成

```bash
cd /Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi
python3 tools/scripts/build_dict.py
```

- 从 `public/images/teacher/hand/` 和 `annot/` 扫描文件名
- 过滤出纯汉字词组
- 输出到 `shared/words.js`（源文件），自动复制到 `public/js/words.js` 和 `miniprogram/utils/words.js`

## 7. 飞书批量下载脚本

```bash
cd /Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi
python3 tools/scripts/download_from_feishu.py
```

⚠️ 约 50% 会归错类，下载后务必人工抽查 hand/ 和 annot/ 的内容是否正确。详细逻辑和已知问题见脚本文件内注释。

## 7.1 字体子集化

```bash
cd /Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi
python3 tools/scripts/subset_font.py
```

依赖：`pip3 install --user fonttools brotli`。从原始 TTF 生成 GB2312 全集+词库字 的 WOFF2，输出到 `public/fonts/jingxiaopeng.woff2`。词库扩张后需重跑并部署。

## 8. 部署与更新

```bash
git add -A
git commit -m "更新说明"
vercel --prod
```

**Vercel Root Directory 设为 `public/`**（Vercel Dashboard → Settings → General → Root Directory），部署只推生产代码。

**浏览器缓存问题：**
- 静态文件（HTML/CSS/JS）会被浏览器缓存
- 如果用户看不到最新功能，需要强制刷新（Cmd+Shift+R）
- 可考虑在 `index.html` 的资源引用后加 `?v=N` 版本号来强制刷新

## 9. 待办清单

✅ 已完成：域名绑定 / 小程序基础版 / 集字导出图片 / 邀请码权限系统 / **邀请码管理页（admin+adminOps）** / **字体GB2312子集化** / **真机字体加载方案（按平台分流+系统字兜底）**

| 优先级 | 需求 | 说明 |
|--------|------|------|
| 🟡 中 | **Web 端管理员入口** | 密码保护，一键扫描目录重新生成 words.js |
| 🟢 低 | **批量上传** | 网页端拖拽上传图片，自动归类并更新词典 |
| 🟢 低 | **缺失标注** | hand/ 比 annot/ 多 2 张，需补充缺失的标注版图片 |
| 🟢 低 | **国内 CDN 加速** | 当前 Vercel 节点在美国，Android 首次加载约25秒；可考虑迁移字体到 jsDelivr/七牛云 |

---

*最后更新：2026-06-11（补充字体方案、adminOps 云函数、tools/scripts 结构）*
