<div align="center">

# AI 英语卡 · 学 AI 必备英语

给「要学 AI 的国人」做的轻量英语术语学习小程序：**每天 5 分钟，用「原意 vs AI 语境义」对照**，把读文档、写 prompt 时被卡住的英文词啃下来。

[![Release](https://img.shields.io/github/v/release/FaN648512/ai-english?style=flat-square)](https://github.com/FaN648512/ai-english/releases)
[![License](https://img.shields.io/github/license/FaN648512/ai-english?style=flat-square)](LICENSE)
[![Stars](https://img.shields.io/github/stars/FaN648512/ai-english?style=flat-square)](https://github.com/FaN648512/ai-english)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?style=flat-square)](https://vuejs.org)
[![uni-app](https://img.shields.io/badge/uni--app-跨端-3ce0ff?style=flat-square)](https://uniapp.dcloud.net.cn)

**🌐 H5 在线体验**：https://ai-english.pages.dev

</div>

---

## 💡 为什么选择 AI 英语卡？

现有的单词记忆工具，要么依赖在线服务（Anki 同步要账号、Quizlet 免费功能有限），要么需要复杂的插件配置（Obsidian 学习曲线陡峭）。而市面上几乎没有一款工具，专门解决**「AI 语境下的英语术语」**这个痛点——`attention` 既是"注意力"也是"注意力机制"，`token` 既是"代币"也是"词元"。

AI 英语卡把「日常原意 + AI 语境义」的双栏对照记忆、间隔重复复习和跨端体验，封装进一个**零后端、开箱即用**的小程序/网页里：无需账号、无需服务器、离线可用，学完即走。

## 🏆 核心优势

| 维度 | **AI 英语卡** | Anki | Quizlet | Obsidian |
|------|:---:|:---:|:---:|:---:|
| AI 语境学习 | ✅ 双栏对照内置 | 需手动配置 | 基础释义为主 | 需手动构建 |
| 学习引擎 | ✅ 间隔重复 | ✅ 强 SM-2 | ⚠️ 有限 | 需插件 |
| 部署方式 | ✅ 零后端即用 | 需同步账号 | 在线服务 | 本地 + 插件 |
| 跨端支持 | ✅ H5 + 小程序 | 全平台但复杂 | 全平台 | 全平台 |
| 上手成本 | ✅ 秒开 | 中 | 低 | 高 |

## ✨ 核心亮点

- **📖 双栏对照记忆** — 每张词卡同时给出「日常原意」和「AI 语境义」，解决"背了单词却看不懂 AI 文档"的痛点，对照着记才记得牢
- **🔄 间隔重复引擎** — 简化版 SM-2 算法，答对隔天翻倍、答错当天重学，贴合遗忘曲线，告别死记硬背
- **🎯 轻量自测** — 中文题目 + 英文选项，从你学过的词里出题，随时检验掌握度
- **📊 进度可视化** — 学习量、掌握度、复习次数统计，按主题查看学习状态
- **🚫 零后端架构** — 词库静态打包、进度存本地，无账号无成本，离线可用
- **📱 跨端运行** — uni-app（Vue3 + Vite）一套代码，微信小程序 + H5 双端

## 🎨 界面设计

冷静近黑 + 电光青，简洁前卫的技术感 UI。

### 设计令牌（Design Tokens）

| 角色 | 色值 | 用途 |
|---|---|---|
| 背景 | `#06080E` | 页面主背景（近黑，非纯黑，护眼且有深度） |
| 表面 | `#0E1420 → #0B1019` | 卡片渐变表面 |
| 边框 | `rgba(148,163,184,.12)` | 极细卡片边框 |
| 主文字 | `#E8EEF7` | 标题与正文 |
| 次文字 | `#8B96AB` | 辅助说明 |
| 弱文字 | `#5B6472` | 小节标签（kicker） |
| 强调色 | `#3CE0FF` | 电光青，单强调色，用于按钮/高亮/进度 |
| 强调底 | `rgba(60,224,255,.08)` | 标签 pill 背景 |
| 微光 | `rgba(60,224,255,.02)` | 卡片边缘微光，无重阴影 |

### 设计原则

1. **近黑画布，而非纯黑** — `#06080E` 带微弱蓝调，营造深度、降低长时间学习眼疲劳
2. **单强调色，极致冲击** — 全站只用一个电光青 `#3CE0FF`，克制使用、高对比呈现
3. **等宽技术美学** — SF Mono 等宽字体贯穿单词/音标/标签，营造终端与代码编辑器氛围
4. **极简卡片系统** — 细线边框 + 微光，无重阴影，内容即视觉
5. **统一动效体系** — 页面入场（0.34s）、元素错落渐入（0.42s 错峰）、进度条生长（0.8s）、触摸反馈（scale 0.985），全程一致不炫技

## 🛠 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | uni-app (Vue3 + Vite) |
| UI | uView Plus + 自定义深色主题 |
| 数据 | `src/data/words.js`（词库，静态模块）+ uni Storage（用户进度） |
| 复习算法 | 简化 SM-2（`src/utils/srs.js`） |
| 部署 | Cloudflare Pages（H5 自动构建） |

## 🚀 快速开始

```bash
npm install

# H5（浏览器预览）
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin
# 用「微信开发者工具」打开 dist/dev/mp-weixin 目录即可
# （需在 manifest.json 的 mp-weixin.appid 填自己的 AppID，开发可用测试号）
```

> 💡 **网络慢 / 依赖损坏的应急方案**（本机实测有效）：
> 1. 慢网络走国内镜像：`npm install --registry=https://registry.npmmirror.com --legacy-peer-deps`
> 2. 杀毒软件/安全机制可能干扰 npm 解压，导致个别包缺文件（如 `@rollup/pluginutils` 缺 `dist/cjs`）。运行 `python scripts/fix_packages.py` 自动扫描并修复损坏包。
> 3. shell 故障时用 `python scripts/install_deps.py --online` 以 Python 单进程执行 npm install（带重试）。

## 📁 目录结构

```
ai-english-miniapp/
├── src/
│   ├── main.js                # 入口（挂载 uView Plus）
│   ├── App.vue                # 全局样式（深色主题 + 动效系统）
│   ├── pages.json             # 页面路由 + easycom 配置
│   ├── manifest.json          # 应用配置（微信 AppID 留空）
│   ├── data/words.js          # ★ 词库数据（生成流水线产出）
│   ├── utils/
│   │   ├── srs.js             # 间隔重复算法
│   │   └── storage.js         # 本地存储封装
│   ├── components/
│   │   └── WordCard.vue       # 词卡组件（正/背/详情三模式）
│   └── pages/
│       ├── index/             # 首页（今日复习/入口/主题）
│       ├── review/            # 复习（闪卡 + 四档评分）
│       ├── quiz/              # 自测（选择题）
│       ├── progress/          # 进度（统计/主题覆盖/已学词）
│       ├── search/            # 搜索
│       └── topic/             # 按主题浏览词卡
├── scripts/                   # ★ AI 词库生成流水线
│   ├── generate_words.py      # 生成 → 双AI互审 → 结构化校验 → 写回
│   ├── install_deps.py        # 应急：Python 单进程执行 npm install
│   ├── fix_packages.py        # 应急：修复被安全机制弄坏的依赖包
│   ├── config.example.json    # LLM 接口配置模板
│   └── prompts/               # 生成/审校提示词模板
├── release/                   # 发行版打包产物（GitHub Releases 附件）
└── package.json
```

## 🎴 词库结构（每条词卡）

```js
{
  "id": "attention",            // 自动生成，勿手写
  "word": "attention",          // 单词/短语
  "phonetic": "/əˈtenʃn/",      // 音标
  "pos": "n.",                  // 词性
  "originMeaning": "注意力；关注",          // ★ 日常原意
  "aiMeaning": "注意力机制：…",             // ★ AI 语境义
  "example": "The self-attention…",        // 英文例句（AI 语境）
  "exampleZh": "自注意力层…",               // 例句翻译
  "memoryTip": "日常是…，AI 里是…",        // 记忆口诀
  "topicId": "model-architecture",        // 所属主题
  "level": 1                      // 难度 1-3
}
```

## 🔄 词库扩展（扩到 200 词）

词库由 `scripts/` 流水线产出，流程：**AI 批量生成 → 双 AI 互审（审校角色纠错）→ 结构化校验（字段/去重/难度）→ 写回 words.js**。

```bash
# 1. 配置 LLM 接口（任意 OpenAI 兼容服务）
cp scripts/config.example.json scripts/config.json
#    编辑 config.json，填 base_url / api_key / model

# 2. 为新主题生成 25 词（主题需先在 words.js 的 topics 里注册）
python scripts/generate_words.py --topic "训练与优化" --count 25

# 3. 为所有已注册主题各生成 25 词
python scripts/generate_words.py --topic all --count 25

# 4. 只校验现有词库（不调 AI）
python scripts/generate_words.py validate
```

> ⚠️ 术语准确性是生命线：流水线有双 AI 互审，但仍建议人工抽检高频核心词。

## 🗺 路线图

- **v1.1**：发音（TTS，微信同声传译插件）、生词本、打卡分享
- **v1.2**：登录 + 云同步（进度跨设备）
- **v2.0**：阅读精读（论文摘要划词注释）、写作训练（写 prompt / 提 issue）
- **v2.1**：AI 对话陪练（用英语聊 AI 话题，实时大模型）

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request：

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/xxx`
3. 提交改动：`git commit -m "feat: xxx"`
4. 推送到分支：`git push origin feature/xxx`
5. 提交 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 开源协议。

## 🙏 致谢

感谢 [uni-app](https://uniapp.dcloud.net.cn/)、[Vue 3](https://vuejs.org/)、[uView Plus](https://uiadmin.net/uview-plus/) 以及所有贡献者。
