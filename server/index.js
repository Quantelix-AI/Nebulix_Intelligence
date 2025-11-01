const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// MySQL 连接测试 API
app.post('/api/test-mysql-connection', async (req, res) => {
  const { host, port, username, password, database, ssl } = req.body;

  // 验证必填字段
  if (!host || !port || !username || !password || !database) {
    return res.status(400).json({
      success: false,
      message: '配置信息不完整',
      details: '请填写完整的主机地址、端口、用户名、密码和数据库名'
    });
  }

  let connection = null;

  try {
    // 创建连接配置
    const connectionConfig = {
      host: host.trim(),
      port: parseInt(port),
      user: username.trim(),
      password: password,
      database: database.trim(),
      connectTimeout: 10000, // 10秒连接超时
      acquireTimeout: 10000,
      timeout: 10000,
    };

    // 如果启用了 SSL
    if (ssl) {
      connectionConfig.ssl = {
        rejectUnauthorized: false // 对于测试连接，允许自签名证书
      };
    }

    console.log(`尝试连接到 MySQL: ${host}:${port}/${database}`);

    // 创建连接
    connection = await mysql.createConnection(connectionConfig);

    // 测试连接
    await connection.ping();

    // 获取服务器信息
    const [rows] = await connection.execute('SELECT VERSION() as version, NOW() as current_time');
    const serverInfo = rows[0];

    // 测试数据库权限
    const [tables] = await connection.execute('SHOW TABLES');

    await connection.end();

    res.json({
      success: true,
      message: 'MySQL 连接测试成功',
      details: `已成功连接到 MySQL 服务器
服务器版本: ${serverInfo.version}
当前时间: ${serverInfo.current_time}
数据库: ${database}
表数量: ${tables.length}`,
      serverInfo: {
        version: serverInfo.version,
        currentTime: serverInfo.current_time,
        database: database,
        tableCount: tables.length
      }
    });

  } catch (error) {
    console.error('MySQL 连接测试失败:', error);

    // 确保连接被关闭
    if (connection) {
      try {
        await connection.end();
      } catch (closeError) {
        console.error('关闭连接时出错:', closeError);
      }
    }

    // 根据错误类型返回不同的错误信息
    let errorMessage = '连接测试失败';
    let errorDetails = error.message;

    if (error.code === 'ECONNREFUSED') {
      errorMessage = '无法连接到 MySQL 服务器';
      errorDetails = `连接被拒绝。请检查：
1. MySQL 服务器是否正在运行
2. 主机地址和端口是否正确
3. 防火墙是否允许连接`;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = '身份验证失败';
      errorDetails = '用户名或密码错误，请检查登录凭据';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      errorMessage = '数据库不存在';
      errorDetails = `数据库 "${database}" 不存在，请检查数据库名称`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = '主机名解析失败';
      errorDetails = `无法解析主机名 "${host}"，请检查主机地址`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '连接超时';
      errorDetails = '连接超时，请检查网络连接和服务器状态';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      details: errorDetails,
      errorCode: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MySQL 连接测试服务正在运行' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`MySQL 连接测试服务器运行在 http://localhost:${PORT}`);
  console.log(`API 端点: http://localhost:${PORT}/api/test-mysql-connection`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  process.exit(0);
});

process