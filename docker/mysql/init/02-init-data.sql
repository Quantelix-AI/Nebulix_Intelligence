-- MySQL 数据库初始化数据脚本
-- AI 聊天应用初始数据
-- 版本: 1.0.0

USE ai_chat_app;

-- 插入默认用户（用于测试）
INSERT IGNORE INTO users (
    id, 
    email, 
    password_hash, 
    username, 
    full_name, 
    email_verified, 
    is_active
) VALUES (
    'default-user-001',
    'admin@ai-chat.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.2', -- 密码: admin123
    'admin',
    '系统管理员',
    TRUE,
    TRUE
);

-- 插入默认聊天会话
INSERT IGNORE INTO chat_sessions (
    id,
    user_id,
    title,
    model,
    system_prompt,
    temperature
) VALUES (
    'default-session-001',
    'default-user-001',
    '欢迎使用 AI 聊天助手',
    'deepseek-chat',
    '你是一个友善、有帮助的AI助手。请用中文回答用户的问题。',
    0.7
);

-- 插入欢迎消息
INSERT IGNORE INTO chat_messages (
    id,
    session_id,
    role,
    content,
    model,
    tokens_used
) VALUES (
    'welcome-msg-001',
    'default-session-001',
    'assistant',
    '👋 欢迎使用 AI 聊天助手！\n\n我是您的智能对话伙伴，可以帮助您：\n- 回答各种问题\n- 协助解决问题\n- 进行创意讨论\n- 提供学习建议\n\n请随时向我提问，我会尽力为您提供有用的回答！',
    'deepseek-chat',
    50
);

-- 插入默认 AI 模型配置
INSERT IGNORE INTO ai_models (
    id,
    name,
    display_name,
    provider,
    model_type,
    max_tokens,
    supports_streaming,
    supports_functions,
    cost_per_1k_tokens,
    is_active
) VALUES 
(
    'deepseek-chat',
    'deepseek-chat',
    'DeepSeek Chat',
    'deepseek',
    'chat',
    32768,
    TRUE,
    TRUE,
    0.0014,
    TRUE
),
(
    'gpt-3.5-turbo',
    'gpt-3.5-turbo',
    'GPT-3.5 Turbo',
    'openai',
    'chat',
    4096,
    TRUE,
    TRUE,
    0.002,
    TRUE
),
(
    'gpt-4',
    'gpt-4',
    'GPT-4',
    'openai',
    'chat',
    8192,
    TRUE,
    TRUE,
    0.03,
    TRUE
);

-- 插入系统配置
INSERT IGNORE INTO system_configs (
    config_key,
    config_value,
    description,
    config_type
) VALUES 
(
    'app_name',
    'AI 聊天助手',
    '应用程序名称',
    'string'
),
(
    'app_version',
    '1.0.0',
    '应用程序版本',
    'string'
),
(
    'max_chat_sessions_per_user',
    '50',
    '每个用户最大聊天会话数',
    'number'
),
(
    'max_messages_per_session',
    '1000',
    '每个会话最大消息数',
    'number'
),
(
    'default_model',
    'deepseek-chat',
    '默认AI模型',
    'string'
),
(
    'enable_user_registration',
    'true',
    '是否允许用户注册',
    'boolean'
),
(
    'maintenance_mode',
    'false',
    '维护模式',
    'boolean'
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_updated ON chat_sessions(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);

-- 输出初始化完成信息
SELECT 'AI 聊天应用数据库初始化完成！' as message;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as session_count FROM chat_sessions;
SELECT COUNT(*) as message_count FROM chat_messages;
SELECT COUNT(*) as model_count FROM ai_models;
SELECT COUNT(*) as config_count FROM system_configs;