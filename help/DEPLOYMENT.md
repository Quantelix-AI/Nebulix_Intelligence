# 🚀 部署指南

本文档提供了Nebulix Intelligence的详细部署指南，支持多种部署平台和方式。

## 📋 部署前准备

### 1. 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 2. 获取源码
```bash
git clone https://github.com/YOUR_USERNAME/ai-fork.git
cd ai-fork
npm install
```

### 3. 配置环境变量
复制环境变量模板：
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，配置必要的环境变量：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## � 云平台部署

### Vercel 部署 (推荐)

#### 一键部署
点击下面的按钮进行一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-fork&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Supabase配置&envLink=https://github.com/YOUR_USERNAME/ai-fork/blob/main/docs/SUPABASE_SETUP.md)

#### 手动部署
1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 登录 Vercel：
```bash
vercel login
```

3. 部署项目：
```bash
vercel --prod
```

4. 配置环境变量：
在 Vercel 控制台中设置环境变量：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Netlify 部署

#### 一键部署
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/ai-fork)

#### 手动部署
1. 安装 Netlify CLI：
```bash
npm install -g netlify-cli
```

2. 登录 Netlify：
```bash
netlify login
```

3. 构建项目：
```bash
npm run build
```

4. 部署：
```bash
netlify deploy --prod --dir=dist
```

### Railway 部署

1. 访问 [Railway](https://railway.app)
2. 连接 GitHub 仓库
3. 配置环境变量
4. 自动部署

### GitHub Pages 部署

1. 在 GitHub 仓库设置中启用 GitHub Pages
2. 选择 GitHub Actions 作为源
3. 推送代码，自动触发部署

## 🐳 Docker 部署

### 单容器部署

1. 构建镜像：
```bash
docker build -t ai-chat-app .
```

2. 运行容器：
```bash
docker run -d -p 3000:80 \
  -e VITE_SUPABASE_URL=your_supabase_url \
  -e VITE_SUPABASE_ANON_KEY=your_supabase_anon_key \
  --name ai-chat-app \
  ai-chat-app
```

3. 访问应用：
打开浏览器访问 `http://localhost:3000`

### Docker Compose 部署

1. 配置环境变量：
创建 `.env` 文件：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. 启动服务：
```bash
docker-compose up -d
```

3. 查看日志：
```bash
docker-compose logs -f
```

4. 停止服务：
```bash
docker-compose down
```

### 开发环境 Docker

使用开发环境配置：
```bash
docker-compose --profile dev up -d
```

## 🛠 自动化部署脚本

项目提供了自动化部署脚本 `scripts/deploy.sh`：

### 使用方法

```bash
# 赋予执行权限
chmod +x scripts/deploy.sh

# 部署到 Vercel
./scripts/deploy.sh vercel

# 部署到 Netlify
./scripts/deploy.sh netlify

# Docker 部署
./scripts/deploy.sh docker

# Docker Compose 部署
./scripts/deploy.sh docker-compose

# 仅构建项目
./scripts/deploy.sh build

# 查看帮助
./scripts/deploy.sh help
```

## 🔧 高级配置

### 自定义域名

#### Vercel
1. 在 Vercel 控制台添加自定义域名
2. 配置 DNS 记录指向 Vercel

#### Netlify
1. 在 Netlify 控制台添加自定义域名
2. 配置 DNS 记录或使用 Netlify DNS

### HTTPS 配置

大多数云平台会自动提供 HTTPS 证书。对于自托管部署，建议使用：
- Let's Encrypt
- Cloudflare
- 反向代理 (Nginx/Apache)

### 性能优化

1. **启用 Gzip 压缩**：
大多数云平台默认启用，Docker 部署已在 nginx.conf 中配置

2. **CDN 配置**：
- Vercel: 自动启用全球 CDN
- Netlify: 自动启用全球 CDN
- 自托管: 可使用 Cloudflare CDN

3. **缓存策略**：
静态资源已配置长期缓存

## 🔍 部署验证

部署完成后，请验证以下功能：

1. **页面加载**：确保首页正常加载
2. **环境变量**：检查 Supabase 连接是否正常
3. **路由功能**：测试页面导航
4. **响应式设计**：在不同设备上测试
5. **性能测试**：使用 Lighthouse 检查性能

## 🐛 常见问题

### 构建失败
- 检查 Node.js 版本是否 >= 18
- 确保所有依赖已正确安装
- 检查环境变量配置

### 部署后页面空白
- 检查控制台错误信息
- 验证环境变量配置
- 确保 Supabase 配置正确

### 路由 404 错误
- 确保配置了 SPA 重定向规则
- 检查 `_redirects` (Netlify) 或 `vercel.json` (Vercel) 配置

### Docker 容器无法启动
- 检查端口是否被占用
- 验证环境变量传递
- 查看容器日志：`docker logs ai-chat-app`

## 📞 获取帮助

如果遇到部署问题，可以：

1. 查看 [故障排除指南](docs/TROUBLESHOOTING.md)
2. 在 [GitHub Issues](https://github.com/YOUR_USERNAME/ai-fork/issues) 提交问题
3. 参与 [GitHub Discussions](https://github.com/YOUR_USERNAME/ai-fork/discussions)

## 🔄 持续部署

建议设置持续部署流程：

1. **GitHub Actions**：已配置 CI/CD 工作流
2. **自动部署**：推送到 main 分支自动触发部署
3. **环境分离**：使用不同分支部署到不同环境

---

� **恭喜！您的Nebulix Intelligence已成功部署！**
