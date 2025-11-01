@echo off
REM AI 聊天应用 Docker 一键启动脚本 (Windows)
REM 版本: 1.0.0

echo ========================================
echo    AI 聊天应用 Docker 启动脚本
echo ========================================
echo.

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Docker，请先安装 Docker Desktop
    echo 下载地址: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM 检查 Docker Compose 是否可用
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Docker Compose 不可用，请确保 Docker Desktop 正在运行
    pause
    exit /b 1
)

echo ✅ Docker 环境检查通过
echo.

REM 停止并清理现有容器
echo 🧹 清理现有容器...
docker compose -f docker-compose.yml down --remove-orphans

REM 清理未使用的镜像和网络
echo 🧹 清理未使用的 Docker 资源...
docker system prune -f

echo.
echo 🚀 启动 AI 聊天应用...
echo.

REM 构建并启动所有服务
docker compose -f docker-compose.yml --env-file .env.docker up --build -d

REM 检查启动状态
if %errorlevel% neq 0 (
    echo ❌ 启动失败，请检查错误信息
    echo.
    echo 查看日志命令:
    echo   docker compose -f docker-compose.yml logs mysql
    echo   docker compose -f docker-compose.yml logs backend
    echo   docker compose -f docker-compose.yml logs frontend
    pause
    exit /b 1
)

echo.
echo ✅ 应用启动成功！
echo.
echo 📍 服务地址:
echo   🌐 前端应用: http://localhost:3000
echo   🔧 后端 API: http://localhost:3001
echo   🏥 健康检查: http://localhost:3001/health
echo   🗄️  数据库: localhost:3306
echo.
echo 📊 服务状态:
docker compose -f docker-compose.yml ps

echo.
echo 📝 常用命令:
echo   查看所有日志: docker compose -f docker-compose.yml logs -f
echo   查看特定服务日志: docker compose -f docker-compose.yml logs -f [service_name]
echo   停止所有服务: docker compose -f docker-compose.yml down
echo   重启服务: docker compose -f docker-compose.yml restart [service_name]
echo   进入容器: docker compose -f docker-compose.yml exec [service_name] sh
echo.

REM 等待服务完全启动
echo ⏳ 等待服务完全启动...
timeout /t 10 /nobreak >nul

REM 检查服务健康状态
echo 🔍 检查服务健康状态...
curl -s http://localhost:3001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ 后端服务健康检查通过
) else (
    echo ⚠️  后端服务可能还在启动中，请稍等片刻
)

echo.
echo 🎉 AI 聊天应用已成功启动！
echo 🌐 请在浏览器中访问: http://localhost:3000
echo.

REM 询问是否打开浏览器
set /p open_browser="是否自动打开浏览器? (y/n): "
if /i "%open_browser%"=="y" (
    start http://localhost:3000
)

echo.
echo 按任意键退出...
pause >nul