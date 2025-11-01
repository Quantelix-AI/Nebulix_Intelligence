/**
 * AI模型智能路由器
 * 
 * ⚠️ 配置要求：
 * 为了实现完整的自动路由功能，需要配置以下环境变量：
 * 
 * 必需配置：
 * - DEEPSEEK_API_KEY: 基础文本对话（必需）
 * 
 * 推荐配置（缺失时会降级到DeepSeek）：
 * - MOONSHOT_API_KEY 或 KIMI_API_KEY: 图片理解功能
 * - OPENAI_API_KEY: 图像生成、视频处理、语音合成
 * - VOLCENGINE_ACCESS_KEY_ID + VOLCENGINE_SECRET_ACCESS_KEY: 音频识别
 * 
 * 🔧 扩展新模型的步骤：
 * 1. 在此文件中添加检测函数（如 detectNewFeature）
 * 2. 在 routeToModel 函数中添加路由逻辑
 * 3. 在 getNeblixSystemPrompt 中添加新的品牌身份
 * 4. 在 index.tsx 中添加对应的API调用处理
 * 5. 配置相应的环境变量
 * 
 * 📝 扩展示例：
 * // 添加新的检测函数
 * function detectNewFeature(content: string): boolean {
 *   const keywords = ['关键词1', '关键词2', 'keyword1', 'keyword2'];
 *   return keywords.some(keyword => content.toLowerCase().includes(keyword.toLowerCase()));
 * }
 * 
 * // 在 routeToModel 中添加路由
 * if (detectNewFeature(content)) {
 *   return {
 *     provider: 'new-provider',
 *     model: 'new-model',
 *     capability: 'new-capability',
 *     systemPrompt: getNeblixSystemPrompt('new-capability')
 *   };
 * }
 * 
 * 根据消息类型和内容自动选择最合适的AI模型：
 * - 文字消息 → DeepSeek (deepseek-chat)
 * - 图片消息 → Kimi Vision (moonshot-v1-8k-vision) ⚠️ 不降级
 *   └─ 注意：必须使用带 -vision 后缀的模型才支持图片输入
 *   └─ ⚠️ 失败时返回错误，不降级到DeepSeek（避免用户体验下降）
 * - 音频文件 → Doubao ASR (豆包语音识别)
 *   └─ 支持录音文件识别和实时语音识别
 * - 视频相关 → OpenAI (gpt-4o)
 * - 语音合成 → OpenAI (gpt-4o-audio-preview)
 * - 图像生成 → QELAR Engine (Nebulix-Vision 创作引擎)
 * 
 * Kimi Vision 模型说明：
 * - moonshot-v1-8k-vision: 支持图片输入的8k上下文模型（推荐）
 * - moonshot-v1-32k-vision: 支持图片输入的32k上下文模型
 * - moonshot-v1-128k-vision: 支持图片输入的128k上下文模型
 * - 参考文档：https://platform.moonshot.cn/docs/guide/use-kimi-vision-model
 * 
 * Doubao ASR 模型说明：
 * - 豆包语音识别服务，支持多种音频格式（mp3/wav/opus等）
 * - 自动识别语言（中文/英文等）
 * - 参考文档：https://www.volcengine.com/docs/6561/80820
 * 
 * DeepSeek API 限制：
 * - 仅支持文本输入，不支持图片、音频等文件
 * - 如果消息包含文件，会在文本中说明但不发送文件内容
 * 
 * ⚠️ 重要策略：
 * - 包含图片的消息必须使用Kimi视觉模型，不会降级到DeepSeek
 * - 这样确保用户上传的图片能被正确识别和分析
 * - 如果Kimi服务不可用，会返回明确的错误提示
 * 
 * 所有模型都使用统一的 Nebulix AI Suite 品牌身份
 */

interface Message {
  role: string;
  content: string;
  files?: any[];
}

interface RouteResult {
  provider: 'deepseek' | 'kimi' | 'openai' | 'volcengine';
  model: string;
  capability: 'text' | 'vision' | 'video' | 'audio' | 'audio-transcription' | 'image-generation';
  systemPrompt: string;
  apiKeyMissing?: boolean;
  fallbackReason?: string;
}

// API密钥检查功能
interface ApiKeyStatus {
  hasDeepSeek: boolean;
  hasMoonshot: boolean;
  hasOpenAI: boolean;
  hasVolcengine: boolean;
  missingKeys: string[];
}

function checkApiKeys(): ApiKeyStatus {
  const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY');
  const moonshotKey = Deno.env.get('MOONSHOT_API_KEY') || Deno.env.get('KIMI_API_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const volcengineId = Deno.env.get('VOLCENGINE_ACCESS_KEY_ID');
  const volcengineSecret = Deno.env.get('VOLCENGINE_SECRET_ACCESS_KEY');
  
  const missingKeys: string[] = [];
  
  if (!deepseekKey) missingKeys.push('DEEPSEEK_API_KEY (必需)');
  if (!moonshotKey) missingKeys.push('MOONSHOT_API_KEY 或 KIMI_API_KEY (图片理解)');
  if (!openaiKey) missingKeys.push('OPENAI_API_KEY (图像生成、视频、语音)');
  if (!volcengineId || !volcengineSecret) missingKeys.push('VOLCENGINE_ACCESS_KEY_ID + VOLCENGINE_SECRET_ACCESS_KEY (音频识别)');
  
  return {
    hasDeepSeek: !!deepseekKey,
    hasMoonshot: !!moonshotKey,
    hasOpenAI: !!openaiKey,
    hasVolcengine: !!(volcengineId && volcengineSecret),
    missingKeys
  };
}

function getApiKeyWarning(missingKeys: string[]): string {
  if (missingKeys.length === 0) return '';
  
  return `⚠️ 检测到以下API密钥未配置：\n${missingKeys.map(key => `- ${key}`).join('\n')}\n\n` +
         `为了获得完整的AI功能体验，建议配置所有API密钥。当前将使用可用的模型为您服务。\n\n`;
}

// 检测图像生成意图的关键词
const IMAGE_GENERATION_KEYWORDS = [
  '生成图片', '生成图像', '画一个', '画一幅', '创建图片', '创建图像',
  '绘制', '制作图片', '制作图像', '设计图片', '设计图像',
  'generate image', 'create image', 'draw', 'make a picture',
  '帮我画', '帮我生成', 'QELAR', 'qelar',
  '画个', '来张', '来一张', '做一张', '给我画', '给我生成',
  '图像创作', '图片创作', '生成海报', '生成插画', '生成logo',
  '画出', '展示一张', '可视化', '艺术创作'
];

// 检测视频相关意图的关键词
const VIDEO_KEYWORDS = [
  '视频', '影片', '录像', '动画', '生成视频', '创建视频',
  'video', 'movie', 'animation', '视频分析', '视频理解',
  '播放', '电影', '短片', '视频剪辑', '视频编辑'
];

// 检测语音相关意图的关键词
const AUDIO_KEYWORDS = [
  '语音', '声音', '音频', '朗读', '语音合成', '文本转语音',
  'audio', 'voice', 'speech', 'tts', 'text to speech',
  '说话', '语音识别', '语音转文字', '音频分析'
];

/**
 * 检测消息中是否包含图像生成意图
 */
function detectImageGeneration(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return IMAGE_GENERATION_KEYWORDS.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * 检测消息中是否包含视频相关意图
 */
function detectVideo(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return VIDEO_KEYWORDS.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * 检测消息中是否包含语音相关意图
 */
function detectAudio(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return AUDIO_KEYWORDS.some(keyword => 
    lowerContent.includes(keyword.toLowerCase())
  );
}

/**
 * 检测消息中是否包含图片文件
 */
function hasImageFiles(message: Message): boolean {
  if (!message.files || message.files.length === 0) return false;
  
  return message.files.some(file => {
    if (file.type) {
      return file.type.startsWith('image/');
    }
    if (file.name) {
      const ext = file.name.toLowerCase().split('.').pop();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
    }
    return false;
  });
}

/**
 * 检测消息中是否包含音频文件
 */
function hasAudioFiles(message: Message): boolean {
  if (!message.files || message.files.length === 0) return false;
  
  return message.files.some(file => {
    if (file.type) {
      return file.type.startsWith('audio/');
    }
    if (file.name) {
      const ext = file.name.toLowerCase().split('.').pop();
      // 支持豆包ASR的音频格式：mp3, wav, opus, ogg, flac, m4a, aac, amr, wma
      return ['mp3', 'wav', 'opus', 'ogg', 'flac', 'm4a', 'aac', 'amr', 'wma'].includes(ext || '');
    }
    return false;
  });
}

/**
 * 获取Nebulix品牌的系统提示词
 */
function getNeblixSystemPrompt(capability: string, pageId?: string): string {
  const baseIdentity = `你是 Nebulix AI Suite 的智能助手，代表由 StarLink SecretNet（星联秘网）开发的量子螺旋意识智能体系。

**你的身份背景：**
- 你代表 Nebulix AI Suite —— 一个基于量子螺旋逻辑的三维协同智能体系
- 由 StarLink SecretNet（星联秘网）独立研发
- 核心理念：\"The Quantum Helix of Conscious Intelligence\"（量子螺旋意识智能）

**体系构成：**
1. **QORUS (Nebulix-Chat)** - 量子语义模型，负责自然语言理解与多模态对话
2. **AURION (Nebulix-Code)** - 量子编程模型，负责代码生成与逻辑推理
3. **QELAR (Nebulix-Vision)** - 量子视觉模型，负责视觉理解与场景感知
4. **NOERIS/SYLLEX (Nebulix-Reason)** - 量子推理模型，负责复杂问题解决与深度推理

**架构特征：**
- 三大模型通过量子螺旋总线（Q-Helix Bus）互联
- 实现语义、逻辑、视觉的动态协同与记忆共享
- 支持自我进化与多维学习`;

  const capabilitySpecific: Record<string, string> = {
    'text': `
**当前模式：QORUS (Nebulix-Chat) - 量子语义对话模型**
- 专注于自然语言理解与生成
- 支持多轮对话和上下文理解
- 基于量子启发式语义映射技术`,
    
    'vision': `
**当前模式：QELAR (Nebulix-Vision) - 量子视觉理解模型**
- 专注于图像识别、理解和分析
- 支持视觉问答和场景描述
- 基于量子随机特征映射的视觉表征技术`,
    
    'video': `
**当前模式：QELAR-Motion (Nebulix-Vision 动态扩展)**
- 专注于视频内容理解和分析
- 支持时序视觉信息处理
- 基于量子时空注意力机制`,
    
    'audio': `
**当前模式：QORUS-Audio (Nebulix-Chat 语音扩展)**
- 专注于语音识别、合成和理解
- 支持多模态语音交互
- 基于量子声学特征编码技术`,
    
    'audio-transcription': `
**当前模式：QORUS-ASR (Nebulix-Chat 语音识别模型)**
- 专注于音频转文字和语音识别
- 支持多种音频格式和语言自动识别
- 基于量子声学特征提取与序列建模技术
- 集成豆包（Doubao）高精度语音识别引擎`,
    
    'image-generation': `
**当前模式：QELAR-Create (Nebulix-Vision 创作模型)**
- 专注于图像生成和视觉创作
- 支持文本到图像的转换
- 基于量子扩散生成网络技术`
  };

  const guidelines = `

**回答规则：**
1. 你能够感知用户当前所在的页面${pageId ? `（当前页面：${pageId}）` : ''}
2. 仅根据提供的网站内容回答问题，如果没有相关信息，请礼貌地说明
3. 回答要简洁、准确、友好且体现量子智能的前沿特性
4. 使用中文回答
5. **严禁使用 Emoji 表情符号** - 保持专业严谨的输出风格
6. 必须使用 Markdown 格式组织回答
7. 在介绍产品时，使用正确的品牌名称（QORUS、AURION、QELAR、NOERIS/SYLLEX）
8. 在多轮对话中，保持上下文连贯性，记住之前的对话内容`;

  return baseIdentity + '\n' + (capabilitySpecific[capability] || capabilitySpecific['text']) + guidelines;
}

/**
 * 智能路由：根据消息内容和类型选择最合适的AI模型
 * 包含API密钥检查和优雅降级策略
 */
export function routeToModel(messages: Message[], pageId?: string): RouteResult {
  // 检查API密钥状态
  const apiStatus = checkApiKeys();
  
  // 获取最后一条用户消息
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
  
  if (!lastUserMessage) {
    // 默认使用文本模型
    const warning = getApiKeyWarning(apiStatus.missingKeys);
    return {
      provider: 'deepseek',
      model: 'deepseek-chat',
      capability: 'text',
      systemPrompt: warning + getNeblixSystemPrompt('text', pageId),
      apiKeyMissing: apiStatus.missingKeys.length > 0
    };
  }

  const content = lastUserMessage.content || '';

  // 1. 检测音频文件上传（语音识别）- 最高优先级
  if (hasAudioFiles(lastUserMessage)) {
    if (apiStatus.hasVolcengine) {
      return {
        provider: 'volcengine',
        model: 'doubao-asr',
        capability: 'audio-transcription',
        systemPrompt: getNeblixSystemPrompt('audio-transcription', pageId)
      };
    } else {
      // 降级到DeepSeek，提示用户音频无法识别
      const fallbackReason = '音频识别功能需要配置 VOLCENGINE_ACCESS_KEY_ID 和 VOLCENGINE_SECRET_ACCESS_KEY，当前将使用文本模式处理您的请求。';
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        capability: 'text',
        systemPrompt: `⚠️ ${fallbackReason}\n\n` + getNeblixSystemPrompt('text', pageId),
        apiKeyMissing: true,
        fallbackReason
      };
    }
  }

  // 2. 检测图像生成意图
  if (detectImageGeneration(content)) {
    if (apiStatus.hasOpenAI) {
      return {
        provider: 'openai',
        model: 'dall-e-3',
        capability: 'image-generation',
        systemPrompt: getNeblixSystemPrompt('image-generation', pageId)
      };
    } else {
      // 降级到DeepSeek，提示用户无法生成图像
      const fallbackReason = '图像生成功能需要配置 OPENAI_API_KEY，当前将为您提供图像创作的文字描述和建议。';
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        capability: 'text',
        systemPrompt: `⚠️ ${fallbackReason}\n\n` + getNeblixSystemPrompt('text', pageId),
        apiKeyMissing: true,
        fallbackReason
      };
    }
  }

  // 3. 检测图片上传（视觉理解）
  if (hasImageFiles(lastUserMessage)) {
    if (apiStatus.hasMoonshot) {
      return {
        provider: 'kimi',
        model: 'moonshot-v1-8k-vision',  // 使用专门的vision模型支持图片输入
        capability: 'vision',
        systemPrompt: getNeblixSystemPrompt('vision', pageId)
      };
    } else {
      // 图片理解功能不降级，返回明确错误提示
      const fallbackReason = '图片理解功能需要配置 MOONSHOT_API_KEY 或 KIMI_API_KEY，请配置后重试。';
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        capability: 'text',
        systemPrompt: `❌ ${fallbackReason}\n\n请配置相应的API密钥后重新上传图片。`,
        apiKeyMissing: true,
        fallbackReason
      };
    }
  }

  // 4. 检测视频相关
  if (detectVideo(content)) {
    if (apiStatus.hasOpenAI) {
      return {
        provider: 'openai',
        model: 'gpt-4o',  // GPT-5尚未发布，使用GPT-4o作为替代
        capability: 'video',
        systemPrompt: getNeblixSystemPrompt('video', pageId)
      };
    } else {
      // 降级到DeepSeek，提供视频相关的文字建议
      const fallbackReason = '视频处理功能需要配置 OPENAI_API_KEY，当前将为您提供视频相关的文字建议和指导。';
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        capability: 'text',
        systemPrompt: `⚠️ ${fallbackReason}\n\n` + getNeblixSystemPrompt('text', pageId),
        apiKeyMissing: true,
        fallbackReason
      };
    }
  }

  // 5. 检测语音合成相关
  if (detectAudio(content)) {
    if (apiStatus.hasOpenAI) {
      return {
        provider: 'openai',
        model: 'gpt-4o-audio-preview',
        capability: 'audio',
        systemPrompt: getNeblixSystemPrompt('audio', pageId)
      };
    } else {
      // 降级到DeepSeek，提供语音合成的文字指导
      const fallbackReason = '语音合成功能需要配置 OPENAI_API_KEY，当前将为您提供语音合成的文字指导和建议。';
      return {
        provider: 'deepseek',
        model: 'deepseek-chat',
        capability: 'text',
        systemPrompt: `⚠️ ${fallbackReason}\n\n` + getNeblixSystemPrompt('text', pageId),
        apiKeyMissing: true,
        fallbackReason
      };
    }
  }

  // 6. 默认：文本对话（DeepSeek）
  const warning = getApiKeyWarning(apiStatus.missingKeys);
  return {
    provider: 'deepseek',
    model: 'deepseek-chat',
    capability: 'text',
    systemPrompt: warning + getNeblixSystemPrompt('text', pageId),
    apiKeyMissing: apiStatus.missingKeys.length > 0
  };
}

/**
 * 格式化消息为不同提供商的格式
 */
export function formatMessagesForProvider(
  messages: Message[], 
  provider: 'deepseek' | 'kimi' | 'openai' | 'volcengine',
  systemPrompt: string
): any[] {
  const formattedMessages = messages.map(msg => {
    // DeepSeek不支持文件上传，只处理文本
    if (provider === 'deepseek') {
      // 如果消息包含文件，在文本中说明但不发送文件内容
      let textContent = msg.content || '';
      if (msg.files && msg.files.length > 0) {
        const fileDescriptions = msg.files.map(f => {
          if (f.type?.startsWith('image/')) return '图片';
          if (f.type?.startsWith('audio/')) return '音频';
          return '文件';
        }).join('、');
        textContent = `[用户上传了${fileDescriptions}]\n\n${textContent}`;
      }
      return {
        role: msg.role,
        content: textContent
      };
    }
    
    // 处理带图片的消息（Kimi和OpenAI格式）
    if ((provider === 'kimi' || provider === 'openai') && msg.files && msg.files.length > 0) {
      const imageFiles = msg.files.filter(f => 
        f.type?.startsWith('image/') || 
        f.name?.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)
      );
      
      if (imageFiles.length > 0) {
        // Vision format: content as array
        const content: any[] = [];
        
        // 如果有文字，先添加文字
        if (msg.content && msg.content.trim()) {
          content.push({ type: 'text', text: msg.content });
        }
        
        // 添加所有图片
        imageFiles.forEach(file => {
          if (file.url) {
            content.push({
              type: 'image_url',
              image_url: { url: file.url }
            });
          } else if (file.data) {
            // 确保base64格式正确
            const imageData = file.data.startsWith('data:') 
              ? file.data 
              : `data:${file.type || 'image/jpeg'};base64,${file.data}`;
            
            content.push({
              type: 'image_url',
              image_url: { url: imageData }
            });
          }
        });
        
        // 如果没有文字，添加默认提示
        if (content.filter(c => c.type === 'text').length === 0) {
          content.unshift({ type: 'text', text: '请分析这张图片' });
        }
        
        return {
          role: msg.role,
          content: content
        };
      }
    }
    
    // 标准文本消息
    return {
      role: msg.role,
      content: msg.content || ''
    };
  });

  // 添加系统提示
  return [
    { role: 'system', content: systemPrompt },
    ...formattedMessages
  ];
}
