# 硅基流动 (SiliconFlow) AI 对接完成报告

## 📅 时间
2026年4月17日

## ✅ 完成内容

### 1. 新增硅基流动客户端服务
**文件**: `server/src/modules/ai/siliconflow.service.ts`

- **API地址**: `https://api.siliconflow.cn/v1/chat/completions`
- **OpenAI兼容接口**: 使用标准HTTP POST请求
- **超时处理**: 60秒超时保护
- **重试机制**: 自动错误处理和日志记录

### 2. AI配置系统
**文件**: `server/src/modules/ai/ai-config.ts`

- **多提供商支持**: 硅基流动、Coze、OpenAI
- **环境变量配置**: 通过 `.env` 文件配置
- **配置验证**: 自动检查配置完整性
- **模型推荐**: 根据用途推荐最佳模型

### 3. 统一AI服务
**文件**: `server/src/modules/ai/unified-ai.service.ts`

- **自动路由**: 根据配置选择AI提供商
- **业务封装**: 提供 `generateWelcome`、`generateThanks` 等业务方法
- **降级策略**: 视觉模型失败时自动降级到文本模型
- **错误处理**: 统一的错误返回格式

### 4. 更新控制器
**文件**: `server/src/modules/ai/ai.controller.ts`

- **依赖注入**: 使用 `UnifiedAIService`
- **新增状态接口**: `/ai/status` 查看当前AI配置
- **新增模型列表**: `/ai/models` 获取可用模型

### 5. 环境变量配置示例
**文件**: `server/.env.siliconflow.example`

```bash
# AI服务提供商配置
AI_PROVIDER=siliconflow

# 硅基流动配置
SILICONFLOW_API_KEY=your-api-key-here
SILICONFLOW_TEXT_MODEL=Qwen/Qwen2.5-7B-Instruct
SILICONFLOW_VISION_MODEL=Qwen/Qwen2-VL-7B-Instruct
SILICONFLOW_TEMPERATURE=0.7
SILICONFLOW_MAX_TOKENS=2000
```

---

## 🎯 支持的模型

### 文本生成模型
| 模型 | 说明 | 特点 |
|------|------|------|
| `Qwen/Qwen2.5-7B-Instruct` | 通义千问7B | 免费、速度快 |
| `Qwen/Qwen2.5-32B-Instruct` | 通义千问32B | 中等规模 |
| `Qwen/Qwen2.5-72B-Instruct` | 通义千问72B | 强大、较慢 |
| `deepseek-ai/DeepSeek-V2.5` | DeepSeek V2.5 | 高性价比 |
| `deepseek-ai/DeepSeek-R1` | DeepSeek R1 | 带深度思考能力 |
| `THUDM/glm-4-9b-chat` | 智谱GLM-4-9B | 中文优化 |

### 视觉模型
| 模型 | 说明 | 特点 |
|------|------|------|
| `Qwen/Qwen2-VL-7B-Instruct` | Qwen VL 7B | 免费、中文好 |
| `Qwen/Qwen2-VL-72B-Instruct` | Qwen VL 72B | 强大 |
| `THUDM/glm-4v-9b` | GLM-4V | 中文优化 |

---

## 🔧 使用方法

### 1. 配置API密钥

```bash
# 复制配置示例
cp .env.siliconflow.example .env

# 编辑 .env 文件，填入您的API密钥
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxx
```

### 2. 获取API密钥

1. 访问 [硅基流动官网](https://cloud.siliconflow.cn)
2. 注册账号（手机号/GitHub/Google）
3. 获取API密钥：[创建API密钥](https://cloud.siliconflow.cn/api/keys)
4. 复制模型名称：[模型广场](https://cloud.siliconflow.cn/models)

**邀请码**: `8EGcP8PT` (注册送2000万tokens)

### 3. 启动服务

```bash
cd server
pnpm install
pnpm build
pnpm start:dev
```

---

## 📊 API接口

### 查看AI服务状态
```
GET /ai/status
```

响应:
```json
{
  "code": 200,
  "data": {
    "provider": "siliconflow",
    "configured": true,
    "models": [...]
  }
}
```

### 获取可用模型列表
```
GET /ai/models
```

### 生成祝福语
```
POST /ai/generate-blessing
{
  "banquetType": "婚宴",
  "banquetName": "张三李四婚礼",
  "guestName": "王五"
}
```

### 生成欢迎词
```
POST /ai/generate-welcome
{
  "banquetType": "婚宴",
  "banquetName": "张三李四婚礼",
  "photos": ["https://example.com/photo.jpg"]  // 可选，有照片会使用视觉模型
}
```

### 生成感谢词
```
POST /ai/generate-thanks
{
  "banquetType": "婚宴",
  "banquetName": "张三李四婚礼",
  "photos": ["https://example.com/photo.jpg"]  // 可选
}
```

### 重新生成卡片
```
POST /ai/regenerate-card
{
  "banquetId": "xxx",
  "type": "welcome",
  "banquetType": "婚宴",
  "banquetName": "张三李四婚礼",
  "photos": ["url1", "url2"]
}
```

---

## 💡 优势对比

| 对比项 | 豆包(Coze) | 硅基流动 |
|--------|-----------|----------|
| **注册方式** | 需要企业认证 | 手机号即可 |
| **免费额度** | 有限 | 注册送2000万tokens |
| **模型选择** | 仅豆包系 | 10+种开源模型 |
| **价格** | 较高 | 高性价比 |
| **视觉模型** | 豆包视觉 | Qwen VL / GLM-4V |
| **中文支持** | 一般 | Qwen/GLM优秀 |

---

## 🚀 下一步

1. **配置API密钥**: 在 `.env` 中设置 `SILICONFLOW_API_KEY`
2. **测试功能**: 启动服务后测试各接口
3. **性能监控**: 观察API调用延迟和成本
4. **模型调优**: 根据效果调整 `temperature` 和 `max_tokens`

---

## 📝 注意事项

1. **API密钥安全**: 不要将 `.env` 文件提交到版本控制
2. **额度监控**: 定期检查硅基流动平台的用量
3. **错误处理**: 视觉模型调用失败时会自动降级到文本模型
4. **模型选择**: 免费模型可能有限速，建议生产环境使用付费模型
