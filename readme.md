# CF-TTS Proxy Server (v1.2)

一个部署在 Cloudflare Pages 上的高性能文本转语音（TTS）代理服务，将微软 Edge TTS 封装成兼容 OpenAI API 的接口，同时支持 Docker 自托管部署。

**项目特点**: 单文件部署，内置完整 WebUI 测试界面与 TTS 服务。

## ✨ 主要特性

- **OpenAI 兼容**: 完全模拟 OpenAI 的 `/v1/audio/speech` 接口，可直接被 OpenAI SDK 或任何现有工具调用
- **高质量音色**: 利用微软 Edge TTS 自然神经网络语音，支持 6 种 OpenAI 兼容音色 + 丰富的微软原生音色
- **流式播放**: 支持流式和标准两种响应模式，流式可显著降低长文本首次播放延迟
- **智能文本清理**: 自动处理 Markdown、Emoji、URL、引用标记等，支持自定义关键词过滤
- **智能历史记录**: 支持两种保存模式
  - **音频+文本保存**: 完整音频文件存储，速度快，适合有声书制作
  - **文本+流式播放**: 仅保存文本，实时生成音频，不占存储空间
- **有声书功能**: 支持 Markdown 格式分享，自动优化 TTS 文本转换
- **跨设备分享**: 带密码保护的分享链接，可作为临时信息传递工具
- **安全访问**: API 密钥验证，确保服务安全
- **智能用户ID**: 基于部署域名自动生成唯一用户ID，避免多部署冲突
- **内置 WebUI**: 功能完整的测试界面，无需编程即可使用
- **多平台部署**: 支持 Cloudflare Pages、Docker (amd64/arm64) 两种部署方式

---

## 📦 版本更新

### v1.2 更新内容

- **智能用户ID**: 基于部署域名自动生成唯一的16位十六进制用户ID，避免多部署间冲突
- **Docker 支持**: 新增 Docker / Docker Compose 部署方式，支持自托管
- **Node.js 兼容**: 添加 `globalThis.crypto` polyfill 支持 Node.js 18 环境
- **文件 KV 存储**: Docker 环境下使用基于文件的 KV 存储实现

### v1.1 更新内容

- **历史存储**: 新增 KV 存储功能，自动保存 TTS 生成历史
- **分享功能**: 支持生成分享链接并设置密码保护
- **API 密钥验证**: 增强安全性
- **历史页面**: 新增 `/history` 页面查看和管理历史记录
- **音频分享页面**: 新增 `/share/{id}` 分享页面

---

## 🚀 快速部署

### 方式一：Cloudflare Pages（推荐）

#### 1. 创建项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 点击 **Workers 和 Pages** → **创建应用程序** → **Pages** → **上传资产**
3. 上传 [v1.2 Release](https://github.com/samni728/edgetts-cloudflare-workers-webui/releases/tag/v1.2)

> ⚠️ 在添加环境变量和 KV 后务必**重新部署一次**才能生效！

#### 2. 配置环境变量

1. 在项目 **设置** → **环境变量** 中添加：
   - **变量名**: `API_KEY`
   - **值**: 任意字符串（用于 API 访问控制）
   - **加密**: ✅ 勾选

![API_KEY 配置示例](screenshorts/API_KEY.jpg)

#### 3. 配置 KV 存储（历史/分享功能必需）

1. 进入 **Workers 和 Pages** → **KV** → **创建命名空间**
2. 命名空间名称：`TTS_HISTORY`，点击 **添加**

![KV 创建](screenshorts/kv_1.png)

3. 回到 Pages 项目 → **设置** → **函数** → **KV 命名空间绑定**
4. 添加绑定：
   - **变量名**: `TTS_HISTORY`
   - **KV 命名空间**: 选择刚创建的 `TTS_HISTORY`
5. 点击 **保存并部署**

![KV 绑定](screenshorts/kv_2.png)
![KV 配置](screenshorts/kv_3_TTS_HISTORY.jpg)
![KV 完成](screenshorts/kv_4.png)

---

### 方式二：Docker 部署

#### Docker Run

```bash
docker run -d \
  -p 3000:3000 \
  -e API_KEY=your-api-key-here \
  -v tts_data:/data \
  --name edgetts-webui \
  --restart unless-stopped \
  ghcr.io/ch6vip/edgetts-cloudflare-workers-webui:latest
```

自定义端口（例如映射到 8090）：

```bash
docker run -d \
  -p 8090:3000 \
  -e API_KEY=your-api-key-here \
  -v tts_data:/data \
  --name edgetts-webui \
  --restart unless-stopped \
  ghcr.io/ch6vip/edgetts-cloudflare-workers-webui:latest
```

#### Docker Compose

```yaml
services:
  cf-tts:
    image: ghcr.io/ch6vip/edgetts-cloudflare-workers-webui:latest
    ports:
      - "3000:3000"
    environment:
      - API_KEY=your-api-key-here
      - PORT=3000
      - DATA_DIR=/data/kv
    volumes:
      - tts_data:/data
    restart: unless-stopped

volumes:
  tts_data:
```

```bash
docker compose up -d
```

#### Docker 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `API_KEY` | 空 | API 访问密钥 |
| `PORT` | `3000` | 容器内监听端口 |
| `DATA_DIR` | `/data/kv` | KV 数据存储路径 |

部署完成后访问 `http://your-ip:3000` 即可使用。

---

## 📖 使用方法

### WebUI 界面

访问部署域名即可使用内置 WebUI 进行测试，支持以下页面：

| 页面 | 路径 | 说明 |
|------|------|------|
| 主界面 | `/` | TTS 生成与测试 |
| 历史记录 | `/history` | 查看和管理生成历史 |
| 分享页面 | `/share/{id}` | 查看分享的音频内容 |
| 播放页面 | `/play?text=...` | 直接播放指定文本 |

### API 调用

#### 基本示例

```bash
curl -X POST "https://your-domain.pages.dev/v1/audio/speech" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "voice": "shimmer",
    "input": "你好，世界！",
    "stream": false
  }' --output audio.mp3
```

#### 流式播放（长文本推荐）

```bash
curl -X POST "https://your-domain.pages.dev/v1/audio/speech" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "voice": "nova",
    "input": "这是一个长文本示例...",
    "stream": true
  }' --output streaming.mp3
```

#### 高级配置

```bash
curl -X POST "https://your-domain.pages.dev/v1/audio/speech" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "voice": "zh-CN-XiaoxiaoNeural",
    "input": "你好，这是使用高级配置的语音合成。",
    "style": "cheerful",
    "role": "YoungAdultFemale",
    "styleDegree": 1.5,
    "speed": 1.2,
    "pitch": 1.1
  }' --output advanced.mp3
```

---

## 🔧 API 参考

### 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/v1/audio/speech` | 生成语音（核心接口） |
| `GET` | `/v1/models` | 获取可用模型列表 |
| `POST` | `/api/save` | 保存生成的音频到历史 |
| `POST` | `/api/save-realtime` | 保存实时播放元数据 |
| `GET` | `/api/history` | 获取历史记录列表 |
| `POST` | `/api/set-password` | 设置分享密码 |
| `POST` | `/api/delete` | 删除历史记录 |
| `GET` | `/api/audio/{id}` | 获取存储的音频 |

### 请求参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `model` | string | `"tts-1"` | 模型 ID，支持 `tts-1`、`tts-1-hd` 等格式 |
| `input` | string | **必需** | 要转换的文本，支持任意长度 |
| `voice` | string | `"alloy"` | 音色，支持 OpenAI 格式或微软原生音色名 |
| `speed` | number | `1.0` | 语速 (0.25-2.0) |
| `pitch` | number | `1.0` | 音调 (0.5-1.5) |
| `style` | string | `"general"` | 语音风格 (cheerful, sad, angry 等) |
| `role` | string | `""` | 角色扮演 (Girl, Boy, YoungAdultFemale 等) |
| `styleDegree` | number | `1.0` | 风格强度 (0.01-2.0) |
| `stream` | boolean | `false` | 是否流式响应 |
| `cleaning_options` | object | `{...}` | 文本清理选项 |

### 文本清理选项

```json
{
  "remove_markdown": true,
  "remove_emoji": true,
  "remove_urls": true,
  "remove_line_breaks": false,
  "remove_citation_numbers": true,
  "custom_keywords": "关键词1,关键词2"
}
```

---

## 🗣️ 音色选择

### OpenAI 兼容音色

| 音色名 | 说明 | 对应微软音色 |
|--------|------|-------------|
| `shimmer` | 温柔女声 | zh-CN-XiaoxiaoNeural |
| `alloy` | 专业男声 | zh-CN-YunyangNeural |
| `fable` | 激情男声 | zh-CN-YunjianNeural |
| `onyx` | 活泼女声 | zh-CN-XiaoyiNeural |
| `nova` | 阳光男声 | zh-CN-YunxiNeural |
| `echo` | 东北女声 | zh-CN-liaoning-XiaobeiNeural |

### 微软原生音色

可直接使用微软原生音色名称，如 `zh-CN-XiaoxiaoNeural`、`zh-CN-YunxiNeural` 等。完整列表参见 [Edge TTS 音色列表](https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/language-support?tabs=tts#multilingual-voices)。

自定义音色映射可修改 `_worker.js` 中的 `OPENAI_VOICE_MAP` 对象，修改后需重新部署。

---

## 🏗️ 工作原理

```
客户端请求 (JSON)
     ↓
[API 密钥验证] → Bearer Token 检查
     ↓
[文本预处理] → 清理 Markdown、Emoji、URL 等
     ↓
[文本分块] → 按 2000 字符分块
     ↓
[获取端点] → 从微软 Translator API 请求
     ↓
[Token 管理] → 缓存与刷新 Token
     ↓
[构建 SSML] → 生成语音合成标记
     ↓
[TTS 请求] → 发送到微软 Edge TTS 服务
     ↓
[音频处理] → 拼接或流式传输音频块
     ↓
音频响应 (MP3)
```

---

## 📁 项目结构

| 文件 | 说明 |
|------|------|
| `_worker.js` | 核心服务文件，包含完整功能和内嵌 WebUI (约 3000 行) |
| `server.js` | Node.js HTTP 服务器封装（Docker 部署用） |
| `kv-store.js` | 基于文件的 KV 存储实现（Docker 部署用） |
| `Dockerfile` | Docker 镜像构建文件 |
| `docker-compose.yml` | Docker Compose 配置 |
| `screenshorts/` | 部署配置示例截图 |
| `tts_list/` | 完整音色列表参考文件 |

---

## ⚠️ 限制说明

- **字符数限制**: 单次请求约 12 万字符
- **免费套餐**: 适用于 Cloudflare 免费套餐
- **首次部署**: 可能需要等待 1-2 分钟初始化
- **存储限制**: 历史记录存储上限 1GB，超出后自动清理最旧记录

---

## 🌍 适用场景

- AI 助手语音输出
- OpenAI 兼容 TTS API 后端
- 有声书内容生成
- 浏览器端 AI 工具集成
- 内容创作自动化流水线

---

## 🔗 相关链接

- [GitHub 项目](https://github.com/samni728/edgetts-cloudflare-workers-webui)
- [v1.2 Release](https://github.com/samni728/edgetts-cloudflare-workers-webui/releases/tag/v1.2)
- [Edge TTS 音色列表](https://learn.microsoft.com/zh-cn/azure/ai-services/speech-service/language-support?tabs=tts#multilingual-voices)

---

## ⚖️ 使用声明

- 本服务基于微软 Edge TTS 技术，提供文本转语音功能
- 用户数据存储在用户自己的 Cloudflare KV 或本地 Docker 卷中，完全由用户控制
- 请遵守相关法律法规，不得用于违法用途
- 使用本服务即表示您同意相关条款
