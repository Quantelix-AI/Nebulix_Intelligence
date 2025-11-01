#!/bin/bash
# AI 聊天应用 Docker 一键启动脚本 (Linux/Mac)
# 版本: 1.0.0

set -e

echo "========================================"
echo "   AI 聊天应用 Docker 启动脚本"
echo "========================================"
echo

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未检测到 Docker，请先安装 Docker"
    echo "安装指南: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 不可用，请确保 Docker 正在运行"
    exit 1
fi

echo "✅ Docker 环境检查通过"
echo

# 停止并清理现有容器
echo "🧹 清理现有容器..."
docker compose -f docker-compose.yml down --remove-orphans

# 清理未使用的镜像和网络
echo "🧹 清理未使用的 Docker 资源..."
docker system prune -f

echo
echo "🚀 启动 AI 聊天应用..."
echo

# 构建并启动所有服务
if docker compose -f docker-compose.yml --env-file .env.docker up --build -d; then
    echo
    echo "✅ 应用启动成功！"
else
    echo "❌ 启动失败，请检查错误信息"
    echo
    echo "查看日志命令:"
    echo "  docker compose -f docker-compose.yml logs mysql"
    echo "  docker compose -f docker-compose.yml logs backend"
    echo "  docker compose -f docker-compose.yml logs frontend"
    exit 1
fi

echo
echo "📍 服务地址:"
echo "  🌐 前端应用: http://localhost:3000"
echo "  🔧 后端 API: http://localhost:3001"
echo "  🏥 健康检查: http://localhost:3001/health"
echo "  🗄️  数据库: localhost:3306"
echo

echo "📊 服务状态:"
docker compose -f docker-compose.yml ps

echo
echo "📝 常用命令:"
echo "  查看所有日志: docker compose -f docker-compose.yml logs -f"
echo "  查看特定服务日志: docker compose -f docker-compose.yml logs -f [service_name]"
echo "  停止所有服务: docker compose -f docker-compose.yml down"
echo "  重启服务: docker compose -f docker-compose.yml restart [service_name]"
echo "  进入容器: docker compose -f docker-compose.yml exec [service_name] sh"
echo

# 等待服务完全启动
echo "⏳ 等待服务完全启动..."
sleep 10

# 检查服务健康状态
echo "🔍 检查服务健康状态..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务健康检查通过"
else
    echo "⚠️  后端服务可能还在启动中，请稍等片刻"
fi

echo
echo "🎉 AI 聊天应用已成功启动！"
echo "🌐 请在浏览器中访问: http://localhost:3000"
echo

# 询问是否打开浏览器 (仅在有桌面环境时)
if command -v xdg-open &> /dev/null || command -v open &> /dev/null; then
    read -p "是否自动打开浏览器? (y/n): " open_browser
    if [[ $open_browser =~ ^[Yy]$ ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        elif command -v open &> /dev/null; then
            open http://localhost:3000
        fi
    fi
fi

echo
echo "脚本执行完成！"