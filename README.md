# AI 英语卡(学AI必备英语)

给「要学 AI 的国人」做的轻量英语术语学习小程序:**每天 5 分钟,用「原意 vs AI 语境义」对照,把读文档、写 prompt 时被卡住的英文词啃下来。**

## ✨ 核心特色

- **双栏对照**:每张词卡同时给出「日常原意」和「AI 语境义」——`attention` 既是"注意力"也是"注意力机制",`token` 既是"代币"也是"词元",对照着记才记得牢。
- **闪卡 + 间隔重复**:简化版 SM-2 算法,答对隔天翻倍,答错当天重学,符合记忆曲线。
- **轻量自测**:选择题双向考察(给单词选 AI 义 / 给 AI 义选单词)。
- **零后端**:词库静态打包、进度存本地,离线可用、无账号无成本。
- **跨端**:uni-app(Vue3+Vite)一套代码,微信小程序 + H5 双端。

## 🛠 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | uni-app (Vue3 + Vite) |
| UI | uView Plus + 自定义深色主题 |
| 数据 | `src/data/words.js`(词库,静态模块)+ uni Storage(用户进度) |
| 复习算法 | 简化 SM-2(`src/utils/srs.js`) |

## 📁 目录结构

```
ai-english-miniapp/
├── src/
│   ├── main.js                # 入口(挂载 uView Plus)
│   ├── App.vue                # 全局样式(深色主题)
│   ├── pages.json             # 页面路由 + easycom 配置
│   ├── manifest.json          # 应用配置(微信 AppID 留空)
│   ├── data/words.js          # ★ 词库数据(生成流水线产出)
│   ├── utils/
│   │   ├── srs.js             # 间隔重复算法
│   │   └── storage.js         # 本地存储封装
│   ├── components/
│   │   └── WordCard.vue       # 双栏词卡组件(正/背/详情三模式)
│   └── pages/
│       ├── index/             # 首页(今日复习/入口/主题)
│       ├── review/            # 复习(闪卡翻转 + 四档评分)
│       ├── quiz/              # 自测(选择题)
│       ├── progress/          # 进度(统计/主题覆盖/已学词)
│       ├── search/            # 搜索
│       └── topic/             # 按主题浏览词卡
├── scripts/                   # ★ AI 词库生成流水线
│   ├── generate_words.py      # 生成 → 双AI互审 → 结构化校验 → 写回
│   ├── install_deps.py        # 应急:Python 单进程执行 npm install(绕过 shell 故障)
│   ├── fix_packages.py        # 应急:修复被杀毒/安全机制弄坏的依赖包
│   ├── config.example.json    # LLM 接口配置模板
│   └── prompts/               # 生成/审校提示词模板
└── package.json
```

## 🚀 本地运行

```bash
npm install

# H5(浏览器预览)
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin
# 然后用「微信开发者工具」打开 dist/dev/mp-weixin 目录即可
# (需先在 manifest.json 的 mp-weixin.appid 填自己的 AppID,开发可用测试号)
```

> 开发期暂不注册 AppID 也能本地预览 H5;小程序提审前再补 AppID。

> 💡 **网络慢 / 依赖损坏的应急方案**(本机实测有效):
> 1. 慢网络走国内镜像:`npm install --registry=https://registry.npmmirror.com --legacy-peer-deps`
> 2. 杀毒软件/安全机制可能干扰 npm 解压,导致个别包缺文件(如 `@rollup/pluginutils` 缺 `dist/cjs`)。
>    运行 `python scripts/fix_packages.py` 自动扫描并用手动解压修复损坏包。
> 3. shell 故障时用 `python scripts/install_deps.py --online` 以 Python 单进程执行 npm install(带重试)。

## 🎴 词库结构(每条词卡)

```js
{
  "id": "attention",            // 自动生成,勿手写
  "word": "attention",          // 单词/短语
  "phonetic": "/əˈtenʃn/",      // 音标
  "pos": "n.",                  // 词性
  "originMeaning": "注意力；关注",          // ★ 日常原意
  "aiMeaning": "注意力机制：…",             // ★ AI 语境义
  "example": "The self-attention…",        // 英文例句(AI 语境)
  "exampleZh": "自注意力层…",               // 例句翻译
  "memoryTip": "日常是…，AI 里是…",        // 记忆口诀
  "topicId": "model-architecture",        // 所属主题
  "level": 1                      // 难度 1-3
}
```

## 🔄 词库扩展(扩到 200 词)

词库由 `scripts/` 流水线产出,流程:**AI 批量生成 → 双 AI 互审(审校角色纠错)→ 结构化校验(字段/去重/难度)→ 写回 words.js**。

```bash
# 1. 配置 LLM 接口(任意 OpenAI 兼容服务)
cp scripts/config.example.json scripts/config.json
#    编辑 config.json,填 base_url / api_key / model

# 2. 为新主题生成 25 词(主题需先在 words.js 的 topics 里注册)
python scripts/generate_words.py --topic "训练与优化" --count 25

# 3. 为所有已注册主题各生成 25 词
python scripts/generate_words.py --topic all --count 25

# 4. 只校验现有词库(不调 AI)
python scripts/generate_words.py validate
```

> ⚠️ 术语准确性是生命线:流水线有双 AI 互审,但仍建议人工抽检高频核心词。

## 🗺 路线图

- **v1.1**:发音(TTS,微信同声传译插件)、生词本、打卡分享
- **v1.2**:登录 + 云同步(进度跨设备)
- **v2.0**:阅读精读(论文摘要划词注释)、写作训练(写 prompt / 提 issue)
- **v2.1**:AI 对话陪练(用英语聊 AI 话题,实时大模型)

## 📝 产品决策摘要(2026-08-12 确认)

| 决策点 | 结论 |
| --- | --- |
| 平台 | uni-app 跨端:微信小程序 + H5 |
| 用户 | 转行 AI 工程师 + 需懂 AI 的产品/运营 |
| 内容 | AI/ML 术语词库,双栏对照,预留阅读/写作接口 |
| 学习形式 | 闪卡 + 简化间隔重复 + 选择题自测 |
| MVP 范围 | 词卡/复习/自测/进度/分类/搜索;不做登录/发音/AI 对话 |
| 存储 | 词库静态打包 + 进度本地 Storage,预留云端接口 |
| 上线 | 开发期本地预览,成型后注册 AppID 提审;H5 用 Vercel/Netlify |
