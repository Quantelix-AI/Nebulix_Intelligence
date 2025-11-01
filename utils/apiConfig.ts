// API配置管理工具
export interface APIConfig {
  provider: 'openai' | 'deepseek' | 'anthropic' | 'gemini';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface StoredAPIConfigs {
  [key: string]: APIConfig;
}

const STORAGE_KEY = 'nebulix_api_configs';
const ENCRYPTION_KEY = 'nebulix_secure_key_2024';

// 简单的加密/解密函数
function simpleEncrypt(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
    );
  }
  return btoa(result);
}

function simpleDecrypt(encrypted: string): string {
  try {
    const text = atob(encrypted);
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return result;
  } catch {
    return '';
  }
}

// 保存API配置
export function saveAPIConfig(config: APIConfig): void {
  try {
    const existingConfigs = getAPIConfigs();
    existingConfigs[config.provider] = config;
    
    const encrypted = simpleEncrypt(JSON.stringify(existingConfigs));
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to save API config:', error);
  }
}

// 获取所有API配置
export function getAPIConfigs(): StoredAPIConfigs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const decrypted = simpleDecrypt(stored);
    return JSON.parse(decrypted) || {};
  } catch (error) {
    console.error('Failed to load API configs:', error);
    return {};
  }
}

// 获取特定提供商的配置
export function getAPIConfig(provider: APIConfig['provider']): APIConfig | null {
  const configs = getAPIConfigs();
  return configs[provider] || null;
}

// 删除API配置
export function removeAPIConfig(provider: APIConfig['provider']): void {
  try {
    const configs = getAPIConfigs();
    delete configs[provider];
    
    const encrypted = simpleEncrypt(JSON.stringify(configs));
    localStorage.setItem(STORAGE_KEY, encrypted);
  } catch (error) {
    console.error('Failed to remove API config:', error);
  }
}

// 清除所有配置
export function clearAllAPIConfigs(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API configs:', error);
  }
}

// 验证API密钥格式
export function validateAPIKey(provider: APIConfig['provider'], apiKey: string): boolean {
  if (!apiKey || apiKey.trim().length === 0) return false;
  
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'deepseek':
      return apiKey.startsWith('sk-') && apiKey.length > 20;
    case 'anthropic':
      return apiKey.startsWith('sk-ant-') && apiKey.length > 30;
    case 'gemini':
      return apiKey.length > 20; // Google API keys don't have a specific prefix
    default:
      return apiKey.length > 10;
  }
}

// 获取默认模型
export function getDefaultModel(provider: APIConfig['provider']): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4o-mini';
    case 'deepseek':
      return 'deepseek-chat';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'gemini':
      return 'gemini-pro';
    default:
      return '';
  }
}

// 获取默认Base URL
export function getDefaultBaseUrl(provider: APIConfig['provider']): string {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1';
    default:
      return '';
  }
}

// 检查是否有任何配置
export function hasAnyAPIConfig(): boolean {
  const configs = getAPIConfigs();
  return Object.keys(configs).length > 0;
}

// 获取第一个可用的配置
export function getFirstAvailableConfig(): APIConfig | null {
  const configs = getAPIConfigs();
  const providers = Object.keys(configs);
  return providers.length > 0 ? configs[providers[0]] : null;
}