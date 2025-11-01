import mysql from 'mysql2/promise'

export interface MySQLConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  ssl?: boolean
}

export interface MySQLConnectionPool {
  query: (sql: string, params?: any[]) => Promise<any>
  execute: (sql: string, params?: any[]) => Promise<any>
  end: () => Promise<void>
}

/**
 * MySQL 数据库客户端配置
 * 用于连接和操作 MySQL 数据库
 */
export class MySQLClient {
  private pool: mysql.Pool | null = null
  private config: MySQLConfig

  constructor(config: MySQLConfig) {
    this.config = config
  }

  /**
   * 初始化数据库连接池
   */
  async initialize(): Promise<void> {
    try {
      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        database: this.config.database,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      })

      // 测试连接
      await this.testConnection()
      console.log('MySQL 连接池初始化成功')
    } catch (error) {
      console.error('MySQL 连接池初始化失败:', error)
      throw error
    }
  }

  /**
   * 测试数据库连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化')
    }

    try {
      const connection = await this.pool.getConnection()
      await connection.ping()
      connection.release()
      return true
    } catch (error) {
      console.error('数据库连接测试失败:', error)
      throw error
    }
  }

  /**
   * 执行查询
   */
  async query(sql: string, params?: any[]): Promise<any> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化')
    }

    try {
      const [rows] = await this.pool.execute(sql, params)
      return rows
    } catch (error) {
      console.error('查询执行失败:', error)
      throw error
    }
  }

  /**
   * 执行事务
   */
  async transaction(callback: (connection: mysql.PoolConnection) => Promise<void>): Promise<void> {
    if (!this.pool) {
      throw new Error('数据库连接池未初始化')
    }

    const connection = await this.pool.getConnection()
    
    try {
      await connection.beginTransaction()
      await callback(connection)
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      console.log('MySQL 连接池已关闭')
    }
  }

  /**
   * 获取连接池状态
   */
  getPoolStatus() {
    if (!this.pool) {
      return null
    }

    return {
      totalConnections: this.pool.pool.config.connectionLimit,
      activeConnections: this.pool.pool._allConnections.length,
      idleConnections: this.pool.pool._freeConnections.length,
      queuedRequests: this.pool.pool._connectionQueue.length
    }
  }
}

/**
 * 创建 MySQL 客户端实例
 */
export function createMySQLClient(config: MySQLConfig): MySQLClient {
  return new MySQLClient(config)
}

/**
 * 从环境变量创建 MySQL 配置
 */
export function createMySQLConfigFromEnv(): MySQLConfig {
  const config: MySQLConfig = {
    host: process.env.VITE_MYSQL_HOST || 'localhost',
    port: parseInt(process.env.VITE_MYSQL_PORT || '3306'),
    username: process.env.VITE_MYSQL_USERNAME || 'root',
    password: process.env.VITE_MYSQL_PASSWORD || '',
    database: process.env.VITE_MYSQL_DATABASE || 'ai_chat_app',
    ssl: process.env.VITE_MYSQL_SSL === 'true'
  }

  // 验证必需的配置
  if (!config.password) {
    throw new Error('MySQL 密码未配置')
  }

  return config
}

/**
 * 全局 MySQL 客户端实例
 */
let globalMySQLClient: MySQLClient | null = null

/**
 * 获取全局 MySQL 客户端实例
 */
export function getMySQLClient(): MySQLClient {
  if (!globalMySQLClient) {
    const config = createMySQLConfigFromEnv()
    globalMySQLClient = createMySQLClient(config)
  }
  return globalMySQLClient
}

/**
 * 初始化全局 MySQL 客户端
 */
export async function initializeMySQLClient(): Promise<MySQLClient> {
  const client = getMySQLClient()
  await client.initialize()
  return client
}

/**
 * 关闭全局 MySQL 客户端
 */
export async function closeMySQLClient(): Promise<void> {
  if (globalMySQLClient) {
    await globalMySQLClient.close()
    globalMySQLClient = null
  }
}

// 用户相关的数据库操作
export class UserService {
  constructor(private client: MySQLClient) {}

  async createUser(userData: {
    email: string
    passwordHash: string
    username?: string
    fullName?: string
  }) {
    const sql = `
      INSERT INTO users (email, password_hash, username, full_name, email_verified)
      VALUES (?, ?, ?, ?, FALSE)
    `
    const result = await this.client.query(sql, [
      userData.email,
      userData.passwordHash,
      userData.username,
      userData.fullName
    ])
    return result.insertId
  }

  async getUserByEmail(email: string) {
    const sql = 'SELECT * FROM users WHERE email = ?'
    const users = await this.client.query(sql, [email])
    return users[0] || null
  }

  async getUserById(id: string) {
    const sql = 'SELECT * FROM users WHERE id = ?'
    const users = await this.client.query(sql, [id])
    return users[0] || null
  }

  async updateUser(id: string, updates: Partial<{
    username: string
    fullName: string
    avatarUrl: string
    emailVerified: boolean
  }>) {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ')
    const values = Object.values(updates)
    
    const sql = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    await this.client.query(sql, [...values, id])
  }
}

// 聊天会话相关的数据库操作
export class ChatService {
  constructor(private client: MySQLClient) {}

  async createSession(userId: string, title: string = '新对话') {
    const sql = `
      INSERT INTO chat_sessions (user_id, title)
      VALUES (?, ?)
    `
    const result = await this.client.query(sql, [userId, title])
    return result.insertId
  }

  async getUserSessions(userId: string) {
    const sql = `
      SELECT * FROM chat_sessions 
      WHERE user_id = ? 
      ORDER BY updated_at DESC
    `
    return await this.client.query(sql, [userId])
  }

  async getSession(sessionId: string, userId: string) {
    const sql = `
      SELECT * FROM chat_sessions 
      WHERE id = ? AND user_id = ?
    `
    const sessions = await this.client.query(sql, [sessionId, userId])
    return sessions[0] || null
  }

  async updateSessionTitle(sessionId: string, userId: string, title: string) {
    const sql = `
      UPDATE chat_sessions 
      SET title = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `
    await this.client.query(sql, [title, sessionId, userId])
  }

  async deleteSession(sessionId: string, userId: string) {
    const sql = 'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?'
    await this.client.query(sql, [sessionId, userId])
  }

  async addMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string, metadata?: any) {
    const sql = `
      INSERT INTO messages (session_id, role, content, metadata)
      VALUES (?, ?, ?, ?)
    `
    const result = await this.client.query(sql, [
      sessionId,
      role,
      content,
      metadata ? JSON.stringify(metadata) : null
    ])
    return result.insertId
  }

  async getSessionMessages(sessionId: string) {
    const sql = `
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY created_at ASC
    `
    const messages = await this.client.query(sql, [sessionId])
    
    // 解析 metadata JSON
    return messages.map((msg: any) => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }))
  }
}

export default MySQLClient