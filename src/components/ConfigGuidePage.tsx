import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { 
  ArrowLeft, 
  Book, 
  Settings, 
  Search, 
  Menu, 
  Copy, 
  Check,
  Zap,
  MessageSquare
} from 'lucide-react'
import OneClickSetup from './OneClickSetup'

interface ConfigGuidePageProps {}

const ConfigGuidePage: React.FC<ConfigGuidePageProps> = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState<'supabase' | 'environment' | 'oneclick'>('oneclick')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [supabaseContent, setSupabaseContent] = useState('')
  const [environmentContent, setEnvironmentContent] = useState('')

  // 根据路径设置默认活动选项卡
  useEffect(() => {
    if (location.pathname === '/setup') {
      setActiveSection('oneclick')
    } else {
      setActiveSection('supabase')
    }
  }, [location.pathname])

  // 模拟加载Markdown内容（实际项目中可以从API或文件加载）
  useEffect(() => {
    // 这里我们将直接嵌入内容，避免需要额外的文件加载逻辑
    setSupabaseContent(`# Supabase 配置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并注册账户
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - **Name**: ai-fork
   - **Database Password**: 设置一个强密码
   - **Region**: 选择离你最近的区域

## 2. 获取项目配置

项目创建完成后，在项目设置中获取以下信息：

### API 设置
- 进入 **Settings** → **API**
- 复制 **Project URL**
- 复制 **anon public** key

### 环境变量配置

将以下信息添加到你的 \`.env\` 文件：

\`\`\`env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
\`\`\`

## 3. 数据库设置

### 创建用户资料表

\`\`\`sql
-- 创建用户资料表
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "用户可以查看自己的资料" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的资料" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
\`\`\`

### 创建聊天会话表

\`\`\`sql
-- 创建聊天会话表
CREATE TABLE chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "用户只能访问自己的会话" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);
\`\`\`

### 创建消息表

\`\`\`sql
-- 创建消息表
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 创建策略
CREATE POLICY "用户只能访问自己会话的消息" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );
\`\`\`

## 4. 认证设置

### 启用邮箱认证

1. 进入 **Authentication** → **Settings**
2. 在 **Auth Providers** 中启用 **Email**
3. 配置邮箱模板（可选）

### 配置 OAuth 提供商（可选）

如果需要第三方登录，可以配置：

#### Google OAuth
1. 在 **Auth Providers** 中启用 **Google**
2. 在 [Google Cloud Console](https://console.cloud.google.com/) 创建 OAuth 应用
3. 将客户端 ID 和密钥添加到 Supabase

#### GitHub OAuth
1. 在 **Auth Providers** 中启用 **GitHub**
2. 在 GitHub Settings → Developer settings → OAuth Apps 创建应用
3. 将客户端 ID 和密钥添加到 Supabase

## 5. Edge Functions 部署

### 安装 Supabase CLI

\`\`\`bash
npm install -g @supabase/cli
\`\`\`

### 登录并链接项目

\`\`\`bash
supabase login
supabase link --project-ref your_project_ref
\`\`\`

### 部署 Edge Functions

\`\`\`bash
supabase functions deploy
\`\`\`

## 6. 权限配置

确保为匿名和认证用户授予适当的权限：

\`\`\`sql
-- 为匿名用户授予基本读取权限
GRANT SELECT ON user_profiles TO anon;

-- 为认证用户授予完整权限
GRANT ALL PRIVILEGES ON user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON chat_sessions TO authenticated;
GRANT ALL PRIVILEGES ON messages TO authenticated;
\`\`\`

## 7. 测试连接

创建一个简单的测试文件来验证连接：

\`\`\`javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your_project_url'
const supabaseKey = 'your_anon_key'
const supabase = createClient(supabaseUrl, supabaseKey)

// 测试连接
async function testConnection() {
  const { data, error } = await supabase.from('user_profiles').select('*').limit(1)
  if (error) {
    console.error('连接失败:', error)
  } else {
    console.log('连接成功:', data)
  }
}

testConnection()
\`\`\`

## 故障排除

### 常见问题

1. **权限被拒绝错误**
   - 检查 RLS 策略是否正确配置
   - 确保用户已正确认证

2. **连接超时**
   - 检查网络连接
   - 验证 Supabase URL 和密钥

3. **数据库错误**
   - 检查 SQL 语法
   - 验证表结构和关系

### 获取帮助

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase Discord 社区](https://discord.supabase.com)
- [GitHub Issues](https://github.com/Quantelix-AI/-Nebulix_Intelligence/issues)`)

    setEnvironmentContent(`# 环境变量配置指南

## 快速开始

1. 复制 \`.env.example\` 文件为 \`.env\`
2. 根据以下指南填写相应的环境变量
3. 重启开发服务器

## 必需的环境变量

### Supabase 配置

\`\`\`env
# Supabase 项目 URL
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase 匿名密钥
VITE_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

**获取方式：**
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 Settings → API
4. 复制 Project URL 和 anon public key

### API 基础配置

\`\`\`env
# API 基础 URL（通常与 Supabase URL 相同）
VITE_API_BASE_URL=https://your-project-ref.supabase.co
\`\`\`

## 可选的环境变量

### 应用程序设置

\`\`\`env
# 应用名称
VITE_APP_NAME=Nebulix Intelligence

# 应用版本
VITE_APP_VERSION=0.1.0

# 开发模式
VITE_DEV_MODE=true
\`\`\`

### 文件上传配置

\`\`\`env
# 文件上传大小限制（字节）
VITE_MAX_FILE_SIZE=10485760

# 允许的文件类型
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,text/plain,application/pdf
\`\`\`

### AI 模型配置

\`\`\`env
# 默认 AI 模型
VITE_DEFAULT_AI_MODEL=gpt-3.5-turbo

# 最大 token 数
VITE_MAX_TOKENS=2048
\`\`\`

### 网络诊断

\`\`\`env
# 启用网络诊断
VITE_ENABLE_NETWORK_DIAGNOSTICS=false

# 诊断端点
VITE_DIAGNOSTICS_ENDPOINT=https://httpbin.org/status/200
\`\`\`

## Edge Functions 环境变量

如果你使用 Supabase Edge Functions，需要配置以下变量：

\`\`\`env
# OpenAI API 密钥（用于 AI 功能）
OPENAI_API_KEY=sk-your-openai-api-key

# Supabase 服务角色密钥（仅在服务端使用）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### OAuth 配置（可选）

如果启用了第三方登录：

\`\`\`env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# GitHub OAuth
VITE_GITHUB_CLIENT_ID=your-github-client-id
\`\`\`

## 环境特定配置

### 开发环境

\`\`\`env
# 开发环境配置
NODE_ENV=development
VITE_DEV_MODE=true
VITE_ENABLE_NETWORK_DIAGNOSTICS=true
\`\`\`

### 生产环境

\`\`\`env
# 生产环境配置
NODE_ENV=production
VITE_DEV_MODE=false
VITE_ENABLE_NETWORK_DIAGNOSTICS=false
\`\`\`

## 安全注意事项

### 🔒 重要安全提示

1. **永远不要提交 \`.env\` 文件到版本控制**
2. **使用 \`VITE_\` 前缀的变量会暴露给客户端**
3. **敏感信息（如 service role key）只能在服务端使用**

### 环境变量分类

| 类型 | 前缀 | 用途 | 安全级别 |
|------|------|------|----------|
| 客户端 | \`VITE_\` | 前端应用 | 公开 |
| 服务端 | 无前缀 | Edge Functions | 私密 |

## 验证配置

创建一个配置验证脚本：

\`\`\`javascript
// scripts/verify-env.js
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
]

const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingVars.length > 0) {
  console.error('❌ 缺少必需的环境变量:')
  missingVars.forEach(varName => {
    console.error(\`  - \${varName}\`)
  })
  process.exit(1)
} else {
  console.log('✅ 所有必需的环境变量都已配置')
}
\`\`\`

运行验证：

\`\`\`bash
node scripts/verify-env.js
\`\`\`

## 故障排除

### 常见问题

1. **环境变量未生效**
   - 确保变量名以 \`VITE_\` 开头（客户端变量）
   - 重启开发服务器
   - 检查 \`.env\` 文件位置（应在项目根目录）

2. **Supabase 连接失败**
   - 验证 URL 格式：\`https://xxx.supabase.co\`
   - 检查 anon key 是否正确
   - 确保项目处于活跃状态

3. **文件上传失败**
   - 检查文件大小限制
   - 验证文件类型配置
   - 确保 Supabase Storage 已配置

### 调试技巧

1. **查看环境变量**
   \`\`\`javascript
   console.log('Environment:', {
     supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
     hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
   })
   \`\`\`

2. **测试 Supabase 连接**
   \`\`\`javascript
   import { createClient } from '@supabase/supabase-js'
   
   const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY
   )
   
   // 测试连接
   supabase.from('user_profiles').select('count').then(console.log)
   \`\`\`

## 示例配置文件

### 完整的 .env 示例

\`\`\`env
# ===========================================
# Supabase 配置（必需）
# ===========================================
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# 应用配置
# ===========================================
VITE_APP_NAME=Nebulix Intelligence
VITE_APP_VERSION=0.1.0
VITE_API_BASE_URL=https://abcdefghijklmnop.supabase.co

# ===========================================
# 功能配置
# ===========================================
VITE_DEV_MODE=true
VITE_MAX_FILE_SIZE=10485760
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,text/plain,application/pdf
VITE_DEFAULT_AI_MODEL=gpt-3.5-turbo
VITE_MAX_TOKENS=2048

# ===========================================
# 诊断配置
# ===========================================
VITE_ENABLE_NETWORK_DIAGNOSTICS=false
VITE_DIAGNOSTICS_ENDPOINT=https://httpbin.org/status/200

# ===========================================
# OAuth 配置（可选）
# ===========================================
# VITE_GOOGLE_CLIENT_ID=your-google-client-id
# VITE_GITHUB_CLIENT_ID=your-github-client-id
\`\`\``)
  }, [])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  const filteredContent = (content: string) => {
    if (!searchTerm) return content
    const lines = content.split('\n')
    const filteredLines = lines.filter(line => 
      line.toLowerCase().includes(searchTerm.toLowerCase())
    )
    return filteredLines.join('\n')
  }

  const sections = [
    { id: 'oneclick' as const, title: '一键配置', icon: Zap },
    { id: 'supabase' as const, title: 'Supabase 配置', icon: Settings },
    { id: 'environment' as const, title: '环境变量', icon: Book }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* 头部导航 */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold text-white text-center">配置指南</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* 搜索框 */}
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索内容..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                />
              </div>
              
              {/* 稍后配置按钮 */}
              <button
                onClick={() => navigate('/chat')}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                title="跳过配置，直接进入对话页面"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">稍后配置</span>
              </button>
              
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容容器 - 优化居中布局 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8 justify-center">
          {/* 侧边栏 - 优化对齐 */}
          <aside className={`w-64 flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden'} md:block`}>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-white mb-4 text-center">目录</h2>
              <nav className="space-y-2">
                {sections.map((section) => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center justify-center space-x-3 px-3 py-2 rounded-lg text-center transition-colors ${
                        activeSection === section.id
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{section.title}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* 主内容区 - 优化居中布局 */}
          <main className="flex-1 min-w-0 max-w-4xl mx-auto">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-8 text-center">
              {activeSection === 'oneclick' ? (
                <div className="flex justify-center">
                  <OneClickSetup />
                </div>
              ) : (
                <div className="prose prose-invert prose-lg max-w-none text-center mx-auto">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const codeString = String(children).replace(/\n$/, '')
                    const codeId = `code-${Math.random().toString(36).substr(2, 9)}`
                    
                    return !inline && match ? (
                      <div className="relative group my-6 mx-auto max-w-4xl">
                        <button
                          onClick={() => copyToClipboard(codeString, codeId)}
                          className="absolute top-3 right-3 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title="复制代码"
                        >
                          {copiedCode === codeId ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-300" />
                          )}
                        </button>
                        <SyntaxHighlighter
                          style={oneDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            margin: '0 auto',
                            borderRadius: '0.75rem',
                            background: 'rgba(17, 24, 39, 0.8)',
                            border: '1px solid rgba(75, 85, 99, 0.3)',
                            padding: '1.5rem',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                            textAlign: 'left'
                          }}
                          codeTagProps={{
                            style: {
                              fontSize: '0.875rem',
                              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                            }
                          }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    ) : (
                      <code className="bg-gray-700/60 px-2 py-1 rounded-md text-sm font-mono text-gray-200 border border-gray-600/30" {...props}>
                        {children}
                      </code>
                    )
                      },
                      h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-white mb-8 mt-0 border-b border-gray-600/50 pb-4 leading-tight text-center">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold text-white mt-12 mb-6 leading-tight text-center">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-xl font-medium text-white mt-8 mb-4 leading-tight text-center">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-lg font-medium text-white mt-6 mb-3 leading-tight text-center">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => (
                        <p className="text-gray-300 leading-relaxed mb-6 text-base text-center mx-auto max-w-3xl">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-gray-300 space-y-3 mb-6 mx-auto max-w-3xl list-none text-center">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="text-gray-300 space-y-3 mb-6 mx-auto max-w-3xl list-decimal text-center">
                          {children}
                        </ol>
                      ),
                      li: ({ children, ...props }) => {
                        const isOrdered = props.ordered;
                        return (
                          <li className={`leading-relaxed text-center mx-auto ${isOrdered ? 'list-decimal' : 'relative'}`}>
                            {!isOrdered && (
                              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                            )}
                            <span className="text-gray-300">{children}</span>
                          </li>
                        )
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-6 bg-gray-800/30 rounded-r-lg italic mx-auto max-w-3xl text-center">
                          <div className="text-gray-300">
                            {children}
                          </div>
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-8 rounded-lg border border-gray-600/30 mx-auto max-w-4xl">
                          <table className="min-w-full bg-gray-800/20 mx-auto">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-700/50">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-gray-600/30">
                          {children}
                        </tbody>
                      ),
                      tr: ({ children }) => (
                        <tr className="hover:bg-gray-700/20 transition-colors">
                          {children}
                        </tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-6 py-4 text-center text-sm font-semibold text-white border-b border-gray-600/30">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-6 py-4 text-sm text-gray-300 border-b border-gray-600/20 text-center">
                          {children}
                        </td>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-white">
                          {children}
                        </strong>
                      ),
                      em: ({ children }) => (
                        <em className="italic text-gray-200">
                          {children}
                        </em>
                      ),
                      a: ({ children, href }) => (
                        <a 
                          href={href} 
                          className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50 hover:decoration-blue-300 transition-colors"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      ),
                      hr: () => (
                        <hr className="my-8 border-gray-600/50 mx-auto max-w-3xl" />
                      ),
                    }}
                  >
                    {filteredContent(activeSection === 'supabase' ? supabaseContent : environmentContent)}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default ConfigGuidePage