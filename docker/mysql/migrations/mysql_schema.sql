-- MySQL 数据库架构脚本
-- AI 聊天应用数据库初始化
-- 版本: 1.0.0
-- 创建时间: 2024-01-01

-- 设置字符集和排序规则
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ai_chat_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE ai_chat_app;

-- ============================================================================
-- 用户表
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) UNIQUE NOT NULL COMMENT '用户邮箱',
    password_hash VARCHAR(255) COMMENT '密码哈希',
    username VARCHAR(100) COMMENT '用户名',
    full_name VARCHAR(255) COMMENT '全名',
    avatar_url TEXT COMMENT '头像URL',
    email_verified BOOLEAN DEFAULT FALSE COMMENT '邮箱是否已验证',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    login_count INT DEFAULT 0 COMMENT '登录次数',
    is_active BOOLEAN DEFAULT TRUE COMMENT '账户是否激活',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_created_at (created_at),
    INDEX idx_last_login (last_login_at)
) ENGINE=InnoDB COMMENT='用户表';

-- ============================================================================
-- 聊天会话表
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    title VARCHAR(255) NOT NULL DEFAULT '新对话' COMMENT '会话标题',
    model VARCHAR(50) DEFAULT 'deepseek-chat' COMMENT 'AI模型',
    system_prompt TEXT COMMENT '系统提示词',
    temperature DECIMAL(3,2) DEFAULT 0.7 COMMENT '温度参数',
    max_tokens INT DEFAULT 4000 COMMENT '最大令牌数',
    message_count INT DEFAULT 0 COMMENT '消息数量',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
    is_archived BOOLEAN DEFAULT FALSE COMMENT '是否归档',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_updated_at (updated_at),
    INDEX idx_created_at (created_at),
    INDEX idx_pinned (is_pinned),
    INDEX idx_archived (is_archived)
) ENGINE=InnoDB COMMENT='聊天会话表';

-- ============================================================================
-- 消息表
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    session_id VARCHAR(36) NOT NULL COMMENT '会话ID',
    role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '消息角色',
    content TEXT NOT NULL COMMENT '消息内容',
    content_type ENUM('text', 'image', 'file', 'code') DEFAULT 'text' COMMENT '内容类型',
    metadata JSON COMMENT '元数据',
    token_count INT DEFAULT 0 COMMENT '令牌数量',
    processing_time_ms INT DEFAULT 0 COMMENT '处理时间(毫秒)',
    is_edited BOOLEAN DEFAULT FALSE COMMENT '是否已编辑',
    parent_message_id VARCHAR(36) NULL COMMENT '父消息ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    INDEX idx_role (role),
    INDEX idx_content_type (content_type),
    INDEX idx_parent_message (parent_message_id)
) ENGINE=InnoDB COMMENT='消息表';

-- ============================================================================
-- 文件上传表
-- ============================================================================
CREATE TABLE IF NOT EXISTS file_uploads (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    message_id VARCHAR(36) NULL COMMENT '关联消息ID',
    filename VARCHAR(255) NOT NULL COMMENT '文件名',
    original_name VARCHAR(255) NOT NULL COMMENT '原始文件名',
    file_size BIGINT NOT NULL COMMENT '文件大小(字节)',
    mime_type VARCHAR(100) NOT NULL COMMENT 'MIME类型',
    file_path TEXT NOT NULL COMMENT '文件路径',
    file_hash VARCHAR(64) COMMENT '文件哈希值',
    download_count INT DEFAULT 0 COMMENT '下载次数',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_message_id (message_id),
    INDEX idx_created_at (created_at),
    INDEX idx_file_hash (file_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB COMMENT='文件上传表';

-- ============================================================================
-- 用户设置表
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) UNIQUE NOT NULL COMMENT '用户ID',
    theme VARCHAR(20) DEFAULT 'dark' COMMENT '主题',
    language VARCHAR(10) DEFAULT 'zh-CN' COMMENT '语言',
    ai_model VARCHAR(50) DEFAULT 'deepseek-chat' COMMENT '默认AI模型',
    max_tokens INTEGER DEFAULT 4000 COMMENT '默认最大令牌数',
    temperature DECIMAL(3,2) DEFAULT 0.7 COMMENT '默认温度参数',
    auto_save BOOLEAN DEFAULT TRUE COMMENT '自动保存',
    show_word_count BOOLEAN DEFAULT TRUE COMMENT '显示字数统计',
    enable_sound BOOLEAN DEFAULT FALSE COMMENT '启用声音',
    enable_notifications BOOLEAN DEFAULT TRUE COMMENT '启用通知',
    privacy_mode BOOLEAN DEFAULT FALSE COMMENT '隐私模式',
    settings JSON COMMENT '其他设置',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='用户设置表';

-- ============================================================================
-- API 密钥表
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    provider VARCHAR(50) NOT NULL COMMENT '提供商',
    key_name VARCHAR(100) NOT NULL COMMENT '密钥名称',
    encrypted_key TEXT NOT NULL COMMENT '加密的API密钥',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    usage_count INT DEFAULT 0 COMMENT '使用次数',
    last_used_at TIMESTAMP NULL COMMENT '最后使用时间',
    expires_at TIMESTAMP NULL COMMENT '过期时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_provider (provider),
    INDEX idx_active (is_active),
    INDEX idx_last_used (last_used_at)
) ENGINE=InnoDB COMMENT='API密钥表';

-- ============================================================================
-- 使用统计表
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_stats (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
    date DATE NOT NULL COMMENT '日期',
    message_count INT DEFAULT 0 COMMENT '消息数量',
    token_count INT DEFAULT 0 COMMENT '令牌数量',
    file_upload_count INT DEFAULT 0 COMMENT '文件上传数量',
    file_upload_size BIGINT DEFAULT 0 COMMENT '文件上传大小',
    api_call_count INT DEFAULT 0 COMMENT 'API调用次数',
    processing_time_ms BIGINT DEFAULT 0 COMMENT '总处理时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 唯一约束
    UNIQUE KEY uk_user_date (user_id, date),
    
    -- 索引
    INDEX idx_date (date),
    INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB COMMENT='使用统计表';

-- ============================================================================
-- 系统配置表
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
    config_value TEXT COMMENT '配置值',
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string' COMMENT '配置类型',
    description TEXT COMMENT '配置描述',
    is_public BOOLEAN DEFAULT FALSE COMMENT '是否公开',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_config_key (config_key),
    INDEX idx_public (is_public)
) ENGINE=InnoDB COMMENT='系统配置表';

-- ============================================================================
-- 操作日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id VARCHAR(36) NULL COMMENT '用户ID',
    operation VARCHAR(100) NOT NULL COMMENT '操作类型',
    resource_type VARCHAR(50) COMMENT '资源类型',
    resource_id VARCHAR(36) COMMENT '资源ID',
    details JSON COMMENT '操作详情',
    ip_address VARCHAR(45) COMMENT 'IP地址',
    user_agent TEXT COMMENT '用户代理',
    status ENUM('success', 'failure', 'error') DEFAULT 'success' COMMENT '操作状态',
    error_message TEXT COMMENT '错误信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_operation (operation),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB COMMENT='操作日志表';

-- ============================================================================
-- 插入默认数据
-- ============================================================================

-- 插入系统配置
INSERT IGNORE INTO system_config (config_key, config_value, config_type, description, is_public) VALUES
('app_name', 'AI Chat App', 'string', '应用名称', TRUE),
('app_version', '1.0.0', 'string', '应用版本', TRUE),
('max_file_size', '10485760', 'number', '最大文件大小(字节)', TRUE),
('allowed_file_types', '.txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.json,.xml,.yaml,.yml', 'string', '允许的文件类型', TRUE),
('default_ai_model', 'deepseek-chat', 'string', '默认AI模型', TRUE),
('default_max_tokens', '4000', 'number', '默认最大令牌数', TRUE),
('default_temperature', '0.7', 'number', '默认温度参数', TRUE),
('enable_file_upload', 'true', 'boolean', '启用文件上传', TRUE),
('enable_user_registration', 'true', 'boolean', '启用用户注册', TRUE),
('maintenance_mode', 'false', 'boolean', '维护模式', FALSE);

-- ============================================================================
-- 创建触发器
-- ============================================================================

-- 更新会话消息数量的触发器
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS update_session_message_count_insert
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE chat_sessions 
    SET message_count = message_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.session_id;
END$$

CREATE TRIGGER IF NOT EXISTS update_session_message_count_delete
AFTER DELETE ON messages
FOR EACH ROW
BEGIN
    UPDATE chat_sessions 
    SET message_count = GREATEST(message_count - 1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = OLD.session_id;
END$$

-- 更新用户登录统计的触发器
CREATE TRIGGER IF NOT EXISTS update_user_login_stats
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    IF NEW.last_login_at != OLD.last_login_at THEN
        SET NEW.login_count = OLD.login_count + 1;
    END IF;
END$$

DELIMITER ;

-- ============================================================================
-- 创建视图
-- ============================================================================

-- 用户会话统计视图
CREATE OR REPLACE VIEW user_session_stats AS
SELECT 
    u.id as user_id,
    u.email,
    u.username,
    COUNT(cs.id) as total_sessions,
    COUNT(CASE WHEN cs.is_pinned = TRUE THEN 1 END) as pinned_sessions,
    COUNT(CASE WHEN cs.is_archived = TRUE THEN 1 END) as archived_sessions,
    SUM(cs.message_count) as total_messages,
    MAX(cs.updated_at) as last_activity
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
GROUP BY u.id, u.email, u.username;

-- 每日使用统计视图
CREATE OR REPLACE VIEW daily_usage_summary AS
SELECT 
    date,
    COUNT(DISTINCT user_id) as active_users,
    SUM(message_count) as total_messages,
    SUM(token_count) as total_tokens,
    SUM(file_upload_count) as total_file_uploads,
    SUM(file_upload_size) as total_upload_size,
    SUM(api_call_count) as total_api_calls,
    AVG(processing_time_ms) as avg_processing_time
FROM usage_stats
GROUP BY date
ORDER BY date DESC;

-- ============================================================================
-- 创建存储过程
-- ============================================================================

DELIMITER $$

-- 清理过期文件的存储过程
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredFiles()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE file_path_var TEXT;
    DECLARE file_cursor CURSOR FOR 
        SELECT file_path FROM file_uploads 
        WHERE expires_at IS NOT NULL AND expires_at < NOW();
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    START TRANSACTION;
    
    OPEN file_cursor;
    read_loop: LOOP
        FETCH file_cursor INTO file_path_var;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 这里可以添加删除物理文件的逻辑
        -- 目前只删除数据库记录
    END LOOP;
    CLOSE file_cursor;
    
    DELETE FROM file_uploads 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    COMMIT;
END$$

-- 获取用户统计信息的存储过程
CREATE PROCEDURE IF NOT EXISTS GetUserStats(IN user_id_param VARCHAR(36))
BEGIN
    SELECT 
        u.id,
        u.email,
        u.username,
        u.created_at as user_since,
        u.last_login_at,
        u.login_count,
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT f.id) as total_files,
        COALESCE(SUM(f.file_size), 0) as total_file_size
    FROM users u
    LEFT JOIN chat_sessions cs ON u.id = cs.user_id
    LEFT JOIN messages m ON cs.id = m.session_id
    LEFT JOIN file_uploads f ON u.id = f.user_id
    WHERE u.id = user_id_param
    GROUP BY u.id, u.email, u.username, u.created_at, u.last_login_at, u.login_count;
END$$

DELIMITER ;

-- ============================================================================
-- 设置权限（如果需要）
-- ============================================================================

-- 创建应用用户（可选，在生产环境中推荐）
-- CREATE USER IF NOT EXISTS 'ai_chat_user'@'localhost' IDENTIFIED BY 'secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ai_chat_app.* TO 'ai_chat_user'@'localhost';
-- FLUSH PRIVILEGES;

-- 恢复外键检查
SET FOREIGN_KEY_CHECKS = 1;

-- 输出完成信息
SELECT 'MySQL 数据库架构初始化完成！' as status;
SELECT 'Database: ai_chat_app' as database_name;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'ai_chat_app';

-- 显示所有表
SHOW TABLES;