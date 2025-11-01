// API客户端工具
import { APIConfig, getFirstAvailableConfig, hasAnyAPIConfig } from './apiConfig';
import { createClient } from './supabase/client';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatMessageWithFiles {
  role: 'user' | 'assistant' | 'system';
  content: string;
  files?: Array<{
    name: string;
    type: string;
    content: string; // base64 encoded content
  }>;
}

export interface ChatResponse {
  content: string;
  reasoning?: string;
  error?: string;
}

// OpenAI API调用
async function callOpenAI(config: APIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages: messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '抱歉，没有收到有效响应。'
  };
}

// DeepSeek API调用
async function callDeepSeek(config: APIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'deepseek-chat',
      messages: messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  // DeepSeek可能返回推理过程
  const choice = data.choices[0];
  const reasoning = choice?.message?.reasoning;
  
  return {
    content: choice?.message?.content || '抱歉，没有收到有效响应。',
    reasoning: reasoning
  };
}

// Anthropic Claude API调用
async function callAnthropic(config: APIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  // 转换消息格式（Anthropic不支持system role在messages中）
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');
  
  const response = await fetch(`${config.baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 4000,
      system: systemMessage?.content || '你是一个有用的AI助手。',
      messages: userMessages
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || '抱歉，没有收到有效响应。'
  };
}

// Google Gemini API调用
async function callGemini(config: APIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  // 转换消息格式
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(`${config.baseUrl}/models/${config.model || 'gemini-pro'}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0]?.content?.parts[0]?.text || '抱歉，没有收到有效响应。'
  };
}

// 主要的聊天API调用函数
export async function sendChatMessage(
  messages: ChatMessage[], 
  abortSignal?: AbortSignal
): Promise<ChatResponse> {
  // 检查是否有可用的API配置
  if (!hasAnyAPIConfig()) {
    throw new Error('NO_API_CONFIG');
  }

  const config = getFirstAvailableConfig();
  if (!config) {
    throw new Error('NO_VALID_CONFIG');
  }

  try {
    let response: ChatResponse;

    switch (config.provider) {
      case 'openai':
        response = await callOpenAI(config, messages);
        break;
      case 'deepseek':
        response = await callDeepSeek(config, messages);
        break;
      case 'anthropic':
        response = await callAnthropic(config, messages);
        break;
      case 'gemini':
        response = await callGemini(config, messages);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    return response;
  } catch (error) {
    if (abortSignal?.aborted) {
      throw new Error('REQUEST_ABORTED');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Unknown error occurred');
  }
}

// 流式聊天API调用函数（用于实时响应）
export async function sendChatMessageStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onReasoning?: (reasoning: string) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  // 检查是否有可用的API配置
  if (!hasAnyAPIConfig()) {
    throw new Error('NO_API_CONFIG');
  }

  const config = getFirstAvailableConfig();
  if (!config) {
    throw new Error('NO_VALID_CONFIG');
  }

  let url: string;
  let headers: Record<string, string>;
  let body: any;

  switch (config.provider) {
    case 'openai':
      url = `${config.baseUrl}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      };
      body = {
        model: config.model || 'gpt-4o-mini',
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      };
      break;
    case 'deepseek':
      url = `${config.baseUrl}/chat/completions`;
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      };
      body = {
        model: config.model || 'deepseek-chat',
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4000
      };
      break;
    default:
      // 对于不支持流式的API，回退到非流式调用
      const response = await sendChatMessage(messages, abortSignal);
      onChunk(response.content);
      if (response.reasoning && onReasoning) {
        onReasoning(response.reasoning);
      }
      return;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: abortSignal
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            const reasoning = parsed.choices[0]?.delta?.reasoning;

            if (content) {
              onChunk(content);
            }
            if (reasoning && onReasoning) {
              onReasoning(reasoning);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// 智能路由API调用函数（非流式）
export async function sendChatMessageSmart(
  messages: ChatMessageWithFiles[],
  abortSignal?: AbortSignal
): Promise<ChatResponse> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('AUTHENTICATION_REQUIRED');
  }

  // 获取 Supabase 项目信息
  const { projectId } = await import('./supabase/info');
  const supabaseUrl = `https://${projectId}.supabase.co`;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/chat-smart`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        stream: false
      }),
      signal: abortSignal
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Smart Router API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content || data.message || '抱歉，没有收到有效响应。',
    reasoning: data.reasoning
  };
}

// 智能路由API调用函数（流式）
export async function sendChatMessageSmartStream(
  messages: ChatMessageWithFiles[],
  onChunk: (chunk: string) => void,
  onReasoning?: (reasoning: string) => void,
  abortSignal?: AbortSignal
): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('AUTHENTICATION_REQUIRED');
  }

  // 获取 Supabase 项目信息
  const { projectId } = await import('./supabase/info');
  const supabaseUrl = `https://${projectId}.supabase.co`;

  const response = await fetch(
    `${supabaseUrl}/functions/v1/make-server-43636d2b/chat-smart`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages,
        stream: true
      }),
      signal: abortSignal
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Smart Router API Error: ${response.status} - ${error}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            
            // 处理不同的响应格式
            const content = parsed.content || parsed.delta?.content || parsed.choices?.[0]?.delta?.content;
            const reasoning = parsed.reasoning || parsed.delta?.reasoning || parsed.choices?.[0]?.delta?.reasoning;

            if (content) {
              onChunk(content);
            }
            if (reasoning && onReasoning) {
              onReasoning(reasoning);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}