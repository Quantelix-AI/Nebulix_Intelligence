#!/bin/bash

# Nebulix Intelligence部署脚本
# 支持多种部署平台：Vercel, Netlify, Docker

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# 检查必要的工具
check_dependencies() {
    print_header "检查依赖"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    print_message "✓ Node.js 和 npm 已安装"
}

# 安装依赖
install_dependencies() {
    print_header "安装依赖"
    print_message "正在安装项目依赖..."
    npm install
    print_message "✓ 依赖安装完成"
}

# 构建项目
build_project() {
    print_header "构建项目"
    print_message "正在构建项目..."
    npm run build
    print_message "✓ 项目构建完成"
}

# 部署到 Vercel
deploy_vercel() {
    print_header "部署到 Vercel"
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI 未安装，正在安装..."
        npm install -g vercel
    fi
    
    print_message "正在部署到 Vercel..."
    vercel --prod
    print_message "✓ Vercel 部署完成"
}

# 部署到 Netlify
deploy_netlify() {
    print_header "部署到 Netlify"
    
    if ! command -v netlify &> /dev/null; then
        print_warning "Netlify CLI 未安装，正在安装..."
        npm install -g netlify-cli
    fi
    
    print_message "正在部署到 Netlify..."
    netlify deploy --prod --dir=dist
    print_message "✓ Netlify 部署完成"
}

# Docker 部署
deploy_docker() {
    print_header "Docker 部署"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    print_message "正在构建 Docker 镜像..."
    docker build -t ai-chat-app .
    
    print_message "正在启动 Docker 容器..."
    docker run -d -p 3000:80 --name ai-chat-app ai-chat-app
    
    print_message "✓ Docker 部署完成"
    print_message "应用已在 http://localhost:3000 启动"
}

# Docker Compose 部署
deploy_docker_compose() {
    print_header "Docker Compose 部署"
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_message "正在启动 Docker Compose..."
    docker-compose up -d
    
    print_message "✓ Docker Compose 部署完成"
    print_message "应用已在 http://localhost:3000 启动"
}

# 显示帮助信息
show_help() {
    echo "Nebulix Intelligence部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  vercel          部署到 Vercel"
    echo "  netlify         部署到 Netlify"
    echo "  docker          使用 Docker 部署"
    echo "  docker-compose  使用 Docker Compose 部署"
    echo "  build           仅构建项目"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 vercel       # 部署到 Vercel"
    echo "  $0 docker       # 使用 Docker 部署"
}

# 主函数
main() {
    case "$1" in
        "vercel")
            check_dependencies
            install_dependencies
            build_project
            deploy_vercel
            ;;
        "netlify")
            check_dependencies
            install_dependencies
            build_project
            deploy_netlify
            ;;
        "docker")
            check_dependencies
            install_dependencies
            deploy_docker
            ;;
        "docker-compose")
            check_dependencies
            install_dependencies
            deploy_docker_compose
            ;;
        "build")
            check_dependencies
            install_dependencies
            build_project
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "")
            print_error "请指定部署平台"
            show_help
            exit 1
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"