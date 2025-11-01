import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Plus, 
  MessageSquare, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Paperclip,
  Mic,
  X,
  Brain,
  Lightbulb,
  Zap,
  Target,
  Trash2,
  Search,
  BookOpen,
  CheckCircle,
  BarChart3,
  StopCircle,
  RotateCcw
} from 'lucide-react';
import { AILogo } from '../AILogo';
import { EnhancedMessageRenderer } from '../EnhancedMessageRenderer';
import { motion, AnimatePresence } from 'framer-motion';
import { sendChatMessageStream, sendChatMessageSmartStream, ChatMessage, ChatMessageWithFiles } from '../../utils/apiClient';
import { hasAnyAPIConfig } from '../../utils/apiConfig';

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url?: string;
  data?: string; // base64 data
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning_content?: string; // DeepSeek Reasoner 思考过程
  files?: UploadedFile[]; // 附件文件
  id?: string; // 消息唯一ID，用于优化渲染
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

interface ReasoningStep {
  title: string;
  content: string;
  timestamp: number;
}

interface ReasoningStats {
  totalTokens: number;
  reasoningTokens: number;
  duration: number; // 秒
  steps: number;
}

const STORAGE_KEY = 'nebulix_chat_sessions';

export function ChatPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]); // 选中的文件
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [currentReasoning, setCurrentReasoning] = useState(''); // 当前推理过程
  const [reasoningSteps, setReasoningSteps] = useState<ReasoningStep[]>([]); // 推理步骤
  const [reasoningStats, setReasoningStats] = useState<ReasoningStats | null>(null); // 统计信息
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const reasoningStartTime = useRef<number>(0); // 推理开始时间
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // 消息容器ref
  const abortControllerRef = useRef<AbortController | null>(null); // 用于中断请求
  const [lastUserMessage, setLastUserMessage] = useState<string>(''); // 保存最后一条用户消息，用于重新生成

  // 自动滚动到底部
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  // 创建新会话 - 定义在前面以便 useEffect 使用
  const createNewSession = useCallback(() => {
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: '新对话',
      messages: [],
      timestamp: Date.now()
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsResearchOpen(false);
  }, []);

  // 从本地存储加载对话历史
  useEffect(() => {
    const loadSessionsFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const sessions = JSON.parse(stored);
          if (sessions.length === 0) {
            createNewSession();
          } else {
            setChatSessions(sessions);
            setCurrentSessionId(sessions[0].id);
          }
        } else {
          createNewSession();
        }
      } catch (error) {
        console.error('Failed to load sessions from storage:', error);
        createNewSession();
      }
    };

    loadSessionsFromStorage();
  }, [createNewSession]);

  // 自动保存对话记录到本地存储（防抖）
  useEffect(() => {
    if (chatSessions.length === 0) {
      return;
    }

    const saveSessionsToStorage = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chatSessions));
        console.log(`Saved ${chatSessions.length} chat sessions to local storage`);
      } catch (error) {
        console.error('Failed to save sessions to storage:', error);
      }
    };

    // 防抖：延迟1秒后保存，避免频繁操作
    const timer = setTimeout(saveSessionsToStorage, 1000);
    return () => clearTimeout(timer);
  }, [chatSessions]);

  // 自动滚动到底部 - 流式输出时持续滚动
  useEffect(() => {
    if (currentResponse || currentReasoning || reasoningSteps.length > 0) {
      scrollToBottom('smooth');
    }
  }, [currentResponse, currentReasoning, reasoningSteps]);

  // 当消息列表更新时自动滚动（仅在加载中或有新消息时）
  useEffect(() => {
    const currentSession = chatSessions.find(s => s.id === currentSessionId);
    const currentMessages = currentSession?.messages || [];
    if (currentMessages.length > 0 && (isLoading || currentResponse)) {
      // 延迟滚动，确保DOM已更新
      requestAnimationFrame(() => {
        scrollToBottom('smooth');
      });
    }
  }, [chatSessions, currentSessionId, isLoading, currentResponse]);

  // 获取当前会话
  const getCurrentSession = (): ChatSession | undefined => {
    return chatSessions.find(s => s.id === currentSessionId);
  };

  // 获取当前会话的消息列表
  const getCurrentMessages = (): Message[] => {
    const session = getCurrentSession();
    return session?.messages || [];
  };

  // 更新会话标题（根据首条消息自动生成）
  const updateSessionTitle = (sessionId: string, firstUserMessage: string) => {
    setChatSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, title: firstUserMessage.slice(0, 30) }
          : session
      )
    );
  };

  // 更新会话消息
  const updateSessionMessages = (sessionId: string, messages: Message[]) => {
    setChatSessions(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, messages, timestamp: Date.now() }
          : session
      )
    );
  };

  // 删除会话
  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setChatSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      // 如果删除的是当前会话，切换到第一个或创建新会话
      if (sessionId === currentSessionId) {
        if (filtered.length > 0) {
          setCurrentSessionId(filtered[0].id);
        } else {
          createNewSession();
        }
      }
      return filtered;
    });
  };

  // 切换会话
  const switchSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentResponse('');
    setIsLoading(false);
  };

  // 解析推理步骤
  const parseReasoningSteps = (reasoningText: string): ReasoningStep[] => {
    const steps: ReasoningStep[] = [];
    const lines = reasoningText.split('\n');
    let currentStep: { title: string; content: string } | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 识别角色标题（Planner, Retriever, Reader, Reasoner, Critic, Synthesizer）
      const rolePattern = /^##\s*(🎯|🔍|📝|🧠|✅|📊)\s*(Planner|Retriever|Reader|Reasoner|Critic|Synthesizer)/i;
      const roleMatch = trimmed.match(rolePattern);
      
      if (roleMatch) {
        if (currentStep && currentStep.content.trim()) {
          steps.push({ ...currentStep, timestamp: Date.now() });
        }
        currentStep = { title: trimmed.replace(/^##\s*/, ''), content: '' };
      }
      // 检测子标题（-、•、*、数字编号）
      else if (trimmed.match(/^([-•*]|\d+\.)\s/) || trimmed.match(/^(推理步骤|证据|结论|假设|置信度|风险)/)) {
        if (currentStep) {
          currentStep.content += '\n' + trimmed;
        } else {
          currentStep = { title: '思考过程', content: trimmed };
        }
      }
      // 普通内容行
      else if (currentStep) {
        currentStep.content += ' ' + trimmed;
      } else {
        // 如果没有明确的步骤，创建一个通用步骤
        currentStep = { title: '思考过程', content: trimmed };
      }
    }
    
    if (currentStep && currentStep.content.trim()) {
      steps.push({ ...currentStep, timestamp: Date.now() });
    }
    
    // 如果没有解析到任何步骤，将整个文本作为一个步骤
    if (steps.length === 0 && reasoningText.trim()) {
      steps.push({
        title: '深度推理过程',
        content: reasoningText.trim(),
        timestamp: Date.now()
      });
    }
    
    return steps;
  };

  // 停止生成
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    
    // 如果有部分响应，保存它
    if (currentResponse) {
      const currentMessages = getCurrentMessages();
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: currentResponse + '\n\n_（生成已中断）_',
        reasoning_content: currentReasoning || undefined,
        id: `assistant-${Date.now()}-${Math.random()}`
      };
      setCurrentResponse('');
      setCurrentReasoning('');
      updateSessionMessages(currentSessionId, [...currentMessages, assistantMessage]);
    }
  };

  // 重新生成最后一条回复
  const handleRegenerate = async () => {
    const currentMessages = getCurrentMessages();
    if (currentMessages.length < 2) return; // 至少需要一条用户消息和一条助手消息
    
    // 删除最后一条助手消息
    const messagesWithoutLast = currentMessages.slice(0, -1);
    updateSessionMessages(currentSessionId, messagesWithoutLast);
    
    // 获取最后一条用户消息
    const lastUserMsg = [...messagesWithoutLast].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      // 重新发送
      await handleSend(lastUserMsg.content);
    }
  };

  // 检查API配置状态
  const checkAPIConfig = (): boolean => {
    return hasAnyAPIConfig();
  };

  // 发送消息
  const handleSend = async (messageText?: string) => {
    const question = messageText || input.trim();
    if (!question || isLoading || !currentSessionId) return;

    // 检查API配置
    if (!checkAPIConfig()) {
      const errorMessage: Message = { 
        role: 'assistant', 
        content: '⚠️ 请先配置API密钥才能使用聊天功能。\n\n您可以：\n1. 点击页面顶部的标题返回首页\n2. 选择"即时配置"快速设置API\n3. 或选择"一键配置"进行完整设置',
        id: `error-${Date.now()}`
      };
      
      const currentMessages = getCurrentMessages();
      updateSessionMessages(currentSessionId, [...currentMessages, errorMessage]);
      return;
    }

    const currentMessages = getCurrentMessages();
    const userMessage: Message = { 
      role: 'user', 
      content: question,
      files: selectedFiles.length > 0 ? selectedFiles : undefined,
      id: `user-${Date.now()}-${Math.random()}`
    };
    
    // 保存最后一条用户消息，用于重新生成
    setLastUserMessage(question);
    
    // 立即添加用户消息到当前会话
    const updatedMessages = [...currentMessages, userMessage];
    updateSessionMessages(currentSessionId, updatedMessages);
    
    // 如果是首条消息，更新会话标题
    if (currentMessages.length === 0) {
      updateSessionTitle(currentSessionId, question);
    }
    
    setInput('');
    setSelectedFiles([]); // 清空选中的文件
    setIsLoading(true);
    
    // 发送消息后立即滚动到底部
    requestAnimationFrame(() => {
      scrollToBottom('smooth');
    });
    setCurrentResponse('');
    setCurrentReasoning('');
    setReasoningSteps([]);
    setReasoningStats(null);
    
    // 开启研究模式时记录开始时间
    if (isResearchOpen) {
      reasoningStartTime.current = Date.now();
    }

    try {
      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();
      
      // 准备发送给API的消息格式（支持文件）
      const apiMessages: ChatMessageWithFiles[] = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        files: msg.files?.map(file => ({
          name: file.name,
          type: file.type,
          content: file.data || '' // base64 encoded content
        }))
      }));

      // 添加系统提示（如果开启研究模式）
      if (isResearchOpen) {
        apiMessages.unshift({
          role: 'system',
          content: '你是一个具有深度推理能力的AI助手。请详细分析用户的问题，展示你的思考过程，并提供深入的见解。'
        });
      }

      let fullResponse = '';
      let fullReasoning = '';

      // 使用智能路由流式API调用
      await sendChatMessageSmartStream(
        apiMessages,
        (chunk: string) => {
          if (abortControllerRef.current?.signal.aborted) return;
          fullResponse += chunk;
          setCurrentResponse(fullResponse);
        },
        (reasoning: string) => {
          if (abortControllerRef.current?.signal.aborted) return;
          fullReasoning += reasoning;
          setCurrentReasoning(fullReasoning);
          
          // 如果开启研究模式，模拟推理步骤
          if (isResearchOpen && reasoning) {
            const newStep = {
              title: '🧠 AI推理',
              content: reasoning,
              timestamp: Date.now()
            };
            setReasoningSteps(prev => {
              const lastStep = prev[prev.length - 1];
              if (lastStep && lastStep.title === newStep.title) {
                // 更新最后一个步骤
                return [...prev.slice(0, -1), newStep];
              } else {
                // 添加新步骤
                return [...prev, newStep];
              }
            });
          }
        },
        abortControllerRef.current.signal
      );

      // 完成响应
      if (!abortControllerRef.current?.signal.aborted) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: fullResponse,
          reasoning_content: fullReasoning || undefined,
          id: `assistant-${Date.now()}-${Math.random()}`
        };
        
        updateSessionMessages(currentSessionId, [...updatedMessages, assistantMessage]);
        setCurrentResponse('');
        setCurrentReasoning('');
        
        // 设置统计信息
        if (isResearchOpen) {
          setReasoningStats({
            totalTokens: Math.floor(fullResponse.length / 4), // 粗略估算token数
            reasoningTokens: Math.floor(fullReasoning.length / 4),
            duration: (Date.now() - reasoningStartTime.current) / 1000,
            steps: reasoningSteps.length
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorContent = '抱歉，发生了错误。';
      
      if (error instanceof Error) {
        if (error.message === 'NO_API_CONFIG') {
          errorContent = '⚠️ 请先配置API密钥才能使用聊天功能。\n\n您可以点击页面顶部的标题返回首页，然后选择"即时配置"进行设置。';
        } else if (error.message === 'NO_VALID_CONFIG') {
          errorContent = '⚠️ 没有找到有效的API配置。请检查您的API密钥是否正确。';
        } else if (error.message === 'AUTHENTICATION_REQUIRED') {
          errorContent = '⚠️ 需要登录才能使用智能路由功能。\n\n请先登录您的账户，然后重试。';
        } else if (error.message === 'REQUEST_ABORTED') {
          errorContent = '请求已被取消。';
        } else if (error.message.includes('Smart Router API Error')) {
          errorContent = `智能路由调用失败：${error.message}\n\n请检查您的网络连接和登录状态，或稍后重试。`;
        } else if (error.message.includes('API Error')) {
          errorContent = `API调用失败：${error.message}\n\n请检查您的API密钥是否正确，或稍后重试。`;
        } else {
          errorContent = `发生错误：${error.message}`;
        }
      }
      
      const errorMessage: Message = { 
        role: 'assistant', 
        content: errorContent,
        id: `error-${Date.now()}`
      };
      updateSessionMessages(currentSessionId, [...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const uploadedFile: UploadedFile = {
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target?.result as string
        };
        setSelectedFiles(prev => [...prev, uploadedFile]);
      };
      reader.readAsDataURL(file);
    });

    // 清空input
    if (event.target) {
      event.target.value = '';
    }
  };

  // 移除选中的文件
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentMessages = getCurrentMessages();

  return (
    <div className="flex h-screen bg-black">
      {/* 侧边栏 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 z-50 w-80 bg-gray-900 shadow-xl border-r border-gray-700 lg:relative lg:translate-x-0"
          >
            <div className="flex flex-col h-full">
              {/* 侧边栏头部 */}
              <div 
                 className="flex items-center justify-between p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800 transition-colors"
                 onClick={() => navigate('/config-guide')}
               >
                 <div className="flex items-center gap-3">
                   <AILogo className="w-8 h-8" />
                   <h2 className="text-lg font-semibold text-white">对话历史</h2>
                 </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 新建对话按钮 */}
              <div className="p-4 border-b border-gray-700">
                <button
                  onClick={createNewSession}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-300 hover:bg-gray-800 rounded-lg transition-colors group"
                >
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />
                  <span className="font-medium">新建对话</span>
                </button>
              </div>

              {/* 对话列表 */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-2 space-y-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors ${
                        session.id === currentSessionId
                          ? 'bg-blue-900 text-blue-300 border border-blue-700'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                      onClick={() => switchSession(session.id)}
                    >
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {session.messages.length} 条消息
                        </p>
                      </div>
                      <button
                        onClick={(e) => deleteSession(session.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            <div 
              className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 rounded-lg p-2 transition-colors"
              onClick={() => navigate('/config-guide')}
            >
              <AILogo className="w-8 h-8" />
              <div>
                <h1 className="text-lg font-semibold text-white">Nebulix Intelligence</h1>
                <p className="text-sm text-gray-400">智能对话助手</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 研究模式切换 */}
            <button
              onClick={() => setIsResearchOpen(!isResearchOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isResearchOpen
                  ? 'bg-purple-900 text-purple-300 border border-purple-700'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              深度推理
            </button>

            {/* 停止生成按钮 */}
            {isLoading && (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-3 py-2 bg-red-900 text-red-300 rounded-lg text-sm font-medium hover:bg-red-800 transition-colors"
              >
                <StopCircle className="w-4 h-4" />
                停止
              </button>
            )}

            {/* 重新生成按钮 */}
            {!isLoading && currentMessages.length > 0 && currentMessages[currentMessages.length - 1]?.role === 'assistant' && (
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                重新生成
              </button>
            )}
          </div>
        </div>

        {/* 消息区域 */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-black"
        >
          {/* 消息居中容器 */}
          <div className="max-w-full sm:max-w-[95%] md:max-w-[90%] lg:max-w-[85%] xl:max-w-[1000px] mx-auto p-4 space-y-6">
          {currentMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                欢迎使用 Nebulix Intelligence
              </h3>
              <p className="text-gray-400 mb-8 max-w-md">
                这是一个独立的智能对话组件，支持文件上传和深度推理模式。开始您的对话吧！
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
                     onClick={() => setInput('你好，请介绍一下你的功能')}>
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <span className="font-medium text-white">基础对话</span>
                  </div>
                  <p className="text-sm text-gray-400">开始一个简单的对话</p>
                </div>
                
                <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 hover:border-purple-500 transition-colors cursor-pointer"
                     onClick={() => {
                       setIsResearchOpen(true);
                       setInput('请深度分析人工智能的发展趋势');
                     }}>
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">深度推理</span>
                  </div>
                  <p className="text-sm text-gray-400">启用高级分析模式</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentMessages.map((message, index) => (
                <div key={message.id || index} className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                  {/* AI消息：头像在左侧 */}
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center flex-shrink-0">
                      <AILogo className="w-5 h-5" />
                    </div>
                  )}
                  
                  <div className={`min-w-0 ${
                    message.role === 'user' 
                      ? 'max-w-[80%] sm:max-w-[70%]' 
                      : 'max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%]'
                  }`}>
                    <div className={`${
                      message.role === 'user' 
                        ? 'bg-blue-600 rounded-2xl rounded-br-md p-4 shadow-sm' 
                        : 'py-1 px-2'
                    }`}>
                      {/* 文件附件显示 */}
                      {message.files && message.files.length > 0 && (
                        <div className={`mb-3 space-y-2 ${
                          message.role === 'user' ? '' : 'bg-gray-800/50 rounded-lg p-3'
                        }`}>
                          {message.files.map((file, fileIndex) => (
                            <div key={fileIndex} className={`flex items-center gap-2 p-2 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-blue-700/50' 
                                : 'bg-gray-800'
                            }`}>
                              <Paperclip className="w-4 h-4 text-gray-400" />
                              <span className={`text-sm ${
                                message.role === 'user' ? 'text-blue-100' : 'text-gray-300'
                              }`}>{file.name}</span>
                              <span className={`text-xs ${
                                message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className={`${
                        message.role === 'user' 
                          ? 'text-white' 
                          : 'text-gray-200 leading-relaxed'
                      } ${
                        message.role === 'assistant' 
                          ? 'break-words hyphens-auto overflow-wrap-anywhere text-left' 
                          : ''
                      }`} style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: message.role === 'assistant' ? '1.6' : '1.5'
                      }}>
                        <EnhancedMessageRenderer content={message.content} />
                      </div>
                      
                      {/* 推理内容显示 */}
                      {message.reasoning_content && (
                        <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-700">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="w-4 h-4 text-purple-400" />
                            <span className="text-sm font-medium text-purple-300">推理过程</span>
                          </div>
                          <div className="text-sm text-purple-200 leading-relaxed break-words hyphens-auto overflow-wrap-anywhere text-left" style={{
                            wordWrap: 'break-word',
                            overflowWrap: 'anywhere',
                            lineHeight: '1.5'
                          }}>
                            <EnhancedMessageRenderer content={message.reasoning_content} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 用户消息：头像在右侧 */}
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium">U</span>
                    </div>
                  )}
                </div>
              ))}
              
              {/* 当前响应（流式显示） */}
              {currentResponse && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center flex-shrink-0">
                    <AILogo className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 max-w-[95%] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[65%]">
                    <div className="py-1 px-2">
                      <div className="text-gray-200 leading-relaxed break-words hyphens-auto overflow-wrap-anywhere text-left" style={{
                        wordWrap: 'break-word',
                        overflowWrap: 'anywhere',
                        lineHeight: '1.6'
                      }}>
                        <EnhancedMessageRenderer content={currentResponse} />
                      </div>
                      <div className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1"></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          {/* 选中的文件显示 */}
          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 px-3 py-2 bg-blue-900 text-blue-300 rounded-lg text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span>{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-blue-400 hover:text-blue-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的消息..."
                className="w-full px-4 py-3 pr-12 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                disabled={isLoading}
              />
              
              {/* 文件上传按钮 */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors"
                disabled={isLoading}
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,text/*,.pdf,.doc,.docx"
              />
            </div>
            
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 推理面板 */}
      <AnimatePresence>
          {isResearchOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-gradient-to-b from-gray-900 to-gray-800 text-white overflow-hidden"
            >
              <div className="h-full flex flex-col">
                {/* 推理面板头部 */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <h3 className="font-semibold">深度推理</h3>
                    </div>
                    <button
                      onClick={() => setIsResearchOpen(false)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-400">
                    实时显示 AI 的思考过程和推理步骤
                  </p>
                </div>

                {/* 推理内容 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* 统计信息 */}
                  {reasoningStats && (
                    <div className="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="block mb-1">推理时长</span>
                          <span className="text-white">
                            {reasoningStats.duration.toFixed(1)}s
                          </span>
                        </div>
                        <div>
                          <span className="block mb-1">推理步骤</span>
                          <span className="text-white">
                            {reasoningStats?.steps || reasoningSteps.length || 0}
                          </span>
                        </div>
                        <div>
                          <span className="block mb-1">总 Tokens</span>
                          <span className="text-white">
                            {reasoningStats?.totalTokens 
                              ? reasoningStats.totalTokens.toLocaleString()
                              : '计算中...'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="block mb-1">推理 Tokens</span>
                          <span className="text-white">
                            {reasoningStats?.reasoningTokens 
                              ? reasoningStats.reasoningTokens.toLocaleString()
                              : '计算中...'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 推理链条 */}
                  {reasoningSteps.length > 0 && (
                    <div className="space-y-0">
                      {reasoningSteps.map((step, index) => (
                        <motion.div 
                          key={index} 
                          className="relative"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ 
                            delay: index * 0.1,
                            duration: 0.3,
                            ease: [0.22, 1, 0.36, 1]
                          }}
                        >
                          {/* 连接线 */}
                          {index > 0 && (
                            <div className="absolute left-0 top-0 w-px h-4 bg-white/10"></div>
                          )}
                          
                          {/* 步骤内容 */}
                          <div className="pb-6">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0 mt-1.5"></div>
                              <div className="text-xs text-white flex-1">
                                <EnhancedMessageRenderer content={step.title} />
                              </div>
                            </div>
                            {step.content && (
                              <div className="ml-3.5 pl-3 border-l border-white/10">
                                <div className="text-xs text-gray-400 leading-relaxed">
                                  <EnhancedMessageRenderer content={step.content} />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 箭头连接到下一步 */}
                          {index < reasoningSteps.length - 1 && (
                            <div className="absolute left-0 bottom-0 w-px h-6 bg-white/10">
                              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-white/10"></div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* 当前推理内容（流式显示） */}
                  {currentReasoning && (
                    <div className="relative">
                      {reasoningSteps.length > 0 && (
                        <div className="absolute left-0 top-0 w-px h-4 bg-white/10"></div>
                      )}
                      <div className="pb-6">
                        <div className="flex items-start gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-1.5 animate-pulse"></div>
                          <h4 className="text-xs text-white">思考中...</h4>
                        </div>
                        <div className="ml-3.5 pl-3 border-l border-white/10">
                          <div className="text-xs text-gray-300 leading-relaxed">
                            <EnhancedMessageRenderer content={currentReasoning} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 加载状态 */}
                  {isLoading && !currentReasoning && !reasoningSteps.length && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></div>
                        <p className="text-xs text-gray-400">初始化推理引擎...</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></div>
                        <p className="text-xs text-gray-400">分析问题结构...</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"></div>
                        <p className="text-xs text-gray-400">检索相关信息...</p>
                      </div>
                    </div>
                  )}

                  {/* 空状态 */}
                  {!isLoading && !currentReasoning && !reasoningSteps.length && !reasoningStats && (
                    <div className="text-center py-12">
                      <p className="text-sm text-gray-500 mb-2">思考链待命</p>
                      <p className="text-xs text-gray-600">
                        发送消息开启深度推理
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
