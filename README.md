# 🌌 Nebulix_Intelligence  
基于 React、TypeScript 和 Supabase 构建的智能对话平台  
An intelligent conversation platform built on **React**, **TypeScript**, and **Supabase**  

[![GitHub stars](https://img.shields.io/github/stars/haokir-labs/Nebulix_Intelligence?style=for-the-badge&color=gold)](https://github.com/haokir-labs/Nebulix_Intelligence/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/haokir-labs/Nebulix_Intelligence?style=for-the-badge&color=blueviolet)](https://github.com/haokir-labs/Nebulix_Intelligence/network/members)
[![License](https://img.shields.io/github/license/haokir-labs/Nebulix_Intelligence?style=for-the-badge&color=brightgreen)](./LICENSE)
[![Made with TypeScript](https://img.shields.io/badge/Made%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

> 🧠 「Nebulix Intelligence」是一个**内置智能路由系统（Smart Routing Engine）**的 AI 助手框架，  
> 能在 **无 MCP 服务器依赖**的前提下，自动判断上下文并**无缝切换调用不同模型（LLMs）**。  
>  
> **Built for decentralized intelligence.**

---

## 🚀 项目亮点 | Key Features

### 🧩 无服务器智能切换（Serverless Smart Routing）
- 无需 MCP / Cloud Agent  
- 自动识别任务类型（推理、代码、搜索、图像生成等）  
- 动态调用 DeepSeek、OpenAI、Kimi、Claude、Gemini 等模型  

### ⚙️ 统一智能中枢（Unified Intelligence Core）
- 使用 `RouterKernel` 自动聚合多模型响应  
- 内建 Token 预算与上下文压缩机制  
- 支持并行思考（Parallel Reasoning）与链式执行（Chain-of-Thought Chaining）

### 🌐 全栈现代化架构（Full-Stack Modern Stack）
- 前端：React + TypeScript + Zustand + Tailwind  
- 后端：Supabase（Auth + DB + Edge Functions）  
- 数据流：WebSocket 实时同步，支持模型事件流（SSE）  
- 一键打包为桌面端（Electron）与移动端（React Native）

### 🧭 智能指令调度（Intelligent Command Planner）
- 内置 CommandGraph，可执行多任务路由（如文档生成→代码执行→结果评估）  
- 支持自定义插件与动态函数注册  
- 提供 API 网关接口，供外部系统调用智能体

---

## 🧠 架构概览 | Architecture

```mermaid
graph TD
  A[User Input] --> B[Smart Router Kernel]
  B --> C1[Model: DeepSeek Reasoner]
  B --> C2[Model: OpenAI GPT-4o]
  B --> C3[Model: Claude 3]
  B --> C4[Model: Kimi-K2 Turbo]
  C1 & C2 & C3 & C4 --> D[Response Synthesizer]
  D --> E[Frontend UI / API Output]
