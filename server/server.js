const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// 安全中间件
app.use(helmet());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 限制每个IP 15分钟内最多100个请求
});
app.use(limiter);

// CORS 配置
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['http://localhost:3000', 'http://frontend:80'] 
    : ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// 数据库连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'ai_chat_user',
  password: process.env.DB_PASSWORD || 'ai_chat_pass_2024',
  database: process.env.DB_NAME || 'ai_chat_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API 路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 测试数据库连接
app.post('/api/test-mysql-connection', async (req, res) => {
  const { host, port, username, password, database, ssl } = req.body;

  if (!host || !port || !username || !password || !database) {
    return res.status(400).json({
      success: false,
      message: '配置信息不完整',
      details: '请填写完整的主机地址、端口、用户名、密码和数据库名'
    });
  }

  let connection = null;

  try {
    const connectionConfig = {
      host: host.trim(),
      port: parseInt(port),
      user: username.trim(),
      password: password,
      database: database.trim(),
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000,
    };

    if (ssl) {
      connectionConfig.ssl = {
        rejectUnauthorized: false
      };
    }

    console.log(`尝试连接到 MySQL: ${host}:${port}/${database}`);
    connection = await mysql.createConnection(connectionConfig);

    // 测试查询
    const [rows] = await connection.execute('SELECT 1 as test');
    
    await connection.end();

    res.json({
      success: true,
      message: '数据库连接成功！',
      details: `成功连接到 ${host}:${port}/${database}`,
      testResult: rows[0]
    });

  } catch (error) {
    console.error('MySQL 连接错误:', error);
    
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError);
      }
    }

    let errorMessage = '数据库连接失败';
    let errorDetails = error.message;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到数据库服务器';
      errorDetails = '请检查主机地址和端口是否正确，以及数据库服务是否正在运行';
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = '数据库认证失败';
      errorDetails = '请检查用户名和密码是否正确';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = '数据库不存在';
      errorDetails = '请检查数据库名称是否正确';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接超时';
      errorDetails = '请检查网络连接和防火墙设置';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails,
      code: error.code
    });
  }
});

// 用户相关 API
app.post('/api/users', async (req, res) => {
  try {
    const { email, password, username, full_name } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码是必填项' });
    }

    // 检查用户是否已存在
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: '用户已存在' });
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 12);

    // 创建用户
    const [result] = await pool.execute(
      'INSERT INTO users (email, password_hash, username, full_name) VALUES (?, ?, ?, ?)',
      [email, passwordHash, username, full_name]
    );

    res.status(201).json({
      id: result.insertId,
      email,
      username,
      full_name,
      message: '用户创建成功'
    });

  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码是必填项' });
    }

    // 查找用户
    const [users] = await pool.execute(
      'SELECT id, email, password_hash, username, full_name, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(401).json({ error: '账户已被禁用' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 更新登录信息
    await pool.execute(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP, login_count = login_count + 1 WHERE id = ?',
      [user.id]
    );

    // 生成 JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'ai_chat_jwt_secret_2024_very_secure',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        full_name: user.full_name
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 聊天会话相关 API
app.get('/api/chat-sessions', async (req, res) => {
  try {
    const [sessions] = await pool.execute(
      'SELECT id, title, model, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC LIMIT 50'
    );

    res.json(sessions);
  } catch (error) {
    console.error('获取聊天会话错误:', error);
    res.status(500).json({ error: '服务