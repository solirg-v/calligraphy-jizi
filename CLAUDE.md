# 老妖怪的集字站 — 交接文档

## 1. 项目概述

- **名称**：老妖怪的集字站
- **用途**：书法教学工具，学员对比老妖怪手写范本与荆霄鹏行楷
- **当前版本**：demo 1.1（Git 版本保存）
- **部署地址**：https://calligraphy-jizi.vercel.app / https://yaoguaijizi.com / https://www.yaoguaijizi.com
- **本地路径**：`/Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi/`

## 2. 技术栈

- **前端**：HTML + CSS + JS（纯静态，无框架）
- **字体**：荆霄鹏行楷（WOFF2，2.5MB；原始 TTF 7.2MB）
- **部署**：Vercel（免费版）
- **图片存储**：本地文件夹（未使用 CDN）
- **词库生成**：Python3 `build_dict.py`

## 3. 双模式架构

用户进入首页后二选一：

| 模式 | 功能 | 搜索按钮文案 | 历史记录 localStorage key |
|------|------|-------------|------------------------|
| **集字模式** | 输入文字（最多200字），生成荆霄鹏行楷横向网格排版 | 生成集字 | `jizi_search_history_jizi` |
| **字组模式** | 输入单字/词组，先显示模糊搜索的相关词组，点击后展示三种范本对比 | 搜索 | `jizi_search_history_zizu` |

**两种模式的历史记录相互独立。**

### 3.1 集字模式

- 输入任意汉字（过滤非汉字字符），生成横向网格
- 每行固定 20 格，不足补空（`empty` class）
- 点击单字弹出 Lightbox，Canvas 渲染高清大图（800×800）
- 字号根据字数自适应：1字600px / 2字400px / 3字300px / ≥4字240px

### 3.2 字组模式

- 输入纯汉字词组，展示三列对比：
  1. **老妖怪手写范本** — 图片 `images/teacher/hand/{词组}.png`
  2. **手写范本标注** — 图片 `images/teacher/annot/{词组}.png`（红框/字形｜黄圈/字心｜蓝箭头/起笔位置）
  3. **荆霄鹏行楷集字** — 字体渲染
- 支持 `.png`、`.jpg`、`.jpeg` 三种格式自动探测（`loadImage` 函数）
- 缺失时显示「暂未收录」
- 相关词组基于**首字**模糊匹配，点击后持久展示
- 字组模式支持**输入即搜索**（IME composition 处理后用 input 事件触发）

## 4. 文件结构约定

```
calligraphy-jizi/
├── public/                      # 生产源代码（Vercel Root Directory）
│   ├── index.html               # 主页面（模式选择 + 双模式 UI）
│   ├── css/style.css            # 全部样式（含移动端响应式）
│   ├── js/
│   │   ├── app.js               # 核心逻辑
│   │   └── words.js             # 词库（由 tools/build_dict.py 自动生成）
│   ├── fonts/
│   │   └── jingxiaopeng.woff2   # 荆霄鹏行楷字体（2.5MB）
│   └── images/teacher/
│       ├── hand/                # 手写范本图片
│       └── annot/               # 标注范本图片
├── tools/                       # 脚手架（不部署）
│   ├── build_dict.py            # 词库生成脚本
│   ├── download_from_feishu.py  # 飞书批量下载脚本
│   └── 荆霄鹏行楷.ttf           # 原始字体备份（7.2MB，gitignored）
├── CLAUDE.md                    # 本文件
└── .gitignore
```

## 5. 图片命名规范（关键！）

- **只能用纯汉字**，不能带标点、空格、数字
- 词组 = 文件名（如 `优秀.png`、`政策.png`）
- `build_dict.py` 会过滤掉文件名中的非汉字字符
- 同一名称必须同时存在于 `hand/` 和 `annot/` 才能完整展示
- 当前 hand/ 约 560 张，annot/ 约 557 张（有 3 个词组缺少标注版）

## 6. 词库生成

```bash
cd /Users/zhengxiaoling/Projects/Project005-Calligraphy/calligraphy-jizi
python3 tools/build_dict.py
```

- 从 `images/teacher/hand/` 和 `images/teacher/annot/` 扫描文件名
- 过滤出纯汉字词组
- 输出到 `js/words.js`：`const WORDS = [...]`

## 7. 飞书批量下载脚本

脚本：`tools/download_from_feishu.py`

**使用流程：**
1. 先用 `lark-cli docs +fetch` 获取飞书文档内容，保存到 `/tmp/doc_content.json`
2. 运行 `python3 tools/download_from_feishu.py`

**脚本逻辑：**
- 解析文档中的 `<h3>` 标题作为词组名
- 提取标题下的 `<img>` 标签（按出现顺序）
- **第1张图 → hand/，第2张图 → annot/**
- 用 `lark-cli docs +media-download` 下载图片（必须在 skill 目录下运行）

**已知坑（必须人工复核）：**
- ⚠️ **约 50% 会归错类**。飞书文档有时列顺序不一致（有空列），脚本按出现顺序取图，容易错位
- 下载后务必抽查 hand/ 和 annot/ 的内容是否正确
- 词组名若带数字前缀（如 `1.南瓜`），脚本会自动去除

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

## 9. 代码关键约定

| 约定 | 说明 |
|------|------|
| 历史记录 key | `jizi_search_history_jizi` / `jizi_search_history_zizu`（独立存储） |
| 历史上限 | `MAX_HISTORY = 20` |
| IME 处理 | `compositionstart`/`compositionend` 防止拼音输入时误触发搜索 |
| 字组自动搜索 | `zizu` 模式下，输入有效汉字后自动触发 `searchZizu()` |
| 图片加载 | `loadImage()` 支持 `.png` → `.jpg` → `.jpeg` 自动回退 |
| 集字网格 | 每行 20 格，移动端降至 8 格（`@media max-width: 600px`） |
| 多字字号 | `multi-char` / `len-3` / `len-4` 类控制字组模式下的字体大小 |

## 10. 已知问题 / 待办清单

| 优先级 | 需求 | 说明 |
|--------|------|------|
| ✅ | **域名绑定** | yaoguaijizi.com 和 www.yaoguaijizi.com 已绑定 Vercel |
| 🟡 中 | **管理员入口** | 网页端密码保护，一键扫描目录重新生成 words.js |
| 🟡 中 | **学员权限** | 手机号白名单系统，首次访问需验证 |
| 🟢 低 | **批量上传** | 网页端拖拽上传图片，自动归类并更新词典 |
| 🟢 低 | **字体子集化** | 当前 WOFF2 2.5MB，可进一步子集化 |
| 🟢 低 | **缺失标注** | hand/ 比 annot/ 多 3 张，需补充缺失的标注版图片 |

## 11. Git 版本历史

```
f8038c3  feat: 搜索框添加一键清除按钮
c205064  fix: 删除多余文件，更新词库为557词
90fc698  fix: 模式选择页整体上移
71aca4c  demo_1.1: 批量导入飞书文档手写/标注范字（~558词组）
8daf9fd  demo_1.0: 集字站基础版本
```

## 12. 如何恢复上下文（给 AI 的指令）

新对话进入本项目时：

1. **读取本文件** `CLAUDE.md`
2. 运行 `git log --oneline` 确认最新提交
3. 检查 `images/teacher/hand/` 和 `annot/` 的文件数量
4. 读取 `js/words.js` 开头确认词库规模
5. 询问用户本次想修改什么

---

*最后更新：2026-05-15*
