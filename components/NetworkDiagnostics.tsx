import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, XCircle, WifiOff } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';

interface DiagnosticResult {
  name: string;
  status: 'checking' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function NetworkDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [overallStatus, setOverallStatus] = useState<'checking' | 'healthy' | 'issues'>('checking');

  const updateResult = (name: string, status: DiagnosticResult['status'], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name);
      if (existing) {
        return prev.map(r => r.name === name ? { name, status, message, details } : r);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setResults([]);
    setOverallStatus('checking');

    // 1. 检查配置
    updateResult('config', 'checking', '检查配置...', '');
    if (!projectId || !publicAnonKey) {
      updateResult('config', 'error', '配置缺失', 'Project ID 或 Anon Key 未设置');
      setOverallStatus('issues');
      return;
    }
    updateResult('config', 'success', '配置正常', `Project: ${projectId}`);

    // 2. 检查认证
    updateResult('auth', 'checking', '检查认证状态...', '');
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        updateResult('auth', 'error', '认证检查失败', error.message);
      } else if (session && session.user) {
        updateResult('auth', 'success', '已登录', session.user.email || '用户已认证');
      } else {
        updateResult('auth', 'warning', '未登录', '需要登录才能使用聊天功能');
      }
    } catch (error) {
      updateResult('auth', 'error', '认证系统错误', error instanceof Error ? error.message : '未知错误');
    }

    // 3. 检查健康端点
    updateResult('health', 'checking', '检查服务器连接...', '');
    try {
      const healthUrl = `https://${projectId}.supabase.co/functions/v1/make-server-43636d2b/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        updateResult('health', 'success', '服务器在线', `状态: ${data.status}`);
      } else {
        updateResult('health', 'error', '服务器响应异常', `HTTP ${response.status}`);
        setOverallStatus('issues');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateResult('health', 'error', '服务器超时', '连接超时（5秒）');
      } else {
        updateResult('health', 'error', '无法连接服务器', 'Edge Function 可能未部署');
      }
      setOverallStatus('issues');
    }

    // 4. 检查会话端点（如果已登录）
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      updateResult('sessions', 'checking', '测试会话API...', '');
      try {
        const sessionsUrl = `https://${projectId}.supabase.co/functions/v1/make-server-43636d2b/chat-sessions`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(sessionsUrl, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          updateResult('sessions', 'success', '会话API正常', `已加载 ${data.sessions?.length || 0} 个会话`);
        } else {
          updateResult('sessions', 'error', '会话API异常', `HTTP ${response.status}`);
          setOverallStatus('issues');
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          updateResult('sessions', 'error', 'API超时', '连接超时（5秒）');
        } else {
          updateResult('sessions', 'error', 'API请求失败', error instanceof Error ? error.message : '未知错误');
        }
        setOverallStatus('issues');
      }
    }

    // 设置最终状态
    if (overallStatus === 'checking') {
      setOverallStatus('healthy');
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostics();
    }
  }, [isOpen]);

  // 监听快捷键 Ctrl+K+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否按下 Ctrl+K+E
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        // 等待下一个按键
        const handleNextKey = (nextE: KeyboardEvent) => {
          if (nextE.key === 'e' || nextE.key === 'E') {
            nextE.preventDefault();
            setIsOpen(prev => !prev);
          }
          document.removeEventListener('keydown', handleNextKey);
        };
        document.addEventListener('keydown', handleNextKey);
        // 500ms后移除监听器
        setTimeout(() => {
          document.removeEventListener('keydown', handleNextKey);
        }, 500);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'checking':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
    }
  };

  const hasIssues = results.some(r => r.status === 'error');

  return (
    <>
      {/* 诊断面板 - 使用快捷键 Ctrl+K+E 打开 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* 头部 */}
          <div className="bg-zinc-800 px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">系统诊断</h3>
                <p className="text-xs text-gray-400 mt-0.5">快捷键: Ctrl+K+E</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runDiagnostics()}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  重新检测
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 诊断结果 */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>正在诊断...</span>
              </div>
            ) : (
              results.map((result, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className={`text-sm ${getStatusColor(result.status)}`}>
                      {result.message}
                    </span>
                  </div>
                  {result.details && (
                    <p className="text-xs text-gray-500 ml-6">{result.details}</p>
                  )}
                </div>
              ))
            )}

            {/* 错误提示 */}
            {hasIssues && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded">
                <p className="text-xs text-red-400 mb-2">
                  ⚠️ 检测到连接问题。可能的原因：
                </p>
                <ul className="text-xs text-gray-400 space-y-1 ml-4 list-disc">
                  <li>Edge Function 未部署</li>
                  <li>网络连接异常</li>
                  <li>服务器维护中</li>
                </ul>
                <a
                  href="/NETWORK_ERROR_TROUBLESHOOTING.md"
                  target="_blank"
                  className="text-xs text-blue-400 hover:text-blue-300 underline mt-2 inline-block"
                >
                  查看详细排查指南 →
                </a>
              </div>
            )}

            {/* 成功状态 */}
            {!hasIssues && results.length > 0 && overallStatus === 'healthy' && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                <p className="text-xs text-green-400">
                  ✅ 所有系统正常运行
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      )}
    </>
  );
}
