import React, { useState, useEffect } from 'react'
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Copy, 
  Download, 
  Settings, 
  Database, 
  Key, 
  Globe, 
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  Server
} from 'lucide-react'

type DatabaseType = 'supabase' | 'mysql'

interface SetupConfig {
  // 数据库类型选择
  databaseType: DatabaseType
  
  // Supabase 配置
  supabaseUrl: string
  supabaseAnonKey: string
  
  // MySQL 配置
  mysqlHost: string
  mysqlPort: string
  mysqlUsername: string
  mysqlPassword: string
  mysqlDatabase: string
  mysqlSsl: boolean
  
  // AI 模型配置
  deepseekApiKey: string
  defaultModel: string
  maxTokens: string
  
  // 应用配置
  appName: string
  appVersion: string
  developmentMode: boolean
  
  // 文件上传配置
  maxFileSize: string
  allowedFileTypes: string
  
  // OAuth 配置 (可选)
  googleClientId: string
  googleClientSecret: string
  githubClientId: string
  githubClientSecret: string
  
  // 其他配置
  enableNetworkDiagnostics: boolean
}

interface OneClickSetupProps {
  onComplete?: (config: SetupConfig) => void
}

const OneClickSetup: React.FC<OneClickSetupProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0) // 从0开始，第一步是数据库类型选择
  const [config, setConfig] = useState<SetupConfig>({
    databaseType: 'supabase',
    supabaseUrl: '',
    supabaseAnonKey: '',
    mysqlHost: 'localhost',
    mysqlPort: '3306',
    mysqlUsername: '',
    mysqlPassword: '',
    mysqlDatabase: '',
    mysqlSsl: false,
    deepseekApiKey: '',
    defaultModel: 'deepseek-chat',
    maxTokens: '4000',
    appName: 'Nebulix Intelligence',
    appVersion: '0.1.0',
    developmentMode: true,
    maxFileSize: '10485760',
    allowedFileTypes: 'image/*,text/*,application/pdf',
    googleClientId: '',
    googleClientSecret: '',
    githubClientId: '',
    githubClientSecret: '',
    enableNetworkDiagnostics: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generatedEnv, setGeneratedEnv] = useState('')
  const [generatedSql, setGeneratedSql] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const steps = [
    { id: 0, title: '数据库类型', icon: Database, description: '选择数据库类型' },
    { id: 1, title: '数据库配置', icon: Server, description: '配置数据库连接' },
    { id: 2, title: 'AI 模型配置', icon: Key, description: '设置 AI 服务' },
    { id: 3, title: '应用配置', icon: Settings, description: '基础应用设置' },
    { id: 4, title: '可选配置', icon: Globe, description: 'OAuth 和其他设置' },
    { id: 5, title: '生成配置', icon: CheckCircle, description: '完成配置生成' }
  ]

  // 验证当前步骤
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (step) {
      case 0:
        // 数据库类型选择不需要验证
        break
      case 1:
        if (config.databaseType === 'supabase') {
          if (!config.supabaseUrl) newErrors.supabaseUrl = 'Supabase URL 是必需的'
          if (!config.supabaseAnonKey) newErrors.supabaseAnonKey = 'Supabase Anon Key 是必需的'
          if (config.supabaseUrl && !config.supabaseUrl.includes('supabase.co')) {
            newErrors.supabaseUrl = '请输入有效的 Supabase URL'
          }
        } else if (config.databaseType === 'mysql') {
          if (!config.mysqlHost) newErrors.mysqlHost = 'MySQL 主机地址是必需的'
          if (!config.mysqlPort) newErrors.mysqlPort = 'MySQL 端口是必需的'
          if (!config.mysqlUsername) newErrors.mysqlUsername = 'MySQL 用户名是必需的'
          if (!config.mysqlPassword) newErrors.mysqlPassword = 'MySQL 密码是必需的'
          if (!config.mysqlDatabase) newErrors.mysqlDatabase = 'MySQL 数据库名是必需的'
          if (config.mysqlPort && (isNaN(Number(config.mysqlPort)) || Number(config.mysqlPort) < 1 || Number(config.mysqlPort) > 65535)) {
            newErrors.mysqlPort = '请输入有效的端口号 (1-65535)'
          }
        }
        break
      case 2:
        if (!config.deepseekApiKey) newErrors.deepseekApiKey = 'DeepSeek API Key 是必需的'
        if (!config.maxTokens || isNaN(Number(config.maxTokens))) {
          newErrors.maxTokens = '请输入有效的 token 数量'
        }
        break
      case 3:
        if (!config.appName) newErrors.appName = '应用名称是必需的'
        if (!config.appVersion) newErrors.appVersion = '应用版本是必需的'
        if (!config.maxFileSize || isNaN(Number(config.maxFileSize))) {
          newErrors.maxFileSize = '请输入有效的文件大小限制'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 生成环境变量文件
  const generateEnvFile = () => {
    let envContent = ''
    
    if (config.databaseType === 'supabase') {
      envContent = `# 数据库类型
VITE_DATABASE_TYPE=supabase

# Supabase 配置
VITE_SUPABASE_URL=${config.supabaseUrl}
VITE_SUPABASE_ANON_KEY=${config.supabaseAnonKey}

# API 配置
VITE_API_BASE_URL=${config.supabaseUrl}/functions/v1/make-server-43636d2b
`
    } else if (config.databaseType === 'mysql') {
      envContent = `# 数据库类型
VITE_DATABASE_TYPE=mysql

# MySQL 配置
VITE_MYSQL_HOST=${config.mysqlHost}
VITE_MYSQL_PORT=${config.mysqlPort}
VITE_MYSQL_USERNAME=${config.mysqlUsername}
VITE_MYSQL_PASSWORD=${config.mysqlPassword}
VITE_MYSQL_DATABASE=${config.mysqlDatabase}
VITE_MYSQL_SSL=${config.mysqlSsl}

# API 配置
VITE_API_BASE_URL=http://localhost:3001/api
`
    }

    envContent += `
# 应用配置
VITE_APP_NAME=${config.appName}
VITE_APP_VERSION=${config.appVersion}
VITE_DEVELOPMENT_MODE=${config.developmentMode}

# 文件上传配置
VITE_MAX_FILE_SIZE=${config.maxFileSize}
VITE_ALLOWED_FILE_TYPES=${config.allowedFileTypes}

# AI 模型配置
VITE_DEFAULT_AI_MODEL=${config.defaultModel}
VITE_MAX_TOKENS=${config.maxTokens}

# 网络诊断
VITE_ENABLE_NETWORK_DIAGNOSTICS=${config.enableNetworkDiagnostics}

# 后端环境变量 (需要在后端服务器中设置)
# DEEPSEEK_API_KEY=${config.deepseekApiKey}
${config.googleClientId ? `# GOOGLE_CLIENT_ID=${config.googleClientId}` : ''}
${config.googleClientSecret ? `# GOOGLE_CLIENT_SECRET=${config.googleClientSecret}` : ''}
${config.githubClientId ? `# GITHUB_CLIENT_ID=${config.githubClientId}` : ''}
${config.githubClientSecret ? `# GITHUB_CLIENT_SECRET=${config.githubClientSecret}` : ''}
`
    setGeneratedEnv(envContent)
  }

  // 生成 SQL 脚本
  const generateSqlScript = () => {
    let sqlContent = ''
    
    if (config.databaseType === 'supabase') {
      sqlContent = `-- AI 聊天应用 Supabase 数据库初始化脚本
-- 请在 Supabase SQL Editor 中执行此脚本

-- 1. 创建用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 创建用户资料表策略
CREATE POLICY "用户可以查看自己的资料" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "用户可以更新自己的资料" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "用户可以插入自己的资料" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. 创建聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '新对话',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- 创建聊天会话表策略
CREATE POLICY "用户只能访问自己的会话" ON chat_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 3. 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 创建消息表策略
CREATE POLICY "用户只能访问自己会话的消息" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_sessions 
      WHERE chat_sessions.id = messages.session_id 
      AND chat_sessions.user_id = auth.uid()
    )
  );

-- 4. 授予权限
GRANT SELECT ON user_profiles TO anon;
GRANT ALL PRIVILEGES ON user_profiles TO authenticated;
GRANT ALL PRIVILEGES ON chat_sessions TO authenticated;
GRANT ALL PRIVILEGES ON messages TO authenticated;

-- 5. 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为表创建更新时间触发器
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT 'Supabase 数据库初始化完成！' as message;
`
    } else if (config.databaseType === 'mysql') {
      sqlContent = `-- AI 聊天应用 MySQL 数据库初始化脚本
-- 请在 MySQL 中执行此脚本

-- 创建数据库 (如果不存在)
CREATE DATABASE IF NOT EXISTS \`${config.mysqlDatabase}\` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE \`${config.mysqlDatabase}\`;

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
);

-- 2. 创建用户资料表
CREATE TABLE IF NOT EXISTS user_profiles (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE,
  full_name VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 创建聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '新对话',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- 4. 创建消息表
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  session_id VARCHAR(36) NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  metadata JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_session_id (session_id),
  INDEX idx_created_at (created_at),
  INDEX idx_role (role)
);

-- 5. 创建会话令牌表 (用于用户认证)
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);

-- 6. 创建密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id VARCHAR(36) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires_at (expires_at)
);

-- 7. 插入默认管理员用户 (可选)
-- 密码: admin123 (请在生产环境中更改)
INSERT IGNORE INTO users (id, email, password_hash, username, full_name, email_verified) 
VALUES (
  UUID(),
  'admin@example.com',
  '$2b$10$rQZ8qVZ8qVZ8qVZ8qVZ8qOqVZ8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8qVZ8',
  'admin',
  '系统管理员',
  TRUE
);

SELECT 'MySQL 数据库初始化完成！' as message;
`
    }
    
    setGeneratedSql(sqlContent)
  }

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
    }
  }

  // 下载文件
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 下一步
  const nextStep = () => {
    if (validateStep(currentStep)) {
      if (currentStep === 4) {
        generateEnvFile()
        generateSqlScript()
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }

  // 上一步
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0))
  }

  // 完成配置
  const completeSetup = () => {
    onComplete?.(config)
  }

  // 连接测试状态
  const [connectionTesting, setConnectionTesting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean
    message: string
    details?: string
  } | null>(null)

  // MySQL 配置验证
  const validateMySQLConfig = (config: any) => {
    const errors = []
    
    if (!config.mysqlHost || config.mysqlHost.trim() === '') {
      errors.push('主机地址不能为空')
    }
    
    if (!config.mysqlPort || config.mysqlPort < 1 || config.mysqlPort > 65535) {
      errors.push('端口号必须在 1-65535 之间')
    }
    
    if (!config.mysqlUsername || config.mysqlUsername.trim() === '') {
      errors.push('用户名不能为空')
    }
    
    if (!config.mysqlPassword || config.mysqlPassword.trim() === '') {
      errors.push('密码不能为空')
    }
    
    if (!config.mysqlDatabase || config.mysqlDatabase.trim() === '') {
      errors.push('数据库名不能为空')
    }
    
    // 验证主机地址格式
    const hostPattern = /^[a-zA-Z0-9.-]+$/
    if (config.mysqlHost && !hostPattern.test(config.mysqlHost)) {
      errors.push('主机地址格式不正确')
    }
    
    // 验证数据库名格式
    const dbPattern = /^[a-zA-Z0-9_]+$/
    if (config.mysqlDatabase && !dbPattern.test(config.mysqlDatabase)) {
      errors.push('数据库名只能包含字母、数字和下划线')
    }
    
    return errors
  }

  // 测试数据库连接
  const testDatabaseConnection = async () => {
    setConnectionTesting(true)
    setConnectionResult(null)
    
    try {
      if (config.databaseType === 'mysql') {
        // 先进行基本的配置验证
        const validationErrors = validateMySQLConfig(config)
        
        if (validationErrors.length > 0) {
          setConnectionResult({
            success: false,
            message: '配置验证失败',
            details: validationErrors.join('; ')
          })
          return
        }
        
        // 调用真实的 MySQL 连接测试 API
        const response = await fetch('http://localhost:3001/api/test-mysql-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: config.mysqlHost,
            port: config.mysqlPort,
            username: config.mysqlUsername,
            password: config.mysqlPassword,
            database: config.mysqlDatabase,
            ssl: config.mysqlSsl
          })
        })
        
        const result = await response.json()
        
        setConnectionResult({
          success: result.success,
          message: result.message,
          details: result.details
        })
        
      } else if (config.databaseType === 'supabase') {
        // 测试 Supabase 连接
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
          setConnectionResult({
            success: false,
            message: 'Supabase 配置不完整',
            details: '请填写完整的 URL 和 API Key'
          })
          return
        }
        
        const response = await fetch(`${config.supabaseUrl}/rest/v1/`, {
          headers: {
            'apikey': config.supabaseAnonKey,
            'Authorization': `Bearer ${config.supabaseAnonKey}`
          }
        })
        
        if (response.ok) {
          setConnectionResult({
            success: true,
            message: 'Supabase 连接测试成功',
            details: '已成功连接到 Supabase 项目'
          })
        } else {
          setConnectionResult({
            success: false,
            message: 'Supabase 连接测试失败',
            details: `HTTP ${response.status}: 请检查 URL 和 API Key 是否正确`
          })
        }
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      setConnectionResult({
        success: false,
        message: '连接测试失败',
        details: error instanceof Error ? error.message : '未知错误'
      })
    } finally {
      setConnectionTesting(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Database className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">选择数据库类型</h3>
              <p className="text-gray-400">选择您要使用的数据库类型</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Supabase 选项 */}
              <div 
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  config.databaseType === 'supabase' 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}
                onClick={() => setConfig(prev => ({ ...prev, databaseType: 'supabase' }))}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mr-4">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">Supabase</h4>
                    <p className="text-sm text-gray-400">云端 PostgreSQL 数据库</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    免费额度充足
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    内置用户认证
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    实时数据同步
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    无需服务器维护
                  </li>
                </ul>
                {config.databaseType === 'supabase' && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-blue-500" />
                  </div>
                )}
              </div>

              {/* MySQL 选项 */}
              <div 
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  config.databaseType === 'mysql' 
                    ? 'border-orange-500 bg-orange-900/20' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}
                onClick={() => setConfig(prev => ({ ...prev, databaseType: 'mysql' }))}
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mr-4">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">MySQL</h4>
                    <p className="text-sm text-gray-400">传统关系型数据库</p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    成熟稳定
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    广泛支持
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    完全控制
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-400 mr-2" />
                    本地部署
                  </li>
                </ul>
                {config.databaseType === 'mysql' && (
                  <div className="absolute top-4 right-4">
                    <CheckCircle className="w-6 h-6 text-orange-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-blue-300 font-medium mb-1">选择建议</h4>
                  <p className="text-blue-200 text-sm">
                    <strong>Supabase：</strong>适合快速开发和原型制作，无需维护服务器<br />
                    <strong>MySQL：</strong>适合需要完全控制数据库或已有 MySQL 基础设施的项目
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 1:
        if (config.databaseType === 'supabase') {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Database className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Supabase 配置</h3>
                <p className="text-gray-400">配置您的 Supabase 项目连接信息</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Supabase 项目 URL *
                  </label>
                  <input
                    type="url"
                    value={config.supabaseUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, supabaseUrl: e.target.value }))}
                    placeholder="https://your-project-id.supabase.co"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.supabaseUrl ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.supabaseUrl && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.supabaseUrl}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Supabase Anon Key *
                  </label>
                  <textarea
                    value={config.supabaseAnonKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, supabaseAnonKey: e.target.value }))}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    rows={3}
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      errors.supabaseAnonKey ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.supabaseAnonKey && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.supabaseAnonKey}
                    </p>
                  )}
                </div>

                {/* 连接测试按钮 */}
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={testDatabaseConnection}
                      disabled={!config.supabaseUrl || !config.supabaseAnonKey || connectionTesting}
                      className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      {connectionTesting ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          测试中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          测试连接
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* 连接测试结果 */}
                  {connectionResult && (
                    <div className={`p-4 rounded-lg border ${
                      connectionResult.success 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-start">
                        {connectionResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className={`font-medium mb-1 ${
                            connectionResult.success ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {connectionResult.message}
                          </h4>
                          {connectionResult.details && (
                            <p className={`text-sm ${
                              connectionResult.success ? 'text-green-200' : 'text-red-200'
                            }`}>
                              {connectionResult.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-blue-300 font-medium mb-1">如何获取 Supabase 配置？</h4>
                      <p className="text-blue-200 text-sm mb-2">
                        1. 登录 Supabase Dashboard<br />
                        2. 选择您的项目<br />
                        3. 进入 Settings → API<br />
                        4. 复制 Project URL 和 anon public key
                      </p>
                      <a
                        href="https://app.supabase.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-400 hover:text-blue-300 text-sm"
                      >
                        打开 Supabase Dashboard
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        } else {
          return (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <Server className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">MySQL 配置</h3>
                <p className="text-gray-400">配置您的 MySQL 数据库连接信息</p>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      主机地址 *
                    </label>
                    <input
                      type="text"
                      value={config.mysqlHost}
                      onChange={(e) => setConfig(prev => ({ ...prev, mysqlHost: e.target.value }))}
                      placeholder="localhost"
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.mysqlHost ? 'border-red-500' : 'border-gray-600'
                      }`}
                    />
                    {errors.mysqlHost && (
                      <p className="text-red-400 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.mysqlHost}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      端口 *
                    </label>
                    <input
                      type="number"
                      value={config.mysqlPort}
                      onChange={(e) => setConfig(prev => ({ ...prev, mysqlPort: e.target.value }))}
                      placeholder="3306"
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.mysqlPort ? 'border-red-500' : 'border-gray-600'
                      }`}
                    />
                    {errors.mysqlPort && (
                      <p className="text-red-400 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.mysqlPort}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    数据库名 *
                  </label>
                  <input
                    type="text"
                    value={config.mysqlDatabase}
                    onChange={(e) => setConfig(prev => ({ ...prev, mysqlDatabase: e.target.value }))}
                    placeholder="ai_chat_app"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                      errors.mysqlDatabase ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.mysqlDatabase && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.mysqlDatabase}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      用户名 *
                    </label>
                    <input
                      type="text"
                      value={config.mysqlUsername}
                      onChange={(e) => setConfig(prev => ({ ...prev, mysqlUsername: e.target.value }))}
                      placeholder="root"
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.mysqlUsername ? 'border-red-500' : 'border-gray-600'
                      }`}
                    />
                    {errors.mysqlUsername && (
                      <p className="text-red-400 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.mysqlUsername}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      密码 *
                    </label>
                    <input
                      type="password"
                      value={config.mysqlPassword}
                      onChange={(e) => setConfig(prev => ({ ...prev, mysqlPassword: e.target.value }))}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                        errors.mysqlPassword ? 'border-red-500' : 'border-gray-600'
                      }`}
                    />
                    {errors.mysqlPassword && (
                      <p className="text-red-400 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.mysqlPassword}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="mysqlSsl"
                    checked={config.mysqlSsl}
                    onChange={(e) => setConfig(prev => ({ ...prev, mysqlSsl: e.target.checked }))}
                    className="w-4 h-4 text-orange-600 bg-gray-800 border-gray-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="mysqlSsl" className="ml-2 text-sm text-gray-300">
                    启用 SSL 连接 (推荐用于生产环境)
                  </label>
                </div>

                {/* 连接测试按钮 */}
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={testDatabaseConnection}
                      disabled={!config.mysqlHost || !config.mysqlPort || !config.mysqlUsername || !config.mysqlPassword || !config.mysqlDatabase || connectionTesting}
                      className="flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      {connectionTesting ? (
                        <>
                          <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          测试中...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          测试连接
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* 连接测试结果 */}
                  {connectionResult && (
                    <div className={`p-4 rounded-lg border ${
                      connectionResult.success 
                        ? 'bg-green-900/20 border-green-500/30' 
                        : 'bg-red-900/20 border-red-500/30'
                    }`}>
                      <div className="flex items-start">
                        {connectionResult.success ? (
                          <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <h4 className={`font-medium mb-1 ${
                            connectionResult.success ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {connectionResult.message}
                          </h4>
                          {connectionResult.details && (
                            <p className={`text-sm whitespace-pre-line ${
                              connectionResult.success ? 'text-green-200' : 'text-red-200'
                            }`}>
                              {connectionResult.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-orange-300 font-medium mb-1">MySQL 配置说明</h4>
                      <p className="text-orange-200 text-sm mb-2">
                        1. 确保 MySQL 服务器正在运行<br />
                        2. 数据库用户需要有创建表和索引的权限<br />
                        3. 如果数据库不存在，系统会自动创建<br />
                        4. 生产环境建议启用 SSL 连接
                      </p>
                      <p className="text-orange-200 text-xs">
                        <strong>注意：</strong>MySQL 模式需要额外的后端服务器来处理数据库操作
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Key className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">AI 模型配置</h3>
              <p className="text-gray-400">配置 AI 服务和模型参数</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  DeepSeek API Key *
                </label>
                <input
                  type="password"
                  value={config.deepseekApiKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, deepseekApiKey: e.target.value }))}
                  placeholder="sk-..."
                  className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.deepseekApiKey ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {errors.deepseekApiKey && (
                  <p className="text-red-400 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.deepseekApiKey}
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    默认模型
                  </label>
                  <select
                    value={config.defaultModel}
                    onChange={(e) => setConfig(prev => ({ ...prev, defaultModel: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="deepseek-chat">deepseek-chat</option>
                    <option value="deepseek-coder">deepseek-coder</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大 Token 数量
                  </label>
                  <input
                    type="number"
                    value={config.maxTokens}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: e.target.value }))}
                    placeholder="4000"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.maxTokens ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.maxTokens && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.maxTokens}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-green-300 font-medium mb-1">如何获取 DeepSeek API Key？</h4>
                    <p className="text-green-200 text-sm mb-2">
                      1. 访问 DeepSeek 官网<br />
                      2. 注册并登录账户<br />
                      3. 进入 API 管理页面<br />
                      4. 创建新的 API Key
                    </p>
                    <a
                      href="https://platform.deepseek.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-400 hover:text-green-300 text-sm"
                    >
                      打开 DeepSeek Platform
                      <ExternalLink className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Settings className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">应用配置</h3>
              <p className="text-gray-400">设置应用基础信息和功能</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    应用名称 *
                  </label>
                  <input
                    type="text"
                    value={config.appName}
                    onChange={(e) => setConfig(prev => ({ ...prev, appName: e.target.value }))}
                    placeholder="Nebulix Intelligence"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.appName ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.appName && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.appName}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    应用版本 *
                  </label>
                  <input
                    type="text"
                    value={config.appVersion}
                    onChange={(e) => setConfig(prev => ({ ...prev, appVersion: e.target.value }))}
                    placeholder="0.1.0"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.appVersion ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.appVersion && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.appVersion}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    最大文件大小 (字节)
                  </label>
                  <input
                    type="number"
                    value={config.maxFileSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxFileSize: e.target.value }))}
                    placeholder="10485760"
                    className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.maxFileSize ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.maxFileSize && (
                    <p className="text-red-400 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.maxFileSize}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {config.maxFileSize ? `约 ${(Number(config.maxFileSize) / 1024 / 1024).toFixed(1)} MB` : ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    允许的文件类型
                  </label>
                  <input
                    type="text"
                    value={config.allowedFileTypes}
                    onChange={(e) => setConfig(prev => ({ ...prev, allowedFileTypes: e.target.value }))}
                    placeholder="image/*,text/*,application/pdf"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="developmentMode"
                    checked={config.developmentMode}
                    onChange={(e) => setConfig(prev => ({ ...prev, developmentMode: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="developmentMode" className="ml-2 text-sm text-gray-300">
                    启用开发模式 (显示调试信息)
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="networkDiagnostics"
                    checked={config.enableNetworkDiagnostics}
                    onChange={(e) => setConfig(prev => ({ ...prev, enableNetworkDiagnostics: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="networkDiagnostics" className="ml-2 text-sm text-gray-300">
                    启用网络诊断功能
                  </label>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <Globe className="w-16 h-16 text-orange-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">可选配置</h3>
              <p className="text-gray-400">配置 OAuth 登录和其他可选功能</p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google OAuth (可选)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google Client ID
                    </label>
                    <input
                      type="text"
                      value={config.googleClientId}
                      onChange={(e) => setConfig(prev => ({ ...prev, googleClientId: e.target.value }))}
                      placeholder="xxx.apps.googleusercontent.com"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Google Client Secret
                    </label>
                    <input
                      type="password"
                      value={config.googleClientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, googleClientSecret: e.target.value }))}
                      placeholder="GOCSPX-xxx"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub OAuth (可选)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GitHub Client ID
                    </label>
                    <input
                      type="text"
                      value={config.githubClientId}
                      onChange={(e) => setConfig(prev => ({ ...prev, githubClientId: e.target.value }))}
                      placeholder="Iv1.xxx"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      GitHub Client Secret
                    </label>
                    <input
                      type="password"
                      value={config.githubClientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, githubClientSecret: e.target.value }))}
                      placeholder="xxx"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="w-5 h-5 text-orange-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-orange-300 font-medium mb-1">OAuth 配置说明</h4>
                    <p className="text-orange-200 text-sm">
                      OAuth 配置是可选的，如果不需要第三方登录功能可以跳过。
                      这些配置需要在 Supabase Dashboard 的 Authentication 设置中启用相应的提供商。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">配置生成完成</h3>
              <p className="text-gray-400">您的配置已生成，请按照以下步骤完成设置</p>
            </div>
            
            <div className="space-y-6">
              {/* 环境变量文件 */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">环境变量文件 (.env.local)</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(generatedEnv, 'env')}
                      className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      {copied === 'env' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied === 'env' ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => downloadFile(generatedEnv, '.env.local')}
                      className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto max-h-64">
                  {generatedEnv}
                </pre>
              </div>
              
              {/* SQL 脚本 */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-white">数据库初始化脚本 (init.sql)</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyToClipboard(generatedSql, 'sql')}
                      className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      {copied === 'sql' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copied === 'sql' ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => downloadFile(generatedSql, 'init.sql')}
                      className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      下载
                    </button>
                  </div>
                </div>
                <pre className="bg-gray-900 p-4 rounded-lg text-sm text-gray-300 overflow-x-auto max-h-64">
                  {generatedSql}
                </pre>
              </div>
              
              {/* 配置步骤 */}
              <div className="bg-gradient-to-r from-blue-900/20 to-green-900/20 border border-blue-500/30 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">接下来的步骤</h4>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <div>
                      <strong>保存环境变量文件：</strong>
                      <p className="text-sm text-gray-400 mt-1">将生成的环境变量内容保存为项目根目录下的 <code className="bg-gray-800 px-1 rounded">.env.local</code> 文件</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <div>
                      <strong>执行数据库脚本：</strong>
                      <p className="text-sm text-gray-400 mt-1">
                        {config.databaseType === 'supabase' 
                          ? '在 Supabase SQL Editor 中执行生成的 SQL 脚本来初始化数据库表和权限'
                          : '在 MySQL 客户端中执行生成的 SQL 脚本来创建数据库和表结构'
                        }
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <div>
                      <strong>配置后端服务：</strong>
                      <p className="text-sm text-gray-400 mt-1">
                        {config.databaseType === 'supabase' 
                          ? '在 Supabase Dashboard → Edge Functions → Settings 中设置 DeepSeek API Key 等环境变量'
                          : '启动 Node.js 后端服务器，确保 MySQL 连接正常并设置相关环境变量'
                        }
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                    <div>
                      <strong>启动应用：</strong>
                      <p className="text-sm text-gray-400 mt-1">运行 <code className="bg-gray-800 px-1 rounded">npm run dev</code> 启动开发服务器并测试功能</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">一键配置向导</h1>
          <p className="text-gray-400">快速配置您的 AI 聊天应用</p>
        </div>
        
        {/* 步骤指示器 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                    isCompleted 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : isActive 
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-gray-800 border-gray-600 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div className="ml-3 hidden md:block">
                    <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* 主要内容 */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 mb-8">
          {renderStepContent()}
        </div>
        
        {/* 导航按钮 */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all ${
              currentStep === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            上一步
          </button>
          
          {currentStep < steps.length ? (
            <button
              onClick={nextStep}
              className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
            >
              下一步
              <ChevronRight className="w-5 h-5 ml-2" />
            </button>
          ) : (
            <button
              onClick={completeSetup}
              className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              完成配置
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default OneClickSetup
