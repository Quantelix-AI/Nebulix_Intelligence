/**
 * 跨浏览器的剪贴板复制工具函数
 * 支持现代 Clipboard API 和传统 execCommand 降级方案
 */

export async function copyToClipboard(text: string): Promise<boolean> {
  // 方案1：尝试使用现代 Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn('Clipboard API 失败，尝试降级方案:', error);
      // 继续尝试降级方案
    }
  }

  // 方案2：使用传统的 execCommand 方法
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 设置样式，使其不可见且不影响布局
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    // 尝试复制
    const successful = document.execCommand('copy');
    
    // 清理
    document.body.removeChild(textArea);
    
    if (!successful) {
      throw new Error('execCommand 返回 false');
    }
    
    return true;
  } catch (error) {
    console.error('所有复制方案都失败了:', error);
    return false;
  }
}

/**
 * 带有用户反馈的复制函数
 * @param text 要复制的文本
 * @param onSuccess 成功回调
 * @param onError 失败回调
 */
export async function copyWithFeedback(
  text: string,
  onSuccess?: () => void,
  onError?: (error: string) => void
): Promise<void> {
  const success = await copyToClipboard(text);
  
  if (success) {
    onSuccess?.();
  } else {
    const errorMessage = '复制失败，请手动复制内容';
    onError?.(errorMessage);
  }
}
