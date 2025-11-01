# Nebulix Intelligence

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/YOUR_USERNAME/ai-fork/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/ai-fork/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

一个基于React + TypeScript + Supabase构建的现代智能对话平台，提供智能对话、深度推理、文件上传等功能。

## 🚀 功能特性

- **智能对话**: 支持与AI进行自然语言对话
- **深度推理**: 展示AI的思考过程和推理步骤
- **文件上传**: 支持多种文件格式的上传和处理
- **用户认证**: 完整的用户注册、登录、密码重置功能
- **会话管理**: 对话历史保存、搜索、导出功能
- **响应式设计**: 适配桌面和移动设备
- **实时通信**: 流式响应显示，提供流畅的对话体验

## 🛠️ 技术栈

### 前端
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速的构建工具
- **TailwindCSS** - 实用优先的CSS框架
- **Framer Motion** - 动画库
- **Radix UI** - 无障碍的UI组件
- **Lucide React** - 现代图标库
- **React Router** - 客户端路由

### 后端
- **Supabase** - 后端即服务平台
  - 用户认证和授权
  - PostgreSQL数据库
  - Edge Functions
  - 实时订阅
  - 文件存储

## 📦 安装和运行

### 环境要求
- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖
```bash
npm install
```

### 环境配置

#### 方式一：自动配置（推荐）
```bash
# 运行自动配置脚本
npm run setup:supabase
```

#### 方式二：手动配置
1. 复制环境变量文件：
```bash
cp .env.example .env.local
```

2. 配置Supabase环境变量：
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 详细配置指南
- 📖 [Supabase配置指南](docs/SUPABASE_SETUP.md)
- ⚙️ [环境变量配置](docs/ENVIRONMENT_SETUP.md)

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览生产版本
```bash
npm run preview
```

## 🚀 快速部署

### 一键部署

#### Vercel (推荐)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-fork&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY&envDescription=Supabase配置&envLink=https://github.com/YOUR_USERNAME/ai-fork/blob/main/docs/SUPABASE_SETUP.md)

#### Netlify
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/ai-fork)

#### Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template/ai-chat-app)

### 手动部署

#### 使用部署脚本
```bash
# 部署到 Vercel
./scripts/deploy.sh vercel

# 部署到 Netlify
./scripts/deploy.sh netlify

# 使用 Docker 部署
./scripts/deploy.sh docker

# 使用 Docker Compose 部署
./scripts/deploy.sh docker-compose
```

#### Docker 部署
```bash
# 构建镜像
docker build -t ai-chat-app .

# 运行容器
docker run -d -p 3000:80 \
  -e VITE_SUPABASE_URL=your_supabase_url \
  -e VITE_SUPABASE_ANON_KEY=your_supabase_anon_key \
  ai-chat-app
```

#### Docker Compose 部署
```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 环境变量配置

部署前请确保配置以下环境变量：

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase项目URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase匿名密钥 | ✅ |

详细配置请参考：[环境变量配置指南](docs/ENVIRONMENT_SETUP.md)

## 🏗️ 项目结构

```
ai-fork/
├── components/          # React组件
│   ├── page/           # 页面组件
│   ├── AILogo.tsx      # AI Logo组件
│   ├── EnhancedMessageRenderer.tsx  # 消息渲染器
│   ├── NetworkDiagnostics.tsx      # 网络诊断
│   └── UserProfile.tsx             # 用户资料
├── ui/                 # UI基础组件
│   ├── button.tsx      # 按钮组件
│   ├── dialog.tsx      # 对话框组件
│   └── ...
├── utils/              # 工具函数
│   ├── supabase/       # Supabase相关
│   └── ...
├── styles/             # 样式文件
│   └── globals.css     # 全局样式
├── supabase/           # Supabase配置
│   └── functions/      # Edge Functions
└── .trae/              # 项目文档
    └── documents/      # 技术文档
```

## 🔧 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循TypeScript严格模式

### 运行代码检查
```bash
npm run lint
npm run lint:fix
```

### 格式化代码
```bash
npm run format
npm run format:check
```

### 类型检查
```bash
npm run type-check
```

## 📚 API文档

详细的API文档请参考：
- [产品需求文档](./.trae/documents/产品需求文档.md)
- [技术架构文档](./.trae/documents/技术架构文档.md)

## 🚀 部署

### 一键部署到Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/ai-fork&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,VITE_API_BASE_URL&envDescription=需要配置Supabase相关环境变量&envLink=https://github.com/YOUR_USERNAME/ai-fork#%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F%E9%85%8D%E7%BD%AE)

### 手动部署步骤

#### Vercel部署
1. Fork本仓库到您的GitHub账户
2. 在[Vercel](https://vercel.com)中导入项目
3. 配置环境变量（参考`.env.example`）
4. 点击部署

#### Netlify部署
1. Fork本仓库
2. 在[Netlify](https://netlify.com)中连接GitHub仓库
3. 设置构建命令：`npm run build`
4. 设置发布目录：`dist`
5. 配置环境变量
6. 部署

#### 其他平台
项目支持部署到任何支持静态网站的平台：
- **GitHub Pages**: 使用GitHub Actions自动部署
- **Cloudflare Pages**: 连接GitHub仓库自动部署
- **Firebase Hosting**: 使用Firebase CLI部署
- **AWS S3 + CloudFront**: 静态网站托管

### 环境变量配置

部署时需要配置以下环境变量：

```bash
# Supabase配置
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# API配置
VITE_API_BASE_URL=your_api_base_url

# 应用配置
VITE_APP_NAME=Nebulix Intelligence
VITE_APP_VERSION=0.1.0
```

### 自定义域名

部署后，您可以：
1. 在部署平台配置自定义域名
2. 设置SSL证书（通常自动配置）
3. 配置CDN加速（可选）

## 🤝 贡献指南

我们欢迎所有形式的贡献！请阅读我们的[贡献指南](CONTRIBUTING.md)了解详细信息。

### 快速开始贡献

1. **Fork项目** - 点击右上角的Fork按钮
2. **克隆仓库** - `git clone https://github.com/YOUR_USERNAME/ai-fork.git`
3. **创建分支** - `git checkout -b feature/AmazingFeature`
4. **安装依赖** - `npm install`
5. **开发调试** - `npm run dev`
6. **提交更改** - `git commit -m 'Add some AmazingFeature'`
7. **推送分支** - `git push origin feature/AmazingFeature`
8. **创建PR** - 在GitHub上创建Pull Request

### 贡献类型

- 🐛 **Bug修复** - 修复现有问题
- ✨ **新功能** - 添加新的功能特性
- 📚 **文档改进** - 完善项目文档
- 🎨 **UI/UX改进** - 优化用户界面和体验
- ⚡ **性能优化** - 提升应用性能
- 🧪 **测试** - 添加或改进测试用例

### 开发规范

- 遵循现有的代码风格
- 添加适当的注释和文档
- 确保所有测试通过
- 提交前运行代码检查：`npm run lint`

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔒 安全

如果您发现安全漏洞，请查看我们的[安全策略](SECURITY.md)了解如何负责任地报告。

## 📊 项目状态

- ✅ **活跃维护** - 项目正在积极开发和维护
- 🐛 **Bug报告** - 欢迎通过[Issues](https://github.com/YOUR_USERNAME/ai-fork/issues)报告问题
- 💡 **功能请求** - 欢迎提出新功能建议
- 🤝 **贡献欢迎** - 我们欢迎各种形式的贡献

## ⭐ 支持项目

如果这个项目对您有帮助，请考虑：

- ⭐ 给项目点个星
- 🐛 报告Bug或提出改进建议
- 🤝 贡献代码或文档
- 📢 分享给其他开发者

## 📞 联系我们

- 📧 **邮箱**: [your-email@example.com](mailto:your-email@example.com)
- 🐛 **问题反馈**: [GitHub Issues](https://github.com/YOUR_USERNAME/ai-fork/issues)
- 💬 **讨论**: [GitHub Discussions](https://github.com/YOUR_USERNAME/ai-fork/discussions)

---

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和开源社区。

---

<div align="center">
  <p>用 ❤️ 制作 | Made with ❤️</p>
  <p>© 2024 AI Fork Team. All rights reserved.</p>
</div>
