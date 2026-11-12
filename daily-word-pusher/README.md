# 每日单词

每天固定时间把单词通过飞书群机器人推送，卡片里每个单词默认收起，点一下才展开中文释义——交互完全在飞书客户端内完成，不需要公网地址。词库在网页里上传维护。

## 功能

- **定时推送**：内置 cron（默认每天 08:00，Asia/Shanghai），推送时间与每次数量在网页「推送设置」里随时可改，保存即生效。
- **轮次规则**：新上传的词优先推送 → 本轮没推过的词依次推送 → 全库轮完一遍自动进入下一轮继续推，不会断档。
- **领域释义优先**：DeepSeek 按固定 Prompt 输出音标、词性、适用领域、释义与例句，技术义排在通用义之前。
- **自定义释义**：网页里可对任意单词手动填写 / 修改释义，保存后优先于 AI 释义使用（支持多行）。
- **词库管理**：批量粘贴或上传 txt/csv，自动去重，可在网页删除、重新翻译、按状态筛选。
- **飞书折叠卡片**：每个单词是一个折叠面板，默认只显示英文，点击在客户端本地展开释义，无需回调服务与公网地址。
- **网页互动页（可选）**：配置 `PUBLIC_BASE_URL` 后，卡片底部会多一个「网页版」按钮，打开 `/d/<token>` 可看到逐词浮现、点击翻开的 H5 页面。
- **推送通道**：飞书群机器人（默认优先），PushPlus、企业微信群机器人为备选；消息超长自动拆分或分块。

## 快速开始（本地）

```bash
npm install
cp .env.example .env     # 填入 ADMIN_PASSWORD、FEISHU_WEBHOOK_URL、PUBLIC_BASE_URL
npm start
```

打开 `http://localhost:3000`，用 `ADMIN_PASSWORD` 登录。没设置密码时启动日志里会打印一个随机密码。

也可以不填 `.env`，直接用环境变量启动：

```bash
ADMIN_PASSWORD=你的密码 \
FEISHU_WEBHOOK_URL='https://open.feishu.cn/open-apis/bot/v2/hook/xxx' \
PUBLIC_BASE_URL=https://你的域名 \
DEEPSEEK_API_KEY=sk-xxx \
npm start
```

## 部署方式

### 方案 A：GitHub Actions（推荐，无需服务器）

仓库自带 [.github/workflows/daily-push.yml](file:///workspace/.github/workflows/daily-push.yml)，每天定时跑 `node src/push-once.js` 并推一张飞书卡片，跑完把轮次状态提交回 `data/db.json`。不需要公网地址，也不需要你开机。

1. 仓库 **Settings → Secrets and variables → Actions** 添加：
   - `FEISHU_WEBHOOK_URL`（必填）
   - `FEISHU_SECRET`（机器人开了签名校验才需要）
   - `DEEPSEEK_API_KEY`（可选，不用自动释义可不填）
2. **Actions** 页启用工作流，点一次 `Run workflow` 验证。
3. 时间在 workflow 的 `cron` 里改，注意 GitHub 只认 **UTC**（北京时间 08:00 = `0 0 * * *`）。
4. 本地用管理页改完词库后，把 `data/db.json` 提交推送，Actions 就会按新词库继续轮次。

> 注意：GitHub 的定时任务在仓库长期无提交后会被自动停用；每天推送本身会产生一次提交，可以维持活跃。

### 方案 B：常驻服务（Render / Railway / VPS）

词库保存在 `DATA_DIR` 下的 `db.json`，**必须挂载持久磁盘**，否则重新部署会丢词库。

Render：New → Blueprint，选择仓库，自动读取 `render.yaml`，填写 `FEISHU_WEBHOOK_URL` 即可（需要 Starter 及以上套餐才能常驻并挂盘）。

Docker：

```bash
docker build -t daily-word .
docker run -d --name daily-word -p 3000:3000 \
  -v /srv/daily-word:/app/data \
  -e ADMIN_PASSWORD=你的密码 \
  -e FEISHU_WEBHOOK_URL='...' \
  daily-word
```

## 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `ADMIN_PASSWORD` | 建议 | 网页登录密码；不设置时每次启动随机生成 |
| `FEISHU_WEBHOOK_URL` | 是 | 飞书群自定义机器人 Webhook，用于推送卡片 |
| `FEISHU_SECRET` | 否 | 机器人开启「签名校验」时填写 |
| `PUBLIC_BASE_URL` | 否 | 站点公网地址；配置后卡片底部会多一个「网页版」按钮，仅影响附加链接，不影响卡片内交互 |
| `PUSHPLUS_TOKEN` | 否 | PushPlus Token，未配置飞书时作为备选通道 |
| `PUSHPLUS_BASE_URL` | 否 | 默认 `https://www.pushplus.plus/send` |
| `WECOM_WEBHOOK_URL` | 否 | 企业微信群机器人 Webhook，未配置 PushPlus 时作为备选通道 |
| `DEEPSEEK_API_KEY` | 否 | DeepSeek API Key；不配置时需手动填写释义 |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `WORDS_PER_PUSH` | 否 | 每次推送单词数，默认 5（网页「推送设置」可改，保存后优先生效） |
| `PUSH_CRON` | 否 | 默认 `0 8 * * *`（网页「推送设置」可改，保存后优先生效） |
| `PUSH_TIMEZONE` | 否 | 默认 `Asia/Shanghai` |
| `CRON_SECRET` | 否 | 外部定时器调用 `/api/cron/push` 的密钥 |
| `SCHEDULER_ENABLED` | 否 | 设为 `false` 关闭内置定时器 |
| `PORT` / `DATA_DIR` | 否 | 默认 `3000` / `./data` |

### 获取飞书 Webhook

飞书群 → 右上角设置 → 群机器人 → 添加机器人 → 自定义机器人 → 复制 Webhook 地址。若勾选「签名校验」，把密钥填到 `FEISHU_SECRET`。

### 获取 PushPlus Token（备选）

打开 [pushplus.plus](https://www.pushplus.plus/) → 微信扫码登录 → 「一对一推送」→ 复制 Token 填入 `PUSHPLUS_TOKEN`。关注「pushplus 推送加」公众号即可在微信里收到消息。

### 获取企业微信 Webhook（备选）

企业微信群 → 右上角 `…` → 群机器人 → 添加机器人 → 复制 Webhook 地址。个人使用时，在微信里关注「企业微信」并加入该群即可收到推送。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/login` | 登录，body：`{"password":"..."}` |
| `POST` | `/api/words` | 添加单词，body：`{"text":"API\nlatency"}` |
| `PATCH` | `/api/words/:id` | 保存自定义释义，body：`{"customMeaning":"..."}` |
| `PATCH` | `/api/settings` | 保存推送设置，body：`{"pushTime":"08:30","wordsPerPush":5}` |
| `GET` | `/api/preview` | 预览本轮将推送的单词（不改变轮次） |
| `POST` | `/api/push` | 立即推送并推进轮次 |
| `POST` | `/api/cron/push` | 外部定时器触发，需请求头 `x-cron-secret` |
| `GET` | `/api/daily/:token` | 互动页数据（公开，token 来自推送链接） |

## 测试

```bash
npm test
```

覆盖词库解析去重、轮次循环、新词优先、词库不足一批、消息超长分块等逻辑。
