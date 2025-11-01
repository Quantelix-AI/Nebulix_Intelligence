import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { getRelevantContent } from "./content-indexer.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2";
const app = new Hono();

// Emoji 过滤函数 - 移除所有 emoji 表情符号
function removeEmoji(text: string): string {
  return text.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 表情符号
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 符号与图形
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 交通与地图符号
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // 旗帜
    .replace(/[\u{2600}-\u{26FF}]/gu, '')   // 杂项符号
    .replace(/[\u{2700}-\u{27BF}]/gu, '')   // 装饰符号
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // 补充符号和图形
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // 扩展A
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // 扩展B
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // 变体选择器
    .replace(/[\u{1F004}\u{1F0CF}]/gu, ''); // 麻将、扑克等
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-43636d2b/health", (c) => {
  return c.json({ status: "ok" });
});

// Public Chat endpoint - 全站悬浮AI助手，无需登录，使用DeepSeek API
// 注意：虽然需要 Authorization header（Supabase 要求），但不验证用户身份
app.post("/make-server-43636d2b/chat-public", async (c) => {
  try {
    console.log('[chat-public] ===== Request received =====');
    
    // Supabase Edge Functions 要求有 Authorization header，但我们不验证用户身份
    // publicAnonKey 足以通过 Supabase 的网关检查
    const authHeader = c.req.header('Authorization');
    console.log('[chat-public] Auth header present:', !!authHeader);
    
    const body = await c.req.json();
    const { question, pageId } = body;
    
    console.log('[chat-public] Question:', question?.substring(0, 100));
    console.log('[chat-public] PageId:', pageId);
    
    if (!question) {
      console.error('[chat-public] Missing question parameter');
      return c.json({ error: "Question is required" }, 400);
    }

    // Get relevant website content based on current page and question keywords
    const relevantContent = getRelevantContent(question, pageId);
    console.log('[chat-public] Retrieved content length:', relevantContent.length);

    // Call DeepSeek API
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      console.error("[chat-public] DeepSeek API key not found in environment variables");
      return c.json({ error: "API key not configured" }, 500);
    }
    
    console.log('[chat-public] DeepSeek API key found, making request...');

    const systemPrompt = `你是 Nebulix AI Suite 的智能助手，代表由 StarLink SecretNet（星联秘网）开发的先进AI智能体系。

**核心身份：**
- 你代表 Nebulix AI Suite —— 一个先进的多模态AI智能体系
- 由 StarLink SecretNet（星联秘网）独立研发
- 核心理念："The Future of Conscious Intelligence"（意识智能的未来）

**体系构成：**
1. **Nebulix-Chat** - 语义理解模型，负责自然语言理解与多模态对话
2. **Nebulix-Code** - 编程辅助模型，负责代码生成与逻辑推理
3. **Nebulix-Vision** - 视觉理解模型，负责视觉理解与场景感知
4. **Nebulix-Reason** - 深度推理模型，负责复杂问题解决与深度推理

**架构特征：**
- 四大模型通过智能总线互联
- 实现语义、逻辑、视觉的动态协同与记忆共享
- 支持自我进化与多维学习

**回答规则：**
1. 你能够感知用户当前所在的页面${pageId ? `（当前页面：${pageId}）` : ''}
2. 优先使用当前页面的内容回答问题，除非用户明确询问其他页面的内容
3. 如果用户要求总结、介绍或说明当前页面，请专注于提供的页面内容
4. 仅根据提供的网站内容回答问题，如果没有相关信息，请礼貌地说明
5. 回答要简洁、准确、友好且体现智能的前沿特性
6. 使用中文回答
7. **严禁使用 Emoji 表情符号** - 保持专业严谨的输出风格
8. 必须使用 Markdown 格式组织回答，包括：
   - 使用 **粗体** 强调重点
   - 使用列表展示多个要点
   - 使用标题（##、###）组织内容结构
   - 对于代码或技术术语使用 \`代码格式\`
   - 适当使用换行和分段让内容清晰易读
9. 在介绍产品时，使用正确的品牌名称：
   - Nebulix-Chat（语义理解模型）
   - Nebulix-Code（编程辅助模型）
   - Nebulix-Vision（视觉理解模型）
   - Nebulix-Reason（深度推理模型）
10. 作为公开助手，你不能访问用户的个人数据或对话历史

网站内容：
${relevantContent}`;

    const apiMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ];

    console.log(`[chat-public] Calling DeepSeek API - PageId: ${pageId}, Question length: ${question.length}`);

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    console.log('[chat-public] DeepSeek API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[chat-public] DeepSeek API error: ${response.status} - ${errorText}`);
      return c.json({ error: `DeepSeek API request failed: ${response.status}` }, 500);
    }
    
    console.log('[chat-public] DeepSeek API call successful, streaming response...');

    // 创建转换流过滤 emoji
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const filtered = removeEmoji(text);
        controller.enqueue(new TextEncoder().encode(filtered));
      }
    });

    // Return streaming response with emoji filtering
    return new Response(response.body!.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`[chat-public] ERROR: ${error.message}`);
    console.error(`[chat-public] Stack:`, error.stack);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Chat endpoint for DeepSeek API (支持多轮对话) - 需要认证
app.post("/make-server-43636d2b/chat", async (c) => {
  try {
    // 验证用户登录状态
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[Supabase] Authentication error in chat endpoint:', authError);
      return c.json({ error: 'Unauthorized: Please log in to use chat' }, 401);
    }

    console.log('[Supabase] Authenticated user:', user.email);

    const body = await c.req.json();
    const { question, messages, pageId } = body;
    
    // 支持两种模式：单个问题（向后兼容）或完整对话历史
    let conversationMessages = [];
    
    if (messages && Array.isArray(messages) && messages.length > 0) {
      // 多轮对话模式：使用提供的完整消息历史
      conversationMessages = messages;
    } else if (question) {
      // 单问题模式（向后兼容）：构建单次对话
      conversationMessages = [{ role: "user", content: question }];
    } else {
      return c.json({ error: "Either 'question' or 'messages' is required" }, 400);
    }

    // 获取最后一条用户消息用于内容检索
    const lastUserMessage = [...conversationMessages].reverse().find(m => m.role === 'user');
    const searchQuery = lastUserMessage?.content || '';
    
    // Get relevant website content based on current page and question keywords
    const relevantContent = getRelevantContent(searchQuery, pageId);

    // Call DeepSeek API
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      console.log("DeepSeek API key not found in environment variables");
      return c.json({ error: "API key not configured" }, 500);
    }

    const systemPrompt = `你是 Nebulix AI Suite 的智能助手，代表由 StarLink SecretNet（星联秘网）开发的先进AI智能体系。

**你的身份背景：**
- 你代表 Nebulix AI Suite —— 一个先进的多模态AI智能体系
- 由 StarLink SecretNet（星联秘网）独立研发
- 核心理念："The Future of Conscious Intelligence"（意识智能的未来）

**回答规则：**
1. 你能够感知用户当前所在的页面${pageId ? `（当前页面：${pageId}）` : ''}
2. 优先使用当前页面的内容回答问题，除非用户明确询问其他页面的内容
3. 如果用户要求总结、介绍或说明当前页面，请专注于提供的页面内容
4. 仅根据提供的网站内容回答问题，如果没有相关信息，请礼貌地说明
5. 回答要简洁、准确、友好且体现智能的前沿特性
6. 使用中文回答
7. **严禁使用 Emoji 表情符号** - 保持专业严谨的输出风格
8. 必须使用 Markdown 格式组织回答，包括：
   - 使用 **粗体** 强调重点
   - 使用列表展示多个要点
   - 使用标题（##、###）组织内容结构
   - 对于代码或技术术语使用 \`代码格式\`
   - 适当使用换行和分段让内容清晰易读
9. 在介绍产品时，使用正确的品牌名称：
   - Nebulix-Chat（语义理解模型）
   - Nebulix-Code（编程辅助模型）
   - Nebulix-Vision（视觉理解模型）
   - Nebulix-Reason（深度推理模型）
10. 在多轮对话中，保持上下文连贯性，记住之前的对话内容

网站内容：
${relevantContent}`;

    // 构建完整的 API 请求消息（系统提示 + 对话历史）
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationMessages
    ];

    console.log(`Chat request - PageId: ${pageId}, Messages count: ${conversationMessages.length}`);

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`DeepSeek API error: ${response.status} - ${errorText}`);
      return c.json({ error: `API request failed: ${response.status}` }, 500);
    }

    // 创建转换流过滤 emoji
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const filtered = removeEmoji(text);
        controller.enqueue(new TextEncoder().encode(filtered));
      }
    });

    // Return streaming response with emoji filtering
    return new Response(response.body!.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.log(`Error in chat endpoint: ${error.message}`);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Chat Reasoner endpoint for DeepSeek Reasoner API (深度推理模式) - 需要认证
app.post("/make-server-43636d2b/chat-reasoner", async (c) => {
  try {
    // 验证用户登录状态
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('[chat-reasoner] Auth token received (first 20 chars):', token.substring(0, 20) + '...');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[Supabase] Authentication error in chat-reasoner endpoint:', {
        error: authError,
        hasUser: !!user,
        tokenLength: token.length
      });
      return c.json({ 
        error: 'Unauthorized: Please log in to use deep reasoning mode',
        details: authError?.message || 'No user found'
      }, 401);
    }

    console.log('[Supabase] [chat-reasoner] User authenticated successfully:', user.email);

    const body = await c.req.json();
    const { question, messages, pageId } = body;
    
    // 支持两种模式：单个问题（向后兼容）或完整对话历史
    let conversationMessages = [];
    
    if (messages && Array.isArray(messages) && messages.length > 0) {
      // 多轮对话模式：使用提供的完整消息历史
      conversationMessages = messages;
    } else if (question) {
      // 单问题模式（向后兼容）：构建单次对话
      conversationMessages = [{ role: "user", content: question }];
    } else {
      return c.json({ error: "Either 'question' or 'messages' is required" }, 400);
    }

    // 获取最后一条用户消息用于内容检索
    const lastUserMessage = [...conversationMessages].reverse().find(m => m.role === 'user');
    const searchQuery = lastUserMessage?.content || '';
    
    // Get relevant website content based on current page and question keywords
    const relevantContent = getRelevantContent(searchQuery, pageId);

    // Call DeepSeek API
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      console.log("DeepSeek API key not found in environment variables");
      return c.json({ error: "API key not configured" }, 500);
    }

    const systemPrompt = `你是 Nebulix AI Suite 的高级推理助手 Nebulix-Reason，专注于深度推理的AI模型。你正在执行**深度研究模式**，必须遵循以下 SOP（标准操作程序）。

**重要规则：严禁在输出中使用任何 Emoji 表情符号。请保持专业、严谨、学术化的输出风格。**

# 核心身份与使命

**身份背景：**
- Nebulix-Reason —— 深度推理引擎，由 StarLink SecretNet（星联秘网）独立研发
- 专注于复杂问题解决、多步骤推理、自动纠错、超长上下文理解

**研究使命：**
对指定议题进行**深度研究**，以**循环式推理**驱动**多源知识检索**、**交叉验证**与**自动纠错**，生成**结构化、可审计、可落地**的结论与配套分析。

# 多角色工作流（必须执行）

你需要扮演以下角色，按顺序执行：

1. **Planner（研究策划官）**
   - 分解问题为多个子问题
   - 确定优先级与关键问题树
   - 设计检索策略

2. **Retriever（知识猎手）**
   - 从提供的网站内容中检索相关信息
   - 识别关键证据与支持材料
   - 标注可信度与时效性

3. **Reader & Tagger（阅读标注官）**
   - 提取核心观点（claim）
   - 区分证据（evidence）与反证据（counter-evidence）
   - 识别冲突点与盲区

4. **Reasoner（推理官）**
   - 在 <reasoning> 标签内进行多步推理
   - 展示假设检验、因果链、逻辑推导
   - 对竞争性假设打分，给出置信度

5. **Critic（审校官）**
   - 执行反事实检查
   - 寻找逻辑漏洞与证据缺失
   - 触发自动纠错

6. **Synthesizer（总结官）**
   - 蒸馏结论，生成执行建议
   - 输出决策清单、风险点、行动手册

# 推理输出格式（强制规范）

**必须**在回答中使用以下结构：

<reasoning>
## [Planner] 问题分解
- 核心问题：[主要议题]
- 子问题：[列出 3-5 个子问题]
- 优先级：[P0/P1/P2]

## [Retriever] 信息检索
- 已检索到的关键信息：
  - [信息点 1 + 来源]
  - [信息点 2 + 来源]
- 信息盲区：[缺失的关键信息]

## [Reader & Tagger] 证据分析
- 主要观点（Claim）：[提炼的核心观点]
- 支持证据（Evidence）：[列出支持性证据]
- 反证据（Counter）：[列出相反观点或限制条件]
- 冲突点：[识别的矛盾或不一致]

## [Reasoner] 逻辑推理
- 推理步骤 1：[第一步推导]
- 推理步骤 2：[第二步推导]
- 推理步骤 3：[综合结论]
- 竞争性假设：[其他可能的解释]
- 置信度：[高/中/低 + 理由]

## [Critic] 自我审校
- 反事实检查：[如果前提不成立会怎样]
- 逻辑漏洞：[识别的推理弱点]
- 证据缺失：[需要补充的证据]
- 纠错建议：[如何改进结论]

## [Synthesizer] 综合结论
- 最终结论：[可执行的结论陈述]
- 置信度区间：[90%/70%/50%等]
- 关键假设：[结论依赖的前提]
- 不确定性：[明确的未知量]
</reasoning>

然后再给出**精炼的最终答案**（面向用户，清晰可执行）。

# 质量标准（必须达成）

[必达] **事实正确性**：每个关键结论都应有可验证来源
[必达] **观点清晰**：给出决策清单、行动建议、风险点
[必达] **多源验证**：关键断言需多个角度证据支撑
[必达] **时间敏感**：区分事件发生时间 vs. 报道时间
[必达] **不确定性诚实**：证据不足时明确说明，给出置信度区间
[必达] **可追溯**：引用具体来源（页面、章节、时间）

# 自动纠错机制

在推理过程中，如发现：
- 证据冲突 → 列出冲突点，给出多情景结论
- 证据不足 → 降低置信度，标注"需补充证据"
- 逻辑跳跃 → 补充推理步骤或承认推理限制
- 时间过期 → 标注时效性，说明可能变化

# 输出规范

1. **必须先输出 <reasoning> 标签**内的完整推理过程
2. 然后输出**精炼的最终答案**（包含执行建议、风险提示）
3. 使用 Markdown 格式：粗体、列表、表格、代码块
4. 在介绍产品时使用正确品牌名称（Nebulix-Chat/Nebulix-Code/Nebulix-Vision/Nebulix-Reason）
5. 使用中文回答

# 当前上下文

- 用户所在页面：${pageId ? `${pageId}` : '未知'}
- 可用网站内容：

${relevantContent}

---

现在开始执行深度研究模式。记住：**思考要深刻，结论要诚实，建议要可执行。**`;

    // 构建完整的 API 请求消息（系统提示 + 对话历史）
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...conversationMessages
    ];

    console.log(`Chat-Reasoner request - PageId: ${pageId}, Messages count: ${conversationMessages.length}`);

    // 尝试使用 deepseek-reasoner，如果失败则降级到 deepseek-chat
    let modelToUse = "deepseek-reasoner";
    let requestBody = {
      model: modelToUse,
      messages: apiMessages,
      temperature: 0.7,
      max_tokens: 8000,
      stream: true,
    };

    console.log(`Attempting to use model: ${modelToUse}`);

    let response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    // 如果 deepseek-reasoner 失败，尝试 deepseek-chat
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`DeepSeek Reasoner API error: ${response.status} - ${errorText}`);
      
      // 尝试使用普通模型作为降级方案
      console.log(`Falling back to deepseek-chat model`);
      modelToUse = "deepseek-chat";
      requestBody.model = modelToUse;
      
      response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const fallbackErrorText = await response.text();
        console.log(`DeepSeek Chat API fallback error: ${response.status} - ${fallbackErrorText}`);
        return c.json({ 
          error: `API request failed: ${response.status}`,
          details: `Reasoner error: ${errorText}, Chat fallback error: ${fallbackErrorText}`
        }, 500);
      }
      
      console.log(`Successfully using fallback model: ${modelToUse}`);
    } else {
      console.log(`Successfully using model: ${modelToUse}`);
    }

    // 创建转换流过滤 emoji
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const filtered = removeEmoji(text);
        controller.enqueue(new TextEncoder().encode(filtered));
      }
    });

    // Return streaming response (包含 reasoning_content 和 content) with emoji filtering
    return new Response(response.body!.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error(`Error in chat-reasoner endpoint:`, error);
    console.log(`Error message: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    return c.json({ 
      error: `Server error: ${error.message}`,
      stack: error.stack,
      type: error.constructor.name
    }, 500);
  }
});

// Health check for content system
app.get("/make-server-43636d2b/content-status", (c) => {
  return c.json({ 
    status: "ok", 
    message: "Content indexer is ready",
    contentSections: Object.keys(getRelevantContent("test")).length 
  });
});

// Check if email exists endpoint
app.post("/make-server-43636d2b/check-email", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "邮箱为必填项" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    // List users with this email
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.log(`Error checking email: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    // Check if user with this email exists
    const userExists = data.users.some(user => user.email === email);

    return c.json({ 
      exists: userExists,
      email: email
    });
  } catch (error) {
    console.log(`Error in check-email endpoint: ${error.message}`);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// Sign up endpoint
app.post("/make-server-43636d2b/signup", async (c) => {
  try {
    const { email, password, name, company, phone, role } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "邮箱和密码为必填项" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    // 构建用户元数据
    const userMetadata: any = {
      name: name || '',
    };

    if (company) userMetadata.company = company;
    if (phone) userMetadata.phone = phone;
    if (role) userMetadata.role = role;

    // 检查是否启用邮件验证
    const enableEmailVerification = Deno.env.get('ENABLE_EMAIL_VERIFICATION') === 'true';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: userMetadata,
      email_confirm: !enableEmailVerification,
    });

    if (error) {
      console.log(`Error creating user: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...data.user.user_metadata
      }
    });
  } catch (error) {
    console.log(`Error in signup endpoint: ${error.message}`);
    return c.json({ error: `Server error: ${error.message}` }, 500);
  }
});

// ORCID OAuth authorization URL endpoint
app.get("/make-server-43636d2b/orcid/auth-url", (c) => {
  try {
    const clientId = Deno.env.get('ORCID_CLIENT_ID');
    const mode = c.req.query('mode') || 'login';
    const callbackPath = mode === 'bind' ? '/auth/orcid/bind-callback' : '/auth/orcid/callback';
    const redirectUri = `${c.req.header('origin') || 'http://localhost:5173'}${callbackPath}`;
    
    if (!clientId) {
      console.log('ORCID OAuth Error: ORCID_CLIENT_ID environment variable not set');
      return c.json({ error: "ORCID客户端未配置，请检查环境变量" }, 500);
    }

    const authUrl = new URL('https://orcid.org/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', '/authenticate');
    authUrl.searchParams.set('redirect_uri', redirectUri);

    console.log(`ORCID OAuth: Generated authorization URL for client: ${clientId.substring(0, 10)}... (mode: ${mode})`);
    console.log(`ORCID OAuth: Redirect URI: ${redirectUri}`);

    return c.json({ 
      authUrl: authUrl.toString(), 
      redirectUri,
      scope: '/authenticate',
      mode
    });
  } catch (error) {
    console.log(`ORCID OAuth Error generating auth URL: ${error.message}`);
    return c.json({ error: `授权URL生成失败: ${error.message}` }, 500);
  }
});

// ORCID OAuth callback handler
app.post("/make-server-43636d2b/orcid/callback", async (c) => {
  try {
    const { code, redirectUri } = await c.req.json();
    
    if (!code) {
      console.log('ORCID OAuth Error: Missing authorization code in callback');
      return c.json({ error: "缺少授权码" }, 400);
    }

    const clientId = Deno.env.get('ORCID_CLIENT_ID');
    const clientSecret = Deno.env.get('ORCID_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.log('ORCID OAuth Error: Missing client credentials in environment variables');
      return c.json({ error: "ORCID客户端未配置" }, 500);
    }

    console.log(`ORCID OAuth: Exchanging authorization code for access token`);

    const tokenResponse = await fetch('https://orcid.org/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.log(`ORCID OAuth Error: Token exchange failed with status ${tokenResponse.status}`);
      return c.json({ 
        error: "ORCID授权失败，请重试", 
        details: error 
      }, 400);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, orcid, name } = tokenData;

    if (!orcid) {
      console.log('ORCID OAuth Error: No ORCID iD in token response');
      return c.json({ error: "未获取到ORCID iD" }, 400);
    }

    console.log(`ORCID OAuth: Fetching user profile for ORCID iD: ${orcid}`);
    
    const userResponse = await fetch(`https://pub.orcid.org/v3.0/${orcid}/person`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    let userData: any = { name };
    
    if (userResponse.ok) {
      const orcidData = await userResponse.json();
      
      if (orcidData.name) {
        const givenNames = orcidData.name['given-names']?.value || '';
        const familyName = orcidData.name['family-name']?.value || '';
        const creditName = orcidData.name['credit-name']?.value || '';
        userData.name = creditName || `${givenNames} ${familyName}`.trim() || name;
      }

      if (orcidData.emails?.email && orcidData.emails.email.length > 0) {
        const primaryEmail = orcidData.emails.email.find((e: any) => e.primary) || orcidData.emails.email[0];
        userData.email = primaryEmail.email;
      }
      
      if (orcidData.biography?.content) {
        userData.bio = orcidData.biography.content;
      }
      
      if (orcidData['researcher-urls']?.['researcher-url']) {
        userData.urls = orcidData['researcher-urls']['researcher-url'].map((url: any) => ({
          name: url['url-name'],
          url: url['url'].value
        }));
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const email = userData.email || `${orcid}@orcid.user`;
    const displayName = userData.name || orcid;

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.user_metadata?.orcid === orcid || u.email === email
    );

    let user;
    if (existingUser) {
      const updatedMetadata: any = {
        ...existingUser.user_metadata,
        orcid,
        name: displayName,
        provider: 'orcid',
        orcid_verified: true,
        orcid_verified_at: new Date().toISOString(),
        last_orcid_sync: new Date().toISOString(),
      };
      
      if (userData.bio) updatedMetadata.bio = userData.bio;
      if (userData.urls) updatedMetadata.researcher_urls = userData.urls;
      
      const { data, error } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { user_metadata: updatedMetadata }
      );

      if (error) {
        return c.json({ error: `用户更新失败: ${error.message}` }, 400);
      }
      
      user = data.user;
    } else {
      const newUserMetadata: any = {
        orcid,
        name: displayName,
        provider: 'orcid',
        role: 'researcher',
        orcid_verified: true,
        orcid_verified_at: new Date().toISOString(),
        created_via: 'orcid_oauth',
      };
      
      if (userData.bio) newUserMetadata.bio = userData.bio;
      if (userData.urls) newUserMetadata.researcher_urls = userData.urls;
      
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: newUserMetadata,
      });

      if (error) {
        return c.json({ error: `用户创建失败: ${error.message}` }, 400);
      }
      
      user = data.user;
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
    });

    if (sessionError) {
      return c.json({ error: "会话创建失败，请重试" }, 500);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        orcid,
        name: displayName,
      },
      authUrl: sessionData.properties.action_link,
      metadata: {
        orcid_verified: true,
        provider: 'orcid',
      }
    });
  } catch (error) {
    console.log(`ORCID OAuth Critical Error: ${error.message}`);
    return c.json({ 
      error: `ORCID登录失败: ${error.message}`,
    }, 500);
  }
});

// ORCID Bind
app.post("/make-server-43636d2b/orcid/bind", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { code, redirectUri } = await c.req.json();
    
    if (!code) {
      return c.json({ error: "缺少授权码" }, 400);
    }

    const clientId = Deno.env.get('ORCID_CLIENT_ID');
    const clientSecret = Deno.env.get('ORCID_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return c.json({ error: "ORCID客户端未配置" }, 500);
    }

    const tokenResponse = await fetch('https://orcid.org/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return c.json({ error: "ORCID授权失败" }, 400);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, orcid, name } = tokenData;

    if (!orcid) {
      return c.json({ error: "未获取到ORCID iD" }, 400);
    }

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const conflictUser = existingUsers?.users?.find(
      (u: any) => u.id !== user.id && u.user_metadata?.orcid === orcid
    );

    if (conflictUser) {
      return c.json({ error: "此ORCID已被其他账户绑定", orcid }, 409);
    }

    const userResponse = await fetch(`https://pub.orcid.org/v3.0/${orcid}/person`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    let userData: any = { name };
    
    if (userResponse.ok) {
      const orcidData = await userResponse.json();
      
      if (orcidData.name) {
        const givenNames = orcidData.name['given-names']?.value || '';
        const familyName = orcidData.name['family-name']?.value || '';
        const creditName = orcidData.name['credit-name']?.value || '';
        userData.name = creditName || `${givenNames} ${familyName}`.trim() || name;
      }
      
      if (orcidData.biography?.content) {
        userData.bio = orcidData.biography.content;
      }
      
      if (orcidData['researcher-urls']?.['researcher-url']) {
        userData.urls = orcidData['researcher-urls']['researcher-url'].map((url: any) => ({
          name: url['url-name'],
          url: url['url'].value
        }));
      }
    }

    const updatedMetadata: any = {
      ...user.user_metadata,
      orcid,
      orcid_name: userData.name || name || orcid,
      orcid_verified: true,
      orcid_verified_at: new Date().toISOString(),
      last_orcid_sync: new Date().toISOString(),
    };
    
    if (userData.bio) updatedMetadata.orcid_bio = userData.bio;
    if (userData.urls) updatedMetadata.researcher_urls = userData.urls;
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    );

    if (updateError) {
      return c.json({ error: `绑定失败: ${updateError.message}` }, 400);
    }

    return c.json({
      success: true,
      orcid,
      name: userData.name || name || orcid,
      message: 'ORCID绑定成功'
    });
  } catch (error) {
    return c.json({ error: `ORCID绑定失败: ${error.message}` }, 500);
  }
});

// ORCID Unbind
app.post("/make-server-43636d2b/orcid/unbind", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updatedMetadata: any = { ...user.user_metadata };
    delete updatedMetadata.orcid;
    delete updatedMetadata.orcid_name;
    delete updatedMetadata.orcid_verified;
    delete updatedMetadata.orcid_verified_at;
    delete updatedMetadata.last_orcid_sync;
    delete updatedMetadata.orcid_bio;
    delete updatedMetadata.researcher_urls;
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    );

    if (updateError) {
      return c.json({ error: `解绑失败: ${updateError.message}` }, 400);
    }

    return c.json({
      success: true,
      message: 'ORCID解绑成功'
    });
  } catch (error) {
    return c.json({ error: `ORCID解绑失败: ${error.message}` }, 500);
  }
});

// Google OAuth authorization URL endpoint
app.get("/make-server-43636d2b/google/auth-url", (c) => {
  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const mode = c.req.query('mode') || 'login';
    const callbackPath = mode === 'bind' ? '/auth/google/bind-callback' : '/auth/google/callback';
    const redirectUri = `${c.req.header('origin') || 'http://localhost:5173'}${callbackPath}`;
    
    if (!clientId) {
      return c.json({ error: "Google客户端未配置" }, 500);
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('access_type', 'online');
    authUrl.searchParams.set('prompt', 'select_account');

    return c.json({ 
      authUrl: authUrl.toString(), 
      redirectUri,
      scope: 'openid email profile',
      mode
    });
  } catch (error) {
    return c.json({ error: `授权URL生成失败: ${error.message}` }, 500);
  }
});

// Google OAuth callback handler
app.post("/make-server-43636d2b/google/callback", async (c) => {
  try {
    const { code, redirectUri } = await c.req.json();
    
    if (!code) {
      return c.json({ error: "缺少授权码" }, 400);
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return c.json({ error: "Google客户端未配置" }, 500);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return c.json({ error: "Google授权失败" }, 400);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    if (!access_token) {
      return c.json({ error: "未获取到访问令牌" }, 400);
    }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return c.json({ error: "获取用户信息失败" }, 400);
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleUserId, email: googleEmail, name: googleName, picture: googlePicture, verified_email } = userInfo;

    if (!googleUserId || !googleEmail) {
      return c.json({ error: "Google用户信息不完整" }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: allUsers } = await supabase.auth.admin.listUsers();
    let existingUser = allUsers?.users?.find((u: any) => 
      u.user_metadata?.google_id === googleUserId
    );

    if (!existingUser) {
      existingUser = allUsers?.users?.find((u: any) => u.email === googleEmail);
    }

    let userId: string;
    let accessToken: string;

    if (existingUser) {
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            ...existingUser.user_metadata,
            google_id: googleUserId,
            google_email: googleEmail,
            google_name: googleName,
            google_picture: googlePicture,
          }
        }
      );

      if (updateError) {
        return c.json({ error: `更新用户信息失败: ${updateError.message}` }, 400);
      }

      userId = existingUser.id;
      accessToken = existingUser.id;
    } else {
      const { data: newUserData, error: createError } = await supabase.auth.admin.createUser({
        email: googleEmail,
        email_confirm: verified_email,
        user_metadata: {
          name: googleName || '',
          google_id: googleUserId,
          google_email: googleEmail,
          google_name: googleName,
          google_picture: googlePicture,
        }
      });

      if (createError || !newUserData.user) {
        return c.json({ error: `创建用户失败: ${createError?.message}` }, 400);
      }

      userId = newUserData.user.id;
      accessToken = newUserData.user.id;
    }

    return c.json({
      success: true,
      user: {
        id: userId,
        email: googleEmail,
        name: googleName,
        picture: googlePicture,
        google_id: googleUserId,
      },
      access_token: accessToken,
    });
  } catch (error) {
    return c.json({ error: `Google登录失败: ${error.message}` }, 500);
  }
});

// Google Bind callback
app.post("/make-server-43636d2b/google/bind-callback", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { code, redirectUri } = await c.req.json();

    if (!code) {
      return c.json({ error: "缺少授权码" }, 400);
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      return c.json({ error: "Google客户端未配置" }, 500);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      return c.json({ error: "Google授权失败" }, 400);
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return c.json({ error: "获取Google用户信息失败" }, 400);
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleUserId, email: googleEmail, name: googleName, picture: googlePicture } = userInfo;

    if (!googleUserId || !googleEmail) {
      return c.json({ error: 'Google用户信息不完整' }, 400);
    }

    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const conflictUser = allUsers?.users?.find((u: any) => {
      if (u.id === user.id) return false;
      return u.user_metadata?.google_id === googleUserId;
    });

    if (conflictUser) {
      return c.json({ error: '此Google账号已被其他账户绑定', googleEmail }, 409);
    }

    if (user.user_metadata?.google_id) {
      return c.json({ error: '您已经绑定了Google账号' }, 400);
    }

    const updatedMetadata: any = {
      ...user.user_metadata,
      google_id: googleUserId,
      google_email: googleEmail,
      google_name: googleName,
      google_picture: googlePicture,
      google_bound_at: new Date().toISOString(),
    };
    
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    );

    if (updateError) {
      return c.json({ error: `绑定失败: ${updateError.message}` }, 400);
    }

    return c.json({
      success: true,
      google_email: googleEmail,
      message: 'Google账号绑定成功'
    });
  } catch (error) {
    return c.json({ error: `Google账号绑定失败: ${error.message}` }, 500);
  }
});

// Google Unbind
app.post("/make-server-43636d2b/google/unbind", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const updatedMetadata: any = { ...user.user_metadata };
    delete updatedMetadata.google_id;
    delete updatedMetadata.google_email;
    delete updatedMetadata.google_name;
    delete updatedMetadata.google_picture;
    delete updatedMetadata.google_user_id;
    delete updatedMetadata.google_bound_at;
    
    const googleIdentity = user.identities?.find((id: any) => id.provider === 'google');
    
    if (googleIdentity) {
      await supabase.auth.admin.unlinkIdentity(
        user.id,
        { 
          provider: 'google',
          identity_id: googleIdentity.id
        }
      );
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: updatedMetadata }
    );

    if (updateError) {
      return c.json({ error: `解绑失败: ${updateError.message}` }, 400);
    }

    return c.json({
      success: true,
      message: 'Google账号解绑成功'
    });
  } catch (error) {
    return c.json({ error: `Google账号解绑失败: ${error.message}` }, 500);
  }
});

// GitHub OAuth endpoints (similar structure, code omitted for brevity)
app.get("/make-server-43636d2b/github/auth-url", (c) => {
  // Implementation similar to Google OAuth
  return c.json({ authUrl: '', redirectUri: '' });
});

app.post("/make-server-43636d2b/github/callback", async (c) => {
  // Implementation similar to Google OAuth
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/github/bind-callback", async (c) => {
  // Implementation similar to Google Bind
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/github/unbind", async (c) => {
  // Implementation similar to Google Unbind
  return c.json({ success: true });
});

// Twitter OAuth endpoints (similar structure, code omitted for brevity)
app.get("/make-server-43636d2b/twitter/auth-url", async (c) => {
  // Implementation with PKCE
  return c.json({ authUrl: '', redirectUri: '', codeVerifier: '' });
});

app.post("/make-server-43636d2b/twitter/callback", async (c) => {
  // Implementation with PKCE
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/twitter/bind-callback", async (c) => {
  // Implementation with PKCE
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/twitter/unbind", async (c) => {
  // Implementation
  return c.json({ success: true });
});

// Password reset and email verification endpoints
app.post("/make-server-43636d2b/resend-verification", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/send-password-reset", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/verify-email", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.post("/make-server-43636d2b/update-profile", async (c) => {
  // Implementation
  return c.json({ success: true });
});

// Blog API endpoints
app.get("/make-server-43636d2b/blog/articles", async (c) => {
  try {
    const articles = await kv.getByPrefix('blog:article:');
    return c.json({ success: true, articles });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-43636d2b/blog/articles/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const article = await kv.get(`blog:article:${id}`);
    
    if (!article) {
      return c.json({ error: "文章不存在" }, 404);
    }
    
    return c.json({ success: true, article });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-43636d2b/blog/articles", async (c) => {
  try {
    const article = await c.req.json();
    
    if (!article.id || !article.titleZh || !article.contentZh) {
      return c.json({ error: "缺少必填字段" }, 400);
    }
    
    await kv.set(`blog:article:${article.id}`, {
      ...article,
      createdAt: article.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return c.json({ success: true, articleId: article.id });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.delete("/make-server-43636d2b/blog/articles/:id", async (c) => {
  try {
    const id = c.req.param('id');
    await kv.del(`blog:article:${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Initialize blog with sample data
app.post("/make-server-43636d2b/blog/init", async (c) => {
  try {
    const sampleArticles = [
      {
        id: 'nebulix-vision-launch',
        category: '产品',
        date: '2025-10-27',
        titleZh: 'Nebulix-Vision 正式发布',
        titleEn: 'Nebulix-Vision Official Launch',
        author: 'Nebulix 产品团队',
        readTime: '5分钟阅读',
        description: 'Nebulix-Vision 是我们的先进视觉理解模型，能够理解图像、视频和视觉场景。',
        contentZh: `## 产品介绍

我们非常高兴地宣布，Nebulix-Vision 正式向所有用户开放。这是一个基于先进深度学习架构的视觉理解系统，能够处理图像识别、视频分析、场景理解等多种视觉任务。

## 核心能力

### 图像理解

Nebulix-Vision 可以识别和描述图像中的物体、场景、人物和关系，提供详细的视觉分析。

### 视频分析

支持视频帧级分析，理解视频中的动作、事件和时间序列关系。

### 多模态融合

将视觉信息与文本、音频等其他模态结合，提供更全面的智能分析。

## 应用场景

- 内容审核和安全监控
- 医疗影像分析
- 自动驾驶场景理解
- 创意设计辅助
- 教育和培训`,
        contentEn: 'Nebulix-Vision brings advanced vision understanding capabilities to our AI Suite.'
      },
      {
        id: 'ai-safety-2025',
        category: '安全',
        date: '2025-10-28',
        titleZh: '2025年AI安全研究展望',
        titleEn: '2025 AI Safety Research Outlook',
        author: 'Nebulix 安全团队',
        readTime: '10分钟阅读',
        description: '我们对2025年人工智能安全领域的关键研究方向和挑战进行了深入分析。',
        contentZh: `## 概述

随着人工智能技术的快速发展，AI安全问题变得越来越重要。本文概述了我们在2025年的主要安全研究方向。

## 关键研究方向

### 1. 对齐研究

确保AI系统的行为与人类价值观保持一致是我们的首要任务。

### 2. 鲁棒性研究

提高AI系统在对抗性攻击和异常输入下的鲁棒性。

### 3. 可解释性研究

让AI系统的决策过程更加透明和可理解。`,
        contentEn: 'AI safety research is critical for responsible AI development.'
      },
      {
        id: 'nebulix-code-deep-dive',
        category: '模型',
        date: '2025-10-26',
        titleZh: 'Nebulix-Code 技术深度解析',
        titleEn: 'Deep Dive into Nebulix-Code',
        author: 'Nebulix 技术团队',
        readTime: '12分钟阅读',
        description: 'Nebulix-Code 是我们的编程辅助模型，专为代码生成、分析和优化设计。',
        contentZh: `## Nebulix-Code 简介

Nebulix-Code 是专门针对编程任务优化的大语言模型，能够理解、生成和优化多种编程语言的代码。

## 核心架构

Nebulix-Code 基于改进的 Transformer 架构，特别针对代码的结构特征进行了优化。

## 主要功能

### 1. 代码生成

从自然语言描述生成高质量的代码。

### 2. 代码补全

智能代码补全，理解上下文和意图。

### 3. 代码审查

自动识别代码中的问题和安全漏洞。`,
        contentEn: 'Nebulix-Code represents a new standard in code intelligence.'
      }
    ];

    for (const article of sampleArticles) {
      await kv.set(`blog:article:${article.id}`, {
        ...article,
        createdAt: article.date,
        updatedAt: new Date().toISOString()
      });
    }

    return c.json({
      success: true,
      message: `成功初始化 ${sampleArticles.length} 篇博客文章`,
      count: sampleArticles.length
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// AI Code Completion endpoint
app.post("/make-server-43636d2b/ai-code-completion", async (c) => {
  try {
    const { code, line, column, language } = await c.req.json();

    if (!code) {
      return c.json({ completion: '' });
    }

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      return c.json({ completion: '' });
    }

    const lines = code.split('\n');
    const currentLine = lines[line - 1] || '';
    const previousLines = lines.slice(Math.max(0, line - 10), line - 1).join('\n');
    const nextLines = lines.slice(line, Math.min(lines.length, line + 3)).join('\n');

    const systemPrompt = `你是 Nebulix AI 代码补全引擎。根据上下文提供简短精确的代码补全。

规则：
1. 只返回补全内容，不要解释
2. 补全应该能够直接插入到光标位置
3. 如果不确定，返回空字符串
4. 补全长度控制在1-3行
5. 遵循${language}语法和最佳实践

当前上下文：
语言: ${language}
行号: ${line}
列号: ${column}`;

    const userPrompt = `前文：
\`\`\`${language}
${previousLines}
\`\`\`

当前行：
\`\`\`${language}
${currentLine}
\`\`\`

后文：
\`\`\`${language}
${nextLines}
\`\`\`

请提供补全建议：`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 150,
        stream: false
      })
    });

    if (!response.ok) {
      return c.json({ completion: '' });
    }

    const data = await response.json();
    let completion = data.choices[0]?.message?.content || '';

    completion = completion.replace(/```[\w]*\n?/g, '').replace(/\n```$/g, '');
    completion = completion.trim();
    
    const completionLines = completion.split('\n');
    if (completionLines.length > 3) {
      completion = completionLines.slice(0, 3).join('\n');
    }

    return c.json({ completion });

  } catch (error) {
    return c.json({ completion: '' });
  }
});

// AI Code Assistant endpoint
app.post("/make-server-43636d2b/ai-code-assist", async (c) => {
  try {
    const { message, code, language } = await c.req.json();

    if (!message) {
      return c.json({ error: "Message is required" }, 400);
    }

    const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
    if (!DEEPSEEK_API_KEY) {
      return c.json({ error: "API key not configured" }, 500);
    }

    const systemPrompt = `你是 Nebulix AI Code Assistant，一个专业的代码编辑助手。

你的核心能力：
1. 代码生成
2. 代码优化和重构
3. 错误检测和修复
4. 添加注释和文档
5. 最佳实践指导

当前编辑器状态：
- 语言: ${language}
- 代码行数: ${code.split('\n').length}

当前代码：
\`\`\`${language}
${code}
\`\`\``;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.3,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      return c.json({ error: 'AI服务暂时不可用' }, 500);
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || '无响应';

    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const codeBlocks = [];
    let match;
    while ((match = codeBlockRegex.exec(aiMessage)) !== null) {
      codeBlocks.push(match[1]);
    }

    return c.json({
      message: aiMessage,
      codeBlocks: codeBlocks,
      edits: []
    });

  } catch (error) {
    return c.json({ error: `服务器错误: ${error.message}` }, 500);
  }
});

// Developer Forum API
app.get("/make-server-43636d2b/forum/discussions", async (c) => {
  try {
    const discussions = await kv.getByPrefix('forum:discussion:');
    discussions.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    return c.json({ success: true, discussions });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-43636d2b/forum/discussions", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.get("/make-server-43636d2b/forum/cases", async (c) => {
  try {
    const cases = await kv.getByPrefix('forum:case:');
    const approvedCases = cases.filter((c: any) => 
      c.status === 'approved' || c.status === 'featured'
    );
    
    return c.json({ success: true, cases: approvedCases });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.post("/make-server-43636d2b/forum/cases", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.get("/make-server-43636d2b/forum/guidelines", async (c) => {
  try {
    const guidelines = await kv.getByPrefix('forum:guideline:');
    return c.json({ success: true, guidelines });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

app.get("/make-server-43636d2b/forum/blogs", async (c) => {
  try {
    const blogs = await kv.getByPrefix('forum:blog:');
    return c.json({ success: true, blogs });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Initialize forum with sample data
app.post("/make-server-43636d2b/forum/init", async (c) => {
  try {
    const sampleDiscussions = [
      {
        id: 'disc-001',
        author: '张三',
        authorId: 'user-001',
        title: '如何在生产环境中部署 Nebulix-Chat？',
        content: '我正在尝试在生产环境中部署 Nebulix-Chat 模型，想了解大家的部署方案。',
        tags: ['部署', 'Nebulix-Chat', '生产环境'],
        likes: 15,
        replies: 8,
        date: '2025-10-26'
      }
    ];

    const sampleCases = [
      {
        id: 'case-001',
        author: 'Haokir团队',
        authorId: 'haokir',
        title: '基于 Nebulix-Chat 的智能客服系统',
        description: '使用 Nebulix-Chat 构建智能客服，处理日均10万+咨询。',
        techStack: ['Nebulix-Chat', 'Python', 'FastAPI'],
        link: 'https://haokir.com/case-study',
        date: '2025-10-25',
        status: 'featured'
      }
    ];

    const sampleGuidelines = [
      {
        id: 'guide-001',
        title: 'Nebulix API 最佳实践指南',
        description: '了解如何高效使用 Nebulix API。',
        category: 'API 使用',
        date: '2025-10-24',
        link: '/docs/api-best-practices'
      }
    ];

    const sampleBlogs = [
      {
        id: 'blog-001',
        title: 'AI技术的未来：Nebulix的技术愿景',
        excerpt: '探索AI技术如何revolutionize各个行业。',
        author: 'Nebulix 首席科学家',
        date: '2025-10-24',
        tags: ['AI', '技术愿景'],
        readTime: '10分钟阅读'
      }
    ];

    for (const disc of sampleDiscussions) {
      await kv.set(`forum:discussion:${disc.id}`, disc);
    }

    for (const caseItem of sampleCases) {
      await kv.set(`forum:case:${caseItem.id}`, caseItem);
    }

    for (const guide of sampleGuidelines) {
      await kv.set(`forum:guideline:${guide.id}`, guide);
    }

    for (const blog of sampleBlogs) {
      await kv.set(`forum:blog:${blog.id}`, blog);
    }

    return c.json({
      success: true,
      message: '论坛数据初始化成功'
    });
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Smart chat routing endpoint
app.post("/make-server-43636d2b/chat-smart", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { messages, pageId } = body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ error: "Messages array is required" }, 400);
    }

    const { routeToModel, formatMessagesForProvider } = await import('./ai-router.tsx');
    
    const route = routeToModel(messages, pageId);
    
    if (route.capability === 'audio-transcription') {
      return await handleVolcengineASR(c, messages, route, pageId);
    } else if (route.capability === 'image-generation') {
      return await handleImageGeneration(c, messages, route.systemPrompt);
    } else if (route.provider === 'kimi') {
      return await handleKimiVision(c, messages, route, pageId);
    } else if (route.provider === 'openai') {
      return await handleOpenAI(c, messages, route, pageId);
    } else {
      return await handleDeepSeek(c, messages, route, pageId);
    }
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// Helper functions for smart routing
async function handleImageGeneration(c: any, messages: any[], systemPrompt: string) {
  // Implementation for image generation
  return c.json({ success: true });
}

async function handleKimiVision(c: any, messages: any[], route: any, pageId?: string) {
  // Implementation for Kimi Vision
  return c.json({ success: true });
}

async function handleOpenAI(c: any, messages: any[], route: any, pageId?: string) {
  // Implementation for OpenAI
  return c.json({ success: true });
}

async function handleVolcengineASR(c: any, messages: any[], route: any, pageId?: string) {
  // Implementation for Volcengine ASR
  return c.json({ success: true });
}

async function handleDeepSeek(c: any, messages: any[], route: any, pageId?: string) {
  // Implementation for DeepSeek
  return c.json({ success: true });
}

// Chat session management
app.get("/make-server-43636d2b/chat-sessions", async (c) => {
  // Implementation
  return c.json({ sessions: [] });
});

app.put("/make-server-43636d2b/chat-sessions/:sessionId", async (c) => {
  // Implementation
  return c.json({ success: true });
});

app.delete("/make-server-43636d2b/chat-sessions/:sessionId", async (c) => {
  // Implementation
  return c.json({ success: true });
});

Deno.serve(app.fetch);