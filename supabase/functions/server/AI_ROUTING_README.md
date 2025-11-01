# AI 智能路由系统

## ⚠️ 重要配置提示

**为了实现完整的自动路由功能，您需要配置所有模型的API密钥！**

如果某些API密钥未配置，系统会自动降级到 DeepSeek 模型，这可能会影响特定功能的使用体验：
- 缺少 `MOONSHOT_API_KEY` 将无法进行图片理解
- 缺少 `OPENAI_API_KEY` 将无法生成图像、处理视频或语音合成
- 缺少 `VOLCENGINE_ACCESS_KEY_ID` 和 `VOLCENGINE_SECRET_ACCESS_KEY` 将无法进行音频识别

**必需的API密钥列表：**
```bash
# 基础对话（必需）
DEEPSEEK_API_KEY=your_deepseek_api_key

# 图片理解（推荐）
MOONSHOT_API_KEY=your_moonshot_api_key
# 或者使用
KIMI_API_KEY=your_kimi_api_key

# 图像生成、视频处理、语音合成（推荐）
OPENAI_API_KEY=your_openai_api_key

# 音频识别（推荐）
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key
```

## 概述

AI对话页面采用智能路由系统，根据用户消息的类型和内容自动选择最合适的AI模型。用户无需手动选择模型，系统会透明地处理所有路由决策。

## 路由规则

### 1. 图像生成（最高优先级）
**检测方式：** 关键词匹配
**触发关键词：**
- 中文：生成图片、画一个、创建图像、绘制、帮我画、生成海报等
- 英文：generate image、create image、draw、make a picture等

**使用模型：** QELAR Engine (Nebulix-Vision 创作引擎)
**品牌身份：** QELAR-Create (Nebulix-Vision 创作模型)

**示例：**
```
用户：生成一张未来科技城市的图片
系统：自动使用 QELAR 引擎生成图像
```

### 2. 音频识别（第二优先级）
**检测方式：** 检测消息中是否包含音频文件附件
**支持格式：** MP3、WAV、OPUS、OGG、FLAC、M4A、AAC、AMR、WMA

**使用模型：** Volcengine Doubao ASR (豆包语音识别)
**品牌身份：** QORUS-ASR (Nebulix-Chat 语音识别模型)

**示例：**
```
用户：[上传一个音频文件] 
系统：
  1. 自动使用豆包ASR识别音频内容
  2. 将识别的文字作为用户问题
  3. 使用DeepSeek生成回答
```

**工作流程：**
1. 检测到音频文件上传
2. 调用豆包语音识别API转换音频为文字
3. 将识别结果标记为 `[语音识别] 文字内容`
4. 使用DeepSeek处理识别后的文字并生成回答

**降级策略：** 如果豆包API调用失败或未配置密钥，自动降级到DeepSeek处理（提示用户上传了音频但无法识别）

### 3. 图片理解
**检测方式：** 检测消息中是否包含图片附件
**支持格式：** JPG、PNG、GIF、WebP、BMP

**使用模型：** Kimi Vision (moonshot-v1-vision)
**品牌身份：** QELAR (Nebulix-Vision) - 量子视觉理解模型

**示例：**
```
用户：[上传一张图片] 这张图片里有什么？
系统：自动使用 Kimi Vision 分析图片
```

**降级策略：** 如果 MOONSHOT_API_KEY 未配置，自动降级到 DeepSeek

### 4. 视频相关
**检测方式：** 关键词匹配
**触发关键词：** 视频、影片、录像、动画、电影等

**使用模型：** OpenAI GPT-4o
**品牌身份：** QELAR-Motion (Nebulix-Vision 动态扩展)

**降级策略：** 如果 OPENAI_API_KEY 未配置，自动降级到 DeepSeek

### 5. 语音合成相关
**检测方式：** 关键词匹配
**触发关键词：** 语音合成、文本转语音、朗读、TTS等

**使用模型：** OpenAI GPT-4o-Audio-Preview
**品牌身份：** QORUS-Audio (Nebulix-Chat 语音扩展)

**降级策略：** 如果 OPENAI_API_KEY 未配置，自动降级到 DeepSeek

### 6. 文本对话（默认）
**使用场景：** 所有其他情况
**使用模型：** DeepSeek Chat
**品牌身份：** QORUS (Nebulix-Chat) - 量子语义对话模型

## 环境变量

系统需要以下API密钥：

- `DEEPSEEK_API_KEY` - 必需，用于文本对话
- `MOONSHOT_API_KEY` 或 `KIMI_API_KEY` - 可选，用于图片理解
- `OPENAI_API_KEY` - 可选，用于图像生成、视频和语音

## 代码结构

### 后端文件
- `ai-router.tsx` - 核心路由逻辑
- `index.tsx` - `/chat-smart` 端点和处理函数

### 前端文件
- `ChatPage.tsx` - 默认使用 `chat-smart` 端点

## 技术细节

### 消息格式化
不同的AI提供商需要不同的消息格式：

**DeepSeek / 标准文本：**
```typescript
{
  role: 'user',
  content: 'Hello'
}
```

**Kimi Vision / OpenAI Vision：**
```typescript
{
  role: 'user',
  content: [
    { type: 'text', text: 'What is in this image?' },
    { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,...' } }
  ]
}
```

### 系统提示词
所有模型都使用统一的 Nebulix 品牌身份，但会根据能力类型添加特定说明：
- `text` - QORUS 量子语义对话模型
- `vision` - QELAR 量子视觉理解模型
- `video` - QELAR-Motion 动态视觉扩展
- `audio` - QORUS-Audio 语音扩展
- `image-generation` - QELAR-Create 视觉创作模型

## 调试

服务器会记录详细的路由决策：
```
Smart routing decision: {
  provider: 'openai',
  model: 'qelar-engine',
  capability: 'image-generation',
  hasFiles: 0,
  messagePreview: '生成一张未来科技城市的图片'
}
```

## 用户体验

- ✅ 用户无需手动选择模型
- ✅ 所有模型切换对用户透明
- ✅ 统一的 Nebulix 品牌体验
- ✅ 自动降级策略确保服务可用性
- ✅ 友好的错误提示

## 模型扩展指南

### 如何添加新的AI模型

系统采用模块化设计，可以轻松扩展更多AI模型。以下是添加新模型的详细步骤：

#### 1. 基本扩展步骤

1. **在 `ai-router.tsx` 中添加检测逻辑**
2. **在 `index.tsx` 中添加处理函数**
3. **添加相应的 Nebulix 品牌身份**
4. **配置环境变量**

#### 2. 扩展示例

##### 豆包实时语音对话模型
```typescript
// 在 ai-router.tsx 中添加检测函数
function detectRealTimeVoice(content: string): boolean {
  const keywords = ['实时语音', '语音对话', '实时对话', 'real-time voice', 'voice chat'];
  return keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
}

// 在 routeToModel 函数中添加路由逻辑
if (detectRealTimeVoice(content)) {
  return {
    provider: 'volcengine',
    model: 'doubao-realtime-voice',
    capability: 'realtime-voice',
    systemPrompt: getNeblixSystemPrompt('realtime-voice')
  };
}

// 在 index.tsx 中添加处理函数
case 'volcengine':
  if (routeResult.model === 'doubao-realtime-voice') {
    // 调用豆包实时语音API
    const response = await fetch('https://openspeech.bytedance.com/api/v1/realtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('VOLCENGINE_REALTIME_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'doubao-realtime-voice',
        messages: formattedMessages
      })
    });
  }
  break;
```

**所需环境变量：**
```bash
VOLCENGINE_REALTIME_API_KEY=your_volcengine_realtime_api_key
```

##### Sora视频生成模型
```typescript
// 在 ai-router.tsx 中添加检测函数
function detectVideoGeneration(content: string): boolean {
  const keywords = ['生成视频', '创建视频', '制作视频', 'generate video', 'create video', 'make video'];
  return keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
}

// 在 routeToModel 函数中添加路由逻辑
if (detectVideoGeneration(content)) {
  return {
    provider: 'openai',
    model: 'sora',
    capability: 'video-generation',
    systemPrompt: getNeblixSystemPrompt('video-generation')
  };
}

// 在 index.tsx 中添加处理函数
case 'openai':
  if (routeResult.model === 'sora') {
    // 调用Sora视频生成API
    const response = await fetch('https://api.openai.com/v1/video/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sora',
        prompt: content,
        duration: 30
      })
    });
  }
  break;
```

##### Claude多轮对话模型
```typescript
// 在 ai-router.tsx 中添加检测函数
function detectComplexReasoning(content: string): boolean {
  const keywords = ['复杂推理', '深度分析', '逻辑推理', 'complex reasoning', 'deep analysis'];
  return keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
}

// 在 routeToModel 函数中添加路由逻辑
if (detectComplexReasoning(content)) {
  return {
    provider: 'anthropic',
    model: 'claude-3-opus',
    capability: 'complex-reasoning',
    systemPrompt: getNeblixSystemPrompt('reasoning')
  };
}

// 在 formatMessagesForProvider 函数中添加Anthropic格式支持
case 'anthropic':
  return messages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content
  }));
```

**所需环境变量：**
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key
```

##### Gemini多模态模型
```typescript
// 在 ai-router.tsx 中添加检测函数
function detectMultiModal(content: string, hasImages: boolean, hasAudio: boolean): boolean {
  return hasImages && hasAudio; // 同时包含图片和音频
}

// 在 routeToModel 函数中添加路由逻辑
if (detectMultiModal(content, hasImageFiles(files), hasAudioFiles(files))) {
  return {
    provider: 'google',
    model: 'gemini-pro-vision',
    capability: 'multimodal',
    systemPrompt: getNeblixSystemPrompt('multimodal')
  };
}
```

**所需环境变量：**
```bash
GOOGLE_API_KEY=your_google_api_key
```

#### 3. 品牌身份扩展

在 `getNeblixSystemPrompt` 函数中添加新的能力类型：

```typescript
function getNeblixSystemPrompt(capability: string): string {
  const baseIdentity = `你是 Nebulix AI Suite 的一部分...`;
  
  switch (capability) {
    case 'realtime-voice':
      return `${baseIdentity}
      
当前模式：QORUS-Live (Nebulix-Chat 实时语音模型)
- 专门用于实时语音对话
- 支持低延迟语音交互
- 提供自然的对话体验`;

    case 'video-generation':
      return `${baseIdentity}
      
当前模式：QELAR-Motion Pro (Nebulix-Vision 视频创作模型)
- 专门用于视频内容生成
- 支持多种视频风格和时长
- 提供高质量的视频输出`;

    case 'complex-reasoning':
      return `${baseIdentity}
      
当前模式：NOERIS-Deep (Nebulix-Reason 深度推理模型)
- 专门用于复杂逻辑推理
- 支持多步骤分析
- 提供详细的推理过程`;

    case 'multimodal':
      return `${baseIdentity}
      
当前模式：QELAR-Fusion (Nebulix-Vision 多模态融合模型)
- 专门用于多模态内容理解
- 支持图像、音频、文本的综合分析
- 提供全面的多媒体理解能力`;
  }
}
```

#### 4. 环境变量配置

在项目根目录的 `.env` 文件中添加新的API密钥：

```bash
# 现有配置
DEEPSEEK_API_KEY=your_deepseek_api_key
MOONSHOT_API_KEY=your_moonshot_api_key
OPENAI_API_KEY=your_openai_api_key
VOLCENGINE_ACCESS_KEY_ID=your_volcengine_access_key_id
VOLCENGINE_SECRET_ACCESS_KEY=your_volcengine_secret_access_key

# 新增模型配置
VOLCENGINE_REALTIME_API_KEY=your_volcengine_realtime_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
```

#### 5. 测试新模型

添加新模型后，建议进行以下测试：

1. **功能测试**：验证新模型的检测逻辑是否正确
2. **API测试**：确保API调用正常工作
3. **降级测试**：验证API密钥缺失时的降级策略
4. **品牌一致性**：确保使用统一的 Nebulix 品牌身份

#### 6. 常见扩展场景

- **更多语音模型**：Azure Speech、Google Speech、百度语音等
- **更多视觉模型**：GPT-4V、Claude Vision、Gemini Vision等
- **专业领域模型**：医疗、法律、金融等专业AI模型
- **代码生成模型**：GitHub Copilot、CodeT5、StarCoder等
- **多语言模型**：支持特定语言的专业模型

### 扩展最佳实践

1. **保持一致性**：所有新模型都应使用 Nebulix 品牌身份
2. **优雅降级**：确保API密钥缺失时有合理的降级策略
3. **性能优化**：避免不必要的API调用，优化检测逻辑
4. **错误处理**：提供友好的错误提示和日志记录
5. **文档更新**：及时更新本文档和相关配置说明

## 注意事项

- 图像生成会自动清理提示词中的指令关键词
- 图片需要是 base64 格式或可访问的URL
- 所有emoji会被自动过滤（DeepSeek）
- 研究模式使用独立的 `/chat-reasoner` 端点
- 新增模型时请确保API密钥的安全性
- 建议在生产环境中使用环境变量管理API密钥
