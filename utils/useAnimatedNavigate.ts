import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useAnimatedNavigate() {
  const navigate = useNavigate();

  const animatedNavigate = useCallback((path: string, options?: { replace?: boolean }) => {
    // 立即滚动到顶部
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // 添加轻微延迟以确保点击动画完成
    setTimeout(() => {
      navigate(path, options);
    }, 100);
  }, [navigate]);

  return animatedNavigate;
}
